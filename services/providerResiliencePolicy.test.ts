import { describe, expect, it } from "vitest";

import {
  buildProviderFailureDecision,
  getProviderFailurePolicy,
  isSafeRegisteredProviderId,
  isMedicalSafetyCapability,
  providerCapabilities,
  providerFailureErrorCodes,
  type ProviderCapability,
  type ProviderFailureErrorCode,
  type ProviderFailureInput,
} from "./providerResiliencePolicy";

const medicalCapabilities: ProviderCapability[] = [
  "medical_source_search",
  "medical_source_fetch",
  "ai_medical_review",
  "ai_medical_draft_generation",
];

const retryableErrors: ProviderFailureErrorCode[] = [
  "RATE_LIMITED",
  "REQUEST_TIMEOUT",
  "PROVIDER_UNAVAILABLE",
  "NETWORK_ERROR",
];

const terminalNonRetryableErrors: ProviderFailureErrorCode[] = [
  "AUTHENTICATION_FAILED",
  "PERMISSION_DENIED",
  "CONFIGURATION_ERROR",
  "UNKNOWN_PROVIDER_ERROR",
];

function baseInput(overrides: Partial<ProviderFailureInput> = {}): ProviderFailureInput {
  return {
    capability: "medical_source_fetch",
    errorCode: "REQUEST_TIMEOUT",
    providerId: "cdc-safe-fetch",
    httpStatus: 504,
    attemptNumber: 1,
    message: "Provider timed out.",
    occurredAt: "2026-07-31T00:00:00.000Z",
    ...overrides,
  };
}

