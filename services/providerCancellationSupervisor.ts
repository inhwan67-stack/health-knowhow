import {
  isMedicalSafetyCapability,
  isSafeRegisteredProviderId,
  providerCapabilities,
  type ProviderCapability,
  type RegisteredProviderId,
} from "./providerResiliencePolicy";

declare const validatedProviderCancellationSupervisorBrand: unique symbol;
declare const validatedProviderCancellationLifecycleBrand: unique symbol;
declare const validatedProviderCancellationReceiptBrand: unique symbol;

export type ValidatedProviderCancellationSupervisor = {
  readonly [validatedProviderCancellationSupervisorBrand]: true;
};

export type ValidatedProviderCancellationLifecycle = {
  readonly [validatedProviderCancellationLifecycleBrand]: true;
};

export type ValidatedProviderCancellationReceipt = {
  readonly [validatedProviderCancellationReceiptBrand]: true;
};

export const providerCancellationStates = [
  "NOT_STARTED",
  "RUNNING",
  "COMPLETED_SUCCESS",
  "COMPLETED_FAILURE",
  "FAILED_BEFORE_CALL",
  "CANCEL_REQUESTED",
  "CANCEL_CONFIRMED",
  "CANCEL_UNCONFIRMED",
  "SETTLED_AFTER_CANCEL_REQUEST",
  "CONTRACT_ERROR",
] as const;

export type ProviderCancellationState = (typeof providerCancellationStates)[number];

export type ProviderCancellationReasonCode =
  | "PROVIDER_CANCELLATION_SUPERVISOR_VALID"
  | "PROVIDER_CANCELLATION_LIFECYCLE_STARTED"
  | "PROVIDER_CANCELLATION_ACTIVE_OVERLAP_BLOCKED"
  | "PROVIDER_CANCELLATION_PROVIDER_COMPLETED_SUCCESSFULLY"
  | "PROVIDER_CANCELLATION_PROVIDER_COMPLETED_WITH_FAILURE"
  | "PROVIDER_CANCELLATION_FAILED_BEFORE_PROVIDER_CALL"
  | "PROVIDER_CANCELLATION_REQUESTED"
  | "PROVIDER_CANCELLATION_CONFIRMED"
  | "PROVIDER_CANCELLATION_UNCONFIRMED"
  | "PROVIDER_CANCELLATION_PROVIDER_SETTLED_AFTER_CANCEL_REQUEST"
  | "PROVIDER_CANCELLATION_INVALID_LIFECYCLE_TRANSITION"
  | "PROVIDER_CANCELLATION_INVALID_OR_FORGED_RECEIPT"
  | "PROVIDER_CANCELLATION_RETRY_BOUNDARY_SATISFIED"
  | "PROVIDER_CANCELLATION_RETRY_BLOCKED_BY_ACTIVE_EXECUTION"
  | "PROVIDER_CANCELLATION_RETRY_BLOCKED_BY_UNCONFIRMED_CANCELLATION"
  | "PROVIDER_CANCELLATION_RETRY_BLOCKED_BY_LATE_SETTLEMENT"
  | "PROVIDER_CANCELLATION_SEQUENCE_ALREADY_SUCCEEDED"
  | "PROVIDER_CANCELLATION_CONTRACT_ERROR";

export type ProviderCancellationLifecycleInput = {
  requestId: string;
  capability: ProviderCapability;
  providerId: RegisteredProviderId;
};

export type ProviderCancellationSettlementKind =
  | null
  | "SUCCESS"
  | "FAILURE"
  | "FAILED_BEFORE_CALL"
  | "CANCEL_CONFIRMED"
  | "CANCEL_UNCONFIRMED"
  | "SETTLED_SUCCESS_AFTER_CANCEL_REQUEST"
  | "SETTLED_FAILURE_AFTER_CANCEL_REQUEST";

export type ProviderCancellationLifecycleResult =
  | {
      valid: true;
      lifecycle: ValidatedProviderCancellationLifecycle;
      requestId: string;
      capability: ProviderCapability;
      providerId: RegisteredProviderId;
      state: ProviderCancellationState;
      cancellationRequested: boolean;
      cancellationConfirmed: boolean;
      providerSettled: boolean;
      settlementKind: ProviderCancellationSettlementKind;
      retryMayProceed: boolean;
      jobShouldPause: boolean;
      manualReviewRequired: boolean;
      reasonCode: ProviderCancellationReasonCode;
      databaseWritten: false;
      storageUploaded: false;
      publicationTriggered: false;
      notificationSent: false;
      persistable: false;
      publishable: false;
      fallbackExecuted: false;
      providerExecutionStarted: false;
    }
  | ProviderCancellationFailureResult;

