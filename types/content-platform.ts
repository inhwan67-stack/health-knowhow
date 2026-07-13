/**
 * Domain contracts for the future multi-site content operations platform.
 *
 * This module is intentionally independent from Supabase, UI components, and
 * the legacy mock/CSV models. Dates are ISO-8601 strings at this boundary.
 */

export type EntityId = string;
export type IsoDateTime = string;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type SiteStatus = "active" | "inactive" | "archived";
export type TopicStatus = "candidate" | "active" | "paused" | "archived";

export type ContentType = "article" | "guide" | "news" | "experience" | "other";

export type ContentWorkflowStatus =
  | "drafting"
  | "first_review_pending"
  | "changes_requested"
  | "first_review_approved"
  | "final_approval_pending"
  | "final_approved"
  | "scheduled"
  | "published"
  | "publication_failed"
  | "rejected"
  | "archived";

export type SourceType =
  | "government"
  | "medical"
  | "academic"
  | "news"
  | "blog"
  | "video"
  | "social"
  | "other";

export type SourceTrustLevel = "trusted" | "review_required" | "untrusted";
export type SourceVerificationStatus = "pending" | "verified" | "rejected" | "stale";
export type SourceUsageType = "primary" | "supporting" | "counterpoint" | "related";

export type DraftOrigin = "ai" | "human" | "import";
export type DraftStatus = "generating" | "ready" | "failed" | "superseded";
export type RevisionAuthorType = "ai" | "human" | "system";

export type ReviewStage = "first_review";
export type ReviewStatus = "pending" | "approved" | "changes_requested" | "rejected";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "revoked";
export type PublicationStatus =
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled"
  | "unpublished";

export type PlatformActorType = "human" | "ai_agent" | "n8n" | "system";
export type PlatformRole =
  | "topic_manager"
  | "source_manager"
  | "author"
  | "first_reviewer"
  | "final_approver"
  | "publisher"
  | "administrator";

/**
 * Automation actors deliberately stop at AI revision creation. They cannot
 * create final approvals or publications. Authorization must still be enforced
 * by the future server and database layers; these types document the boundary.
 */
export type AutomationCapability =
  | "source:create"
  | "topic:candidate:create"
  | "draft:create"
  | "revision:ai:create";

export type AdministratorCapability =
  | "review:first:decide"
  | "approval:final:decide"
  | "publication:create"
  | "publication:schedule"
  | "publication:unpublish";

export type ActorReference = {
  actorType: PlatformActorType;
  actorId: EntityId;
};

