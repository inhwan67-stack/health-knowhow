import {
  canTransitionContentWorkflow,
  type AdministratorCapability,
  type Approval,
  type Content,
  type ContentWorkflowStatus,
  type IsoDateTime,
  type Publication,
  type Review,
  type Revision,
} from "../types/content-platform";
import {
  canCreateFinalApproval,
  canCreatePublication,
  type FinalApprovalViolationCode,
  type PolicyActor,
  type PublicationCreationMode,
  type PublicationViolationCode,
} from "./contentPlatformPolicy";

export type CommandWorkflowFailureCode =
  | "INVALID_WORKFLOW_STATE"
  | "WORKFLOW_TRANSITION_NOT_ALLOWED";

export type CommandFailure<PolicyViolation extends string> = {
  ok: false;
  workflowFailure?: CommandWorkflowFailureCode;
  policyViolations: PolicyViolation[];
};

export type FinalApprovalCommandSuccess = {
  ok: true;
  approval: Approval;
  nextWorkflowStatus: "final_approved";
};

export type FinalApprovalCommandResult =
  | FinalApprovalCommandSuccess
  | CommandFailure<FinalApprovalViolationCode>;

export type PublicationCommandSuccess = {
  ok: true;
  publication: Publication;
  nextWorkflowStatus: "published" | "scheduled";
};

export type PublicationCommandResult =
  | PublicationCommandSuccess
  | CommandFailure<PublicationViolationCode>;

export type CreateFinalApprovalCommandInput = {
  content: Content;
  revision: Revision;
  review: Review;
  actor: PolicyActor;
  capabilities: readonly AdministratorCapability[];
  approvalId: string;
  createdAt: IsoDateTime;
  comment?: string;
};

export type CreatePublicationCommandInput = {
  content: Content;
  revision: Revision;
  approval: Approval;
  actor: PolicyActor;
  capabilities: readonly AdministratorCapability[];
  mode: PublicationCreationMode;
  publicationId: string;
  createdAt: IsoDateTime;
  scheduledAt?: IsoDateTime;
  now: Date;
};

export function createFinalApprovalCommand({
  content,
  revision,
  review,
  actor,
  capabilities,
  approvalId,
  createdAt,
  comment,
}: CreateFinalApprovalCommandInput): FinalApprovalCommandResult {
  const nextWorkflowStatus = "final_approved";
  const workflowFailure = getWorkflowFailure(
    content.workflowStatus,
    "final_approval_pending",
    nextWorkflowStatus,
  );
  const policy = canCreateFinalApproval({ content, revision, review, actor, capabilities });

  if (workflowFailure || !policy.allowed) {
    return {
      ok: false,
      ...(workflowFailure ? { workflowFailure } : {}),
      policyViolations: policy.reasons,
    };
  }

  return {
    ok: true,
    approval: {
      id: approvalId,
      contentId: content.id,
      revisionId: revision.id,
      firstReviewId: review.id,
      status: "approved",
      approverId: actor.actorId,
      comment,
      createdAt,
      decidedAt: createdAt,
    },
    nextWorkflowStatus,
  };
}

export function createPublicationCommand({
  content,
  revision,
  approval,
  actor,
  capabilities,
  mode,
  publicationId,
  createdAt,
  scheduledAt,
  now,
}: CreatePublicationCommandInput): PublicationCommandResult {
  const nextWorkflowStatus = mode === "scheduled" ? "scheduled" : "published";
  const workflowFailure = getWorkflowFailure(
    content.workflowStatus,
    "final_approved",
    nextWorkflowStatus,
  );
  const policy = canCreatePublication({
    content,
    revision,
    approval,
    actor,
    capabilities,
    mode,
    scheduledAt,
    now,
  });

  if (workflowFailure || !policy.allowed) {
    return {
      ok: false,
      ...(workflowFailure ? { workflowFailure } : {}),
      policyViolations: policy.reasons,
    };
  }

  const publication: Publication = {
    id: publicationId,
    siteId: content.siteId,
    contentId: content.id,
    revisionId: revision.id,
    approvalId: approval.id,
    status: mode === "scheduled" ? "scheduled" : "published",
    ...(mode === "scheduled" ? { scheduledAt } : { publishedAt: createdAt }),
    createdByAdminId: actor.actorId,
    createdAt,
    updatedAt: createdAt,
  };

  return { ok: true, publication, nextWorkflowStatus };
}

function getWorkflowFailure(
  current: ContentWorkflowStatus,
  required: ContentWorkflowStatus,
  next: ContentWorkflowStatus,
): CommandWorkflowFailureCode | undefined {
  if (current !== required) return "INVALID_WORKFLOW_STATE";
  if (!canTransitionContentWorkflow(current, next)) return "WORKFLOW_TRANSITION_NOT_ALLOWED";
  return undefined;
}
