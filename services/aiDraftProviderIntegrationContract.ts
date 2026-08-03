export const AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY = "ai_medical_draft_generation" as const;
export const AI_DRAFT_PROVIDER_INTEGRATION_TRUST_TIER = "medical_review_approved" as const;

export type AiDraftProviderIntegrationCapability = typeof AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY;
export type AiDraftProviderIntegrationTrustTier = typeof AI_DRAFT_PROVIDER_INTEGRATION_TRUST_TIER;

export type AiDraftProviderIntegrationProvider = Readonly<{
  providerId: string;
}>;

export type AiDraftProviderIntegrationApprovalState = Readonly<{
  approvedForSelection: false;
  providerExecutionAuthorized: false;
  productionExecutionEnabled: false;
  credentialVerified: false;
  adapterBound: false;
}>;

export type AiDraftProviderIntegrationCredentialRequirements = Readonly<{
  credentialRequired: boolean;
  credentialEnvironmentKeyName: string | null;
}>;

export type AiDraftProviderIntegrationAdapterRequirements = Readonly<{
  providerId: string;
  capability: AiDraftProviderIntegrationCapability;
  trustTier: AiDraftProviderIntegrationTrustTier;
  timeoutPolicyRequired: true;
  retryPolicy: "explicitly_disabled";
  fallbackPolicy: "explicitly_disabled";
  safeOutputReferenceRequired: true;
  rawProviderResponseExposed: false;
  credentialExposed: false;
  candidateValidationRequired: true;
  manualReviewRequired: true;
}>;

export type AiDraftProviderIntegrationOutputSafety = Readonly<{
  providerId: string;
  capability: AiDraftProviderIntegrationCapability;
  safeOutputReferenceRequired: true;
  rawProviderResponseExposed: false;
  credentialExposed: false;
  internalMetadataExposed: false;
  candidateValidationRequired: true;
  manualReviewRequired: true;
  finalApprovalGranted: false;
  persistable: false;
  publishable: false;
}>;

export type AiDraftProviderIntegrationContract = Readonly<{
  provider: AiDraftProviderIntegrationProvider;
  capability: AiDraftProviderIntegrationCapability;
  trustTier: AiDraftProviderIntegrationTrustTier;
  approvalState: AiDraftProviderIntegrationApprovalState;
  credentialRequirements: AiDraftProviderIntegrationCredentialRequirements;
  adapterRequirements: AiDraftProviderIntegrationAdapterRequirements;
  outputSafety: AiDraftProviderIntegrationOutputSafety;
}>;

export type AiDraftProviderIntegrationSideEffects = Readonly<{
  providerApiCalled: false;
  databaseWritten: false;
  storageWritten: false;
  n8nTriggered: false;
  publicationTriggered: false;
  notificationSent: false;
}>;

export type AiDraftProviderIntegrationReasonCode =
  | "AI_DRAFT_PROVIDER_INTEGRATION_CONTRACT_VALID_PRODUCTION_DISABLED"
  | "AI_DRAFT_PROVIDER_INTEGRATION_CONTRACT_NOT_OBJECT"
  | "AI_DRAFT_PROVIDER_INTEGRATION_CONTRACT_KEYS_INVALID"
  | "AI_DRAFT_PROVIDER_INTEGRATION_PROVIDER_INVALID"
  | "AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY_INVALID"
  | "AI_DRAFT_PROVIDER_INTEGRATION_TRUST_TIER_INVALID"
  | "AI_DRAFT_PROVIDER_INTEGRATION_APPROVAL_STATE_INVALID"
  | "AI_DRAFT_PROVIDER_INTEGRATION_CREDENTIAL_REQUIREMENTS_INVALID"
  | "AI_DRAFT_PROVIDER_INTEGRATION_ADAPTER_REQUIREMENTS_INVALID"
  | "AI_DRAFT_PROVIDER_INTEGRATION_OUTPUT_SAFETY_INVALID"
  | "AI_DRAFT_PROVIDER_INTEGRATION_VALIDATION_ERROR";

