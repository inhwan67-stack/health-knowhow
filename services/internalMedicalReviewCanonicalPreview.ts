import { createHash, timingSafeEqual } from "node:crypto";

export const MEDICAL_REVIEW_CANONICAL_PREVIEW_SCHEMA_VERSION = "medical-source-review-canonical-preview.v1";
export const MAX_CANONICAL_PREVIEW_BODY_BYTES = 128 * 1024;
export const MAX_CANONICAL_PREVIEW_CLAIMS = 50;
export const MAX_CANONICAL_PREVIEW_SOURCES = 10;

export type CanonicalPreviewErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "PAYLOAD_TOO_LARGE"
  | "CANONICAL_PREVIEW_FAILED";

export type ClaimCandidatePreviewInput = {
  claimId: string;
  originalText: string;
  normalizedClaim: string;
  claimType: string;
  riskLevel: string;
  sourceRequired: boolean;
  candidateSourceIds: string[];
  reviewStatus: "candidate_only";
  note?: string | null;
};

export type SourceCandidatePreviewInput = {
  sourceId: string;
  title: string;
  requestedUrl?: string | null;
  publisherName?: string | null;
  sourceType?: string | null;
  candidateOnly: true;
  verificationStatus: "verification_required";
  trustLevel: "review_required";
};

export type SourceFetchPreviewCanonicalInput = {
  sourceId: string;
  requestedUrl?: string | null;
  finalUrl?: string | null;
  fetchSucceeded: boolean;
  httpStatus: number | null;
  contentType?: string | null;
  bytesRead?: number | null;
  textPreviewLength: number;
  textDigest: string | null;
  verificationStatus: "fetched_unverified" | "verification_required";
  verificationWarnings?: string[];
  fetchedAt?: string;
  textPreview?: string;
};

export type CanonicalPreviewRequest = {
  dryRun: true;
  contentId: string;
  revisionId: string;
  revisionNumber: number;
  claimCandidates: ClaimCandidatePreviewInput[];
  sourceCandidates: SourceCandidatePreviewInput[];
  sourceFetchPreviews: SourceFetchPreviewCanonicalInput[];
  reviewEngineExecuted: false;
  sourceVerificationExecuted: false;
  approvedClaimIds: [];
};

export type CanonicalMaterialPreview = {
  schemaVersion: typeof MEDICAL_REVIEW_CANONICAL_PREVIEW_SCHEMA_VERSION;
  contentId: string;
  revisionId: string;
  revisionNumber: number;
  reviewEngineExecuted: false;
  sourceVerificationExecuted: false;
  approvedClaimIds: [];
  claims: Array<{
    claimId: string;
    originalText: string;
    normalizedClaim: string;
    claimType: string;
    riskLevel: string;
    sourceRequired: boolean;
    candidateSourceIds: string[];
    reviewStatus: "candidate_only";
    note: string | null;
  }>;
  sources: Array<{
    sourceId: string;
    title: string;
    requestedUrl: string | null;
    publisherName: string | null;
    sourceType: string | null;
    candidateOnly: true;
    verificationStatus: string | null;
    trustLevel: string | null;
    fetchPreview: {
      fetchSucceeded: boolean;
      httpStatus: number | null;
      contentType: string | null;
      bytesRead: number | null;
      textPreviewLength: number;
      textDigest: string | null;
      verificationStatus: "fetched_unverified" | "verification_required";
      verificationWarnings: string[];
    } | null;
  }>;
};

export type CanonicalPreviewResult = {
  canonicalMaterialPreview: CanonicalMaterialPreview;
  payloadFingerprintPreview: string;
};

export type CanonicalPreviewSideEffects = {
  externalCalls: false;
  databaseRead: false;
  databaseWrite: false;
  rpcCalled: false;
  notificationSent: false;
  publicationCreated: false;
  storageUploaded: false;
  imageGenerated: false;
};

export function canonicalPreviewSideEffects(): CanonicalPreviewSideEffects {
  return {
    externalCalls: false,
    databaseRead: false,
    databaseWrite: false,
    rpcCalled: false,
    notificationSent: false,
    publicationCreated: false,
    storageUploaded: false,
    imageGenerated: false,
  };
}

