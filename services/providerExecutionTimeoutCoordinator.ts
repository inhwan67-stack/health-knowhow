import {
  isMedicalSafetyCapability,
  providerCapabilities,
  registeredProviderIds,
  type ProviderCapability,
  type RegisteredProviderId,
} from "./providerResiliencePolicy";

declare const validatedProviderTimeoutSchedulerRuntimeBrand: unique symbol;
declare const validatedProviderExecutionTimeoutCoordinatorBrand: unique symbol;
declare const validatedProviderExecutionTimeoutAttemptBrand: unique symbol;
declare const validatedProviderExecutionTimeoutContextBrand: unique symbol;

export type ValidatedProviderTimeoutSchedulerRuntime = {
  readonly [validatedProviderTimeoutSchedulerRuntimeBrand]: true;
};

export type ValidatedProviderExecutionTimeoutCoordinator = {
  readonly [validatedProviderExecutionTimeoutCoordinatorBrand]: true;
};

export type ValidatedProviderExecutionTimeoutAttempt = {
  readonly [validatedProviderExecutionTimeoutAttemptBrand]: true;
};

export type ValidatedProviderExecutionTimeoutContext = Readonly<{
  readonly [validatedProviderExecutionTimeoutContextBrand]: true;
  signal: AbortSignal;
  attempt: ValidatedProviderExecutionTimeoutAttempt;
  timeout: Readonly<{
    enabled: boolean;
    requestTimeoutMs: number | null;
  }>;
  cancellation: Readonly<{
    supportsAbortSignal: true;
    supportsExplicitCancel: false;
    acknowledgmentRequiredForRetry: true;
  }>;
}>;

export type ProviderTimeoutSchedulerConfig = {
  schedule: (delayMs: number, callback: () => void) => unknown;
  cleanup: (handle: unknown) => void;
};

export type ProviderTimeoutSchedulerRuntimeBuildResult =
  | {
      valid: true;
      runtime: ValidatedProviderTimeoutSchedulerRuntime;
      failClosed: false;
      reasonCode: "PROVIDER_TIMEOUT_SCHEDULER_RUNTIME_VALID";
    }
  | ProviderExecutionTimeoutFailure;

export type ProviderExecutionTimeoutCoordinatorBuildResult =
  | {
      valid: true;
      coordinator: ValidatedProviderExecutionTimeoutCoordinator;
      failClosed: false;
      reasonCode: "PROVIDER_TIMEOUT_COORDINATOR_VALID";
    }
  | ProviderExecutionTimeoutFailure;

export type ProviderExecutionTimeoutAttemptInput = {
  requestId: string;
  capability: ProviderCapability;
  providerId: RegisteredProviderId;
  requestTimeoutMs: number | null;
};

export type ProviderExecutionTimeoutSettlementKind = "SUCCESS" | "FAILURE";

export type ProviderExecutionTimeoutSettlementSlotState =
  | "OPEN"
  | "PROVIDER_SETTLED_FIRST"
  | "TIMEOUT_WON"
  | "LATE_PROVIDER_SETTLEMENT"
  | "CONTRACT_ERROR";

export type ProviderExecutionTimeoutOutcomeKind =
  | "NONE"
  | "PROVIDER_COMPLETED_BEFORE_TIMEOUT"
  | "PROVIDER_FAILED_BEFORE_TIMEOUT"
  | "CANCELLATION_REQUESTED"
  | "PROVIDER_SETTLED_AFTER_CANCELLATION_REQUEST"
  | "COORDINATOR_CONTRACT_ERROR";

