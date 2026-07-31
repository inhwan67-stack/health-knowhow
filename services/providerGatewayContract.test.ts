import { describe, expect, it, vi } from "vitest";

import {
  allowedTrustTiersByCapability,
  buildProviderRegistry,
  buildProviderRegistryConfigurationErrorSelection,
  isProviderCapability,
  isProviderTrustTier,
  providerTrustTiers,
  selectProviderForCapability,
  type ProviderAdapterContract,
  type ProviderAdapterExecuteRequest,
  type ProviderAdapterExecuteResult,
  type ValidatedProviderRegistry,
} from "./providerGatewayContract";
import { providerCapabilities } from "./providerResiliencePolicy";

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

function buildOrThrow(adapters: readonly ProviderAdapterContract[]): ValidatedProviderRegistry {
  const result = buildProviderRegistry(adapters);
  if (!result.valid) throw new Error("Expected provider registry to be valid.");
  return result.registry;
}

describe("provider gateway contract", () => {
  it("defines allowed trust tier policy for every capability", () => {
    expect(providerTrustTiers).toEqual(["medical_authoritative", "medical_review_approved", "trusted_service"]);
    for (const capability of providerCapabilities) {
      expect(allowedTrustTiersByCapability[capability].length).toBeGreaterThan(0);
      expect(isProviderCapability(capability)).toBe(true);
    }
    for (const trustTier of providerTrustTiers) {
      expect(isProviderTrustTier(trustTier)).toBe(true);
    }
  });

  it("selects approved medical source fetch providers only after registry validation", () => {
    const registry = buildOrThrow([adapter({ priority: 2 })]);
    const result = selectProviderForCapability(registry, "medical_source_fetch");
    expect(result).toMatchObject({
      selected: true,
      selectedProviderId: "cdc-safe-fetch",
      selectedTrustTier: "medical_authoritative",
      reasonCode: "PROVIDER_SELECTED_FOR_PREVIEW",
      failClosed: false,
      jobShouldPause: false,
      manualReviewRequired: false,
      persistable: false,
      publishable: false,
      executionStarted: false,
    });
  });

  it("does not infer approval for medical source search providers", () => {
    const result = buildProviderRegistry([
      adapter({ providerId: "naver-datalab", capabilities: ["medical_source_search"], trustTier: "medical_authoritative" }),
    ]);
    expect(result).toMatchObject({
      valid: false,
      reasonCode: "PROVIDER_REGISTRY_CONFIGURATION_ERROR",
      failClosed: true,
      persistable: false,
      publishable: false,
      executionStarted: false,
      jobShouldPause: true,
    });
  });

  it("does not infer approval for AI medical review providers", () => {
    const result = buildProviderRegistry([
      adapter({ providerId: "internal-content-drafts", capabilities: ["ai_medical_review"], trustTier: "medical_review_approved" }),
    ]);
    expect(result.valid).toBe(false);
  });

  it("does not infer approval for trusted service capabilities", () => {
    for (const capability of ["ai_translation", "image_generation", "notification"] as const) {
      const result = buildProviderRegistry([
        adapter({ providerId: "canonical-preview", capabilities: [capability], trustTier: "trusted_service" }),
      ]);
      expect(result.valid).toBe(false);
    }
  });

  it("does not select lower trust tier providers as medical fallback", () => {
    const result = buildProviderRegistry([
      adapter({ providerId: "canonical-preview", capabilities: ["medical_source_fetch"], trustTier: "trusted_service" }),
    ]);
    expect(result).toMatchObject({
      valid: false,
      reasonCode: "PROVIDER_REGISTRY_CONFIGURATION_ERROR",
      failClosed: true,
    });
  });

  it("excludes disabled approved providers", () => {
    const registry = buildOrThrow([adapter({ enabled: false })]);
    const result = selectProviderForCapability(registry, "medical_source_fetch");
    expect(result).toMatchObject({
      selected: false,
      reasonCode: "NO_ELIGIBLE_PROVIDER",
      manualReviewRequired: true,
    });
  });

  it("excludes approved providers that do not support the requested capability", () => {
    const registry = buildOrThrow([adapter()]);
    const result = selectProviderForCapability(registry, "notification");
    expect(result).toMatchObject({
      selected: false,
      reasonCode: "NO_ELIGIBLE_PROVIDER",
      manualReviewRequired: false,
    });
  });

  it("uses deterministic priority selection for approved providers", () => {
    const registry = buildOrThrow([adapter({ priority: 5 })]);
    const result = selectProviderForCapability(registry, "medical_source_fetch");
    expect(result.selected).toBe(true);
    if (result.selected) expect(result.selectedProviderId).toBe("cdc-safe-fetch");
  });

  it("does not create unapproved second providers just to satisfy tie-break fallback", () => {
    const result = buildProviderRegistry([adapter({ providerId: "internal-source-fetch-preview", priority: 1 })]);
    expect(result.valid).toBe(false);
  });

  it("returns the same result when input provider array order changes", () => {
    const providers = [adapter({ priority: 1 })];
    const first = selectProviderForCapability(buildOrThrow(providers), "medical_source_fetch");
    const second = selectProviderForCapability(buildOrThrow([...providers].reverse()), "medical_source_fetch");
    expect(second).toEqual(first);
  });

  it("fails closed when no eligible provider exists", () => {
    const result = selectProviderForCapability(buildOrThrow([]), "medical_source_fetch");
    expect(result).toMatchObject({
      selected: false,
      selectedProviderId: null,
      failClosed: true,
      persistable: false,
      publishable: false,
      executionStarted: false,
      jobShouldPause: true,
      manualReviewRequired: true,
      reasonCode: "NO_ELIGIBLE_PROVIDER",
    });
  });

  it("sets manualReviewRequired=false when no non-medical provider is available", () => {
    const result = selectProviderForCapability(buildOrThrow([]), "notification");
    expect(result.selected).toBe(false);
    if (!result.selected) expect(result.manualReviewRequired).toBe(false);
  });

  it("rejects duplicate provider ids in the registry", () => {
    const result = buildProviderRegistry([adapter(), adapter()]);
    expect(result).toMatchObject({
      valid: false,
      reasonCode: "PROVIDER_REGISTRY_CONFIGURATION_ERROR",
      failClosed: true,
      persistable: false,
      publishable: false,
      executionStarted: false,
      jobShouldPause: true,
      unsafeProviderIdsExposed: false,
    });
  });

  it("rejects invalid priorities", () => {
    for (const priority of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      const result = buildProviderRegistry([adapter({ priority })]);
      expect(result.valid).toBe(false);
    }
  });

  it("rejects unknown capabilities without throwing", () => {
    const result = buildProviderRegistry([
      adapter({ capabilities: ["not_a_capability" as ProviderAdapterContract["capabilities"][number]] }),
    ]);
    expect(result).toMatchObject({
      valid: false,
      reasonCode: "PROVIDER_REGISTRY_CONFIGURATION_ERROR",
      failClosed: true,
      executionStarted: false,
      persistable: false,
      publishable: false,
      jobShouldPause: true,
    });
  });

  it("rejects invalid trust tiers without throwing", () => {
    const result = buildProviderRegistry([adapter({ trustTier: "not_a_tier" as ProviderAdapterContract["trustTier"] })]);
    expect(result).toMatchObject({
      valid: false,
      reasonCode: "PROVIDER_REGISTRY_CONFIGURATION_ERROR",
      failClosed: true,
      executionStarted: false,
      persistable: false,
      publishable: false,
      jobShouldPause: true,
    });
  });

  it("rejects empty capabilities", () => {
    const result = buildProviderRegistry([adapter({ capabilities: [] })]);
    expect(result.valid).toBe(false);
  });

  it("rejects duplicate capabilities", () => {
    const result = buildProviderRegistry([adapter({ capabilities: ["medical_source_fetch", "medical_source_fetch"] })]);
    expect(result.valid).toBe(false);
  });

  it("rejects non-boolean enabled values at runtime", () => {
    const result = buildProviderRegistry([adapter({ enabled: "true" as unknown as boolean })]);
    expect(result.valid).toBe(false);
  });

  it("rejects trust tiers that do not match provider approval profiles", () => {
    const result = buildProviderRegistry([adapter({ trustTier: "trusted_service" })]);
    expect(result).toMatchObject({
      valid: false,
      reasonCode: "PROVIDER_REGISTRY_CONFIGURATION_ERROR",
      unsafeProviderIdsExposed: false,
    });
  });

  it("blocks forged valid registries from reaching router success", () => {
    const forgedRegistry: ValidatedProviderRegistry = {
      providers: [
        {
          providerId: "cdc-safe-fetch",
          capabilities: ["medical_source_fetch"],
          priority: 1,
          trustTier: "medical_authoritative",
          enabled: true,
        },
      ],
    } as unknown as ValidatedProviderRegistry;
    const result = selectProviderForCapability(forgedRegistry, "medical_source_fetch");
    expect(result).toMatchObject({
      selected: false,
      reasonCode: "PROVIDER_REGISTRY_CONFIGURATION_ERROR",
      failClosed: true,
      manualReviewRequired: true,
      persistable: false,
      publishable: false,
      executionStarted: false,
    });
  });

  it("does not expose raw unregistered provider ids in configuration errors", () => {
    const unsafeProviderId = "https://evil.example/Authorization-Bearer-token";
    const result = buildProviderRegistry([adapter({ providerId: unsafeProviderId as ProviderAdapterContract["providerId"] })]);
    expect(JSON.stringify(result)).not.toContain(unsafeProviderId);
    expect(JSON.stringify(result).toLowerCase()).not.toMatch(/authorization|bearer|token|evil/);
  });

  it("does not expose unregistered provider ids through router success", () => {
    const unsafeProviderId = "https://evil.example/provider";
    const invalidRegistry = buildProviderRegistry([
      adapter({ providerId: unsafeProviderId as ProviderAdapterContract["providerId"] }),
    ]);
    const selection = invalidRegistry.valid
      ? selectProviderForCapability(invalidRegistry.registry, "medical_source_fetch")
      : buildProviderRegistryConfigurationErrorSelection("medical_source_fetch");
    expect(selection.selected).toBe(false);
    expect(JSON.stringify(selection)).not.toContain(unsafeProviderId);
    expect(JSON.stringify(selection).toLowerCase()).not.toMatch(/evil|https/);
  });

  it("does not select registries with invalid priorities", () => {
    const invalidRegistry = buildProviderRegistry([adapter({ priority: -1 })]);
    const result = invalidRegistry.valid
      ? selectProviderForCapability(invalidRegistry.registry, "medical_source_fetch")
      : buildProviderRegistryConfigurationErrorSelection("medical_source_fetch");
    expect(result).toMatchObject({
      selected: false,
      reasonCode: "PROVIDER_REGISTRY_CONFIGURATION_ERROR",
    });
  });

  it("returns provider count and sorted provider ids for valid registries", () => {
    const result = buildProviderRegistry([adapter({ priority: 1 })]);
    expect(result).toMatchObject({
      valid: true,
      providerCount: 1,
      providerIds: ["cdc-safe-fetch"],
      failClosed: false,
      reasonCode: "PROVIDER_REGISTRY_VALID",
    });
  });

  it("deep-freezes successful registries and provider ids", () => {
    const result = buildProviderRegistry([adapter({ priority: 1 })]);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(Object.isFrozen(result.providerIds)).toBe(true);
      expect(Object.isFrozen(result.registry)).toBe(true);
      expect(Object.isFrozen(result.registry.providers)).toBe(true);
      expect(Object.isFrozen(result.registry.providers[0])).toBe(true);
      expect(Object.isFrozen(result.registry.providers[0].capabilities)).toBe(true);
    }
  });

  it("does not allow providerId mutation after validation to affect selection", () => {
    const registry = buildOrThrow([adapter()]);
    expect(() => {
      (registry.providers[0] as { providerId: string }).providerId = "naver-datalab";
    }).toThrow();
    const result = selectProviderForCapability(registry, "medical_source_fetch");
    expect(result.selected).toBe(true);
    if (result.selected) expect(result.selectedProviderId).toBe("cdc-safe-fetch");
  });

  it("does not allow trust tier mutation after validation to affect selection", () => {
    const registry = buildOrThrow([adapter()]);
    expect(() => {
      (registry.providers[0] as { trustTier: string }).trustTier = "trusted_service";
    }).toThrow();
    const result = selectProviderForCapability(registry, "medical_source_fetch");
    expect(result.selected).toBe(true);
  });

  it("does not allow priority mutation after validation to affect selection", () => {
    const registry = buildOrThrow([adapter({ priority: 5 })]);
    expect(() => {
      (registry.providers[0] as { priority: number }).priority = -1;
    }).toThrow();
    const result = selectProviderForCapability(registry, "medical_source_fetch");
    expect(result.selected).toBe(true);
  });

  it("does not allow capability mutation after validation to affect selection", () => {
    const registry = buildOrThrow([adapter()]);
    expect(() => {
      (registry.providers[0].capabilities as string[]).push("ai_medical_review");
    }).toThrow();
    expect(() => {
      (registry.providers[0] as unknown as { capabilities: string[] }).capabilities = ["ai_medical_review"];
    }).toThrow();
    const result = selectProviderForCapability(registry, "medical_source_fetch");
    expect(result.selected).toBe(true);
  });

  it("does not allow provider array mutation after validation to affect selection", () => {
    const registry = buildOrThrow([adapter()]);
    expect(() => {
      (registry.providers as unknown as ProviderAdapterContract[]).push(adapter({ providerId: "naver-datalab" }));
    }).toThrow();
    const result = selectProviderForCapability(registry, "medical_source_fetch");
    expect(result.selected).toBe(true);
    if (result.selected) expect(result.candidateProviderIds).toEqual(["cdc-safe-fetch"]);
  });

  it("success and failure selections are never persistable or publishable", () => {
    const success = selectProviderForCapability(buildOrThrow([adapter()]), "medical_source_fetch");
    const failure = selectProviderForCapability(buildOrThrow([]), "medical_source_fetch");
    expect(success.persistable).toBe(false);
    expect(success.publishable).toBe(false);
    expect(failure.persistable).toBe(false);
    expect(failure.publishable).toBe(false);
  });

  it("validates router capability without exposing invalid input", () => {
    const unsafeCapability = "medical_source_fetch\nAuthorization: Bearer token";
    const result = selectProviderForCapability(buildOrThrow([adapter()]), unsafeCapability);
    const serialized = JSON.stringify(result).toLowerCase();
    expect(result).toMatchObject({
      selected: false,
      capability: null,
      reasonCode: "PROVIDER_REQUEST_VALIDATION_ERROR",
      failClosed: true,
      persistable: false,
      publishable: false,
      executionStarted: false,
      jobShouldPause: true,
    });
    expect(serialized).not.toMatch(/authorization|bearer|token/);
  });

  it("does not start execution when selecting a provider", () => {
    const execute = vi.fn();
    const registry = buildOrThrow([adapter({ execute })]);
    const result = selectProviderForCapability(registry, "medical_source_fetch");
    expect(result.selected).toBe(true);
    expect(result.executionStarted).toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });

  it("does not preserve execute functions in metadata registries", () => {
    const execute = vi.fn();
    const result = buildProviderRegistry([adapter({ execute })]);
    expect(result.valid).toBe(true);
    if (result.valid) expect("execute" in result.registry.providers[0]).toBe(false);
  });

  it("defines structured execute request and result contracts without secret fields", () => {
    const request: ProviderAdapterExecuteRequest = {
      requestId: "provider-request-1",
      capability: "medical_source_fetch",
      providerId: "cdc-safe-fetch",
      payloadFingerprint: "a".repeat(64),
      contentId: "819852773404",
      revisionId: "13",
      sourceIds: ["2", "3", "4"],
    };
    const result: ProviderAdapterExecuteResult = {
      success: false,
      providerId: "cdc-safe-fetch",
      capability: "medical_source_fetch",
      failureCode: "REQUEST_TIMEOUT",
    };
    const serialized = JSON.stringify({ request, result }).toLowerCase();
    expect(serialized).not.toMatch(/token|apikey|api_key|authorization|cookie|rawmedicaltext|prompt|html/);
  });

  it("does not mutate input provider objects or arrays", () => {
    const providers = [adapter({ priority: 1 })];
    const before = JSON.stringify(providers);
    const registry = buildOrThrow(providers);
    selectProviderForCapability(registry, "medical_source_fetch");
    expect(JSON.stringify(providers)).toBe(before);
    expect(Object.isFrozen(providers)).toBe(false);
    expect(Object.isFrozen(providers[0])).toBe(false);
    expect(Object.isFrozen(providers[0].capabilities)).toBe(false);
  });

  it("returns identical results for identical inputs", () => {
    const registry = buildOrThrow([adapter()]);
    expect(selectProviderForCapability(registry, "medical_source_fetch")).toEqual(
      selectProviderForCapability(registry, "medical_source_fetch"),
    );
  });

  it("builds a fail-closed selection for registry configuration errors", () => {
    const result = buildProviderRegistryConfigurationErrorSelection("medical_source_fetch");
    expect(result).toMatchObject({
      selected: false,
      reasonCode: "PROVIDER_REGISTRY_CONFIGURATION_ERROR",
      failClosed: true,
      manualReviewRequired: true,
      persistable: false,
      publishable: false,
      executionStarted: false,
    });
  });

  it("does not expose invalid configuration helper capability input", () => {
    const unsafeCapability = "medical_source_fetch\nAuthorization: Bearer token";
    const result = buildProviderRegistryConfigurationErrorSelection(unsafeCapability);
    const serialized = JSON.stringify(result).toLowerCase();
    expect(result).toMatchObject({
      selected: false,
      capability: null,
      reasonCode: "PROVIDER_REQUEST_VALIDATION_ERROR",
      executionStarted: false,
      persistable: false,
      publishable: false,
    });
    expect(serialized).not.toMatch(/authorization|bearer|token/);
  });
});
