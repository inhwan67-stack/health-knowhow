import { describe, expect, it } from "vitest";
import type {
  AdministratorCapability,
  Approval,
  Content,
  Review,
  Revision,
} from "@/types/content-platform";
import {
  createFinalApprovalCommand,
  createPublicationCommand,
} from "./contentPlatformCommand";
import type { PolicyActor } from "./contentPlatformPolicy";

const createdAt = "2026-07-13T01:00:00.000Z";
const now = new Date("2026-07-13T00:00:00.000Z");
const capabilities = [
  "approval:final:decide",
  "publication:create",
  "publication:schedule",
] satisfies AdministratorCapability[];

const actor: PolicyActor = {
  actorType: "human",
  actorId: "admin-1",
  roles: ["administrator", "first_reviewer", "final_approver", "publisher"],
};

const content: Content = {
  id: "content-1",
  siteId: "site-health-knowhow",
  primaryTopicId: "topic-1",
  secondaryTopicIds: [],
  contentType: "article",
  workingTitle: "Article",
  slug: "article",
  workflowStatus: "final_approval_pending",
  sourceReferences: [],
  currentRevisionId: "revision-1",
  approvedRevisionId: "revision-1",
  createdBy: { actorType: "human", actorId: "admin-1" },
  createdAt: "2026-07-12T00:00:00.000Z",
  updatedAt: "2026-07-12T00:00:00.000Z",
};

const revision: Revision = {
  id: "revision-1",
  contentId: content.id,
  revisionNumber: 1,
  authorType: "ai",
  title: "Article",
  body: { format: "markdown", markdown: "Body" },
  sourceReferences: [],
  contentHash: "hash-1",
  createdBy: { actorType: "ai_agent", actorId: "agent-1" },
  createdAt: "2026-07-12T01:00:00.000Z",
};

const review: Review = {
  id: "review-1",
  contentId: content.id,
  revisionId: revision.id,
  stage: "first_review",
  status: "approved",
  reviewerId: actor.actorId,
  createdAt: "2026-07-12T02:00:00.000Z",
  decidedAt: "2026-07-12T03:00:00.000Z",
};

const approval: Approval = {
  id: "approval-1",
  contentId: content.id,
  revisionId: revision.id,
  firstReviewId: review.id,
  status: "approved",
  approverId: actor.actorId,
  createdAt: "2026-07-12T04:00:00.000Z",
  decidedAt: "2026-07-12T04:00:00.000Z",
};

describe("createFinalApprovalCommand", () => {
  it("creates an approved Approval for the reviewed current revision", () => {
    const result = finalApprovalCommand();

    expect(result).toEqual({
      ok: true,
      approval: {
        id: "approval-new",
        contentId: content.id,
        revisionId: revision.id,
        firstReviewId: review.id,
        status: "approved",
        approverId: actor.actorId,
        comment: undefined,
        createdAt,
        decidedAt: createdAt,
      },
      nextWorkflowStatus: "final_approved",
    });
  });

  it.each(["drafting", "first_review_pending", "first_review_approved", "final_approved"] as const)(
    "rejects the %s workflow state without creating Approval",
    (workflowStatus) => {
      const result = finalApprovalCommand({ content: { ...content, workflowStatus } });
      expect(result).toMatchObject({ ok: false, workflowFailure: "INVALID_WORKFLOW_STATE" });
      expect("approval" in result).toBe(false);
    },
  );

  it.each(["ai_agent", "n8n"] as const)("rejects %s without creating Approval", (actorType) => {
    const result = finalApprovalCommand({ actor: { ...actor, actorType } });
    expect(result).toMatchObject({ ok: false });
    expect("approval" in result).toBe(false);
  });

  it("rejects a stale revision without creating Approval", () => {
    const result = finalApprovalCommand({ content: { ...content, currentRevisionId: "revision-2" } });
    expect(result).toMatchObject({ ok: false, policyViolations: ["CURRENT_REVISION_MISMATCH"] });
    expect("approval" in result).toBe(false);
  });

  it("rejects a non-approved review without creating Approval", () => {
    const result = finalApprovalCommand({ review: { ...review, status: "pending" } });
    expect(result).toMatchObject({ ok: false, policyViolations: ["REVIEW_NOT_APPROVED"] });
    expect("approval" in result).toBe(false);
  });

  it("does not mutate Content, Review, or Revision", () => {
    const inputs = { content, review, revision };
    const before = structuredClone(inputs);
    finalApprovalCommand();
    expect(inputs).toEqual(before);
  });
});

