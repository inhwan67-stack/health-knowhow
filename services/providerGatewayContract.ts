import {
  type ProviderFailureErrorCode,
  isMedicalSafetyCapability,
  isSafeRegisteredProviderId,
  providerCapabilities,
  type ProviderCapability,
  type RegisteredProviderId,
} from "./providerResiliencePolicy";

export const providerTrustTiers = [
  "medical_authoritative",
  "medical_review_approved",
  "trusted_service",
] as const;

export type ProviderTrustTier = (typeof providerTrustTiers)[number];

export const allowedTrustTiersByCapability: Record<ProviderCapability, readonly ProviderTrustTier[]> = {
  medical_source_search: ["medical_authoritative"],
  medical_source_fetch: ["medical_authoritative"],
  ai_medical_review: ["medical_review_approved"],
  ai_translation: ["trusted_service"],
  image_generation: ["trusted_service"],
  notification: ["trusted_service"],
};

declare const validatedProviderRegistryBrand: unique symbol;

export type ValidatedProviderRegistry = ProviderRegistry & {
  readonly [validatedProviderRegistryBrand]: true;
};

export type ProviderApprovalProfile = {
  providerId: RegisteredProviderId;
  approvedCapabilities: readonly ProviderCapability[];
  approvedTrustTier: ProviderTrustTier;
  approvedForSelection: boolean;
};

const providerApprovalProfiles: readonly ProviderApprovalProfile[] = [
  {
    providerId: "cdc-safe-fetch",
    approvedCapabilities: ["medical_source_fetch"],
    approvedTrustTier: "medical_authoritative",
    approvedForSelection: true,
  },
] as const;

const providerApprovalProfileById = new Map<RegisteredProviderId, ProviderApprovalProfile>(
  providerApprovalProfiles.map((profile) => [profile.providerId, profile]),
);

const validatedRegistryObjects = new WeakSet<ProviderRegistry>();

export type ProviderAdapterExecuteRequest = {
  requestId: string;
  capability: ProviderCapability;
  providerId: RegisteredProviderId;
  payloadFingerprint: string;
  contentId?: string;
  revisionId?: string;
  sourceIds?: readonly string[];
};

export type ProviderAdapterExecuteResult = {
  success: boolean;
  providerId: RegisteredProviderId;
  capability: ProviderCapability;
  internalOutputReferenceId?: string;
  failureCode?: ProviderFailureErrorCode;
};

export type ProviderAdapterExecuteContract = (
  input: ProviderAdapterExecuteRequest,
) => Promise<ProviderAdapterExecuteResult>;

export type ProviderAdapterContract = {
  providerId: RegisteredProviderId;
  capabilities: readonly ProviderCapability[];
  priority: number;
  trustTier: ProviderTrustTier;
  enabled: boolean;
  execute?: ProviderAdapterExecuteContract;
};

export type ProviderMetadata = Omit<ProviderAdapterContract, "execute">;

export type ProviderRegistry = {
  providers: readonly ProviderMetadata[];
};

export type ProviderRegistryBuildResult =
  | {
      valid: true;
      providerCount: number;
      providerIds: readonly RegisteredProviderId[];
      registry: ValidatedProviderRegistry;
      failClosed: false;
      reasonCode: "PROVIDER_REGISTRY_VALID";
    }
  | {
      valid: false;
      providerCount: 0;
      providerIds: [];
      registry: [];
      reasonCode: "PROVIDER_REGISTRY_CONFIGURATION_ERROR";
      failClosed: true;
      persistable: false;
      publishable: false;
      executionStarted: false;
      jobShouldPause: true;
      unsafeProviderIdsExposed: false;
    };

export type ProviderSelectionResult =
  | {
      selected: true;
      capability: ProviderCapability | null;
      selectedProviderId: RegisteredProviderId;
      selectedTrustTier: ProviderTrustTier;
      candidateProviderIds: RegisteredProviderId[];
      failClosed: false;
      persistable: false;
      publishable: false;
      executionStarted: false;
      jobShouldPause: false;
      manualReviewRequired: false;
      reasonCode: "PROVIDER_SELECTED_FOR_PREVIEW";
    }
  | {
      selected: false;
      capability: ProviderCapability | null;
      selectedProviderId: null;
      selectedTrustTier: null;
      candidateProviderIds: RegisteredProviderId[];
      failClosed: true;
      persistable: false;
      publishable: false;
      executionStarted: false;
      jobShouldPause: true;
      manualReviewRequired: boolean;
      reasonCode:
        | "NO_ELIGIBLE_PROVIDER"
        | "PROVIDER_REGISTRY_CONFIGURATION_ERROR"
        | "PROVIDER_TRUST_POLICY_BLOCKED"
        | "PROVIDER_REQUEST_VALIDATION_ERROR";
    };

