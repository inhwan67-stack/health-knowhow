import { describe, expect, it } from "vitest";

import {
  AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY,
  AI_DRAFT_PROVIDER_INTEGRATION_TRUST_TIER,
  validateAiDraftProviderIntegrationContract,
  type AiDraftProviderIntegrationContract,
} from "./aiDraftProviderIntegrationContract";

function contract(overrides: Partial<AiDraftProviderIntegrationContract> = {}): AiDraftProviderIntegrationContract {
  const providerId = overrides.provider?.providerId ?? "future-ai-draft-provider";

  return {
    provider: {
      providerId,
    },
    capability: AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY,
    trustTier: AI_DRAFT_PROVIDER_INTEGRATION_TRUST_TIER,
    approvalState: {
      approvedForSelection: false,
      providerExecutionAuthorized: false,
      productionExecutionEnabled: false,
      credentialVerified: false,
      adapterBound: false,
    },
    credentialRequirements: {
      credentialRequired: true,
      credentialEnvironmentKeyName: "AI_DRAFT_PROVIDER_API_KEY_NAME",
    },
    adapterRequirements: {
      providerId,
      capability: AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY,
      trustTier: AI_DRAFT_PROVIDER_INTEGRATION_TRUST_TIER,
      timeoutPolicyRequired: true,
      retryPolicy: "explicitly_disabled",
      fallbackPolicy: "explicitly_disabled",
      safeOutputReferenceRequired: true,
      rawProviderResponseExposed: false,
      credentialExposed: false,
      candidateValidationRequired: true,
      manualReviewRequired: true,
    },
    outputSafety: {
      providerId,
      capability: AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY,
      safeOutputReferenceRequired: true,
      rawProviderResponseExposed: false,
      credentialExposed: false,
      internalMetadataExposed: false,
      candidateValidationRequired: true,
      manualReviewRequired: true,
      finalApprovalGranted: false,
      persistable: false,
      publishable: false,
    },
    ...overrides,
  };
}

function expectAlwaysSafe(result: ReturnType<typeof validateAiDraftProviderIntegrationContract>): void {
  expect(result.approvedForSelection).toBe(false);
  expect(result.providerExecutionAuthorized).toBe(false);
  expect(result.productionExecutionEnabled).toBe(false);
  expect(result.credentialVerified).toBe(false);
  expect(result.adapterBound).toBe(false);
  expect(result.manualReviewRequired).toBe(true);
  expect(result.finalApprovalGranted).toBe(false);
  expect(result.persistable).toBe(false);
  expect(result.publishable).toBe(false);
  expect(result.databaseWritten).toBe(false);
  expect(result.storageWritten).toBe(false);
  expect(result.n8nTriggered).toBe(false);
  expect(result.publicationTriggered).toBe(false);
  expect(result.notificationSent).toBe(false);
  expect(result.failClosed).toBe(true);
  expect(result.sideEffects).toEqual({
    providerApiCalled: false,
    databaseWritten: false,
    storageWritten: false,
    n8nTriggered: false,
    publicationTriggered: false,
    notificationSent: false,
  });
}

