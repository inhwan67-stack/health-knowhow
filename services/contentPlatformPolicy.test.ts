import { describe, expect, it } from "vitest";
import type {
  AdministratorCapability,
  Approval,
  Content,
  Review,
  Revision,
} from "@/types/content-platform";
import {
  canCreateFinalApproval,
  canCreatePublication,
  type PolicyActor,
} from "./contentPlatformPolicy";

const now = new Date("2026-07-13T00:00:00.000Z");
const adminCapabilities = [
  "review:first:decide",
  "approval:final:decide",
  "publication:create",
  "publication:schedule",
] satisfies AdministratorCapability[];

const adminActor: PolicyActor = {
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
  workingTitle: "Test article",
  slug: "test-article",
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
  title: "Test article",
  body: { format: "markdown", markdown: "Body" },
  sourceReferences: [],
  contentHash: "hash-1",
  createdBy: { actorType: "ai_agent", actorId: "agent-1" },
  createdAt: "2026-07-12T01:00:00.000Z",
};

const approvedReview: Review = {
  id: "review-1",
  contentId: content.id,
  revisionId: revision.id,
  stage: "first_review",
  status: "approved",
  reviewerId: adminActor.actorId,
  createdAt: "2026-07-12T02:00:00.000Z",
  decidedAt: "2026-07-12T03:00:00.000Z",
};

const approvedApproval: Approval = {
  id: "approval-1",
  contentId: content.id,
  revisionId: revision.id,
  firstReviewId: approvedReview.id,
  status: "approved",
  approverId: adminActor.actorId,
  createdAt: "2026-07-12T04:00:00.000Z",
  decidedAt: "2026-07-12T05:00:00.000Z",
};

describe("canCreateFinalApproval", () => {
  it("allows an administrator with capability to approve the reviewed current revision", () => {
    expect(finalApprovalPolicy()).toEqual({ allowed: true, reasons: [] });
  });

  it("allows the same administrator to perform first review and final approval", () => {
    const result = finalApprovalPolicy({
      review: { ...approvedReview, reviewerId: adminActor.actorId },
      actor: adminActor,
    });
    expect(result.allowed).toBe(true);
  });

  it.each(["pending", "changes_requested", "rejected"] as const)(
    "rejects a %s review",
    (status) => {
      expect(finalApprovalPolicy({ review: { ...approvedReview, status } }).reasons).toContain(
        "REVIEW_NOT_APPROVED",
      );
    },
  );

  it("rejects a review for another content", () => {
    expect(finalApprovalPolicy({ review: { ...approvedReview, contentId: "content-2" } }).reasons).toContain(
      "REVIEW_CONTENT_MISMATCH",
    );
  });

  it("rejects a review for another revision", () => {
    expect(finalApprovalPolicy({ review: { ...approvedReview, revisionId: "revision-2" } }).reasons).toContain(
      "REVIEW_REVISION_MISMATCH",
    );
  });

  it("rejects a revision owned by another content", () => {
    expect(finalApprovalPolicy({ revision: { ...revision, contentId: "content-2" } }).reasons).toContain(
      "REVISION_CONTENT_MISMATCH",
    );
  });

  it("rejects a reviewed revision that is no longer current", () => {
    expect(
      finalApprovalPolicy({ content: { ...content, currentRevisionId: "revision-2" } }).reasons,
    ).toContain("CURRENT_REVISION_MISMATCH");
  });

  it("rejects an actor without final approval capability", () => {
    expect(finalApprovalPolicy({ capabilities: ["publication:create"] }).reasons).toContain(
      "MISSING_FINAL_APPROVAL_CAPABILITY",
    );
  });

  it.each(["ai_agent", "n8n"] as const)("rejects a %s approval request", (actorType) => {
    const actor: PolicyActor = { ...adminActor, actorType };
    const result = finalApprovalPolicy({ actor });
    expect(result.reasons).toContain("AUTOMATION_FINAL_APPROVAL_FORBIDDEN");
    expect(result.reasons).toContain("ADMIN_ROLE_REQUIRED");
  });
});

