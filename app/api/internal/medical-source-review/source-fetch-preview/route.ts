import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getContentDraftByRevisionId,
  type ContentDraftReadErrorCode,
  type ContentDraftReadSupabaseClient,
} from "../../../../../services/contentDraftReadService";
import {
  assertInternalSourceFetchPreviewAuthorized,
  fetchSourcePreviews,
  parseSourceFetchPreviewPayload,
  sourceFetchPreviewSideEffects,
  validateDraftSourcesForPreview,
  type SourceFetchPreviewErrorCode,
} from "../../../../../services/internalSourceFetchPreview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FailureBody = {
  success: false;
  dryRun: true;
  persisted: false;
  persistable: false;
  sourceFetchExecuted: false;
  sourceVerificationExecuted: false;
  errorCode: SourceFetchPreviewErrorCode;
  message: string;
  validationErrors?: string[];
  results: [];
  sideEffects: ReturnType<typeof sourceFetchPreviewSideEffects>;
};

export async function POST(request: Request) {
  if (!assertInternalSourceFetchPreviewAuthorized(request)) {
    return jsonFailure("UNAUTHORIZED", "Invalid or missing source fetch preview token.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonFailure("VALIDATION_ERROR", "Request body must be valid JSON.", 400);
  }

  const parsed = parseSourceFetchPreviewPayload(body);
  if (!parsed.ok) {
    return jsonFailure(parsed.errorCode, "Invalid source fetch preview request.", 400, parsed.errors);
  }

  const draftResult = await getContentDraftByRevisionId(
    getSupabaseAdminClient() as ContentDraftReadSupabaseClient | null,
    Number(parsed.value.revisionId),
  );
  if (!draftResult.ok) {
    return jsonFailure(draftResult.error.errorCode, safeMessageForDraftError(draftResult.error.errorCode), statusForDraftError(draftResult.error.errorCode), undefined, true);
  }

  const sourceValidation = validateDraftSourcesForPreview(parsed.value, draftResult.value);
  if (!sourceValidation.ok) {
    return jsonFailure(sourceValidation.errorCode, "Requested sources do not match the stored draft.", 400, sourceValidation.errors, true);
  }

  const results = await fetchSourcePreviews(sourceValidation.sources);
  return Response.json(
    {
      success: true,
      dryRun: true,
      persisted: false,
      persistable: false,
      contentId: parsed.value.contentId,
      revisionId: parsed.value.revisionId,
      sourceFetchExecuted: true,
      sourceVerificationExecuted: false,
      results,
      sideEffects: sourceFetchPreviewSideEffects({
        internalDraftGetCalled: true,
        externalSourceGetsCalled: true,
      }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function jsonFailure(
  errorCode: SourceFetchPreviewErrorCode | ContentDraftReadErrorCode,
  message: string,
  status: number,
  validationErrors?: string[],
  internalDraftGetCalled = false,
) {
  const body: FailureBody = {
    success: false,
    dryRun: true,
    persisted: false,
    persistable: false,
    sourceFetchExecuted: false,
    sourceVerificationExecuted: false,
    errorCode: errorCode as SourceFetchPreviewErrorCode,
    message,
    ...(validationErrors ? { validationErrors } : {}),
    results: [],
    sideEffects: sourceFetchPreviewSideEffects({ internalDraftGetCalled }),
  };
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function statusForDraftError(errorCode: ContentDraftReadErrorCode): number {
  if (errorCode === "DB_NOT_CONFIGURED") return 503;
  if (errorCode === "DRAFT_NOT_FOUND") return 404;
  return 500;
}

function safeMessageForDraftError(errorCode: ContentDraftReadErrorCode): string {
  if (errorCode === "DB_NOT_CONFIGURED") return "Internal draft storage is not configured.";
  if (errorCode === "DRAFT_NOT_FOUND") return "Content draft revision was not found.";
  return "Failed to read content draft.";
}
