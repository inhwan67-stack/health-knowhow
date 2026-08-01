import { describe, expect, it, vi } from "vitest";

import {
  buildProviderExecutionOrchestrator,
  type ProviderExecutionOrchestrationResult,
} from "./providerExecutionOrchestrator";
import type {
  ProviderAdapterContract,
  ProviderAdapterExecuteRequest,
  ProviderAdapterExecuteResult,
} from "./providerGatewayContract";
import {
  buildProviderRetryRuntime,
  runProviderRetrySequence,
  type ProviderRetrySequenceInput,
  type ValidatedProviderRetryRuntime,
} from "./providerRetryExecutionRunner";

const fingerprint = "a".repeat(64);

function adapter(
  execute: ProviderAdapterContract["execute"] = vi.fn(async (request: ProviderAdapterExecuteRequest) => ({
    success: true,
    providerId: request.providerId,
    capability: request.capability,
    internalOutputReferenceId: "provider-output-1",
  })),
): ProviderAdapterContract {
  return {
    providerId: "cdc-safe-fetch",
    capabilities: ["medical_source_fetch"],
    priority: 10,
    trustTier: "medical_authoritative",
    enabled: true,
    execute,
  };
}

function orchestrator(execute?: ProviderAdapterContract["execute"]) {
  const result = buildProviderExecutionOrchestrator([adapter(execute)]);
  if (!result.valid) throw new Error("Expected valid orchestrator");
  return result.orchestrator;
}

function runtime(sleep = vi.fn(async () => undefined)) {
  const result = buildProviderRetryRuntime({ sleep });
  if (!result.valid) throw new Error("Expected valid runtime");
  return { runtime: result.runtime, sleep };
}

function input(overrides: Partial<ProviderRetrySequenceInput> = {}): ProviderRetrySequenceInput {
  return {
    requestId: "retry-request-1",
    capability: "medical_source_fetch",
    payloadFingerprint: fingerprint,
    contentId: "819852773404",
    revisionId: "13",
    sourceIds: ["2", "3", "4"],
    maxAttempts: 3,
    requestTimeoutMs: 15_000,
    ...overrides,
  };
}

function failure(failureCode: string): ProviderAdapterExecuteResult {
  return {
    success: false,
    providerId: "cdc-safe-fetch",
    capability: "medical_source_fetch",
    failureCode: failureCode as ProviderAdapterExecuteResult extends { failureCode: infer Code } ? Code : never,
  } as ProviderAdapterExecuteResult;
}

function retryBoundaryAllowed() {
  return Object.freeze({
    lifecycleState: "COMPLETED_FAILURE",
    retryMayProceed: true,
    valid: true,
    jobShouldPause: false,
    manualReviewRequired: false,
    reasonCode: "PROVIDER_CANCELLATION_RETRY_BOUNDARY_SAFE",
  });
}

function completedSuccessBoundary() {
  return Object.freeze({
    lifecycleState: "COMPLETED_SUCCESS",
    retryMayProceed: false,
    valid: true,
    jobShouldPause: false,
    manualReviewRequired: false,
    reasonCode: "PROVIDER_CANCELLATION_SEQUENCE_ALREADY_SUCCEEDED",
  });
}

function mockedCancellationSequenceFunctions() {
  return {
    createProviderExecutionCancellationSequence: vi.fn(() => ({
      valid: true,
      sequence: Object.freeze({}),
      failClosed: false,
      reasonCode: "PROVIDER_EXECUTION_CANCELLATION_SEQUENCE_VALID",
    })),
    prepareProviderExecutionCancellationAttempt: vi.fn(() => true),
  };
}

function baseDecision(overrides: Record<string, unknown> = {}) {
  return {
    valid: true,
    requestId: "retry-request-1",
    capability: "medical_source_fetch",
    providerId: "cdc-safe-fetch",
    errorCode: "RATE_LIMITED",
    httpStatus: null,
    attemptNumber: 1,
    maxAttempts: 3,
    retryable: true,
    attemptsExhausted: false,
    retryScheduled: true,
    nextRetryDelayMs: 1000,
    fallbackRequired: false,
    fallbackExecutionStarted: false,
    manualReviewRequired: true,
    adminAlertRequired: false,
    terminal: false,
    failClosed: true,
    jobShouldPause: true,
    persistable: false,
    publishable: false,
    executionStarted: false,
    action: "RETRY_WAIT",
    reasonCode: "PROVIDER_EXECUTION_RETRY_WAIT",
    ...overrides,
  };
}

function baseAttempt(overrides: Record<string, unknown> = {}): ProviderExecutionOrchestrationResult {
  return {
    valid: true,
    requestId: "retry-request-1",
    capability: "medical_source_fetch",
    selectedProviderId: "cdc-safe-fetch",
    providerSelected: true,
    providerExecutionAttempted: true,
    providerExecutionSucceeded: false,
    providerCallCount: 1,
    internalOutputReferenceId: null,
    executionDecision: baseDecision(),
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
    manualReviewRequired: true,
    reasonCode: "PROVIDER_EXECUTION_FAILED_PREVIEW",
    ...overrides,
  } as ProviderExecutionOrchestrationResult;
}