export type ProviderCancellationFailureResult = {
  valid: false;
  lifecycle: null;
  requestId: string | null;
  capability: ProviderCapability | null;
  providerId: RegisteredProviderId | null;
  state: "CONTRACT_ERROR";
  cancellationRequested: boolean;
  cancellationConfirmed: false;
  providerSettled: boolean;
  settlementKind: ProviderCancellationSettlementKind;
  retryMayProceed: false;
  jobShouldPause: true;
  manualReviewRequired: boolean;
  reasonCode: ProviderCancellationReasonCode;
  databaseWritten: false;
  storageUploaded: false;
  publicationTriggered: false;
  notificationSent: false;
  persistable: false;
  publishable: false;
  fallbackExecuted: false;
  providerExecutionStarted: false;
};

export type ProviderCancellationReceiptResult =
  | {
      valid: true;
      receipt: ValidatedProviderCancellationReceipt;
      requestId: string;
      capability: ProviderCapability;
      providerId: RegisteredProviderId;
      reasonCode: "PROVIDER_CANCELLATION_CONFIRMED";
      databaseWritten: false;
      storageUploaded: false;
      publicationTriggered: false;
      notificationSent: false;
      persistable: false;
      publishable: false;
      fallbackExecuted: false;
      providerExecutionStarted: false;
      retryMayProceed: false;
    }
  | {
      valid: false;
      receipt: null;
      requestId: string | null;
      capability: ProviderCapability | null;
      providerId: RegisteredProviderId | null;
      reasonCode: "PROVIDER_CANCELLATION_INVALID_OR_FORGED_RECEIPT";
      databaseWritten: false;
      storageUploaded: false;
      publicationTriggered: false;
      notificationSent: false;
      persistable: false;
      publishable: false;
      fallbackExecuted: false;
      providerExecutionStarted: false;
      retryMayProceed: false;
    };

export type ProviderCancellationRetryBoundaryResult = {
  valid: boolean;
  executionBoundarySafe: boolean;
  retryMayProceed: boolean;
  requestId: string | null;
  capability: ProviderCapability | null;
  providerId: RegisteredProviderId | null;
  state: ProviderCancellationState | null;
  failClosed: boolean;
  jobShouldPause: boolean;
  manualReviewRequired: boolean;
  reasonCode: ProviderCancellationReasonCode;
  databaseWritten: false;
  storageUploaded: false;
  publicationTriggered: false;
  notificationSent: false;
  persistable: false;
  publishable: false;
  fallbackExecuted: false;
  providerExecutionStarted: false;
};

type SupervisorMetadata = {
  activeLifecycleByKey: Map<string, ValidatedProviderCancellationLifecycle>;
  blockedKeys: Set<string>;
};

type LifecycleMetadata = ProviderCancellationLifecycleInput & {
  ownerSupervisor: ValidatedProviderCancellationSupervisor;
  state: ProviderCancellationState;
  cancellationRequested: boolean;
  cancellationConfirmed: boolean;
  providerSettled: boolean;
  settlementKind: ProviderCancellationSettlementKind;
  activeExecutionKey: string;
};

type ReceiptMetadata = ProviderCancellationLifecycleInput & {
  lifecycle: ValidatedProviderCancellationLifecycle;
  cancellationConfirmed: true;
};

const supervisorMetadata = new WeakMap<ValidatedProviderCancellationSupervisor, SupervisorMetadata>();
const lifecycleMetadata = new WeakMap<ValidatedProviderCancellationLifecycle, LifecycleMetadata>();
const receiptMetadata = new WeakMap<ValidatedProviderCancellationReceipt, ReceiptMetadata>();
const secretLikeInternalIdPattern =
  /(?:authorization|bearer|token|api[_-]?key|secret|service[_-]?role|sb_secret|sk-[a-z0-9])/i;

