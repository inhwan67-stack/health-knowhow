import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getContentDraftByRevisionId,
  type ContentDraftReadErrorCode,
  type ContentDraftReadSupabaseClient,
} from "../../../../../services/contentDraftReadService";
import { assertInternalContentDraftAuthorized } from "../../../../../services/internalContentDraftAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ revisionId: string }> | { revisionId: string };
};

type GetDraftErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | ContentDraftReadErrorCode;

function jsonFailure(errorCode: GetDraftErrorCode, message: string, status: number) {
  return Response.json(
    {
      success: false,
      errorCode,
      message,
      sideEffects: {
        publicationCreated: false,
        websitePublishQueueCreated: false,
        finalApprovalCreated: false,
        publishedContentsCreated: false,
        externalCalls: false,
      },
    },
    { status },
  );
}

export async function GET(request: Request, context: RouteContext) {
  if (!assertInternalContentDraftAuthorized(request)) {
    return jsonFailure("UNAUTHORIZED", "Invalid or missing internal content draft API token.", 401);
  }

  const params = await context.params;
  const revisionId = parseRevisionId(params.revisionId);
  if (revisionId === null) {
    return jsonFailure("VALIDATION_ERROR", "revisionId must be a positive integer.", 400);
  }

  const result = await getContentDraftByRevisionId(
    getSupabaseAdminClient() as ContentDraftReadSupabaseClient | null,
    revisionId,
  );

  if (!result.ok) {
    logReadFailure(revisionId, result.error);
    return jsonFailure(
      result.error.errorCode,
      safeMessageFor(result.error.errorCode),
      statusFor(result.error.errorCode),
    );
  }

  return Response.json({
    success: true,
    ...result.value,
    sideEffects: {
      publicationCreated: false,
      websitePublishQueueCreated: false,
      finalApprovalCreated: false,
      publishedContentsCreated: false,
      externalCalls: false,
    },
  });
}

function parseRevisionId(value: string): number | null {
  if (!/^[1-9][0-9]*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function statusFor(errorCode: ContentDraftReadErrorCode) {
  if (errorCode === "DB_NOT_CONFIGURED") return 503;
  if (errorCode === "DRAFT_NOT_FOUND") return 404;
  return 500;
}

function safeMessageFor(errorCode: ContentDraftReadErrorCode): string {
  if (errorCode === "DB_NOT_CONFIGURED") return "Internal draft storage is not configured.";
  if (errorCode === "DRAFT_NOT_FOUND") return "Content draft revision was not found.";
  return "Failed to read content draft.";
}

function logReadFailure(
  revisionId: number,
  error: { errorCode: ContentDraftReadErrorCode; table?: string; providerCode?: string },
) {
  console.error("internal_content_draft_read_failed", {
    revisionId,
    errorCode: error.errorCode,
    table: error.table,
    providerCode: error.providerCode,
  });
}
