import {
  buildProviderRegistry,
  selectProviderForCapability,
  validateProviderSelectionForExecution,
  type ProviderAdapterExecutionContext,
  type ProviderAdapterExecuteRequest,
  type ProviderAdapterExecuteResult,
  type ProviderSelectionResult,
  type ValidatedProviderRegistry,
  type ValidatedProviderSelection,
} from "./providerGatewayContract";
import {
  buildProviderCancellationRetryBoundaryDecision,
  createProviderCancellationSupervisor,
  markProviderCancellationLifecycleCompletedFailure,
  markProviderCancellationLifecycleCompletedSuccess,
  markProviderCancellationLifecycleFailedBeforeCall,
  markProviderCancellationLifecycleRunning,
  startProviderCancellationLifecycle,
  type ProviderCancellationReasonCode,
  type ProviderCancellationState,
  type ProviderCancellationRetryBoundaryResult,
  type ValidatedProviderCancellationSupervisor,
} from "./providerCancellationSupervisor";
import {
  buildProviderTimeoutSchedulerRuntime,
  cleanupProviderExecutionTimeoutAttempt,
  createProviderExecutionTimeoutCoordinator,
  markProviderExecutionTimeoutProviderSettled,
  readProviderExecutionTimeoutSnapshot,
  startProviderExecutionTimeoutAttempt,
  type ProviderExecutionTimeoutOutcomeKind,
  type ProviderExecutionTimeoutReasonCode,
  type ProviderExecutionTimeoutSnapshot,
  type ProviderTimeoutSchedulerConfig,
  type ValidatedProviderExecutionTimeoutAttempt,
  type ValidatedProviderExecutionTimeoutCoordinator,
  type ValidatedProviderExecutionTimeoutContext,
  type ValidatedProviderTimeoutSchedulerRuntime,
} from "./providerExecutionTimeoutCoordinator";
import {
  buildProviderExecutionDecision,
  providerExecutionDefaults,
  type ProviderExecutionDecision,
} from "./providerExecutionPolicy";
import {
  providerCapabilities,
  providerFailureErrorCodes,
  isMedicalSafetyCapability,
  type ProviderCapability,
  type ProviderFailureErrorCode,
  type RegisteredProviderId,
} from "./providerResiliencePolicy";

declare const validatedProviderExecutionOrchestratorBrand: unique symbol;
declare const validatedProviderExecutionCancellationSequenceBrand: unique symbol;

export type ValidatedProviderExecutionOrchestrator = {
  readonly [validatedProviderExecutionOrchestratorBrand]: true;
};

export type ValidatedProviderExecutionCancellationSequence = {
  readonly [validatedProviderExecutionCancellationSequenceBrand]: true;
};

export type ProviderExecutionCancellationSequenceBuildResult =
  | {
      valid: true;
      sequence: ValidatedProviderExecutionCancellationSequence;
      failClosed: false;
      reasonCode: "PROVIDER_EXECUTION_CANCELLATION_SEQUENCE_VALID";
    }
  | {
      valid: false;
      sequence: null;
      failClosed: true;
      reasonCode: "PROVIDER_EXECUTION_CANCELLATION_SEQUENCE_CONFIGURATION_ERROR";
    };

export type ProviderExecutionOrchestratorBuildResult =
  | {
      valid: true;
      orchestrator: ValidatedProviderExecutionOrchestrator;
      providerCount: number;
      providerIds: readonly RegisteredProviderId[];
      failClosed: false;
      reasonCode: "PROVIDER_ORCHESTRATOR_VALID";
    }
  | ProviderOrchestrationFailure;

export type ProviderExecutionOrchestratorInput = {
  requestId: string;
  capability: ProviderCapability;
  payloadFingerprint: string;
  contentId?: string | null;
  revisionId?: string | null;
  sourceIds?: readonly string[] | null;
  attemptNumber: number;
  maxAttempts?: number | null;
  retryAfterMs?: number | null;
  requestTimeoutMs?: number | null;
};

export type ProviderExecutionOrchestrationResult =
  | ProviderOrchestrationFailure
  | {
      valid: true;
      requestId: string | null;
      capability: ProviderCapability | null;
      selectedProviderId: RegisteredProviderId | null;
      providerSelected: boolean;
      providerExecutionAttempted: boolean;
      providerExecutionSucceeded: boolean;
      providerCallCount: 0 | 1;
      internalOutputReferenceId: string | null;
      executionDecision: ProviderExecutionDecision | null;
      retryExecuted: false;
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
        | "PROVIDER_EXECUTION_SUCCEEDED_PREVIEW"
        | "PROVIDER_ROUTER_SELECTION_FAILED_PREVIEW"
        | "PROVIDER_EXECUTION_FAILED_PREVIEW";
    };

type ProviderOrchestrationFailure = {
  valid: false;
  requestId: null;
  capability: ProviderCapability | null;
  selectedProviderId: RegisteredProviderId | null;
  providerSelected: boolean;
  providerExecutionAttempted: boolean;
  providerExecutionSucceeded: false;
  providerCallCount: 0 | 1;
  internalOutputReferenceId: null;
  executionDecision: ProviderExecutionDecision | null;
  retryExecuted: false;
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
    | "PROVIDER_ORCHESTRATOR_CONFIGURATION_ERROR"
    | "PROVIDER_ORCHESTRATION_REQUEST_VALIDATION_ERROR"
    | "PROVIDER_EXECUTION_BINDING_CONFIGURATION_ERROR"
    | "PROVIDER_EXECUTION_POLICY_CONTRACT_ERROR";
};

