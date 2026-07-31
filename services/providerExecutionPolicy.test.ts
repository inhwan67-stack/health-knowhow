import { describe, expect, it } from "vitest";

import {
  buildProviderExecutionDecision,
  isRetryableProviderError,
  normalizeProviderFailureErrorCode,
  providerExecutionDefaults,
  type ProviderExecutionPolicyInput,
} from "./providerExecutionPolicy";
import { providerFailureErrorCodes } from "./providerResiliencePolicy";
import {
  buildProviderRegistry,
  selectProviderForCapability,
  type ProviderAdapterContract,
  type ProviderSelectionResult,
  type ValidatedProviderSelection,
} from "./providerGatewayContract";

function adapter(overrides: Partial<ProviderAdapterContract> = {}): ProviderAdapterContract {
  return {
    providerId: "cdc-safe-fetch",
    capabilities: ["medical_source_fetch"],
    priority: 10,
    trustTier: "medical_authoritative",
    enabled: true,
    ...overrides,
  };
}

function validSelection(): ValidatedProviderSelection {
  const registryResult = buildProviderRegistry([adapter()]);
  if (!registryResult.valid) throw new Error("Expected valid registry");
  const selection = selectProviderForCapability(registryResult.registry, "medical_source_fetch");
  if (!selection.selected) throw new Error("Expected selected provider");
  return selection;
}

function forgedSelection(
  overrides: Partial<Extract<ProviderSelectionResult, { selected: true }>> = {},
): ValidatedProviderSelection {
  return {
    selected: true,
    capability: "medical_source_fetch",
    selectedProviderId: "cdc-safe-fetch",
    selectedTrustTier: "medical_authoritative",
    candidateProviderIds: ["cdc-safe-fetch"],
    failClosed: false,
    persistable: false,
    publishable: false,
    executionStarted: false,
    jobShouldPause: false,
    manualReviewRequired: false,
    reasonCode: "PROVIDER_SELECTED_FOR_PREVIEW",
    ...overrides,
  } as unknown as ValidatedProviderSelection;
}

function unselectedProvider(
  overrides: Partial<Extract<ProviderSelectionResult, { selected: false }>> = {},
): ValidatedProviderSelection {
  return {
    selected: false,
    capability: overrides.capability ?? "medical_source_fetch",
    selectedProviderId: null,
    selectedTrustTier: null,
    candidateProviderIds: [],
    failClosed: true,
    persistable: false,
    publishable: false,
    executionStarted: false,
    jobShouldPause: true,
    manualReviewRequired: true,
    reasonCode: "NO_ELIGIBLE_PROVIDER",
  } as unknown as ValidatedProviderSelection;
}

function baseInput(overrides: Partial<ProviderExecutionPolicyInput> = {}): ProviderExecutionPolicyInput {
  return {
    requestId: "provider-request-1",
    capability: "medical_source_fetch",
    providerId: "cdc-safe-fetch",
    errorCode: "REQUEST_TIMEOUT",
    httpStatus: 408,
    attemptNumber: 1,
    maxAttempts: 3,
    retryAfterMs: null,
    requestTimeoutMs: 15_000,
    selection: validSelection(),
    executionStarted: true,
    ...overrides,
  };
}

