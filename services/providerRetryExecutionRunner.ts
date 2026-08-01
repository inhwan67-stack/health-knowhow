import {
  createProviderExecutionCancellationSequence,
  prepareProviderExecutionCancellationAttempt,
  readProviderExecutionCancellationBoundary,
  runProviderExecutionAttempt,
  type ProviderExecutionCancellationBoundaryMetadata,
  type ProviderExecutionOrchestrationResult,
  type ValidatedProviderExecutionOrchestrator,
} from "./providerExecutionOrchestrator";
import {
  isRetryableProviderError,
  providerExecutionDefaults,
  type ProviderExecutionAction,
  type ProviderExecutionDecision,
  type ProviderExecutionReasonCode,
} from "./providerExecutionPolicy";
import {
  buildProviderFailureDecision,
  isMedicalSafetyCapability,
  providerCapabilities,
  providerFailureErrorCodes,
  registeredProviderIds,
  type ProviderCapability,
  type ProviderFailureErrorCode,
  type RegisteredProviderId,
} from "./providerResiliencePolicy";

declare const validatedProviderRetryRuntimeBrand: unique symbol;

export type ValidatedProviderRetryRuntime = {
  readonly [validatedProviderRetryRuntimeBrand]: true;
};

export type ProviderRetryRuntimeBuildResult =
  | {
      valid: true;
      runtime: ValidatedProviderRetryRuntime;
      failClosed: false;
      reasonCode: "PROVIDER_RETRY_RUNTIME_VALID";
    }
  | ProviderRetrySequenceFailure;

export type ProviderRetrySequenceInput = {
  requestId: string;
  capability: ProviderCapability;
  payloadFingerprint: string;
  contentId?: string | null;
  revisionId?: string | null;
  sourceIds?: readonly string[] | null;
  maxAttempts?: number | null;
  requestTimeoutMs?: number | null;
};

export type ProviderRetrySequenceResult =
  | ProviderRetrySequenceFailure
  | {
      valid: true;
      requestId: string;
      capability: ProviderCapability;
      selectedProviderId: RegisteredProviderId | null;
      sequenceStarted: true;
      sequenceCompleted: true;
      sequenceSucceeded: boolean;
      attemptsStarted: number;
      attemptsCompleted: number;
      providerCallCount: number;
      providerCallCountKnown: boolean;
      currentAttemptCallStatus: ProviderRetryCurrentAttemptCallStatus;
      retryWaitCount: number;
      retryExecutedCount: number;
      retryExecuted: boolean;
      waitedDelayMs: readonly number[];
      finalAttemptNumber: number;
      finalExecutionDecision: ProviderExecutionDecision | null;
      fallbackExecuted: false;
      databaseWritten: false;
      storageUploaded: false;
      publicationTriggered: false;
      notificationSent: false;
      persistable: false;
      publishable: false;
      medicalVerificationCompleted: false;
      finalApprovalGranted: false;
      failClosed: boolean;
      jobShouldPause: boolean;
      manualReviewRequired: boolean;
      reasonCode:
        | "PROVIDER_RETRY_SEQUENCE_SUCCEEDED_PREVIEW"
        | "PROVIDER_RETRY_SEQUENCE_EXHAUSTED_PREVIEW"
        | "PROVIDER_RETRY_SEQUENCE_STOPPED_PREVIEW";
    };

type ProviderRetrySequenceFailure = {
  valid: false;
  requestId: string | null;
  capability: ProviderCapability | null;
  selectedProviderId: RegisteredProviderId | null;
  sequenceStarted: boolean;
  sequenceCompleted: boolean;
  sequenceSucceeded: false;
  attemptsStarted: number;
  attemptsCompleted: number;
  providerCallCount: number;
  providerCallCountKnown: boolean;
  currentAttemptCallStatus: ProviderRetryCurrentAttemptCallStatus;
  retryWaitCount: number;
  retryExecutedCount: number;
  retryExecuted: boolean;
  waitedDelayMs: readonly number[];
  finalAttemptNumber: number | null;
  finalExecutionDecision: ProviderExecutionDecision | null;
  fallbackExecuted: false;
  databaseWritten: false;
  storageUploaded: false;
  publicationTriggered: false;
  notificationSent: false;
  persistable: false;
  publishable: false;
  medicalVerificationCompleted: false;
  finalApprovalGranted: false;
  failClosed: true;
  jobShouldPause: true;
  manualReviewRequired: boolean;
  reasonCode:
    | "PROVIDER_RETRY_RUNTIME_CONFIGURATION_ERROR"
    | "PROVIDER_RETRY_SEQUENCE_REQUEST_VALIDATION_ERROR"
    | "PROVIDER_RETRY_ATTEMPT_CONTRACT_ERROR"
    | "PROVIDER_RETRY_ATTEMPT_EXECUTION_ERROR"
    | "PROVIDER_RETRY_SLEEP_FAILED";
};

export type ProviderRetryCurrentAttemptCallStatus =
  | "NOT_STARTED"
  | "CONFIRMED_NOT_CALLED"
  | "CONFIRMED_CALLED"
  | "UNKNOWN";

type ProviderRetryRuntimeState = {
  sleep: (delayMs: number) => Promise<void>;
};

type NormalizedProviderRetrySequenceInput = {
  requestId: string;
  capability: ProviderCapability;
  payloadFingerprint: string;
  contentId: string | null;
  revisionId: string | null;
  sourceIds: readonly string[] | null;
  maxAttempts: number;
  requestTimeoutMs: number | null;
};

type SequenceCounters = {
  attemptsStarted: number;
  attemptsCompleted: number;
  providerCallCount: number;
  providerCallCountKnown: boolean;
  currentAttemptCallStatus: ProviderRetryCurrentAttemptCallStatus;
  retryWaitCount: number;
  retryExecutedCount: number;
  waitedDelayMs: number[];
  selectedProviderId: RegisteredProviderId | null;
  sequenceProviderId: RegisteredProviderId | null;
  finalAttemptNumber: number | null;
  finalExecutionDecision: ProviderExecutionDecision | null;
};