export type AiDraftProviderIntegrationValidationResult =
  | Readonly<{
      valid: true;
      contract: AiDraftProviderIntegrationContract;
      providerId: string;
      capability: AiDraftProviderIntegrationCapability;
      trustTier: AiDraftProviderIntegrationTrustTier;
      reasonCode: "AI_DRAFT_PROVIDER_INTEGRATION_CONTRACT_VALID_PRODUCTION_DISABLED";
      approvedForSelection: false;
      providerExecutionAuthorized: false;
      productionExecutionEnabled: false;
      credentialVerified: false;
      adapterBound: false;
      manualReviewRequired: true;
      finalApprovalGranted: false;
      persistable: false;
      publishable: false;
      databaseWritten: false;
      storageWritten: false;
      n8nTriggered: false;
      publicationTriggered: false;
      notificationSent: false;
      failClosed: true;
      sideEffects: AiDraftProviderIntegrationSideEffects;
    }>
  | Readonly<{
      valid: false;
      contract: null;
      providerId: string | null;
      capability: AiDraftProviderIntegrationCapability | null;
      trustTier: AiDraftProviderIntegrationTrustTier | null;
      reasonCode: Exclude<
        AiDraftProviderIntegrationReasonCode,
        "AI_DRAFT_PROVIDER_INTEGRATION_CONTRACT_VALID_PRODUCTION_DISABLED"
      >;
      approvedForSelection: false;
      providerExecutionAuthorized: false;
      productionExecutionEnabled: false;
      credentialVerified: false;
      adapterBound: false;
      manualReviewRequired: true;
      finalApprovalGranted: false;
      persistable: false;
      publishable: false;
      databaseWritten: false;
      storageWritten: false;
      n8nTriggered: false;
      publicationTriggered: false;
      notificationSent: false;
      failClosed: true;
      sideEffects: AiDraftProviderIntegrationSideEffects;
    }>;

type SnapshotResult<T> = { valid: true; value: T } | { valid: false };

const CONTRACT_KEYS = Object.freeze([
  "provider",
  "capability",
  "trustTier",
  "approvalState",
  "credentialRequirements",
  "adapterRequirements",
  "outputSafety",
] as const);

const PROVIDER_KEYS = Object.freeze(["providerId"] as const);
const APPROVAL_STATE_KEYS = Object.freeze([
  "approvedForSelection",
  "providerExecutionAuthorized",
  "productionExecutionEnabled",
  "credentialVerified",
  "adapterBound",
] as const);
const CREDENTIAL_REQUIREMENT_KEYS = Object.freeze(["credentialRequired", "credentialEnvironmentKeyName"] as const);
const ADAPTER_REQUIREMENT_KEYS = Object.freeze([
  "providerId",
  "capability",
  "trustTier",
  "timeoutPolicyRequired",
  "retryPolicy",
  "fallbackPolicy",
  "safeOutputReferenceRequired",
  "rawProviderResponseExposed",
  "credentialExposed",
  "candidateValidationRequired",
  "manualReviewRequired",
] as const);
const OUTPUT_SAFETY_KEYS = Object.freeze([
  "providerId",
  "capability",
  "safeOutputReferenceRequired",
  "rawProviderResponseExposed",
  "credentialExposed",
  "internalMetadataExposed",
  "candidateValidationRequired",
  "manualReviewRequired",
  "finalApprovalGranted",
  "persistable",
  "publishable",
] as const);

const MAX_PROVIDER_ID_LENGTH = 64;
const SAFE_PROVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{1,62}[a-z0-9]$/;
const SAFE_ENVIRONMENT_KEY_NAME_PATTERN = /^[A-Z][A-Z0-9_]{2,79}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;
const SECRET_LIKE_PATTERN =
  /authorization|bearer|token|api[-_ ]?key\s*[:=]|secret|service[_-]?role|sb_secret|sk-[a-z0-9]|x-[a-z0-9-]*client-[a-z0-9-]*/i;