export function createProviderCancellationSupervisor(): {
  valid: true;
  supervisor: ValidatedProviderCancellationSupervisor;
  reasonCode: "PROVIDER_CANCELLATION_SUPERVISOR_VALID";
} {
  const supervisor = Object.freeze({}) as ValidatedProviderCancellationSupervisor;
  supervisorMetadata.set(supervisor, { activeLifecycleByKey: new Map(), blockedKeys: new Set() });
  return Object.freeze({
    valid: true,
    supervisor,
    reasonCode: "PROVIDER_CANCELLATION_SUPERVISOR_VALID",
  });
}

export function startProviderCancellationLifecycle(
  supervisor: unknown,
  input: unknown,
): ProviderCancellationLifecycleResult {
  const supervisorState = supervisorMetadata.get(supervisor as ValidatedProviderCancellationSupervisor);
  const snapshot = snapshotLifecycleInput(input);
  if (!supervisorState || !snapshot.valid) {
    return lifecycleFailure(null, null, null, "PROVIDER_CANCELLATION_CONTRACT_ERROR");
  }

  const activeExecutionKey = buildExecutionKey(snapshot.value);
  if (supervisorState.activeLifecycleByKey.has(activeExecutionKey) || supervisorState.blockedKeys.has(activeExecutionKey)) {
    return lifecycleFailure(
      snapshot.value.requestId,
      snapshot.value.capability,
      snapshot.value.providerId,
      "PROVIDER_CANCELLATION_ACTIVE_OVERLAP_BLOCKED",
    );
  }

  const lifecycle = Object.freeze({}) as ValidatedProviderCancellationLifecycle;
  lifecycleMetadata.set(lifecycle, {
    ...snapshot.value,
    ownerSupervisor: supervisor as ValidatedProviderCancellationSupervisor,
    state: "NOT_STARTED",
    cancellationRequested: false,
    cancellationConfirmed: false,
    providerSettled: false,
    settlementKind: null,
    activeExecutionKey,
  });
  supervisorState.activeLifecycleByKey.set(activeExecutionKey, lifecycle);
  return lifecycleSuccess(lifecycle, "PROVIDER_CANCELLATION_LIFECYCLE_STARTED");
}

export function markProviderCancellationLifecycleRunning(
  supervisor: unknown,
  lifecycle: unknown,
): ProviderCancellationLifecycleResult {
  return transitionLifecycle(supervisor, lifecycle, "RUNNING");
}

export function markProviderCancellationLifecycleCompletedSuccess(
  supervisor: unknown,
  lifecycle: unknown,
): ProviderCancellationLifecycleResult {
  return transitionLifecycle(supervisor, lifecycle, "COMPLETED_SUCCESS");
}

export function markProviderCancellationLifecycleCompletedFailure(
  supervisor: unknown,
  lifecycle: unknown,
): ProviderCancellationLifecycleResult {
  return transitionLifecycle(supervisor, lifecycle, "COMPLETED_FAILURE");
}

export function markProviderCancellationLifecycleFailedBeforeCall(
  supervisor: unknown,
  lifecycle: unknown,
): ProviderCancellationLifecycleResult {
  return transitionLifecycle(supervisor, lifecycle, "FAILED_BEFORE_CALL");
}

export function requestProviderCancellation(
  supervisor: unknown,
  lifecycle: unknown,
): ProviderCancellationLifecycleResult {
  return transitionLifecycle(supervisor, lifecycle, "CANCEL_REQUESTED");
}

export function confirmProviderCancellation(
  supervisor: unknown,
  lifecycle: unknown,
): ProviderCancellationLifecycleResult {
  return transitionLifecycle(supervisor, lifecycle, "CANCEL_CONFIRMED");
}

export function markProviderCancellationUnconfirmed(
  supervisor: unknown,
  lifecycle: unknown,
): ProviderCancellationLifecycleResult {
  return transitionLifecycle(supervisor, lifecycle, "CANCEL_UNCONFIRMED");
}

export function markProviderCancellationSettledAfterRequest(
  supervisor: unknown,
  lifecycle: unknown,
  settlement: "SUCCESS" | "FAILURE",
): ProviderCancellationLifecycleResult {
  if (settlement !== "SUCCESS" && settlement !== "FAILURE") {
    return transitionFailure(supervisor, lifecycle);
  }
  return transitionLifecycle(
    supervisor,
    lifecycle,
    "SETTLED_AFTER_CANCEL_REQUEST",
    settlement === "SUCCESS" ? "SETTLED_SUCCESS_AFTER_CANCEL_REQUEST" : "SETTLED_FAILURE_AFTER_CANCEL_REQUEST",
  );
}

