import type {
  AdministratorCapability,
  Approval,
  Content,
  PlatformRole,
  Review,
  Revision,
  ActorReference,
  IsoDateTime,
} from "@/types/content-platform";

export type PolicyActor = ActorReference & {
  roles: readonly PlatformRole[];
};

export type PolicyResult<ViolationCode extends string> =
  | { allowed: true; reasons: [] }
  | { allowed: false; reasons: ViolationCode[] };

export type FinalApprovalViolationCode =
  | "REVIEW_NOT_APPROVED"
  | "REVIEW_CONTENT_MISMATCH"
  | "REVIEW_REVISION_MISMATCH"
  | "REVISION_CONTENT_MISMATCH"
  | "CURRENT_REVISION_MISMATCH"
  | "MISSING_FINAL_APPROVAL_CAPABILITY"
  | "AUTOMATION_FINAL_APPROVAL_FORBIDDEN"
  | "ADMIN_ROLE_REQUIRED";

export type PublicationViolationCode =
  | "APPROVAL_NOT_APPROVED"
  | "APPROVAL_REVOKED"
  | "APPROVAL_CONTENT_MISMATCH"
  | "APPROVAL_REVISION_MISMATCH"
  | "REVISION_CONTENT_MISMATCH"
  | "CONTENT_APPROVED_REVISION_MISMATCH"
  | "MISSING_PUBLICATION_CAPABILITY"
  | "AUTOMATION_PUBLICATION_FORBIDDEN"
  | "ADMIN_ROLE_REQUIRED"
  | "SCHEDULED_AT_REQUIRED"
  | "INVALID_SCHEDULED_AT"
  | "SCHEDULED_AT_IN_PAST";

export type FinalApprovalPolicyInput = {
  content: Content;
  revision: Revision;
  review: Review;
  actor: PolicyActor;
  capabilities: readonly AdministratorCapability[];
};

export type PublicationCreationMode = "immediate" | "scheduled";

export type PublicationPolicyInput = {
  content: Content;
  revision: Revision;
  approval: Approval;
  actor: PolicyActor;
  capabilities: readonly AdministratorCapability[];
  mode: PublicationCreationMode;
  scheduledAt?: IsoDateTime;
  now: Date;
};

export function canCreateFinalApproval({
  content,
  revision,
  review,
  actor,
  capabilities,
}: FinalApprovalPolicyInput): PolicyResult<FinalApprovalViolationCode> {
  const reasons: FinalApprovalViolationCode[] = [];

  if (review.status !== "approved") reasons.push("REVIEW_NOT_APPROVED");
  if (review.contentId !== content.id) reasons.push("REVIEW_CONTENT_MISMATCH");
  if (review.revisionId !== revision.id) reasons.push("REVIEW_REVISION_MISMATCH");
  if (revision.contentId !== content.id) reasons.push("REVISION_CONTENT_MISMATCH");

  // This is the strongest stale-review check available in the current model.
  // A newly created revision must become current and therefore invalidates the
  // review of the previous revision for final-approval purposes.
  if (content.currentRevisionId !== revision.id) reasons.push("CURRENT_REVISION_MISMATCH");

  if (!capabilities.includes("approval:final:decide")) {
    reasons.push("MISSING_FINAL_APPROVAL_CAPABILITY");
  }

  if (isAutomationActor(actor)) {
    reasons.push("AUTOMATION_FINAL_APPROVAL_FORBIDDEN");
  }

  if (actor.actorType !== "human" || !actor.roles.includes("administrator")) {
    reasons.push("ADMIN_ROLE_REQUIRED");
  }

  return toPolicyResult(reasons);
}

export function canCreatePublication({
  content,
  revision,
  approval,
  actor,
  capabilities,
  mode,
  scheduledAt,
  now,
}: PublicationPolicyInput): PolicyResult<PublicationViolationCode> {
  const reasons: PublicationViolationCode[] = [];

  if (approval.status === "revoked") {
    reasons.push("APPROVAL_REVOKED");
  } else if (approval.status !== "approved") {
    reasons.push("APPROVAL_NOT_APPROVED");
  }

  if (approval.contentId !== content.id) reasons.push("APPROVAL_CONTENT_MISMATCH");
  if (approval.revisionId !== revision.id) reasons.push("APPROVAL_REVISION_MISMATCH");
  if (revision.contentId !== content.id) reasons.push("REVISION_CONTENT_MISMATCH");

  if (content.approvedRevisionId && content.approvedRevisionId !== revision.id) {
    reasons.push("CONTENT_APPROVED_REVISION_MISMATCH");
  }

  if (!capabilities.includes("publication:create")) {
    reasons.push("MISSING_PUBLICATION_CAPABILITY");
  }

  if (isAutomationActor(actor)) {
    reasons.push("AUTOMATION_PUBLICATION_FORBIDDEN");
  }

  if (actor.actorType !== "human" || !actor.roles.includes("administrator")) {
    reasons.push("ADMIN_ROLE_REQUIRED");
  }

  if (mode === "scheduled") {
    if (!scheduledAt) {
      reasons.push("SCHEDULED_AT_REQUIRED");
    } else {
      const scheduledTime = Date.parse(scheduledAt);
      if (Number.isNaN(scheduledTime)) {
        reasons.push("INVALID_SCHEDULED_AT");
      } else if (scheduledTime < now.getTime()) {
        reasons.push("SCHEDULED_AT_IN_PAST");
      }
    }
  }

  return toPolicyResult(reasons);
}

function isAutomationActor(actor: ActorReference) {
  return actor.actorType === "ai_agent" || actor.actorType === "n8n";
}

function toPolicyResult<ViolationCode extends string>(
  reasons: ViolationCode[],
): PolicyResult<ViolationCode> {
  return reasons.length === 0 ? { allowed: true, reasons: [] } : { allowed: false, reasons };
}