describe("provider retry execution runner", () => {
  it("builds only opaque frozen retry runtimes and does not expose sleep", () => {
    const sleep = vi.fn(async () => undefined);
    const config = { sleep };
    const result = buildProviderRetryRuntime(config);
    expect(result).toMatchObject({ valid: true, reasonCode: "PROVIDER_RETRY_RUNTIME_VALID" });
    if (result.valid) {
      expect(Object.isFrozen(result.runtime)).toBe(true);
      expect(JSON.stringify(result.runtime)).toBe("{}");
    }
    config.sleep = vi.fn();
    expect(Object.isFrozen(config)).toBe(false);
  });

  it("stores runtime sleep from the own data descriptor snapshot instead of a Proxy get trap", async () => {
    const descriptorSleep = vi.fn(async () => undefined);
    const getTrapSleep = vi.fn(async () => undefined);
    const config = new Proxy(
      { sleep: descriptorSleep },
      {
        get(target, property, receiver) {
          if (property === "sleep") return getTrapSleep;
          return Reflect.get(target, property, receiver);
        },
      },
    );
    const retryRuntimeResult = buildProviderRetryRuntime(config);
    if (!retryRuntimeResult.valid) throw new Error("Expected valid runtime");
    const execute = vi
      .fn()
      .mockResolvedValueOnce(failure("RATE_LIMITED"))
      .mockImplementationOnce(async (request: ProviderAdapterExecuteRequest): Promise<ProviderAdapterExecuteResult> => ({
        success: true,
        providerId: request.providerId,
        capability: request.capability,
        internalOutputReferenceId: "provider-output-2",
      }));
    const result = await runProviderRetrySequence(orchestrator(execute), retryRuntimeResult.runtime, input());
    expect(result).toMatchObject({ valid: true, sequenceSucceeded: true, retryExecutedCount: 1 });
    expect(descriptorSleep).toHaveBeenCalledExactlyOnceWith(1000);
    expect(getTrapSleep).not.toHaveBeenCalled();
  });

  it("rejects direct, cloned, JSON-restored, null, primitive, and array runtimes", async () => {
    const { runtime: validRuntime } = runtime();
    for (const badRuntime of [{}, { ...validRuntime }, JSON.parse("{}"), null, undefined, "x", 1, []]) {
      const result = await runProviderRetrySequence(orchestrator(), badRuntime as ValidatedProviderRetryRuntime, input());
      expect(result).toMatchObject({
        valid: false,
        providerCallCount: 0,
        retryExecutedCount: 0,
        reasonCode: "PROVIDER_RETRY_RUNTIME_CONFIGURATION_ERROR",
      });
    }
  });

  it("rejects invalid runtime config without freezing or mutating it", () => {
    for (const badConfig of [null, undefined, "bad", 1, true, [], {}, { sleep: "bad" }, { sleep: undefined }]) {
      expect(buildProviderRetryRuntime(badConfig)).toMatchObject({
        valid: false,
        reasonCode: "PROVIDER_RETRY_RUNTIME_CONFIGURATION_ERROR",
      });
    }
    const symbolConfig = { sleep: vi.fn(), [Symbol("extra")]: "secret" };
    const nonEnumerableConfig = { sleep: vi.fn() };
    Object.defineProperty(nonEnumerableConfig, "token", { value: "secret", enumerable: false });
    const getterConfig = {};
    Object.defineProperty(getterConfig, "sleep", { get: () => vi.fn(), enumerable: true });
    for (const badConfig of [symbolConfig, nonEnumerableConfig, getterConfig]) {
      expect(buildProviderRetryRuntime(badConfig)).toMatchObject({
        valid: false,
        reasonCode: "PROVIDER_RETRY_RUNTIME_CONFIGURATION_ERROR",
      });
    }
    expect(Object.isFrozen(symbolConfig)).toBe(false);
  });

  it("rejects malformed sequence input and forbidden fields before provider or sleep", async () => {
    const execute = vi.fn();
    const { runtime: retryRuntime, sleep } = runtime();
    for (const badInput of [
      null,
      undefined,
      "bad",
      1,
      true,
      [],
      input({ payloadFingerprint: "bad" }),
      input({ maxAttempts: 0 }),
      input({ maxAttempts: 11 }),
      { ...input(), attemptNumber: 1 },
      { ...input(), retryAfterMs: 1000 },
      { ...input(), providerId: "cdc-safe-fetch" },
      { ...input(), selection: {} },
      { ...input(), trustTier: "medical_authoritative" },
      { ...input(), token: "secret" },
      { ...input(), apiKey: "secret" },
      { ...input(), Authorization: "Bearer secret" },
      { ...input(), rawMedicalText: "raw" },
      { ...input(), prompt: "raw" },
      { ...input(), HTML: "<html>" },
      { ...input(), sleep: vi.fn() },
      { ...input(), fallbackProviderId: "other" },
      { ...input(), sourceIds: Array(1) },
      { ...input(), sourceIds: [, "2"] },
      { ...input(), sourceIds: ["2", "2"] },
      { ...input(), sourceIds: Array.from({ length: 11 }, (_, index) => String(index + 1)) },
    ]) {
      const result = await runProviderRetrySequence(orchestrator(execute), retryRuntime, badInput);
      expect(result).toMatchObject({
        valid: false,
        providerCallCount: 0,
        retryExecutedCount: 0,
        retryExecuted: false,
        fallbackExecuted: false,
        databaseWritten: false,
        storageUploaded: false,
        publicationTriggered: false,
        notificationSent: false,
        persistable: false,
        publishable: false,
        reasonCode: "PROVIDER_RETRY_SEQUENCE_REQUEST_VALIDATION_ERROR",
      });
      expect(JSON.stringify(result).toLowerCase()).not.toMatch(/secret|bearer|raw|<html>/);
    }
    const symbolInput = { ...input(), [Symbol("token")]: "secret" };
    const nonEnumerableInput = { ...input() };
    Object.defineProperty(nonEnumerableInput, "token", { value: "secret", enumerable: false });
    const inheritedRequestInput = Object.create({ requestId: "retry-request-1" });
    Object.assign(inheritedRequestInput, { ...input(), requestId: undefined });
    delete inheritedRequestInput.requestId;
    const getterRequiredInput = { ...input() };
    Object.defineProperty(getterRequiredInput, "requestId", { get: () => "retry-request-1", enumerable: true });
    const getterOptionalInput = { ...input() };
    Object.defineProperty(getterOptionalInput, "maxAttempts", { get: () => 3, enumerable: true });
    const getterSourceIds = ["2"];
    Object.defineProperty(getterSourceIds, "0", { get: () => "2", enumerable: true });
    const syntheticRequestProxy = new Proxy(
      { capability: "medical_source_fetch", payloadFingerprint: fingerprint },
      {
        get(target, property, receiver) {
          if (property === "requestId") return "retry-request-1";
          return Reflect.get(target, property, receiver);
        },
      },
    );
    for (const badInput of [
      symbolInput,
      nonEnumerableInput,
      inheritedRequestInput,
      getterRequiredInput,
      getterOptionalInput,
      syntheticRequestProxy,
      { ...input(), sourceIds: getterSourceIds },
    ]) {
      const result = await runProviderRetrySequence(orchestrator(execute), retryRuntime, badInput);
      expect(result).toMatchObject({
        valid: false,
        providerCallCount: 0,
        retryExecutedCount: 0,
        reasonCode: "PROVIDER_RETRY_SEQUENCE_REQUEST_VALIDATION_ERROR",
      });
    }
    expect(execute).not.toHaveBeenCalled();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("does not use inherited optional input fields", async () => {
    const execute = vi.fn();
    const inheritedMaxAttemptsInput = Object.create({ maxAttempts: 1 });
    Object.assign(inheritedMaxAttemptsInput, input({ maxAttempts: undefined }));
    const { runtime: retryRuntime, sleep } = runtime();
    const result = await runProviderRetrySequence(orchestrator(execute), retryRuntime, inheritedMaxAttemptsInput);
    expect(execute).not.toHaveBeenCalled();
    expect(sleep).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      valid: false,
      providerCallCount: 0,
      reasonCode: "PROVIDER_RETRY_SEQUENCE_REQUEST_VALIDATION_ERROR",
    });
  });

  it("uses a descriptor snapshot for dense sourceIds instead of Proxy get or iterator traps", async () => {
    const capturedSourceIds: unknown[] = [];
    const lengthGetTrap = vi.fn(() => 0);
    const sourceIds = new Proxy(["2"], {
      get(target, property, receiver) {
        if (property === "length") return lengthGetTrap();
        if (property === "0") return "other";
        if (property === Symbol.iterator) {
          return function* iterator() {
            yield "other";
          };
        }
        return Reflect.get(target, property, receiver);
      },
    });
    const execute = vi.fn(async (request: ProviderAdapterExecuteRequest): Promise<ProviderAdapterExecuteResult> => {
      capturedSourceIds.push(request.sourceIds);
      return {
        success: true,
        providerId: request.providerId,
        capability: request.capability,
        internalOutputReferenceId: "provider-output-1",
      };
    });
    const result = await runProviderRetrySequence(orchestrator(execute), runtime().runtime, input({ sourceIds }));
    expect(result).toMatchObject({ valid: true, sequenceSucceeded: true });
    expect(capturedSourceIds).toHaveLength(1);
    expect(capturedSourceIds[0]).toEqual(["2"]);
    expect(capturedSourceIds[0]).not.toEqual(["other"]);
    expect(Object.isFrozen(capturedSourceIds[0])).toBe(true);
    expect(lengthGetTrap).not.toHaveBeenCalled();
  });

  it("rejects sparse sourceIds using descriptor length even when Proxy length get lies", async () => {
    const lengthGetTrap = vi.fn(() => 0);
    const sourceIds = new Proxy(Array(1), {
      get(target, property, receiver) {
        if (property === "length") return lengthGetTrap();
        if (property === "0") return "2";
        return Reflect.get(target, property, receiver);
      },
    });
    const execute = vi.fn();
    const { runtime: retryRuntime, sleep } = runtime();
    const result = await runProviderRetrySequence(orchestrator(execute), retryRuntime, input({ sourceIds }));
    expect(result).toMatchObject({
      valid: false,
      providerCallCount: 0,
      reasonCode: "PROVIDER_RETRY_SEQUENCE_REQUEST_VALIDATION_ERROR",
    });
    expect(execute).not.toHaveBeenCalled();
    expect(sleep).not.toHaveBeenCalled();
    expect(lengthGetTrap).not.toHaveBeenCalled();
  });

  it("does not let changing sourceIds length get traps alter iteration count", async () => {
    const capturedSourceIds: unknown[] = [];
    const lengthGetTrap = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(10).mockReturnValue(1);
    const sourceIds = new Proxy(["2"], {
      get(target, property, receiver) {
        if (property === "length") return lengthGetTrap();
        return Reflect.get(target, property, receiver);
      },
    });
    const execute = vi.fn(async (request: ProviderAdapterExecuteRequest): Promise<ProviderAdapterExecuteResult> => {
      capturedSourceIds.push(request.sourceIds);
      return {
        success: true,
        providerId: request.providerId,
        capability: request.capability,
        internalOutputReferenceId: "provider-output-1",
      };
    });
    const result = await runProviderRetrySequence(orchestrator(execute), runtime().runtime, input({ sourceIds }));
    expect(result).toMatchObject({ valid: true, sequenceSucceeded: true });
    expect(capturedSourceIds).toEqual([["2"]]);
    expect(lengthGetTrap).not.toHaveBeenCalled();
  });

  it("completes immediately when the first attempt succeeds", async () => {
    const execute = vi.fn(async (request: ProviderAdapterExecuteRequest): Promise<ProviderAdapterExecuteResult> => ({
      success: true,
      providerId: request.providerId,
      capability: request.capability,
      internalOutputReferenceId: "provider-output-1",
    }));
    const { runtime: retryRuntime, sleep } = runtime();
    const result = await runProviderRetrySequence(orchestrator(execute), retryRuntime, input());
    expect(execute).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      valid: true,
      sequenceCompleted: true,
      sequenceSucceeded: true,
      attemptsStarted: 1,
      attemptsCompleted: 1,
      providerCallCount: 1,
      retryWaitCount: 0,
      retryExecutedCount: 0,
      retryExecuted: false,
      waitedDelayMs: [],
      finalAttemptNumber: 1,
      failClosed: false,
      jobShouldPause: false,
      manualReviewRequired: false,
      databaseWritten: false,
      storageUploaded: false,
      publicationTriggered: false,
      notificationSent: false,
      persistable: false,
      publishable: false,
      medicalVerificationCompleted: false,
      finalApprovalGranted: false,
      reasonCode: "PROVIDER_RETRY_SEQUENCE_SUCCEEDED_PREVIEW",
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.waitedDelayMs)).toBe(true);
  });

  it("runs one fake sleep and retries after a retryable failure", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce(failure("RATE_LIMITED"))
      .mockImplementationOnce(async (request: ProviderAdapterExecuteRequest): Promise<ProviderAdapterExecuteResult> => ({
        success: true,
        providerId: request.providerId,
        capability: request.capability,
        internalOutputReferenceId: "provider-output-2",
      }));
    const { runtime: retryRuntime, sleep } = runtime();
    const result = await runProviderRetrySequence(orchestrator(execute), retryRuntime, input());
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls.map(([request]) => request.attemptNumber)).toEqual([undefined, undefined]);
    expect(execute.mock.calls.map(([request]) => (request as ProviderAdapterExecuteRequest & { attemptNumber?: number }).attemptNumber)).toEqual([
      undefined,
      undefined,
    ]);
    expect(execute.mock.calls.map(([request]) => request.requestId)).toEqual(["retry-request-1", "retry-request-1"]);
    expect(sleep).toHaveBeenCalledExactlyOnceWith(1000);
    expect(result).toMatchObject({
      valid: true,
      sequenceSucceeded: true,
      attemptsStarted: 2,
      attemptsCompleted: 2,
      providerCallCount: 2,
      retryWaitCount: 1,
      retryExecutedCount: 1,
      retryExecuted: true,
      waitedDelayMs: [1000],
      finalAttemptNumber: 2,
      fallbackExecuted: false,
      reasonCode: "PROVIDER_RETRY_SEQUENCE_SUCCEEDED_PREVIEW",
    });
  });

  it("uses default maxAttempts=3 and stops exhausted retryable failures without extra sleep", async () => {
    const execute = vi.fn(async (): Promise<ProviderAdapterExecuteResult> => failure("REQUEST_TIMEOUT"));
    const { runtime: retryRuntime, sleep } = runtime();
    const result = await runProviderRetrySequence(orchestrator(execute), retryRuntime, input({ maxAttempts: undefined }));
    expect(execute).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenNthCalledWith(1, 1000);
    expect(sleep).toHaveBeenNthCalledWith(2, 3000);
    expect(result).toMatchObject({
      valid: true,
      sequenceCompleted: true,
      sequenceSucceeded: false,
      attemptsStarted: 3,
      attemptsCompleted: 3,
      providerCallCount: 3,
      retryWaitCount: 2,
      retryExecutedCount: 2,
      waitedDelayMs: [1000, 3000],
      finalAttemptNumber: 3,
      failClosed: true,
      jobShouldPause: true,
      manualReviewRequired: true,
      fallbackExecuted: false,
      reasonCode: "PROVIDER_RETRY_SEQUENCE_EXHAUSTED_PREVIEW",
    });
  });

  it("does not retry terminal, manual-review, configuration, or fallback-required outcomes", async () => {
    for (const [failureCode, action] of [
      ["AUTHENTICATION_FAILED", "FAILED_FINAL"],
      ["CONTENT_POLICY_BLOCKED", "MANUAL_REVIEW_REQUIRED"],
      ["CONFIGURATION_ERROR", "STOP_CONFIGURATION_ERROR"],
      ["INVALID_PROVIDER_RESPONSE", "MANUAL_REVIEW_REQUIRED"],
    ] as const) {
      const execute = vi.fn(async (): Promise<ProviderAdapterExecuteResult> => failure(failureCode));
      const { runtime: retryRuntime, sleep } = runtime();
      const result = await runProviderRetrySequence(orchestrator(execute), retryRuntime, input());
      expect(execute).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        valid: true,
        sequenceSucceeded: false,
        providerCallCount: 1,
        retryExecutedCount: 0,
        fallbackExecuted: false,
        failClosed: true,
        reasonCode: "PROVIDER_RETRY_SEQUENCE_STOPPED_PREVIEW",
      });
      expect(result.finalExecutionDecision).toMatchObject({ action });
    }
  });

  it("stops after sleep throw or rejection without exposing raw errors or calling the provider again", async () => {
    for (const sleep of [
      vi.fn(async () => {
        throw new Error("Authorization Bearer secret https://evil.example");
      }),
      vi.fn(async () => Promise.reject(new Error("stack secret"))),
    ]) {
      const execute = vi.fn(async (): Promise<ProviderAdapterExecuteResult> => failure("RATE_LIMITED"));
      const retryRuntimeResult = buildProviderRetryRuntime({ sleep });
      if (!retryRuntimeResult.valid) throw new Error("Expected valid runtime");
      const result = await runProviderRetrySequence(orchestrator(execute), retryRuntimeResult.runtime, input());
      expect(execute).toHaveBeenCalledTimes(1);
      expect(sleep).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        valid: false,
        providerCallCount: 1,
        retryWaitCount: 1,
        retryExecutedCount: 0,
        retryExecuted: false,
        waitedDelayMs: [1000],
        failClosed: true,
        jobShouldPause: true,
        manualReviewRequired: true,
        reasonCode: "PROVIDER_RETRY_SLEEP_FAILED",
      });
      expect(JSON.stringify(result).toLowerCase()).not.toMatch(/authorization|bearer|evil|stack|secret/);
    }
  });

  it("does not mutate input sourceIds and returns deterministic results for fixed stubs", async () => {
    const sourceIds = ["2", "3", "4"];
    const request = input({ sourceIds });
    const before = JSON.stringify({ request, sourceIds });
    const first = await runProviderRetrySequence(orchestrator(), runtime().runtime, request);
    const second = await runProviderRetrySequence(orchestrator(), runtime().runtime, request);
    expect(JSON.stringify({ request, sourceIds })).toBe(before);
    expect(second).toEqual(first);
  });

  it("does not expose tokens, raw results, registries, selections, adapters, execute, or sleep", async () => {
    const result = await runProviderRetrySequence(orchestrator(), runtime().runtime, input());
    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toMatch(/token|apikey|api_key|authorization|cookie|rawmedicaltext|prompt|html/);
    expect(serialized).not.toContain("\"registry\"");
    expect(serialized).not.toContain("\"selection\"");
    expect(serialized).not.toContain("\"adapter\"");
    expect(serialized).not.toContain("\"execute\"");
    expect(serialized).not.toContain("\"sleep\"");
  });

  it("fails closed when a Phase 4A attempt violates the retry contract", async () => {
    vi.resetModules();
    vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
      const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
      return {
        ...actual,
        ...mockedCancellationSequenceFunctions(),
        runProviderExecutionAttempt: vi.fn(async (): Promise<ProviderExecutionOrchestrationResult> => ({
          valid: true,
          requestId: "retry-request-1",
          capability: "medical_source_fetch",
          selectedProviderId: "cdc-safe-fetch",
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
          manualReviewRequired: true,
          reasonCode: "PROVIDER_EXECUTION_FAILED_PREVIEW",
        })),
      };
    });
    const mockedRunner = await import("./providerRetryExecutionRunner");
    const sleep = vi.fn(async () => undefined);
    const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
    if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
    const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());
    expect(sleep).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      valid: false,
      sequenceStarted: true,
      sequenceCompleted: true,
      attemptsStarted: 1,
      attemptsCompleted: 1,
      providerCallCount: 1,
      selectedProviderId: "cdc-safe-fetch",
      finalAttemptNumber: 1,
      retryExecutedCount: 0,
      failClosed: true,
      jobShouldPause: true,
      manualReviewRequired: true,
      reasonCode: "PROVIDER_RETRY_ATTEMPT_CONTRACT_ERROR",
    });
    vi.doUnmock("./providerExecutionOrchestrator");
    vi.resetModules();
  });

  it("fails closed without copying unsafe audit values from malformed Phase 4A results", async () => {
    vi.resetModules();
    vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
      const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
      return {
        ...actual,
        ...mockedCancellationSequenceFunctions(),
        runProviderExecutionAttempt: vi.fn(async () => ({
          valid: true,
          requestId: "retry-request-1",
          capability: "medical_source_fetch",
          selectedProviderId: "not-registered",
          providerSelected: true,
          providerExecutionAttempted: true,
          providerExecutionSucceeded: false,
          providerCallCount: 999,
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
          manualReviewRequired: true,
          reasonCode: "PROVIDER_EXECUTION_FAILED_PREVIEW",
        })),
      };
    });
    const mockedRunner = await import("./providerRetryExecutionRunner");
    const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep: vi.fn(async () => undefined) });
    if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
    const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());
    expect(result).toMatchObject({
      valid: false,
      attemptsStarted: 1,
      attemptsCompleted: 0,
      providerCallCount: 0,
      selectedProviderId: null,
      finalAttemptNumber: null,
      reasonCode: "PROVIDER_RETRY_ATTEMPT_CONTRACT_ERROR",
    });
    vi.doUnmock("./providerExecutionOrchestrator");
    vi.resetModules();
  });

  it("fails closed when Phase 4A throws or rejects without exposing raw errors", async () => {
    for (const implementation of [
      vi.fn(async () => {
        throw new Error("Authorization Bearer secret https://evil.example");
      }),
      vi.fn(async () => Promise.reject(new Error("stack secret"))),
    ]) {
      vi.resetModules();
      vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
        const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
        return {
          ...actual,
        ...mockedCancellationSequenceFunctions(),
          runProviderExecutionAttempt: implementation,
        };
      });
      const mockedRunner = await import("./providerRetryExecutionRunner");
      const sleep = vi.fn(async () => undefined);
      const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
      if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
      const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());
      expect(implementation).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        valid: false,
        sequenceStarted: true,
        sequenceCompleted: true,
        attemptsStarted: 1,
        attemptsCompleted: 0,
        providerCallCount: 0,
        retryExecutedCount: 0,
        fallbackExecuted: false,
        failClosed: true,
        jobShouldPause: true,
        manualReviewRequired: true,
        reasonCode: "PROVIDER_RETRY_ATTEMPT_EXECUTION_ERROR",
      });
      expect(JSON.stringify(result).toLowerCase()).not.toMatch(/authorization|bearer|secret|evil|stack/);
      vi.doUnmock("./providerExecutionOrchestrator");
      vi.resetModules();
    }
  });

  it("stops when later attempts change provider identity or execution decision identity", async () => {
    for (const secondAttemptResult of [
      {
        selectedProviderId: "canonical-preview",
        executionDecisionProviderId: "canonical-preview",
        requestId: "retry-request-1",
        capability: "medical_source_fetch",
      },
      {
        selectedProviderId: "cdc-safe-fetch",
        executionDecisionProviderId: "canonical-preview",
        requestId: "retry-request-1",
        capability: "medical_source_fetch",
      },
      {
        selectedProviderId: "cdc-safe-fetch",
        executionDecisionProviderId: "cdc-safe-fetch",
        requestId: "wrong-request",
        capability: "medical_source_fetch",
      },
      {
        selectedProviderId: "cdc-safe-fetch",
        executionDecisionProviderId: "cdc-safe-fetch",
        requestId: "retry-request-1",
        capability: "ai_translation",
      },
    ] as const) {
      vi.resetModules();
      vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
        const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
        const first: ProviderExecutionOrchestrationResult = {
          valid: true,
          requestId: "retry-request-1",
          capability: "medical_source_fetch",
          selectedProviderId: "cdc-safe-fetch",
          providerSelected: true,
          providerExecutionAttempted: true,
          providerExecutionSucceeded: false,
          providerCallCount: 1,
          internalOutputReferenceId: null,
          executionDecision: {
            valid: true,
            requestId: "retry-request-1",
            capability: "medical_source_fetch",
            providerId: "cdc-safe-fetch",
            errorCode: "RATE_LIMITED",
            httpStatus: null,
            attemptNumber: 1,
            maxAttempts: 3,
            retryable: true,
            attemptsExhausted: false,
            retryScheduled: true,
            nextRetryDelayMs: 1000,
            fallbackRequired: false,
            fallbackExecutionStarted: false,
            manualReviewRequired: true,
            adminAlertRequired: false,
            terminal: false,
            failClosed: true,
            jobShouldPause: true,
            persistable: false,
            publishable: false,
            executionStarted: false,
            action: "RETRY_WAIT",
            reasonCode: "PROVIDER_EXECUTION_RETRY_WAIT",
          },
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
          manualReviewRequired: true,
          reasonCode: "PROVIDER_EXECUTION_FAILED_PREVIEW",
        };
        const second: ProviderExecutionOrchestrationResult = {
          ...first,
          requestId: secondAttemptResult.requestId,
          capability: secondAttemptResult.capability,
          selectedProviderId: secondAttemptResult.selectedProviderId,
          executionDecision: {
            ...first.executionDecision!,
            requestId: secondAttemptResult.requestId,
            capability: secondAttemptResult.capability,
            providerId: secondAttemptResult.executionDecisionProviderId,
            attemptNumber: 2,
            nextRetryDelayMs: 3000,
          },
        } as ProviderExecutionOrchestrationResult;
        return {
          ...actual,
        ...mockedCancellationSequenceFunctions(),
          runProviderExecutionAttempt: vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second),
          readProviderExecutionCancellationBoundary: vi.fn(() => retryBoundaryAllowed()),
        };
      });
      const mockedRunner = await import("./providerRetryExecutionRunner");
      const sleep = vi.fn(async () => undefined);
      const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
      if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
      const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());
      expect(sleep).toHaveBeenCalledTimes(1);
      const secondAttemptAuditTrusted =
        secondAttemptResult.requestId === "retry-request-1" && secondAttemptResult.capability === "medical_source_fetch";
      expect(result).toMatchObject({
        valid: false,
        attemptsStarted: 2,
        attemptsCompleted: secondAttemptAuditTrusted ? 2 : 1,
        providerCallCount: secondAttemptAuditTrusted ? 2 : 1,
        selectedProviderId: "cdc-safe-fetch",
        finalExecutionDecision: null,
        retryExecutedCount: 1,
        fallbackExecuted: false,
        failClosed: true,
        reasonCode: "PROVIDER_RETRY_ATTEMPT_CONTRACT_ERROR",
      });
      vi.doUnmock("./providerExecutionOrchestrator");
      vi.resetModules();
    }
  });

  it("rejects unsafe nested execution decisions and never exposes the invalid decision", async () => {
    const decisionWithSymbol = { ...baseDecision(), [Symbol("token")]: "secret" };
    const decisionWithNonEnumerable = { ...baseDecision() };
    Object.defineProperty(decisionWithNonEnumerable, "token", { value: "secret", enumerable: false });
    const decisionWithGetter = { ...baseDecision() };
    Object.defineProperty(decisionWithGetter, "metadata", { get: () => "secret", enumerable: true });
    const proxyDecision = new Proxy(baseDecision(), {
      ownKeys() {
        throw new Error("secret stack");
      },
    });

    for (const executionDecision of [
      { ...baseDecision(), token: "secret" },
      { ...baseDecision(), rawMedicalText: "raw" },
      decisionWithSymbol,
      decisionWithNonEnumerable,
      decisionWithGetter,
      proxyDecision,
    ]) {
      vi.resetModules();
      vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
        const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
        return {
          ...actual,
        ...mockedCancellationSequenceFunctions(),
          runProviderExecutionAttempt: vi.fn(async () => baseAttempt({ executionDecision })),
        };
      });
      const mockedRunner = await import("./providerRetryExecutionRunner");
      const sleep = vi.fn(async () => undefined);
      const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
      if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
      const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());
      expect(sleep).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        valid: false,
        attemptsStarted: 1,
        attemptsCompleted: 1,
        providerCallCount: 1,
        finalExecutionDecision: null,
        reasonCode: "PROVIDER_RETRY_ATTEMPT_CONTRACT_ERROR",
      });
      expect(JSON.stringify(result).toLowerCase()).not.toMatch(/secret|raw|stack|token|rawmedicaltext/);
      vi.doUnmock("./providerExecutionOrchestrator");
      vi.resetModules();
    }
  });

  it("rejects semantically inconsistent execution decisions before sleeping or retrying", async () => {
    for (const executionDecision of [
      baseDecision({ retryable: false }),
      baseDecision({ attemptsExhausted: true }),
      baseDecision({ terminal: true }),
      baseDecision({ fallbackRequired: true }),
      baseDecision({ reasonCode: "PROVIDER_EXECUTION_FAILED_FINAL" }),
      baseDecision({ reasonCode: "PROVIDER_EXECUTION_REQUEST_VALIDATION_ERROR" }),
      baseDecision({ retryScheduled: false }),
      baseDecision({ retryScheduled: false, nextRetryDelayMs: 1000, action: "FAILED_FINAL", reasonCode: "PROVIDER_EXECUTION_FAILED_FINAL", terminal: true }),
      baseDecision({
        retryScheduled: false,
        nextRetryDelayMs: null,
        fallbackRequired: false,
        action: "FALLBACK_REVIEW_REQUIRED",
        reasonCode: "PROVIDER_EXECUTION_FALLBACK_REVIEW_REQUIRED",
      }),
      baseDecision({
        retryScheduled: false,
        nextRetryDelayMs: null,
        manualReviewRequired: false,
        action: "MANUAL_REVIEW_REQUIRED",
        reasonCode: "PROVIDER_EXECUTION_MANUAL_REVIEW_REQUIRED",
      }),
      baseDecision({
        retryScheduled: false,
        nextRetryDelayMs: null,
        terminal: false,
        action: "FAILED_FINAL",
        reasonCode: "PROVIDER_EXECUTION_FAILED_FINAL",
      }),
      baseDecision({
        retryScheduled: false,
        nextRetryDelayMs: null,
        errorCode: "NETWORK_ERROR",
        action: "STOP_CONFIGURATION_ERROR",
        reasonCode: "PROVIDER_EXECUTION_CONFIGURATION_ERROR",
      }),
    ]) {
      vi.resetModules();
      vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
        const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
        return { ...actual, ...mockedCancellationSequenceFunctions(), runProviderExecutionAttempt: vi.fn(async () => baseAttempt({ executionDecision })) };
      });
      const mockedRunner = await import("./providerRetryExecutionRunner");
      const sleep = vi.fn(async () => undefined);
      const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
      if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
      const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());
      expect(sleep).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        valid: false,
        providerCallCount: 1,
        finalExecutionDecision: null,
        reasonCode: "PROVIDER_RETRY_ATTEMPT_CONTRACT_ERROR",
      });
      vi.doUnmock("./providerExecutionOrchestrator");
      vi.resetModules();
    }
  });

  it("rejects fake RETRY_WAIT decisions for non-retryable Phase 3 errors", async () => {
    for (const errorCode of [
      "AUTHENTICATION_FAILED",
      "PERMISSION_DENIED",
      "CONTENT_POLICY_BLOCKED",
      "INVALID_PROVIDER_RESPONSE",
      "CONFIGURATION_ERROR",
      "UNKNOWN_PROVIDER_ERROR",
    ]) {
      const executionDecision = baseDecision({
        errorCode,
        retryable: true,
        attemptsExhausted: false,
        retryScheduled: true,
        nextRetryDelayMs: 1000,
        fallbackRequired: false,
        terminal: false,
        adminAlertRequired: false,
        action: "RETRY_WAIT",
        reasonCode: "PROVIDER_EXECUTION_RETRY_WAIT",
      });
      vi.resetModules();
      vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
        const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
        return { ...actual, ...mockedCancellationSequenceFunctions(), runProviderExecutionAttempt: vi.fn(async () => baseAttempt({ executionDecision })) };
      });
      const mockedRunner = await import("./providerRetryExecutionRunner");
      const sleep = vi.fn(async () => undefined);
      const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
      if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
      const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());
      expect(sleep).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        valid: false,
        attemptsStarted: 1,
        attemptsCompleted: 1,
        providerCallCount: 1,
        finalExecutionDecision: null,
        retryExecutedCount: 0,
        reasonCode: "PROVIDER_RETRY_ATTEMPT_CONTRACT_ERROR",
      });
      vi.doUnmock("./providerExecutionOrchestrator");
      vi.resetModules();
    }
  });

  it("accepts Phase 3-equivalent RETRY_WAIT decisions only for retryable errors", async () => {
    for (const failureCode of ["RATE_LIMITED", "REQUEST_TIMEOUT", "PROVIDER_UNAVAILABLE", "NETWORK_ERROR"] as const) {
      const execute = vi
        .fn()
        .mockResolvedValueOnce(failure(failureCode))
        .mockImplementationOnce(async (request: ProviderAdapterExecuteRequest): Promise<ProviderAdapterExecuteResult> => ({
          success: true,
          providerId: request.providerId,
          capability: request.capability,
          internalOutputReferenceId: "provider-output-2",
        }));
      const { runtime: retryRuntime, sleep } = runtime();
      const result = await runProviderRetrySequence(orchestrator(execute), retryRuntime, input());
      expect(execute).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenCalledExactlyOnceWith(1000);
      expect(result).toMatchObject({
        valid: true,
        sequenceSucceeded: true,
        providerCallCount: 2,
        retryWaitCount: 1,
        retryExecutedCount: 1,
        reasonCode: "PROVIDER_RETRY_SEQUENCE_SUCCEEDED_PREVIEW",
      });
    }
  });

  it("requires retryable exhaustion semantics and expected retry delay to match Phase 3", async () => {
    const exhausted = await runProviderRetrySequence(
      orchestrator(vi.fn(async (): Promise<ProviderAdapterExecuteResult> => failure("NETWORK_ERROR"))),
      runtime().runtime,
      input({ maxAttempts: 1 }),
    );
    expect(exhausted).toMatchObject({
      valid: true,
      sequenceSucceeded: false,
      providerCallCount: 1,
      retryWaitCount: 0,
      retryExecutedCount: 0,
      reasonCode: "PROVIDER_RETRY_SEQUENCE_EXHAUSTED_PREVIEW",
    });
    expect(exhausted.finalExecutionDecision).toMatchObject({
      errorCode: "NETWORK_ERROR",
      retryable: true,
      attemptsExhausted: true,
      retryScheduled: false,
      nextRetryDelayMs: null,
    });

    vi.resetModules();
    vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
      const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
      return {
        ...actual,
        ...mockedCancellationSequenceFunctions(),
        runProviderExecutionAttempt: vi.fn(async () =>
          baseAttempt({
            executionDecision: baseDecision({ nextRetryDelayMs: 3000 }),
          }),
        ),
      };
    });
    const mockedRunner = await import("./providerRetryExecutionRunner");
    const sleep = vi.fn(async () => undefined);
    const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
    if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
    const badDelay = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());
    expect(sleep).not.toHaveBeenCalled();
    expect(badDelay).toMatchObject({
      valid: false,
      providerCallCount: 1,
      finalExecutionDecision: null,
      reasonCode: "PROVIDER_RETRY_ATTEMPT_CONTRACT_ERROR",
    });
    vi.doUnmock("./providerExecutionOrchestrator");
    vi.resetModules();
  });

  it("matches Phase 3 httpStatus bounds for nested execution decisions", async () => {
    for (const httpStatus of [100, 599, null]) {
      vi.resetModules();
      vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
        const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
        return {
          ...actual,
        ...mockedCancellationSequenceFunctions(),
          runProviderExecutionAttempt: vi.fn(async () =>
            baseAttempt({
              executionDecision: baseDecision({
                errorCode: "CONTENT_POLICY_BLOCKED",
                httpStatus,
                retryable: false,
                retryScheduled: false,
                nextRetryDelayMs: null,
                fallbackRequired: false,
                adminAlertRequired: true,
                action: "MANUAL_REVIEW_REQUIRED",
                reasonCode: "PROVIDER_EXECUTION_MANUAL_REVIEW_REQUIRED",
              }),
            }),
          ),
        };
      });
      const mockedRunner = await import("./providerRetryExecutionRunner");
      const sleep = vi.fn(async () => undefined);
      const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
      if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
      const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());
      expect(result).toMatchObject({ valid: true, sequenceSucceeded: false, retryExecutedCount: 0 });
      expect(sleep).not.toHaveBeenCalled();
      vi.doUnmock("./providerExecutionOrchestrator");
      vi.resetModules();
    }

    for (const httpStatus of [99, 0, -1, 600, 999, 200.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      vi.resetModules();
      vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
        const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
        return {
          ...actual,
        ...mockedCancellationSequenceFunctions(),
          runProviderExecutionAttempt: vi.fn(async () => baseAttempt({ executionDecision: baseDecision({ httpStatus }) })),
        };
      });
      const mockedRunner = await import("./providerRetryExecutionRunner");
      const sleep = vi.fn(async () => undefined);
      const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
      if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
      const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());
      expect(result).toMatchObject({
        valid: false,
        providerCallCount: 1,
        finalExecutionDecision: null,
        reasonCode: "PROVIDER_RETRY_ATTEMPT_CONTRACT_ERROR",
      });
      expect(sleep).not.toHaveBeenCalled();
      vi.doUnmock("./providerExecutionOrchestrator");
      vi.resetModules();
    }
  });

  it("rejects action states that do not match exact Phase 3 decision semantics", async () => {
    for (const executionDecision of [
      baseDecision({
        errorCode: "CONTENT_POLICY_BLOCKED",
        retryable: false,
        retryScheduled: false,
        nextRetryDelayMs: null,
        fallbackRequired: true,
        adminAlertRequired: true,
        action: "MANUAL_REVIEW_REQUIRED",
        reasonCode: "PROVIDER_EXECUTION_MANUAL_REVIEW_REQUIRED",
      }),
      baseDecision({
        retryScheduled: false,
        nextRetryDelayMs: null,
        fallbackRequired: true,
        attemptsExhausted: false,
        action: "FALLBACK_REVIEW_REQUIRED",
        reasonCode: "PROVIDER_EXECUTION_FALLBACK_REVIEW_REQUIRED",
      }),
      baseDecision({
        retryScheduled: false,
        nextRetryDelayMs: null,
        fallbackRequired: true,
        retryable: false,
        attemptsExhausted: true,
        action: "FALLBACK_REVIEW_REQUIRED",
        reasonCode: "PROVIDER_EXECUTION_FALLBACK_REVIEW_REQUIRED",
      }),
      baseDecision({
        adminAlertRequired: true,
      }),
      baseDecision({
        terminal: true,
      }),
      baseDecision({
        manualReviewRequired: false,
      }),
    ]) {
      vi.resetModules();
      vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
        const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
        return { ...actual, ...mockedCancellationSequenceFunctions(), runProviderExecutionAttempt: vi.fn(async () => baseAttempt({ executionDecision })) };
      });
      const mockedRunner = await import("./providerRetryExecutionRunner");
      const sleep = vi.fn(async () => undefined);
      const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
      if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
      const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());
      expect(sleep).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        valid: false,
        providerCallCount: 1,
        finalExecutionDecision: null,
        reasonCode: "PROVIDER_RETRY_ATTEMPT_CONTRACT_ERROR",
      });
      vi.doUnmock("./providerExecutionOrchestrator");
      vi.resetModules();
    }
  });

  it("returns only a frozen safe execution decision copy after contract validation", async () => {
    vi.resetModules();
    const rawDecision = baseDecision({
      errorCode: "CONTENT_POLICY_BLOCKED",
      retryable: false,
      retryScheduled: false,
      nextRetryDelayMs: null,
      fallbackRequired: false,
      adminAlertRequired: true,
      action: "MANUAL_REVIEW_REQUIRED",
      reasonCode: "PROVIDER_EXECUTION_MANUAL_REVIEW_REQUIRED",
    });
    vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
      const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
      return {
        ...actual,
        ...mockedCancellationSequenceFunctions(),
        runProviderExecutionAttempt: vi.fn(async () => baseAttempt({ executionDecision: rawDecision })),
      };
    });
    const mockedRunner = await import("./providerRetryExecutionRunner");
    const sleep = vi.fn(async () => undefined);
    const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
    if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
    const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());
    expect(result).toMatchObject({ valid: true, sequenceSucceeded: false });
    expect(result.finalExecutionDecision).not.toBe(rawDecision);
    expect(Object.isFrozen(result.finalExecutionDecision)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    vi.doUnmock("./providerExecutionOrchestrator");
    vi.resetModules();
  });

  it("fails closed when top-level attempt shape is unsafe or contract validation throws", async () => {
    const attemptWithExtra = { ...baseAttempt(), token: "secret" };
    const attemptWithStringValid = { ...baseAttempt(), valid: "true" };
    const attemptWithStringSucceeded = { ...baseAttempt(), providerExecutionSucceeded: "false" };
    const attemptWithBadFlags = { ...baseAttempt(), failClosed: false };
    const attemptWithBadSuccessReason = {
      ...baseAttempt({
        providerExecutionSucceeded: true,
        internalOutputReferenceId: "provider-output-1",
        executionDecision: null,
        failClosed: false,
        jobShouldPause: false,
        manualReviewRequired: false,
      }),
      reasonCode: "PROVIDER_EXECUTION_FAILED_PREVIEW",
    };
    const attemptWithBadFailureReason = { ...baseAttempt(), reasonCode: "PROVIDER_EXECUTION_SUCCEEDED_PREVIEW" };
    const attemptWithCompletedMedical = { ...baseAttempt(), medicalVerificationCompleted: true };
    const attemptWithFinalApproval = { ...baseAttempt(), finalApprovalGranted: true };
    const attemptWithGetter = { ...baseAttempt() };
    Object.defineProperty(attemptWithGetter, "metadata", { get: () => "secret", enumerable: true });
    const proxyAttempt = new Proxy(baseAttempt(), {
      ownKeys() {
        throw new Error("secret proxy");
      },
    });
    for (const attemptResult of [
      attemptWithExtra,
      attemptWithStringValid,
      attemptWithStringSucceeded,
      attemptWithBadFlags,
      attemptWithBadSuccessReason,
      attemptWithBadFailureReason,
      attemptWithCompletedMedical,
      attemptWithFinalApproval,
      attemptWithGetter,
      proxyAttempt,
    ]) {
      vi.resetModules();
      vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
        const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
        return {
          ...actual,
        ...mockedCancellationSequenceFunctions(),
          runProviderExecutionAttempt: vi.fn(async () => attemptResult),
        };
      });
      const mockedRunner = await import("./providerRetryExecutionRunner");
      const sleep = vi.fn(async () => undefined);
      const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
      if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
      await expect(mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input())).resolves.toMatchObject({
        valid: false,
        reasonCode: "PROVIDER_RETRY_ATTEMPT_CONTRACT_ERROR",
      });
      expect(sleep).not.toHaveBeenCalled();
      vi.doUnmock("./providerExecutionOrchestrator");
      vi.resetModules();
    }
  });

  it("rejects executed success or failure attempts with null requestId", async () => {
    for (const attemptResult of [
      baseAttempt({ requestId: null }),
      baseAttempt({
        requestId: null,
        providerExecutionSucceeded: true,
        internalOutputReferenceId: "provider-output-1",
        executionDecision: null,
        failClosed: false,
        jobShouldPause: false,
        manualReviewRequired: false,
        reasonCode: "PROVIDER_EXECUTION_SUCCEEDED_PREVIEW",
      }),
    ]) {
      vi.resetModules();
      vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
        const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
        return { ...actual, ...mockedCancellationSequenceFunctions(), runProviderExecutionAttempt: vi.fn(async () => attemptResult) };
      });
      const mockedRunner = await import("./providerRetryExecutionRunner");
      const sleep = vi.fn(async () => undefined);
      const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
      if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
      const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());
      expect(sleep).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        valid: false,
        providerCallCount: 1,
        reasonCode: "PROVIDER_RETRY_ATTEMPT_CONTRACT_ERROR",
      });
      vi.doUnmock("./providerExecutionOrchestrator");
      vi.resetModules();
    }
  });

  it("marks malformed audit as unknown and stops without sleeping", async () => {
    vi.resetModules();
    const malformedAttempt = { ...baseAttempt(), providerExecutionAttempted: "true" };
    vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
      const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
      return { ...actual, ...mockedCancellationSequenceFunctions(), runProviderExecutionAttempt: vi.fn(async () => malformedAttempt) };
    });
    const mockedRunner = await import("./providerRetryExecutionRunner");
    const sleep = vi.fn(async () => undefined);
    const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
    if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
    const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());
    expect(sleep).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      valid: false,
      providerCallCount: 0,
      providerCallCountKnown: false,
      currentAttemptCallStatus: "UNKNOWN",
      reasonCode: "PROVIDER_RETRY_ATTEMPT_CONTRACT_ERROR",
    });
    vi.doUnmock("./providerExecutionOrchestrator");
    vi.resetModules();
  });

  it("marks top-level unsafe Proxy attempts as unknown without copying audit fields", async () => {
    vi.resetModules();
    const proxyAttempt = new Proxy(baseAttempt(), {
      ownKeys() {
        throw new Error("Authorization Bearer secret");
      },
    });
    vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
      const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
      return { ...actual, ...mockedCancellationSequenceFunctions(), runProviderExecutionAttempt: vi.fn(async () => proxyAttempt) };
    });
    const mockedRunner = await import("./providerRetryExecutionRunner");
    const sleep = vi.fn(async () => undefined);
    const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
    if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
    const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());
    expect(sleep).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      valid: false,
      attemptsStarted: 1,
      attemptsCompleted: 0,
      providerCallCount: 0,
      providerCallCountKnown: false,
      currentAttemptCallStatus: "UNKNOWN",
      selectedProviderId: null,
      finalExecutionDecision: null,
      reasonCode: "PROVIDER_RETRY_ATTEMPT_CONTRACT_ERROR",
    });
    expect(JSON.stringify(result).toLowerCase()).not.toMatch(/authorization|bearer|secret/);
    vi.doUnmock("./providerExecutionOrchestrator");
    vi.resetModules();
  });

  it("uses top-level attempt descriptor snapshots instead of Proxy get trap values", async () => {
    for (const attemptResult of [
      new Proxy(
        {
          ...baseAttempt({
            providerSelected: false,
            providerExecutionAttempted: false,
            providerExecutionSucceeded: false,
            providerCallCount: 0,
            selectedProviderId: null,
            executionDecision: null,
            jobShouldPause: true,
            reasonCode: "PROVIDER_ROUTER_SELECTION_FAILED_PREVIEW",
          }),
        },
        {
          get(target, property, receiver) {
            if (property === "executionDecision") return baseDecision();
            return Reflect.get(target, property, receiver);
          },
        },
      ),
      new Proxy(
        baseAttempt({
          executionDecision: baseDecision({
            errorCode: "AUTHENTICATION_FAILED",
            retryable: false,
            retryScheduled: false,
            nextRetryDelayMs: null,
            manualReviewRequired: true,
            adminAlertRequired: true,
            terminal: true,
            action: "FAILED_FINAL",
            reasonCode: "PROVIDER_EXECUTION_FAILED_FINAL",
          }),
        }),
        {
          get(target, property, receiver) {
            if (property === "providerExecutionSucceeded") return true;
            return Reflect.get(target, property, receiver);
          },
        },
      ),
    ]) {
      vi.resetModules();
      vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
        const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
        return { ...actual, ...mockedCancellationSequenceFunctions(), runProviderExecutionAttempt: vi.fn(async () => attemptResult) };
      });
      const mockedRunner = await import("./providerRetryExecutionRunner");
      const sleep = vi.fn(async () => undefined);
      const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
      if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
      const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());
      expect(sleep).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        sequenceSucceeded: false,
        retryExecutedCount: 0,
      });
      vi.doUnmock("./providerExecutionOrchestrator");
      vi.resetModules();
    }
  });

  it("uses nested execution decision descriptor snapshots instead of Proxy get trap values", async () => {
    for (const executionDecision of [
      new Proxy(
        baseDecision({
          errorCode: "AUTHENTICATION_FAILED",
          retryable: false,
          retryScheduled: false,
          nextRetryDelayMs: null,
          manualReviewRequired: true,
          adminAlertRequired: true,
          terminal: true,
          action: "FAILED_FINAL",
          reasonCode: "PROVIDER_EXECUTION_FAILED_FINAL",
        }),
        {
          get(target, property, receiver) {
            if (property === "action") return "RETRY_WAIT";
            return Reflect.get(target, property, receiver);
          },
        },
      ),
      new Proxy(
        baseDecision({
          errorCode: "AUTHENTICATION_FAILED",
          retryable: false,
          retryScheduled: false,
          nextRetryDelayMs: null,
          manualReviewRequired: true,
          adminAlertRequired: true,
          terminal: true,
          action: "FAILED_FINAL",
          reasonCode: "PROVIDER_EXECUTION_FAILED_FINAL",
        }),
        {
          get(target, property, receiver) {
            if (property === "nextRetryDelayMs") return 1000;
            return Reflect.get(target, property, receiver);
          },
        },
      ),
    ]) {
      vi.resetModules();
      vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
        const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
        return { ...actual, ...mockedCancellationSequenceFunctions(), runProviderExecutionAttempt: vi.fn(async () => baseAttempt({ executionDecision })) };
      });
      const mockedRunner = await import("./providerRetryExecutionRunner");
      const sleep = vi.fn(async () => undefined);
      const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
      if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
      const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());
      expect(sleep).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        valid: true,
        sequenceSucceeded: false,
        retryExecutedCount: 0,
        reasonCode: "PROVIDER_RETRY_SEQUENCE_STOPPED_PREVIEW",
      });
      expect(result.finalExecutionDecision).toMatchObject({ action: "FAILED_FINAL", nextRetryDelayMs: null });
      vi.doUnmock("./providerExecutionOrchestrator");
      vi.resetModules();
    }
  });

  it("rejects router selection failures that are not fully fail-closed", async () => {
    for (const routerAttempt of [
      baseAttempt({
        providerSelected: false,
        providerExecutionAttempted: false,
        providerExecutionSucceeded: false,
        providerCallCount: 0,
        selectedProviderId: null,
        executionDecision: null,
        reasonCode: "PROVIDER_ROUTER_SELECTION_FAILED_PREVIEW",
        jobShouldPause: false,
      }),
      baseAttempt({
        providerSelected: false,
        providerExecutionAttempted: false,
        providerExecutionSucceeded: false,
        providerCallCount: 0,
        selectedProviderId: null,
        executionDecision: null,
        reasonCode: "PROVIDER_ROUTER_SELECTION_FAILED_PREVIEW",
        manualReviewRequired: false,
      }),
    ]) {
      vi.resetModules();
      vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
        const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
        return { ...actual, ...mockedCancellationSequenceFunctions(), runProviderExecutionAttempt: vi.fn(async () => routerAttempt) };
      });
      const mockedRunner = await import("./providerRetryExecutionRunner");
      const sleep = vi.fn(async () => undefined);
      const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
      if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
      const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());
      expect(sleep).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        valid: false,
        providerCallCount: 0,
        providerCallCountKnown: true,
        currentAttemptCallStatus: "CONFIRMED_NOT_CALLED",
        reasonCode: "PROVIDER_RETRY_ATTEMPT_CONTRACT_ERROR",
      });
      vi.doUnmock("./providerExecutionOrchestrator");
      vi.resetModules();
    }
  });

  it("fails closed on proxy runtime config, sequence input, and sourceIds without throwing", async () => {
    const proxyRuntimeConfig = new Proxy({ sleep: vi.fn(async () => undefined) }, {
      ownKeys() {
        throw new Error("secret runtime");
      },
    });
    expect(buildProviderRetryRuntime(proxyRuntimeConfig)).toMatchObject({
      valid: false,
      providerCallCount: 0,
      providerCallCountKnown: true,
      currentAttemptCallStatus: "NOT_STARTED",
      reasonCode: "PROVIDER_RETRY_RUNTIME_CONFIGURATION_ERROR",
    });

    const { runtime: retryRuntime, sleep } = runtime();
    const execute = vi.fn();
    const proxyInput = new Proxy(input(), {
      ownKeys() {
        throw new Error("secret input");
      },
    });
    const proxySourceIds = new Proxy(Array(1), {
      get(target, property, receiver) {
        if (property === "0") return "2";
        return Reflect.get(target, property, receiver);
      },
    });
    for (const badInput of [proxyInput, { ...input(), sourceIds: proxySourceIds }]) {
      await expect(runProviderRetrySequence(orchestrator(execute), retryRuntime, badInput)).resolves.toMatchObject({
        valid: false,
        providerCallCount: 0,
        currentAttemptCallStatus: "NOT_STARTED",
        reasonCode: "PROVIDER_RETRY_SEQUENCE_REQUEST_VALIDATION_ERROR",
      });
    }
    expect(execute).not.toHaveBeenCalled();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("marks current attempt call status unknown when Phase 4A throws after a confirmed prior attempt", async () => {
    vi.resetModules();
    const runProviderExecutionAttempt = vi.fn().mockResolvedValueOnce(baseAttempt()).mockRejectedValueOnce(new Error("secret"));
    vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
      const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
      return {
        ...actual,
        ...mockedCancellationSequenceFunctions(),
        runProviderExecutionAttempt,
        readProviderExecutionCancellationBoundary: vi.fn(() => retryBoundaryAllowed()),
      };
    });
    const mockedRunner = await import("./providerRetryExecutionRunner");
    const sleep = vi.fn(async () => undefined);
    const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
    if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
    const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());
    expect(runProviderExecutionAttempt).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      valid: false,
      attemptsStarted: 2,
      attemptsCompleted: 1,
      providerCallCount: 1,
      providerCallCountKnown: false,
      currentAttemptCallStatus: "UNKNOWN",
      finalExecutionDecision: null,
      reasonCode: "PROVIDER_RETRY_ATTEMPT_EXECUTION_ERROR",
    });
    vi.doUnmock("./providerExecutionOrchestrator");
    vi.resetModules();
  });

  it("requires both Phase 3 retry permission and a cancellation-safe retry boundary before retrying", async () => {
    vi.resetModules();
    const first = baseAttempt();
    const second = {
      ...baseAttempt({
        providerExecutionSucceeded: true,
        internalOutputReferenceId: "provider-output-2",
        executionDecision: null,
        failClosed: false,
        jobShouldPause: false,
        manualReviewRequired: false,
        reasonCode: "PROVIDER_EXECUTION_SUCCEEDED_PREVIEW",
      }),
      selectedProviderId: "cdc-safe-fetch",
    } as ProviderExecutionOrchestrationResult;
    const runProviderExecutionAttempt = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
      const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
      return {
        ...actual,
        ...mockedCancellationSequenceFunctions(),
        runProviderExecutionAttempt,
        readProviderExecutionCancellationBoundary: vi.fn(() => ({
          ...retryBoundaryAllowed(),
          retryMayProceed: false,
          jobShouldPause: true,
          manualReviewRequired: true,
        })),
      };
    });
    const mockedRunner = await import("./providerRetryExecutionRunner");
    const sleep = vi.fn(async () => undefined);
    const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
    if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
    const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());

    expect(runProviderExecutionAttempt).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      valid: true,
      sequenceSucceeded: false,
      retryExecutedCount: 0,
      reasonCode: "PROVIDER_RETRY_SEQUENCE_STOPPED_PREVIEW",
    });
    vi.doUnmock("./providerExecutionOrchestrator");
    vi.resetModules();
  });

  it("does not accept successful attempts without a completed-success cancellation boundary", async () => {
    for (const boundary of [
      null,
      { ...completedSuccessBoundary(), valid: false },
      { ...completedSuccessBoundary(), lifecycleState: "COMPLETED_FAILURE" },
      { ...completedSuccessBoundary(), retryMayProceed: true },
      { ...completedSuccessBoundary(), jobShouldPause: true },
      { ...completedSuccessBoundary(), manualReviewRequired: true },
    ]) {
      vi.resetModules();
      const successAttempt = baseAttempt({
        providerExecutionSucceeded: true,
        internalOutputReferenceId: "provider-output-1",
        executionDecision: null,
        failClosed: false,
        jobShouldPause: false,
        manualReviewRequired: false,
        reasonCode: "PROVIDER_EXECUTION_SUCCEEDED_PREVIEW",
      });
      const runProviderExecutionAttempt = vi.fn(async () => successAttempt);
      vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
        const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
      return {
        ...actual,
        ...mockedCancellationSequenceFunctions(),
        runProviderExecutionAttempt,
        readProviderExecutionCancellationBoundary: vi.fn(() => boundary),
      };
      });
      const mockedRunner = await import("./providerRetryExecutionRunner");
      const sleep = vi.fn(async () => undefined);
      const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
      if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
      const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());

      expect(runProviderExecutionAttempt).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        valid: true,
        sequenceSucceeded: false,
        failClosed: true,
        jobShouldPause: true,
        manualReviewRequired: true,
        retryExecutedCount: 0,
        reasonCode: "PROVIDER_RETRY_SEQUENCE_STOPPED_PREVIEW",
      });
      vi.doUnmock("./providerExecutionOrchestrator");
      vi.resetModules();
    }
  });

  it("preserves conservative boundary safety flags when retry is stopped", async () => {
    vi.resetModules();
    const runProviderExecutionAttempt = vi.fn(async () => baseAttempt());
    vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
      const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
      return {
        ...actual,
        ...mockedCancellationSequenceFunctions(),
        runProviderExecutionAttempt,
        readProviderExecutionCancellationBoundary: vi.fn(() => ({
          ...retryBoundaryAllowed(),
          retryMayProceed: false,
          jobShouldPause: true,
          manualReviewRequired: true,
        })),
      };
    });
    const mockedRunner = await import("./providerRetryExecutionRunner");
    const sleep = vi.fn(async () => undefined);
    const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
    if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
    const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntimeResult.runtime, input());

    expect(result).toMatchObject({
      valid: true,
      sequenceSucceeded: false,
      jobShouldPause: true,
      manualReviewRequired: true,
      reasonCode: "PROVIDER_RETRY_SEQUENCE_STOPPED_PREVIEW",
    });
    expect(sleep).not.toHaveBeenCalled();
    vi.doUnmock("./providerExecutionOrchestrator");
    vi.resetModules();
  });

  it("allows retry only for failed-before-call and completed-failure cancellation boundary states", async () => {
    for (const lifecycleState of ["FAILED_BEFORE_CALL", "COMPLETED_FAILURE"]) {
      vi.resetModules();
      const runProviderExecutionAttempt = vi
        .fn()
        .mockResolvedValueOnce(baseAttempt())
        .mockResolvedValueOnce(
          baseAttempt({
            providerExecutionSucceeded: true,
            internalOutputReferenceId: "provider-output-2",
            executionDecision: null,
            failClosed: false,
            jobShouldPause: false,
            manualReviewRequired: false,
            reasonCode: "PROVIDER_EXECUTION_SUCCEEDED_PREVIEW",
          }),
        );
      vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
        const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
        return {
          ...actual,
          ...mockedCancellationSequenceFunctions(),
          runProviderExecutionAttempt,
          readProviderExecutionCancellationBoundary: vi
            .fn()
            .mockReturnValueOnce({ ...retryBoundaryAllowed(), lifecycleState })
            .mockReturnValueOnce(completedSuccessBoundary()),
        };
      });
      const mockedRunner = await import("./providerRetryExecutionRunner");
      const sleep = vi.fn(async () => undefined);
      const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
      if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
      const retryRuntime = retryRuntimeResult.runtime;
      const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntime, input());
      expect(result).toMatchObject({ valid: true, sequenceSucceeded: true, retryExecutedCount: 1 });
      expect(runProviderExecutionAttempt).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenCalledTimes(1);
      vi.doUnmock("./providerExecutionOrchestrator");
      vi.resetModules();
    }

    for (const lifecycleState of [
      "CANCEL_REQUESTED",
      "CANCEL_CONFIRMED",
      "CANCEL_UNCONFIRMED",
      "SETTLED_AFTER_CANCEL_REQUEST",
      "COMPLETED_SUCCESS",
    ]) {
      vi.resetModules();
      const runProviderExecutionAttempt = vi.fn(async () => baseAttempt());
      vi.doMock("./providerExecutionOrchestrator", async (importOriginal) => {
        const actual = await importOriginal<typeof import("./providerExecutionOrchestrator")>();
        return {
          ...actual,
          ...mockedCancellationSequenceFunctions(),
          runProviderExecutionAttempt,
          readProviderExecutionCancellationBoundary: vi.fn(() => ({ ...retryBoundaryAllowed(), lifecycleState })),
        };
      });
      const mockedRunner = await import("./providerRetryExecutionRunner");
      const sleep = vi.fn(async () => undefined);
      const retryRuntimeResult = mockedRunner.buildProviderRetryRuntime({ sleep });
      if (!retryRuntimeResult.valid) throw new Error("Expected valid mocked runtime");
      const retryRuntime = retryRuntimeResult.runtime;
      const result = await mockedRunner.runProviderRetrySequence(orchestrator(), retryRuntime, input());
      expect(result).toMatchObject({
        valid: true,
        sequenceSucceeded: false,
        retryExecutedCount: 0,
        reasonCode: "PROVIDER_RETRY_SEQUENCE_STOPPED_PREVIEW",
      });
      expect(runProviderExecutionAttempt).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
      vi.doUnmock("./providerExecutionOrchestrator");
      vi.resetModules();
    }
  });

  it("blocks concurrent same-key retry sequences on the same orchestrator while allowing later and different-key sequences", async () => {
    let finishFirst!: (value: ProviderAdapterExecuteResult) => void;
    const firstExecution = new Promise<ProviderAdapterExecuteResult>((resolve) => {
      finishFirst = resolve;
    });
    const execute = vi
      .fn()
      .mockImplementationOnce(() => firstExecution)
      .mockImplementation(async (request: ProviderAdapterExecuteRequest): Promise<ProviderAdapterExecuteResult> => ({
        success: true,
        providerId: request.providerId,
        capability: request.capability,
        internalOutputReferenceId: `provider-output-${request.requestId}`,
      }));
    const actualOrchestrator = orchestrator(execute);
    const { runtime: retryRuntime, sleep } = runtime();

    const first = runProviderRetrySequence(actualOrchestrator, retryRuntime, input());
    expect(execute).toHaveBeenCalledTimes(1);

    const second = await runProviderRetrySequence(actualOrchestrator, retryRuntime, input());
    expect(second).toMatchObject({
      valid: false,
      reasonCode: "PROVIDER_RETRY_ATTEMPT_CONTRACT_ERROR",
      providerCallCount: 0,
    });
    expect(execute).toHaveBeenCalledTimes(1);

    const differentKey = await runProviderRetrySequence(actualOrchestrator, retryRuntime, input({ requestId: "retry-request-2" }));
    expect(differentKey).toMatchObject({ valid: true, sequenceSucceeded: true });
    expect(execute).toHaveBeenCalledTimes(2);

    finishFirst({
      success: true,
      providerId: "cdc-safe-fetch",
      capability: "medical_source_fetch",
      internalOutputReferenceId: "provider-output-first",
    });
    await expect(first).resolves.toMatchObject({ valid: true, sequenceSucceeded: true });

    const afterCompletion = await runProviderRetrySequence(actualOrchestrator, retryRuntime, input());
    expect(afterCompletion).toMatchObject({ valid: true, sequenceSucceeded: true });
    expect(execute).toHaveBeenCalledTimes(3);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("keeps Phase 4B-2A2 free of actual timers, abort controllers, and promise races", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(new URL("./providerRetryExecutionRunner.ts", import.meta.url), "utf8");
    expect(source).not.toContain("setTimeout");
    expect(source).not.toContain("Promise.race");
    expect(source).not.toContain("AbortController");
    expect(source).not.toContain("AbortSignal");
  });
});