type AttemptAudit = {
  providerExecutionAttempted: boolean;
  providerCallCount: 0 | 1;
  selectedProviderId: RegisteredProviderId | null;
  currentAttemptCallStatus: "CONFIRMED_NOT_CALLED" | "CONFIRMED_CALLED";
};

const runtimeState = new WeakMap<ValidatedProviderRetryRuntime, ProviderRetryRuntimeState>();
const safeInternalIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const hex64Pattern = /^[a-f0-9]{64}$/;
const secretLikePattern = /(?:authorization|bearer|token|api[_-]?key|secret|service[_-]?role|sb_secret|sk-[a-z0-9])/i;
const maxSourceIds = 10;
const maxConfiguredAttempts = 10;
const maxRetryDelayMs = 30_000;
const runtimeConfigKeys = ["sleep"] as const;
const forbiddenAttemptResultKeys = new Set(["registry", "selection", "adapter", "execute", "rawResult", "rawProviderResult", "providerResult"]);
const attemptResultKeys = [
  "valid",
  "requestId",
  "capability",
  "selectedProviderId",
  "providerSelected",
  "providerExecutionAttempted",
  "providerExecutionSucceeded",
  "providerCallCount",
  "internalOutputReferenceId",
  "executionDecision",
  "retryExecuted",
  "fallbackExecuted",
  "databaseWritten",
  "storageUploaded",
  "publicationTriggered",
  "notificationSent",
  "persistable",
  "publishable",
  "medicalVerificationCompleted",
  "finalApprovalGranted",
  "failClosed",
  "jobShouldPause",
  "manualReviewRequired",
  "reasonCode",
] as const;
const executionDecisionKeys = [
  "valid",
  "requestId",
  "capability",
  "providerId",
  "errorCode",
  "httpStatus",
  "attemptNumber",
  "maxAttempts",
  "retryable",
  "attemptsExhausted",
  "retryScheduled",
  "nextRetryDelayMs",
  "fallbackRequired",
  "fallbackExecutionStarted",
  "manualReviewRequired",
  "adminAlertRequired",
  "terminal",
  "failClosed",
  "jobShouldPause",
  "persistable",
  "publishable",
  "executionStarted",
  "action",
  "reasonCode",
] as const;
const retrySequenceInputKeys = [
  "requestId",
  "capability",
  "payloadFingerprint",
  "contentId",
  "revisionId",
  "sourceIds",
  "maxAttempts",
  "requestTimeoutMs",
] as const;

export function buildProviderRetryRuntime(config: unknown): ProviderRetryRuntimeBuildResult {
  try {
    if (!isObjectRecord(config)) return retryFailure("PROVIDER_RETRY_RUNTIME_CONFIGURATION_ERROR", null, null);
    if (!hasExactKeys(config, runtimeConfigKeys)) return retryFailure("PROVIDER_RETRY_RUNTIME_CONFIGURATION_ERROR", null, null);
    const sleep = readOwnDataProperty(config, "sleep");
    if (typeof sleep !== "function") return retryFailure("PROVIDER_RETRY_RUNTIME_CONFIGURATION_ERROR", null, null);

    const runtime = Object.freeze({}) as ValidatedProviderRetryRuntime;
    runtimeState.set(runtime, { sleep: sleep as (delayMs: number) => Promise<void> });

    return {
      valid: true,
      runtime,
      failClosed: false,
      reasonCode: "PROVIDER_RETRY_RUNTIME_VALID",
    };
  } catch {
    return retryFailure("PROVIDER_RETRY_RUNTIME_CONFIGURATION_ERROR", null, null);
  }
}