export function createProviderCancellationReceipt(
  lifecycle: unknown,
): ProviderCancellationReceiptResult {
  const meta = lifecycleMetadata.get(lifecycle as ValidatedProviderCancellationLifecycle);
  if (!meta || meta.state !== "CANCEL_CONFIRMED" || !meta.cancellationConfirmed) {
    return receiptFailure(null, null, null);
  }
  const receipt = Object.freeze({}) as ValidatedProviderCancellationReceipt;
  receiptMetadata.set(receipt, {
    lifecycle: lifecycle as ValidatedProviderCancellationLifecycle,
    requestId: meta.requestId,
    capability: meta.capability,
    providerId: meta.providerId,
    cancellationConfirmed: true,
  });
  return Object.freeze({
    valid: true,
    receipt,
    requestId: meta.requestId,
    capability: meta.capability,
    providerId: meta.providerId,
    reasonCode: "PROVIDER_CANCELLATION_CONFIRMED",
    ...sideEffectFalseFields(),
    retryMayProceed: false,
  });
}

export function validateProviderCancellationReceiptForRetry(
  receipt: unknown,
  expectedLifecycle: unknown,
  requestId: unknown,
  capability: unknown,
  providerId: unknown,
): ProviderCancellationReceiptResult {
  const meta = receiptMetadata.get(receipt as ValidatedProviderCancellationReceipt);
  const expectedLifecycleMeta = lifecycleMetadata.get(expectedLifecycle as ValidatedProviderCancellationLifecycle);
  if (
    !meta ||
    !expectedLifecycleMeta ||
    !Object.isFrozen(receipt) ||
    !Object.isFrozen(expectedLifecycle) ||
    meta.lifecycle !== expectedLifecycle ||
    expectedLifecycleMeta.state !== "CANCEL_CONFIRMED" ||
    requestId !== meta.requestId ||
    capability !== meta.capability ||
    providerId !== meta.providerId
  ) {
    return receiptFailure(null, null, null);
  }
  const lifecycle = lifecycleMetadata.get(meta.lifecycle);
  if (!lifecycle || lifecycle !== expectedLifecycleMeta || lifecycle.state !== "CANCEL_CONFIRMED" || !meta.cancellationConfirmed) {
    return receiptFailure(null, null, null);
  }
  return Object.freeze({
    valid: true,
    receipt: receipt as ValidatedProviderCancellationReceipt,
    requestId: meta.requestId,
    capability: meta.capability,
    providerId: meta.providerId,
    reasonCode: "PROVIDER_CANCELLATION_CONFIRMED",
    ...sideEffectFalseFields(),
    retryMayProceed: false,
  });
}

