import { describe, expect, it } from "vitest";
import type { Approval, Content, Publication } from "../types/content-platform";
import { InMemoryContentPlatformRepository } from "./inMemoryContentPlatformRepository";

const content: Content = {
  id: "c1", siteId: "s1", primaryTopicId: "t1", secondaryTopicIds: [], contentType: "article",
  workingTitle: "A", slug: "a", workflowStatus: "final_approval_pending", sourceReferences: [],
  currentRevisionId: "r1", createdBy: { actorType: "human", actorId: "admin" },
  createdAt: "2026-07-12T00:00:00Z", updatedAt: "2026-07-12T00:00:00Z",
};
const approval: Approval = {
  id: "a1", contentId: "c1", revisionId: "r1", firstReviewId: "v1", status: "approved",
  approverId: "admin", createdAt: "2026-07-13T00:00:00Z",
};
const publication: Publication = {
  id: "p1", siteId: "s1", contentId: "c1", revisionId: "r1", approvalId: "a1",
  status: "published", publishedAt: "2026-07-14T00:00:00Z", createdByAdminId: "admin",
  createdAt: "2026-07-14T00:00:00Z", updatedAt: "2026-07-14T00:00:00Z",
};

describe("InMemoryContentPlatformRepository contract", () => {
  it("atomically stores approval and advances Content", async () => {
    const repo = repository();
    expect(await repo.commitFinalApproval(finalCommit())).toEqual({ status: "committed" });
    expect(await repo.getApproval("a1")).toEqual(approval);
    expect(await repo.getContent("c1")).toMatchObject({ workflowStatus: "final_approved", approvedRevisionId: "r1" });
  });

  it("returns already_committed for the same operation", async () => {
    const repo = repository();
    await repo.commitFinalApproval(finalCommit());
    expect(await repo.commitFinalApproval(finalCommit())).toEqual({ status: "already_committed" });
  });

  it("detects updatedAt conflicts without partial writes", async () => {
    const repo = repository();
    const result = await repo.commitFinalApproval({ ...finalCommit(), expectedContentUpdatedAt: "stale" });
    expect(result).toEqual({ status: "conflict", reason: "CONTENT_UPDATED" });
    expect(await repo.getApproval("a1")).toBeNull();
    expect(await repo.getContent("c1")).toEqual(content);
  });

  it("detects workflow conflicts without partial writes", async () => {
    const repo = new InMemoryContentPlatformRepository({ contents: [{ ...content, workflowStatus: "drafting" }] });
    expect(await repo.commitFinalApproval(finalCommit())).toEqual({ status: "conflict", reason: "WORKFLOW_CHANGED" });
    expect(await repo.getApproval("a1")).toBeNull();
  });

  it("atomically stores publication and published revision", async () => {
    const repo = new InMemoryContentPlatformRepository({
      contents: [{ ...content, workflowStatus: "final_approved", updatedAt: approval.createdAt }],
      approvals: [approval],
    });
    expect(await repo.commitPublication(publicationCommit())).toEqual({ status: "committed" });
    expect(await repo.getPublication("p1")).toEqual(publication);
    expect(await repo.getContent("c1")).toMatchObject({ workflowStatus: "published", publishedRevisionId: "r1" });
  });

  it("returns defensive clones from reads", async () => {
    const repo = repository();
    const read = await repo.getContent("c1");
    if (!read) throw new Error("missing fixture");
    read.workflowStatus = "archived";
    expect((await repo.getContent("c1"))?.workflowStatus).toBe("final_approval_pending");
  });
});

function repository() { return new InMemoryContentPlatformRepository({ contents: [content] }); }
function finalCommit() {
  return { approval, contentId: "c1", operationId: "op1", expectedContentUpdatedAt: content.updatedAt,
    expectedWorkflowStatus: "final_approval_pending" as const, nextWorkflowStatus: "final_approved" as const };
}
function publicationCommit() {
  return { publication, contentId: "c1", operationId: "op2", expectedContentUpdatedAt: approval.createdAt,
    expectedWorkflowStatus: "final_approved" as const, nextWorkflowStatus: "published" as const };
}