export function assertInternalMedicalReviewCanonicalPreviewAuthorized(request: Request): boolean {
  const expectedSecret = process.env.INTERNAL_MEDICAL_REVIEW_CANONICAL_PREVIEW_TOKEN;
  const token = readBearerToken(request.headers.get("authorization"));
  if (!expectedSecret || !token) return false;
  const actual = Buffer.from(token);
  const expected = Buffer.from(expectedSecret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function parseCanonicalPreviewPayload(payload: unknown): { ok: true; value: CanonicalPreviewRequest } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isPlainObject(payload)) return { ok: false, errors: ["Request body must be a JSON object."] };
  const body = payload as Record<string, unknown>;
  const allowedKeys = new Set([
    "dryRun",
    "contentId",
    "revisionId",
    "revisionNumber",
    "claimCandidates",
    "sourceCandidates",
    "sourceFetchPreviews",
    "reviewEngineExecuted",
    "sourceVerificationExecuted",
    "approvedClaimIds",
  ]);
  for (const key of Object.keys(body)) if (!allowedKeys.has(key)) errors.push(`Unknown field ${key} is not allowed.`);
  if (body.dryRun !== true) errors.push("dryRun must be true.");
  if (!isNonEmptyString(body.contentId)) errors.push("contentId must be a non-empty string.");
  if (!isNonEmptyString(body.revisionId)) errors.push("revisionId must be a non-empty string.");
  if (!Number.isSafeInteger(body.revisionNumber) || Number(body.revisionNumber) <= 0) errors.push("revisionNumber must be a positive safe integer.");
  if (body.reviewEngineExecuted !== false) errors.push("reviewEngineExecuted must be false for canonical preview.");
  if (body.sourceVerificationExecuted !== false) errors.push("sourceVerificationExecuted must be false for canonical preview.");
  if (!Array.isArray(body.approvedClaimIds) || body.approvedClaimIds.length !== 0) errors.push("approvedClaimIds must be an empty array.");

  const claimCandidates = Array.isArray(body.claimCandidates) ? body.claimCandidates : [];
  const sourceCandidates = Array.isArray(body.sourceCandidates) ? body.sourceCandidates : [];
  const sourceFetchPreviews = Array.isArray(body.sourceFetchPreviews) ? body.sourceFetchPreviews : [];
  if (!Array.isArray(body.claimCandidates)) errors.push("claimCandidates must be an array.");
  if (!Array.isArray(body.sourceCandidates)) errors.push("sourceCandidates must be an array.");
  if (!Array.isArray(body.sourceFetchPreviews)) errors.push("sourceFetchPreviews must be an array.");
  if (claimCandidates.length > MAX_CANONICAL_PREVIEW_CLAIMS) errors.push(`claimCandidates must contain at most ${MAX_CANONICAL_PREVIEW_CLAIMS} items.`);
  if (sourceCandidates.length > MAX_CANONICAL_PREVIEW_SOURCES) errors.push(`sourceCandidates must contain at most ${MAX_CANONICAL_PREVIEW_SOURCES} items.`);
  if (sourceFetchPreviews.length > MAX_CANONICAL_PREVIEW_SOURCES) errors.push(`sourceFetchPreviews must contain at most ${MAX_CANONICAL_PREVIEW_SOURCES} items.`);

  const parsedClaims = parseClaims(claimCandidates, errors);
  const parsedSources = parseSources(sourceCandidates, errors);
  const parsedFetchPreviews = parseFetchPreviews(sourceFetchPreviews, errors);
  validateSourceRelationships(parsedClaims, parsedSources, parsedFetchPreviews, errors);
  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      dryRun: true,
      contentId: String(body.contentId).trim(),
      revisionId: String(body.revisionId).trim(),
      revisionNumber: Number(body.revisionNumber),
      claimCandidates: parsedClaims,
      sourceCandidates: parsedSources,
      sourceFetchPreviews: parsedFetchPreviews,
      reviewEngineExecuted: false,
      sourceVerificationExecuted: false,
      approvedClaimIds: [],
    },
  };
}

export function buildCanonicalMedicalReviewPreview(request: CanonicalPreviewRequest): CanonicalPreviewResult {
  const fetchBySourceId = new Map(request.sourceFetchPreviews.map((preview) => [preview.sourceId, preview]));
  const canonicalMaterialPreview: CanonicalMaterialPreview = {
    schemaVersion: MEDICAL_REVIEW_CANONICAL_PREVIEW_SCHEMA_VERSION,
    contentId: request.contentId,
    revisionId: request.revisionId,
    revisionNumber: request.revisionNumber,
    reviewEngineExecuted: false,
    sourceVerificationExecuted: false,
    approvedClaimIds: [],
    claims: [...request.claimCandidates]
      .sort((a, b) => compareCodePoint(a.claimId, b.claimId))
      .map((claim) => ({
        claimId: claim.claimId,
        originalText: claim.originalText,
        normalizedClaim: claim.normalizedClaim,
        claimType: claim.claimType,
        riskLevel: claim.riskLevel,
        sourceRequired: claim.sourceRequired,
        candidateSourceIds: [...claim.candidateSourceIds].sort(compareCodePoint),
        reviewStatus: "candidate_only",
        note: claim.note ?? null,
      })),
    sources: [...request.sourceCandidates]
      .sort((a, b) => compareCodePoint(a.sourceId, b.sourceId))
      .map((source) => {
        const preview = fetchBySourceId.get(source.sourceId);
        return {
          sourceId: source.sourceId,
          title: source.title,
          requestedUrl: source.requestedUrl ?? null,
          publisherName: source.publisherName ?? null,
          sourceType: source.sourceType ?? null,
          candidateOnly: true,
          verificationStatus: source.verificationStatus,
          trustLevel: source.trustLevel,
          fetchPreview: preview ? {
            fetchSucceeded: preview.fetchSucceeded,
            httpStatus: preview.httpStatus,
            contentType: preview.contentType ?? null,
            bytesRead: preview.bytesRead ?? null,
            textPreviewLength: preview.textPreviewLength,
            textDigest: preview.textDigest,
            verificationStatus: preview.verificationStatus,
            verificationWarnings: [...(preview.verificationWarnings ?? [])].sort(compareCodePoint),
          } : null,
        };
      }),
  };
  return {
    canonicalMaterialPreview,
    payloadFingerprintPreview: createHash("sha256").update(stableStringify(canonicalMaterialPreview), "utf8").digest("hex"),
  };
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!isPlainObject(value)) return value;
  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const key of Object.keys(input).sort(compareCodePoint)) {
    if (input[key] !== undefined) output[key] = sortJson(input[key]);
  }
  return output;
}