export function buildProviderCancellationRetryBoundaryDecision(
  lifecycle: unknown,
  receipt?: unknown,
): ProviderCancellationRetryBoundaryResult {
  const meta = lifecycleMetadata.get(lifecycle as ValidatedProviderCancellationLifecycle);
  if (!meta) return retryBoundaryFailure(null, null, null, null, "PROVIDER_CANCELLATION_CONTRACT_ERROR");

  if (meta.state === "FAILED_BEFORE_CALL" || meta.state === "COMPLETED_FAILURE") {
    const staleBoundaryFailure = getStaleBoundaryFailure(lifecycle as ValidatedProviderCancellationLifecycle, meta);
    if (staleBoundaryFailure) return staleBoundaryFailure;
    return retryBoundarySuccess(meta, true, "PROVIDER_CANCELLATION_RETRY_BOUNDARY_SATISFIED");
  }
  if (meta.state === "CANCEL_CONFIRMED") {
    const staleBoundaryFailure = getStaleBoundaryFailure(lifecycle as ValidatedProviderCancellationLifecycle, meta);
    if (staleBoundaryFailure) return staleBoundaryFailure;
    const receiptDecision = validateProviderCancellationReceiptForRetry(
      receipt,
      lifecycle,
      meta.requestId,
      meta.capability,
      meta.providerId,
    );
    if (receiptDecision.valid) {
      return retryBoundarySuccess(meta, true, "PROVIDER_CANCELLATION_RETRY_BOUNDARY_SATISFIED");
    }
    return retryBoundaryFailure(
      meta.requestId,
      meta.capability,
      meta.providerId,
      meta.state,
      "PROVIDER_CANCELLATION_INVALID_OR_FORGED_RECEIPT",
    );
  }
  if (meta.state === "COMPLETED_SUCCESS") {
    const staleBoundaryFailure = getStaleBoundaryFailure(lifecycle as ValidatedProviderCancellationLifecycle, meta);
    if (staleBoundaryFailure) return staleBoundaryFailure;
    return retryBoundarySuccess(meta, false, "PROVIDER_CANCELLATION_SEQUENCE_ALREADY_SUCCEEDED");
  }
  if (meta.state === "RUNNING" || meta.state === "CANCEL_REQUESTED" || meta.state === "NOT_STARTED") {
    return retryBoundaryFailure(
      meta.requestId,
      meta.capability,
      meta.providerId,
      meta.state,
      "PROVIDER_CANCELLATION_RETRY_BLOCKED_BY_ACTIVE_EXECUTION",
    );
  }
  if (meta.state === "CANCEL_UNCONFIRMED") {
    return retryBoundaryFailure(
      meta.requestId,
      meta.capability,
      meta.providerId,
      meta.state,
      "PROVIDER_CANCELLATION_RETRY_BLOCKED_BY_UNCONFIRMED_CANCELLATION",
    );
  }
  if (meta.state === "SETTLED_AFTER_CANCEL_REQUEST") {
    return retryBoundaryFailure(
      meta.requestId,
      meta.capability,
      meta.providerId,
      meta.state,
      "PROVIDER_CANCELLATION_RETRY_BLOCKED_BY_LATE_SETTLEMENT",
    );
  }
  return retryBoundaryFailure(
    meta.requestId,
    meta.capability,
    meta.providerId,
    meta.state,
    "PROVIDER_CANCELLATION_CONTRACT_ERROR",
  );
}

function transitionLifecycle(
  supervisor: unknown,
  lifecycle: unknown,
  nextState: ProviderCancellationState,
  forcedSettlementKind?: ProviderCancellationSettlementKind,
): ProviderCancellationLifecycleResult {
  const supervisorState = supervisorMetadata.get(supervisor as ValidatedProviderCancellationSupervisor);
  const meta = lifecycleMetadata.get(lifecycle as ValidatedProviderCancellationLifecycle);
  if (!supervisorState || !meta) return lifecycleFailure(null, null, null, "PROVIDER_CANCELLATION_CONTRACT_ERROR");
  if (meta.ownerSupervisor !== supervisor) {
    return lifecycleFailureFromMetadata(meta, "PROVIDER_CANCELLATION_CONTRACT_ERROR");
  }
  if (supervisorState.activeLifecycleByKey.get(meta.activeExecutionKey) !== lifecycle) {
    return lifecycleFailureFromMetadata(meta, "PROVIDER_CANCELLATION_CONTRACT_ERROR");
  }
  if (!isTransitionAllowed(meta.state, nextState)) {
    if (supervisorState.activeLifecycleByKey.get(meta.activeExecutionKey) === lifecycle) {
      meta.state = "CONTRACT_ERROR";
      supervisorState.activeLifecycleByKey.delete(meta.activeExecutionKey);
      supervisorState.blockedKeys.add(meta.activeExecutionKey);
    }
    return lifecycleFailureFromMetadata(meta, "PROVIDER_CANCELLATION_INVALID_LIFECYCLE_TRANSITION");
  }

  meta.state = nextState;
  if (nextState === "CANCEL_REQUESTED") meta.cancellationRequested = true;
  if (nextState === "CANCEL_CONFIRMED") {
    meta.cancellationRequested = true;
    meta.cancellationConfirmed = true;
    meta.providerSettled = true;
    meta.settlementKind = "CANCEL_CONFIRMED";
  }
  if (nextState === "CANCEL_UNCONFIRMED") {
    meta.cancellationRequested = true;
    meta.providerSettled = false;
    meta.settlementKind = "CANCEL_UNCONFIRMED";
  }
  if (nextState === "SETTLED_AFTER_CANCEL_REQUEST") {
    meta.cancellationRequested = true;
    meta.providerSettled = true;
    meta.settlementKind = forcedSettlementKind ?? "SETTLED_FAILURE_AFTER_CANCEL_REQUEST";
  }
  if (nextState === "COMPLETED_SUCCESS" || nextState === "COMPLETED_FAILURE" || nextState === "FAILED_BEFORE_CALL") {
    meta.providerSettled = nextState !== "FAILED_BEFORE_CALL";
    meta.settlementKind =
      nextState === "COMPLETED_SUCCESS" ? "SUCCESS" : nextState === "COMPLETED_FAILURE" ? "FAILURE" : "FAILED_BEFORE_CALL";
  }

  if (canReleaseActiveKey(nextState)) {
    if (supervisorState.activeLifecycleByKey.get(meta.activeExecutionKey) === lifecycle) {
      supervisorState.activeLifecycleByKey.delete(meta.activeExecutionKey);
    }
  } else if (isBlockedTerminalState(nextState)) {
    if (supervisorState.activeLifecycleByKey.get(meta.activeExecutionKey) === lifecycle) {
      supervisorState.activeLifecycleByKey.delete(meta.activeExecutionKey);
      supervisorState.blockedKeys.add(meta.activeExecutionKey);
    }
  }

  return lifecycleSuccess(lifecycle as ValidatedProviderCancellationLifecycle, reasonForState(nextState));
}