export type ProviderExecutionTimeoutReasonCode =
  | "PROVIDER_TIMEOUT_SCHEDULER_RUNTIME_VALID"
  | "PROVIDER_TIMEOUT_COORDINATOR_VALID"
  | "PROVIDER_TIMEOUT_ATTEMPT_STARTED"
  | "PROVIDER_TIMEOUT_WON_DURING_REGISTRATION"
  | "PROVIDER_TIMEOUT_PROVIDER_COMPLETED_BEFORE_TIMEOUT"
  | "PROVIDER_TIMEOUT_PROVIDER_FAILED_BEFORE_TIMEOUT"
  | "PROVIDER_TIMEOUT_CANCELLATION_REQUESTED"
  | "PROVIDER_TIMEOUT_LATE_PROVIDER_SETTLEMENT"
  | "PROVIDER_TIMEOUT_CLEANUP_COMPLETED"
  | "PROVIDER_TIMEOUT_CONTRACT_ERROR";

export type ProviderExecutionTimeoutAttemptStartResult =
  | {
      valid: true;
      providerMayStart: true;
      attempt: ValidatedProviderExecutionTimeoutAttempt;
      executionContext: ValidatedProviderExecutionTimeoutContext;
      snapshot: ProviderExecutionTimeoutSnapshot;
      failClosed: false;
      reasonCode: "PROVIDER_TIMEOUT_ATTEMPT_STARTED";
    }
  | {
      valid: true;
      providerMayStart: false;
      attempt: null;
      executionContext: null;
      snapshot: ProviderExecutionTimeoutSnapshot;
      failClosed: true;
      reasonCode: "PROVIDER_TIMEOUT_WON_DURING_REGISTRATION";
    }
  | ProviderExecutionTimeoutFailure;

export type ProviderExecutionTimeoutSnapshot = Readonly<{
  valid: boolean;
  requestId: string | null;
  capability: ProviderCapability | null;
  providerId: RegisteredProviderId | null;
  settlementSlotState: ProviderExecutionTimeoutSettlementSlotState | null;
  authoritativeOutcomeKind: ProviderExecutionTimeoutOutcomeKind;
  timeoutEnabled: boolean;
  requestTimeoutMs: number | null;
  timeoutFired: boolean;
  abortRequested: boolean;
  abortCallCount: 0 | 1;
  signalAborted: boolean;
  cleanupPerformed: boolean;
  cleanupCallCount: 0 | 1;
  lateSettlementObserved: boolean;
  lateSettlementKind: ProviderExecutionTimeoutSettlementKind | null;
  retryMayProceed: false;
  jobShouldPause: boolean;
  manualReviewRequired: boolean;
  databaseWritten: false;
  storageUploaded: false;
  publicationTriggered: false;
  notificationSent: false;
  persistable: false;
  publishable: false;
  fallbackExecuted: false;
  reasonCode: ProviderExecutionTimeoutReasonCode;
}>;

export type ProviderExecutionTimeoutFailure = Readonly<{
  valid: false;
  providerMayStart: false;
  snapshot: ProviderExecutionTimeoutSnapshot | null;
  requestId: null;
  capability: ProviderCapability | null;
  providerId: RegisteredProviderId | null;
  settlementSlotState: "CONTRACT_ERROR" | null;
  authoritativeOutcomeKind: "COORDINATOR_CONTRACT_ERROR";
  timeoutEnabled: boolean;
  requestTimeoutMs: number | null;
  timeoutFired: boolean;
  abortRequested: boolean;
  abortCallCount: 0 | 1;
  signalAborted: boolean;
  cleanupPerformed: boolean;
  cleanupCallCount: 0 | 1;
  lateSettlementObserved: boolean;
  lateSettlementKind: ProviderExecutionTimeoutSettlementKind | null;
  retryMayProceed: false;
  jobShouldPause: true;
  manualReviewRequired: boolean;
  databaseWritten: false;
  storageUploaded: false;
  publicationTriggered: false;
  notificationSent: false;
  persistable: false;
  publishable: false;
  fallbackExecuted: false;
  failClosed: true;
  reasonCode: "PROVIDER_TIMEOUT_CONTRACT_ERROR";
}>;

type SchedulerRuntimeMetadata = {
  schedule: ProviderTimeoutSchedulerConfig["schedule"];
  cleanup: ProviderTimeoutSchedulerConfig["cleanup"];
};

