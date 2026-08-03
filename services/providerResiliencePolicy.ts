export const providerCapabilities = [
  "medical_source_search",
  "medical_source_fetch",
  "ai_medical_review",
  "ai_medical_draft_generation",
  "ai_translation",
  "image_generation",
  "notification",
] as const;

export type ProviderCapability = (typeof providerCapabilities)[number];

export const providerFailureErrorCodes = [
  "AUTHENTICATION_FAILED",
  "PERMISSION_DENIED",
  "RATE_LIMITED",
  "REQUEST_TIMEOUT",
  "PROVIDER_UNAVAILABLE",
  "INVALID_PROVIDER_RESPONSE",
  "CONTENT_POLICY_BLOCKED",
  "NETWORK_ERROR",
  "CONFIGURATION_ERROR",
  "UNKNOWN_PROVIDER_ERROR",
] as const;

export type ProviderFailureErrorCode = (typeof providerFailureErrorCodes)[number];

export type ProviderFailureInput = {
  capability: ProviderCapability;
  errorCode: ProviderFailureErrorCode;
  providerId: string;
  httpStatus?: number | null;
  attemptNumber?: number | null;
  message?: string | null;
  occurredAt?: string | null;
};

export type ProviderFailurePolicy = {
  retryable: boolean;
  fallbackAllowed: boolean;
  adminAlertRequired: boolean;
  terminal: boolean;
};

export type ProviderFailureDecision = ProviderFailurePolicy & {
  capability: ProviderCapability;
  errorCode: ProviderFailureErrorCode;
  providerId: string;
  httpStatus: number | null;
  attemptNumber: number | null;
  jobShouldPause: boolean;
  persistable: boolean;
  publishable: boolean;
  manualReviewRequired: boolean;
  reasonCode: string;
};

export const registeredProviderIds = [
  "canonical-preview",
  "cdc-safe-fetch",
  "internal-content-drafts",
  "internal-source-fetch-preview",
  "naver-datalab",
  "n8n-health-question-webhook",
  "upstash-ratelimit",
] as const;

export type RegisteredProviderId = (typeof registeredProviderIds)[number];

const MAX_PROVIDER_ID_LENGTH = 64;
const INVALID_PROVIDER_ID = "invalid-provider-id";
const safeProviderIdPattern = /^[a-z0-9][a-z0-9._-]{1,62}[a-z0-9]$/;
const secretLikeProviderIdPattern =
  /(?:authorization|bearer|token|api[_-]?key|secret|service[_-]?role|sb_secret|sk-[a-z0-9])/i;

const medicalSafetyCapabilities = new Set<ProviderCapability>([
  "medical_source_search",
  "medical_source_fetch",
  "ai_medical_review",
  "ai_medical_draft_generation",
]);

const registeredProviderIdSet = new Set<string>(registeredProviderIds);

const providerFailurePolicyByErrorCode: Record<ProviderFailureErrorCode, ProviderFailurePolicy> = {
  AUTHENTICATION_FAILED: {
    retryable: false,
    fallbackAllowed: false,
    adminAlertRequired: true,
    terminal: true,
  },
  PERMISSION_DENIED: {
    retryable: false,
    fallbackAllowed: false,
    adminAlertRequired: true,
    terminal: true,
  },
  RATE_LIMITED: {
    retryable: true,
    fallbackAllowed: true,
    adminAlertRequired: false,
    terminal: false,
  },
  REQUEST_TIMEOUT: {
    retryable: true,
    fallbackAllowed: true,
    adminAlertRequired: false,
    terminal: false,
  },
  PROVIDER_UNAVAILABLE: {
    retryable: true,
    fallbackAllowed: true,
    adminAlertRequired: false,
    terminal: false,
  },
  INVALID_PROVIDER_RESPONSE: {
    retryable: false,
    fallbackAllowed: true,
    adminAlertRequired: true,
    terminal: false,
  },
  CONTENT_POLICY_BLOCKED: {
    retryable: false,
    fallbackAllowed: false,
    adminAlertRequired: true,
    terminal: false,
  },
  NETWORK_ERROR: {
    retryable: true,
    fallbackAllowed: true,
    adminAlertRequired: false,
    terminal: false,
  },
  CONFIGURATION_ERROR: {
    retryable: false,
    fallbackAllowed: false,
    adminAlertRequired: true,
    terminal: true,
  },
  UNKNOWN_PROVIDER_ERROR: {
    retryable: false,
    fallbackAllowed: false,
    adminAlertRequired: true,
    terminal: true,
  },
};

export function isMedicalSafetyCapability(capability: ProviderCapability): boolean {
  return medicalSafetyCapabilities.has(capability);
}

export function getProviderFailurePolicy(errorCode: ProviderFailureErrorCode): ProviderFailurePolicy {
  return { ...providerFailurePolicyByErrorCode[errorCode] };
}

export function isSafeRegisteredProviderId(providerId: string): providerId is RegisteredProviderId {
  if (!providerId || providerId.length > MAX_PROVIDER_ID_LENGTH) return false;
  if (!safeProviderIdPattern.test(providerId)) return false;
  if (secretLikeProviderIdPattern.test(providerId)) return false;
  if (providerId.includes("://") || providerId.includes("\n") || providerId.includes("\r")) return false;
  return registeredProviderIdSet.has(providerId);
}

export function buildProviderFailureDecision(input: ProviderFailureInput): ProviderFailureDecision {
  const providerIdIsSafe = isSafeRegisteredProviderId(input.providerId);
  const effectiveErrorCode = providerIdIsSafe ? input.errorCode : "CONFIGURATION_ERROR";
  const policy = getProviderFailurePolicy(effectiveErrorCode);
  const isMedicalSafetyFailure = isMedicalSafetyCapability(input.capability);
  const manualReviewRequired = isMedicalSafetyFailure || effectiveErrorCode === "CONTENT_POLICY_BLOCKED";

  return {
    capability: input.capability,
    errorCode: effectiveErrorCode,
    providerId: providerIdIsSafe ? input.providerId : INVALID_PROVIDER_ID,
    httpStatus: input.httpStatus ?? null,
    attemptNumber: input.attemptNumber ?? null,
    retryable: policy.retryable,
    fallbackAllowed: policy.fallbackAllowed,
    adminAlertRequired: policy.adminAlertRequired,
    terminal: policy.terminal,
    jobShouldPause: isMedicalSafetyFailure || policy.terminal || manualReviewRequired,
    persistable: false,
    publishable: false,
    manualReviewRequired,
    reasonCode: providerIdIsSafe ? buildReasonCode(input.capability, effectiveErrorCode) : "PROVIDER_ID_CONFIGURATION_ERROR",
  };
}

function buildReasonCode(capability: ProviderCapability, errorCode: ProviderFailureErrorCode): string {
  return `${capability.toUpperCase()}_${errorCode}`;
}