export type Site = {
  id: EntityId;
  key: string;
  name: string;
  domain: string;
  contentDomain: string;
  defaultLocale: string;
  timezone: string;
  status: SiteStatus;
  settings?: Record<string, JsonValue>;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

/** Topics are site-owned even when their names or keywords overlap. */
export type Topic = {
  id: EntityId;
  siteId: EntityId;
  parentTopicId?: EntityId;
  name: string;
  slug: string;
  topicType: string;
  keywords: string[];
  status: TopicStatus;
  trendScore?: number;
  lastCollectedAt?: IsoDateTime;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type ContentSourceReference = {
  sourceId: EntityId;
  usageType: SourceUsageType;
  relevanceNote?: string;
};

/**
 * Content is the stable workflow container. Editable copy belongs to Draft or
 * Revision. A Content may reference many globally shared Sources.
 */
export type Content = {
  id: EntityId;
  siteId: EntityId;
  primaryTopicId: EntityId;
  secondaryTopicIds: EntityId[];
  contentType: ContentType;
  workingTitle: string;
  slug: string;
  workflowStatus: ContentWorkflowStatus;
  sourceReferences: ContentSourceReference[];
  currentRevisionId?: EntityId;
  approvedRevisionId?: EntityId;
  publishedRevisionId?: EntityId;
  createdBy: ActorReference;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  archivedAt?: IsoDateTime;
};

/** Sources are global records and intentionally do not have a required siteId. */
export type Source = {
  id: EntityId;
  sourceType: SourceType;
  publisherName: string;
  title: string;
  canonicalUrl: string;
  publishedAt?: IsoDateTime;
  retrievedAt: IsoDateTime;
  rawText?: string;
  rawContentLocation?: string;
  summary?: string;
  language: string;
  trustLevel: SourceTrustLevel;
  verificationStatus: SourceVerificationStatus;
  contentHash?: string;
  metadata?: Record<string, JsonValue>;
  createdBy: ActorReference;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type MarkdownContentBody = {
  format: "markdown";
  markdown: string;
  /** Reserved for a future block editor without changing the Markdown default. */
  structuredBlocks?: JsonValue;
};

export type AiGenerationMetadata = {
  runId: string;
  provider: string;
  model: string;
  promptVersion: string;
  inputSnapshot?: JsonValue;
  parameters?: Record<string, JsonValue>;
};

/** A Draft preserves the initially generated or imported working copy. */
export type Draft = {
  id: EntityId;
  contentId: EntityId;
  origin: DraftOrigin;
  status: DraftStatus;
  title: string;
  summary?: string;
  body: MarkdownContentBody;
  sourceReferences: ContentSourceReference[];
  aiGeneration?: AiGenerationMetadata;
  createdBy: ActorReference;
  createdAt: IsoDateTime;
  completedAt?: IsoDateTime;
  failureReason?: string;
};

/**
 * Revisions are immutable snapshots. A changed revision never inherits the
 * review or approval of its parent revision.
 */
export type Revision = {
  id: EntityId;
  contentId: EntityId;
  parentRevisionId?: EntityId;
  sourceDraftId?: EntityId;
  revisionNumber: number;
  authorType: RevisionAuthorType;
  title: string;
  summary?: string;
  body: MarkdownContentBody;
  seoTitle?: string;
  seoDescription?: string;
  sourceReferences: ContentSourceReference[];
  changeSummary?: string;
  contentHash: string;
  createdBy: ActorReference;
  createdAt: IsoDateTime;
};

export type Review = {
  id: EntityId;
  contentId: EntityId;
  revisionId: EntityId;
  stage: ReviewStage;
  status: ReviewStatus;
  reviewerId?: EntityId;
  comment?: string;
  checklistResult?: Record<string, JsonValue>;
  riskScanResult?: Record<string, JsonValue>;
  createdAt: IsoDateTime;
  decidedAt?: IsoDateTime;
};

/** Final approval is revision-specific and may be granted only by an admin. */
export type Approval = {
  id: EntityId;
  contentId: EntityId;
  revisionId: EntityId;
  firstReviewId: EntityId;
  status: ApprovalStatus;
  approverId?: EntityId;
  comment?: string;
  createdAt: IsoDateTime;
  decidedAt?: IsoDateTime;
  revokedAt?: IsoDateTime;
};

/**
 * A publication must point to the exact revision covered by approvalId. Future
 * persistence must enforce that pair and require an approved Approval row.
 */
export type Publication = {
  id: EntityId;
  siteId: EntityId;
  contentId: EntityId;
  revisionId: EntityId;
  approvalId: EntityId;
  status: PublicationStatus;
  scheduledAt?: IsoDateTime;
  publishedAt?: IsoDateTime;
  publicUrl?: string;
  externalPostId?: string;
  failureReason?: string;
  createdByAdminId: EntityId;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export const CONTENT_WORKFLOW_TRANSITIONS = {
  drafting: ["first_review_pending", "archived"],
  first_review_pending: ["changes_requested", "first_review_approved", "rejected", "archived"],
  changes_requested: ["drafting", "first_review_pending", "archived"],
  first_review_approved: ["final_approval_pending", "drafting", "archived"],
  final_approval_pending: ["final_approved", "changes_requested", "rejected", "archived"],
  final_approved: ["scheduled", "published", "drafting", "archived"],
  scheduled: ["published", "publication_failed", "final_approved", "drafting", "archived"],
  published: ["drafting", "archived"],
  publication_failed: ["scheduled", "final_approved", "drafting", "archived"],
  rejected: ["drafting", "archived"],
  archived: [],
} as const satisfies Record<ContentWorkflowStatus, readonly ContentWorkflowStatus[]>;

/** Pure workflow guard. Entity and authorization checks belong in later layers. */
export function canTransitionContentWorkflow(
  from: ContentWorkflowStatus,
  to: ContentWorkflowStatus,
): boolean {
  return (CONTENT_WORKFLOW_TRANSITIONS[from] as readonly ContentWorkflowStatus[]).includes(to);
}

export function getAllowedContentWorkflowTransitions(
  from: ContentWorkflowStatus,
): readonly ContentWorkflowStatus[] {
  return CONTENT_WORKFLOW_TRANSITIONS[from];
}

export const REVIEW_STATUS_TRANSITIONS = {
  pending: ["approved", "changes_requested", "rejected"],
  approved: [],
  changes_requested: [],
  rejected: [],
} as const satisfies Record<ReviewStatus, readonly ReviewStatus[]>;

export const APPROVAL_STATUS_TRANSITIONS = {
  pending: ["approved", "rejected"],
  approved: ["revoked"],
  rejected: [],
  revoked: [],
} as const satisfies Record<ApprovalStatus, readonly ApprovalStatus[]>;

export const PUBLICATION_STATUS_TRANSITIONS = {
  scheduled: ["publishing", "cancelled"],
  publishing: ["published", "failed"],
  published: ["unpublished"],
  failed: ["scheduled", "publishing", "cancelled"],
  cancelled: [],
  unpublished: [],
} as const satisfies Record<PublicationStatus, readonly PublicationStatus[]>;

export function canTransitionReviewStatus(from: ReviewStatus, to: ReviewStatus): boolean {
  return (REVIEW_STATUS_TRANSITIONS[from] as readonly ReviewStatus[]).includes(to);
}

export function canTransitionApprovalStatus(from: ApprovalStatus, to: ApprovalStatus): boolean {
  return (APPROVAL_STATUS_TRANSITIONS[from] as readonly ApprovalStatus[]).includes(to);
}

export function canTransitionPublicationStatus(from: PublicationStatus, to: PublicationStatus): boolean {
  return (PUBLICATION_STATUS_TRANSITIONS[from] as readonly PublicationStatus[]).includes(to);
}

/**
 * Legacy read-only model mapping (no migration is performed here):
 *
 * - HealthArticle -> Content + one or more Revisions; its ArticleSource[] values
 *   map to global Source records plus Content.sourceReferences. A legacy
 *   `published` article also implies a historical Approval and Publication when
 *   it is eventually migrated.
 * - ArticleResource -> Source. It is an external reference, not authored Content.
 * - Experience -> Content with contentType `experience` + Draft/Revision. Its
 *   pending/approved/rejected status must be translated into the new review and
 *   approval workflow during a future explicit migration.
 *
 * User health records are intentionally excluded from this content domain.
 */
export const LEGACY_CONTENT_MODEL_MAPPING = {
  HealthArticle: "Content + Revision + Source + Approval + Publication",
  ArticleResource: "Source",
  Experience: "Content(contentType=experience) + Draft + Revision + Review",
} as const;