export function buildProviderRegistry(adapters: readonly ProviderAdapterContract[]): ProviderRegistryBuildResult {
  const providerIds = new Set<RegisteredProviderId>();

  for (const adapter of adapters) {
    if (!isProviderAdapterLike(adapter)) return registryConfigurationError();
    if (!isSafeRegisteredProviderId(adapter.providerId)) return registryConfigurationError();
    if (providerIds.has(adapter.providerId)) return registryConfigurationError();
    providerIds.add(adapter.providerId);
    if (typeof adapter.enabled !== "boolean") return registryConfigurationError();
    if (!isValidCapabilities(adapter.capabilities)) return registryConfigurationError();
    if (!isValidPriority(adapter.priority)) return registryConfigurationError();
    if (!isProviderTrustTier(adapter.trustTier)) return registryConfigurationError();
    if (!adapter.capabilities.every((capability) => trustTierAllowsCapability(adapter.trustTier, capability))) {
      return registryConfigurationError();
    }
    if (!adapter.capabilities.every((capability) => providerProfileAllowsCapability(adapter.providerId, adapter.trustTier, capability))) {
      return registryConfigurationError();
    }
  }

  const providers = adapters.map((adapter) =>
    Object.freeze({
      providerId: adapter.providerId,
      capabilities: Object.freeze([...adapter.capabilities]),
      priority: adapter.priority,
      trustTier: adapter.trustTier,
      enabled: adapter.enabled,
    }),
  );
  const registry = Object.freeze({
    providers: Object.freeze(providers),
  }) as unknown as ValidatedProviderRegistry;
  const frozenProviderIds = Object.freeze([...providerIds].sort(compareProviderId));
  validatedRegistryObjects.add(registry);

  return {
    valid: true,
    providerCount: adapters.length,
    providerIds: frozenProviderIds,
    registry,
    failClosed: false,
    reasonCode: "PROVIDER_REGISTRY_VALID",
  };
}

export function selectProviderForCapability(
  registry: ValidatedProviderRegistry,
  capability: unknown,
): ProviderSelectionResult {
  if (!isProviderCapability(capability)) return buildProviderRequestValidationErrorSelection();
  if (!validatedRegistryObjects.has(registry)) return buildProviderRegistryConfigurationErrorSelection(capability);
  if (!isRegistryMetadataIntegrityValid(registry)) return buildProviderRegistryConfigurationErrorSelection(capability);
  const providers = [...registry.providers];
  const candidateProviders = providers
    .filter((provider) => provider.enabled)
    .filter((provider) => provider.capabilities.includes(capability))
    .filter((provider) => trustTierAllowsCapability(provider.trustTier, capability))
    .sort(compareProviderPriority);

  if (candidateProviders.length > 0) {
    const selectedProvider = candidateProviders[0];
    return {
      selected: true,
      capability,
      selectedProviderId: selectedProvider.providerId,
      selectedTrustTier: selectedProvider.trustTier,
      candidateProviderIds: candidateProviders.map((provider) => provider.providerId),
      failClosed: false,
      persistable: false,
      publishable: false,
      executionStarted: false,
      jobShouldPause: false,
      manualReviewRequired: false,
      reasonCode: "PROVIDER_SELECTED_FOR_PREVIEW",
    };
  }

  const enabledCapabilityProviders = providers
    .filter((provider) => provider.enabled)
    .filter((provider) => provider.capabilities.includes(capability));
  const reasonCode =
    enabledCapabilityProviders.length > 0 ? "PROVIDER_TRUST_POLICY_BLOCKED" : "NO_ELIGIBLE_PROVIDER";

  return {
    selected: false,
    capability,
    selectedProviderId: null,
    selectedTrustTier: null,
    candidateProviderIds: [],
    failClosed: true,
    persistable: false,
    publishable: false,
    executionStarted: false,
    jobShouldPause: true,
    manualReviewRequired: isMedicalSafetyCapability(capability),
    reasonCode,
  };
}