export function validateAiDraftProviderIntegrationContract(
  contract: unknown,
): AiDraftProviderIntegrationValidationResult {
  try {
    if (typeof contract !== "object" || contract === null || Array.isArray(contract)) {
      return failure("AI_DRAFT_PROVIDER_INTEGRATION_CONTRACT_NOT_OBJECT", null, null, null);
    }

    const snapshot = snapshotExactOwnDataObject(contract, CONTRACT_KEYS);
    if (!snapshot.valid) {
      return failure("AI_DRAFT_PROVIDER_INTEGRATION_CONTRACT_KEYS_INVALID", null, null, null);
    }

    const provider = snapshotProvider(snapshot.value.provider);
    if (!provider.valid) return failure("AI_DRAFT_PROVIDER_INTEGRATION_PROVIDER_INVALID", null, null, null);
    const providerId = provider.value.providerId;

    if (snapshot.value.capability !== AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY) {
      return failure("AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY_INVALID", providerId, null, null);
    }
    if (snapshot.value.trustTier !== AI_DRAFT_PROVIDER_INTEGRATION_TRUST_TIER) {
      return failure("AI_DRAFT_PROVIDER_INTEGRATION_TRUST_TIER_INVALID", providerId, AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY, null);
    }

    const approvalState = snapshotApprovalState(snapshot.value.approvalState);
    if (!approvalState.valid) {
      return failure(
        "AI_DRAFT_PROVIDER_INTEGRATION_APPROVAL_STATE_INVALID",
        providerId,
        AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY,
        AI_DRAFT_PROVIDER_INTEGRATION_TRUST_TIER,
      );
    }

    const credentialRequirements = snapshotCredentialRequirements(snapshot.value.credentialRequirements);
    if (!credentialRequirements.valid) {
      return failure(
        "AI_DRAFT_PROVIDER_INTEGRATION_CREDENTIAL_REQUIREMENTS_INVALID",
        providerId,
        AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY,
        AI_DRAFT_PROVIDER_INTEGRATION_TRUST_TIER,
      );
    }

    const adapterRequirements = snapshotAdapterRequirements(snapshot.value.adapterRequirements, providerId);
    if (!adapterRequirements.valid) {
      return failure(
        "AI_DRAFT_PROVIDER_INTEGRATION_ADAPTER_REQUIREMENTS_INVALID",
        providerId,
        AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY,
        AI_DRAFT_PROVIDER_INTEGRATION_TRUST_TIER,
      );
    }

    const outputSafety = snapshotOutputSafety(snapshot.value.outputSafety, providerId);
    if (!outputSafety.valid) {
      return failure(
        "AI_DRAFT_PROVIDER_INTEGRATION_OUTPUT_SAFETY_INVALID",
        providerId,
        AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY,
        AI_DRAFT_PROVIDER_INTEGRATION_TRUST_TIER,
      );
    }

    const safeContract: AiDraftProviderIntegrationContract = Object.freeze({
      provider: provider.value,
      capability: AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY,
      trustTier: AI_DRAFT_PROVIDER_INTEGRATION_TRUST_TIER,
      approvalState: approvalState.value,
      credentialRequirements: credentialRequirements.value,
      adapterRequirements: adapterRequirements.value,
      outputSafety: outputSafety.value,
    });

    return Object.freeze({
      valid: true,
      contract: safeContract,
      providerId,
      capability: AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY,
      trustTier: AI_DRAFT_PROVIDER_INTEGRATION_TRUST_TIER,
      reasonCode: "AI_DRAFT_PROVIDER_INTEGRATION_CONTRACT_VALID_PRODUCTION_DISABLED",
      ...safeFlags(),
    });
  } catch {
    return failure("AI_DRAFT_PROVIDER_INTEGRATION_VALIDATION_ERROR", null, null, null);
  }
}

function snapshotProvider(value: unknown): SnapshotResult<AiDraftProviderIntegrationProvider> {
  const snapshot = snapshotExactOwnDataObject(value, PROVIDER_KEYS);
  if (!snapshot.valid) return { valid: false };
  const providerId = snapshot.value.providerId;
  if (!isSafeProviderId(providerId)) return { valid: false };
  return { valid: true, value: Object.freeze({ providerId }) };
}