type ProviderExecutionBinding = {
  providerId: RegisteredProviderId;
  capabilities: readonly ProviderCapability[];
  execute: (
    input: ProviderAdapterExecuteRequest,
    executionContext: ProviderAdapterExecutionContext,
  ) => Promise<ProviderAdapterExecuteResult>;
};

type ProviderExecutionOrchestratorState = {
  registry: ValidatedProviderRegistry;
  bindings: ReadonlyMap<RegisteredProviderId, ProviderExecutionBinding>;
  providerIds: readonly RegisteredProviderId[];
  cancellationSupervisor: ValidatedProviderCancellationSupervisor;
  timeoutCoordinator: ValidatedProviderExecutionTimeoutCoordinator;
  timeoutSchedulerRuntime: ValidatedProviderTimeoutSchedulerRuntime;
  timeoutSchedulerConfigured: boolean;
  timeoutCallbackRegistrations: Array<() => void>;
};

export type ProviderExecutionCancellationBoundaryMetadata = {
  lifecycleState: ProviderCancellationState | null;
  retryMayProceed: boolean;
  valid: boolean;
  jobShouldPause: boolean;
  manualReviewRequired: boolean;
  reasonCode: ProviderCancellationReasonCode | null;
};

export type ProviderExecutionTimeoutBoundaryMetadata = Readonly<{
  valid: boolean;
  providerMayStart: boolean;
  authoritativeOutcomeKind: ProviderExecutionTimeoutOutcomeKind;
  timeoutObserved: boolean;
  lateSettlementObserved: boolean;
  jobShouldPause: boolean;
  retryMayProceed: false;
  manualReviewRequired: boolean;
  sideEffects: Readonly<{
    databaseWritten: false;
    storageUploaded: false;
    publicationTriggered: false;
    notificationSent: false;
    persistable: false;
    publishable: false;
  }>;
  contractErrorCode: ProviderExecutionTimeoutReasonCode | null;
}>;

export type ProviderExecutionOrchestratorOptions = {
  timeoutScheduler?: ProviderTimeoutSchedulerConfig;
};

const orchestratorState = new WeakMap<ValidatedProviderExecutionOrchestrator, ProviderExecutionOrchestratorState>();
const cancellationBoundaryByResult = new WeakMap<
  Extract<ProviderExecutionOrchestrationResult, object>,
  ProviderExecutionCancellationBoundaryMetadata
>();
const timeoutBoundaryByResult = new WeakMap<
  Extract<ProviderExecutionOrchestrationResult, object>,
  {
    snapshot: ProviderExecutionTimeoutSnapshot | null;
    providerMayStart: boolean;
    coordinator: ValidatedProviderExecutionTimeoutCoordinator | null;
    attempt: ValidatedProviderExecutionTimeoutAttempt | null;
  }
>();
const cancellationSequenceState = new WeakMap<
  ValidatedProviderExecutionCancellationSequence,
  { orchestrator: ValidatedProviderExecutionOrchestrator }
>();
const pendingCancellationSequenceByOrchestrator = new WeakMap<
  ValidatedProviderExecutionOrchestrator,
  ValidatedProviderExecutionCancellationSequence
>();
const timeoutObserverByCallback = new WeakMap<() => void, () => void>();
const safeInternalIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const hex64Pattern = /^[a-f0-9]{64}$/;
const secretLikePattern = /(?:authorization|bearer|token|api[_-]?key|secret|service[_-]?role|sb_secret|sk-[a-z0-9])/i;
const maxSourceIds = 10;
const orchestrationInputKeys = [
  "requestId",
  "capability",
  "payloadFingerprint",
  "contentId",
  "revisionId",
  "sourceIds",
  "attemptNumber",
  "maxAttempts",
  "retryAfterMs",
  "requestTimeoutMs",
] as const;

function buildTimeoutSchedulerConfig(
  scheduler: ProviderTimeoutSchedulerConfig,
  callbackRegistrations: Array<() => void>,
): ProviderTimeoutSchedulerConfig | null {
  const schedule = readOwnDataProperty(scheduler, "schedule");
  const cleanup = readOwnDataProperty(scheduler, "cleanup");
  if (typeof schedule !== "function" || typeof cleanup !== "function") return null;
  return {
    schedule: (delayMs, callback) => {
      const wrappedCallback = () => {
        callback();
        timeoutObserverByCallback.get(wrappedCallback)?.();
      };
      callbackRegistrations.push(wrappedCallback);
      return schedule(delayMs, wrappedCallback);
    },
    cleanup: (handle) => {
      cleanup(handle);
    },
  };
}