function transitionFailure(supervisor: unknown, lifecycle: unknown): ProviderCancellationLifecycleResult {
  const meta = lifecycleMetadata.get(lifecycle as ValidatedProviderCancellationLifecycle);
  const supervisorState = supervisorMetadata.get(supervisor as ValidatedProviderCancellationSupervisor);
  if (meta && supervisorState) {
    if (meta.ownerSupervisor !== supervisor) {
      return lifecycleFailureFromMetadata(meta, "PROVIDER_CANCELLATION_CONTRACT_ERROR");
    }
    if (supervisorState.activeLifecycleByKey.get(meta.activeExecutionKey) !== lifecycle) {
      return lifecycleFailureFromMetadata(meta, "PROVIDER_CANCELLATION_CONTRACT_ERROR");
    }
    meta.state = "CONTRACT_ERROR";
    if (supervisorState.activeLifecycleByKey.get(meta.activeExecutionKey) === lifecycle) {
      supervisorState.activeLifecycleByKey.delete(meta.activeExecutionKey);
      supervisorState.blockedKeys.add(meta.activeExecutionKey);
    }
    return lifecycleFailureFromMetadata(meta, "PROVIDER_CANCELLATION_CONTRACT_ERROR");
  }
  return lifecycleFailure(null, null, null, "PROVIDER_CANCELLATION_CONTRACT_ERROR");
}

function isTransitionAllowed(current: ProviderCancellationState, next: ProviderCancellationState): boolean {
  if (current === "NOT_STARTED") return next === "RUNNING" || next === "FAILED_BEFORE_CALL";
  if (current === "RUNNING") {
    return next === "COMPLETED_SUCCESS" || next === "COMPLETED_FAILURE" || next === "CANCEL_REQUESTED";
  }
  if (current === "CANCEL_REQUESTED") {
    return next === "CANCEL_CONFIRMED" || next === "CANCEL_UNCONFIRMED" || next === "SETTLED_AFTER_CANCEL_REQUEST";
  }
  return false;
}

function canReleaseActiveKey(state: ProviderCancellationState): boolean {
  return state === "COMPLETED_SUCCESS" || state === "COMPLETED_FAILURE" || state === "FAILED_BEFORE_CALL" || state === "CANCEL_CONFIRMED";
}

function isBlockedTerminalState(state: ProviderCancellationState): boolean {
  return state === "CANCEL_UNCONFIRMED" || state === "SETTLED_AFTER_CANCEL_REQUEST" || state === "CONTRACT_ERROR";
}

function isAmbiguousOrContractState(state: ProviderCancellationState): boolean {
  return (
    state === "CANCEL_REQUESTED" ||
    state === "CANCEL_UNCONFIRMED" ||
    state === "SETTLED_AFTER_CANCEL_REQUEST" ||
    state === "CONTRACT_ERROR"
  );
}