describe("provider execution policy", () => {
  it("normalizes known HTTP and execution errors without response bodies", () => {
    expect(normalizeProviderFailureErrorCode({ httpStatus: 401 })).toBe("AUTHENTICATION_FAILED");
    expect(normalizeProviderFailureErrorCode({ httpStatus: 403 })).toBe("PERMISSION_DENIED");
    expect(normalizeProviderFailureErrorCode({ httpStatus: 429 })).toBe("RATE_LIMITED");
    expect(normalizeProviderFailureErrorCode({ httpStatus: 408 })).toBe("REQUEST_TIMEOUT");
    expect(normalizeProviderFailureErrorCode({ timedOut: true })).toBe("REQUEST_TIMEOUT");
    for (const httpStatus of [500, 502, 503, 504]) {
      expect(normalizeProviderFailureErrorCode({ httpStatus })).toBe("PROVIDER_UNAVAILABLE");
    }
    expect(normalizeProviderFailureErrorCode({ malformedResponse: true })).toBe("INVALID_PROVIDER_RESPONSE");
    expect(normalizeProviderFailureErrorCode({ contentPolicyBlocked: true })).toBe("CONTENT_POLICY_BLOCKED");
    expect(normalizeProviderFailureErrorCode({ networkError: true })).toBe("NETWORK_ERROR");
    expect(normalizeProviderFailureErrorCode({ configurationError: true })).toBe("CONFIGURATION_ERROR");
    expect(normalizeProviderFailureErrorCode({ httpStatus: 418 })).toBe("UNKNOWN_PROVIDER_ERROR");
  });

  it("keeps retryable and non-retryable error sets aligned with Phase 1 policy", () => {
    for (const errorCode of ["RATE_LIMITED", "REQUEST_TIMEOUT", "PROVIDER_UNAVAILABLE", "NETWORK_ERROR"] as const) {
      expect(isRetryableProviderError(errorCode)).toBe(true);
    }
    for (const errorCode of [
      "AUTHENTICATION_FAILED",
      "PERMISSION_DENIED",
      "INVALID_PROVIDER_RESPONSE",
      "CONTENT_POLICY_BLOCKED",
      "CONFIGURATION_ERROR",
      "UNKNOWN_PROVIDER_ERROR",
    ] as const) {
      expect(isRetryableProviderError(errorCode)).toBe(false);
    }
  });

  it("plans attempt 1 retry with 1000ms delay without starting retry", () => {
    const result = buildProviderExecutionDecision(baseInput({ errorCode: "RATE_LIMITED", httpStatus: 429, attemptNumber: 1 }));
    expect(result).toMatchObject({
      valid: true,
      retryable: true,
      retryScheduled: true,
      nextRetryDelayMs: 1_000,
      action: "RETRY_WAIT",
      fallbackExecutionStarted: false,
      executionStarted: false,
      persistable: false,
      publishable: false,
      failClosed: true,
    });
  });

  it("plans attempt 2 retry with 3000ms delay", () => {
    const result = buildProviderExecutionDecision(baseInput({ errorCode: "NETWORK_ERROR", httpStatus: null, attemptNumber: 2 }));
    expect(result.retryScheduled).toBe(true);
    expect(result.nextRetryDelayMs).toBe(3_000);
  });

  it("exhausts retries at attempt 3 without scheduling retry or fallback execution", () => {
    const result = buildProviderExecutionDecision(baseInput({ errorCode: "REQUEST_TIMEOUT", attemptNumber: 3 }));
    expect(result).toMatchObject({
      attemptsExhausted: true,
      retryScheduled: false,
      nextRetryDelayMs: null,
      fallbackRequired: true,
      fallbackExecutionStarted: false,
      action: "MANUAL_REVIEW_REQUIRED",
      manualReviewRequired: true,
      jobShouldPause: true,
    });
  });

  it("applies Retry-After within the safe range and caps it at 30000ms", () => {
    expect(buildProviderExecutionDecision(baseInput({ retryAfterMs: 2_500 })).nextRetryDelayMs).toBe(2_500);
    expect(buildProviderExecutionDecision(baseInput({ retryAfterMs: 45_000 })).nextRetryDelayMs).toBe(
      providerExecutionDefaults.maxRetryAfterMs,
    );
  });

  it("rejects invalid Retry-After values before copying raw inputs", () => {
    for (const retryAfterMs of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = buildProviderExecutionDecision(baseInput({ retryAfterMs }));
      expect(result).toMatchObject({
        valid: false,
        action: "STOP_CONFIGURATION_ERROR",
        reasonCode: "PROVIDER_EXECUTION_REQUEST_VALIDATION_ERROR",
        requestId: null,
        providerId: null,
      });
    }
  });

  it("rejects invalid attempt values and attempt overflow", () => {
    for (const attemptNumber of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(buildProviderExecutionDecision(baseInput({ attemptNumber })).valid).toBe(false);
    }
    expect(buildProviderExecutionDecision(baseInput({ attemptNumber: 4, maxAttempts: 3 })).valid).toBe(false);
  });

  it("rejects invalid timeout and HTTP status values", () => {
    for (const requestTimeoutMs of [0, -1, 1.5, 120_001]) {
      expect(buildProviderExecutionDecision(baseInput({ requestTimeoutMs })).valid).toBe(false);
    }
    for (const httpStatus of [99, 600, 200.5]) {
      expect(buildProviderExecutionDecision(baseInput({ httpStatus })).valid).toBe(false);
    }
  });

  it("rejects unsafe requestId and providerId without exposing raw secrets", () => {
    const unsafeRequest = buildProviderExecutionDecision(baseInput({ requestId: "Authorization: Bearer token" }));
    const unsafeProvider = buildProviderExecutionDecision(
      baseInput({ providerId: "https://evil.example/token" as ProviderExecutionPolicyInput["providerId"] }),
    );
    expect(unsafeRequest.valid).toBe(false);
    expect(unsafeProvider.valid).toBe(false);
    const serialized = JSON.stringify({ unsafeRequest, unsafeProvider }).toLowerCase();
    expect(serialized).not.toContain("authorization: bearer token");
    expect(serialized).not.toContain("evil.example");
    expect(serialized).not.toContain("https://");
  });

  it("rejects invalid capability, error code, booleans, and maxAttempts", () => {
    expect(buildProviderExecutionDecision(baseInput({ capability: "bad" as ProviderExecutionPolicyInput["capability"] })).valid).toBe(
      false,
    );
    expect(buildProviderExecutionDecision(baseInput({ errorCode: "BAD" as ProviderExecutionPolicyInput["errorCode"] })).valid).toBe(
      false,
    );
    expect(buildProviderExecutionDecision(baseInput({ executionStarted: "true" as unknown as boolean })).valid).toBe(false);
    expect(buildProviderExecutionDecision(baseInput({ maxAttempts: 0 })).valid).toBe(false);
  });

  it("rejects selected=false Phase 2 selections", () => {
    const result = buildProviderExecutionDecision(baseInput({ selection: unselectedProvider() }));
    expect(result).toMatchObject({
      valid: false,
      requestId: null,
      capability: null,
      providerId: null,
      retryScheduled: false,
      fallbackExecutionStarted: false,
      executionStarted: false,
      persistable: false,
      publishable: false,
      jobShouldPause: true,
      action: "STOP_CONFIGURATION_ERROR",
      reasonCode: "PROVIDER_EXECUTION_REQUEST_VALIDATION_ERROR",
    });
  });

  it("accepts actual Phase 2 Router selections only", () => {
    const result = buildProviderExecutionDecision(baseInput());
    expect(result).toMatchObject({
      valid: true,
      capability: "medical_source_fetch",
      providerId: "cdc-safe-fetch",
    });
  });

  it("rejects directly constructed selected=true selections", () => {
    const result = buildProviderExecutionDecision(baseInput({ selection: forgedSelection() }));
    expect(result).toMatchObject({
      valid: false,
      capability: null,
      providerId: null,
      retryScheduled: false,
      fallbackExecutionStarted: false,
      executionStarted: false,
      persistable: false,
      publishable: false,
      jobShouldPause: true,
      action: "STOP_CONFIGURATION_ERROR",
      reasonCode: "PROVIDER_EXECUTION_REQUEST_VALIDATION_ERROR",
    });
  });

  it("rejects cloned Phase 2 selections", () => {
    const selection = validSelection();
    const clonedSelection = {
      ...selection,
      candidateProviderIds: [...selection.candidateProviderIds],
    } as ValidatedProviderSelection;
    expect(buildProviderExecutionDecision(baseInput({ selection: clonedSelection })).valid).toBe(false);
  });

  it("rejects null, primitive, and array selections without throwing", () => {
    for (const selection of [null, undefined, "selected", 1, []]) {
      const result = buildProviderExecutionDecision(
        baseInput({ selection: selection as unknown as ProviderExecutionPolicyInput["selection"] }),
      );
      expect(result).toMatchObject({
        valid: false,
        capability: null,
        providerId: null,
        action: "STOP_CONFIGURATION_ERROR",
        reasonCode: "PROVIDER_EXECUTION_REQUEST_VALIDATION_ERROR",
      });
    }
  });

  it("rejects Phase 2 selection capability mismatch", () => {
    const result = buildProviderExecutionDecision(
      baseInput({
        selection: forgedSelection({ capability: "notification", selectedProviderId: "n8n-health-question-webhook" }),
      }),
    );
    expect(result.valid).toBe(false);
  });

  it("rejects Phase 2 selection provider mismatch", () => {
    const result = buildProviderExecutionDecision(
      baseInput({ selection: forgedSelection({ selectedProviderId: "internal-source-fetch-preview" }) }),
    );
    expect(result.valid).toBe(false);
  });

  it("does not allow cdc-safe-fetch to be reused as an AI medical review provider", () => {
    const result = buildProviderExecutionDecision(
      baseInput({
        capability: "ai_medical_review",
        providerId: "cdc-safe-fetch",
        selection: forgedSelection({ capability: "ai_medical_review", selectedTrustTier: "medical_review_approved" }),
      }),
    );
    expect(result.valid).toBe(false);
  });

  it("uses manual review for content policy blocks and never auto-fallbacks", () => {
    const result = buildProviderExecutionDecision(baseInput({ errorCode: "CONTENT_POLICY_BLOCKED", httpStatus: null }));
    expect(result.retryScheduled).toBe(false);
    expect(result.fallbackRequired).toBe(false);
    expect(result.fallbackExecutionStarted).toBe(false);
    expect(result.manualReviewRequired).toBe(true);
    expect(result.action).toBe("MANUAL_REVIEW_REQUIRED");
    expect(result.jobShouldPause).toBe(true);
  });

  it("treats terminal errors as final failures or configuration stops", () => {
    for (const errorCode of ["AUTHENTICATION_FAILED", "PERMISSION_DENIED", "UNKNOWN_PROVIDER_ERROR"] as const) {
      const result = buildProviderExecutionDecision(baseInput({ errorCode, httpStatus: null }));
      expect(result.retryable).toBe(false);
      expect(result.retryScheduled).toBe(false);
      expect(result.terminal).toBe(true);
      expect(result.action).toBe("FAILED_FINAL");
      expect(result.reasonCode).toBe("PROVIDER_EXECUTION_FAILED_FINAL");
      expect(result.manualReviewRequired).toBe(true);
    }
    const configurationResult = buildProviderExecutionDecision(
      baseInput({ errorCode: "CONFIGURATION_ERROR", httpStatus: null, executionStarted: false }),
    );
    expect(configurationResult.action).toBe("STOP_CONFIGURATION_ERROR");
    expect(configurationResult.reasonCode).toBe("PROVIDER_EXECUTION_CONFIGURATION_ERROR");
  });

  it("rejects non-configuration provider errors that did not start execution", () => {
    const result = buildProviderExecutionDecision(baseInput({ errorCode: "REQUEST_TIMEOUT", executionStarted: false }));
    expect(result).toMatchObject({
      valid: false,
      action: "STOP_CONFIGURATION_ERROR",
      reasonCode: "PROVIDER_EXECUTION_REQUEST_VALIDATION_ERROR",
    });
  });

  it("forces medical fail-closed for every capability error combination", () => {
    for (const errorCode of providerFailureErrorCodes) {
      const result = buildProviderExecutionDecision(
        baseInput({
          errorCode,
          httpStatus: null,
          executionStarted: errorCode === "CONFIGURATION_ERROR" ? false : true,
        }),
      );
      expect(result.persistable).toBe(false);
      expect(result.publishable).toBe(false);
      expect(result.jobShouldPause).toBe(true);
      expect(result.manualReviewRequired).toBe(true);
    }
  });

  it("keeps all failure decisions non-persistable and non-publishable", () => {
    for (const errorCode of providerFailureErrorCodes) {
      const result = buildProviderExecutionDecision(baseInput({ errorCode, httpStatus: null }));
      expect(result.failClosed).toBe(true);
      expect(result.persistable).toBe(false);
      expect(result.publishable).toBe(false);
      expect(result.fallbackExecutionStarted).toBe(false);
      expect(result.executionStarted).toBe(false);
    }
  });

  it("does not mutate input and returns deterministic results", () => {
    const input = baseInput({ errorCode: "PROVIDER_UNAVAILABLE", httpStatus: 503 });
    const before = JSON.stringify(input);
    const first = buildProviderExecutionDecision(input);
    const second = buildProviderExecutionDecision(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(second).toEqual(first);
  });

  it("does not expose forbidden request or provider body fields in decisions", () => {
    const result = buildProviderExecutionDecision(baseInput());
    expect(JSON.stringify(result).toLowerCase()).not.toMatch(
      /token|apikey|api_key|authorization|cookie|rawmedicaltext|prompt|html|responsebody|body/,
    );
  });

  it("does not expose ProviderExecutionImportsOnly or providerSelected boolean in the public module", async () => {
    const moduleExports = await import("./providerExecutionPolicy");
    expect("ProviderExecutionImportsOnly" in moduleExports).toBe(false);
    expect(JSON.stringify(baseInput())).not.toContain("providerSelected");
  });
});
