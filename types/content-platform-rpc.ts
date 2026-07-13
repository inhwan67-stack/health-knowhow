import type { ContentWorkflowStatus, IsoDateTime } from "./content-platform";

/**
 * RFC 3339 timestamptz string returned by PostgreSQL/Supabase.
 *
 * OCC callers must return the exact database string without parsing it through
 * JavaScript Date. Date only preserves milliseconds while PostgreSQL may retain
 * microseconds, so parse/serialize round trips can cause false conflicts.
 */
export type RpcTimestamp = IsoDateTime;

export type RpcOperationOutcome = "committed" | "replayed";

export type RpcCommonErrorCode =
  | "CONTENT_UPDATED"
  | "WORKFLOW_CHANGED"
  | "OPERATION_PAYLOAD_MISMATCH"
  | "ENTITY_NOT_FOUND"
  | "ENTITY_RELATION_MISMATCH"
  | "FORBIDDEN";

export type FinalApprovalRpcErrorCode =
  | RpcCommonErrorCode
  | "REVIEW_NOT_APPROVED"
  | "REVISION_NOT_CURRENT";

export type PublicationRpcErrorCode =
  | RpcCommonErrorCode
  | "APPROVAL_NOT_VALID"
  | "PUBLICATION_ALREADY_EXISTS"
  | "INVALID_SCHEDULE";

type RpcOperationRequest = {
  operationId: string;
  /** Deterministic hash of all semantic request fields except this fingerprint. */
  operationFingerprint: string;
  contentId: string;
  revisionId: string;
  expectedContentUpdatedAt: RpcTimestamp;
  createdAt: RpcTimestamp;
};

export type ExecuteFinalApprovalRpcRequest = RpcOperationRequest & {
  reviewId: string;
  approvalId: string;
  comment?: string;
};

export type ExecutePublicationRpcRequest = RpcOperationRequest & {
  approvalId: string;
  publicationId: string;
  mode: "immediate" | "scheduled";
  scheduledAt?: RpcTimestamp;
};

type RpcSuccessResponse<NextStatus extends ContentWorkflowStatus> = {
  ok: true;
  outcome: RpcOperationOutcome;
  operationId: string;
  contentId: string;
  revisionId: string;
  resultEntityId: string;
  nextWorkflowStatus: NextStatus;
  /** New DB value to use as the next OCC token. */
  contentUpdatedAt: RpcTimestamp;
};

export type ExecuteFinalApprovalRpcSuccess = RpcSuccessResponse<"final_approved"> & {
  approvalId: string;
};

export type ExecutePublicationRpcSuccess = RpcSuccessResponse<"published" | "scheduled"> & {
  publicationId: string;
  publicationStatus: "published" | "scheduled";
  scheduledAt?: RpcTimestamp;
  publishedAt?: RpcTimestamp;
};

export type RpcErrorResponse<Code extends string> = {
  ok: false;
  operationId: string;
  code: Code;
};

export type ExecuteFinalApprovalRpcResponse =
  | ExecuteFinalApprovalRpcSuccess
  | RpcErrorResponse<FinalApprovalRpcErrorCode>;

export type ExecutePublicationRpcResponse =
  | ExecutePublicationRpcSuccess
  | RpcErrorResponse<PublicationRpcErrorCode>;

export type ContentPlatformRpcResponse =
  | ExecuteFinalApprovalRpcResponse
  | ExecutePublicationRpcResponse;

/**
 * The database derives the actor from its authenticated session. Actor IDs,
 * roles, and capabilities are deliberately absent from RPC request payloads.
 */
export const RPC_CONTRACT_RULES = {
  timestampFormat: "RFC3339_UTC_DATABASE_VALUE_UNCHANGED",
  fingerprintMismatch: "OPERATION_PAYLOAD_MISMATCH",
  actorSource: "AUTHENTICATED_DATABASE_SESSION",
  minimumSuccessFields: [
    "outcome",
    "operationId",
    "contentId",
    "revisionId",
    "resultEntityId",
    "nextWorkflowStatus",
    "contentUpdatedAt",
  ],
} as const;
