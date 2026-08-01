import { describe, expect, it, vi } from "vitest";

import {
  buildProviderExecutionOrchestrator,
  createProviderExecutionCancellationSequence,
  prepareProviderExecutionCancellationAttempt,
  readProviderExecutionCancellationBoundary,
  runProviderExecutionAttempt,
  type ProviderExecutionOrchestratorInput,
  type ValidatedProviderExecutionOrchestrator,
} from "./providerExecutionOrchestrator";
import type {
  ProviderAdapterContract,
  ProviderAdapterExecuteRequest,
  ProviderAdapterExecuteResult,
} from "./providerGatewayContract";

const fingerprint = "a".repeat(64);

function adapter(overrides: Partial<ProviderAdapterContract> = {}): ProviderAdapterContract {
  return {
    providerId: "cdc-safe-fetch",
    capabilities: ["medical_source_fetch"],
    priority: 10,
    trustTier: "medical_authoritative",
    enabled: true,
    execute: vi.fn(async (request: ProviderAdapterExecuteRequest) => ({
      success: true,
      providerId: request.providerId,
      capability: request.capability,
      internalOutputReferenceId: "provider-output-1",
    })),
    ...overrides,
  };
}

function input(overrides: Partial<ProviderExecutionOrchestratorInput> = {}): ProviderExecutionOrchestratorInput {
  return {
    requestId: "provider-request-1",
    capability: "medical_source_fetch",
    payloadFingerprint: fingerprint,
    contentId: "819852773404",
    revisionId: "13",
    sourceIds: ["2", "3", "4"],
    attemptNumber: 1,
    maxAttempts: 3,
    retryAfterMs: null,
    requestTimeoutMs: 15_000,
    ...overrides,
  };
}

function buildOrThrow(adapters: readonly ProviderAdapterContract[] = [adapter()]): ValidatedProviderExecutionOrchestrator {
  const result = buildProviderExecutionOrchestrator(adapters);
  if (!result.valid) throw new Error("Expected valid orchestrator");
  return result.orchestrator;
}