function snapshotApprovalState(value: unknown): SnapshotResult<AiDraftProviderIntegrationApprovalState> {
  const snapshot = snapshotExactOwnDataObject(value, APPROVAL_STATE_KEYS);
  if (!snapshot.valid) return { valid: false };
  if (snapshot.value.approvedForSelection !== false) return { valid: false };
  if (snapshot.value.providerExecutionAuthorized !== false) return { valid: false };
  if (snapshot.value.productionExecutionEnabled !== false) return { valid: false };
  if (snapshot.value.credentialVerified !== false) return { valid: false };
  if (snapshot.value.adapterBound !== false) return { valid: false };

  return {
    valid: true,
    value: Object.freeze({
      approvedForSelection: false,
      providerExecutionAuthorized: false,
      productionExecutionEnabled: false,
      credentialVerified: false,
      adapterBound: false,
    }),
  };
}

function snapshotCredentialRequirements(
  value: unknown,
): SnapshotResult<AiDraftProviderIntegrationCredentialRequirements> {
  const snapshot = snapshotExactOwnDataObject(value, CREDENTIAL_REQUIREMENT_KEYS);
  if (!snapshot.valid) return { valid: false };
  const credentialRequired = snapshot.value.credentialRequired;
  const credentialEnvironmentKeyName = snapshot.value.credentialEnvironmentKeyName;
  if (typeof credentialRequired !== "boolean") return { valid: false };
  if (credentialRequired === true) {
    if (!isSafeEnvironmentKeyName(credentialEnvironmentKeyName)) return { valid: false };
  } else if (credentialEnvironmentKeyName !== null) return { valid: false };

  return {
    valid: true,
    value: Object.freeze({
      credentialRequired,
      credentialEnvironmentKeyName,
    }),
  };
}

function snapshotAdapterRequirements(
  value: unknown,
  providerId: string,
): SnapshotResult<AiDraftProviderIntegrationAdapterRequirements> {
  const snapshot = snapshotExactOwnDataObject(value, ADAPTER_REQUIREMENT_KEYS);
  if (!snapshot.valid) return { valid: false };
  if (snapshot.value.providerId !== providerId) return { valid: false };
  if (snapshot.value.capability !== AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY) return { valid: false };
  if (snapshot.value.trustTier !== AI_DRAFT_PROVIDER_INTEGRATION_TRUST_TIER) return { valid: false };
  if (snapshot.value.timeoutPolicyRequired !== true) return { valid: false };
  if (snapshot.value.retryPolicy !== "explicitly_disabled") return { valid: false };
  if (snapshot.value.fallbackPolicy !== "explicitly_disabled") return { valid: false };
  if (snapshot.value.safeOutputReferenceRequired !== true) return { valid: false };
  if (snapshot.value.rawProviderResponseExposed !== false) return { valid: false };
  if (snapshot.value.credentialExposed !== false) return { valid: false };
  if (snapshot.value.candidateValidationRequired !== true) return { valid: false };
  if (snapshot.value.manualReviewRequired !== true) return { valid: false };

  return {
    valid: true,
    value: Object.freeze({
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
    }),
  };
}

function snapshotOutputSafety(
  value: unknown,
  providerId: string,
): SnapshotResult<AiDraftProviderIntegrationOutputSafety> {
  const snapshot = snapshotExactOwnDataObject(value, OUTPUT_SAFETY_KEYS);
  if (!snapshot.valid) return { valid: false };
  if (snapshot.value.providerId !== providerId) return { valid: false };
  if (snapshot.value.capability !== AI_DRAFT_PROVIDER_INTEGRATION_CAPABILITY) return { valid: false };
  if (snapshot.value.safeOutputReferenceRequired !== true) return { valid: false };
  if (snapshot.value.rawProviderResponseExposed !== false) return { valid: false };
  if (snapshot.value.credentialExposed !== false) return { valid: false };
  if (snapshot.value.internalMetadataExposed !== false) return { valid: false };
  if (snapshot.value.candidateValidationRequired !== true) return { valid: false };
  if (snapshot.value.manualReviewRequired !== true) return { valid: false };
  if (snapshot.value.finalApprovalGranted !== false) return { valid: false };
  if (snapshot.value.persistable !== false) return { valid: false };
  if (snapshot.value.publishable !== false) return { valid: false };

  return {
    valid: true,
    value: Object.freeze({
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
    }),
  };
}

