import {
  MAX_CANONICAL_PREVIEW_BODY_BYTES,
  assertInternalMedicalReviewCanonicalPreviewAuthorized,
  buildCanonicalMedicalReviewPreview,
  canonicalPreviewSideEffects,
  parseCanonicalPreviewPayload,
  type CanonicalPreviewErrorCode,
} from "../../../../../services/internalMedicalReviewCanonicalPreview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FailureBody = {
  success: false;
  dryRun: true;
  persisted: false;
  persistable: false;
  errorCode: CanonicalPreviewErrorCode;
  message: string;
  validationErrors?: string[];
  sideEffects: ReturnType<typeof canonicalPreviewSideEffects>;
};

export async function POST(request: Request) {
  if (!assertInternalMedicalReviewCanonicalPreviewAuthorized(request)) {
    return jsonFailure("UNAUTHORIZED", "Invalid or missing canonical preview token.", 401);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return jsonFailure("VALIDATION_ERROR", "Request body could not be read.", 400);
  }
  if (Buffer.byteLength(rawBody, "utf8") > MAX_CANONICAL_PREVIEW_BODY_BYTES) {
    return jsonFailure("PAYLOAD_TOO_LARGE", "Canonical preview request body is too large.", 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return jsonFailure("VALIDATION_ERROR", "Request body must be valid JSON.", 400);
  }

  const parsed = parseCanonicalPreviewPayload(body);
  if (!parsed.ok) {
    return jsonFailure("VALIDATION_ERROR", "Invalid canonical preview request.", 400, parsed.errors);
  }

  const preview = buildCanonicalMedicalReviewPreview(parsed.value);
  return Response.json(
    {
      success: true,
      dryRun: true,
      contentId: parsed.value.contentId,
      revisionId: parsed.value.revisionId,
      canonicalMaterialPreview: preview.canonicalMaterialPreview,
      payloadFingerprintPreview: preview.payloadFingerprintPreview,
      persisted: false,
      persistable: false,
      sideEffects: canonicalPreviewSideEffects(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function jsonFailure(
  errorCode: CanonicalPreviewErrorCode,
  message: string,
  status: number,
  validationErrors?: string[],
) {
  const body: FailureBody = {
    success: false,
    dryRun: true,
    persisted: false,
    persistable: false,
    errorCode,
    message,
    ...(validationErrors ? { validationErrors } : {}),
    sideEffects: canonicalPreviewSideEffects(),
  };
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