export function buildProviderExecutionOrchestrator(
  adapters: unknown,
  options: ProviderExecutionOrchestratorOptions = {},
): ProviderExecutionOrchestratorBuildResult {
  if (!Array.isArray(adapters)) return orchestrationFailure("PROVIDER_ORCHESTRATOR_CONFIGURATION_ERROR", false, null);
  const registryResult = buildProviderRegistry(adapters);
  if (!registryResult.valid) return orchestrationFailure("PROVIDER_ORCHESTRATOR_CONFIGURATION_ERROR", false, null);
  const timeoutSchedulerConfigured = options.timeoutScheduler !== undefined;
  const timeoutCallbackRegistrations: Array<() => void> = [];
  const timeoutSchedulerConfig = options.timeoutScheduler
    ? buildTimeoutSchedulerConfig(options.timeoutScheduler, timeoutCallbackRegistrations)
    : {
        schedule: () => Object.freeze({}),
        cleanup: () => undefined,
      };
  if (!timeoutSchedulerConfig) return orchestrationFailure("PROVIDER_ORCHESTRATOR_CONFIGURATION_ERROR", false, null);
  const timeoutRuntimeResult = buildProviderTimeoutSchedulerRuntime(timeoutSchedulerConfig);
  if (!timeoutRuntimeResult.valid) return orchestrationFailure("PROVIDER_ORCHESTRATOR_CONFIGURATION_ERROR", false, null);
  const timeoutCoordinatorResult = createProviderExecutionTimeoutCoordinator(timeoutRuntimeResult.runtime);
  if (!timeoutCoordinatorResult.valid) return orchestrationFailure("PROVIDER_ORCHESTRATOR_CONFIGURATION_ERROR", false, null);

  const bindings = new Map<RegisteredProviderId, ProviderExecutionBinding>();
  for (const adapter of adapters) {
    if (adapter.enabled && typeof adapter.execute !== "function") {
      return orchestrationFailure("PROVIDER_ORCHESTRATOR_CONFIGURATION_ERROR", false, null);
    }
    if (!adapter.enabled || typeof adapter.execute !== "function") continue;
    const registryProvider = registryResult.registry.providers.find((provider) => provider.providerId === adapter.providerId);
    if (!registryProvider) return orchestrationFailure("PROVIDER_ORCHESTRATOR_CONFIGURATION_ERROR", false, null);
    bindings.set(
      adapter.providerId,
      Object.freeze({
        providerId: adapter.providerId,
        capabilities: Object.freeze([...adapter.capabilities]),
        execute: adapter.execute,
      }),
    );
  }

  const orchestrator = Object.freeze({}) as ValidatedProviderExecutionOrchestrator;
  const providerIds = Object.freeze([...registryResult.providerIds]);
  const cancellationSupervisor = createProviderCancellationSupervisor().supervisor;
  orchestratorState.set(orchestrator, {
    registry: registryResult.registry,
    bindings,
    providerIds,
    cancellationSupervisor,
    timeoutCoordinator: timeoutCoordinatorResult.coordinator,
    timeoutSchedulerRuntime: timeoutRuntimeResult.runtime,
    timeoutSchedulerConfigured,
    timeoutCallbackRegistrations,
  });

  return {
    valid: true,
    orchestrator,
    providerCount: providerIds.length,
    providerIds,
    failClosed: false,
    reasonCode: "PROVIDER_ORCHESTRATOR_VALID",
  };
}

export function createProviderExecutionCancellationSequence(
  orchestrator: ValidatedProviderExecutionOrchestrator,
): ProviderExecutionCancellationSequenceBuildResult {
  const state = orchestratorState.get(orchestrator);
  if (!state || !Object.isFrozen(orchestrator)) {
    return Object.freeze({
      valid: false,
      sequence: null,
      failClosed: true,
      reasonCode: "PROVIDER_EXECUTION_CANCELLATION_SEQUENCE_CONFIGURATION_ERROR",
    });
  }
  const sequence = Object.freeze({}) as ValidatedProviderExecutionCancellationSequence;
  cancellationSequenceState.set(sequence, { orchestrator });
  return {
    valid: true,
    sequence,
    failClosed: false,
    reasonCode: "PROVIDER_EXECUTION_CANCELLATION_SEQUENCE_VALID",
  };
}

export function prepareProviderExecutionCancellationAttempt(
  orchestrator: ValidatedProviderExecutionOrchestrator,
  sequence: ValidatedProviderExecutionCancellationSequence,
): boolean {
  const sequenceState = cancellationSequenceState.get(sequence);
  if (!sequenceState || !Object.isFrozen(sequence)) return false;
  if (!orchestratorState.has(orchestrator) || !Object.isFrozen(orchestrator)) return false;
  if (sequenceState.orchestrator !== orchestrator) return false;
  if (pendingCancellationSequenceByOrchestrator.has(orchestrator)) return false;
  pendingCancellationSequenceByOrchestrator.set(orchestrator, sequence);
  return true;
}

export async function runProviderExecutionAttempt(
  orchestrator: ValidatedProviderExecutionOrchestrator,
  input: unknown,
): Promise<ProviderExecutionOrchestrationResult> {
  const state = orchestratorState.get(orchestrator);
  if (!state || !Object.isFrozen(orchestrator)) {
    return orchestrationFailure("PROVIDER_ORCHESTRATOR_CONFIGURATION_ERROR", false, null);
  }
  const pendingSequence = pendingCancellationSequenceByOrchestrator.get(orchestrator);
  if (pendingSequence) pendingCancellationSequenceByOrchestrator.delete(orchestrator);
  const pendingState = pendingSequence ? cancellationSequenceState.get(pendingSequence) : null;
  if (pendingSequence && (!pendingState || pendingState.orchestrator !== orchestrator)) {
    return orchestrationFailure("PROVIDER_ORCHESTRATOR_CONFIGURATION_ERROR", false, null);
  }
  return runProviderExecutionAttemptWithCancellation(orchestrator, input, state.cancellationSupervisor);
}

