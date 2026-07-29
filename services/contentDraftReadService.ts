export type ContentDraftReadErrorCode =
  | "DB_NOT_CONFIGURED"
  | "DRAFT_NOT_FOUND"
  | "DRAFT_READ_FAILED"
  | "DRAFT_CONTRACT_MISMATCH";

export type ContentDraftReadError = {
  errorCode: ContentDraftReadErrorCode;
  message: string;
  table?: string;
  providerCode?: string;
};

export type ContentDraftReadSource = {
  sourceId: string;
  title: string;
  url: string;
  publisherName: string | null;
  sourceType: string;
  summary: string;
  verificationStatus: string;
  trustLevel: string;
  usageType: string;
  relevanceNote: string | null;
  metadata: Record<string, unknown>;
};

export type ContentDraftReadSuccess = {
  contentId: string;
  revisionId: string;
  revisionNumber: number;
  revisionStatus: string | null;
  title: string;
  summary: string;
  bodyMarkdown: string | null;
  structuredContent: unknown;
  slug: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  authorName: string | null;
  idempotencyKey: string | null;
  requestFingerprint: string | null;
  sources: ContentDraftReadSource[];
};

export type ContentDraftReadResult =
  | { ok: true; value: ContentDraftReadSuccess }
  | { ok: false; error: ContentDraftReadError };

type QueryResult<T> = {
  data: T | null;
  error: { code?: string; message?: string } | null;
};

type QueryBuilder = PromiseLike<QueryResult<unknown>> & {
  select(columns: string): QueryBuilder;
  eq(column: string, value: unknown): QueryBuilder;
  order(column: string, options: { ascending: boolean }): QueryBuilder;
  maybeSingle(): Promise<QueryResult<unknown>>;
};

export type ContentDraftReadSupabaseClient = {
  from(table: string): QueryBuilder;
};

type RevisionRow = {
  id: number | string;
  content_id: number | string | null;
  revision_number: number | string | null;
  revision_status: string | null;
  revised_draft: {
    title?: unknown;
    summary?: unknown;
    bodyMarkdown?: unknown;
    structuredContent?: unknown;
  } | null;
};

type MetadataRow = {
  content_id: number | string;
  revision_id: number | string;
  revision_number: number | string;
  slug: string;
  title: string;
  summary: string;
  body_markdown: string | null;
  structured_content: unknown;
  category_id: string;
  category_name: string;
  category_slug: string;
  author_name: string | null;
  metadata: Record<string, unknown> | null;
};

type SourceReferenceRow = {
  source_id: number | string;
  usage_type: string;
  relevance_note: string | null;
};

type SourceRow = {
  id: number | string;
  source_title: string;
  source_url: string;
  publisher_name: string | null;
  source_type: string;
  summary: string;
  verification_status: string;
  trust_level: string;
  metadata: Record<string, unknown> | null;
};

export async function getContentDraftByRevisionId(
  supabase: ContentDraftReadSupabaseClient | null,
  revisionId: number,
): Promise<ContentDraftReadResult> {
  if (!supabase) {
    return {
      ok: false,
      error: {
        errorCode: "DB_NOT_CONFIGURED",
        message: "Supabase admin client is not configured.",
      },
    };
  }

  const revisionResult = await supabase
    .from("content_revisions")
    .select("id, content_id, revision_number, revision_status, revised_draft")
    .eq("id", revisionId)
    .maybeSingle();
  if (revisionResult.error) return dbError("DRAFT_READ_FAILED", "Failed to read content revision.", "content_revisions", revisionResult.error);
  if (!revisionResult.data) {
    return {
      ok: false,
      error: {
        errorCode: "DRAFT_NOT_FOUND",
        message: "Content draft revision was not found.",
        table: "content_revisions",
      },
    };
  }
  const revision = revisionResult.data as RevisionRow;

  const metadataResult = await supabase
    .from("content_revision_public_metadata")
    .select("content_id, revision_id, revision_number, slug, title, summary, body_markdown, structured_content, category_id, category_name, category_slug, author_name, metadata")
    .eq("revision_id", revisionId)
    .maybeSingle();
  if (metadataResult.error) return dbError("DRAFT_READ_FAILED", "Failed to read content draft public metadata.", "content_revision_public_metadata", metadataResult.error);
  if (!metadataResult.data) return contractError("content_revision_public_metadata", "Content draft public metadata was not found.");
  const metadata = metadataResult.data as MetadataRow;

  const referencesResult = await supabase
    .from("content_revision_source_references")
    .select("source_id, usage_type, relevance_note")
    .eq("revision_id", revisionId)
    .order("id", { ascending: true });
  if (referencesResult.error) return dbError("DRAFT_READ_FAILED", "Failed to read content draft source references.", "content_revision_source_references", referencesResult.error);
  const references = Array.isArray(referencesResult.data) ? referencesResult.data as SourceReferenceRow[] : [];

  const sources: ContentDraftReadSource[] = [];
  for (const reference of references) {
    const sourceResult = await supabase
      .from("content_public_sources")
      .select("id, source_title, source_url, publisher_name, source_type, summary, verification_status, trust_level, metadata")
      .eq("id", reference.source_id)
      .maybeSingle();
    if (sourceResult.error) return dbError("DRAFT_READ_FAILED", "Failed to read content draft public source.", "content_public_sources", sourceResult.error);
    if (!sourceResult.data) return contractError("content_public_sources", `Content draft source ${reference.source_id} was not found.`);
    const source = sourceResult.data as SourceRow;
    sources.push({
      sourceId: String(source.id),
      title: source.source_title,
      url: source.source_url,
      publisherName: source.publisher_name,
      sourceType: source.source_type,
      summary: source.summary,
      verificationStatus: source.verification_status,
      trustLevel: source.trust_level,
      usageType: reference.usage_type,
      relevanceNote: reference.relevance_note,
      metadata: source.metadata ?? {},
    });
  }

  return {
    ok: true,
    value: {
      contentId: String(metadata.content_id ?? revision.content_id),
      revisionId: String(revision.id),
      revisionNumber: Number(metadata.revision_number ?? revision.revision_number),
      revisionStatus: revision.revision_status,
      title: metadata.title ?? readDraftString(revision.revised_draft?.title),
      summary: metadata.summary ?? readDraftString(revision.revised_draft?.summary),
      bodyMarkdown: metadata.body_markdown ?? readDraftString(revision.revised_draft?.bodyMarkdown),
      structuredContent: metadata.structured_content ?? revision.revised_draft?.structuredContent ?? null,
      slug: metadata.slug,
      category: {
        id: metadata.category_id,
        name: metadata.category_name,
        slug: metadata.category_slug,
      },
      authorName: metadata.author_name,
      idempotencyKey: readMetadataString(metadata.metadata, "idempotencyKey"),
      requestFingerprint: readMetadataString(metadata.metadata, "requestFingerprint"),
      sources,
    },
  };
}

function readDraftString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readMetadataString(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

function contractError(table: string, message: string): { ok: false; error: ContentDraftReadError } {
  return {
    ok: false,
    error: {
      errorCode: "DRAFT_CONTRACT_MISMATCH",
      message,
      table,
    },
  };
}

function dbError(
  errorCode: ContentDraftReadErrorCode,
  message: string,
  table: string,
  error: { code?: string; message?: string },
): { ok: false; error: ContentDraftReadError } {
  return {
    ok: false,
    error: {
      errorCode,
      message,
      table,
      providerCode: error.code,
    },
  };
}
