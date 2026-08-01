import { describe, expect, it } from "vitest";

import {
  buildProviderCancellationRetryBoundaryDecision,
  confirmProviderCancellation,
  createProviderCancellationReceipt,
  createProviderCancellationSupervisor,
  markProviderCancellationLifecycleCompletedFailure,
  markProviderCancellationLifecycleCompletedSuccess,
  markProviderCancellationLifecycleFailedBeforeCall,
  markProviderCancellationLifecycleRunning,
  markProviderCancellationSettledAfterRequest,
  markProviderCancellationUnconfirmed,
  requestProviderCancellation,
  startProviderCancellationLifecycle,
  validateProviderCancellationReceiptForRetry,
  type ProviderCancellationLifecycleInput,
  type ValidatedProviderCancellationSupervisor,
} from "./providerCancellationSupervisor";

const baseInput: ProviderCancellationLifecycleInput = Object.freeze({
  requestId: "retry-request-1",
  capability: "medical_source_fetch",
  providerId: "cdc-safe-fetch",
});

function supervisor(): ValidatedProviderCancellationSupervisor {
  return createProviderCancellationSupervisor().supervisor;
}

function startedLifecycle(input: ProviderCancellationLifecycleInput = baseInput) {
  const owner = supervisor();
  const started = startProviderCancellationLifecycle(owner, input);
  expect(started.valid).toBe(true);
  if (!started.valid) throw new Error("expected lifecycle");
  return { supervisor: owner, lifecycle: started.lifecycle };
}

function confirmedCancellation() {
  const run = startedLifecycle();
  expect(markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle).valid).toBe(true);
  expect(requestProviderCancellation(run.supervisor, run.lifecycle).valid).toBe(true);
  const confirmed = confirmProviderCancellation(run.supervisor, run.lifecycle);
  expect(confirmed.valid).toBe(true);
  return run;
}