export async function runProviderRetrySequence(
  orchestrator: ValidatedProviderExecutionOrchestrator,
  runtime: ValidatedProviderRetryRuntime,
  input: unknown,
): Promise<ProviderRetrySequenceResult> {
  const state = runtimeState.get(runtime);
  if (!state || !Object.isFrozen(runtime)) {
    return retryFailure("PROVIDER_RETRY_RUNTIME_CONFIGURATION_ERROR", null, null);
  }

  const normalized = validateRetrySequenceInput(input);
  if (!normalized.valid) return normalized.failure;

  const counters: SequenceCounters = {
    attemptsStarted: 0,
    attemptsCompleted: 0,
    providerCallCount: 0,
    providerCallCountKnown: true,
    currentAttemptCallStatus: "NOT_STARTED",
    retryWaitCount: 0,
    retryExecutedCount: 0,
    waitedDelayMs: [],
    selectedProviderId: null,
    sequenceProviderId: null,
    finalAttemptNumber: null,
    finalExecutionDecision: null,
  };
  const cancellationSequenceResult = createProviderExecutionCancellationSequence(orchestrator);
  if (!cancellationSequenceResult.valid) return retryFailure("PROVIDER_RETRY_RUNTIME_CONFIGURATION_ERROR", null, normalized.value.capability);
  const cancellationSequence = cancellationSequenceResult.sequence;

  for (let attemptNumber = 1; attemptNumber <= normalized.value.maxAttempts; attemptNumber += 1) {
    counters.attemptsStarted += 1;
    counters.finalExecutionDecision = null;
    const attemptInput = buildAttemptInput(normalized.value, attemptNumber);
    let attempt: ProviderExecutionOrchestrationResult;
    try {
      if (!prepareProviderExecutionCancellationAttempt(orchestrator, cancellationSequence)) {
        return attemptContractFailure(normalized.value, counters);
      }
      attempt = await runProviderExecutionAttempt(orchestrator, attemptInput);
    } catch {
      return attemptExecutionFailure(normalized.value, counters);
    }
    const attemptSnapshot = snapshotExactOwnDataObject(attempt, attemptResultKeys);
    if (!attemptSnapshot) {
      markCurrentAttemptUnknown(counters);
      return attemptContractFailure(normalized.value, counters);
    }

    const audit = extractAttemptAudit(attemptSnapshot, normalized.value);
    if (!audit) {
      markCurrentAttemptUnknown(counters);
      return attemptContractFailure(normalized.value, counters);
    }
    applyAttemptAudit(counters, audit, attemptNumber);

    const contractError = validateAttemptContract(
      attemptSnapshot,
      normalized.value,
      attemptNumber,
      normalized.value.maxAttempts,
      counters.sequenceProviderId,
      counters,
    );
    if (contractError) return attemptContractFailure(normalized.value, counters);

    const cancellationBoundary = readProviderExecutionCancellationBoundary(attempt);

    if (attemptSnapshot.valid && attemptSnapshot.providerExecutionSucceeded) {
      if (!isCompletedSuccessBoundary(cancellationBoundary)) {
        return sequenceResult(normalized.value, counters, {
          sequenceSucceeded: false,
          failClosed: true,
          jobShouldPause: true,
          manualReviewRequired: attemptSnapshot.manualReviewRequired === true || isMedicalSafetyCapability(normalized.value.capability),
          reasonCode: "PROVIDER_RETRY_SEQUENCE_STOPPED_PREVIEW",
        });
      }
      return sequenceResult(normalized.value, counters, {
        sequenceSucceeded: true,
        failClosed: false,
        jobShouldPause: false,
        manualReviewRequired: false,
        reasonCode: "PROVIDER_RETRY_SEQUENCE_SUCCEEDED_PREVIEW",
      });
    }

    const finalDecision = readFinalExecutionDecision(counters);
    const cancellationRetryAllowed =
      cancellationBoundary?.valid === true &&
      cancellationBoundary.retryMayProceed === true &&
      isFailureRetryBoundaryState(cancellationBoundary.lifecycleState) &&
      cancellationBoundary.jobShouldPause === false &&
      cancellationBoundary.manualReviewRequired === false;
    const boundaryMissingOrInvalid = cancellationBoundary?.valid !== true;

    if (!isRetryWaitAllowed(finalDecision, attemptNumber, normalized.value.maxAttempts) || !cancellationRetryAllowed) {
      const exhausted =
        finalDecision?.retryable === true &&
        finalDecision?.attemptsExhausted === true &&
        attemptNumber >= normalized.value.maxAttempts;
      return sequenceResult(normalized.value, counters, {
        sequenceSucceeded: false,
        failClosed: true,
        jobShouldPause: attemptSnapshot.jobShouldPause === true || cancellationBoundary?.jobShouldPause === true || boundaryMissingOrInvalid,
        manualReviewRequired:
          attemptSnapshot.manualReviewRequired === true ||
          cancellationBoundary?.manualReviewRequired === true ||
          (isMedicalSafetyCapability(normalized.value.capability) && boundaryMissingOrInvalid),
        reasonCode: exhausted ? "PROVIDER_RETRY_SEQUENCE_EXHAUSTED_PREVIEW" : "PROVIDER_RETRY_SEQUENCE_STOPPED_PREVIEW",
      });
    }

    const delayMs = finalDecision?.nextRetryDelayMs;
    if (!isSafeRetryDelayMs(delayMs)) {
      return attemptContractFailure(normalized.value, counters);
    }

    counters.retryWaitCount += 1;
    counters.waitedDelayMs.push(delayMs);
    try {
      await state.sleep(delayMs);
    } catch {
      return sleepFailure(normalized.value, counters);
    }
    counters.retryExecutedCount += 1;
  }

  return sequenceResult(normalized.value, counters, {
    sequenceSucceeded: false,
    failClosed: true,
    jobShouldPause: true,
    manualReviewRequired: isMedicalSafetyCapability(normalized.value.capability),
    reasonCode: "PROVIDER_RETRY_SEQUENCE_EXHAUSTED_PREVIEW",
  });
}

function buildAttemptInput(input: NormalizedProviderRetrySequenceInput, attemptNumber: number): Record<string, unknown> {
  return {
    requestId: input.requestId,
    capability: input.capability,
    payloadFingerprint: input.payloadFingerprint,
    contentId: input.contentId,
    revisionId: input.revisionId,
    sourceIds: input.sourceIds === null ? null : Object.freeze([...input.sourceIds]),
    attemptNumber,
    maxAttempts: input.maxAttempts,
    retryAfterMs: null,
    requestTimeoutMs: input.requestTimeoutMs,
  };
}

function extractAttemptAudit(
  attempt: unknown,
  input: NormalizedProviderRetrySequenceInput,
): AttemptAudit | null {
  try {
    if (!isObjectRecord(attempt)) return null;
    if (!isStrictPlainDataObject(attempt)) return null;
    if (!hasExactKeys(attempt, attemptResultKeys)) return null;
    const providerExecutionAttempted = readOwnDataProperty(attempt, "providerExecutionAttempted");
    const providerCallCount = readOwnDataProperty(attempt, "providerCallCount");
    const selectedProviderId = readOwnDataProperty(attempt, "selectedProviderId");
    const capability = readOwnDataProperty(attempt, "capability");
    const requestId = readOwnDataProperty(attempt, "requestId");
    if (typeof providerExecutionAttempted !== "boolean") return null;
    if (providerCallCount !== 0 && providerCallCount !== 1) return null;
    if (providerExecutionAttempted === true && providerCallCount !== 1) return null;
    if (providerExecutionAttempted === false && providerCallCount !== 0) return null;
    if (capability !== input.capability) return null;
    if (requestId !== null && requestId !== input.requestId) return null;
    if (selectedProviderId !== null && !isRegisteredProviderId(selectedProviderId)) return null;
    return {
      providerExecutionAttempted,
      providerCallCount,
      selectedProviderId,
      currentAttemptCallStatus: providerCallCount === 1 ? "CONFIRMED_CALLED" : "CONFIRMED_NOT_CALLED",
    };
  } catch {
    return null;
  }
}

function applyAttemptAudit(counters: SequenceCounters, audit: AttemptAudit, attemptNumber: number): void {
  counters.attemptsCompleted += 1;
  counters.providerCallCount += audit.providerCallCount;
  counters.providerCallCountKnown = true;
  counters.currentAttemptCallStatus = audit.currentAttemptCallStatus;
  counters.finalAttemptNumber = attemptNumber;
  if (audit.selectedProviderId && counters.sequenceProviderId === null) {
    counters.sequenceProviderId = audit.selectedProviderId;
    counters.selectedProviderId = audit.selectedProviderId;
  }
}

function readFinalExecutionDecision(counters: SequenceCounters): ProviderExecutionDecision | null {
  return counters.finalExecutionDecision;
}

