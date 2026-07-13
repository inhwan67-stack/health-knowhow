import type { RepositoryCommitResult } from "./contentPlatformApplication";
import type {
  ContentPlatformRpcResponse,
  FinalApprovalRpcErrorCode,
  PublicationRpcErrorCode,
} from "../types/content-platform-rpc";

export type ContentPlatformRpcErrorCode = FinalApprovalRpcErrorCode | PublicationRpcErrorCode;

export const RPC_ERROR_TO_APPLICATION_CODE: Record<
  ContentPlatformRpcErrorCode,
  "CONFLICT" | "REPOSITORY_ERROR"
> = {
  CONTENT_UPDATED: "CONFLICT",
  WORKFLOW_CHANGED: "CONFLICT",
  OPERATION_PAYLOAD_MISMATCH: "REPOSITORY_ERROR",
  ENTITY_NOT_FOUND: "REPOSITORY_ERROR",
  ENTITY_RELATION_MISMATCH: "REPOSITORY_ERROR",
  FORBIDDEN: "REPOSITORY_ERROR",
  REVIEW_NOT_APPROVED: "REPOSITORY_ERROR",
  REVISION_NOT_CURRENT: "REPOSITORY_ERROR",
  APPROVAL_NOT_VALID: "REPOSITORY_ERROR",
  PUBLICATION_ALREADY_EXISTS: "REPOSITORY_ERROR",
  INVALID_SCHEDULE: "REPOSITORY_ERROR",
};

export class ContentPlatformRpcError extends Error {
  constructor(
    public readonly code: ContentPlatformRpcErrorCode,
    public readonly operationId: string,
  ) {
    super(`Content platform RPC failed: ${code}`);
    this.name = "ContentPlatformRpcError";
  }
}

/** Maps an RPC response to the existing repository commit contract. */
export function mapRpcResponseToRepositoryCommitResult(
  response: ContentPlatformRpcResponse,
): RepositoryCommitResult {
  if (response.ok) {
    return { status: response.outcome === "replayed" ? "already_committed" : "committed" };
  }
  if (response.code === "CONTENT_UPDATED" || response.code === "WORKFLOW_CHANGED") {
    return { status: "conflict", reason: response.code };
  }
  throw new ContentPlatformRpcError(response.code, response.operationId);
}