describe("createPublicationCommand immediate", () => {
  it("creates an immediately published Publication", () => {
    const result = publicationCommand();

    expect(result).toEqual({
      ok: true,
      publication: {
        id: "publication-new",
        siteId: content.siteId,
        contentId: content.id,
        revisionId: revision.id,
        approvalId: approval.id,
        status: "published",
        publishedAt: createdAt,
        createdByAdminId: actor.actorId,
        createdAt,
        updatedAt: createdAt,
      },
      nextWorkflowStatus: "published",
    });
  });

  it.each(["drafting", "first_review_pending", "final_approval_pending", "scheduled"] as const)(
    "rejects the %s workflow state without creating Publication",
    (workflowStatus) => {
      const result = publicationCommand({ content: { ...content, workflowStatus } });
      expect(result).toMatchObject({ ok: false, workflowFailure: "INVALID_WORKFLOW_STATE" });
      expect("publication" in result).toBe(false);
    },
  );

  it("rejects a revoked Approval", () => {
    const result = publicationCommand({ approval: { ...approval, status: "revoked" } });
    expect(result).toMatchObject({ ok: false, policyViolations: ["APPROVAL_REVOKED"] });
  });

  it("rejects a revision mismatch", () => {
    const result = publicationCommand({ approval: { ...approval, revisionId: "revision-2" } });
    expect(result).toMatchObject({ ok: false, policyViolations: ["APPROVAL_REVISION_MISMATCH"] });
  });

  it.each(["ai_agent", "n8n"] as const)("rejects %s without creating Publication", (actorType) => {
    const result = publicationCommand({ actor: { ...actor, actorType } });
    expect(result).toMatchObject({ ok: false });
    expect("publication" in result).toBe(false);
  });

  it("rejects a missing publication capability", () => {
    const result = publicationCommand({ capabilities: ["approval:final:decide"] });
    expect(result).toMatchObject({ ok: false, policyViolations: ["MISSING_PUBLICATION_CAPABILITY"] });
  });

  it("does not mutate Content, Approval, or Revision", () => {
    const inputs = { content, approval, revision };
    const before = structuredClone(inputs);
    publicationCommand();
    expect(inputs).toEqual(before);
  });
});

describe("createPublicationCommand scheduled", () => {
  it("creates a scheduled Publication and preserves scheduledAt", () => {
    const scheduledAt = "2026-07-14T00:00:00.000Z";
    const result = publicationCommand({ mode: "scheduled", scheduledAt });

    expect(result).toMatchObject({
      ok: true,
      publication: { status: "scheduled", scheduledAt },
      nextWorkflowStatus: "scheduled",
    });
  });

  it.each([
    [undefined, "SCHEDULED_AT_REQUIRED"],
    ["invalid-date", "INVALID_SCHEDULED_AT"],
    ["2026-07-12T23:59:59.999Z", "SCHEDULED_AT_IN_PAST"],
  ] as const)("rejects invalid schedule input %s", (scheduledAt, violation) => {
    const result = publicationCommand({ mode: "scheduled", scheduledAt });
    expect(result).toMatchObject({ ok: false, policyViolations: [violation] });
    expect("publication" in result).toBe(false);
  });

  it.each(["drafting", "final_approval_pending", "scheduled"] as const)(
    "rejects the %s workflow state",
    (workflowStatus) => {
      const result = publicationCommand({
        content: { ...content, workflowStatus },
        mode: "scheduled",
        scheduledAt: "2026-07-14T00:00:00.000Z",
      });
      expect(result).toMatchObject({ ok: false, workflowFailure: "INVALID_WORKFLOW_STATE" });
    },
  );

  it("rejects a representative policy violation", () => {
    const result = publicationCommand({
      mode: "scheduled",
      scheduledAt: "2026-07-14T00:00:00.000Z",
      approval: { ...approval, status: "pending" },
    });
    expect(result).toMatchObject({ ok: false, policyViolations: ["APPROVAL_NOT_APPROVED"] });
  });
});

function finalApprovalCommand(
  overrides: Partial<Parameters<typeof createFinalApprovalCommand>[0]> = {},
) {
  return createFinalApprovalCommand({
    content,
    revision,
    review,
    actor,
    capabilities,
    approvalId: "approval-new",
    createdAt,
    ...overrides,
  });
}

function publicationCommand(
  overrides: Partial<Parameters<typeof createPublicationCommand>[0]> = {},
) {
  return createPublicationCommand({
    content: { ...content, workflowStatus: "final_approved" },
    revision,
    approval,
    actor,
    capabilities,
    mode: "immediate",
    publicationId: "publication-new",
    createdAt,
    now,
    ...overrides,
  });
}
