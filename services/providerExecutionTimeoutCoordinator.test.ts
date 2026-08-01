import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  buildProviderTimeoutSchedulerRuntime,
  cleanupProviderExecutionTimeoutAttempt,
  createProviderExecutionTimeoutCoordinator,
  markProviderExecutionTimeoutProviderSettled,
  readProviderExecutionTimeoutSnapshot,
  startProviderExecutionTimeoutAttempt,
  validateProviderExecutionTimeoutContext,
  type ValidatedProviderTimeoutSchedulerRuntime,
} from "./providerExecutionTimeoutCoordinator";

function fakeScheduler() {
  const callbacks: Array<() => void> = [];
  const handles: Array<{ id: number }> = [];
  const cleanup = vi.fn();
  const schedule = vi.fn((delayMs: number, callback: () => void) => {
    const handle = { id: handles.length + 1 };
    handles.push(handle);
    callbacks.push(callback);
    return handle;
  });
  const config = { schedule, cleanup };
  const runtimeResult = buildProviderTimeoutSchedulerRuntime(config);
  expect(runtimeResult.valid).toBe(true);
  if (!runtimeResult.valid) throw new Error("expected runtime");
  return { runtime: runtimeResult.runtime, schedule, cleanup, callbacks, handles, config };
}

function coordinator(runtime?: ValidatedProviderTimeoutSchedulerRuntime) {
  const scheduler = runtime ? null : fakeScheduler();
  const result = createProviderExecutionTimeoutCoordinator(runtime ?? scheduler!.runtime);
  expect(result.valid).toBe(true);
  if (!result.valid) throw new Error("expected coordinator");
  return { coordinator: result.coordinator, scheduler };
}

function input(overrides: Partial<Parameters<typeof startProviderExecutionTimeoutAttempt>[1]> = {}) {
  return {
    requestId: "timeout-request-1",
    capability: "medical_source_fetch",
    providerId: "cdc-safe-fetch",
    requestTimeoutMs: 1000,
    ...overrides,
  };
}

function started(requestTimeoutMs: number | null = 1000) {
  const owner = coordinator();
  const result = startProviderExecutionTimeoutAttempt(owner.coordinator, input({ requestTimeoutMs }));
  expect(result.valid).toBe(true);
  if (!result.valid || !result.providerMayStart) throw new Error("expected attempt");
  return {
    coordinator: owner.coordinator,
    scheduler: owner.scheduler!,
    attempt: result.attempt,
    context: result.executionContext,
    snapshot: result.snapshot,
  };
}

const expectedSnapshotKeys = [
  "valid",
  "requestId",
  "capability",
  "providerId",
  "settlementSlotState",
  "authoritativeOutcomeKind",
  "timeoutEnabled",
  "requestTimeoutMs",
  "timeoutFired",
  "abortRequested",
  "abortCallCount",
  "signalAborted",
  "cleanupPerformed",
  "cleanupCallCount",
  "lateSettlementObserved",
  "lateSettlementKind",
  "retryMayProceed",
  "jobShouldPause",
  "manualReviewRequired",
  "databaseWritten",
  "storageUploaded",
  "publicationTriggered",
  "notificationSent",
  "persistable",
  "publishable",
  "fallbackExecuted",
  "reasonCode",
] as const;

const expectedStartReadyKeys = [
  "valid",
  "providerMayStart",
  "attempt",
  "executionContext",
  "snapshot",
  "failClosed",
  "reasonCode",
] as const;

const expectedStartFailureKeys = [
  "valid",
  "providerMayStart",
  "snapshot",
  "requestId",
  "capability",
  "providerId",
  "settlementSlotState",
  "authoritativeOutcomeKind",
  "timeoutEnabled",
  "requestTimeoutMs",
  "timeoutFired",
  "abortRequested",
  "abortCallCount",
  "signalAborted",
  "cleanupPerformed",
  "cleanupCallCount",
  "lateSettlementObserved",
  "lateSettlementKind",
  "retryMayProceed",
  "jobShouldPause",
  "manualReviewRequired",
  "databaseWritten",
  "storageUploaded",
  "publicationTriggered",
  "notificationSent",
  "persistable",
  "publishable",
  "fallbackExecuted",
  "failClosed",
  "reasonCode",
] as const;

function expectExactKeys(value: object, expectedKeys: readonly string[]) {
  const keys = Reflect.ownKeys(value);
  expect(keys.every((key) => typeof key === "string")).toBe(true);
  expect(keys).toEqual(expectedKeys);
}

function expectExactSnapshot(value: object) {
  expectExactKeys(value, expectedSnapshotKeys);
  expect(value).not.toHaveProperty("providerMayStart");
  expect(value).not.toHaveProperty("snapshot");
  expect(value).not.toHaveProperty("failClosed");
  expect(value).not.toHaveProperty("attempt");
  expect(value).not.toHaveProperty("executionContext");
  expect(Object.isFrozen(value)).toBe(true);
}