function lifecycleSuccess(
  lifecycle: ValidatedProviderCancellationLifecycle,
  reasonCode: ProviderCancellationReasonCode,
): ProviderCancellationLifecycleResult {
  const meta = lifecycleMetadata.get(lifecycle);
  if (!meta) return lifecycleFailure(null, null, null, "PROVIDER_CANCELLATION_CONTRACT_ERROR");
  const failClosedPublicState = isAmbiguousOrContractState(meta.state);
  return Object.freeze({
    valid: true,
    lifecycle,
    requestId: meta.requestId,
    capability: meta.capability,
    providerId: meta.providerId,
    state: meta.state,
    cancellationRequested: meta.cancellationRequested,
    cancellationConfirmed: meta.cancellationConfirmed,
    providerSettled: meta.providerSettled,
    settlementKind: meta.settlementKind,
    retryMayProceed: false,
    jobShouldPause: failClosedPublicState,
    manualReviewRequired: failClosedPublicState && isMedicalSafetyCapability(meta.capability),
    reasonCode,
    ...sideEffectFalseFields(),
  });
}

function lifecycleFailure(
  requestId: string | null,
  capability: ProviderCapability | null,
  providerId: RegisteredProviderId | null,
  reasonCode: ProviderCancellationReasonCode,
): ProviderCancellationFailureResult {
  return Object.freeze({
    valid: false,
    lifecycle: null,
    requestId,
    capability,
    providerId,
    state: "CONTRACT_ERROR",
    cancellationRequested: false,
    cancellationConfirmed: false,
    providerSettled: false,
    settlementKind: null,
    retryMayProceed: false,
    jobShouldPause: true,
    manualReviewRequired: capability ? isMedicalSafetyCapability(capability) : false,
    reasonCode,
    ...sideEffectFalseFields(),
  });
}

function lifecycleFailureFromMetadata(
  meta: LifecycleMetadata,
  reasonCode: ProviderCancellationReasonCode,
): ProviderCancellationFailureResult {
  return Object.freeze({
    valid: false,
    lifecycle: null,
    requestId: meta.requestId,
    capability: meta.capability,
    providerId: meta.providerId,
    state: "CONTRACT_ERROR",
    cancellationRequested: meta.cancellationRequested,
    cancellationConfirmed: false,
    providerSettled: meta.providerSettled,
    settlementKind: meta.settlementKind,
    retryMayProceed: false,
    jobShouldPause: true,
    manualReviewRequired: isMedicalSafetyCapability(meta.capability),
    reasonCode,
    ...sideEffectFalseFields(),
  });
}

function receiptFailure(
  requestId: string | null,
  capability: ProviderCapability | null,
  providerId: RegisteredProviderId | null,
): ProviderCancellationReceiptResult {
  return Object.freeze({
    valid: false,
    receipt: null,
    requestId,
    capability,
    providerId,
    reasonCode: "PROVIDER_CANCELLATION_INVALID_OR_FORGED_RECEIPT",
    ...sideEffectFalseFields(),
    retryMayProceed: false,
  });
}

function retryBoundarySuccess(
  meta: LifecycleMetadata,
  retryMayProceed: boolean,
  reasonCode: ProviderCancellationReasonCode,
): ProviderCancellationRetryBoundaryResult {
  return Object.freeze({
    valid: true,
    executionBoundarySafe: true,
    retryMayProceed,
    requestId: meta.requestId,
    capability: meta.capability,
    providerId: meta.providerId,
    state: meta.state,
    failClosed: false,
    jobShouldPause: false,
    manualReviewRequired: false,
    reasonCode,
    ...sideEffectFalseFields(),
  });
}

function getStaleBoundaryFailure(
  lifecycle: ValidatedProviderCancellationLifecycle,
  meta: LifecycleMetadata,
): ProviderCancellationRetryBoundaryResult | null {
  const supervisorState = supervisorMetadata.get(meta.ownerSupervisor);
  if (!supervisorState) {
    return retryBoundaryFailure(
      meta.requestId,
      meta.capability,
      meta.providerId,
      meta.state,
      "PROVIDER_CANCELLATION_CONTRACT_ERROR",
    );
  }
  if (supervisorState.blockedKeys.has(meta.activeExecutionKey)) {
    return retryBoundaryFailure(
      meta.requestId,
      meta.capability,
      meta.providerId,
      meta.state,
      "PROVIDER_CANCELLATION_CONTRACT_ERROR",
    );
  }
  const activeLifecycle = supervisorState.activeLifecycleByKey.get(meta.activeExecutionKey);
  if (activeLifecycle === lifecycle) {
    return retryBoundaryFailure(
      meta.requestId,
      meta.capability,
      meta.providerId,
      meta.state,
      "PROVIDER_CANCELLATION_CONTRACT_ERROR",
    );
  }
  if (activeLifecycle) {
    return retryBoundaryFailure(
      meta.requestId,
      meta.capability,
      meta.providerId,
      meta.state,
      "PROVIDER_CANCELLATION_RETRY_BLOCKED_BY_ACTIVE_EXECUTION",
    );
  }
  return null;
}

