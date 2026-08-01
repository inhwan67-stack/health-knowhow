import {
  buildProviderRegistry,
  selectProviderForCapability,
  validateProviderSelectionForExecution,
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
  execute: (input: ProviderAdapterExecuteRequest) => Promise<ProviderAdapterExecuteResult>;
};

type ProviderExecutionOrchestratorState = {
  registry: ValidatedProviderRegistry;
  bindings: ReadonlyMap<RegisteredProviderId, ProviderExecutionBinding>;
  providerIds: readonly RegisteredProviderId[];
  cancellationSupervisor: ValidatedProviderCancellationSupervisor;
};

export type ProviderExecutionCancellationBoundaryMetadata = {
  lifecycleState: ProviderCancellationState | null;
  retryMayProceed: boolean;
  valid: boolean;
  jobShouldPause: boolean;
  manualReviewRequired: boolean;
  reasonCode: ProviderCancellationReasonCode | null;
};

const orchestratorState = new WeakMap<ValidatedProviderExecutionOrchestrator, ProviderExecutionOrchestratorState>();
const cancellationBoundaryByResult = new WeakMap<
  Extract<ProviderExecutionOrchestrationResult, object>,
  ProviderExecutionCancellationBoundaryMetadata
>();
const cancellationSequenceState = new WeakMap<
  ValidatedProviderExecutionCancellationSequence,
  { orchestrator: ValidatedProviderExecutionOrchestrator }
>();
const pendingCancellationSequenceByOrchestrator = new WeakMap<
  ValidatedProviderExecutionOrchestrator,
  ValidatedProviderExecutionCancellationSequence
>();
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

export function buildProviderExecutionOrchestrator(
  adapters: unknown,
): ProviderExecutionOrchestratorBuildResult {
  if (!Array.isArray(adapters)) return orchestrationFailure("PROVIDER_ORCHESTRATOR_CONFIGURATION_ERROR", false, null);
  const registryResult = buildProviderRegistry(adapters);
  if (!registryResult.valid) return orchestrationFailure("PROVIDER_ORCHESTRATOR_CONFIGURATION_ERROR", false, null);

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

  const executeRequest = buildExecuteRequest(normalizedInput.value, selection);
  const running = markProviderCancellationLifecycleRunning(cancellationSupervisor, lifecycle);
  if (!running.valid) {
    return attachCancellationBoundary(
      orchestrationFailure("PROVIDER_EXECUTION_BINDING_CONFIGURATION_ERROR", isMedicalSafetyCapability(normalizedInput.value.capability), null),
      null,
    );
  }
  let providerResult: ProviderAdapterExecuteResult;
  try {
    providerResult = await binding.execute(executeRequest);
  } catch {
    const completedFailure = markProviderCancellationLifecycleCompletedFailure(cancellationSupervisor, lifecycle);
    if (!completedFailure.valid) {
      return attachCancellationBoundary(providerExecutionPolicyContractFailure(normalizedInput.value, selection), null);
    }
    return attachCancellationBoundary(
      summarizeProviderFailure(normalizedInput.value, selection, "UNKNOWN_PROVIDER_ERROR"),
      buildProviderCancellationRetryBoundaryDecision(lifecycle),
    );
  }

  const successReferenceId = validateProviderSuccessResult(providerResult, selection);
  if (successReferenceId) {
    const completedSuccess = markProviderCancellationLifecycleCompletedSuccess(cancellationSupervisor, lifecycle);
    if (!completedSuccess.valid) {
      return attachCancellationBoundary(providerExecutionPolicyContractFailure(normalizedInput.value, selection), null);
    }
    return attachCancellationBoundary({
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
    }, buildProviderCancellationRetryBoundaryDecision(lifecycle));
  }

  const failureCode = validateProviderFailureResult(providerResult, selection) ?? "INVALID_PROVIDER_RESPONSE";
  const completedFailure = markProviderCancellationLifecycleCompletedFailure(cancellationSupervisor, lifecycle);
  if (!completedFailure.valid) {
    return attachCancellationBoundary(providerExecutionPolicyContractFailure(normalizedInput.value, selection), null);
  }
  return attachCancellationBoundary(
    summarizeProviderFailure(normalizedInput.value, selection, failureCode),
    buildProviderCancellationRetryBoundaryDecision(lifecycle),
  );
}

export function readProviderExecutionCancellationBoundary(
  result: ProviderExecutionOrchestrationResult,
): ProviderExecutionCancellationBoundaryMetadata | null {
  return cancellationBoundaryByResult.get(result as Extract<ProviderExecutionOrchestrationResult, object>) ?? null;
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