describe("validateAiDraftProviderIntegrationContract", () => {
  it("accepts a production-disabled contract without authorizing execution", () => {
    const result = validateAiDraftProviderIntegrationContract(contract());

    expect(result).toMatchObject({
      valid: true,
      providerId: "future-ai-draft-provider",
      capability: AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY,
      trustTier: AI_DRAFT_PROVIDER_INTEGRATION_TRUST_TIER,
      reasonCode: "AI_DRAFT_PROVIDER_INTEGRATION_CONTRACT_VALID_PRODUCTION_DISABLED",
    });
    expectAlwaysSafe(result);
    if (result.valid) {
      expect(result.contract.approvalState.approvedForSelection).toBe(false);
      expect(result.contract.approvalState.providerExecutionAuthorized).toBe(false);
      expect(result.contract.approvalState.productionExecutionEnabled).toBe(false);
      expect(result.contract.approvalState.credentialVerified).toBe(false);
      expect(result.contract.approvalState.adapterBound).toBe(false);
      expect(Object.isFrozen(result.contract)).toBe(true);
    }
  });

  it("accepts credential-required metadata only with a safe non-null environment key name", () => {
    const result = validateAiDraftProviderIntegrationContract(
      contract({
        credentialRequirements: {
          credentialRequired: true,
          credentialEnvironmentKeyName: "AI_DRAFT_PROVIDER_API_KEY_NAME",
        },
      }),
    );

    expect(result.valid).toBe(true);
    expectAlwaysSafe(result);
  });

  it("fails closed for the wrong capability", () => {
    const result = validateAiDraftProviderIntegrationContract(contract({ capability: "ai_medical_review" as never }));

    expect(result).toMatchObject({
      valid: false,
      reasonCode: "AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY_INVALID",
      providerId: "future-ai-draft-provider",
      capability: null,
    });
    expectAlwaysSafe(result);
  });

  it("fails closed for the wrong trust tier", () => {
    const result = validateAiDraftProviderIntegrationContract(contract({ trustTier: "trusted_service" as never }));

    expect(result).toMatchObject({
      valid: false,
      reasonCode: "AI_DRAFT_PROVIDER_INTEGRATION_TRUST_TIER_INVALID",
      trustTier: null,
    });
    expectAlwaysSafe(result);
  });

  it.each<[string, Record<string, unknown>]>([
    ["approvedForSelection", { approvedForSelection: true }],
    ["providerExecutionAuthorized", { providerExecutionAuthorized: true }],
    ["productionExecutionEnabled", { productionExecutionEnabled: true }],
    ["credentialVerified", { credentialVerified: true }],
    ["adapterBound", { adapterBound: true }],
  ])("rejects %s=true during the contract-only phase", (_name, override) => {
    const result = validateAiDraftProviderIntegrationContract(
      contract({
        approvalState: {
          approvedForSelection: false,
          providerExecutionAuthorized: false,
          productionExecutionEnabled: false,
          credentialVerified: false,
          adapterBound: false,
          ...override,
        },
      }),
    );

    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_INTEGRATION_APPROVAL_STATE_INVALID");
    expectAlwaysSafe(result);
  });

  it.each<[string, string]>([
    ["empty", ""],
    ["space", "future provider"],
    ["control", "future\nprovider"],
    ["url", "https://evil.example/provider"],
    ["credential", "Authorization-Bearer-secret"],
    ["too long", `a${"b".repeat(63)}a`],
  ])("rejects unsafe providerId: %s", (_name, providerId) => {
    const result = validateAiDraftProviderIntegrationContract(
      contract({
        provider: { providerId },
        adapterRequirements: { ...contract().adapterRequirements, providerId },
        outputSafety: { ...contract().outputSafety, providerId },
      }),
    );

    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_INTEGRATION_PROVIDER_INVALID");
    expect(result.providerId).toBeNull();
    expect(JSON.stringify(result)).not.toMatch(/Authorization|Bearer|secret|evil|https/);
    expectAlwaysSafe(result);
  });

  it("rejects adapter metadata providerId mismatch", () => {
    const result = validateAiDraftProviderIntegrationContract(
      contract({ adapterRequirements: { ...contract().adapterRequirements, providerId: "other-provider" } }),
    );

    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_INTEGRATION_ADAPTER_REQUIREMENTS_INVALID");
    expectAlwaysSafe(result);
  });

  it.each<[string, Record<string, unknown>]>([
    ["capability", { capability: "ai_medical_review" }],
    ["trust tier", { trustTier: "trusted_service" }],
    ["timeout", { timeoutPolicyRequired: false }],
    ["retry", { retryPolicy: "retry_allowed" }],
    ["fallback", { fallbackPolicy: "fallback_allowed" }],
    ["safe output reference", { safeOutputReferenceRequired: false }],
    ["raw response", { rawProviderResponseExposed: true }],
    ["credential exposure", { credentialExposed: true }],
    ["candidate validation", { candidateValidationRequired: false }],
    ["manual review", { manualReviewRequired: false }],
  ])("rejects unsafe adapter requirement: %s", (_name, override) => {
    const result = validateAiDraftProviderIntegrationContract(
      contract({ adapterRequirements: { ...contract().adapterRequirements, ...override } as never }),
    );

    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_INTEGRATION_ADAPTER_REQUIREMENTS_INVALID");
    expectAlwaysSafe(result);
  });

  it.each<[string, Record<string, unknown>]>([
    ["providerId", { providerId: "other-provider" }],
    ["capability", { capability: "ai_medical_review" }],
    ["safe output reference", { safeOutputReferenceRequired: false }],
    ["raw response", { rawProviderResponseExposed: true }],
    ["credential exposure", { credentialExposed: true }],
    ["internal metadata", { internalMetadataExposed: true }],
    ["candidate validation", { candidateValidationRequired: false }],
    ["manual review", { manualReviewRequired: false }],
    ["final approval", { finalApprovalGranted: true }],
    ["persistable", { persistable: true }],
    ["publishable", { publishable: true }],
  ])("rejects unsafe output safety: %s", (_name, override) => {
    const result = validateAiDraftProviderIntegrationContract(
      contract({ outputSafety: { ...contract().outputSafety, ...override } as never }),
    );

    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_INTEGRATION_OUTPUT_SAFETY_INVALID");
    expectAlwaysSafe(result);
  });

  it("accepts a null credential environment key when no credential is required", () => {
    const result = validateAiDraftProviderIntegrationContract(
      contract({ credentialRequirements: { credentialRequired: false, credentialEnvironmentKeyName: null } }),
    );

    expect(result.valid).toBe(true);
    expectAlwaysSafe(result);
  });

  it("rejects credential-required metadata with a null environment key", () => {
    const result = validateAiDraftProviderIntegrationContract(
      contract({ credentialRequirements: { credentialRequired: true, credentialEnvironmentKeyName: null } }),
    );

    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_INTEGRATION_CREDENTIAL_REQUIREMENTS_INVALID");
    expectAlwaysSafe(result);
  });

  it("rejects credential-free metadata with a non-null environment key", () => {
    const result = validateAiDraftProviderIntegrationContract(
      contract({
        credentialRequirements: {
          credentialRequired: false,
          credentialEnvironmentKeyName: "AI_DRAFT_PROVIDER_API_KEY_NAME",
        },
      }),
    );

    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_INTEGRATION_CREDENTIAL_REQUIREMENTS_INVALID");
    expectAlwaysSafe(result);
  });

  it.each<[string, string]>([
    ["actual value", "sk-abc123"],
    ["authorization header", "Authorization: Bearer super-secret"],
    ["lowercase", "ai_draft_provider_api_key_name"],
    ["unsafe token-like name", "AI_DRAFT_PROVIDER_TOKEN"],
  ])("rejects unsafe credential environment key metadata: %s", (_name, credentialEnvironmentKeyName) => {
    const result = validateAiDraftProviderIntegrationContract(
      contract({ credentialRequirements: { credentialRequired: true, credentialEnvironmentKeyName } }),
    );

    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_INTEGRATION_CREDENTIAL_REQUIREMENTS_INVALID");
    expect(JSON.stringify(result)).not.toMatch(/Authorization|Bearer|super-secret|sk-abc123/);
    expectAlwaysSafe(result);
  });

  it.each<unknown>([undefined, null, "contract", 1, true, [], Object.create(null)])("fails closed for non-plain contracts", (value) => {
    const result = validateAiDraftProviderIntegrationContract(value);

    expect(result.valid).toBe(false);
    expect(result.contract).toBeNull();
    expectAlwaysSafe(result);
  });

  it("fails closed for custom prototype input", () => {
    class ContractLike {
      provider = contract().provider;
      capability = contract().capability;
      trustTier = contract().trustTier;
      approvalState = contract().approvalState;
      credentialRequirements = contract().credentialRequirements;
      adapterRequirements = contract().adapterRequirements;
      outputSafety = contract().outputSafety;
    }

    const result = validateAiDraftProviderIntegrationContract(new ContractLike());

    expect(result.valid).toBe(false);
    expectAlwaysSafe(result);
  });

  it("fails closed for getters and setters without invoking provider work", () => {
    const value = contract() as Record<string, unknown>;
    Object.defineProperty(value, "provider", {
      enumerable: true,
      get() {
        throw new Error("Authorization Bearer secret https://evil.example");
      },
    });

    const result = validateAiDraftProviderIntegrationContract(value);

    expect(result.valid).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/Authorization|Bearer|secret|evil|https/);
    expectAlwaysSafe(result);
  });

  it.each<[string, unknown]>([
    ["extra key", { extra: true }],
    ["missing key", (() => {
      const value: Record<string, unknown> = { ...contract() };
      delete value.outputSafety;
      return value;
    })()],
    ["symbol key", Object.assign(contract(), { [Symbol("secret")]: "hidden" })],
  ])("fails closed for malformed own keys: %s", (_name, value) => {
    const result = validateAiDraftProviderIntegrationContract(value);

    expect(result.valid).toBe(false);
    expectAlwaysSafe(result);
  });

  it("fails closed for non-enumerable properties", () => {
    const value = contract() as Record<string, unknown>;
    Object.defineProperty(value, "provider", { enumerable: false, value: contract().provider });

    const result = validateAiDraftProviderIntegrationContract(value);

    expect(result.valid).toBe(false);
    expectAlwaysSafe(result);
  });

  it("fails closed for a throwing proxy without propagating raw errors", () => {
    const value = new Proxy(contract(), {
      getOwnPropertyDescriptor() {
        throw new Error("Authorization Bearer secret https://evil.example");
      },
    });

    const result = validateAiDraftProviderIntegrationContract(value);

    expect(result.valid).toBe(false);
    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_INTEGRATION_CONTRACT_KEYS_INVALID");
    expect(JSON.stringify(result)).not.toMatch(/Authorization|Bearer|secret|evil|https/);
    expectAlwaysSafe(result);
  });

  it("fails closed for descriptor trap proxies", () => {
    const value = new Proxy(contract(), {
      ownKeys() {
        return Reflect.ownKeys(contract());
      },
      getOwnPropertyDescriptor(_target, property) {
        if (property === "capability") {
          return { enumerable: true, configurable: true, get: () => AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY };
        }
        return Reflect.getOwnPropertyDescriptor(contract(), property);
      },
    });

    const result = validateAiDraftProviderIntegrationContract(value);

    expect(result.valid).toBe(false);
    expectAlwaysSafe(result);
  });

  it("fails closed for stateful proxies", () => {
    let reads = 0;
    const value = new Proxy(contract(), {
      getOwnPropertyDescriptor(target, property) {
        reads += 1;
        if (reads > 0 && property === "capability") {
          return { enumerable: true, configurable: true, value: "ai_medical_review" };
        }
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
    });

    const result = validateAiDraftProviderIntegrationContract(value);

    expect(result.valid).toBe(false);
    expectAlwaysSafe(result);
  });

  it("returns no raw provider, registry, adapter, credential, or internal metadata", () => {
    const result = validateAiDraftProviderIntegrationContract(contract());
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/rawProviderResult|providerResult|registry|execute|apiKey|Authorization|Bearer|secret/i);
    expectAlwaysSafe(result);
  });
});