type CoordinatorMetadata = {
  runtime: ValidatedProviderTimeoutSchedulerRuntime;
};

type AttemptMetadata = ProviderExecutionTimeoutAttemptInput & {
  ownerCoordinator: ValidatedProviderExecutionTimeoutCoordinator;
  controller: AbortController;
  settlementSlotState: ProviderExecutionTimeoutSettlementSlotState;
  authoritativeOutcomeKind: ProviderExecutionTimeoutOutcomeKind;
  schedulerHandle: unknown;
  schedulerRegistered: boolean;
  schedulerRegistrationPhase: "IDLE" | "REGISTERING" | "REGISTERED";
  callbackActive: boolean;
  pendingTimeoutDuringRegistration: boolean;
  timeoutFired: boolean;
  abortRequested: boolean;
  abortCallCount: 0 | 1;
  cleanupAttempted: boolean;
  cleanupPerformed: boolean;
  cleanupCallCount: 0 | 1;
  lateSettlementObserved: boolean;
  lateSettlementKind: ProviderExecutionTimeoutSettlementKind | null;
};

type ContextMetadata = {
  attempt: ValidatedProviderExecutionTimeoutAttempt;
  ownerCoordinator: ValidatedProviderExecutionTimeoutCoordinator;
};

const schedulerRuntimeMetadata = new WeakMap<ValidatedProviderTimeoutSchedulerRuntime, SchedulerRuntimeMetadata>();
const coordinatorMetadata = new WeakMap<ValidatedProviderExecutionTimeoutCoordinator, CoordinatorMetadata>();
const attemptMetadata = new WeakMap<ValidatedProviderExecutionTimeoutAttempt, AttemptMetadata>();
const contextMetadata = new WeakMap<ValidatedProviderExecutionTimeoutContext, ContextMetadata>();
const safeInternalIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const secretLikePattern = /(?:authorization|bearer|token|api[_-]?key|secret|service[_-]?role|sb_secret|sk-[a-z0-9])/i;
const maxRequestTimeoutMs = 120_000;
const schedulerConfigKeys = ["schedule", "cleanup"] as const;
const attemptInputKeys = ["requestId", "capability", "providerId", "requestTimeoutMs"] as const;

export function buildProviderTimeoutSchedulerRuntime(config: unknown): ProviderTimeoutSchedulerRuntimeBuildResult {
  try {
    const snapshot = snapshotExactOwnDataProperties(config, schedulerConfigKeys);
    if (!snapshot.valid) return timeoutFailure(null, null);
    const schedule = snapshot.value.schedule;
    const cleanup = snapshot.value.cleanup;
    if (typeof schedule !== "function" || typeof cleanup !== "function") return timeoutFailure(null, null);
    const runtime = Object.freeze({}) as ValidatedProviderTimeoutSchedulerRuntime;
    schedulerRuntimeMetadata.set(runtime, {
      schedule: schedule as ProviderTimeoutSchedulerConfig["schedule"],
      cleanup: cleanup as ProviderTimeoutSchedulerConfig["cleanup"],
    });
    return Object.freeze({
      valid: true,
      runtime,
      failClosed: false,
      reasonCode: "PROVIDER_TIMEOUT_SCHEDULER_RUNTIME_VALID",
    });
  } catch {
    return timeoutFailure(null, null);
  }
}

export function createProviderExecutionTimeoutCoordinator(
  runtime: unknown,
): ProviderExecutionTimeoutCoordinatorBuildResult {
  const runtimeState = schedulerRuntimeMetadata.get(runtime as ValidatedProviderTimeoutSchedulerRuntime);
  if (!runtimeState || !Object.isFrozen(runtime)) return timeoutFailure(null, null);
  const coordinator = Object.freeze({}) as ValidatedProviderExecutionTimeoutCoordinator;
  coordinatorMetadata.set(coordinator, { runtime: runtime as ValidatedProviderTimeoutSchedulerRuntime });
  return Object.freeze({
    valid: true,
    coordinator,
    failClosed: false,
    reasonCode: "PROVIDER_TIMEOUT_COORDINATOR_VALID",
  });
}

