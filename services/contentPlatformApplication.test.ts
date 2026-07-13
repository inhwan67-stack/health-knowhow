import { describe, expect, it, vi } from "vitest";
import type { Approval, Content, Review, Revision } from "../types/content-platform";
import {
  executeFinalApproval,
  executePublication,
  type ContentPlatformRepository,
} from "./contentPlatformApplication";

const actor = { actorType: "human" as const, actorId: "admin-1", roles: ["administrator" as const] };
const capabilities = ["approval:final:decide" as const, "publication:create" as const];
const content: Content = {
  id: "c1", siteId: "s1", primaryTopicId: "t1", secondaryTopicIds: [], contentType: "article",
  workingTitle: "A", slug: "a", workflowStatus: "final_approval_pending", sourceReferences: [],
  currentRevisionId: "r1", approvedRevisionId: "r1", createdBy: actor,
  createdAt: "2026-07-12T00:00:00Z", updatedAt: "2026-07-12T00:00:00Z",
};
const revision: Revision = {
  id: "r1", contentId: "c1", revisionNumber: 1, authorType: "ai", title: "A",
  body: { format: "markdown", markdown: "A" }, sourceReferences: [], contentHash: "h",
  createdBy: { actorType: "ai_agent", actorId: "ai1" }, createdAt: "2026-07-12T01:00:00Z",
};
const review: Review = {
  id: "v1", contentId: "c1", revisionId: "r1", stage: "first_review", status: "approved",
  reviewerId: "admin-1", createdAt: "2026-07-12T02:00:00Z",
};
const approval: Approval = {
  id: "a1", contentId: "c1", revisionId: "r1", firstReviewId: "v1", status: "approved",
  approverId: "admin-1", createdAt: "2026-07-12T03:00:00Z",
};

describe("content platform application services", () => {
  it("loads latest entities and atomically requests final approval persistence", async () => {
    const repo = fakeRepository();
    const result = await executeFinalApproval(repo, finalInput());
    expect(result).toMatchObject({ ok: true, nextWorkflowStatus: "final_approved" });
    expect(repo.getContent).toHaveBeenCalledWith("c1");
    expect(repo.getRevision).toHaveBeenCalledWith("r1");
    expect(repo.getReview).toHaveBeenCalledWith("v1");
    expect(repo.commitFinalApproval).toHaveBeenCalledOnce();
    expect(repo.commitFinalApproval).toHaveBeenCalledWith(expect.objectContaining({
      operationId: "op-approval-1",
      expectedContentUpdatedAt: content.updatedAt,
    }));
  });

  it.each(["content", "revision", "review"] as const)("returns NOT_FOUND for missing %s", async (entity) => {
    const repo = fakeRepository();
    if (entity === "content") vi.mocked(repo.getContent).mockResolvedValue(null);
    if (entity === "revision") vi.mocked(repo.getRevision).mockResolvedValue(null);
    if (entity === "review") vi.mocked(repo.getReview).mockResolvedValue(null);
    expect(await executeFinalApproval(repo, finalInput())).toMatchObject({ ok: false, code: "NOT_FOUND", entity });
    expect(repo.commitFinalApproval).not.toHaveBeenCalled();
  });

  it("does not persist a rejected final approval command", async () => {
    const repo = fakeRepository({ review: { ...review, status: "pending" } });
    expect(await executeFinalApproval(repo, finalInput())).toMatchObject({ ok: false, code: "COMMAND_REJECTED" });
    expect(repo.commitFinalApproval).not.toHaveBeenCalled();
  });

  it("persists immediate publication with published workflow", async () => {
    const repo = fakeRepository({ content: { ...content, workflowStatus: "final_approved" } });
    const result = await executePublication(repo, publicationInput());
    expect(result).toMatchObject({ ok: true, nextWorkflowStatus: "published", value: { status: "published" } });
    expect(repo.commitPublication).toHaveBeenCalledOnce();
  });

  it("persists scheduled publication with scheduled workflow", async () => {
    const repo = fakeRepository({ content: { ...content, workflowStatus: "final_approved" } });
    const result = await executePublication(repo, publicationInput({ mode: "scheduled", scheduledAt: "2026-07-14T00:00:00Z" }));
    expect(result).toMatchObject({ ok: true, nextWorkflowStatus: "scheduled", value: { status: "scheduled" } });
  });

  it("does not persist revoked approval or automation requests", async () => {
    const revokedRepo = fakeRepository({ content: { ...content, workflowStatus: "final_approved" }, approval: { ...approval, status: "revoked" } });
    await executePublication(revokedRepo, publicationInput());
    expect(revokedRepo.commitPublication).not.toHaveBeenCalled();
    const automationRepo = fakeRepository({ content: { ...content, workflowStatus: "final_approved" } });
    await executePublication(automationRepo, publicationInput({ actor: { ...actor, actorType: "n8n" } }));
    expect(automationRepo.commitPublication).not.toHaveBeenCalled();
  });

  it("returns repository errors without reporting partial success", async () => {
    const repo = fakeRepository();
    vi.mocked(repo.commitFinalApproval).mockRejectedValue(new Error("transaction failed"));
    expect(await executeFinalApproval(repo, finalInput())).toMatchObject({ ok: false, code: "REPOSITORY_ERROR" });
  });

  it("treats an idempotent replay as success without creating a second logical result", async () => {
    const repo = fakeRepository();
    vi.mocked(repo.commitFinalApproval).mockResolvedValue({ status: "already_committed" });
    expect(await executeFinalApproval(repo, finalInput())).toMatchObject({ ok: true, replayed: true });
  });

  it.each(["CONTENT_UPDATED", "WORKFLOW_CHANGED"] as const)("returns %s concurrency conflict", async (reason) => {
    const repo = fakeRepository();
    vi.mocked(repo.commitFinalApproval).mockResolvedValue({ status: "conflict", reason });
    expect(await executeFinalApproval(repo, finalInput())).toEqual({ ok: false, code: "CONFLICT", reason });
  });

  it("does not mutate repository entities", async () => {
    const repo = fakeRepository();
    const before = structuredClone({ content, revision, review, approval });
    await executeFinalApproval(repo, finalInput());
    expect({ content, revision, review, approval }).toEqual(before);
  });
});

function fakeRepository(overrides: Partial<{ content: Content; revision: Revision; review: Review; approval: Approval }> = {}): ContentPlatformRepository & Record<string, ReturnType<typeof vi.fn>> {
  return {
    getContent: vi.fn().mockResolvedValue(overrides.content ?? content),
    getRevision: vi.fn().mockResolvedValue(overrides.revision ?? revision),
    getReview: vi.fn().mockResolvedValue(overrides.review ?? review),
    getApproval: vi.fn().mockResolvedValue(overrides.approval ?? approval),
    commitFinalApproval: vi.fn().mockResolvedValue({ status: "committed" }),
    commitPublication: vi.fn().mockResolvedValue({ status: "committed" }),
  };
}

function finalInput() {
  return { contentId: "c1", revisionId: "r1", reviewId: "v1", actor, capabilities, approvalId: "a2", operationId: "op-approval-1", createdAt: "2026-07-13T01:00:00Z" };
}

function publicationInput(overrides: Partial<Parameters<typeof executePublication>[1]> = {}) {
  return { contentId: "c1", revisionId: "r1", approvalId: "a1", actor, capabilities, mode: "immediate" as const, publicationId: "p1", operationId: "op-publication-1", createdAt: "2026-07-13T01:00:00Z", now: new Date("2026-07-13T00:00:00Z"), ...overrides };
}