describe("provider cancellation supervisor", () => {
  it("creates an opaque frozen supervisor", () => {
    const result = createProviderCancellationSupervisor();
    expect(result.valid).toBe(true);
    expect(Object.isFrozen(result.supervisor)).toBe(true);
    expect(JSON.stringify(result.supervisor)).toBe("{}");
    expect(result.reasonCode).toBe("PROVIDER_CANCELLATION_SUPERVISOR_VALID");
  });

  it("rejects direct, cloned, and JSON-restored supervisor objects", () => {
    const fake = Object.freeze({});
    const owner = supervisor();
    const cloned = { ...owner };
    const restored = JSON.parse(JSON.stringify(owner));
    expect(startProviderCancellationLifecycle(fake, baseInput).valid).toBe(false);
    expect(startProviderCancellationLifecycle(cloned, baseInput).valid).toBe(false);
    expect(startProviderCancellationLifecycle(restored, baseInput).valid).toBe(false);
  });

  it("creates an opaque frozen lifecycle", () => {
    const owner = supervisor();
    const result = startProviderCancellationLifecycle(owner, baseInput);
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(Object.isFrozen(result.lifecycle)).toBe(true);
    expect(JSON.stringify(result.lifecycle)).toBe("{}");
    expect(result.state).toBe("NOT_STARTED");
  });

  it("rejects lifecycle clone and JSON restore", () => {
    const run = startedLifecycle();
    expect(markProviderCancellationLifecycleRunning(run.supervisor, { ...run.lifecycle }).valid).toBe(false);
    expect(
      markProviderCancellationLifecycleRunning(run.supervisor, JSON.parse(JSON.stringify(run.lifecycle))).valid,
    ).toBe(false);
  });

  it("allows NOT_STARTED to RUNNING", () => {
    const run = startedLifecycle();
    const result = markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    expect(result.valid).toBe(true);
    expect(result.state).toBe("RUNNING");
  });

  it("blocks Supervisor B from moving Supervisor A lifecycle to RUNNING", () => {
    const run = startedLifecycle();
    const otherSupervisor = supervisor();
    const result = markProviderCancellationLifecycleRunning(otherSupervisor, run.lifecycle);
    expect(result.valid).toBe(false);
    expect(result.reasonCode).toBe("PROVIDER_CANCELLATION_CONTRACT_ERROR");
    expect(result.retryMayProceed).toBe(false);
    expect(result.jobShouldPause).toBe(true);
    expect(result.manualReviewRequired).toBe(true);
  });

  it("blocks Supervisor B from completing or cancelling Supervisor A lifecycle", () => {
    const run = startedLifecycle();
    const otherSupervisor = supervisor();
    markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    expect(markProviderCancellationLifecycleCompletedSuccess(otherSupervisor, run.lifecycle).valid).toBe(false);
    expect(markProviderCancellationLifecycleCompletedFailure(otherSupervisor, run.lifecycle).valid).toBe(false);
    expect(requestProviderCancellation(otherSupervisor, run.lifecycle).valid).toBe(false);
  });

  it("does not mutate lifecycle state after a wrong Supervisor transition", () => {
    const run = startedLifecycle();
    const otherSupervisor = supervisor();
    const rejected = markProviderCancellationLifecycleRunning(otherSupervisor, run.lifecycle);
    expect(rejected.valid).toBe(false);
    const accepted = markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    expect(accepted.valid).toBe(true);
    expect(accepted.state).toBe("RUNNING");
  });

  it("does not corrupt either Supervisor active slot after a wrong Supervisor transition", () => {
    const run = startedLifecycle();
    const otherSupervisor = supervisor();
    expect(markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle).valid).toBe(true);
    expect(requestProviderCancellation(otherSupervisor, run.lifecycle).valid).toBe(false);
    expect(startProviderCancellationLifecycle(run.supervisor, baseInput).valid).toBe(false);
    expect(startProviderCancellationLifecycle(otherSupervisor, baseInput).valid).toBe(true);
  });

  it("allows the owning Supervisor to continue after a wrong Supervisor transition", () => {
    const run = startedLifecycle();
    const otherSupervisor = supervisor();
    expect(markProviderCancellationLifecycleRunning(otherSupervisor, run.lifecycle).valid).toBe(false);
    expect(markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle).valid).toBe(true);
    expect(markProviderCancellationLifecycleCompletedFailure(run.supervisor, run.lifecycle).state).toBe("COMPLETED_FAILURE");
  });

  it("allows RUNNING to COMPLETED_SUCCESS", () => {
    const run = startedLifecycle();
    markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    const result = markProviderCancellationLifecycleCompletedSuccess(run.supervisor, run.lifecycle);
    expect(result.valid).toBe(true);
    expect(result.state).toBe("COMPLETED_SUCCESS");
    expect(result.providerSettled).toBe(true);
  });

  it("allows RUNNING to COMPLETED_FAILURE", () => {
    const run = startedLifecycle();
    markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    const result = markProviderCancellationLifecycleCompletedFailure(run.supervisor, run.lifecycle);
    expect(result.valid).toBe(true);
    expect(result.state).toBe("COMPLETED_FAILURE");
  });

  it("allows NOT_STARTED to FAILED_BEFORE_CALL", () => {
    const run = startedLifecycle();
    const result = markProviderCancellationLifecycleFailedBeforeCall(run.supervisor, run.lifecycle);
    expect(result.valid).toBe(true);
    expect(result.state).toBe("FAILED_BEFORE_CALL");
  });

  it("allows RUNNING to CANCEL_REQUESTED", () => {
    const run = startedLifecycle();
    markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    const result = requestProviderCancellation(run.supervisor, run.lifecycle);
    expect(result.valid).toBe(true);
    expect(result.state).toBe("CANCEL_REQUESTED");
    expect(result.cancellationRequested).toBe(true);
    expect(result.jobShouldPause).toBe(true);
    expect(result.manualReviewRequired).toBe(true);
  });

  it("allows CANCEL_REQUESTED to CANCEL_CONFIRMED", () => {
    const run = confirmedCancellation();
    const receipt = createProviderCancellationReceipt(run.lifecycle);
    expect(receipt.valid).toBe(true);
  });

  it("allows CANCEL_REQUESTED to CANCEL_UNCONFIRMED", () => {
    const run = startedLifecycle();
    markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    requestProviderCancellation(run.supervisor, run.lifecycle);
    const result = markProviderCancellationUnconfirmed(run.supervisor, run.lifecycle);
    expect(result.valid).toBe(true);
    expect(result.state).toBe("CANCEL_UNCONFIRMED");
    expect(result.jobShouldPause).toBe(true);
    expect(result.manualReviewRequired).toBe(true);
  });

  it("allows CANCEL_REQUESTED to SETTLED_AFTER_CANCEL_REQUEST", () => {
    const run = startedLifecycle();
    markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    requestProviderCancellation(run.supervisor, run.lifecycle);
    const result = markProviderCancellationSettledAfterRequest(run.supervisor, run.lifecycle, "SUCCESS");
    expect(result.valid).toBe(true);
    expect(result.state).toBe("SETTLED_AFTER_CANCEL_REQUEST");
    expect(result.jobShouldPause).toBe(true);
    expect(result.manualReviewRequired).toBe(true);
  });

  it("records late success after cancellation request", () => {
    const run = startedLifecycle();
    markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    requestProviderCancellation(run.supervisor, run.lifecycle);
    const result = markProviderCancellationSettledAfterRequest(run.supervisor, run.lifecycle, "SUCCESS");
    expect(result.settlementKind).toBe("SETTLED_SUCCESS_AFTER_CANCEL_REQUEST");
  });

  it("records late failure after cancellation request", () => {
    const run = startedLifecycle();
    markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    requestProviderCancellation(run.supervisor, run.lifecycle);
    const result = markProviderCancellationSettledAfterRequest(run.supervisor, run.lifecycle, "FAILURE");
    expect(result.settlementKind).toBe("SETTLED_FAILURE_AFTER_CANCEL_REQUEST");
  });

  it("fails closed for invalid lifecycle transitions", () => {
    const run = startedLifecycle();
    const result = confirmProviderCancellation(run.supervisor, run.lifecycle);
    expect(result.valid).toBe(false);
    expect(result.reasonCode).toBe("PROVIDER_CANCELLATION_INVALID_LIFECYCLE_TRANSITION");
    expect(result.jobShouldPause).toBe(true);
    expect(result.manualReviewRequired).toBe(true);
  });

  it("blocks transitions after terminal states", () => {
    const run = startedLifecycle();
    markProviderCancellationLifecycleFailedBeforeCall(run.supervisor, run.lifecycle);
    const result = markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    expect(result.valid).toBe(false);
  });

  it("blocks duplicate active lifecycle for the same execution key", () => {
    const owner = supervisor();
    const first = startProviderCancellationLifecycle(owner, baseInput);
    expect(first.valid).toBe(true);
    const secondWhileNotStarted = startProviderCancellationLifecycle(owner, baseInput);
    expect(secondWhileNotStarted.valid).toBe(false);
    if (first.valid) markProviderCancellationLifecycleRunning(owner, first.lifecycle);
    const second = startProviderCancellationLifecycle(owner, baseInput);
    expect(second.valid).toBe(false);
    expect(second.reasonCode).toBe("PROVIDER_CANCELLATION_ACTIVE_OVERLAP_BLOCKED");
    expect(second.cancellationRequested).toBe(false);
  });

  it("never allows two lifecycles with the same execution key to run concurrently", () => {
    const owner = supervisor();
    const first = startProviderCancellationLifecycle(owner, baseInput);
    expect(first.valid).toBe(true);
    if (!first.valid) return;
    const second = startProviderCancellationLifecycle(owner, baseInput);
    expect(second.valid).toBe(false);
    expect(markProviderCancellationLifecycleRunning(owner, first.lifecycle).state).toBe("RUNNING");
  });

  it("lets lifecycle B run after lifecycle A safely completes for the same key", () => {
    const owner = supervisor();
    const first = startProviderCancellationLifecycle(owner, baseInput);
    expect(first.valid).toBe(true);
    if (!first.valid) return;
    markProviderCancellationLifecycleRunning(owner, first.lifecycle);
    markProviderCancellationLifecycleCompletedSuccess(owner, first.lifecycle);
    const second = startProviderCancellationLifecycle(owner, baseInput);
    expect(second.valid).toBe(true);
    if (!second.valid) return;
    expect(markProviderCancellationLifecycleRunning(owner, second.lifecycle).state).toBe("RUNNING");
  });

  it("does not let stale lifecycle A damage lifecycle B active slot", () => {
    const owner = supervisor();
    const first = startProviderCancellationLifecycle(owner, baseInput);
    expect(first.valid).toBe(true);
    if (!first.valid) return;
    markProviderCancellationLifecycleRunning(owner, first.lifecycle);
    markProviderCancellationLifecycleCompletedSuccess(owner, first.lifecycle);

    const second = startProviderCancellationLifecycle(owner, baseInput);
    expect(second.valid).toBe(true);
    if (!second.valid) return;
    markProviderCancellationLifecycleRunning(owner, second.lifecycle);

    const staleTransition = markProviderCancellationLifecycleCompletedFailure(owner, first.lifecycle);
    expect(staleTransition.valid).toBe(false);
    const third = startProviderCancellationLifecycle(owner, baseInput);
    expect(third.valid).toBe(false);
    expect(markProviderCancellationLifecycleCompletedFailure(owner, second.lifecycle).state).toBe("COMPLETED_FAILURE");
  });

  it("does not let stale lifecycle invalid transitions corrupt blocked keys", () => {
    const owner = supervisor();
    const first = startProviderCancellationLifecycle(owner, baseInput);
    expect(first.valid).toBe(true);
    if (!first.valid) return;
    markProviderCancellationLifecycleFailedBeforeCall(owner, first.lifecycle);

    const second = startProviderCancellationLifecycle(owner, baseInput);
    expect(second.valid).toBe(true);
    if (!second.valid) return;
    markProviderCancellationLifecycleRunning(owner, second.lifecycle);
    expect(requestProviderCancellation(owner, first.lifecycle).valid).toBe(false);
    expect(markProviderCancellationLifecycleCompletedSuccess(owner, second.lifecycle).state).toBe("COMPLETED_SUCCESS");
    const third = startProviderCancellationLifecycle(owner, baseInput);
    expect(third.valid).toBe(true);
  });

  it("allows a different requestId lifecycle independently", () => {
    const owner = supervisor();
    const first = startProviderCancellationLifecycle(owner, baseInput);
    expect(first.valid).toBe(true);
    if (first.valid) markProviderCancellationLifecycleRunning(owner, first.lifecycle);
    const second = startProviderCancellationLifecycle(owner, { ...baseInput, requestId: "retry-request-2" });
    expect(second.valid).toBe(true);
  });

  it("rejects forged cancellation receipt", () => {
    const run = confirmedCancellation();
    const decision = validateProviderCancellationReceiptForRetry(
      {},
      run.lifecycle,
      baseInput.requestId,
      baseInput.capability,
      baseInput.providerId,
    );
    expect(decision.valid).toBe(false);
  });

  it("rejects cloned cancellation receipt", () => {
    const run = confirmedCancellation();
    const receipt = createProviderCancellationReceipt(run.lifecycle);
    expect(receipt.valid).toBe(true);
    if (!receipt.valid) return;
    expect(
      validateProviderCancellationReceiptForRetry(
        { ...receipt.receipt },
        run.lifecycle,
        baseInput.requestId,
        baseInput.capability,
        baseInput.providerId,
      ).valid,
    ).toBe(false);
  });

  it("rejects JSON-restored cancellation receipt", () => {
    const run = confirmedCancellation();
    const receipt = createProviderCancellationReceipt(run.lifecycle);
    expect(receipt.valid).toBe(true);
    if (!receipt.valid) return;
    const restored = JSON.parse(JSON.stringify(receipt.receipt));
    expect(
      validateProviderCancellationReceiptForRetry(
        restored,
        run.lifecycle,
        baseInput.requestId,
        baseInput.capability,
        baseInput.providerId,
      ).valid,
    ).toBe(false);
  });

  it("rejects receipt for another requestId, capability, or providerId", () => {
    const run = confirmedCancellation();
    const receipt = createProviderCancellationReceipt(run.lifecycle);
    expect(receipt.valid).toBe(true);
    if (!receipt.valid) return;
    const otherRequest = validateProviderCancellationReceiptForRetry(
      receipt.receipt,
      run.lifecycle,
      "other-request",
      baseInput.capability,
      baseInput.providerId,
    );
    const otherCapability = validateProviderCancellationReceiptForRetry(
      receipt.receipt,
      run.lifecycle,
      baseInput.requestId,
      "notification",
      baseInput.providerId,
    );
    const otherProvider = validateProviderCancellationReceiptForRetry(
      receipt.receipt,
      run.lifecycle,
      baseInput.requestId,
      baseInput.capability,
      "canonical-preview",
    );
    expect(otherRequest.valid).toBe(false);
    expect(otherCapability.valid).toBe(false);
    expect(otherProvider.valid).toBe(false);
    for (const result of [otherRequest, otherCapability, otherProvider]) {
      expect(result.requestId).toBeNull();
      expect(result.capability).toBeNull();
      expect(result.providerId).toBeNull();
    }
  });

  it("rejects Lifecycle A receipt when validating against Lifecycle B with the same identifiers", () => {
    const owner = supervisor();
    const lifecycleA = startProviderCancellationLifecycle(owner, baseInput);
    expect(lifecycleA.valid).toBe(true);
    if (!lifecycleA.valid) return;
    markProviderCancellationLifecycleRunning(owner, lifecycleA.lifecycle);
    requestProviderCancellation(owner, lifecycleA.lifecycle);
    confirmProviderCancellation(owner, lifecycleA.lifecycle);
    const receiptA = createProviderCancellationReceipt(lifecycleA.lifecycle);
    expect(receiptA.valid).toBe(true);
    if (!receiptA.valid) return;

    const lifecycleB = startProviderCancellationLifecycle(owner, baseInput);
    expect(lifecycleB.valid).toBe(true);
    if (!lifecycleB.valid) return;
    const replay = validateProviderCancellationReceiptForRetry(
      receiptA.receipt,
      lifecycleB.lifecycle,
      baseInput.requestId,
      baseInput.capability,
      baseInput.providerId,
    );
    expect(replay.valid).toBe(false);
    expect(replay.requestId).toBeNull();
    expect(replay.capability).toBeNull();
    expect(replay.providerId).toBeNull();
  });

  it("validates Lifecycle A receipt only with Lifecycle A", () => {
    const run = confirmedCancellation();
    const receipt = createProviderCancellationReceipt(run.lifecycle);
    expect(receipt.valid).toBe(true);
    if (!receipt.valid) return;
    const result = validateProviderCancellationReceiptForRetry(
      receipt.receipt,
      run.lifecycle,
      baseInput.requestId,
      baseInput.capability,
      baseInput.providerId,
    );
    expect(result.valid).toBe(true);
  });

  it("does not expose malicious forged receipt validation identifiers", () => {
    const result = validateProviderCancellationReceiptForRetry(
      {},
      {},
      "Authorization Bearer secret https://evil.example",
      baseInput.capability,
      baseInput.providerId,
    );
    expect(result.valid).toBe(false);
    expect(result.requestId).toBeNull();
    expect(result.capability).toBeNull();
    expect(result.providerId).toBeNull();
    expect(result.retryMayProceed).toBe(false);
    expect(JSON.stringify(result)).not.toContain("Authorization Bearer secret https://evil.example");
  });

  it("keeps invalid transition cancellationRequested aligned with actual lifecycle state", () => {
    const run = startedLifecycle();
    markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    requestProviderCancellation(run.supervisor, run.lifecycle);
    const invalid = markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    expect(invalid.valid).toBe(false);
    expect(invalid.cancellationRequested).toBe(true);
  });

  it("preserves metadata when invalid settlement forces CONTRACT_ERROR after cancellation request", () => {
    const run = startedLifecycle();
    markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    requestProviderCancellation(run.supervisor, run.lifecycle);
    const result = markProviderCancellationSettledAfterRequest(run.supervisor, run.lifecycle, "UNKNOWN" as "SUCCESS");
    expect(result.valid).toBe(false);
    expect(result.state).toBe("CONTRACT_ERROR");
    expect(result.requestId).toBe(baseInput.requestId);
    expect(result.capability).toBe(baseInput.capability);
    expect(result.providerId).toBe(baseInput.providerId);
    expect(result.cancellationRequested).toBe(true);
    expect(result.providerSettled).toBe(false);
    expect(result.settlementKind).toBeNull();
    expect(result.jobShouldPause).toBe(true);
    expect(result.manualReviewRequired).toBe(true);
  });

  it("blocks receipt creation for a non-confirmed lifecycle", () => {
    const run = startedLifecycle();
    markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    expect(createProviderCancellationReceipt(run.lifecycle).valid).toBe(false);
  });

  it("allows cancellation retry boundary only with trusted receipt", () => {
    const run = confirmedCancellation();
    const receipt = createProviderCancellationReceipt(run.lifecycle);
    expect(receipt.valid).toBe(true);
    if (!receipt.valid) return;
    const decision = buildProviderCancellationRetryBoundaryDecision(run.lifecycle, receipt.receipt);
    expect(decision.retryMayProceed).toBe(true);
    expect(decision.reasonCode).toBe("PROVIDER_CANCELLATION_RETRY_BOUNDARY_SATISFIED");
  });

  it("blocks retry boundary for RUNNING", () => {
    const run = startedLifecycle();
    markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    expect(buildProviderCancellationRetryBoundaryDecision(run.lifecycle).retryMayProceed).toBe(false);
  });

  it("blocks retry boundary for CANCEL_REQUESTED", () => {
    const run = startedLifecycle();
    markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    requestProviderCancellation(run.supervisor, run.lifecycle);
    expect(buildProviderCancellationRetryBoundaryDecision(run.lifecycle).reasonCode).toBe(
      "PROVIDER_CANCELLATION_RETRY_BLOCKED_BY_ACTIVE_EXECUTION",
    );
  });

  it("blocks retry boundary for CANCEL_UNCONFIRMED", () => {
    const run = startedLifecycle();
    markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    requestProviderCancellation(run.supervisor, run.lifecycle);
    markProviderCancellationUnconfirmed(run.supervisor, run.lifecycle);
    expect(buildProviderCancellationRetryBoundaryDecision(run.lifecycle).reasonCode).toBe(
      "PROVIDER_CANCELLATION_RETRY_BLOCKED_BY_UNCONFIRMED_CANCELLATION",
    );
  });

  it("blocks retry boundary for SETTLED_AFTER_CANCEL_REQUEST", () => {
    const run = startedLifecycle();
    markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    requestProviderCancellation(run.supervisor, run.lifecycle);
    markProviderCancellationSettledAfterRequest(run.supervisor, run.lifecycle, "FAILURE");
    expect(buildProviderCancellationRetryBoundaryDecision(run.lifecycle).reasonCode).toBe(
      "PROVIDER_CANCELLATION_RETRY_BLOCKED_BY_LATE_SETTLEMENT",
    );
  });

  it("allows retry boundary for COMPLETED_FAILURE", () => {
    const run = startedLifecycle();
    markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    markProviderCancellationLifecycleCompletedFailure(run.supervisor, run.lifecycle);
    expect(buildProviderCancellationRetryBoundaryDecision(run.lifecycle).retryMayProceed).toBe(true);
  });

  it("blocks stale COMPLETED_FAILURE boundary while Lifecycle B with same key is NOT_STARTED", () => {
    const owner = supervisor();
    const lifecycleA = startProviderCancellationLifecycle(owner, baseInput);
    expect(lifecycleA.valid).toBe(true);
    if (!lifecycleA.valid) return;
    markProviderCancellationLifecycleRunning(owner, lifecycleA.lifecycle);
    markProviderCancellationLifecycleCompletedFailure(owner, lifecycleA.lifecycle);
    const lifecycleB = startProviderCancellationLifecycle(owner, baseInput);
    expect(lifecycleB.valid).toBe(true);
    if (!lifecycleB.valid) return;
    const staleBoundary = buildProviderCancellationRetryBoundaryDecision(lifecycleA.lifecycle);
    expect(staleBoundary.valid).toBe(false);
    expect(staleBoundary.reasonCode).toBe("PROVIDER_CANCELLATION_RETRY_BLOCKED_BY_ACTIVE_EXECUTION");
    expect(staleBoundary.retryMayProceed).toBe(false);
  });

  it("blocks stale COMPLETED_FAILURE boundary while Lifecycle B with same key is RUNNING", () => {
    const owner = supervisor();
    const lifecycleA = startProviderCancellationLifecycle(owner, baseInput);
    expect(lifecycleA.valid).toBe(true);
    if (!lifecycleA.valid) return;
    markProviderCancellationLifecycleRunning(owner, lifecycleA.lifecycle);
    markProviderCancellationLifecycleCompletedFailure(owner, lifecycleA.lifecycle);
    const lifecycleB = startProviderCancellationLifecycle(owner, baseInput);
    expect(lifecycleB.valid).toBe(true);
    if (!lifecycleB.valid) return;
    markProviderCancellationLifecycleRunning(owner, lifecycleB.lifecycle);
    const staleBoundary = buildProviderCancellationRetryBoundaryDecision(lifecycleA.lifecycle);
    expect(staleBoundary.valid).toBe(false);
    const third = startProviderCancellationLifecycle(owner, baseInput);
    expect(third.valid).toBe(false);
  });

  it("keeps Lifecycle B active slot unchanged during stale boundary checks and preserves B boundary after completion", () => {
    const owner = supervisor();
    const lifecycleA = startProviderCancellationLifecycle(owner, baseInput);
    expect(lifecycleA.valid).toBe(true);
    if (!lifecycleA.valid) return;
    markProviderCancellationLifecycleRunning(owner, lifecycleA.lifecycle);
    markProviderCancellationLifecycleCompletedFailure(owner, lifecycleA.lifecycle);
    const lifecycleB = startProviderCancellationLifecycle(owner, baseInput);
    expect(lifecycleB.valid).toBe(true);
    if (!lifecycleB.valid) return;
    markProviderCancellationLifecycleRunning(owner, lifecycleB.lifecycle);
    expect(buildProviderCancellationRetryBoundaryDecision(lifecycleA.lifecycle).valid).toBe(false);
    expect(startProviderCancellationLifecycle(owner, baseInput).valid).toBe(false);
    markProviderCancellationLifecycleCompletedFailure(owner, lifecycleB.lifecycle);
    const boundaryB = buildProviderCancellationRetryBoundaryDecision(lifecycleB.lifecycle);
    expect(boundaryB.valid).toBe(true);
    expect(boundaryB.retryMayProceed).toBe(true);
  });

  it("blocks stale CANCEL_CONFIRMED receipt boundary when Lifecycle B with same key is active", () => {
    const owner = supervisor();
    const lifecycleA = startProviderCancellationLifecycle(owner, baseInput);
    expect(lifecycleA.valid).toBe(true);
    if (!lifecycleA.valid) return;
    markProviderCancellationLifecycleRunning(owner, lifecycleA.lifecycle);
    requestProviderCancellation(owner, lifecycleA.lifecycle);
    confirmProviderCancellation(owner, lifecycleA.lifecycle);
    const receiptA = createProviderCancellationReceipt(lifecycleA.lifecycle);
    expect(receiptA.valid).toBe(true);
    if (!receiptA.valid) return;
    const lifecycleB = startProviderCancellationLifecycle(owner, baseInput);
    expect(lifecycleB.valid).toBe(true);
    if (!lifecycleB.valid) return;
    const staleBoundary = buildProviderCancellationRetryBoundaryDecision(lifecycleA.lifecycle, receiptA.receipt);
    expect(staleBoundary.valid).toBe(false);
    expect(staleBoundary.reasonCode).toBe("PROVIDER_CANCELLATION_RETRY_BLOCKED_BY_ACTIVE_EXECUTION");
  });

  it("allows retry boundary for FAILED_BEFORE_CALL", () => {
    const run = startedLifecycle();
    markProviderCancellationLifecycleFailedBeforeCall(run.supervisor, run.lifecycle);
    expect(buildProviderCancellationRetryBoundaryDecision(run.lifecycle).retryMayProceed).toBe(true);
  });

  it("treats COMPLETED_SUCCESS as safe but not retryable", () => {
    const run = startedLifecycle();
    markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    markProviderCancellationLifecycleCompletedSuccess(run.supervisor, run.lifecycle);
    const decision = buildProviderCancellationRetryBoundaryDecision(run.lifecycle);
    expect(decision.executionBoundarySafe).toBe(true);
    expect(decision.retryMayProceed).toBe(false);
    expect(decision.reasonCode).toBe("PROVIDER_CANCELLATION_SEQUENCE_ALREADY_SUCCEEDED");
  });

  it("requires manual review for ambiguous medical cancellation", () => {
    const run = startedLifecycle();
    markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    requestProviderCancellation(run.supervisor, run.lifecycle);
    markProviderCancellationUnconfirmed(run.supervisor, run.lifecycle);
    const decision = buildProviderCancellationRetryBoundaryDecision(run.lifecycle);
    expect(decision.manualReviewRequired).toBe(true);
    expect(decision.jobShouldPause).toBe(true);
  });

  it("keeps non-medical unsafe flags closed without manual medical review", () => {
    const run = startedLifecycle({ ...baseInput, capability: "notification", providerId: "canonical-preview" });
    markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle);
    requestProviderCancellation(run.supervisor, run.lifecycle);
    markProviderCancellationUnconfirmed(run.supervisor, run.lifecycle);
    const decision = buildProviderCancellationRetryBoundaryDecision(run.lifecycle);
    expect(decision.persistable).toBe(false);
    expect(decision.publishable).toBe(false);
    expect(decision.manualReviewRequired).toBe(false);
  });

  it("enforces at most one active provider lifecycle per execution key", () => {
    const owner = supervisor();
    const first = startProviderCancellationLifecycle(owner, baseInput);
    expect(first.valid).toBe(true);
    if (first.valid) markProviderCancellationLifecycleRunning(owner, first.lifecycle);
    const second = startProviderCancellationLifecycle(owner, baseInput);
    expect(second.valid).toBe(false);
  });

  it("sets write side-effect flags false on all lifecycle results", () => {
    const run = startedLifecycle();
    const results = [
      markProviderCancellationLifecycleRunning(run.supervisor, run.lifecycle),
      requestProviderCancellation(run.supervisor, run.lifecycle),
      confirmProviderCancellation(run.supervisor, run.lifecycle),
      buildProviderCancellationRetryBoundaryDecision(run.lifecycle, createProviderCancellationReceipt(run.lifecycle).valid ? createProviderCancellationReceipt(run.lifecycle).receipt : null),
    ];
    for (const result of results) {
      expect(result.databaseWritten).toBe(false);
      expect(result.storageUploaded).toBe(false);
      expect(result.publicationTriggered).toBe(false);
      expect(result.notificationSent).toBe(false);
      expect(result.persistable).toBe(false);
      expect(result.publishable).toBe(false);
      expect(result.fallbackExecuted).toBe(false);
      expect(result.providerExecutionStarted).toBe(false);
    }
  });

  it("does not expose raw error, token, signal, controller, or Promise fields", () => {
    const run = confirmedCancellation();
    const text = JSON.stringify({
      run,
      receipt: createProviderCancellationReceipt(run.lifecycle),
      boundary: buildProviderCancellationRetryBoundaryDecision(run.lifecycle),
    });
    expect(text).not.toMatch(/raw|token|Authorization|apiKey|signal|controller|Promise|secret/i);
  });

  it("fails closed for Proxy ownKeys, get, and descriptor traps", () => {
    const owner = supervisor();
    const ownKeysThrow = new Proxy(baseInput, {
      ownKeys() {
        throw new Error("leak");
      },
    });
    const descriptorThrow = new Proxy(baseInput, {
      getOwnPropertyDescriptor() {
        throw new Error("leak");
      },
    });
    const getTrap = new Proxy(baseInput, {
      get(target, prop, receiver) {
        if (prop === "requestId") throw new Error("leak");
        return Reflect.get(target, prop, receiver);
      },
    });
    expect(startProviderCancellationLifecycle(owner, ownKeysThrow).valid).toBe(false);
    expect(startProviderCancellationLifecycle(owner, descriptorThrow).valid).toBe(false);
    expect(startProviderCancellationLifecycle(owner, getTrap).valid).toBe(true);
  });

  it("blocks symbol, getter, and non-enumerable extra fields", () => {
    const owner = supervisor();
    const withSymbol = { ...baseInput, [Symbol("token")]: "secret" };
    const withGetter = {
      ...baseInput,
      get token() {
        return "secret";
      },
    };
    const withHidden = { ...baseInput };
    Object.defineProperty(withHidden, "token", {
      value: "secret",
      enumerable: false,
      configurable: true,
    });
    expect(startProviderCancellationLifecycle(owner, withSymbol).valid).toBe(false);
    expect(startProviderCancellationLifecycle(owner, withGetter).valid).toBe(false);
    expect(startProviderCancellationLifecycle(owner, withHidden).valid).toBe(false);
  });

  it("rejects secret-like requestIds without exposing them", () => {
    const owner = supervisor();
    for (const requestId of ["secret", "token", "sk-abc123", "service_role", "api_key"]) {
      const result = startProviderCancellationLifecycle(owner, { ...baseInput, requestId });
      expect(result.valid).toBe(false);
      expect(result.requestId).toBeNull();
      expect(JSON.stringify(result)).not.toContain(requestId);
    }
  });

  it("does not mutate input objects", () => {
    const owner = supervisor();
    const input = { ...baseInput };
    const before = JSON.stringify(input);
    startProviderCancellationLifecycle(owner, input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("returns deterministic public decisions for equivalent transitions", () => {
    const first = confirmedCancellation();
    const second = confirmedCancellation();
    const firstPublic = { ...buildProviderCancellationRetryBoundaryDecision(first.lifecycle, createProviderCancellationReceipt(first.lifecycle).valid ? createProviderCancellationReceipt(first.lifecycle).receipt : null), requestId: "same" };
    const secondPublic = { ...buildProviderCancellationRetryBoundaryDecision(second.lifecycle, createProviderCancellationReceipt(second.lifecycle).valid ? createProviderCancellationReceipt(second.lifecycle).receipt : null), requestId: "same" };
    expect(firstPublic).toEqual(secondPublic);
  });
});