function isCompletedSuccessBoundary(
  boundary: ProviderExecutionCancellationBoundaryMetadata | null,
): boolean {
  return (
    boundary?.valid === true &&
    boundary.lifecycleState === "COMPLETED_SUCCESS" &&
    boundary.retryMayProceed === false &&
    boundary.jobShouldPause === false &&
    boundary.manualReviewRequired === false
  );
}

function isFailureRetryBoundaryState(
  state: ProviderExecutionCancellationBoundaryMetadata["lifecycleState"],
): boolean {
  return state === "FAILED_BEFORE_CALL" || state === "COMPLETED_FAILURE";
}

function markCurrentAttemptUnknown(counters: SequenceCounters): void {
  counters.providerCallCountKnown = false;
  counters.currentAttemptCallStatus = "UNKNOWN";
}

function validateAttemptContract(
  attempt: unknown,
  input: NormalizedProviderRetrySequenceInput,
  attemptNumber: number,
  maxAttempts: number,
  sequenceProviderId: RegisteredProviderId | null,
  counters: SequenceCounters,
): string | null {
  try {
    if (!isObjectRecord(attempt)) return "attempt result is not an object";
    if (!isStrictPlainDataObject(attempt)) return "attempt result has unsafe object shape";
    if (!hasExactKeys(attempt, attemptResultKeys)) return "attempt result has unexpected keys";
    if (!areAttemptBooleansStrict(attempt)) return "attempt boolean contract mismatch";
    if (Reflect.ownKeys(attempt).some((key) => typeof key === "string" && forbiddenAttemptResultKeys.has(key))) {
      return "attempt result exposes forbidden fields";
    }
    if (attempt.requestId !== null && attempt.requestId !== input.requestId) return "request id mismatch";
    if (attempt.capability !== input.capability) return "capability mismatch";
    if (attempt.selectedProviderId !== null && !isRegisteredProviderId(attempt.selectedProviderId)) return "unsafe selected provider";
    if (sequenceProviderId !== null && attempt.selectedProviderId !== null && attempt.selectedProviderId !== sequenceProviderId) {
      return "provider changed during retry sequence";
    }
    if (attempt.retryExecuted !== false || attempt.fallbackExecuted !== false) return "attempt executed retry or fallback";
    if (
      attempt.databaseWritten !== false ||
      attempt.storageUploaded !== false ||
      attempt.publicationTriggered !== false ||
      attempt.notificationSent !== false ||
      attempt.persistable !== false ||
      attempt.publishable !== false ||
      attempt.medicalVerificationCompleted !== false ||
      attempt.finalApprovalGranted !== false
    ) {
      return "attempt exposed side effects";
    }
    if (attempt.providerCallCount !== 0 && attempt.providerCallCount !== 1) return "invalid provider call count";
    if (attempt.providerExecutionAttempted === true && attempt.providerCallCount !== 1) return "attempted call count mismatch";
    if (attempt.providerExecutionAttempted === false && attempt.providerCallCount !== 0) return "blocked call count mismatch";

    if (attempt.valid && attempt.providerExecutionSucceeded) {
      if (attempt.requestId !== input.requestId) return "success request id mismatch";
      if (attempt.reasonCode !== "PROVIDER_EXECUTION_SUCCEEDED_PREVIEW") return "success reason mismatch";
      if (attempt.providerSelected !== true) return "success selected mismatch";
      if (attempt.providerExecutionAttempted !== true) return "success without attempt";
      if (attempt.providerCallCount !== 1) return "success call count mismatch";
      if (!isRegisteredProviderId(attempt.selectedProviderId)) return "success provider mismatch";
      if (attempt.executionDecision !== null) return "success with execution decision";
      if (!isSafeInternalId(attempt.internalOutputReferenceId)) return "success without safe output reference";
      if (attempt.failClosed !== false || attempt.jobShouldPause !== false || attempt.manualReviewRequired !== false) return "success safety flags mismatch";
      if (attempt.medicalVerificationCompleted !== false || attempt.finalApprovalGranted !== false) return "success approval flags mismatch";
      counters.finalExecutionDecision = null;
      return null;
    }

    if (attempt.providerExecutionSucceeded === false && attempt.internalOutputReferenceId !== null) {
      return "failure with output reference";
    }

    if (attempt.valid === false) return "invalid attempt result";

    if (attempt.providerExecutionAttempted) {
      if (attempt.requestId !== input.requestId) return "failure request id mismatch";
      if (attempt.reasonCode !== "PROVIDER_EXECUTION_FAILED_PREVIEW") return "failure reason mismatch";
      if (attempt.providerSelected !== true || attempt.providerExecutionSucceeded !== false || attempt.providerCallCount !== 1) {
        return "failure execution flags mismatch";
      }
      if (!isRegisteredProviderId(attempt.selectedProviderId)) return "failure provider mismatch";
      const decision = sanitizeExecutionDecision(
        attempt.executionDecision,
        input,
        attempt.selectedProviderId,
        attemptNumber,
        maxAttempts,
        sequenceProviderId,
      );
      if (!decision) return "failed execution without valid decision";
      if (attempt.failClosed !== true || attempt.jobShouldPause !== decision.jobShouldPause || attempt.manualReviewRequired !== decision.manualReviewRequired) {
        return "failure safety flags mismatch";
      }
      counters.finalExecutionDecision = decision;
    } else {
      if (attempt.reasonCode !== "PROVIDER_ROUTER_SELECTION_FAILED_PREVIEW") return "router reason mismatch";
      if (attempt.providerSelected !== false || attempt.providerExecutionSucceeded !== false || attempt.providerCallCount !== 0) {
        return "router flags mismatch";
      }
      if (attempt.selectedProviderId !== null || attempt.internalOutputReferenceId !== null || attempt.executionDecision !== null) {
        return "router fields mismatch";
      }
      if (attempt.failClosed !== true) return "router fail closed mismatch";
      if (attempt.jobShouldPause !== true) return "router pause mismatch";
      if (attempt.manualReviewRequired !== isMedicalSafetyCapability(input.capability)) return "router manual review mismatch";
    }

    return null;
  } catch {
    return "attempt contract validation threw";
  }
}