export function startProviderExecutionTimeoutAttempt(
  coordinator: unknown,
  input: unknown,
): ProviderExecutionTimeoutAttemptStartResult {
  try {
    const coordinatorState = coordinatorMetadata.get(coordinator as ValidatedProviderExecutionTimeoutCoordinator);
    if (!coordinatorState || !Object.isFrozen(coordinator)) return timeoutFailure(null, null);
    const runtimeState = schedulerRuntimeMetadata.get(coordinatorState.runtime);
    if (!runtimeState) return timeoutFailure(null, null);
    const snapshot = snapshotAttemptInput(input);
    if (!snapshot.valid) return timeoutFailure(null, null);
    const controller = new AbortController();
    const attempt = Object.freeze({}) as ValidatedProviderExecutionTimeoutAttempt;
    const metadata: AttemptMetadata = {
      ...snapshot.value,
      ownerCoordinator: coordinator as ValidatedProviderExecutionTimeoutCoordinator,
      controller,
      settlementSlotState: "OPEN",
      authoritativeOutcomeKind: "NONE",
      schedulerHandle: null,
      schedulerRegistered: false,
      schedulerRegistrationPhase: "IDLE",
      callbackActive: false,
      pendingTimeoutDuringRegistration: false,
      timeoutFired: false,
      abortRequested: false,
      abortCallCount: 0,
      cleanupAttempted: false,
      cleanupPerformed: false,
      cleanupCallCount: 0,
      lateSettlementObserved: false,
      lateSettlementKind: null,
    };
    attemptMetadata.set(attempt, metadata);

    const context = Object.freeze({
      signal: controller.signal,
      attempt,
      timeout: Object.freeze({
        enabled: snapshot.value.requestTimeoutMs !== null,
        requestTimeoutMs: snapshot.value.requestTimeoutMs,
      }),
      cancellation: Object.freeze({
        supportsAbortSignal: true,
        supportsExplicitCancel: false,
        acknowledgmentRequiredForRetry: true,
      }),
    }) as ValidatedProviderExecutionTimeoutContext;
    contextMetadata.set(context, {
      attempt,
      ownerCoordinator: coordinator as ValidatedProviderExecutionTimeoutCoordinator,
    });

    if (snapshot.value.requestTimeoutMs !== null) {
      try {
        metadata.schedulerRegistrationPhase = "REGISTERING";
        metadata.callbackActive = true;
        metadata.schedulerHandle = runtimeState.schedule(snapshot.value.requestTimeoutMs, () => {
          handleProviderExecutionTimeoutElapsed(coordinator, attempt);
        });
        metadata.schedulerRegistered = true;
        metadata.schedulerRegistrationPhase = "REGISTERED";
        if (metadata.pendingTimeoutDuringRegistration && !processTimeoutElapsed(metadata)) {
          return timeoutFailureFromMetadata(metadata);
        }
        if (metadata.pendingTimeoutDuringRegistration || metadata.settlementSlotState === "TIMEOUT_WON") {
          return Object.freeze({
            valid: true,
            providerMayStart: false,
            attempt: null,
            executionContext: null,
            snapshot: buildSnapshot(metadata, "PROVIDER_TIMEOUT_WON_DURING_REGISTRATION"),
            failClosed: true,
            reasonCode: "PROVIDER_TIMEOUT_WON_DURING_REGISTRATION",
          });
        }
      } catch {
        metadata.callbackActive = false;
        metadata.schedulerRegistrationPhase = "IDLE";
        metadata.settlementSlotState = "CONTRACT_ERROR";
        metadata.authoritativeOutcomeKind = "COORDINATOR_CONTRACT_ERROR";
        return timeoutFailureFromMetadata(metadata);
      }
    }

    return Object.freeze({
      valid: true,
      providerMayStart: true,
      attempt,
      executionContext: context,
      snapshot: buildSnapshot(metadata, "PROVIDER_TIMEOUT_ATTEMPT_STARTED"),
      failClosed: false,
      reasonCode: "PROVIDER_TIMEOUT_ATTEMPT_STARTED",
    });
  } catch {
    return timeoutFailure(null, null);
  }
}