async function runProviderExecutionAttemptWithCancellation(
  orchestrator: ValidatedProviderExecutionOrchestrator,
  input: unknown,
  cancellationSupervisor: ValidatedProviderCancellationSupervisor,
): Promise<ProviderExecutionOrchestrationResult> {
  const state = orchestratorState.get(orchestrator);
  if (!state || !Object.isFrozen(orchestrator)) {
    return orchestrationFailure("PROVIDER_ORCHESTRATOR_CONFIGURATION_ERROR", false, null);
  }

  const normalizedInput = validateOrchestrationInput(input);
  if (!normalizedInput.valid) return normalizedInput.failure;

  const selection = selectProviderForCapability(state.registry, normalizedInput.value.capability);
  if (!selection.selected) return summarizeRouterFailure(selection);

  const binding = state.bindings.get(selection.selectedProviderId);
  const lifecycleResult = startProviderCancellationLifecycle(cancellationSupervisor, {
    requestId: normalizedInput.value.requestId,
    capability: normalizedInput.value.capability,
    providerId: selection.selectedProviderId,
  });
  if (!lifecycleResult.valid) {
    return attachCancellationBoundary(
      orchestrationFailure("PROVIDER_EXECUTION_BINDING_CONFIGURATION_ERROR", isMedicalSafetyCapability(normalizedInput.value.capability), null),
      null,
    );
  }
  const lifecycle = lifecycleResult.lifecycle;

  if (!isValidBinding(binding, selection)) {
    const failedBeforeCall = markProviderCancellationLifecycleFailedBeforeCall(cancellationSupervisor, lifecycle);
    const executionDecision = buildConfigurationExecutionDecision(normalizedInput.value, selection);
    if (!failedBeforeCall.valid) {
      return attachCancellationBoundary(
        orchestrationFailure("PROVIDER_EXECUTION_BINDING_CONFIGURATION_ERROR", true, executionDecision),
        null,
      );
    }
    return attachCancellationBoundary(
      orchestrationFailure("PROVIDER_EXECUTION_BINDING_CONFIGURATION_ERROR", true, executionDecision),
      buildProviderCancellationRetryBoundaryDecision(lifecycle),
    );
  }

  if (normalizedInput.value.requestTimeoutMs !== null && !state.timeoutSchedulerConfigured) {
    return attachTimeoutBoundary(
      attachCancellationBoundary(
        orchestrationFailure("PROVIDER_EXECUTION_BINDING_CONFIGURATION_ERROR", isMedicalSafetyCapability(normalizedInput.value.capability), null),
        null,
      ),
      null,
      false,
      state.timeoutCoordinator,
      null,
    );
  }

  const timeoutStart = startProviderExecutionTimeoutAttempt(state.timeoutCoordinator, {
    requestId: normalizedInput.value.requestId,
    capability: normalizedInput.value.capability,
    providerId: selection.selectedProviderId,
    requestTimeoutMs: normalizedInput.value.requestTimeoutMs,
  });
  if (!timeoutStart.valid || !timeoutStart.providerMayStart) {
    return attachTimeoutBoundary(
      attachCancellationBoundary(
        orchestrationFailure("PROVIDER_EXECUTION_BINDING_CONFIGURATION_ERROR", isMedicalSafetyCapability(normalizedInput.value.capability), null),
        null,
      ),
      timeoutStart.snapshot,
      false,
      state.timeoutCoordinator,
      null,
    );
  }
  const timeoutCallback = normalizedInput.value.requestTimeoutMs === null ? null : state.timeoutCallbackRegistrations.pop() ?? null;

  const executeRequest = buildExecuteRequest(normalizedInput.value, selection);
  const running = markProviderCancellationLifecycleRunning(cancellationSupervisor, lifecycle);
  if (!running.valid) {
    const cleanupSnapshot = cleanupProviderExecutionTimeoutAttempt(state.timeoutCoordinator, timeoutStart.attempt);
    return attachTimeoutBoundary(
      attachCancellationBoundary(
        orchestrationFailure("PROVIDER_EXECUTION_BINDING_CONFIGURATION_ERROR", isMedicalSafetyCapability(normalizedInput.value.capability), null),
        null,
      ),
      cleanupSnapshot,
      true,
      state.timeoutCoordinator,
      timeoutStart.attempt,
    );
  }

  const observed = observeProviderExecution(
    state,
    binding,
    executeRequest,
    timeoutStart.executionContext,
    timeoutStart.attempt,
    timeoutCallback,
  );
  const providerObservation = await observed.first;
  if (providerObservation.kind === "timeout") {
    return attachTimeoutBoundary(
      attachCancellationBoundary(
        timeoutFailClosedResult(normalizedInput.value, selection, providerObservation.snapshot, providerObservation.providerExecutionStarted),
        null,
      ),
      providerObservation.snapshot,
      true,
      state.timeoutCoordinator,
      timeoutStart.attempt,
    );
  }

  if (providerObservation.kind === "rejected") {
    const failureSnapshot = providerObservation.settlementSnapshot;
    if (isTimeoutContractFailure(failureSnapshot)) {
      return attachTimeoutBoundary(
        attachCancellationBoundary(providerExecutionPolicyContractFailure(normalizedInput.value, selection), null),
        failureSnapshot,
        true,
        state.timeoutCoordinator,
        timeoutStart.attempt,
      );
    }
    const completedFailure = markProviderCancellationLifecycleCompletedFailure(cancellationSupervisor, lifecycle);
    if (!completedFailure.valid) {
      return attachTimeoutBoundary(
        attachCancellationBoundary(providerExecutionPolicyContractFailure(normalizedInput.value, selection), null),
        failureSnapshot,
        true,
        state.timeoutCoordinator,
        timeoutStart.attempt,
      );
    }
    return attachTimeoutBoundary(
      attachCancellationBoundary(
        summarizeProviderFailure(normalizedInput.value, selection, "UNKNOWN_PROVIDER_ERROR"),
        buildProviderCancellationRetryBoundaryDecision(lifecycle),
      ),
      failureSnapshot,
      true,
      state.timeoutCoordinator,
      timeoutStart.attempt,
    );
  }

  const providerResult = providerObservation.result;

  const successReferenceId = validateProviderSuccessResult(providerResult, selection);
  if (successReferenceId) {
    const successSnapshot = providerObservation.settlementSnapshot;
    if (isTimeoutContractFailure(successSnapshot) || successSnapshot.settlementSlotState !== "PROVIDER_SETTLED_FIRST") {
      return attachTimeoutBoundary(
        attachCancellationBoundary(timeoutFailClosedResult(normalizedInput.value, selection, successSnapshot, true), null),
        successSnapshot,
        true,
        state.timeoutCoordinator,
        timeoutStart.attempt,
      );
    }
    const completedSuccess = markProviderCancellationLifecycleCompletedSuccess(cancellationSupervisor, lifecycle);
    if (!completedSuccess.valid) {
      return attachTimeoutBoundary(
        attachCancellationBoundary(providerExecutionPolicyContractFailure(normalizedInput.value, selection), null),
        successSnapshot,
        true,
        state.timeoutCoordinator,
        timeoutStart.attempt,
      );
    }
    return attachTimeoutBoundary(attachCancellationBoundary({
      valid: true,
      requestId: normalizedInput.value.requestId,
      capability: normalizedInput.value.capability,
      selectedProviderId: selection.selectedProviderId,
      providerSelected: true,
      providerExecutionAttempted: true,
      providerExecutionSucceeded: true,
      providerCallCount: 1,
      internalOutputReferenceId: successReferenceId,
      executionDecision: null,
      retryExecuted: false,
      fallbackExecuted: false,
      databaseWritten: false,
      storageUploaded: false,
      publicationTriggered: false,
      notificationSent: false,
      persistable: false,
      publishable: false,
      medicalVerificationCompleted: false,
      finalApprovalGranted: false,
      failClosed: false,
      jobShouldPause: false,
      manualReviewRequired: false,
      reasonCode: "PROVIDER_EXECUTION_SUCCEEDED_PREVIEW",
    }, buildProviderCancellationRetryBoundaryDecision(lifecycle)), successSnapshot, true, state.timeoutCoordinator, timeoutStart.attempt);
  }

  const failureCode = validateProviderFailureResult(providerResult, selection) ?? "INVALID_PROVIDER_RESPONSE";
  const failureSnapshot = providerObservation.settlementSnapshot;
  if (isTimeoutContractFailure(failureSnapshot) || failureSnapshot.settlementSlotState !== "PROVIDER_SETTLED_FIRST") {
    return attachTimeoutBoundary(
      attachCancellationBoundary(timeoutFailClosedResult(normalizedInput.value, selection, failureSnapshot, true), null),
      failureSnapshot,
      true,
      state.timeoutCoordinator,
      timeoutStart.attempt,
    );
  }
  const completedFailure = markProviderCancellationLifecycleCompletedFailure(cancellationSupervisor, lifecycle);
  if (!completedFailure.valid) {
    return attachTimeoutBoundary(
      attachCancellationBoundary(providerExecutionPolicyContractFailure(normalizedInput.value, selection), null),
      failureSnapshot,
      true,
      state.timeoutCoordinator,
      timeoutStart.attempt,
    );
  }
  return attachTimeoutBoundary(
    attachCancellationBoundary(
      summarizeProviderFailure(normalizedInput.value, selection, failureCode),
      buildProviderCancellationRetryBoundaryDecision(lifecycle),
    ),
    failureSnapshot,
    true,
    state.timeoutCoordinator,
    timeoutStart.attempt,
  );
}