describe("provider execution timeout coordinator", () => {
  it("creates an opaque frozen validated scheduler runtime", () => {
    const scheduler = fakeScheduler();
    expect(Object.isFrozen(scheduler.runtime)).toBe(true);
    expect(JSON.stringify(scheduler.runtime)).toBe("{}");
  });

  it("rejects forged, cloned, JSON-restored, primitive, array, and null scheduler runtimes", () => {
    for (const bad of [null, undefined, "x", 1, true, [], {}, Object.freeze({}), JSON.parse("{}")]) {
      expect(createProviderExecutionTimeoutCoordinator(bad).valid).toBe(false);
    }
    const scheduler = fakeScheduler();
    expect(createProviderExecutionTimeoutCoordinator({ ...scheduler.runtime }).valid).toBe(false);
  });

  it("validates exact scheduler config own data keys", () => {
    const schedule = vi.fn();
    const cleanup = vi.fn();
    expect(buildProviderTimeoutSchedulerRuntime({ schedule, cleanup }).valid).toBe(true);
    expect(buildProviderTimeoutSchedulerRuntime({ schedule }).valid).toBe(false);
    expect(buildProviderTimeoutSchedulerRuntime({ schedule, cleanup, extra: "secret" }).valid).toBe(false);
    expect(buildProviderTimeoutSchedulerRuntime({ schedule, cleanup, [Symbol("extra")]: "secret" }).valid).toBe(false);
    const nonEnumerable = { schedule, cleanup };
    Object.defineProperty(nonEnumerable, "hidden", { value: "secret", enumerable: false });
    expect(buildProviderTimeoutSchedulerRuntime(nonEnumerable).valid).toBe(false);
    const getter = { cleanup };
    Object.defineProperty(getter, "schedule", { get: () => schedule, enumerable: true });
    expect(buildProviderTimeoutSchedulerRuntime(getter).valid).toBe(false);
    const inherited = Object.create({ schedule });
    inherited.cleanup = cleanup;
    expect(buildProviderTimeoutSchedulerRuntime(inherited).valid).toBe(false);
  });

  it("snapshots scheduler config descriptors exactly once and never uses get traps", () => {
    const schedule = vi.fn();
    const cleanup = vi.fn();
    const getTrap = vi.fn();
    let ownKeysCount = 0;
    const descriptorCounts = new Map<PropertyKey, number>();
    const config = new Proxy(
      { schedule, cleanup },
      {
        ownKeys(target) {
          ownKeysCount += 1;
          return Reflect.ownKeys(target);
        },
        get(target, property, receiver) {
          getTrap(property);
          return Reflect.get(target, property, receiver);
        },
        getOwnPropertyDescriptor(target, property) {
          descriptorCounts.set(property, (descriptorCounts.get(property) ?? 0) + 1);
          return Reflect.getOwnPropertyDescriptor(target, property);
        },
      },
    );

    const result = buildProviderTimeoutSchedulerRuntime(config);
    expect(result.valid).toBe(true);
    expect(ownKeysCount).toBe(1);
    expect(descriptorCounts.get("schedule")).toBe(1);
    expect(descriptorCounts.get("cleanup")).toBe(1);
    expect(getTrap).not.toHaveBeenCalled();
  });

  it("creates an opaque frozen coordinator and rejects forged, cloned, and JSON-restored coordinators", () => {
    const run = started();
    expect(Object.isFrozen(run.coordinator)).toBe(true);
    expect(JSON.stringify(run.coordinator)).toBe("{}");
    expect(startProviderExecutionTimeoutAttempt(Object.freeze({}), input()).valid).toBe(false);
    expect(startProviderExecutionTimeoutAttempt({ ...run.coordinator }, input()).valid).toBe(false);
    expect(startProviderExecutionTimeoutAttempt(JSON.parse(JSON.stringify(run.coordinator)), input()).valid).toBe(false);
  });

  it("does not register scheduler when requestTimeoutMs is null", () => {
    const run = started(null);
    expect(run.scheduler.schedule).not.toHaveBeenCalled();
    expect(run.snapshot.timeoutEnabled).toBe(false);
    expect(run.context.timeout).toEqual({ enabled: false, requestTimeoutMs: null });
  });

  it("registers scheduler exactly once when timeout is enabled", () => {
    const run = started(1000);
    expect(run.scheduler.schedule).toHaveBeenCalledExactlyOnceWith(1000, expect.any(Function));
    expect(run.snapshot.timeoutEnabled).toBe(true);
    expect(run.snapshot.settlementSlotState).toBe("OPEN");
  });

  it("marks normal async scheduler registration as providerMayStart true", () => {
    const run = coordinator();
    const result = startProviderExecutionTimeoutAttempt(run.coordinator, input());
    expect(result).toMatchObject({
      valid: true,
      providerMayStart: true,
      failClosed: false,
      reasonCode: "PROVIDER_TIMEOUT_ATTEMPT_STARTED",
    });
    if (result.valid && result.providerMayStart) {
      expect(result.snapshot.settlementSlotState).toBe("OPEN");
    }
  });

  it("creates one AbortController per attempt and exposes only a safe signal context", () => {
    const first = started();
    const second = started();
    expect(first.context.signal).not.toBe(second.context.signal);
    expect(first.context.signal.aborted).toBe(false);
    expect("abort" in first.context.signal).toBe(false);
    expect(JSON.stringify(first.context.attempt)).toBe("{}");
    expect(validateProviderExecutionTimeoutContext(first.context, first.coordinator, first.attempt)).toBe(true);
    expect(validateProviderExecutionTimeoutContext({ ...first.context }, first.coordinator, first.attempt)).toBe(false);
  });

  it("records provider success when it settles first and cleans up once", () => {
    const run = started();
    const result = markProviderExecutionTimeoutProviderSettled(run.coordinator, run.attempt, "SUCCESS");
    expect(result).toMatchObject({
      valid: true,
      settlementSlotState: "PROVIDER_SETTLED_FIRST",
      authoritativeOutcomeKind: "PROVIDER_COMPLETED_BEFORE_TIMEOUT",
      abortCallCount: 0,
      cleanupCallCount: 1,
      reasonCode: "PROVIDER_TIMEOUT_PROVIDER_COMPLETED_BEFORE_TIMEOUT",
    });
    expect(run.scheduler.cleanup).toHaveBeenCalledExactlyOnceWith(run.scheduler.handles[0]);
  });

  it("records provider failure when it settles first", () => {
    const run = started();
    const result = markProviderExecutionTimeoutProviderSettled(run.coordinator, run.attempt, "FAILURE");
    expect(result).toMatchObject({
      settlementSlotState: "PROVIDER_SETTLED_FIRST",
      authoritativeOutcomeKind: "PROVIDER_FAILED_BEFORE_TIMEOUT",
      reasonCode: "PROVIDER_TIMEOUT_PROVIDER_FAILED_BEFORE_TIMEOUT",
    });
  });

  it("records timeout as authoritative when it wins and aborts exactly once", () => {
    const run = started();
    run.scheduler.callbacks[0]();
    const result = readProviderExecutionTimeoutSnapshot(run.coordinator, run.attempt);
    expect(result).toMatchObject({
      valid: true,
      settlementSlotState: "TIMEOUT_WON",
      authoritativeOutcomeKind: "CANCELLATION_REQUESTED",
      timeoutFired: true,
      abortRequested: true,
      abortCallCount: 1,
      signalAborted: true,
      cleanupCallCount: 1,
      jobShouldPause: true,
      manualReviewRequired: true,
    });
  });

  it("does not abort again on duplicate timeout callbacks", () => {
    const run = started();
    run.scheduler.callbacks[0]();
    run.scheduler.callbacks[0]();
    const result = readProviderExecutionTimeoutSnapshot(run.coordinator, run.attempt);
    expect(result.abortCallCount).toBe(1);
    expect(result.cleanupCallCount).toBe(1);
  });

  it("ignores timeout callback after provider settle", () => {
    const run = started();
    markProviderExecutionTimeoutProviderSettled(run.coordinator, run.attempt, "SUCCESS");
    run.scheduler.callbacks[0]();
    const result = readProviderExecutionTimeoutSnapshot(run.coordinator, run.attempt);
    expect(result.settlementSlotState).toBe("PROVIDER_SETTLED_FIRST");
    expect(result.authoritativeOutcomeKind).toBe("PROVIDER_COMPLETED_BEFORE_TIMEOUT");
    expect(result.abortCallCount).toBe(0);
  });

  it("isolates late success after timeout without changing authoritative outcome", () => {
    const run = started();
    run.scheduler.callbacks[0]();
    const result = markProviderExecutionTimeoutProviderSettled(run.coordinator, run.attempt, "SUCCESS");
    expect(result).toMatchObject({
      settlementSlotState: "LATE_PROVIDER_SETTLEMENT",
      authoritativeOutcomeKind: "CANCELLATION_REQUESTED",
      lateSettlementObserved: true,
      lateSettlementKind: "SUCCESS",
      reasonCode: "PROVIDER_TIMEOUT_LATE_PROVIDER_SETTLEMENT",
    });
  });

  it("isolates late failure after timeout without changing authoritative outcome", () => {
    const run = started();
    run.scheduler.callbacks[0]();
    const result = markProviderExecutionTimeoutProviderSettled(run.coordinator, run.attempt, "FAILURE");
    expect(result.authoritativeOutcomeKind).toBe("CANCELLATION_REQUESTED");
    expect(result.lateSettlementKind).toBe("FAILURE");
  });

  it("does not let stale callback affect a different coordinator", () => {
    const first = started();
    const second = started();
    first.scheduler.callbacks[0]();
    const secondSnapshot = readProviderExecutionTimeoutSnapshot(second.coordinator, second.attempt);
    expect(secondSnapshot.settlementSlotState).toBe("OPEN");
    expect(secondSnapshot.abortCallCount).toBe(0);
  });

  it("allows independent coordinators to run without shared state", () => {
    const first = started();
    const second = started();
    markProviderExecutionTimeoutProviderSettled(first.coordinator, first.attempt, "FAILURE");
    second.scheduler.callbacks[0]();
    expect(readProviderExecutionTimeoutSnapshot(first.coordinator, first.attempt).settlementSlotState).toBe("PROVIDER_SETTLED_FIRST");
    expect(readProviderExecutionTimeoutSnapshot(second.coordinator, second.attempt).settlementSlotState).toBe("TIMEOUT_WON");
  });

  it("performs cleanup exactly once and makes duplicate cleanup harmless", () => {
    const run = started();
    cleanupProviderExecutionTimeoutAttempt(run.coordinator, run.attempt);
    cleanupProviderExecutionTimeoutAttempt(run.coordinator, run.attempt);
    expect(run.scheduler.cleanup).toHaveBeenCalledTimes(1);
    expect(readProviderExecutionTimeoutSnapshot(run.coordinator, run.attempt).cleanupCallCount).toBe(1);
  });

  it("fails closed when cleanup throws without exposing raw errors", () => {
    const callbacks: Array<() => void> = [];
    const schedule = vi.fn((_delayMs: number, callback: () => void) => {
      callbacks.push(callback);
      return { id: 1 };
    });
    const runtimeResult = buildProviderTimeoutSchedulerRuntime({
      schedule,
      cleanup: vi.fn(() => {
        throw new Error("Authorization Bearer secret");
      }),
    });
    expect(runtimeResult.valid).toBe(true);
    if (!runtimeResult.valid) return;
    const owner = coordinator(runtimeResult.runtime);
    const attemptResult = startProviderExecutionTimeoutAttempt(owner.coordinator, input());
    expect(attemptResult.valid).toBe(true);
    if (!attemptResult.valid) return;
    const result = markProviderExecutionTimeoutProviderSettled(owner.coordinator, attemptResult.attempt, "SUCCESS");
    expect(result.valid).toBe(false);
    expect(JSON.stringify(result)).not.toContain("Authorization");
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("keeps cleanup at-most-once even when the first cleanup call throws", () => {
    const callbacks: Array<() => void> = [];
    const cleanup = vi.fn(() => {
      throw new Error("Authorization Bearer secret cleanup failure");
    });
    const runtimeResult = buildProviderTimeoutSchedulerRuntime({
      schedule: vi.fn((_delayMs: number, callback: () => void) => {
        callbacks.push(callback);
        return { id: callbacks.length };
      }),
      cleanup,
    });
    expect(runtimeResult.valid).toBe(true);
    if (!runtimeResult.valid) return;
    const owner = coordinator(runtimeResult.runtime);
    const first = startProviderExecutionTimeoutAttempt(owner.coordinator, input());
    expect(first.valid).toBe(true);
    if (!first.valid || !first.providerMayStart) return;

    const firstCleanup = cleanupProviderExecutionTimeoutAttempt(owner.coordinator, first.attempt);
    expectExactSnapshot(firstCleanup);
    expect(firstCleanup).toMatchObject({
      valid: false,
      settlementSlotState: "CONTRACT_ERROR",
      cleanupPerformed: false,
      cleanupCallCount: 1,
      abortCallCount: 0,
      reasonCode: "PROVIDER_TIMEOUT_CONTRACT_ERROR",
    });
    cleanupProviderExecutionTimeoutAttempt(owner.coordinator, first.attempt);
    const thirdCleanup = cleanupProviderExecutionTimeoutAttempt(owner.coordinator, first.attempt);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(thirdCleanup).toMatchObject({
      valid: false,
      settlementSlotState: "CONTRACT_ERROR",
      cleanupPerformed: false,
      cleanupCallCount: 1,
    });

    callbacks[0]();
    const afterCallback = readProviderExecutionTimeoutSnapshot(owner.coordinator, first.attempt);
    expect(afterCallback).toMatchObject({
      settlementSlotState: "CONTRACT_ERROR",
      abortCallCount: 0,
      cleanupCallCount: 1,
    });

    const afterSuccess = markProviderExecutionTimeoutProviderSettled(owner.coordinator, first.attempt, "SUCCESS");
    const afterFailure = markProviderExecutionTimeoutProviderSettled(owner.coordinator, first.attempt, "FAILURE");
    expect(afterSuccess.settlementSlotState).toBe("CONTRACT_ERROR");
    expect(afterFailure.settlementSlotState).toBe("CONTRACT_ERROR");
    expect(cleanup).toHaveBeenCalledTimes(1);

    const second = startProviderExecutionTimeoutAttempt(owner.coordinator, input({ requestId: "timeout-request-2" }));
    expect(second.valid).toBe(true);
    if (!second.valid || !second.providerMayStart) return;
    cleanupProviderExecutionTimeoutAttempt(owner.coordinator, second.attempt);
    cleanupProviderExecutionTimeoutAttempt(owner.coordinator, second.attempt);
    expect(cleanup).toHaveBeenCalledTimes(2);

    const serialized = JSON.stringify([firstCleanup, thirdCleanup, afterCallback, afterSuccess, afterFailure]);
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("Bearer");
    expect(serialized).not.toContain("secret");
  });

  it("fails closed when timeout callback cleanup throws while preserving the abort audit", () => {
    const callbacks: Array<() => void> = [];
    const runtimeResult = buildProviderTimeoutSchedulerRuntime({
      schedule: vi.fn((_delayMs: number, callback: () => void) => {
        callbacks.push(callback);
        return { id: 1 };
      }),
      cleanup: vi.fn(() => {
        throw new Error("Authorization Bearer secret cleanup failure");
      }),
    });
    expect(runtimeResult.valid).toBe(true);
    if (!runtimeResult.valid) return;
    const owner = coordinator(runtimeResult.runtime);
    const attemptResult = startProviderExecutionTimeoutAttempt(owner.coordinator, input());
    expect(attemptResult.valid).toBe(true);
    if (!attemptResult.valid) return;

    callbacks[0]();
    const result = readProviderExecutionTimeoutSnapshot(owner.coordinator, attemptResult.attempt);
    expect(result).toMatchObject({
      valid: false,
      settlementSlotState: "CONTRACT_ERROR",
      authoritativeOutcomeKind: "COORDINATOR_CONTRACT_ERROR",
      abortCallCount: 1,
      retryMayProceed: false,
      jobShouldPause: true,
      manualReviewRequired: true,
      reasonCode: "PROVIDER_TIMEOUT_CONTRACT_ERROR",
    });
    expect(JSON.stringify(result)).not.toContain("Authorization");
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("makes stale callbacks no-op after explicit cleanup", () => {
    const run = started();
    const cleaned = cleanupProviderExecutionTimeoutAttempt(run.coordinator, run.attempt);
    expect(cleaned).toMatchObject({
      settlementSlotState: "OPEN",
      cleanupCallCount: 1,
      abortCallCount: 0,
    });

    run.scheduler.callbacks[0]();
    const result = readProviderExecutionTimeoutSnapshot(run.coordinator, run.attempt);
    expect(result).toMatchObject({
      settlementSlotState: "OPEN",
      authoritativeOutcomeKind: "NONE",
      abortCallCount: 0,
      cleanupCallCount: 1,
    });
  });

  it("does not let stale callbacks mutate state after cleanup failure", () => {
    const callbacks: Array<() => void> = [];
    const runtimeResult = buildProviderTimeoutSchedulerRuntime({
      schedule: vi.fn((_delayMs: number, callback: () => void) => {
        callbacks.push(callback);
        return { id: 1 };
      }),
      cleanup: vi.fn(() => {
        throw new Error("secret cleanup failure");
      }),
    });
    expect(runtimeResult.valid).toBe(true);
    if (!runtimeResult.valid) return;
    const owner = coordinator(runtimeResult.runtime);
    const attemptResult = startProviderExecutionTimeoutAttempt(owner.coordinator, input());
    expect(attemptResult.valid).toBe(true);
    if (!attemptResult.valid) return;

    const cleaned = cleanupProviderExecutionTimeoutAttempt(owner.coordinator, attemptResult.attempt);
    callbacks[0]();
    const result = readProviderExecutionTimeoutSnapshot(owner.coordinator, attemptResult.attempt);
    expect(cleaned.valid).toBe(false);
    expect(result).toMatchObject({
      valid: false,
      settlementSlotState: "CONTRACT_ERROR",
      authoritativeOutcomeKind: "COORDINATOR_CONTRACT_ERROR",
      abortCallCount: 0,
      timeoutFired: false,
    });
  });

  it("handles synchronous scheduler callbacks after handle registration with one abort and one cleanup", () => {
    const cleanup = vi.fn();
    const handle = { id: 1 };
    const runtimeResult = buildProviderTimeoutSchedulerRuntime({
      schedule: vi.fn((_delayMs: number, callback: () => void) => {
        callback();
        return handle;
      }),
      cleanup,
    });
    expect(runtimeResult.valid).toBe(true);
    if (!runtimeResult.valid) return;
    const owner = coordinator(runtimeResult.runtime);
    const attemptResult = startProviderExecutionTimeoutAttempt(owner.coordinator, input());
    expect(attemptResult.valid).toBe(true);
    if (!attemptResult.valid) return;
    expect(attemptResult.providerMayStart).toBe(false);
    expect(attemptResult.snapshot).toMatchObject({
      settlementSlotState: "TIMEOUT_WON",
      authoritativeOutcomeKind: "CANCELLATION_REQUESTED",
      abortCallCount: 1,
      cleanupCallCount: 1,
    });
    expect(attemptResult.reasonCode).toBe("PROVIDER_TIMEOUT_WON_DURING_REGISTRATION");
    expect(attemptResult.failClosed).toBe(true);
    expect(cleanup).toHaveBeenCalledExactlyOnceWith(handle);
  });

  it("keeps synchronous duplicate callbacks to one abort and one cleanup", () => {
    const cleanup = vi.fn();
    const handle = { id: 1 };
    const runtimeResult = buildProviderTimeoutSchedulerRuntime({
      schedule: vi.fn((_delayMs: number, callback: () => void) => {
        callback();
        callback();
        return handle;
      }),
      cleanup,
    });
    expect(runtimeResult.valid).toBe(true);
    if (!runtimeResult.valid) return;
    const owner = coordinator(runtimeResult.runtime);
    const attemptResult = startProviderExecutionTimeoutAttempt(owner.coordinator, input());
    expect(attemptResult.valid).toBe(true);
    if (!attemptResult.valid) return;
    expect(attemptResult.providerMayStart).toBe(false);
    expect(attemptResult.snapshot.abortCallCount).toBe(1);
    expect(attemptResult.snapshot.cleanupCallCount).toBe(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("preserves synchronous timeout audit when cleanup throws during registration", () => {
    const cleanup = vi.fn(() => {
      throw new Error("Authorization Bearer secret cleanup failure");
    });
    const handle = { id: 1 };
    const runtimeResult = buildProviderTimeoutSchedulerRuntime({
      schedule: vi.fn((_delayMs: number, callback: () => void) => {
        callback();
        return handle;
      }),
      cleanup,
    });
    expect(runtimeResult.valid).toBe(true);
    if (!runtimeResult.valid) return;
    const owner = coordinator(runtimeResult.runtime);
    const result = startProviderExecutionTimeoutAttempt(owner.coordinator, input());
    expect(result).toMatchObject({
      valid: false,
      providerMayStart: false,
      failClosed: true,
      settlementSlotState: "CONTRACT_ERROR",
      authoritativeOutcomeKind: "COORDINATOR_CONTRACT_ERROR",
      timeoutFired: true,
      abortRequested: true,
      abortCallCount: 1,
      signalAborted: true,
      cleanupPerformed: false,
      cleanupCallCount: 1,
      retryMayProceed: false,
      jobShouldPause: true,
      manualReviewRequired: true,
    });
    expect(result.snapshot).toMatchObject({
      valid: false,
      settlementSlotState: "CONTRACT_ERROR",
      authoritativeOutcomeKind: "COORDINATOR_CONTRACT_ERROR",
      timeoutFired: true,
      abortRequested: true,
      abortCallCount: 1,
      signalAborted: true,
      cleanupPerformed: false,
      cleanupCallCount: 1,
      retryMayProceed: false,
      jobShouldPause: true,
      manualReviewRequired: true,
    });
    expect(JSON.stringify(result)).not.toContain("Authorization");
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("fails closed when schedule throws after invoking the callback without exposing raw errors", () => {
    const runtimeResult = buildProviderTimeoutSchedulerRuntime({
      schedule: vi.fn((_delayMs: number, callback: () => void) => {
        callback();
        throw new Error("Authorization Bearer secret schedule failure");
      }),
      cleanup: vi.fn(),
    });
    expect(runtimeResult.valid).toBe(true);
    if (!runtimeResult.valid) return;
    const owner = coordinator(runtimeResult.runtime);
    const result = startProviderExecutionTimeoutAttempt(owner.coordinator, input());
    expect(result.valid).toBe(false);
    expect(result.providerMayStart).toBe(false);
    expect(result.snapshot).not.toBeNull();
    expect(result.snapshot).toMatchObject({
      valid: false,
      settlementSlotState: "CONTRACT_ERROR",
      authoritativeOutcomeKind: "COORDINATOR_CONTRACT_ERROR",
      timeoutFired: false,
      abortRequested: false,
      abortCallCount: 0,
    });
    expect(JSON.stringify(result)).not.toContain("Authorization");
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("keeps synchronous callback authority isolated across coordinators", () => {
    const first = started();
    const cleanup = vi.fn();
    const runtimeResult = buildProviderTimeoutSchedulerRuntime({
      schedule: vi.fn((_delayMs: number, callback: () => void) => {
        callback();
        return { id: 2 };
      }),
      cleanup,
    });
    expect(runtimeResult.valid).toBe(true);
    if (!runtimeResult.valid) return;
    const secondOwner = coordinator(runtimeResult.runtime);
    const second = startProviderExecutionTimeoutAttempt(secondOwner.coordinator, input({ requestId: "timeout-request-2" }));
    expect(second.valid).toBe(true);
    const firstSnapshot = readProviderExecutionTimeoutSnapshot(first.coordinator, first.attempt);
    expect(firstSnapshot.settlementSlotState).toBe("OPEN");
    expect(firstSnapshot.abortCallCount).toBe(0);
  });

  it("rejects malformed transitions and raw settlement values fail closed", () => {
    const run = started();
    const result = markProviderExecutionTimeoutProviderSettled(run.coordinator, run.attempt, "raw error");
    expect(result.valid).toBe(false);
    expect(result.settlementSlotState).toBe("CONTRACT_ERROR");
    expect(result.authoritativeOutcomeKind).toBe("COORDINATOR_CONTRACT_ERROR");
    expect(result.retryMayProceed).toBe(false);
    expect(result.jobShouldPause).toBe(true);
    expect(result.manualReviewRequired).toBe(true);
    expect(JSON.stringify(result)).not.toContain("raw error");
  });

  it("turns a valid attempt with malformed settlement into sticky contract error", () => {
    const run = started();
    const malformed = markProviderExecutionTimeoutProviderSettled(
      run.coordinator,
      run.attempt,
      "Authorization Bearer raw settlement secret",
    );
    expectExactSnapshot(malformed);
    expect(malformed).toMatchObject({
      valid: false,
      settlementSlotState: "CONTRACT_ERROR",
      authoritativeOutcomeKind: "COORDINATOR_CONTRACT_ERROR",
      retryMayProceed: false,
      jobShouldPause: true,
      manualReviewRequired: true,
      abortCallCount: 0,
      cleanupCallCount: 1,
    });
    expect(run.scheduler.cleanup).toHaveBeenCalledExactlyOnceWith(run.scheduler.handles[0]);

    run.scheduler.callbacks[0]();
    const afterCallback = readProviderExecutionTimeoutSnapshot(run.coordinator, run.attempt);
    expectExactSnapshot(afterCallback);
    expect(afterCallback).toMatchObject({
      valid: false,
      settlementSlotState: "CONTRACT_ERROR",
      authoritativeOutcomeKind: "COORDINATOR_CONTRACT_ERROR",
      abortCallCount: 0,
      cleanupCallCount: 1,
    });

    const afterSuccess = markProviderExecutionTimeoutProviderSettled(run.coordinator, run.attempt, "SUCCESS");
    const afterFailure = markProviderExecutionTimeoutProviderSettled(run.coordinator, run.attempt, "FAILURE");
    expect(afterSuccess.settlementSlotState).toBe("CONTRACT_ERROR");
    expect(afterFailure.settlementSlotState).toBe("CONTRACT_ERROR");
    expect(run.scheduler.cleanup).toHaveBeenCalledTimes(1);
    const serialized = JSON.stringify([malformed, afterCallback, afterSuccess, afterFailure]);
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("Bearer");
    expect(serialized).not.toContain("secret");
  });

  it("snapshots source input and is not affected by later mutation", () => {
    const run = coordinator();
    const source: {
      requestId: string;
      capability: string;
      providerId: string;
      requestTimeoutMs: number | null;
    } = input({ requestTimeoutMs: 1000 });
    const result = startProviderExecutionTimeoutAttempt(run.coordinator, source);
    source.requestTimeoutMs = null;
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.snapshot.requestTimeoutMs).toBe(1000);
    expect(run.scheduler!.schedule).toHaveBeenCalledTimes(1);
  });

  it("blocks getter, Proxy, inherited, and extra fields in attempt input", () => {
    const run = coordinator();
    const getter = { requestId: "timeout-request-1", capability: "medical_source_fetch", providerId: "cdc-safe-fetch" };
    Object.defineProperty(getter, "requestTimeoutMs", { get: () => 1000, enumerable: true });
    expect(startProviderExecutionTimeoutAttempt(run.coordinator, getter).valid).toBe(false);
    expect(startProviderExecutionTimeoutAttempt(run.coordinator, { ...input(), extra: "secret" }).valid).toBe(false);
    const inherited = Object.create({ requestId: "timeout-request-1" });
    inherited.capability = "medical_source_fetch";
    inherited.providerId = "cdc-safe-fetch";
    inherited.requestTimeoutMs = 1000;
    expect(startProviderExecutionTimeoutAttempt(run.coordinator, inherited).valid).toBe(false);
    const proxy = new Proxy(input(), {
      getOwnPropertyDescriptor(target, property) {
        if (property === "requestTimeoutMs") {
          return { value: 1000, enumerable: true, configurable: true, writable: true };
        }
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
      get(_target, property) {
        if (property === "requestTimeoutMs") return null;
        return Reflect.get(input(), property);
      },
    });
    const proxyResult = startProviderExecutionTimeoutAttempt(run.coordinator, proxy);
    expect(proxyResult.valid).toBe(true);
    if (proxyResult.valid) expect(proxyResult.snapshot.requestTimeoutMs).toBe(1000);
  });

  it("snapshots attempt input descriptors exactly once and never uses get traps", () => {
    const run = coordinator();
    const getTrap = vi.fn();
    let ownKeysCount = 0;
    const descriptorCounts = new Map<PropertyKey, number>();
    const source = input();
    const proxy = new Proxy(source, {
      ownKeys(target) {
        ownKeysCount += 1;
        return Reflect.ownKeys(target);
      },
      get(target, property, receiver) {
        getTrap(property);
        return Reflect.get(target, property, receiver);
      },
      getOwnPropertyDescriptor(target, property) {
        descriptorCounts.set(property, (descriptorCounts.get(property) ?? 0) + 1);
        if (property === "requestTimeoutMs" && descriptorCounts.get(property)! > 1) {
          return { value: null, enumerable: true, configurable: true, writable: true };
        }
        if (property === "requestId" && descriptorCounts.get(property)! > 1) {
          return { value: "timeout-request-mutated", enumerable: true, configurable: true, writable: true };
        }
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
    });

    const result = startProviderExecutionTimeoutAttempt(run.coordinator, proxy);
    expect(result.valid).toBe(true);
    expect(ownKeysCount).toBe(1);
    expect(descriptorCounts.get("requestId")).toBe(1);
    expect(descriptorCounts.get("capability")).toBe(1);
    expect(descriptorCounts.get("providerId")).toBe(1);
    expect(descriptorCounts.get("requestTimeoutMs")).toBe(1);
    expect(getTrap).not.toHaveBeenCalled();
    if (result.valid) {
      expect(result.snapshot.requestId).toBe("timeout-request-1");
      expect(result.snapshot.requestTimeoutMs).toBe(1000);
    }
    expect(run.scheduler!.schedule).toHaveBeenCalledExactlyOnceWith(1000, expect.any(Function));
  });

  it("rejects invalid requestTimeoutMs values and avoids scheduler registration", () => {
    for (const requestTimeoutMs of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 120_001]) {
      const run = coordinator();
      expect(startProviderExecutionTimeoutAttempt(run.coordinator, input({ requestTimeoutMs })).valid).toBe(false);
      expect(run.scheduler!.schedule).not.toHaveBeenCalled();
    }
  });

  it("rejects forged attempts and wrong coordinator ownership", () => {
    const run = started();
    const other = started();
    expect(readProviderExecutionTimeoutSnapshot(run.coordinator, Object.freeze({})).valid).toBe(false);
    expect(readProviderExecutionTimeoutSnapshot(other.coordinator, run.attempt).valid).toBe(false);
    expect(markProviderExecutionTimeoutProviderSettled(other.coordinator, run.attempt, "SUCCESS").valid).toBe(false);
  });

  it("returns exact frozen public snapshots without side effects or raw internals", () => {
    const run = started();
    const result = readProviderExecutionTimeoutSnapshot(run.coordinator, run.attempt);
    expectExactSnapshot(result);
    expect(Object.isFrozen(result)).toBe(true);
    expect(result).toMatchObject({
      databaseWritten: false,
      storageUploaded: false,
      publicationTriggered: false,
      notificationSent: false,
      persistable: false,
      publishable: false,
      fallbackExecuted: false,
    });
    const serialized = JSON.stringify(result);
    for (const forbidden of ["AbortController", "scheduler", "callback", "WeakMap", "receipt", "secret", "token"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("returns exact snapshot keys for open, settled, timeout, late, and contract states", () => {
    const open = started();
    expectExactSnapshot(readProviderExecutionTimeoutSnapshot(open.coordinator, open.attempt));

    const settled = started();
    expectExactSnapshot(markProviderExecutionTimeoutProviderSettled(settled.coordinator, settled.attempt, "SUCCESS"));

    const timedOut = started();
    timedOut.scheduler.callbacks[0]();
    expectExactSnapshot(readProviderExecutionTimeoutSnapshot(timedOut.coordinator, timedOut.attempt));

    const late = markProviderExecutionTimeoutProviderSettled(timedOut.coordinator, timedOut.attempt, "FAILURE");
    expectExactSnapshot(late);

    const cleanup = vi.fn(() => {
      throw new Error("secret cleanup failure");
    });
    const callbacks: Array<() => void> = [];
    const runtimeResult = buildProviderTimeoutSchedulerRuntime({
      schedule: vi.fn((_delayMs: number, callback: () => void) => {
        callbacks.push(callback);
        return { id: 1 };
      }),
      cleanup,
    });
    expect(runtimeResult.valid).toBe(true);
    if (!runtimeResult.valid) return;
    const owner = coordinator(runtimeResult.runtime);
    const attemptResult = startProviderExecutionTimeoutAttempt(owner.coordinator, input());
    expect(attemptResult.valid).toBe(true);
    if (!attemptResult.valid || !attemptResult.providerMayStart) return;
    expectExactSnapshot(markProviderExecutionTimeoutProviderSettled(owner.coordinator, attemptResult.attempt, "SUCCESS"));
  });

  it("returns exact snapshot keys for forged, wrong-owner, malformed settlement, and cleanup failures", () => {
    const run = started();
    const forged = readProviderExecutionTimeoutSnapshot(run.coordinator, Object.freeze({}));
    expectExactSnapshot(forged);
    expect(forged).toMatchObject({
      requestId: null,
      capability: null,
      providerId: null,
      timeoutEnabled: false,
      cleanupCallCount: 0,
    });

    const other = started();
    const wrongOwner = readProviderExecutionTimeoutSnapshot(other.coordinator, run.attempt);
    expectExactSnapshot(wrongOwner);
    expect(wrongOwner).toMatchObject({
      requestId: null,
      capability: null,
      providerId: null,
      timeoutEnabled: false,
      cleanupCallCount: 0,
    });
    expectExactSnapshot(markProviderExecutionTimeoutProviderSettled(run.coordinator, run.attempt, "raw settlement secret"));
    expectExactSnapshot(cleanupProviderExecutionTimeoutAttempt(other.coordinator, run.attempt));
  });

  it("keeps attempt start union branches exact and distinct from snapshot results", () => {
    const readyOwner = coordinator();
    const ready = startProviderExecutionTimeoutAttempt(readyOwner.coordinator, input());
    expectExactKeys(ready, expectedStartReadyKeys);
    expect(ready).toMatchObject({ valid: true, providerMayStart: true, failClosed: false });
    if (ready.valid) expectExactSnapshot(ready.snapshot);

    const cleanup = vi.fn();
    const runtimeResult = buildProviderTimeoutSchedulerRuntime({
      schedule: vi.fn((_delayMs: number, callback: () => void) => {
        callback();
        return { id: 1 };
      }),
      cleanup,
    });
    expect(runtimeResult.valid).toBe(true);
    if (!runtimeResult.valid) return;
    const timeoutOwner = coordinator(runtimeResult.runtime);
    const timeout = startProviderExecutionTimeoutAttempt(timeoutOwner.coordinator, input({ requestId: "timeout-request-2" }));
    expectExactKeys(timeout, expectedStartReadyKeys);
    expect(timeout).toMatchObject({
      valid: true,
      providerMayStart: false,
      failClosed: true,
      reasonCode: "PROVIDER_TIMEOUT_WON_DURING_REGISTRATION",
    });
    if (timeout.valid) expectExactSnapshot(timeout.snapshot);

    const failure = startProviderExecutionTimeoutAttempt(readyOwner.coordinator, { ...input(), requestTimeoutMs: 0 });
    expectExactKeys(failure, expectedStartFailureKeys);
    expect(failure).toMatchObject({
      valid: false,
      providerMayStart: false,
      failClosed: true,
      reasonCode: "PROVIDER_TIMEOUT_CONTRACT_ERROR",
    });
  });

  it("does not use forbidden runtime primitives in the coordinator source", () => {
    const source = readFileSync("services/providerExecutionTimeoutCoordinator.ts", "utf8");
    expect(source).not.toContain("setTimeout");
    expect(source).not.toContain("Promise.race");
  });
});