export function markProviderExecutionTimeoutProviderSettled(
  coordinator: unknown,
  attempt: unknown,
  settlement: unknown,
): ProviderExecutionTimeoutSnapshot {
  const metadata = getOwnedAttemptMetadata(coordinator, attempt);
  if (!metadata) return snapshotFailure(null, null);
  if (!isProviderSettlementKind(settlement)) return contractError(metadata);

  if (metadata.settlementSlotState === "OPEN") {
    metadata.settlementSlotState = "PROVIDER_SETTLED_FIRST";
    metadata.authoritativeOutcomeKind =
      settlement === "SUCCESS" ? "PROVIDER_COMPLETED_BEFORE_TIMEOUT" : "PROVIDER_FAILED_BEFORE_TIMEOUT";
    if (!cleanupAttemptTimer(metadata)) return contractError(metadata);
    return buildSnapshot(
      metadata,
      settlement === "SUCCESS"
        ? "PROVIDER_TIMEOUT_PROVIDER_COMPLETED_BEFORE_TIMEOUT"
        : "PROVIDER_TIMEOUT_PROVIDER_FAILED_BEFORE_TIMEOUT",
    );
  }

  if (metadata.settlementSlotState === "TIMEOUT_WON") {
    metadata.settlementSlotState = "LATE_PROVIDER_SETTLEMENT";
    metadata.lateSettlementObserved = true;
    metadata.lateSettlementKind = settlement;
    return buildSnapshot(metadata, "PROVIDER_TIMEOUT_LATE_PROVIDER_SETTLEMENT");
  }

  return contractError(metadata);
}

export function readProviderExecutionTimeoutSnapshot(
  coordinator: unknown,
  attempt: unknown,
): ProviderExecutionTimeoutSnapshot {
  const metadata = getOwnedAttemptMetadata(coordinator, attempt);
  if (!metadata) return snapshotFailure(null, null);
  return buildSnapshot(metadata, reasonForMetadata(metadata));
}

export function cleanupProviderExecutionTimeoutAttempt(
  coordinator: unknown,
  attempt: unknown,
): ProviderExecutionTimeoutSnapshot {
  const metadata = getOwnedAttemptMetadata(coordinator, attempt);
  if (!metadata) return snapshotFailure(null, null);
  if (!cleanupAttemptTimer(metadata)) return contractError(metadata);
  return buildSnapshot(metadata, "PROVIDER_TIMEOUT_CLEANUP_COMPLETED");
}

export function validateProviderExecutionTimeoutContext(
  context: unknown,
  coordinator: unknown,
  attempt: unknown,
): boolean {
  const meta = contextMetadata.get(context as ValidatedProviderExecutionTimeoutContext);
  return (
    !!meta &&
    Object.isFrozen(context) &&
    meta.ownerCoordinator === coordinator &&
    meta.attempt === attempt &&
    attemptMetadata.has(attempt as ValidatedProviderExecutionTimeoutAttempt)
  );
}

function handleProviderExecutionTimeoutElapsed(coordinator: unknown, attempt: unknown): void {
  const metadata = getOwnedAttemptMetadata(coordinator, attempt);
  if (!metadata) return;
  if (!metadata.callbackActive) return;
  if (metadata.schedulerRegistrationPhase === "REGISTERING") {
    metadata.pendingTimeoutDuringRegistration = true;
    return;
  }
  processTimeoutElapsed(metadata);
}

