import type {
  AdministratorCapability,
  Approval,
  Content,
  ContentWorkflowStatus,
  IsoDateTime,
  Publication,
  Review,
  Revision,
} from "../types/content-platform";
import {
  createFinalApprovalCommand,
  createPublicationCommand,
  type FinalApprovalCommandResult,
  type PublicationCommandResult,
} from "./contentPlatformCommand";
import type { PolicyActor, PublicationCreationMode } from "./contentPlatformPolicy";

export type ContentPlatformEntityName = "content" | "revision" | "review" | "approval";

export type RepositoryCommitResult =
  | { status: "committed" }
  | { status: "already_committed" }
  | { status: "conflict"; reason: "CONTENT_UPDATED" | "WORKFLOW_CHANGED" };

export type RepositoryCommitContext = {
  operationId: string;
  expectedContentUpdatedAt: IsoDateTime;
};

export interface ContentPlatformRepository {
  getContent(id: string): Promise<Content | null>;
  getRevision(id: string): Promise<Revision | null>;
  getReview(id: string): Promise<Review | null>;
  getApproval(id: string): Promise<Approval | null>;
  commitFinalApproval(input: RepositoryCommitContext & {
    approval: Approval;
    contentId: string;
    expectedWorkflowStatus: "final_approval_pending";
    nextWorkflowStatus: "final_approved";
  }): Promise<RepositoryCommitResult>;
  commitPublication(input: RepositoryCommitContext & {
    publication: Publication;
    contentId: string;
    expectedWorkflowStatus: "final_approved";
    nextWorkflowStatus: "published" | "scheduled";
  }): Promise<RepositoryCommitResult>;
}

export type ApplicationResult<T, CommandResult> =
  | { ok: true; value: T; nextWorkflowStatus: ContentWorkflowStatus; replayed: boolean }
  | { ok: false; code: "NOT_FOUND"; entity: ContentPlatformEntityName }
  | { ok: false; code: "COMMAND_REJECTED"; command: CommandResult }
  | { ok: false; code: "CONFLICT"; reason: "CONTENT_UPDATED" | "WORKFLOW_CHANGED" }
  | { ok: false; code: "REPOSITORY_ERROR"; error: unknown };

export type ExecuteFinalApprovalInput = {
  contentId: string;
  revisionId: string;
  reviewId: string;
  actor: PolicyActor;
  capabilities: readonly AdministratorCapability[];
  approvalId: string;
  operationId: string;
  createdAt: IsoDateTime;
  comment?: string;
};

export async function executeFinalApproval(
  repository: ContentPlatformRepository,
  input: ExecuteFinalApprovalInput,
): Promise<ApplicationResult<Approval, FinalApprovalCommandResult>> {
  try {
    const content = await repository.getContent(input.contentId);
    if (!content) return { ok: false, code: "NOT_FOUND", entity: "content" };
    const revision = await repository.getRevision(input.revisionId);
    if (!revision) return { ok: false, code: "NOT_FOUND", entity: "revision" };
    const review = await repository.getReview(input.reviewId);
    if (!review) return { ok: false, code: "NOT_FOUND", entity: "review" };

    const command = createFinalApprovalCommand({ ...input, content, revision, review });
    if (!command.ok) return { ok: false, code: "COMMAND_REJECTED", command };

    const commit = await repository.commitFinalApproval({
      approval: command.approval,
      contentId: content.id,
      operationId: input.operationId,
      expectedContentUpdatedAt: content.updatedAt,
      expectedWorkflowStatus: "final_approval_pending",
      nextWorkflowStatus: command.nextWorkflowStatus,
    });
    if (commit.status === "conflict") return { ok: false, code: "CONFLICT", reason: commit.reason };
    return { ok: true, value: command.approval, nextWorkflowStatus: command.nextWorkflowStatus, replayed: commit.status === "already_committed" };
  } catch (error) {
    return { ok: false, code: "REPOSITORY_ERROR", error };
  }
}

export type ExecutePublicationInput = {
  contentId: string;
  revisionId: string;
  approvalId: string;
  actor: PolicyActor;
  capabilities: readonly AdministratorCapability[];
  mode: PublicationCreationMode;
  publicationId: string;
  operationId: string;
  createdAt: IsoDateTime;
  scheduledAt?: IsoDateTime;
  now: Date;
};

export async function executePublication(
  repository: ContentPlatformRepository,
  input: ExecutePublicationInput,
): Promise<ApplicationResult<Publication, PublicationCommandResult>> {
  try {
    const content = await repository.getContent(input.contentId);
    if (!content) return { ok: false, code: "NOT_FOUND", entity: "content" };
    const revision = await repository.getRevision(input.revisionId);
    if (!revision) return { ok: false, code: "NOT_FOUND", entity: "revision" };
    const approval = await repository.getApproval(input.approvalId);
    if (!approval) return { ok: false, code: "NOT_FOUND", entity: "approval" };

    const command = createPublicationCommand({ ...input, content, revision, approval });
    if (!command.ok) return { ok: false, code: "COMMAND_REJECTED", command };

    const commit = await repository.commitPublication({
      publication: command.publication,
      contentId: content.id,
      operationId: input.operationId,
      expectedContentUpdatedAt: content.updatedAt,
      expectedWorkflowStatus: "final_approved",
      nextWorkflowStatus: command.nextWorkflowStatus,
    });
    if (commit.status === "conflict") return { ok: false, code: "CONFLICT", reason: commit.reason };
    return { ok: true, value: command.publication, nextWorkflowStatus: command.nextWorkflowStatus, replayed: commit.status === "already_committed" };
  } catch (error) {
    return { ok: false, code: "REPOSITORY_ERROR", error };
  }
}
