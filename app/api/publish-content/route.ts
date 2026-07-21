import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdminClient } from "../../../lib/supabase/admin";
import {
  createPublishContentRequestFingerprint,
  validatePublishContentRequest,
  type PublishContentRequestBody,
  type ValidatedPublishContentRequest,
} from "../../../services/publishContentApiPolicy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PublishedContentRow = {
  queue_id: number | string | null;
  publication_id: number | string;
  content_id: number | string;
  title: string;
  slug: string;
  publish_status: string;
  published_at: string;
  request_fingerprint: string;
};

type PublishContentErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "PUBLISH_NOT_APPROVED"
  | "DB_NOT_CONFIGURED"
  | "DUPLICATE_SLUG"
  | "IDEMPOTENCY_CONFLICT"
  | "PUBLISH_FAILED";

function jsonFailure(errorCode: PublishContentErrorCode, message: string, status: number) {
  return Response.json(
    {
      success: false,
      publishStatus: "failed",
      errorCode,
      message,
    },
    { status },
  );
}

function selectedPublishedContentColumns() {
  return "queue_id, publication_id, content_id, title, slug, publish_status, published_at, request_fingerprint";
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  return token;
}

function safeTokenEquals(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function assertAuthorized(request: Request): boolean {
  const expectedSecret = process.env.PUBLISH_API_SECRET;
  const token = getBearerToken(request);

  if (!expectedSecret || !token) return false;

  return safeTokenEquals(token, expectedSecret);
}

function responseFromRow(row: PublishedContentRow, alreadyPublished: boolean) {
  const publicationId = String(row.publication_id);
  const contentId = String(row.content_id);

  return Response.json({
    success: true,
    alreadyPublished,
    publicationId,
    contentId,
    publishStatus: row.publish_status,
    publishedUrl: `/health-info/${row.slug}`,
    publishedAt: row.published_at,
  });
}

function toInsertPayload(input: ValidatedPublishContentRequest) {
  return {
    queue_id: input.queueId,
    publication_id: input.publicationId,
    content_id: input.contentId,
    title: input.title,
    slug: input.slug,
    publishing_package: input.publishingPackage,
    request_fingerprint: createPublishContentRequestFingerprint(input),
    publish_status: "published",
    published_by: input.publishedBy ?? null,
    source: "n8n",
  };
}

function idempotencyConflict() {
  return jsonFailure(
    "IDEMPOTENCY_CONFLICT",
    "The same publicationId was already used with a different publish request.",
    409,
  );
}

function replayOrConflict(row: PublishedContentRow, input: ValidatedPublishContentRequest) {
  const requestFingerprint = createPublishContentRequestFingerprint(input);

  if (row.request_fingerprint !== requestFingerprint) {
    return idempotencyConflict();
  }

  return responseFromRow(row, true);
}

export async function POST(request: Request) {
  if (!assertAuthorized(request)) {
    return jsonFailure("UNAUTHORIZED", "Invalid or missing publish API token.", 401);
  }

  let body: PublishContentRequestBody;

  try {
    body = (await request.json()) as PublishContentRequestBody;
  } catch {
    return jsonFailure("VALIDATION_ERROR", "Request body must be valid JSON.", 400);
  }

  const validation = validatePublishContentRequest(body);
  if (!validation.ok) {
    return jsonFailure(validation.error.errorCode, validation.error.message, 400);
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return jsonFailure("DB_NOT_CONFIGURED", "Supabase admin client is not configured.", 503);
  }

  const input = validation.value;

  const { data: existingRows, error: existingError } = await supabase
    .from("published_contents")
    .select(selectedPublishedContentColumns())
    .or(`publication_id.eq.${input.publicationId},slug.eq.${input.slug}`)
    .limit(2);

  if (existingError) {
    return jsonFailure("PUBLISH_FAILED", "Failed to check existing published content.", 500);
  }

  const publishedContentRows = (existingRows ?? []) as unknown as PublishedContentRow[];

  const existingByPublicationId = publishedContentRows.find(
    (row) => String(row.publication_id) === input.publicationId,
  );

  if (existingByPublicationId) {
    return replayOrConflict(existingByPublicationId, input);
  }

  const existingBySlug = publishedContentRows.find((row) => row.slug === input.slug);
  if (existingBySlug) {
    return jsonFailure("DUPLICATE_SLUG", "A published content item already uses this slug.", 409);
  }

  const { data: insertedRow, error: insertError } = await supabase
    .from("published_contents")
    .insert(toInsertPayload(input))
    .select(selectedPublishedContentColumns())
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: replayRows } = await supabase
        .from("published_contents")
        .select(selectedPublishedContentColumns())
        .eq("publication_id", input.publicationId)
        .limit(1);

      const replayRow = ((replayRows ?? []) as unknown as PublishedContentRow[])[0];
      if (replayRow) return replayOrConflict(replayRow, input);

      const { data: slugRows } = await supabase
        .from("published_contents")
        .select(selectedPublishedContentColumns())
        .eq("slug", input.slug)
        .limit(1);

      const slugRow = ((slugRows ?? []) as unknown as PublishedContentRow[])[0];
      if (slugRow && String(slugRow.publication_id) !== input.publicationId) {
        return jsonFailure("DUPLICATE_SLUG", "A published content item already uses this slug.", 409);
      }
    }

    return jsonFailure("PUBLISH_FAILED", "Failed to store published content.", 500);
  }

  return responseFromRow(insertedRow as unknown as PublishedContentRow, false);
}