function snapshotExactOwnDataObject<const TKeys extends readonly string[]>(
  value: unknown,
  allowedKeys: TKeys,
): SnapshotResult<Readonly<Record<TKeys[number], unknown>>> {
  if (!isPlainObject(value)) return { valid: false };

  let descriptors: Record<PropertyKey, PropertyDescriptor>;
  let ownKeys: (string | symbol)[];
  try {
    descriptors = Object.getOwnPropertyDescriptors(value);
    ownKeys = Reflect.ownKeys(value);
  } catch {
    return { valid: false };
  }

  if (ownKeys.some((key) => typeof key === "symbol")) return { valid: false };
  if (ownKeys.length !== allowedKeys.length) return { valid: false };
  if (Object.keys(descriptors).length !== allowedKeys.length) return { valid: false };

  const allowed = new Set<string>(allowedKeys);
  const snapshot: Record<string, unknown> = {};
  for (const key of ownKeys) {
    if (typeof key !== "string" || !allowed.has(key)) return { valid: false };
    const descriptor = descriptors[key];
    if (!descriptor || !isDataDescriptor(descriptor) || descriptor.enumerable !== true) return { valid: false };
    if (typeof descriptor.value === "string" && containsForbiddenContent(descriptor.value)) return { valid: false };
    snapshot[key] = descriptor.value;
  }

  for (const key of allowedKeys) {
    if (!(key in snapshot)) return { valid: false };
  }

  return { valid: true, value: Object.freeze(snapshot) as Readonly<Record<TKeys[number], unknown>> };
}

function failure(
  reasonCode: Exclude<
    AiDraftProviderIntegrationReasonCode,
    "AI_DRAFT_PROVIDER_INTEGRATION_CONTRACT_VALID_PRODUCTION_DISABLED"
  >,
  providerId: string | null,
  capability: AiDraftProviderIntegrationCapability | null,
  trustTier: AiDraftProviderIntegrationTrustTier | null,
): AiDraftProviderIntegrationValidationResult {
  return Object.freeze({
    valid: false,
    contract: null,
    providerId,
    capability,
    trustTier,
    reasonCode,
    ...safeFlags(),
  });
}

function safeFlags() {
  return {
    approvedForSelection: false,
    providerExecutionAuthorized: false,
    productionExecutionEnabled: false,
    credentialVerified: false,
    adapterBound: false,
    manualReviewRequired: true,
    finalApprovalGranted: false,
    persistable: false,
    publishable: false,
    databaseWritten: false,
    storageWritten: false,
    n8nTriggered: false,
    publicationTriggered: false,
    notificationSent: false,
    failClosed: true,
    sideEffects: createNoSideEffects(),
  } as const;
}

function createNoSideEffects(): AiDraftProviderIntegrationSideEffects {
  return Object.freeze({
    providerApiCalled: false,
    databaseWritten: false,
    storageWritten: false,
    n8nTriggered: false,
    publicationTriggered: false,
    notificationSent: false,
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  try {
    return Object.getPrototypeOf(value) === Object.prototype;
  } catch {
    return false;
  }
}

function isDataDescriptor(descriptor: PropertyDescriptor): descriptor is PropertyDescriptor & { value: unknown } {
  return "value" in descriptor && !("get" in descriptor) && !("set" in descriptor);
}

function isSafeProviderId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!value || value.length > MAX_PROVIDER_ID_LENGTH) return false;
  if (!SAFE_PROVIDER_ID_PATTERN.test(value)) return false;
  if (containsForbiddenContent(value)) return false;
  return !value.includes("://") && !value.includes("\n") && !value.includes("\r");
}

function isSafeEnvironmentKeyName(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!SAFE_ENVIRONMENT_KEY_NAME_PATTERN.test(value)) return false;
  if (containsForbiddenContent(value)) return false;
  return true;
}

function containsForbiddenContent(value: string): boolean {
  return CONTROL_CHARACTER_PATTERN.test(value) || SECRET_LIKE_PATTERN.test(value);
}