function sanitizeExecutionDecision(
  value: unknown,
  input: NormalizedProviderRetrySequenceInput,
  selectedProviderId: RegisteredProviderId | null,
  attemptNumber: number,
  maxAttempts: number,
  sequenceProviderId: RegisteredProviderId | null,
): ProviderExecutionDecision | null {
  try {
    const snapshot = snapshotExactOwnDataObject(value, executionDecisionKeys);
    if (!snapshot) return null;
    if (snapshot.valid !== true) return null;
    if (snapshot.requestId !== input.requestId) return null;
    if (snapshot.capability !== input.capability || !isProviderCapability(snapshot.capability)) return null;
    if (snapshot.providerId !== selectedProviderId) return null;
    if (sequenceProviderId !== null && snapshot.providerId !== sequenceProviderId) return null;
    if (!isRegisteredProviderId(snapshot.providerId)) return null;
    if (!isProviderFailureErrorCode(snapshot.errorCode)) return null;
    if (!isValidHttpStatus(snapshot.httpStatus)) return null;
    if (snapshot.attemptNumber !== attemptNumber) return null;
    if (snapshot.maxAttempts !== maxAttempts) return null;
    if (!isBoolean(snapshot.retryable)) return null;
    if (!isBoolean(snapshot.attemptsExhausted)) return null;
    if (!isBoolean(snapshot.retryScheduled)) return null;
    if (snapshot.nextRetryDelayMs !== null && !isSafeRetryDelayMs(snapshot.nextRetryDelayMs)) return null;
    if (!isBoolean(snapshot.fallbackRequired)) return null;
    if (snapshot.fallbackExecutionStarted !== false) return null;
    if (!isBoolean(snapshot.manualReviewRequired)) return null;
    if (!isBoolean(snapshot.adminAlertRequired)) return null;
    if (!isBoolean(snapshot.terminal)) return null;
    if (snapshot.failClosed !== true) return null;
    if (!isBoolean(snapshot.jobShouldPause)) return null;
    if (snapshot.persistable !== false || snapshot.publishable !== false || snapshot.executionStarted !== false) return null;
    if (!isProviderExecutionAction(snapshot.action) || !isProviderExecutionReasonCode(snapshot.reasonCode)) return null;
    if (snapshot.reasonCode !== reasonCodeForAction(snapshot.action)) return null;
    if (snapshot.reasonCode === "PROVIDER_EXECUTION_REQUEST_VALIDATION_ERROR") return null;
    if (!matchesExpectedProviderExecutionDecision(snapshot, input, attemptNumber, maxAttempts)) return null;
    const safeDecision: ProviderExecutionDecision = Object.freeze({
      valid: true,
      requestId: snapshot.requestId,
      capability: snapshot.capability,
      providerId: snapshot.providerId,
      errorCode: snapshot.errorCode,
      httpStatus: snapshot.httpStatus,
      attemptNumber: snapshot.attemptNumber,
      maxAttempts: snapshot.maxAttempts,
      retryable: snapshot.retryable,
      attemptsExhausted: snapshot.attemptsExhausted,
      retryScheduled: snapshot.retryScheduled,
      nextRetryDelayMs: snapshot.nextRetryDelayMs,
      fallbackRequired: snapshot.fallbackRequired,
      fallbackExecutionStarted: false,
      manualReviewRequired: snapshot.manualReviewRequired,
      adminAlertRequired: snapshot.adminAlertRequired,
      terminal: snapshot.terminal,
      failClosed: true,
      jobShouldPause: snapshot.jobShouldPause,
      persistable: false,
      publishable: false,
      executionStarted: false,
      action: snapshot.action,
      reasonCode: snapshot.reasonCode,
    });
    return safeDecision;
  } catch {
    return null;
  }
}

function matchesExpectedProviderExecutionDecision(
  value: Record<string, unknown>,
  input: NormalizedProviderRetrySequenceInput,
  attemptNumber: number,
  maxAttempts: number,
): boolean {
  if (!isProviderFailureErrorCode(value.errorCode)) return false;
  if (!isRegisteredProviderId(value.providerId)) return false;
  if (!isValidHttpStatus(value.httpStatus)) return false;
  const failureDecision = buildProviderFailureDecision({
    capability: input.capability,
    providerId: value.providerId,
    errorCode: value.errorCode,
    httpStatus: value.httpStatus,
    attemptNumber,
  });
  const attemptsExhausted = attemptNumber >= maxAttempts;
  const retryable = failureDecision.retryable && isRetryableProviderError(value.errorCode);
  const retryScheduled = retryable && !attemptsExhausted;
  const nextRetryDelayMs = retryScheduled
    ? providerExecutionDefaults.retryDelaysMs[attemptNumber - 1] ?? providerExecutionDefaults.maxRetryAfterMs
    : null;
  const fallbackRequired = !retryScheduled && failureDecision.fallbackAllowed;
  const action = expectedActionForProviderExecutionDecision({
    errorCode: failureDecision.errorCode,
    terminal: failureDecision.terminal,
    manualReviewRequired: failureDecision.manualReviewRequired,
    fallbackRequired,
    retryScheduled,
  });
  const reasonCode = reasonCodeForAction(action);
  const jobShouldPause = failureDecision.jobShouldPause || retryScheduled || fallbackRequired;

  return (
    value.errorCode === failureDecision.errorCode &&
    value.retryable === retryable &&
    value.attemptsExhausted === attemptsExhausted &&
    value.retryScheduled === retryScheduled &&
    value.nextRetryDelayMs === nextRetryDelayMs &&
    value.fallbackRequired === fallbackRequired &&
    value.manualReviewRequired === failureDecision.manualReviewRequired &&
    value.adminAlertRequired === failureDecision.adminAlertRequired &&
    value.terminal === failureDecision.terminal &&
    value.jobShouldPause === jobShouldPause &&
    value.action === action &&
    value.reasonCode === reasonCode
  );
}

function expectedActionForProviderExecutionDecision(input: {
  errorCode: ProviderFailureErrorCode;
  terminal: boolean;
  manualReviewRequired: boolean;
  fallbackRequired: boolean;
  retryScheduled: boolean;
}): ProviderExecutionAction {
  if (input.retryScheduled) return "RETRY_WAIT";
  if (input.errorCode === "CONFIGURATION_ERROR") return "STOP_CONFIGURATION_ERROR";
  if (input.terminal) return "FAILED_FINAL";
  if (input.manualReviewRequired) return "MANUAL_REVIEW_REQUIRED";
  if (input.fallbackRequired) return "FALLBACK_REVIEW_REQUIRED";
  return "FAILED_FINAL";
}

