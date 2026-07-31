import {
  buildProviderFailureDecision,
  isSafeRegisteredProviderId,
  providerCapabilities,
  providerFailureErrorCodes,
  type ProviderCapability,
  type ProviderFailureDecision,
  type ProviderFailureErrorCode,
  type ProviderFailureInput,
  type RegisteredProviderId,
} from "./providerResiliencePolicy";
import {
  validateProviderSelectionForExecution,
  type ValidatedProviderSelection,
} from "./providerGatewayContract";

export type ProviderExecutionAction =
  | "RETRY_WAIT"
  | "FALLBACK_REVIEW_REQUIRED"
  | "MANUAL_REVIEW_REQUIRED"
  | "FAILED_FINAL"
  | "STOP_CONFIGURATION_ERROR";

export type ProviderExecutionReasonCode =
  | "PROVIDER_EXECUTION_RETRY_WAIT"
  | "PROVIDER_EXECUTION_FALLBACK_REVIEW_REQUIRED"
  | "PROVIDER_EXECUTION_MANUAL_REVIEW_REQUIRED"
  | "PROVIDER_EXECUTION_FAILED_FINAL"
  | "PROVIDER_EXECUTION_CONFIGURATION_ERROR"
  | "PROVIDER_EXECUTION_REQUEST_VALIDATION_ERROR";

export type ProviderExecutionPolicyInput = {
  requestId: string;
  capability: ProviderCapability;
  providerId: RegisteredProviderId;
  errorCode: ProviderFailureErrorCode;
  httpStatus?: number | null;
  attemptNumber: number;
  maxAttempts?: number | null;
  retryAfterMs?: number | null;
  requestTimeoutMs?: number | null;
  /**
   * Internal-only handoff from Phase 2 provider selection. Do not accept arbitrary
   * external JSON as a trusted selection result at an API boundary.
   */
  selection: ValidatedProviderSelection;
  /**
   * Observed previous state. Non-configuration provider failures must have started
   * execution; the returned decision always keeps executionStarted=false because
   * this policy never launches new work.
   */
  executionStarted: boolean;
};

export type ProviderExecutionDecision = {
  valid: boolean;
  requestId: string | null;
  capability: ProviderCapability | null;
  providerId: RegisteredProviderId | null;
  errorCode: ProviderFailureErrorCode | null;
  httpStatus: number | null;
  attemptNumber: number | null;
  maxAttempts: number | null;
  retryable: boolean;
  attemptsExhausted: boolean;
  retryScheduled: boolean;
  nextRetryDelayMs: number | null;
  fallbackRequired: boolean;
  fallbackExecutionStarted: false;
  manualReviewRequired: boolean;
  adminAlertRequired: boolean;
  terminal: boolean;
  failClosed: true;
  jobShouldPause: boolean;
  persistable: false;
  publishable: false;
  executionStarted: false;
  action: ProviderExecutionAction;
  reasonCode: ProviderExecutionReasonCode;
};

export type ProviderErrorNormalizationInput = {
  httpStatus?: number | null;
  timedOut?: boolean | null;
  malformedResponse?: boolean | null;
  contentPolicyBlocked?: boolean | null;
  networkError?: boolean | null;
  configurationError?: boolean | null;
};

export const providerExecutionDefaults = {
  maxAttempts: 3,
  requestTimeoutMs: 15_000,
  retryDelaysMs: [1_000, 3_000],
  maxRetryAfterMs: 30_000,
} as const;

const maxConfiguredAttempts = 10;
const maxRequestTimeoutMs = 120_000;
const safeRequestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const secretLikePattern = /(?:authorization|bearer|token|api[_-]?key|secret|service[_-]?role|sb_secret|sk-[a-z0-9])/i;
const retryableExecutionErrors = new Set<ProviderFailureErrorCode>([
  "RATE_LIMITED",
  "REQUEST_TIMEOUT",
  "PROVIDER_UNAVAILABLE",
  "NETWORK_ERROR",
]);