function processTimeoutElapsed(metadata: AttemptMetadata): boolean {
  if (!metadata.callbackActive) return true;
  if (metadata.settlementSlotState !== "OPEN") return true;
  metadata.settlementSlotState = "TIMEOUT_WON";
  metadata.authoritativeOutcomeKind = "CANCELLATION_REQUESTED";
  metadata.timeoutFired = true;
  if (metadata.abortCallCount === 0) {
    metadata.controller.abort();
    metadata.abortRequested = true;
    metadata.abortCallCount = 1;
  }
  if (!cleanupAttemptTimer(metadata)) {
    metadata.settlementSlotState = "CONTRACT_ERROR";
    metadata.authoritativeOutcomeKind = "COORDINATOR_CONTRACT_ERROR";
    return false;
  }
  return true;
}

function cleanupAttemptTimer(metadata: AttemptMetadata): boolean {
  if (metadata.cleanupAttempted) return metadata.cleanupPerformed;
  metadata.callbackActive = false;
  metadata.pendingTimeoutDuringRegistration = false;
  metadata.cleanupAttempted = true;
  if (!metadata.schedulerRegistered) {
    metadata.cleanupPerformed = true;
    return true;
  }
  const coordinatorState = coordinatorMetadata.get(metadata.ownerCoordinator);
  const runtime = coordinatorState ? schedulerRuntimeMetadata.get(coordinatorState.runtime) : null;
  if (!runtime) return false;
  try {
    metadata.cleanupCallCount = 1;
    runtime.cleanup(metadata.schedulerHandle);
    metadata.cleanupPerformed = true;
    return true;
  } catch {
    return false;
  }
}

function getOwnedAttemptMetadata(coordinator: unknown, attempt: unknown): AttemptMetadata | null {
  const coordinatorState = coordinatorMetadata.get(coordinator as ValidatedProviderExecutionTimeoutCoordinator);
  const metadata = attemptMetadata.get(attempt as ValidatedProviderExecutionTimeoutAttempt);
  if (!coordinatorState || !metadata || !Object.isFrozen(coordinator) || !Object.isFrozen(attempt)) return null;
  if (metadata.ownerCoordinator !== coordinator) return null;
  return metadata;
}

function contractError(metadata: AttemptMetadata): ProviderExecutionTimeoutSnapshot {
  metadata.settlementSlotState = "CONTRACT_ERROR";
  metadata.authoritativeOutcomeKind = "COORDINATOR_CONTRACT_ERROR";
  metadata.callbackActive = false;
  metadata.pendingTimeoutDuringRegistration = false;
  if (!metadata.cleanupAttempted) cleanupAttemptTimer(metadata);
  return buildSnapshot(metadata, "PROVIDER_TIMEOUT_CONTRACT_ERROR");
}

function buildSnapshot(
  metadata: AttemptMetadata,
  reasonCode: ProviderExecutionTimeoutReasonCode,
): ProviderExecutionTimeoutSnapshot {
  const contractFailure = metadata.settlementSlotState === "CONTRACT_ERROR";
  const ambiguous =
    metadata.settlementSlotState === "TIMEOUT_WON" ||
    metadata.settlementSlotState === "LATE_PROVIDER_SETTLEMENT" ||
    metadata.settlementSlotState === "CONTRACT_ERROR";
  return Object.freeze({
    valid: !contractFailure,
    requestId: metadata.requestId,
    capability: metadata.capability,
    providerId: metadata.providerId,
    settlementSlotState: metadata.settlementSlotState,
    authoritativeOutcomeKind: metadata.authoritativeOutcomeKind,
    timeoutEnabled: metadata.requestTimeoutMs !== null,
    requestTimeoutMs: metadata.requestTimeoutMs,
    timeoutFired: metadata.timeoutFired,
    abortRequested: metadata.abortRequested,
    abortCallCount: metadata.abortCallCount,
    signalAborted: metadata.controller.signal.aborted,
    cleanupPerformed: metadata.cleanupPerformed,
    cleanupCallCount: metadata.cleanupCallCount,
    lateSettlementObserved: metadata.lateSettlementObserved,
    lateSettlementKind: metadata.lateSettlementKind,
    retryMayProceed: false,
    jobShouldPause: ambiguous,
    manualReviewRequired: ambiguous && isMedicalSafetyCapability(metadata.capability),
    ...sideEffectFalseFields(),
    reasonCode,
  });
}