function parseClaims(values: unknown[], errors: string[]): ClaimCandidatePreviewInput[] {
  const seen = new Set<string>();
  return values.flatMap((value, index) => {
    if (!isPlainObject(value)) {
      errors.push(`claimCandidates[${index}] must be an object.`);
      return [];
    }
    const item = value as Record<string, unknown>;
    const claimId = readString(item.claimId, `claimCandidates[${index}].claimId`, errors);
    const originalText = readString(item.originalText, `claimCandidates[${index}].originalText`, errors);
    const normalizedClaim = readString(item.normalizedClaim, `claimCandidates[${index}].normalizedClaim`, errors);
    const claimType = readString(item.claimType, `claimCandidates[${index}].claimType`, errors);
    const riskLevel = readString(item.riskLevel, `claimCandidates[${index}].riskLevel`, errors);
    if (typeof item.sourceRequired !== "boolean") errors.push(`claimCandidates[${index}].sourceRequired must be a boolean.`);
    if (item.reviewStatus !== "candidate_only") errors.push(`claimCandidates[${index}].reviewStatus must be candidate_only.`);
    const candidateSourceIds = readStringArray(item.candidateSourceIds, `claimCandidates[${index}].candidateSourceIds`, errors);
    if (claimId) {
      if (seen.has(claimId)) errors.push("claimCandidates must not contain duplicate claimId values.");
      seen.add(claimId);
    }
    return claimId && originalText && normalizedClaim && claimType && riskLevel && typeof item.sourceRequired === "boolean" && item.reviewStatus === "candidate_only"
      ? [{ claimId, originalText, normalizedClaim, claimType, riskLevel, sourceRequired: item.sourceRequired, candidateSourceIds, reviewStatus: "candidate_only", note: typeof item.note === "string" ? item.note : null }]
      : [];
  });
}

function parseSources(values: unknown[], errors: string[]): SourceCandidatePreviewInput[] {
  const seen = new Set<string>();
  return values.flatMap((value, index) => {
    if (!isPlainObject(value)) {
      errors.push(`sourceCandidates[${index}] must be an object.`);
      return [];
    }
    const item = value as Record<string, unknown>;
    const sourceId = readString(item.sourceId, `sourceCandidates[${index}].sourceId`, errors);
    const title = readString(item.title, `sourceCandidates[${index}].title`, errors);
    if (sourceId) {
      if (seen.has(sourceId)) errors.push("sourceCandidates must not contain duplicate sourceId values.");
      seen.add(sourceId);
    }
    if (item.candidateOnly !== true) errors.push(`sourceCandidates[${index}].candidateOnly must be true.`);
    if (item.verificationStatus !== "verification_required") errors.push(`sourceCandidates[${index}].verificationStatus must be verification_required.`);
    if (item.trustLevel !== "review_required") errors.push(`sourceCandidates[${index}].trustLevel must be review_required.`);
    return sourceId && title && item.candidateOnly === true && item.verificationStatus === "verification_required" && item.trustLevel === "review_required" ? [{
      sourceId,
      title,
      requestedUrl: readOptionalString(item.requestedUrl),
      publisherName: readOptionalString(item.publisherName),
      sourceType: readOptionalString(item.sourceType),
      candidateOnly: true,
      verificationStatus: "verification_required",
      trustLevel: "review_required",
    }] : [];
  });
}