describe("provider execution orchestrator", () => {
  it("builds only opaque frozen orchestrators from valid adapters", () => {
    const result = buildProviderExecutionOrchestrator([adapter()]);
    expect(result).toMatchObject({
      valid: true,
      providerCount: 1,
      providerIds: ["cdc-safe-fetch"],
      reasonCode: "PROVIDER_ORCHESTRATOR_VALID",
    });
    if (result.valid) {
      expect(Object.isFrozen(result.orchestrator)).toBe(true);
      expect(JSON.stringify(result.orchestrator)).toBe("{}");
    }
  });

  it("rejects directly created, cloned, JSON-restored, null, primitive, and array orchestrators", async () => {
    for (const orchestrator of [{}, { ...buildOrThrow() }, JSON.parse("{}"), null, "x", 1, []]) {
      const result = await runProviderExecutionAttempt(orchestrator as ValidatedProviderExecutionOrchestrator, input());
      expect(result).toMatchObject({
        valid: false,
        providerExecutionAttempted: false,
        reasonCode: "PROVIDER_ORCHESTRATOR_CONFIGURATION_ERROR",
      });
    }
  });

  it("fails closed on invalid registry or missing/non-function enabled execute", () => {
    expect(buildProviderExecutionOrchestrator([adapter({ providerId: "evil://token" as ProviderAdapterContract["providerId"] })]).valid).toBe(
      false,
    );
    expect(buildProviderExecutionOrchestrator([adapter({ execute: undefined })]).valid).toBe(false);
    expect(buildProviderExecutionOrchestrator([adapter({ execute: "not-function" as unknown as ProviderAdapterContract["execute"] })]).valid).toBe(
      false,
    );
  });

  it("does not freeze or mutate source adapter objects and preserves build-time execute binding", async () => {
    const execute = vi.fn(async (): Promise<ProviderAdapterExecuteResult> => ({
      success: true,
      providerId: "cdc-safe-fetch",
      capability: "medical_source_fetch",
      internalOutputReferenceId: "provider-output-1",
    }));
    const originalAdapter = adapter({ execute });
    const adapters = [originalAdapter];
    const before = JSON.stringify(adapters, (_key, value) => (typeof value === "function" ? "function" : value));
    const orchestrator = buildOrThrow(adapters);
    originalAdapter.execute = vi.fn();
    const result = await runProviderExecutionAttempt(orchestrator, input());
    expect(result.providerCallCount).toBe(1);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(Object.isFrozen(adapters)).toBe(false);
    expect(Object.isFrozen(originalAdapter)).toBe(false);
    expect(Object.isFrozen(originalAdapter.capabilities)).toBe(false);
    expect(JSON.stringify(adapters, (_key, value) => (typeof value === "function" ? "function" : value))).toBe(before);
  });

  it("rejects unsafe input before router or execute", async () => {
    const execute = vi.fn();
    const orchestrator = buildOrThrow([adapter({ execute })]);
    for (const badInput of [
      input({ requestId: "Authorization: Bearer token" }),
      input({ capability: "bad" as ProviderExecutionOrchestratorInput["capability"] }),
      input({ payloadFingerprint: "bad" }),
      input({ contentId: "https://evil.example" }),
      input({ revisionId: "bad\nid" }),
      input({ sourceIds: ["2", "2"] }),
      input({ sourceIds: Array.from({ length: 11 }, (_, index) => String(index + 1)) }),
      input({ attemptNumber: 0 }),
      input({ maxAttempts: 0 }),
      input({ attemptNumber: 4, maxAttempts: 3 }),
      input({ attemptNumber: 4, maxAttempts: undefined }),
      input({ attemptNumber: 4, maxAttempts: null }),
      input({ attemptNumber: 11, maxAttempts: undefined }),
    ]) {
      const result = await runProviderExecutionAttempt(orchestrator, badInput);
      expect(result).toMatchObject({
        valid: false,
        providerSelected: false,
        providerExecutionAttempted: false,
        providerCallCount: 0,
        reasonCode: "PROVIDER_ORCHESTRATION_REQUEST_VALIDATION_ERROR",
      });
    }
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects extra orchestration input fields before router or execute", async () => {
    const execute = vi.fn();
    const orchestrator = buildOrThrow([adapter({ execute })]);
    for (const extra of [
      { providerId: "cdc-safe-fetch" },
      { selection: {} },
      { trustTier: "medical_authoritative" },
      { token: "secret" },
      { apiKey: "secret" },
      { api_key: "secret" },
      { Authorization: "Bearer secret" },
      { authorization: "Bearer secret" },
      { rawMedicalText: "raw" },
      { prompt: "raw" },
      { html: "<html>" },
      { responseBody: "raw" },
      { patientData: "raw" },
      { unexpected: true },
    ]) {
      const result = await runProviderExecutionAttempt(orchestrator, { ...input(), ...extra });
      expect(result).toMatchObject({
        valid: false,
        providerSelected: false,
        providerExecutionAttempted: false,
        providerCallCount: 0,
        retryExecuted: false,
        fallbackExecuted: false,
        databaseWritten: false,
        storageUploaded: false,
        publicationTriggered: false,
        notificationSent: false,
        persistable: false,
        publishable: false,
        reasonCode: "PROVIDER_ORCHESTRATION_REQUEST_VALIDATION_ERROR",
      });
      expect(JSON.stringify(result).toLowerCase()).not.toMatch(/secret|bearer|raw|<html>|patient/);
    }

    const symbolInput = { ...input(), [Symbol("token")]: "secret" };
    const nonEnumerableInput = { ...input() };
    Object.defineProperty(nonEnumerableInput, "token", {
      value: "secret",
      enumerable: false,
      configurable: true,
    });
    for (const badInput of [symbolInput, nonEnumerableInput]) {
      const result = await runProviderExecutionAttempt(orchestrator, badInput);
      expect(result).toMatchObject({
        valid: false,
        providerExecutionAttempted: false,
        providerCallCount: 0,
        reasonCode: "PROVIDER_ORCHESTRATION_REQUEST_VALIDATION_ERROR",
      });
    }
    expect(execute).not.toHaveBeenCalled();
  });

  it("uses the Phase 3 default maxAttempts before router or execute", async () => {
    const execute = vi.fn(async (): Promise<ProviderAdapterExecuteResult> => ({
      success: false,
      providerId: "cdc-safe-fetch",
      capability: "medical_source_fetch",
      failureCode: "REQUEST_TIMEOUT",
    }));
    for (const attemptNumber of [1, 2, 3]) {
      const result = await runProviderExecutionAttempt(buildOrThrow([adapter({ execute })]), input({ attemptNumber, maxAttempts: undefined }));
      expect(result.valid).toBe(true);
      expect(result.providerCallCount).toBe(1);
      expect(result.executionDecision).toMatchObject({
        maxAttempts: 3,
      });
    }
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it("rejects malformed whole inputs without throwing or executing", async () => {
    const execute = vi.fn();
    const orchestrator = buildOrThrow([adapter({ execute })]);
    for (const badInput of [null, undefined, "bad", 1, true, []]) {
      await expect(runProviderExecutionAttempt(orchestrator, badInput)).resolves.toMatchObject({
        valid: false,
        providerSelected: false,
        providerExecutionAttempted: false,
        providerCallCount: 0,
        reasonCode: "PROVIDER_ORCHESTRATION_REQUEST_VALIDATION_ERROR",
      });
    }
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects malformed adapter collections without throwing", () => {
    for (const badAdapters of [null, undefined, "bad", 1, true, {}]) {
      expect(buildProviderExecutionOrchestrator(badAdapters)).toMatchObject({
        valid: false,
        reasonCode: "PROVIDER_ORCHESTRATOR_CONFIGURATION_ERROR",
      });
    }
  });

  it("does not execute disabled or unapproved providers", async () => {
    const disabledExecute = vi.fn();
    const disabled = buildOrThrow([adapter({ enabled: false, execute: disabledExecute })]);
    const disabledResult = await runProviderExecutionAttempt(disabled, input());
    expect(disabledResult).toMatchObject({
      providerSelected: false,
      providerExecutionAttempted: false,
      reasonCode: "PROVIDER_ROUTER_SELECTION_FAILED_PREVIEW",
    });
    expect(disabledExecute).not.toHaveBeenCalled();
    expect(buildProviderExecutionOrchestrator([adapter({ providerId: "naver-datalab", capabilities: ["medical_source_search"] })]).valid).toBe(
      false,
    );
  });

  it("executes selected provider exactly once with structured fields only", async () => {
    const execute = vi.fn(async (request: ProviderAdapterExecuteRequest) => ({
      success: true,
      providerId: request.providerId,
      capability: request.capability,
      internalOutputReferenceId: "provider-output-1",
    }));
    const result = await runProviderExecutionAttempt(buildOrThrow([adapter({ execute })]), input());
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith({
      requestId: "provider-request-1",
      capability: "medical_source_fetch",
      providerId: "cdc-safe-fetch",
      payloadFingerprint: fingerprint,
      contentId: "819852773404",
      revisionId: "13",
      sourceIds: ["2", "3", "4"],
    });
    expect(result).toMatchObject({
      valid: true,
      providerSelected: true,
      providerExecutionAttempted: true,
      providerExecutionSucceeded: true,
      providerCallCount: 1,
      selectedProviderId: "cdc-safe-fetch",
      internalOutputReferenceId: "provider-output-1",
      persistable: false,
      publishable: false,
      databaseWritten: false,
      medicalVerificationCompleted: false,
      finalApprovalGranted: false,
      reasonCode: "PROVIDER_EXECUTION_SUCCEEDED_PREVIEW",
    });
  });

  it("passes provider failures into Phase 3 without retry or fallback execution", async () => {
    const execute = vi.fn(async (): Promise<ProviderAdapterExecuteResult> => ({
      success: false,
      providerId: "cdc-safe-fetch",
      capability: "medical_source_fetch",
      failureCode: "RATE_LIMITED",
    }));
    const result = await runProviderExecutionAttempt(buildOrThrow([adapter({ execute })]), input({ attemptNumber: 1 }));
    expect(execute).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      providerExecutionAttempted: true,
      providerExecutionSucceeded: false,
      providerCallCount: 1,
      retryExecuted: false,
      fallbackExecuted: false,
      reasonCode: "PROVIDER_EXECUTION_FAILED_PREVIEW",
    });
    expect(result.executionDecision).toMatchObject({
      action: "RETRY_WAIT",
      retryScheduled: true,
      nextRetryDelayMs: 1_000,
    });
  });

  it("keeps attempts exhausted and fallback-required failures single-call only", async () => {
    const execute = vi.fn(async (): Promise<ProviderAdapterExecuteResult> => ({
      success: false,
      providerId: "cdc-safe-fetch",
      capability: "medical_source_fetch",
      failureCode: "REQUEST_TIMEOUT",
    }));
    const result = await runProviderExecutionAttempt(buildOrThrow([adapter({ execute })]), input({ attemptNumber: 3 }));
    expect(execute).toHaveBeenCalledTimes(1);
    expect(result.executionDecision).toMatchObject({
      attemptsExhausted: true,
      retryScheduled: false,
    });
    expect(result).toMatchObject({
      retryExecuted: false,
      fallbackExecuted: false,
      providerCallCount: 1,
    });
  });

  it("keeps terminal and content-policy actions from Phase 3", async () => {
    for (const [failureCode, action] of [
      ["AUTHENTICATION_FAILED", "FAILED_FINAL"],
      ["CONTENT_POLICY_BLOCKED", "MANUAL_REVIEW_REQUIRED"],
    ] as const) {
      const result = await runProviderExecutionAttempt(
        buildOrThrow([
          adapter({
            execute: vi.fn(async (): Promise<ProviderAdapterExecuteResult> => ({
              success: false,
              providerId: "cdc-safe-fetch",
              capability: "medical_source_fetch",
              failureCode,
            })),
          }),
        ]),
        input(),
      );
      expect(result.executionDecision).toMatchObject({ action });
    }
  });

  it("maps throw and rejection to unknown provider error without raw error exposure", async () => {
    const execute = vi.fn(async () => {
      throw new Error("secret url https://evil.example Authorization Bearer token");
    });
    const result = await runProviderExecutionAttempt(buildOrThrow([adapter({ execute })]), input());
    expect(result.executionDecision).toMatchObject({
      errorCode: "UNKNOWN_PROVIDER_ERROR",
      action: "FAILED_FINAL",
    });
    expect(JSON.stringify(result).toLowerCase()).not.toMatch(/evil|authorization bearer|https:\/\//);
  });

  it("maps invalid provider results to invalid provider response", async () => {
    const successWithSymbol = {
      success: true,
      providerId: "cdc-safe-fetch",
      capability: "medical_source_fetch",
      internalOutputReferenceId: "provider-output-1",
      [Symbol("secret")]: "raw",
    };
    const failureWithSymbol = {
      success: false,
      providerId: "cdc-safe-fetch",
      capability: "medical_source_fetch",
      failureCode: "NETWORK_ERROR",
      [Symbol("secret")]: "raw",
    };
    const successWithNonEnumerableExtra = {
      success: true,
      providerId: "cdc-safe-fetch",
      capability: "medical_source_fetch",
      internalOutputReferenceId: "provider-output-1",
    };
    Object.defineProperty(successWithNonEnumerableExtra, "token", {
      value: "secret",
      enumerable: false,
      configurable: true,
    });
    const successWithGetter = {
      success: true,
      providerId: "cdc-safe-fetch",
      capability: "medical_source_fetch",
      internalOutputReferenceId: "provider-output-1",
      get metadata() {
        return "raw";
      },
    };
    for (const providerResult of [
      null,
      undefined,
      "bad",
      [],
      {},
      { success: true, providerId: "cdc-safe-fetch", capability: "medical_source_fetch" },
      {
        success: true,
        providerId: "cdc-safe-fetch",
        capability: "medical_source_fetch",
        internalOutputReferenceId: "provider-output-1",
        failureCode: "NETWORK_ERROR",
      },
      { success: false, providerId: "cdc-safe-fetch", capability: "medical_source_fetch" },
      { success: false, providerId: "wrong", capability: "medical_source_fetch", failureCode: "NETWORK_ERROR" },
      { success: false, providerId: "cdc-safe-fetch", capability: "wrong", failureCode: "NETWORK_ERROR" },
      { success: false, providerId: "cdc-safe-fetch", capability: "medical_source_fetch", failureCode: "BAD" },
      {
        success: true,
        providerId: "cdc-safe-fetch",
        capability: "medical_source_fetch",
        internalOutputReferenceId: "provider-output-1",
        body: "raw",
      },
      {
        success: true,
        providerId: "cdc-safe-fetch",
        capability: "medical_source_fetch",
        internalOutputReferenceId: "provider-output-1",
        Authorization: "Bearer secret",
      },
      {
        success: true,
        providerId: "cdc-safe-fetch",
        capability: "medical_source_fetch",
        internalOutputReferenceId: "provider-output-1",
        api_key: "secret",
      },
      {
        success: true,
        providerId: "cdc-safe-fetch",
        capability: "medical_source_fetch",
        internalOutputReferenceId: "provider-output-1",
        rawMedicalText: "raw",
      },
      {
        success: true,
        providerId: "cdc-safe-fetch",
        capability: "medical_source_fetch",
        internalOutputReferenceId: "provider-output-1",
        prompt: "raw",
      },
      {
        success: false,
        providerId: "cdc-safe-fetch",
        capability: "medical_source_fetch",
        failureCode: "NETWORK_ERROR",
        metadata: { raw: true },
      },
      {
        success: false,
        providerId: "cdc-safe-fetch",
        capability: "medical_source_fetch",
        failureCode: "NETWORK_ERROR",
        data: "raw",
      },
      successWithSymbol,
      failureWithSymbol,
      successWithNonEnumerableExtra,
      successWithGetter,
    ]) {
      const result = await runProviderExecutionAttempt(
        buildOrThrow([adapter({ execute: vi.fn(async () => providerResult as never) })]),
        input(),
      );
      expect(result.executionDecision).toMatchObject({ errorCode: "INVALID_PROVIDER_RESPONSE" });
      expect(result).toMatchObject({
        providerCallCount: 1,
        retryExecuted: false,
        fallbackExecuted: false,
      });
    }
  });

  it("preserves provider execution audit state when Phase 3 returns an invalid decision", async () => {
    vi.resetModules();
    vi.doMock("./providerExecutionPolicy", async (importOriginal) => {
      const actual = await importOriginal<typeof import("./providerExecutionPolicy")>();
      return {
        ...actual,
        buildProviderExecutionDecision: vi.fn(() => ({
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
          executionStarted: false,
          persistable: false,
          publishable: false,
          manualReviewRequired: false,
          adminAlertRequired: true,
          jobShouldPause: true,
          terminal: true,
          action: "STOP_CONFIGURATION_ERROR",
          reasonCode: "PROVIDER_EXECUTION_REQUEST_VALIDATION_ERROR",
        })),
      };
    });
    const mockedModule = await import("./providerExecutionOrchestrator");
    const execute = vi.fn(async (): Promise<ProviderAdapterExecuteResult> => ({
      success: false,
      providerId: "cdc-safe-fetch",
      capability: "medical_source_fetch",
      failureCode: "NETWORK_ERROR",
    }));
    const buildResult = mockedModule.buildProviderExecutionOrchestrator([adapter({ execute })]);
    if (!buildResult.valid) throw new Error("Expected valid orchestrator");

    const result = await mockedModule.runProviderExecutionAttempt(buildResult.orchestrator, input());

    expect(execute).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      valid: false,
      capability: "medical_source_fetch",
      selectedProviderId: "cdc-safe-fetch",
      providerSelected: true,
      providerExecutionAttempted: true,
      providerExecutionSucceeded: false,
      providerCallCount: 1,
      retryExecuted: false,
      fallbackExecuted: false,
      persistable: false,
      publishable: false,
      manualReviewRequired: true,
      reasonCode: "PROVIDER_EXECUTION_POLICY_CONTRACT_ERROR",
    });
    vi.doUnmock("./providerExecutionPolicy");
    vi.resetModules();
  });

  it("keeps all orchestration results non-writing and non-publishable", async () => {
    const results = [
      await runProviderExecutionAttempt(buildOrThrow(), input()),
      await runProviderExecutionAttempt(
        buildOrThrow([
          adapter({
            execute: vi.fn(async (): Promise<ProviderAdapterExecuteResult> => ({
              success: false,
              providerId: "cdc-safe-fetch",
              capability: "medical_source_fetch",
              failureCode: "NETWORK_ERROR",
            })),
          }),
        ]),
        input(),
      ),
      await runProviderExecutionAttempt(buildOrThrow(), input({ payloadFingerprint: "bad" })),
    ];
    for (const result of results) {
      expect(result).toMatchObject({
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
      });
    }
  });

  it("does not mutate inputs and returns deterministic results for fixed stubs", async () => {
    const sourceIds = ["2", "3", "4"];
    const request = input({ sourceIds });
    const before = JSON.stringify({ request, sourceIds });
    const first = await runProviderExecutionAttempt(buildOrThrow(), request);
    const second = await runProviderExecutionAttempt(buildOrThrow(), request);
    expect(JSON.stringify({ request, sourceIds })).toBe(before);
    expect(second).toEqual(first);
  });

  it("attaches cancellation boundary metadata for success, failure, and failed-before-call states", async () => {
    const success = await runProviderExecutionAttempt(buildOrThrow(), input());
    expect(readProviderExecutionCancellationBoundary(success)).toMatchObject({
      lifecycleState: "COMPLETED_SUCCESS",
      valid: true,
      retryMayProceed: false,
      jobShouldPause: false,
    });

    const providerFailure = await runProviderExecutionAttempt(
      buildOrThrow([
        adapter({
          execute: vi.fn(async (): Promise<ProviderAdapterExecuteResult> => ({
            success: false,
            providerId: "cdc-safe-fetch",
            capability: "medical_source_fetch",
            failureCode: "RATE_LIMITED",
          })),
        }),
      ]),
      input(),
    );
    expect(readProviderExecutionCancellationBoundary(providerFailure)).toMatchObject({
      lifecycleState: "COMPLETED_FAILURE",
      valid: true,
      retryMayProceed: true,
      jobShouldPause: false,
    });

    vi.resetModules();
    vi.doMock("./providerGatewayContract", async (importOriginal) => {
      const actual = await importOriginal<typeof import("./providerGatewayContract")>();
      return {
        ...actual,
        validateProviderSelectionForExecution: vi.fn(() => false),
      };
    });
    const mockedModule = await import("./providerExecutionOrchestrator");
    const buildResult = mockedModule.buildProviderExecutionOrchestrator([adapter()]);
    if (!buildResult.valid) throw new Error("Expected valid orchestrator");
    const failedBeforeCall = await mockedModule.runProviderExecutionAttempt(buildResult.orchestrator, input());
    expect(mockedModule.readProviderExecutionCancellationBoundary(failedBeforeCall)).toMatchObject({
      lifecycleState: "FAILED_BEFORE_CALL",
      valid: true,
      retryMayProceed: true,
      jobShouldPause: false,
    });
    vi.doUnmock("./providerGatewayContract");
    vi.resetModules();
  });

  it("uses one cancellation sequence for multiple prepared attempts without exposing it in results", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({
        success: false,
        providerId: "cdc-safe-fetch",
        capability: "medical_source_fetch",
        failureCode: "RATE_LIMITED",
      })
      .mockResolvedValueOnce({
        success: true,
        providerId: "cdc-safe-fetch",
        capability: "medical_source_fetch",
        internalOutputReferenceId: "provider-output-2",
      });
    const orchestrator = buildOrThrow([adapter({ execute })]);
    const sequence = createProviderExecutionCancellationSequence(orchestrator);

    expect(sequence).toMatchObject({
      valid: true,
      reasonCode: "PROVIDER_EXECUTION_CANCELLATION_SEQUENCE_VALID",
    });
    if (!sequence.valid) throw new Error("Expected valid cancellation sequence");
    expect(Object.isFrozen(sequence.sequence)).toBe(true);
    expect(prepareProviderExecutionCancellationAttempt(orchestrator, sequence.sequence)).toBe(true);
    const first = await runProviderExecutionAttempt(orchestrator, input({ attemptNumber: 1 }));
    expect(prepareProviderExecutionCancellationAttempt(orchestrator, sequence.sequence)).toBe(true);
    const second = await runProviderExecutionAttempt(orchestrator, input({ attemptNumber: 2 }));

    expect(execute).toHaveBeenCalledTimes(2);
    expect(readProviderExecutionCancellationBoundary(first)).toMatchObject({ lifecycleState: "COMPLETED_FAILURE", retryMayProceed: true });
    expect(readProviderExecutionCancellationBoundary(second)).toMatchObject({ lifecycleState: "COMPLETED_SUCCESS", retryMayProceed: false });
    expect(JSON.stringify({ first, second })).not.toMatch(/supervisor|lifecycle|receipt|cancellation/i);
  });

  it("binds cancellation sequences to their owning orchestrator and blocks pending overwrites", () => {
    const owner = buildOrThrow();
    const other = buildOrThrow();
    const sequence = createProviderExecutionCancellationSequence(owner);
    if (!sequence.valid) throw new Error("Expected valid cancellation sequence");

    expect(prepareProviderExecutionCancellationAttempt(other, sequence.sequence)).toBe(false);
    expect(prepareProviderExecutionCancellationAttempt(owner, sequence.sequence)).toBe(true);
    expect(prepareProviderExecutionCancellationAttempt(owner, sequence.sequence)).toBe(false);
  });

  it("rejects forged, cloned, JSON-restored, null, primitive, and array orchestrators when creating cancellation sequences", () => {
    const validOrchestrator = buildOrThrow();
    for (const forged of [{}, { ...validOrchestrator }, JSON.parse("{}"), null, "x", 1, []]) {
      expect(createProviderExecutionCancellationSequence(forged as ValidatedProviderExecutionOrchestrator)).toEqual({
        valid: false,
        sequence: null,
        failClosed: true,
        reasonCode: "PROVIDER_EXECUTION_CANCELLATION_SEQUENCE_CONFIGURATION_ERROR",
      });
    }
  });

  it("does not allow ownerless or cross-owner cancellation sequences to prepare attempts", () => {
    const owner = buildOrThrow();
    const other = buildOrThrow();
    const validSequence = createProviderExecutionCancellationSequence(owner);
    if (!validSequence.valid) throw new Error("Expected valid cancellation sequence");
    const invalidSequence = createProviderExecutionCancellationSequence({} as ValidatedProviderExecutionOrchestrator);
    expect(invalidSequence.sequence).toBeNull();

    expect(prepareProviderExecutionCancellationAttempt(owner, {} as never)).toBe(false);
    expect(prepareProviderExecutionCancellationAttempt(owner, JSON.parse("{}") as never)).toBe(false);
    expect(prepareProviderExecutionCancellationAttempt(other, validSequence.sequence)).toBe(false);
  });

  it("fails closed when terminal cancellation lifecycle transitions fail", async () => {
    for (const transitionName of [
      "markProviderCancellationLifecycleCompletedSuccess",
      "markProviderCancellationLifecycleCompletedFailure",
    ] as const) {
      vi.resetModules();
      vi.doMock("./providerCancellationSupervisor", async (importOriginal) => {
        const actual = await importOriginal<typeof import("./providerCancellationSupervisor")>();
        return {
          ...actual,
          [transitionName]: vi.fn(() => ({
            valid: false,
            lifecycle: null,
            requestId: null,
            capability: null,
            providerId: null,
            state: "CONTRACT_ERROR",
            cancellationRequested: false,
            cancellationConfirmed: false,
            providerSettled: false,
            settlementKind: null,
            retryMayProceed: false,
            jobShouldPause: true,
            manualReviewRequired: true,
            reasonCode: "PROVIDER_CANCELLATION_CONTRACT_ERROR",
            databaseWritten: false,
            storageUploaded: false,
            publicationTriggered: false,
            notificationSent: false,
          })),
        };
      });
      const mockedModule = await import("./providerExecutionOrchestrator");
      const execute = vi.fn(async (): Promise<ProviderAdapterExecuteResult> =>
        transitionName === "markProviderCancellationLifecycleCompletedSuccess"
          ? {
              success: true,
              providerId: "cdc-safe-fetch",
              capability: "medical_source_fetch",
              internalOutputReferenceId: "provider-output-1",
            }
          : {
              success: false,
              providerId: "cdc-safe-fetch",
              capability: "medical_source_fetch",
              failureCode: "RATE_LIMITED",
            },
      );
      const buildResult = mockedModule.buildProviderExecutionOrchestrator([adapter({ execute })]);
      if (!buildResult.valid) throw new Error("Expected valid orchestrator");
      const result = await mockedModule.runProviderExecutionAttempt(buildResult.orchestrator, input());

      expect(execute).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        valid: false,
        providerExecutionAttempted: true,
        providerExecutionSucceeded: false,
        providerCallCount: 1,
        failClosed: true,
        jobShouldPause: true,
        manualReviewRequired: true,
        reasonCode: "PROVIDER_EXECUTION_POLICY_CONTRACT_ERROR",
      });
      expect(mockedModule.readProviderExecutionCancellationBoundary(result)).toMatchObject({
        valid: false,
        retryMayProceed: false,
        jobShouldPause: true,
      });
      vi.doUnmock("./providerCancellationSupervisor");
      vi.resetModules();
    }
  });

  it("does not expose tokens, raw payloads, registries, selections, adapters, or execute functions", async () => {
    const result = await runProviderExecutionAttempt(buildOrThrow(), input());
    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toMatch(/token|apikey|api_key|authorization|cookie|rawmedicaltext|prompt|html/);
    expect(serialized).not.toContain("\"registry\"");
    expect(serialized).not.toContain("\"selection\"");
    expect(serialized).not.toContain("\"adapter\"");
    expect(serialized).not.toContain("\"execute\"");
  });
});