function timeoutFailure(
  capability: ProviderCapability | null,
  providerId: RegisteredProviderId | null,
): ProviderExecutionTimeoutFailure {
  return Object.freeze({
    valid: false,
    providerMayStart: false,
    snapshot: null,
    requestId: null,
    capability,
    providerId,
    settlementSlotState: "CONTRACT_ERROR",
    authoritativeOutcomeKind: "COORDINATOR_CONTRACT_ERROR",
    timeoutEnabled: false,
    requestTimeoutMs: null,
    timeoutFired: false,
    abortRequested: false,
    abortCallCount: 0,
    signalAborted: false,
    cleanupPerformed: false,
    cleanupCallCount: 0,
    lateSettlementObserved: false,
    lateSettlementKind: null,
    retryMayProceed: false,
    jobShouldPause: true,
    manualReviewRequired: capability ? isMedicalSafetyCapability(capability) : false,
    ...sideEffectFalseFields(),
    failClosed: true,
    reasonCode: "PROVIDER_TIMEOUT_CONTRACT_ERROR",
  });
}

function snapshotFailure(
  capability: ProviderCapability | null,
  providerId: RegisteredProviderId | null,
): ProviderExecutionTimeoutSnapshot {
  return Object.freeze({
    valid: false,
    requestId: null,
    capability,
    providerId,
    settlementSlotState: "CONTRACT_ERROR",
    authoritativeOutcomeKind: "COORDINATOR_CONTRACT_ERROR",
    timeoutEnabled: false,
    requestTimeoutMs: null,
    timeoutFired: false,
    abortRequested: false,
    abortCallCount: 0,
    signalAborted: false,
    cleanupPerformed: false,
    cleanupCallCount: 0,
    lateSettlementObserved: false,
    lateSettlementKind: null,
    retryMayProceed: false,
    jobShouldPause: true,
    manualReviewRequired: capability ? isMedicalSafetyCapability(capability) : false,
    ...sideEffectFalseFields(),
    reasonCode: "PROVIDER_TIMEOUT_CONTRACT_ERROR",
  });
}

function timeoutFailureFromMetadata(metadata: AttemptMetadata): ProviderExecutionTimeoutFailure {
  const snapshot = buildSnapshot(metadata, "PROVIDER_TIMEOUT_CONTRACT_ERROR");
  return Object.freeze({
    valid: false,
    providerMayStart: false,
    snapshot,
    requestId: null,
    capability: metadata.capability,
    providerId: metadata.providerId,
    settlementSlotState: "CONTRACT_ERROR",
    authoritativeOutcomeKind: "COORDINATOR_CONTRACT_ERROR",
    timeoutEnabled: metadata.requestTimeoutMs !== null,
    requestTimeoutMs: metadata.requestTimeoutMs,
    timeoutFired: metadata.timeoutFired,
    abortRequested: metadata.abortRequested,
    abortCallCount: metadata.abortCallCount,
    signalAborted: metadata.controller.signal.aborted,
    cleanupPerformed: metadata.cleanupPerformed,
    cleanupCallCount: metadata.cleanupCallCount,
    lateSettlementObserved: metadata.lateSettlementObserved,
    lateSettlementKind: metadata.lateSettlementKind,
    retryMayProceed: false,
    jobShouldPause: true,
    manualReviewRequired: isMedicalSafetyCapability(metadata.capability),
    ...sideEffectFalseFields(),
    failClosed: true,
    reasonCode: "PROVIDER_TIMEOUT_CONTRACT_ERROR",
  });
}

function sideEffectFalseFields() {
  return {
    databaseWritten: false,
    storageUploaded: false,
    publicationTriggered: false,
    notificationSent: false,
    persistable: false,
    publishable: false,
    fallbackExecuted: false,
  } as const;
}