export function readProviderExecutionCancellationBoundary(
  result: ProviderExecutionOrchestrationResult,
): ProviderExecutionCancellationBoundaryMetadata | null {
  return cancellationBoundaryByResult.get(result as Extract<ProviderExecutionOrchestrationResult, object>) ?? null;
}

export function readProviderExecutionTimeoutBoundary(
  result: ProviderExecutionOrchestrationResult,
): ProviderExecutionTimeoutBoundaryMetadata | null {
  const boundary = timeoutBoundaryByResult.get(result as Extract<ProviderExecutionOrchestrationResult, object>);
  if (!boundary) return null;
  const snapshot =
    boundary.coordinator && boundary.attempt
      ? readProviderExecutionTimeoutSnapshot(boundary.coordinator, boundary.attempt)
      : boundary.snapshot;
  return buildTimeoutBoundaryMetadata(result, snapshot, boundary.providerMayStart);
}

function buildExecuteRequest(
  input: NormalizedProviderExecutionInput,
  selection: ValidatedProviderSelection,
): ProviderAdapterExecuteRequest {
  return {
    requestId: input.requestId,
    capability: input.capability,
    providerId: selection.selectedProviderId,
    payloadFingerprint: input.payloadFingerprint,
    ...(input.contentId ? { contentId: input.contentId } : {}),
    ...(input.revisionId ? { revisionId: input.revisionId } : {}),
    ...(input.sourceIds ? { sourceIds: Object.freeze([...input.sourceIds]) } : {}),
  };
}

