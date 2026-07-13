import type { Approval, Content, Publication, Review, Revision } from "../types/content-platform";
import type {
  ContentPlatformRepository,
  RepositoryCommitResult,
} from "./contentPlatformApplication";

export type InMemoryContentPlatformSeed = {
  contents?: Content[];
  revisions?: Revision[];
  reviews?: Review[];
  approvals?: Approval[];
  publications?: Publication[];
};

/** Test/reference implementation. It is not intended as production storage. */
export class InMemoryContentPlatformRepository implements ContentPlatformRepository {
  private contents: Map<string, Content>;
  private revisions: Map<string, Revision>;
  private reviews: Map<string, Review>;
  private approvals: Map<string, Approval>;
  private publications: Map<string, Publication>;
  private committedOperations = new Set<string>();

  constructor(seed: InMemoryContentPlatformSeed = {}) {
    this.contents = toMap(seed.contents);
    this.revisions = toMap(seed.revisions);
    this.reviews = toMap(seed.reviews);
    this.approvals = toMap(seed.approvals);
    this.publications = toMap(seed.publications);
  }

  async getContent(id: string) { return cloneOrNull(this.contents.get(id)); }
  async getRevision(id: string) { return cloneOrNull(this.revisions.get(id)); }
  async getReview(id: string) { return cloneOrNull(this.reviews.get(id)); }
  async getApproval(id: string) { return cloneOrNull(this.approvals.get(id)); }

  async commitFinalApproval(
    input: Parameters<ContentPlatformRepository["commitFinalApproval"]>[0],
  ): Promise<RepositoryCommitResult> {
    if (this.committedOperations.has(input.operationId)) return { status: "already_committed" };
    const content = this.requireContent(input.contentId);
    const conflict = checkConflict(content, input.expectedContentUpdatedAt, input.expectedWorkflowStatus);
    if (conflict) return conflict;

    const nextContent: Content = {
      ...content,
      workflowStatus: input.nextWorkflowStatus,
      approvedRevisionId: input.approval.revisionId,
      updatedAt: input.approval.createdAt,
    };
    this.approvals.set(input.approval.id, structuredClone(input.approval));
    this.contents.set(content.id, nextContent);
    this.committedOperations.add(input.operationId);
    return { status: "committed" };
  }

  async commitPublication(
    input: Parameters<ContentPlatformRepository["commitPublication"]>[0],
  ): Promise<RepositoryCommitResult> {
    if (this.committedOperations.has(input.operationId)) return { status: "already_committed" };
    const content = this.requireContent(input.contentId);
    const conflict = checkConflict(content, input.expectedContentUpdatedAt, input.expectedWorkflowStatus);
    if (conflict) return conflict;

    const nextContent: Content = {
      ...content,
      workflowStatus: input.nextWorkflowStatus,
      ...(input.nextWorkflowStatus === "published"
        ? { publishedRevisionId: input.publication.revisionId }
        : {}),
      updatedAt: input.publication.updatedAt,
    };
    this.publications.set(input.publication.id, structuredClone(input.publication));
    this.contents.set(content.id, nextContent);
    this.committedOperations.add(input.operationId);
    return { status: "committed" };
  }

  async getPublication(id: string) { return cloneOrNull(this.publications.get(id)); }

  private requireContent(id: string) {
    const content = this.contents.get(id);
    if (!content) throw new Error(`Content not found: ${id}`);
    return content;
  }
}

function checkConflict(
  content: Content,
  expectedUpdatedAt: string,
  expectedWorkflowStatus: Content["workflowStatus"],
): RepositoryCommitResult | undefined {
  if (content.updatedAt !== expectedUpdatedAt) return { status: "conflict", reason: "CONTENT_UPDATED" };
  if (content.workflowStatus !== expectedWorkflowStatus) return { status: "conflict", reason: "WORKFLOW_CHANGED" };
  return undefined;
}

function toMap<T extends { id: string }>(items: T[] = []) {
  return new Map(items.map((item) => [item.id, structuredClone(item)]));
}

function cloneOrNull<T>(value: T | undefined): T | null {
  return value ? structuredClone(value) : null;
}