describe("canCreatePublication", () => {
  it("allows immediate publication with an approved matching approval", () => {
    expect(publicationPolicy()).toEqual({ allowed: true, reasons: [] });
  });

  it("allows a future scheduled publication", () => {
    expect(
      publicationPolicy({ mode: "scheduled", scheduledAt: "2026-07-14T00:00:00.000Z" }),
    ).toEqual({ allowed: true, reasons: [] });
  });

  it.each(["pending", "rejected"] as const)("rejects a %s approval", (status) => {
    expect(publicationPolicy({ approval: { ...approvedApproval, status } }).reasons).toContain(
      "APPROVAL_NOT_APPROVED",
    );
  });

  it("rejects a revoked approval", () => {
    expect(publicationPolicy({ approval: { ...approvedApproval, status: "revoked" } }).reasons).toContain(
      "APPROVAL_REVOKED",
    );
  });

  it("rejects an approval for another content", () => {
    expect(
      publicationPolicy({ approval: { ...approvedApproval, contentId: "content-2" } }).reasons,
    ).toContain("APPROVAL_CONTENT_MISMATCH");
  });

  it("rejects an approval for another revision", () => {
    expect(
      publicationPolicy({ approval: { ...approvedApproval, revisionId: "revision-2" } }).reasons,
    ).toContain("APPROVAL_REVISION_MISMATCH");
  });

  it("rejects a revision owned by another content", () => {
    expect(publicationPolicy({ revision: { ...revision, contentId: "content-2" } }).reasons).toContain(
      "REVISION_CONTENT_MISMATCH",
    );
  });

  it("rejects a revision different from content.approvedRevisionId", () => {
    expect(
      publicationPolicy({ content: { ...content, approvedRevisionId: "revision-2" } }).reasons,
    ).toContain("CONTENT_APPROVED_REVISION_MISMATCH");
  });

  it("rejects an actor without publication capability", () => {
    expect(publicationPolicy({ capabilities: ["approval:final:decide"] }).reasons).toContain(
      "MISSING_PUBLICATION_CAPABILITY",
    );
  });

  it.each(["ai_agent", "n8n"] as const)("rejects a %s publication request", (actorType) => {
    const actor: PolicyActor = { ...adminActor, actorType };
    const result = publicationPolicy({ actor });
    expect(result.reasons).toContain("AUTOMATION_PUBLICATION_FORBIDDEN");
    expect(result.reasons).toContain("ADMIN_ROLE_REQUIRED");
  });

  it("requires scheduledAt for scheduled publication", () => {
    expect(publicationPolicy({ mode: "scheduled", scheduledAt: undefined }).reasons).toContain(
      "SCHEDULED_AT_REQUIRED",
    );
  });

  it("rejects an invalid scheduledAt", () => {
    expect(publicationPolicy({ mode: "scheduled", scheduledAt: "not-a-date" }).reasons).toContain(
      "INVALID_SCHEDULED_AT",
    );
  });

  it("rejects a scheduledAt in the past", () => {
    expect(
      publicationPolicy({ mode: "scheduled", scheduledAt: "2026-07-12T23:59:59.999Z" }).reasons,
    ).toContain("SCHEDULED_AT_IN_PAST");
  });
});

function finalApprovalPolicy(
  overrides: Partial<Parameters<typeof canCreateFinalApproval>[0]> = {},
) {
  return canCreateFinalApproval({
    content,
    revision,
    review: approvedReview,
    actor: adminActor,
    capabilities: adminCapabilities,
    ...overrides,
  });
}

function publicationPolicy(
  overrides: Partial<Parameters<typeof canCreatePublication>[0]> = {},
) {
  return canCreatePublication({
    content,
    revision,
    approval: approvedApproval,
    actor: adminActor,
    capabilities: adminCapabilities,
    mode: "immediate",
    now,
    ...overrides,
  });
}
