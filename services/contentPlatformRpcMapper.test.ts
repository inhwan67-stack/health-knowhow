import { describe, expect, it } from "vitest";
import type {
  ExecuteFinalApprovalRpcRequest,
  ExecuteFinalApprovalRpcResponse,
  ExecutePublicationRpcRequest,
} from "../types/content-platform-rpc";
import {
  ContentPlatformRpcError,
  RPC_ERROR_TO_APPLICATION_CODE,
  mapRpcResponseToRepositoryCommitResult,
} from "./contentPlatformRpcMapper";

const finalRequest: ExecuteFinalApprovalRpcRequest = {
  operationId: "op-1",
  operationFingerprint: "sha256:approval-payload",
  contentId: "content-1",
  revisionId: "revision-1",
  reviewId: "review-1",
  approvalId: "approval-1",
  expectedContentUpdatedAt: "2026-07-13T00:00:00.123456Z",
  createdAt: "2026-07-13T01:00:00.000000Z",
};

const publicationRequest: ExecutePublicationRpcRequest = {
  operationId: "op-2",
  operationFingerprint: "sha256:publication-payload",
  contentId: "content-1",
  revisionId: "revision-1",
  approvalId: "approval-1",
  publicationId: "publication-1",
  mode: "scheduled",
  scheduledAt: "2026-07-14T00:00:00.000000Z",
  expectedContentUpdatedAt: "2026-07-13T01:00:00.000000Z",
  createdAt: "2026-07-13T01:05:00.000000Z",
};

describe("content platform RPC contract", () => {
  it("requires idempotency and exact OCC fields on both requests", () => {
    expect(finalRequest).toMatchObject({ operationId: "op-1", operationFingerprint: expect.any(String) });
    expect(publicationRequest).toMatchObject({ operationId: "op-2", expectedContentUpdatedAt: expect.any(String) });
  });

  it.each(["committed", "replayed"] as const)("maps %s success", (outcome) => {
    const response: ExecuteFinalApprovalRpcResponse = {
      ok: true,
      outcome,
      operationId: finalRequest.operationId,
      contentId: finalRequest.contentId,
      revisionId: finalRequest.revisionId,
      resultEntityId: finalRequest.approvalId,
      approvalId: finalRequest.approvalId,
      nextWorkflowStatus: "final_approved",
      contentUpdatedAt: "2026-07-13T01:00:00.000000Z",
    };
    expect(mapRpcResponseToRepositoryCommitResult(response)).toEqual({
      status: outcome === "replayed" ? "already_committed" : "committed",
    });
  });

  it.each(["CONTENT_UPDATED", "WORKFLOW_CHANGED"] as const)("maps %s conflict", (code) => {
    expect(mapRpcResponseToRepositoryCommitResult({ ok: false, operationId: "op-1", code })).toEqual({
      status: "conflict",
      reason: code,
    });
  });

  it("throws a typed error for a reused operation with different payload", () => {
    expect(() =>
      mapRpcResponseToRepositoryCommitResult({
        ok: false,
        operationId: "op-1",
        code: "OPERATION_PAYLOAD_MISMATCH",
      }),
    ).toThrowError(ContentPlatformRpcError);
  });

  it("documents current application error mapping without changing the service", () => {
    expect(RPC_ERROR_TO_APPLICATION_CODE.CONTENT_UPDATED).toBe("CONFLICT");
    expect(RPC_ERROR_TO_APPLICATION_CODE.OPERATION_PAYLOAD_MISMATCH).toBe("REPOSITORY_ERROR");
    expect(RPC_ERROR_TO_APPLICATION_CODE.PUBLICATION_ALREADY_EXISTS).toBe("REPOSITORY_ERROR");
  });
});