function isRetryWaitAllowed(
  decision: ProviderExecutionDecision | null,
  attemptNumber: number,
  maxAttempts: number,
): boolean {
  return (
    decision !== null &&
    decision.valid === true &&
    decision.action === "RETRY_WAIT" &&
    decision.retryScheduled === true &&
    isSafeRetryDelayMs(decision.nextRetryDelayMs) &&
    decision.attemptNumber === attemptNumber &&
    decision.maxAttempts === maxAttempts &&
    attemptNumber < maxAttempts
  );
}

function sequenceResult(
  input: NormalizedProviderRetrySequenceInput,
  counters: SequenceCounters,
  outcome: {
    sequenceSucceeded: boolean;
    failClosed: boolean;
    jobShouldPause: boolean;
    manualReviewRequired: boolean;
    reasonCode:
      | "PROVIDER_RETRY_SEQUENCE_SUCCEEDED_PREVIEW"
      | "PROVIDER_RETRY_SEQUENCE_EXHAUSTED_PREVIEW"
      | "PROVIDER_RETRY_SEQUENCE_STOPPED_PREVIEW";
  },
): ProviderRetrySequenceResult {
  return Object.freeze({
    valid: true,
    requestId: input.requestId,
    capability: input.capability,
    selectedProviderId: counters.selectedProviderId,
    sequenceStarted: true,
    sequenceCompleted: true,
    sequenceSucceeded: outcome.sequenceSucceeded,
    attemptsStarted: counters.attemptsStarted,
    attemptsCompleted: counters.attemptsCompleted,
    providerCallCount: counters.providerCallCount,
    providerCallCountKnown: counters.providerCallCountKnown,
    currentAttemptCallStatus: counters.currentAttemptCallStatus,
    retryWaitCount: counters.retryWaitCount,
    retryExecutedCount: counters.retryExecutedCount,
    retryExecuted: counters.retryExecutedCount > 0,
    waitedDelayMs: Object.freeze([...counters.waitedDelayMs]),
    finalAttemptNumber: counters.finalAttemptNumber ?? 0,
    finalExecutionDecision: counters.finalExecutionDecision,
    fallbackExecuted: false,
    databaseWritten: false,
    storageUploaded: false,
    publicationTriggered: false,
    notificationSent: false,
    persistable: false,
    publishable: false,
    medicalVerificationCompleted: false,
    finalApprovalGranted: false,
    failClosed: outcome.failClosed,
    jobShouldPause: outcome.jobShouldPause,
    manualReviewRequired: outcome.manualReviewRequired,
    reasonCode: outcome.reasonCode,
  });
}

function attemptContractFailure(
  input: NormalizedProviderRetrySequenceInput,
  counters: SequenceCounters,
): ProviderRetrySequenceFailure {
  return freezeFailure({
    reasonCode: "PROVIDER_RETRY_ATTEMPT_CONTRACT_ERROR",
    requestId: input.requestId,
    capability: input.capability,
    selectedProviderId: counters.selectedProviderId,
    sequenceStarted: counters.attemptsStarted > 0,
    sequenceCompleted: true,
    attemptsStarted: counters.attemptsStarted,
    attemptsCompleted: counters.attemptsCompleted,
    providerCallCount: counters.providerCallCount,
    providerCallCountKnown: counters.providerCallCountKnown,
    currentAttemptCallStatus: counters.currentAttemptCallStatus,
    retryWaitCount: counters.retryWaitCount,
    retryExecutedCount: counters.retryExecutedCount,
    waitedDelayMs: counters.waitedDelayMs,
    finalAttemptNumber: counters.finalAttemptNumber,
    finalExecutionDecision: counters.finalExecutionDecision,
    manualReviewRequired: isMedicalSafetyCapability(input.capability),
  });
}

function sleepFailure(
  input: NormalizedProviderRetrySequenceInput,
  counters: SequenceCounters,
): ProviderRetrySequenceFailure {
  return freezeFailure({
    reasonCode: "PROVIDER_RETRY_SLEEP_FAILED",
    requestId: input.requestId,
    capability: input.capability,
    selectedProviderId: counters.selectedProviderId,
    sequenceStarted: true,
    sequenceCompleted: true,
    attemptsStarted: counters.attemptsStarted,
    attemptsCompleted: counters.attemptsCompleted,
    providerCallCount: counters.providerCallCount,
    providerCallCountKnown: counters.providerCallCountKnown,
    currentAttemptCallStatus: counters.currentAttemptCallStatus,
    retryWaitCount: counters.retryWaitCount,
    retryExecutedCount: counters.retryExecutedCount,
    waitedDelayMs: counters.waitedDelayMs,
    finalAttemptNumber: counters.finalAttemptNumber,
    finalExecutionDecision: counters.finalExecutionDecision,
    manualReviewRequired: isMedicalSafetyCapability(input.capability),
  });
}

function attemptExecutionFailure(
  input: NormalizedProviderRetrySequenceInput,
  counters: SequenceCounters,
): ProviderRetrySequenceFailure {
  return freezeFailure({
    reasonCode: "PROVIDER_RETRY_ATTEMPT_EXECUTION_ERROR",
    requestId: input.requestId,
    capability: input.capability,
    selectedProviderId: counters.selectedProviderId,
    sequenceStarted: true,
    sequenceCompleted: true,
    attemptsStarted: counters.attemptsStarted,
    attemptsCompleted: counters.attemptsCompleted,
    providerCallCount: counters.providerCallCount,
    providerCallCountKnown: false,
    currentAttemptCallStatus: "UNKNOWN",
    retryWaitCount: counters.retryWaitCount,
    retryExecutedCount: counters.retryExecutedCount,
    waitedDelayMs: counters.waitedDelayMs,
    finalAttemptNumber: counters.finalAttemptNumber,
    finalExecutionDecision: counters.finalExecutionDecision,
    manualReviewRequired: isMedicalSafetyCapability(input.capability),
  });
}