type ProviderExecutionObservation =
  | { kind: "resolved"; result: ProviderAdapterExecuteResult; settlementSnapshot: ProviderExecutionTimeoutSnapshot }
  | { kind: "rejected"; settlementSnapshot: ProviderExecutionTimeoutSnapshot }
  | { kind: "timeout"; snapshot: ProviderExecutionTimeoutSnapshot; providerExecutionStarted: boolean };

function observeProviderExecution(
  state: ProviderExecutionOrchestratorState,
  binding: ProviderExecutionBinding,
  request: ProviderAdapterExecuteRequest,
  executionContext: ValidatedProviderExecutionTimeoutContext,
  attempt: ValidatedProviderExecutionTimeoutAttempt,
  timeoutCallback: (() => void) | null,
): { first: Promise<ProviderExecutionObservation> } {
  let completed = false;
  let providerExecutionStarted = false;
  let resolveFirst: (observation: ProviderExecutionObservation) => void = () => undefined;
  const first = new Promise<ProviderExecutionObservation>((resolve) => {
    resolveFirst = resolve;
  });
  const complete = (observation: ProviderExecutionObservation) => {
    if (completed) return;
    completed = true;
    if (timeoutCallback) timeoutObserverByCallback.delete(timeoutCallback);
    resolveFirst(observation);
  };
  const timeoutObserver = () => {
    const snapshot = readProviderExecutionTimeoutSnapshot(state.timeoutCoordinator, attempt);
    complete({ kind: "timeout", snapshot, providerExecutionStarted });
  };
  if (timeoutCallback) timeoutObserverByCallback.set(timeoutCallback, timeoutObserver);

  try {
    providerExecutionStarted = true;
    const providerPromise = binding.execute(request, Object.freeze({ signal: executionContext.signal }));
    providerPromise.then(
      (result) => {
        const settlementSnapshot = markProviderExecutionTimeoutProviderSettled(
          state.timeoutCoordinator,
          attempt,
          isProviderSuccessLike(result) ? "SUCCESS" : "FAILURE",
        );
        if (completed) {
          return;
        }
        complete({ kind: "resolved", result, settlementSnapshot });
      },
      () => {
        const settlementSnapshot = markProviderExecutionTimeoutProviderSettled(state.timeoutCoordinator, attempt, "FAILURE");
        if (completed) {
          return;
        }
        complete({ kind: "rejected", settlementSnapshot });
      },
    );
  } catch {
    const settlementSnapshot = markProviderExecutionTimeoutProviderSettled(state.timeoutCoordinator, attempt, "FAILURE");
    complete({ kind: "rejected", settlementSnapshot });
  }

  return { first };
}

function attachTimeoutBoundary(
  result: ProviderExecutionOrchestrationResult,
  snapshot: ProviderExecutionTimeoutSnapshot | null,
  providerMayStart: boolean,
  coordinator: ValidatedProviderExecutionTimeoutCoordinator | null,
  attempt: ValidatedProviderExecutionTimeoutAttempt | null,
): ProviderExecutionOrchestrationResult {
  timeoutBoundaryByResult.set(
    result as Extract<ProviderExecutionOrchestrationResult, object>,
    Object.freeze({ snapshot, providerMayStart, coordinator, attempt }),
  );
  return result;
}

function buildTimeoutBoundaryMetadata(
  result: ProviderExecutionOrchestrationResult,
  snapshot: ProviderExecutionTimeoutSnapshot | null,
  providerMayStart: boolean,
): ProviderExecutionTimeoutBoundaryMetadata {
  return Object.freeze({
    valid: snapshot?.valid ?? false,
    providerMayStart,
    authoritativeOutcomeKind: snapshot?.authoritativeOutcomeKind ?? "COORDINATOR_CONTRACT_ERROR",
    timeoutObserved: snapshot?.timeoutFired ?? false,
    lateSettlementObserved: snapshot?.lateSettlementObserved ?? false,
    jobShouldPause: snapshot?.jobShouldPause ?? true,
    retryMayProceed: false,
    manualReviewRequired: snapshot?.manualReviewRequired ?? result.manualReviewRequired,
    sideEffects: Object.freeze({
      databaseWritten: false,
      storageUploaded: false,
      publicationTriggered: false,
      notificationSent: false,
      persistable: false,
      publishable: false,
    }),
    contractErrorCode: snapshot?.valid === false ? snapshot.reasonCode : null,
  });
}

function timeoutFailClosedResult(
  input: NormalizedProviderExecutionInput,
  selection: ValidatedProviderSelection,
  snapshot: ProviderExecutionTimeoutSnapshot,
  providerExecutionStarted: boolean,
): ProviderExecutionOrchestrationResult {
  return {
    valid: false,
    requestId: null,
    capability: input.capability,
    selectedProviderId: selection.selectedProviderId,
    providerSelected: true,
    providerExecutionAttempted: providerExecutionStarted,
    providerExecutionSucceeded: false,
    providerCallCount: providerExecutionStarted ? 1 : 0,
    internalOutputReferenceId: null,
    executionDecision: null,
    retryExecuted: false,
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
    manualReviewRequired: isMedicalSafetyCapability(input.capability),
    reasonCode: "PROVIDER_EXECUTION_POLICY_CONTRACT_ERROR",
  };
}