export function normalizeProviderFailureErrorCode(input: ProviderErrorNormalizationInput): ProviderFailureErrorCode {
  if (input.configurationError) return "CONFIGURATION_ERROR";
  if (input.contentPolicyBlocked) return "CONTENT_POLICY_BLOCKED";
  if (input.malformedResponse) return "INVALID_PROVIDER_RESPONSE";
  if (input.timedOut || input.httpStatus === 408) return "REQUEST_TIMEOUT";
  if (input.networkError) return "NETWORK_ERROR";

  switch (input.httpStatus) {
    case 401:
      return "AUTHENTICATION_FAILED";
    case 403:
      return "PERMISSION_DENIED";
    case 429:
      return "RATE_LIMITED";
    case 500:
    case 502:
    case 503:
    case 504:
      return "PROVIDER_UNAVAILABLE";
    default:
      return "UNKNOWN_PROVIDER_ERROR";
  }
}

export function buildProviderExecutionDecision(input: ProviderExecutionPolicyInput): ProviderExecutionDecision {
  const inputSnapshot = { ...input };
  const validationError = validateProviderExecutionInput(inputSnapshot);
  if (validationError) return validationError;

  const maxAttempts = inputSnapshot.maxAttempts ?? providerExecutionDefaults.maxAttempts;
  const failureDecision = buildProviderFailureDecision({
    capability: inputSnapshot.capability,
    errorCode: inputSnapshot.errorCode,
    providerId: inputSnapshot.providerId,
    httpStatus: inputSnapshot.httpStatus ?? null,
    attemptNumber: inputSnapshot.attemptNumber,
  } satisfies ProviderFailureInput);
  const attemptsExhausted = inputSnapshot.attemptNumber >= maxAttempts;
  const retryable = failureDecision.retryable && retryableExecutionErrors.has(failureDecision.errorCode);
  const retryScheduled = retryable && !attemptsExhausted;
  const nextRetryDelayMs = retryScheduled
    ? calculateNextRetryDelayMs(inputSnapshot.attemptNumber, inputSnapshot.retryAfterMs ?? null)
    : null;
  const fallbackRequired = !retryScheduled && failureDecision.fallbackAllowed;
  const action = selectProviderExecutionAction({
    failureDecision,
    attemptsExhausted,
    fallbackRequired,
    retryScheduled,
  });

  return {
    valid: true,
    requestId: inputSnapshot.requestId,
    capability: inputSnapshot.capability,
    providerId: inputSnapshot.providerId,
    errorCode: failureDecision.errorCode,
    httpStatus: inputSnapshot.httpStatus ?? null,
    attemptNumber: inputSnapshot.attemptNumber,
    maxAttempts,
    retryable,
    attemptsExhausted,
    retryScheduled,
    nextRetryDelayMs,
    fallbackRequired,
    fallbackExecutionStarted: false,
    manualReviewRequired: failureDecision.manualReviewRequired,
    adminAlertRequired: failureDecision.adminAlertRequired,
    terminal: failureDecision.terminal,
    failClosed: true,
    jobShouldPause: failureDecision.jobShouldPause || retryScheduled || fallbackRequired,
    persistable: false,
    publishable: false,
    executionStarted: false,
    action,
    reasonCode: reasonCodeForAction(action),
  };
}

export function isRetryableProviderError(errorCode: ProviderFailureErrorCode): boolean {
  return retryableExecutionErrors.has(errorCode);
}

function validateProviderExecutionInput(input: ProviderExecutionPolicyInput): ProviderExecutionDecision | null {
  if (!isSafeRequestId(input.requestId)) return validationFailure();
  if (!isProviderCapability(input.capability)) return validationFailure();
  if (!isSafeRegisteredProviderId(input.providerId)) return validationFailure();
  if (!isProviderFailureErrorCode(input.errorCode)) return validationFailure();
  if (!isValidAttemptNumber(input.attemptNumber)) return validationFailure();

  const maxAttempts = input.maxAttempts ?? providerExecutionDefaults.maxAttempts;
  if (!isValidMaxAttempts(maxAttempts)) return validationFailure();
  if (input.attemptNumber > maxAttempts) return validationFailure();

  const requestTimeoutMs = input.requestTimeoutMs ?? providerExecutionDefaults.requestTimeoutMs;
  if (!isValidRequestTimeoutMs(requestTimeoutMs)) return validationFailure();
  if (!isValidRetryAfterMs(input.retryAfterMs ?? null)) return validationFailure();
  if (!isValidHttpStatus(input.httpStatus ?? null)) return validationFailure();
  if (typeof input.executionStarted !== "boolean") return validationFailure();
  if (input.errorCode !== "CONFIGURATION_ERROR" && input.executionStarted !== true) return validationFailure();
  if (!isValidProviderSelectionForExecution(input.selection, input.capability, input.providerId)) {
    return validationFailure();
  }
  return null;
}