function parseFetchPreviews(values: unknown[], errors: string[]): SourceFetchPreviewCanonicalInput[] {
  const seen = new Set<string>();
  return values.flatMap((value, index) => {
    if (!isPlainObject(value)) {
      errors.push(`sourceFetchPreviews[${index}] must be an object.`);
      return [];
    }
    const item = value as Record<string, unknown>;
    if ("fullHtml" in item || "rawHtml" in item || "extractedSourceText" in item || "fullSourceText" in item) {
      errors.push(`sourceFetchPreviews[${index}] must not include full source text or HTML fields.`);
    }
    const sourceId = readString(item.sourceId, `sourceFetchPreviews[${index}].sourceId`, errors);
    if (sourceId) {
      if (seen.has(sourceId)) errors.push("sourceFetchPreviews must not contain duplicate sourceId values.");
      seen.add(sourceId);
    }
    if (typeof item.fetchSucceeded !== "boolean") errors.push(`sourceFetchPreviews[${index}].fetchSucceeded must be a boolean.`);
    if (item.httpStatus !== null && !Number.isSafeInteger(item.httpStatus)) errors.push(`sourceFetchPreviews[${index}].httpStatus must be an integer or null.`);
    const bytesRead = item.bytesRead === null || item.bytesRead === undefined ? null : item.bytesRead;
    const bytesReadValid = bytesRead === null || (typeof bytesRead === "number" && Number.isSafeInteger(bytesRead) && bytesRead >= 0);
    if (!bytesReadValid) {
      errors.push(`sourceFetchPreviews[${index}].bytesRead must be a non-negative safe integer or null.`);
    }
    if (!Number.isSafeInteger(item.textPreviewLength) || Number(item.textPreviewLength) < 0) errors.push(`sourceFetchPreviews[${index}].textPreviewLength must be a non-negative safe integer.`);
    if (item.textDigest !== null && !isSha256Hex(item.textDigest)) errors.push(`sourceFetchPreviews[${index}].textDigest must be a lowercase SHA-256 hex string or null.`);
    if (item.verificationStatus !== "fetched_unverified" && item.verificationStatus !== "verification_required") errors.push(`sourceFetchPreviews[${index}].verificationStatus must be fetched_unverified or verification_required.`);
    return sourceId && typeof item.fetchSucceeded === "boolean" && Number.isSafeInteger(item.textPreviewLength) && bytesReadValid
      ? [{
        sourceId,
        requestedUrl: readOptionalString(item.requestedUrl),
        finalUrl: readOptionalString(item.finalUrl),
        fetchSucceeded: item.fetchSucceeded,
        httpStatus: item.httpStatus === null ? null : Number(item.httpStatus),
        contentType: readOptionalString(item.contentType),
        bytesRead,
        textPreviewLength: Number(item.textPreviewLength),
        textDigest: item.textDigest === null ? null : String(item.textDigest),
        verificationStatus: item.verificationStatus as SourceFetchPreviewCanonicalInput["verificationStatus"],
        verificationWarnings: readStringArray(item.verificationWarnings ?? [], `sourceFetchPreviews[${index}].verificationWarnings`, errors),
      }] : [];
  });
}

function validateSourceRelationships(
  claims: ClaimCandidatePreviewInput[],
  sources: SourceCandidatePreviewInput[],
  fetchPreviews: SourceFetchPreviewCanonicalInput[],
  errors: string[],
) {
  const sourceIds = new Set(sources.map((source) => source.sourceId));
  const fetchIds = new Set(fetchPreviews.map((preview) => preview.sourceId));
  for (const sourceId of sourceIds) {
    if (!fetchIds.has(sourceId)) errors.push(`sourceFetchPreviews is missing sourceId ${sourceId}.`);
  }
  for (const sourceId of fetchIds) {
    if (!sourceIds.has(sourceId)) errors.push(`sourceFetchPreviews contains unknown sourceId ${sourceId}.`);
  }
  for (const claim of claims) {
    for (const sourceId of claim.candidateSourceIds) {
      if (!sourceIds.has(sourceId)) errors.push(`claimCandidates ${claim.claimId} references unknown candidateSourceId ${sourceId}.`);
    }
  }
}

function readBearerToken(value: string | null): string | null {
  if (!value) return null;
  const [scheme, token, extra] = value.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token || extra) return null;
  return token;
}

function readString(value: unknown, path: string, errors: string[]): string {
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`${path} must be a non-empty string.`);
    return "";
  }
  return value.trim();
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readStringArray(value: unknown, path: string, errors: string[]): string[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return [];
  }
  const result: string[] = [];
  const seen = new Set<string>();
  value.forEach((item, index) => {
    if (typeof item !== "string" || !item.trim()) {
      errors.push(`${path}[${index}] must be a non-empty string.`);
      return;
    }
    const normalized = item.trim();
    if (seen.has(normalized)) errors.push(`${path} must not contain duplicates.`);
    seen.add(normalized);
    result.push(normalized);
  });
  return result.sort(compareCodePoint);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSha256Hex(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function compareCodePoint(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