function retryFailure(
  reasonCode: ProviderRetrySequenceFailure["reasonCode"],
  requestId: string | null,
  capability: ProviderCapability | null,
): ProviderRetrySequenceFailure {
  return freezeFailure({
    reasonCode,
    requestId,
    capability,
    selectedProviderId: null,
    sequenceStarted: false,
    sequenceCompleted: false,
    attemptsStarted: 0,
    attemptsCompleted: 0,
    providerCallCount: 0,
    providerCallCountKnown: true,
    currentAttemptCallStatus: "NOT_STARTED",
    retryWaitCount: 0,
    retryExecutedCount: 0,
    waitedDelayMs: [],
    finalAttemptNumber: null,
    finalExecutionDecision: null,
    manualReviewRequired: capability ? isMedicalSafetyCapability(capability) : false,
  });
}

function freezeFailure(input: {
  reasonCode: ProviderRetrySequenceFailure["reasonCode"];
  requestId: string | null;
  capability: ProviderCapability | null;
  selectedProviderId: RegisteredProviderId | null;
  sequenceStarted: boolean;
  sequenceCompleted: boolean;
  attemptsStarted: number;
  attemptsCompleted: number;
  providerCallCount: number;
  providerCallCountKnown: boolean;
  currentAttemptCallStatus: ProviderRetryCurrentAttemptCallStatus;
  retryWaitCount: number;
  retryExecutedCount: number;
  waitedDelayMs: readonly number[];
  finalAttemptNumber: number | null;
  finalExecutionDecision: ProviderExecutionDecision | null;
  manualReviewRequired: boolean;
}): ProviderRetrySequenceFailure {
  return Object.freeze({
    valid: false,
    requestId: input.requestId,
    capability: input.capability,
    selectedProviderId: input.selectedProviderId,
    sequenceStarted: input.sequenceStarted,
    sequenceCompleted: input.sequenceCompleted,
    sequenceSucceeded: false,
    attemptsStarted: input.attemptsStarted,
    attemptsCompleted: input.attemptsCompleted,
    providerCallCount: input.providerCallCount,
    providerCallCountKnown: input.providerCallCountKnown,
    currentAttemptCallStatus: input.currentAttemptCallStatus,
    retryWaitCount: input.retryWaitCount,
    retryExecutedCount: input.retryExecutedCount,
    retryExecuted: input.retryExecutedCount > 0,
    waitedDelayMs: Object.freeze([...input.waitedDelayMs]),
    finalAttemptNumber: input.finalAttemptNumber,
    finalExecutionDecision: input.finalExecutionDecision,
    fallbackExecuted: false,
    databaseWritten: false,
    storageUploaded: false,
    publicationTriggered: false,
    notificationSent: false,
    persistable: false,
    publishable: false,
    medicalVerificationCompleted: false,
    finalApprovalGranted: false,
    failClosed: true,
    jobShouldPause: true,
    manualReviewRequired: input.manualReviewRequired,
    reasonCode: input.reasonCode,
  });
}

type RetryInputValidationResult =
  | { valid: true; value: NormalizedProviderRetrySequenceInput }
  | { valid: false; failure: ProviderRetrySequenceFailure };

function validateRetrySequenceInput(input: unknown): RetryInputValidationResult {
  try {
    if (!isObjectRecord(input)) return retryInputFailure(null, null);
    if (!hasOnlyAllowedKeys(input, retrySequenceInputKeys)) return retryInputFailure(null, null);
    if (!hasRequiredOwnDataProperties(input, ["requestId", "capability", "payloadFingerprint"])) return retryInputFailure(null, null);
    const requestId = readRequiredOwnDataProperty(input, "requestId");
    const capability = readRequiredOwnDataProperty(input, "capability");
    const payloadFingerprint = readRequiredOwnDataProperty(input, "payloadFingerprint");
    const contentId = readOptionalOwnDataProperty(input, "contentId") ?? null;
    const revisionId = readOptionalOwnDataProperty(input, "revisionId") ?? null;
    const sourceIdsResult = snapshotSourceIds(readOptionalOwnDataProperty(input, "sourceIds") ?? null);
    const maxAttempts = readOptionalOwnDataProperty(input, "maxAttempts") ?? providerExecutionDefaults.maxAttempts;
    const requestTimeoutMs = readOptionalOwnDataProperty(input, "requestTimeoutMs") ?? null;
    if (!isSafeInternalId(requestId)) return retryInputFailure(null, null);
    if (!isProviderCapability(capability)) return retryInputFailure(null, null);
    if (typeof payloadFingerprint !== "string" || !hex64Pattern.test(payloadFingerprint)) return retryInputFailure(null, null);
    if (!isOptionalSafeId(contentId)) return retryInputFailure(requestId, capability);
    if (!isOptionalSafeId(revisionId)) return retryInputFailure(requestId, capability);
    if (!sourceIdsResult.valid) return retryInputFailure(requestId, capability);
    if (!isValidMaxAttempts(maxAttempts)) return retryInputFailure(requestId, capability);
    if (!isValidOptionalRequestTimeoutMs(requestTimeoutMs)) return retryInputFailure(requestId, capability);
    return {
      valid: true,
      value: {
        requestId,
        capability,
        payloadFingerprint,
        contentId,
        revisionId,
        sourceIds: sourceIdsResult.value,
        maxAttempts,
        requestTimeoutMs,
      },
    };
  } catch {
    return retryInputFailure(null, null);
  }
}

function retryInputFailure(
  requestId: string | null,
  capability: ProviderCapability | null,
): RetryInputValidationResult {
  return {
    valid: false,
    failure: retryFailure("PROVIDER_RETRY_SEQUENCE_REQUEST_VALIDATION_ERROR", requestId, capability),
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProviderCapability(value: unknown): value is ProviderCapability {
  return typeof value === "string" && (providerCapabilities as readonly string[]).includes(value);
}

function isProviderFailureErrorCode(value: unknown): value is ProviderFailureErrorCode {
  return typeof value === "string" && (providerFailureErrorCodes as readonly string[]).includes(value);
}

function isSafeInternalId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!value || value.length > 128) return false;
  if (!safeInternalIdPattern.test(value)) return false;
  if (secretLikePattern.test(value)) return false;
  return !value.includes("\n") && !value.includes("\r") && !value.includes("://");
}