function isTimeoutContractFailure(snapshot: ProviderExecutionTimeoutSnapshot): boolean {
  return snapshot.valid === false || snapshot.settlementSlotState === "CONTRACT_ERROR";
}

function attachCancellationBoundary(
  result: ProviderExecutionOrchestrationResult,
  boundary: ProviderCancellationRetryBoundaryResult | null,
): ProviderExecutionOrchestrationResult {
  cancellationBoundaryByResult.set(
    result as Extract<ProviderExecutionOrchestrationResult, object>,
    Object.freeze({
      lifecycleState: boundary?.state ?? null,
      retryMayProceed: boundary?.retryMayProceed ?? false,
      valid: boundary?.valid ?? false,
      jobShouldPause: boundary?.jobShouldPause ?? true,
      manualReviewRequired: boundary?.manualReviewRequired ?? result.manualReviewRequired,
      reasonCode: boundary?.reasonCode ?? "PROVIDER_CANCELLATION_CONTRACT_ERROR",
    }),
  );
  return result;
}

function summarizeRouterFailure(selection: Extract<ProviderSelectionResult, { selected: false }>): ProviderExecutionOrchestrationResult {
  return {
    valid: true,
    requestId: null,
    capability: selection.capability,
    selectedProviderId: null,
    providerSelected: false,
    providerExecutionAttempted: false,
    providerExecutionSucceeded: false,
    providerCallCount: 0,
    internalOutputReferenceId: null,
    executionDecision: null,
    retryExecuted: false,
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
    jobShouldPause: selection.jobShouldPause,
    manualReviewRequired: selection.manualReviewRequired,
    reasonCode: "PROVIDER_ROUTER_SELECTION_FAILED_PREVIEW",
  };
}

function summarizeProviderFailure(
  input: NormalizedProviderExecutionInput,
  selection: ValidatedProviderSelection,
  errorCode: ProviderFailureErrorCode,
): ProviderExecutionOrchestrationResult {
  const executionDecision = buildProviderExecutionDecision({
    requestId: input.requestId,
    capability: input.capability,
    providerId: selection.selectedProviderId,
    errorCode,
    httpStatus: null,
    attemptNumber: input.attemptNumber,
    maxAttempts: input.maxAttempts,
    retryAfterMs: input.retryAfterMs,
    requestTimeoutMs: input.requestTimeoutMs,
    selection,
    executionStarted: true,
  });
  if (!executionDecision.valid) {
    return providerExecutionPolicyContractFailure(input, selection);
  }
  return {
    valid: true,
    requestId: input.requestId,
    capability: input.capability,
    selectedProviderId: selection.selectedProviderId,
    providerSelected: true,
    providerExecutionAttempted: true,
    providerExecutionSucceeded: false,
    providerCallCount: 1,
    internalOutputReferenceId: null,
    executionDecision,
    retryExecuted: false,
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
    jobShouldPause: executionDecision.jobShouldPause,
    manualReviewRequired: executionDecision.manualReviewRequired,
    reasonCode: "PROVIDER_EXECUTION_FAILED_PREVIEW",
  };
}

function providerExecutionPolicyContractFailure(
  input: NormalizedProviderExecutionInput,
  selection: ValidatedProviderSelection,
): ProviderExecutionOrchestrationResult {
  return {
    valid: false,
    requestId: null,
    capability: input.capability,
    selectedProviderId: selection.selectedProviderId,
    providerSelected: true,
    providerExecutionAttempted: true,
    providerExecutionSucceeded: false,
    providerCallCount: 1,
    internalOutputReferenceId: null,
    executionDecision: null,
    retryExecuted: false,
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
    manualReviewRequired: isMedicalSafetyCapability(input.capability),
    reasonCode: "PROVIDER_EXECUTION_POLICY_CONTRACT_ERROR",
  };
}

function buildConfigurationExecutionDecision(
  input: NormalizedProviderExecutionInput,
  selection: ValidatedProviderSelection,
): ProviderExecutionDecision {
  return buildProviderExecutionDecision({
    requestId: input.requestId,
    capability: input.capability,
    providerId: selection.selectedProviderId,
    errorCode: "CONFIGURATION_ERROR",
    httpStatus: null,
    attemptNumber: input.attemptNumber,
    maxAttempts: input.maxAttempts,
    retryAfterMs: input.retryAfterMs,
    requestTimeoutMs: input.requestTimeoutMs,
    selection,
    executionStarted: false,
  });
}

function validateProviderSuccessResult(
  value: unknown,
  selection: ValidatedProviderSelection,
): string | null {
  if (!isObjectRecord(value)) return null;
  if (!hasExactKeys(value, ["success", "providerId", "capability", "internalOutputReferenceId"])) return null;
  if (!selection.capability) return null;
  if (value.success !== true) return null;
  if (value.providerId !== selection.selectedProviderId) return null;
  if (value.capability !== selection.capability) return null;
  if (typeof value.internalOutputReferenceId !== "string") return null;
  if (!isSafeInternalId(value.internalOutputReferenceId)) return null;
  return value.internalOutputReferenceId;
}

function isProviderSuccessLike(value: unknown): boolean {
  return isObjectRecord(value) && readOwnDataProperty(value, "success") === true;
}