function selectProviderExecutionAction(input: {
  failureDecision: ProviderFailureDecision;
  attemptsExhausted: boolean;
  fallbackRequired: boolean;
  retryScheduled: boolean;
}): ProviderExecutionAction {
  if (input.retryScheduled) return "RETRY_WAIT";
  if (input.failureDecision.errorCode === "CONFIGURATION_ERROR") return "STOP_CONFIGURATION_ERROR";
  if (input.failureDecision.terminal) return "FAILED_FINAL";
  if (input.failureDecision.manualReviewRequired) return "MANUAL_REVIEW_REQUIRED";
  if (input.fallbackRequired) return "FALLBACK_REVIEW_REQUIRED";
  return "FAILED_FINAL";
}

function reasonCodeForAction(action: ProviderExecutionAction): ProviderExecutionReasonCode {
  switch (action) {
    case "RETRY_WAIT":
      return "PROVIDER_EXECUTION_RETRY_WAIT";
    case "FALLBACK_REVIEW_REQUIRED":
      return "PROVIDER_EXECUTION_FALLBACK_REVIEW_REQUIRED";
    case "MANUAL_REVIEW_REQUIRED":
      return "PROVIDER_EXECUTION_MANUAL_REVIEW_REQUIRED";
    case "FAILED_FINAL":
      return "PROVIDER_EXECUTION_FAILED_FINAL";
    case "STOP_CONFIGURATION_ERROR":
      return "PROVIDER_EXECUTION_CONFIGURATION_ERROR";
  }
}

function calculateNextRetryDelayMs(attemptNumber: number, retryAfterMs: number | null): number {
  if (retryAfterMs !== null) return Math.min(retryAfterMs, providerExecutionDefaults.maxRetryAfterMs);
  return providerExecutionDefaults.retryDelaysMs[attemptNumber - 1] ?? providerExecutionDefaults.maxRetryAfterMs;
}

function validationFailure(): ProviderExecutionDecision {
  return {
    valid: false,
    requestId: null,
    capability: null,
    providerId: null,
    errorCode: null,
    httpStatus: null,
    attemptNumber: null,
    maxAttempts: null,
    retryable: false,
    attemptsExhausted: false,
    retryScheduled: false,
    nextRetryDelayMs: null,
    fallbackRequired: false,
    fallbackExecutionStarted: false,
    manualReviewRequired: false,
    adminAlertRequired: true,
    terminal: true,
    failClosed: true,
    jobShouldPause: true,
    persistable: false,
    publishable: false,
    executionStarted: false,
    action: "STOP_CONFIGURATION_ERROR",
    reasonCode: "PROVIDER_EXECUTION_REQUEST_VALIDATION_ERROR",
  };
}

function isValidProviderSelectionForExecution(
  selection: unknown,
  capability: ProviderCapability,
  providerId: RegisteredProviderId,
): boolean {
  return validateProviderSelectionForExecution(selection, capability, providerId);
}

function isProviderCapability(value: unknown): value is ProviderCapability {
  return typeof value === "string" && (providerCapabilities as readonly string[]).includes(value);
}

function isProviderFailureErrorCode(value: unknown): value is ProviderFailureErrorCode {
  return typeof value === "string" && (providerFailureErrorCodes as readonly string[]).includes(value);
}

function isSafeRequestId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!value || value.length > 128) return false;
  if (!safeRequestIdPattern.test(value)) return false;
  if (secretLikePattern.test(value)) return false;
  return !value.includes("\n") && !value.includes("\r") && !value.includes("://");
}

function isValidAttemptNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
}

function isValidMaxAttempts(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= maxConfiguredAttempts;
}

function isValidRequestTimeoutMs(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= maxRequestTimeoutMs;
}

function isValidRetryAfterMs(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isSafeInteger(value) && value >= 0);
}

function isValidHttpStatus(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isSafeInteger(value) && value >= 100 && value <= 599);
}