export function buildProviderRegistryConfigurationErrorSelection(capability: unknown): ProviderSelectionResult {
  if (!isProviderCapability(capability)) return buildProviderRequestValidationErrorSelection();
  return {
    selected: false,
    capability,
    selectedProviderId: null,
    selectedTrustTier: null,
    candidateProviderIds: [],
    failClosed: true,
    persistable: false,
    publishable: false,
    executionStarted: false,
    jobShouldPause: true,
    manualReviewRequired: isMedicalSafetyCapability(capability),
    reasonCode: "PROVIDER_REGISTRY_CONFIGURATION_ERROR",
  };
}

function buildProviderRequestValidationErrorSelection(): ProviderSelectionResult {
  return {
    selected: false,
    capability: null,
    selectedProviderId: null,
    selectedTrustTier: null,
    candidateProviderIds: [],
    failClosed: true,
    persistable: false,
    publishable: false,
    executionStarted: false,
    jobShouldPause: true,
    manualReviewRequired: false,
    reasonCode: "PROVIDER_REQUEST_VALIDATION_ERROR",
  };
}

function registryConfigurationError(): ProviderRegistryBuildResult {
  return {
    valid: false,
    providerCount: 0,
    providerIds: [],
    registry: [],
    reasonCode: "PROVIDER_REGISTRY_CONFIGURATION_ERROR",
    failClosed: true,
    persistable: false,
    publishable: false,
    executionStarted: false,
    jobShouldPause: true,
    unsafeProviderIdsExposed: false,
  };
}

export function isProviderCapability(value: unknown): value is ProviderCapability {
  return typeof value === "string" && (providerCapabilities as readonly string[]).includes(value);
}

export function isProviderTrustTier(value: unknown): value is ProviderTrustTier {
  return typeof value === "string" && (providerTrustTiers as readonly string[]).includes(value);
}

function isProviderAdapterLike(value: unknown): value is ProviderAdapterContract {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidCapabilities(capabilities: readonly ProviderCapability[]): boolean {
  if (!Array.isArray(capabilities)) return false;
  if (capabilities.length === 0) return false;
  if (!capabilities.every(isProviderCapability)) return false;
  return new Set(capabilities).size === capabilities.length;
}

function isValidPriority(priority: number): boolean {
  return Number.isSafeInteger(priority) && priority >= 1;
}

function trustTierAllowsCapability(trustTier: ProviderTrustTier, capability: ProviderCapability): boolean {
  if (!isProviderTrustTier(trustTier) || !isProviderCapability(capability)) return false;
  return allowedTrustTiersByCapability[capability].includes(trustTier);
}

function providerProfileAllowsCapability(
  providerId: RegisteredProviderId,
  trustTier: ProviderTrustTier,
  capability: ProviderCapability,
): boolean {
  const profile = providerApprovalProfileById.get(providerId);
  if (!profile?.approvedForSelection) return false;
  if (profile.approvedTrustTier !== trustTier) return false;
  return profile.approvedCapabilities.includes(capability);
}

function isRegistryMetadataIntegrityValid(registry: ProviderRegistry): boolean {
  if (!Object.isFrozen(registry) || !Array.isArray(registry.providers) || !Object.isFrozen(registry.providers)) {
    return false;
  }

  const providerIds = new Set<RegisteredProviderId>();
  for (const provider of registry.providers) {
    if (!isProviderAdapterLike(provider)) return false;
    if (!Object.isFrozen(provider)) return false;
    if (!isSafeRegisteredProviderId(provider.providerId)) return false;
    if (providerIds.has(provider.providerId)) return false;
    providerIds.add(provider.providerId);
    if (typeof provider.enabled !== "boolean") return false;
    if (!isValidPriority(provider.priority)) return false;
    if (!isProviderTrustTier(provider.trustTier)) return false;
    if (!Array.isArray(provider.capabilities) || !Object.isFrozen(provider.capabilities)) return false;
    if (!isValidCapabilities(provider.capabilities)) return false;
    if (!provider.capabilities.every((capability) => trustTierAllowsCapability(provider.trustTier, capability))) {
      return false;
    }
    if (!provider.capabilities.every((capability) => providerProfileAllowsCapability(provider.providerId, provider.trustTier, capability))) {
      return false;
    }
    if ("execute" in provider) return false;
  }
  return true;
}

function compareProviderPriority(left: ProviderMetadata, right: ProviderMetadata): number {
  if (left.priority !== right.priority) return left.priority - right.priority;
  return compareProviderId(left.providerId, right.providerId);
}

function compareProviderId(left: RegisteredProviderId, right: RegisteredProviderId): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