function isOptionalSafeId(value: unknown): value is string | null {
  return value === null || isSafeInternalId(value);
}

function isValidMaxAttempts(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= maxConfiguredAttempts;
}

function isValidOptionalRequestTimeoutMs(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= 120_000);
}

function isValidHttpStatus(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isSafeInteger(value) && value >= 100 && value <= 599);
}

type SourceIdsSnapshotResult = { valid: true; value: readonly string[] | null } | { valid: false };

function snapshotSourceIds(value: unknown): SourceIdsSnapshotResult {
  try {
    if (value === null) return { valid: true, value: null };
    if (!Array.isArray(value)) return { valid: false };
    const length = readArrayLengthDataDescriptor(value);
    if (length === null || length > maxSourceIds) return { valid: false };
    if (!hasOnlyDenseArrayIndexDataProperties(value, length)) return { valid: false };
    const seen = new Set<string>();
    const snapshot: string[] = [];
    for (let index = 0; index < length; index += 1) {
      const sourceId = readOwnDataProperty(value as unknown as Record<string, unknown>, String(index));
      if (!isSafeInternalId(sourceId)) return { valid: false };
      if (seen.has(sourceId)) return { valid: false };
      seen.add(sourceId);
      snapshot.push(sourceId);
    }
    return { valid: true, value: Object.freeze(snapshot) };
  } catch {
    return { valid: false };
  }
}

function readArrayLengthDataDescriptor(value: readonly unknown[]): number | null {
  const descriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (!descriptor || !("value" in descriptor)) return null;
  const length = descriptor.value;
  if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0) return null;
  return length;
}

function hasOnlyDenseArrayIndexDataProperties(value: readonly unknown[], length: number): boolean {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol") return false;
    if (key === "length") continue;
    if (!isArrayIndexKey(key)) return false;
    if (Number(key) >= length) return false;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) return false;
  }
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !("value" in descriptor)) return false;
  }
  return true;
}

function isArrayIndexKey(value: string): boolean {
  if (!/^(0|[1-9]\d*)$/.test(value)) return false;
  const index = Number(value);
  return Number.isSafeInteger(index) && index >= 0 && index < 2 ** 32 - 1 && String(index) === value;
}

function isSafeRetryDelayMs(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= maxRetryDelayMs;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function areAttemptBooleansStrict(value: Record<string, unknown>): boolean {
  return [
    "valid",
    "providerSelected",
    "providerExecutionAttempted",
    "providerExecutionSucceeded",
    "retryExecuted",
    "fallbackExecuted",
    "databaseWritten",
    "storageUploaded",
    "publicationTriggered",
    "notificationSent",
    "persistable",
    "publishable",
    "medicalVerificationCompleted",
    "finalApprovalGranted",
    "failClosed",
    "jobShouldPause",
    "manualReviewRequired",
  ].every((key) => typeof value[key] === "boolean");
}

function isRegisteredProviderId(value: unknown): value is RegisteredProviderId {
  return typeof value === "string" && (registeredProviderIds as readonly string[]).includes(value);
}

function isProviderExecutionAction(value: unknown): value is ProviderExecutionAction {
  return (
    value === "RETRY_WAIT" ||
    value === "FALLBACK_REVIEW_REQUIRED" ||
    value === "MANUAL_REVIEW_REQUIRED" ||
    value === "FAILED_FINAL" ||
    value === "STOP_CONFIGURATION_ERROR"
  );
}

function isProviderExecutionReasonCode(value: unknown): value is ProviderExecutionReasonCode {
  return (
    value === "PROVIDER_EXECUTION_RETRY_WAIT" ||
    value === "PROVIDER_EXECUTION_FALLBACK_REVIEW_REQUIRED" ||
    value === "PROVIDER_EXECUTION_MANUAL_REVIEW_REQUIRED" ||
    value === "PROVIDER_EXECUTION_FAILED_FINAL" ||
    value === "PROVIDER_EXECUTION_CONFIGURATION_ERROR" ||
    value === "PROVIDER_EXECUTION_REQUEST_VALIDATION_ERROR"
  );
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

function readOwnDataProperty(value: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !("value" in descriptor)) throw new Error("Invalid property");
  return descriptor.value;
}

function snapshotExactOwnDataObject(value: unknown, allowedKeys: readonly string[]): Readonly<Record<string, unknown>> | null {
  try {
    if (!isObjectRecord(value)) return null;
    if (!isStrictPlainDataObject(value)) return null;
    if (!hasExactKeys(value, allowedKeys)) return null;
    const snapshot: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      snapshot[key] = readOwnDataProperty(value, key);
    }
    return Object.freeze(snapshot);
  } catch {
    return null;
  }
}

function readRequiredOwnDataProperty(value: Record<string, unknown>, key: string): unknown {
  return readOwnDataProperty(value, key);
}

function readOptionalOwnDataProperty(value: Record<string, unknown>, key: string): unknown {
  if (!Object.prototype.hasOwnProperty.call(value, key)) return undefined;
  return readOwnDataProperty(value, key);
}

function hasRequiredOwnDataProperties(value: Record<string, unknown>, requiredKeys: readonly string[]): boolean {
  return requiredKeys.every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return Boolean(descriptor && "value" in descriptor);
  });
}

function hasOnlyDataProperties(value: Record<string, unknown>): boolean {
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) return false;
  }
  return true;
}

function isStrictPlainDataObject(value: Record<string, unknown>): boolean {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  if (Reflect.ownKeys(value).some((key) => typeof key === "symbol")) return false;
  return hasOnlyDataProperties(value);
}

function hasExactKeys(value: Record<string, unknown>, allowedKeys: readonly string[]): boolean {
  if (!hasOnlyAllowedKeys(value, allowedKeys)) return false;
  return allowedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function hasOnlyAllowedKeys(value: Record<string, unknown>, allowedKeys: readonly string[]): boolean {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key === "symbol")) return false;
  for (const key of keys) {
    if (typeof key !== "string" || !allowedKeys.includes(key)) return false;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) return false;
  }
  return true;
}