function validateProviderFailureResult(
  value: unknown,
  selection: ValidatedProviderSelection,
): ProviderFailureErrorCode | null {
  if (!isObjectRecord(value)) return null;
  if (!hasExactKeys(value, ["success", "providerId", "capability", "failureCode"])) return null;
  if (!selection.capability) return null;
  if (value.success !== false) return null;
  if (value.providerId !== selection.selectedProviderId) return null;
  if (value.capability !== selection.capability) return null;
  if (!isProviderFailureErrorCode(value.failureCode)) return null;
  return value.failureCode;
}

function isValidBinding(
  binding: ProviderExecutionBinding | undefined,
  selection: ValidatedProviderSelection,
): binding is ProviderExecutionBinding {
  if (!selection.capability) return false;
  return (
    !!binding &&
    binding.providerId === selection.selectedProviderId &&
    binding.capabilities.includes(selection.capability) &&
    typeof binding.execute === "function" &&
    validateProviderSelectionForExecution(selection, selection.capability, selection.selectedProviderId)
  );
}

type NormalizedProviderExecutionInput = {
  requestId: string;
  capability: ProviderCapability;
  payloadFingerprint: string;
  contentId: string | null;
  revisionId: string | null;
  sourceIds: readonly string[] | null;
  attemptNumber: number;
  maxAttempts: number;
  retryAfterMs: number | null;
  requestTimeoutMs: number | null;
};

type InputValidationResult =
  | { valid: true; value: NormalizedProviderExecutionInput }
  | { valid: false; failure: ProviderOrchestrationFailure };

function validateOrchestrationInput(input: unknown): InputValidationResult {
  if (!isObjectRecord(input)) return inputValidationFailure();
  if (!hasOnlyAllowedKeys(input, orchestrationInputKeys)) return inputValidationFailure();
  const requestId = input.requestId;
  const capability = input.capability;
  const payloadFingerprint = input.payloadFingerprint;
  const contentId = input.contentId ?? null;
  const revisionId = input.revisionId ?? null;
  const attemptNumber = input.attemptNumber;
  const retryAfterMs = input.retryAfterMs ?? null;
  const requestTimeoutMs = input.requestTimeoutMs ?? null;
  if (!isSafeInternalId(requestId)) return inputValidationFailure();
  if (!isProviderCapability(capability)) return inputValidationFailure();
  if (typeof payloadFingerprint !== "string" || !hex64Pattern.test(payloadFingerprint)) return inputValidationFailure();
  if (!isOptionalSafeId(contentId)) return inputValidationFailure();
  if (!isOptionalSafeId(revisionId)) return inputValidationFailure();
  const sourceIds = input.sourceIds ?? null;
  if (!isValidSourceIds(sourceIds)) return inputValidationFailure();
  if (!isSafePositiveInteger(attemptNumber)) return inputValidationFailure();
  const effectiveMaxAttempts = input.maxAttempts ?? providerExecutionDefaults.maxAttempts;
  if (!isValidMaxAttempts(effectiveMaxAttempts)) return inputValidationFailure();
  if (attemptNumber > effectiveMaxAttempts) return inputValidationFailure();
  if (!isValidOptionalRetryAfterMs(retryAfterMs)) return inputValidationFailure();
  if (!isValidOptionalRequestTimeoutMs(requestTimeoutMs)) return inputValidationFailure();
  return {
    valid: true,
    value: {
      requestId,
      capability,
      payloadFingerprint,
      contentId,
      revisionId,
      sourceIds: sourceIds === null ? null : Object.freeze([...sourceIds]),
      attemptNumber,
      maxAttempts: effectiveMaxAttempts,
      retryAfterMs,
      requestTimeoutMs,
    },
  };
}

function inputValidationFailure(): InputValidationResult {
  return { valid: false, failure: orchestrationFailure("PROVIDER_ORCHESTRATION_REQUEST_VALIDATION_ERROR", false, null) };
}

function orchestrationFailure(
  reasonCode: ProviderOrchestrationFailure["reasonCode"],
  manualReviewRequired: boolean,
  executionDecision: ProviderExecutionDecision | null,
): ProviderOrchestrationFailure {
  return {
    valid: false,
    requestId: null,
    capability: null,
    selectedProviderId: null,
    providerSelected: false,
    providerExecutionAttempted: false,
    providerExecutionSucceeded: false,
    providerCallCount: 0,
    internalOutputReferenceId: null,
    executionDecision,
    retryExecuted: false,
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
    manualReviewRequired,
    reasonCode,
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOwnDataProperty(value: object, key: PropertyKey): unknown {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) return undefined;
    return descriptor.value;
  } catch {
    return undefined;
  }
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

function isSafePositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
}

function isValidMaxAttempts(value: unknown): value is number {
  return isSafePositiveInteger(value) && value <= 10;
}

function isValidOptionalRetryAfterMs(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isSafeInteger(value) && value >= 0);
}

function isValidOptionalRequestTimeoutMs(value: unknown): value is number | null {
  return value === null || (isSafePositiveInteger(value) && value <= 120_000);
}

function isValidSourceIds(value: unknown): value is readonly string[] | null {
  if (value === null) return true;
  if (!Array.isArray(value)) return false;
  if (value.length > maxSourceIds) return false;
  if (!value.every(isSafeInternalId)) return false;
  return new Set(value).size === value.length;
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