describe("provider resilience policy", () => {
  it("defines a policy for every provider failure error code", () => {
    for (const errorCode of providerFailureErrorCodes) {
      expect(getProviderFailurePolicy(errorCode)).toEqual(
        expect.objectContaining({
          retryable: expect.any(Boolean),
          fallbackAllowed: expect.any(Boolean),
          adminAlertRequired: expect.any(Boolean),
          terminal: expect.any(Boolean),
        }),
      );
    }
  });

  it("handles every provider capability", () => {
    for (const capability of providerCapabilities) {
      const decision = buildProviderFailureDecision(baseInput({ capability }));
      expect(decision.capability).toBe(capability);
      expect(decision.reasonCode).toBe(`${capability.toUpperCase()}_REQUEST_TIMEOUT`);
    }
  });

  it("includes AI medical draft generation exactly once", () => {
    expect(providerCapabilities).toContain("ai_medical_draft_generation");
    expect(providerCapabilities.filter((capability) => capability === "ai_medical_draft_generation")).toHaveLength(1);
    expect(new Set(providerCapabilities).size).toBe(providerCapabilities.length);
  });

  it("identifies medical safety capabilities", () => {
    for (const capability of providerCapabilities) {
      expect(isMedicalSafetyCapability(capability)).toBe(medicalCapabilities.includes(capability));
    }
  });

  it("forces every medical provider failure to fail closed", () => {
    for (const capability of medicalCapabilities) {
      for (const errorCode of providerFailureErrorCodes) {
        const decision = buildProviderFailureDecision(baseInput({ capability, errorCode }));
        expect(decision.persistable).toBe(false);
        expect(decision.publishable).toBe(false);
        expect(decision.manualReviewRequired).toBe(true);
        expect(decision.jobShouldPause).toBe(true);
      }
    }
  });

  it("does not make non-medical failures persistable or publishable", () => {
    for (const capability of providerCapabilities.filter((value) => !medicalCapabilities.includes(value))) {
      const decision = buildProviderFailureDecision(baseInput({ capability }));
      expect(decision.persistable).toBe(false);
      expect(decision.publishable).toBe(false);
    }
  });

  it("does not retry authentication, permission, configuration, or unknown failures", () => {
    for (const errorCode of terminalNonRetryableErrors) {
      const decision = buildProviderFailureDecision(baseInput({ errorCode }));
      expect(decision.retryable).toBe(false);
      expect(decision.fallbackAllowed).toBe(false);
      expect(decision.adminAlertRequired).toBe(true);
      expect(decision.terminal).toBe(true);
    }
  });

  it("allows retry for rate limit, timeout, unavailable, and network failures", () => {
    for (const errorCode of retryableErrors) {
      const decision = buildProviderFailureDecision(baseInput({ errorCode }));
      expect(decision.retryable).toBe(true);
      expect(decision.fallbackAllowed).toBe(true);
      expect(decision.terminal).toBe(false);
    }
  });

  it("does not allow automatic fallback for content policy blocks", () => {
    const decision = buildProviderFailureDecision(baseInput({ errorCode: "CONTENT_POLICY_BLOCKED" }));
    expect(decision.retryable).toBe(false);
    expect(decision.fallbackAllowed).toBe(false);
    expect(decision.manualReviewRequired).toBe(true);
  });

  it("pauses every capability when content policy blocks require manual review", () => {
    for (const capability of providerCapabilities) {
      const decision = buildProviderFailureDecision(baseInput({ capability, errorCode: "CONTENT_POLICY_BLOCKED" }));
      expect(decision.manualReviewRequired).toBe(true);
      expect(decision.jobShouldPause).toBe(true);
    }
  });

  it("treats unknown provider errors as terminal and alertable", () => {
    const decision = buildProviderFailureDecision(baseInput({ errorCode: "UNKNOWN_PROVIDER_ERROR" }));
    expect(decision.retryable).toBe(false);
    expect(decision.fallbackAllowed).toBe(false);
    expect(decision.adminAlertRequired).toBe(true);
    expect(decision.terminal).toBe(true);
  });

  it("does not include token, api key, authorization, message, or occurredAt in the decision", () => {
    const decision = buildProviderFailureDecision(baseInput());
    expect(Object.keys(decision).join(" ").toLowerCase()).not.toMatch(/token|api.?key|authorization|message|occurredat/);
    expect(JSON.stringify(decision).toLowerCase()).not.toMatch(/token|api.?key|authorization/);
  });

  it("keeps safe registered internal provider ids", () => {
    const decision = buildProviderFailureDecision(baseInput({ providerId: "naver-datalab" }));
    expect(isSafeRegisteredProviderId("naver-datalab")).toBe(true);
    expect(decision.providerId).toBe("naver-datalab");
    expect(decision.errorCode).toBe("REQUEST_TIMEOUT");
  });

  it("does not copy unsafe provider ids into the decision JSON", () => {
    const unsafeProviderId = "https://example.com/provider?token=secret";
    const decision = buildProviderFailureDecision(baseInput({ providerId: unsafeProviderId }));
    expect(JSON.stringify(decision)).not.toContain(unsafeProviderId);
    expect(decision.providerId).toBe("invalid-provider-id");
  });

  it("does not copy Authorization or Bearer-like provider ids into the decision JSON", () => {
    const unsafeProviderId = "Authorization: Bearer sb_secret_123";
    const decision = buildProviderFailureDecision(baseInput({ providerId: unsafeProviderId }));
    const serialized = JSON.stringify(decision);
    expect(serialized).not.toContain(unsafeProviderId);
    expect(serialized.toLowerCase()).not.toMatch(/authorization|bearer|sb_secret/);
  });

  it("rejects excessively long provider ids", () => {
    const unsafeProviderId = "a".repeat(65);
    const decision = buildProviderFailureDecision(baseInput({ providerId: unsafeProviderId }));
    expect(isSafeRegisteredProviderId(unsafeProviderId)).toBe(false);
    expect(decision.providerId).toBe("invalid-provider-id");
  });

  it("rejects provider ids containing whitespace, urls, or line breaks", () => {
    for (const providerId of ["naver datalab", "https://naver-datalab", "naver-datalab\nsecret"]) {
      const decision = buildProviderFailureDecision(baseInput({ providerId }));
      expect(isSafeRegisteredProviderId(providerId)).toBe(false);
      expect(JSON.stringify(decision)).not.toContain(providerId);
      expect(decision.providerId).toBe("invalid-provider-id");
    }
  });

  it("closes invalid provider ids as terminal configuration failures", () => {
    const decision = buildProviderFailureDecision(
      baseInput({
        capability: "ai_translation",
        errorCode: "NETWORK_ERROR",
        providerId: "unregistered-provider",
      }),
    );
    expect(decision.errorCode).toBe("CONFIGURATION_ERROR");
    expect(decision.retryable).toBe(false);
    expect(decision.fallbackAllowed).toBe(false);
    expect(decision.adminAlertRequired).toBe(true);
    expect(decision.terminal).toBe(true);
    expect(decision.jobShouldPause).toBe(true);
    expect(decision.persistable).toBe(false);
    expect(decision.publishable).toBe(false);
    expect(decision.manualReviewRequired).toBe(false);
    expect(decision.reasonCode).toBe("PROVIDER_ID_CONFIGURATION_ERROR");
  });

  it("keeps existing non-medical capability classifications unchanged", () => {
    expect(isMedicalSafetyCapability("ai_translation")).toBe(false);
    expect(isMedicalSafetyCapability("image_generation")).toBe(false);
    expect(isMedicalSafetyCapability("notification")).toBe(false);
  });

  it("does not mutate the input object", () => {
    const input = baseInput();
    const before = JSON.stringify(input);
    buildProviderFailureDecision(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("returns the same decision for the same input", () => {
    const input = baseInput();
    expect(buildProviderFailureDecision(input)).toEqual(buildProviderFailureDecision(input));
  });
});