function reasonForMetadata(metadata: AttemptMetadata): ProviderExecutionTimeoutReasonCode {
  if (metadata.settlementSlotState === "CONTRACT_ERROR") return "PROVIDER_TIMEOUT_CONTRACT_ERROR";
  if (metadata.settlementSlotState === "TIMEOUT_WON") return "PROVIDER_TIMEOUT_CANCELLATION_REQUESTED";
  if (metadata.settlementSlotState === "LATE_PROVIDER_SETTLEMENT") return "PROVIDER_TIMEOUT_LATE_PROVIDER_SETTLEMENT";
  if (metadata.settlementSlotState === "PROVIDER_SETTLED_FIRST") {
    return metadata.authoritativeOutcomeKind === "PROVIDER_COMPLETED_BEFORE_TIMEOUT"
      ? "PROVIDER_TIMEOUT_PROVIDER_COMPLETED_BEFORE_TIMEOUT"
      : "PROVIDER_TIMEOUT_PROVIDER_FAILED_BEFORE_TIMEOUT";
  }
  return "PROVIDER_TIMEOUT_ATTEMPT_STARTED";
}

function snapshotAttemptInput(value: unknown):
  | { valid: true; value: ProviderExecutionTimeoutAttemptInput }
  | { valid: false } {
  try {
    const snapshot = snapshotExactOwnDataProperties(value, attemptInputKeys);
    if (!snapshot.valid) return { valid: false };
    const requestId = snapshot.value.requestId;
    const capability = snapshot.value.capability;
    const providerId = snapshot.value.providerId;
    const requestTimeoutMs = snapshot.value.requestTimeoutMs;
    if (!isSafeInternalId(requestId)) return { valid: false };
    if (!isProviderCapability(capability)) return { valid: false };
    if (!isRegisteredProviderId(providerId)) return { valid: false };
    if (!isValidRequestTimeoutMs(requestTimeoutMs)) return { valid: false };
    return {
      valid: true,
      value: {
        requestId,
        capability,
        providerId,
        requestTimeoutMs,
      },
    };
  } catch {
    return { valid: false };
  }
}

function isStrictPlainDataObject(value: unknown): value is Record<string, unknown> {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function snapshotExactOwnDataProperties<const TKeys extends readonly string[]>(
  value: unknown,
  expectedKeys: TKeys,
): { valid: true; value: Readonly<Record<TKeys[number], unknown>> } | { valid: false } {
  try {
    if (!isStrictPlainDataObject(value)) return { valid: false };
    const keys = Reflect.ownKeys(value);
    if (keys.length !== expectedKeys.length) return { valid: false };
    const expectedKeySet = new Set<string>(expectedKeys);
    const snapshot: Record<string, unknown> = {};
    for (const key of keys) {
      if (typeof key !== "string") return { valid: false };
      if (!expectedKeySet.has(key)) return { valid: false };
    }
    for (const key of expectedKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return { valid: false };
      snapshot[key] = descriptor.value;
    }
    return {
      valid: true,
      value: Object.freeze(snapshot) as Readonly<Record<TKeys[number], unknown>>,
    };
  } catch {
    return { valid: false };
  }
}

function isSafeInternalId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!value || value.length > 128) return false;
  if (!safeInternalIdPattern.test(value)) return false;
  if (secretLikePattern.test(value)) return false;
  return !value.includes("\n") && !value.includes("\r") && !value.includes("://");
}

function isProviderCapability(value: unknown): value is ProviderCapability {
  return typeof value === "string" && (providerCapabilities as readonly string[]).includes(value);
}

function isRegisteredProviderId(value: unknown): value is RegisteredProviderId {
  return typeof value === "string" && (registeredProviderIds as readonly string[]).includes(value);
}

function isValidRequestTimeoutMs(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= maxRequestTimeoutMs);
}

function isProviderSettlementKind(value: unknown): value is ProviderExecutionTimeoutSettlementKind {
  return value === "SUCCESS" || value === "FAILURE";
}