function retryBoundaryFailure(
  requestId: string | null,
  capability: ProviderCapability | null,
  providerId: RegisteredProviderId | null,
  state: ProviderCancellationState | null,
  reasonCode: ProviderCancellationReasonCode,
): ProviderCancellationRetryBoundaryResult {
  return Object.freeze({
    valid: false,
    executionBoundarySafe: false,
    retryMayProceed: false,
    requestId,
    capability,
    providerId,
    state,
    failClosed: true,
    jobShouldPause: true,
    manualReviewRequired: capability ? isMedicalSafetyCapability(capability) : false,
    reasonCode,
    ...sideEffectFalseFields(),
  });
}

function snapshotLifecycleInput(value: unknown):
  | { valid: true; value: ProviderCancellationLifecycleInput }
  | { valid: false } {
  try {
    if (!isPlainObject(value)) return { valid: false };
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key === "symbol")) return { valid: false };
    const allowedKeys = ["requestId", "capability", "providerId"];
    if (keys.length !== allowedKeys.length || keys.some((key) => !allowedKeys.includes(String(key)))) {
      return { valid: false };
    }
    const requestId = readOwnDataProperty(value, "requestId");
    const capability = readOwnDataProperty(value, "capability");
    const providerId = readOwnDataProperty(value, "providerId");
    if (!isSafeInternalId(requestId)) return { valid: false };
    if (!isProviderCapability(capability)) return { valid: false };
    if (typeof providerId !== "string" || !isSafeRegisteredProviderId(providerId)) return { valid: false };
    return { valid: true, value: Object.freeze({ requestId, capability, providerId }) };
  } catch {
    return { valid: false };
  }
}

function readOwnDataProperty(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !("value" in descriptor) || descriptor.get || descriptor.set) {
    throw new Error("invalid descriptor");
  }
  return descriptor.value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isProviderCapability(value: unknown): value is ProviderCapability {
  return typeof value === "string" && (providerCapabilities as readonly string[]).includes(value);
}

function isSafeInternalId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)) return false;
  if (secretLikeInternalIdPattern.test(value)) return false;
  if (value.includes("://") || value.includes("\n") || value.includes("\r")) return false;
  return true;
}

function buildExecutionKey(input: ProviderCancellationLifecycleInput): string {
  return `${input.requestId}\u001f${input.capability}\u001f${input.providerId}`;
}

function reasonForState(state: ProviderCancellationState): ProviderCancellationReasonCode {
  if (state === "RUNNING") return "PROVIDER_CANCELLATION_LIFECYCLE_STARTED";
  if (state === "COMPLETED_SUCCESS") return "PROVIDER_CANCELLATION_PROVIDER_COMPLETED_SUCCESSFULLY";
  if (state === "COMPLETED_FAILURE") return "PROVIDER_CANCELLATION_PROVIDER_COMPLETED_WITH_FAILURE";
  if (state === "FAILED_BEFORE_CALL") return "PROVIDER_CANCELLATION_FAILED_BEFORE_PROVIDER_CALL";
  if (state === "CANCEL_REQUESTED") return "PROVIDER_CANCELLATION_REQUESTED";
  if (state === "CANCEL_CONFIRMED") return "PROVIDER_CANCELLATION_CONFIRMED";
  if (state === "CANCEL_UNCONFIRMED") return "PROVIDER_CANCELLATION_UNCONFIRMED";
  if (state === "SETTLED_AFTER_CANCEL_REQUEST") return "PROVIDER_CANCELLATION_PROVIDER_SETTLED_AFTER_CANCEL_REQUEST";
  return "PROVIDER_CANCELLATION_CONTRACT_ERROR";
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
    providerExecutionStarted: false,
  } as const;
}
