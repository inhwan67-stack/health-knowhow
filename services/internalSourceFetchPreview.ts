import { createHash, timingSafeEqual } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import type { ContentDraftReadSuccess } from "./contentDraftReadService";

export const MAX_SOURCE_FETCH_COUNT = 3;
export const MAX_SOURCE_RESPONSE_BYTES = 1024 * 1024;
export const MAX_SOURCE_TEXT_PREVIEW_CHARS = 5000;
export const SOURCE_FETCH_TIMEOUT_MS = 12_000;

const ALLOWED_SOURCE_HOSTS = new Set(["www.cdc.gov", "www.nhlbi.nih.gov", "medlineplus.gov"]);
const ALLOWED_CONTENT_TYPE_PREFIXES = ["text/html", "application/xhtml+xml", "text/plain"];

export type SourceFetchPreviewErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_REVISION_ID"
  | "DUPLICATE_DRAFT_SOURCE_URL"
  | "VALIDATION_ERROR"
  | "DRAFT_NOT_FOUND"
  | "DRAFT_READ_FAILED"
  | "DRAFT_CONTRACT_MISMATCH"
  | "SOURCE_FETCH_PREVIEW_FAILED";

export type SourceFetchPreviewRequest = {
  dryRun: true;
  contentId: string;
  revisionId: string;
  sourceIds: string[];
};

export type SourceFetchPreviewResult = {
  sourceId: string;
  title: string;
  publisherName: string | null;
  requestedUrl: string;
  finalUrl: string | null;
  fetchSucceeded: boolean;
  httpStatus: number | null;
  contentType: string | null;
  contentLengthHeader: string | null;
  bytesRead: number;
  maxAllowedBytes: number;
  responseTooLarge: boolean;
  fetchedAt: string;
  textPreview: string;
  textPreviewLength: number;
  textDigest: string | null;
  verificationStatus: "fetched_unverified" | "verification_required";
  verificationWarnings: string[];
};

export type SourceFetchPreviewResponseBody = {
  success: boolean;
  dryRun: true;
  persisted: false;
  persistable: false;
  contentId?: string;
  revisionId?: string;
  sourceFetchExecuted: boolean;
  sourceVerificationExecuted: false;
  results: SourceFetchPreviewResult[];
  errorCode?: SourceFetchPreviewErrorCode;
  message?: string;
  validationErrors?: string[];
  sideEffects: SourceFetchPreviewSideEffects;
};

export type SourceFetchPreviewSideEffects = {
  internalDraftGetCalled: boolean;
  externalSourceGetsCalled: boolean;
  reviewResultInserted: false;
  contentRevisionUpdated: false;
  imagePlanUpdated: false;
  workflowCompleted: false;
  notificationSent: false;
  publicationCreated: false;
  publishQueueCreated: false;
  finalApprovalCreated: false;
  publishedContentsCreated: false;
  storageUploaded: false;
  imageGenerated: false;
};

export type SafeSourceFetchDependencies = {
  fetchImpl?: typeof fetch;
  resolveHostname?: (hostname: string) => Promise<string[]>;
  now?: () => Date;
};

export function sourceFetchPreviewSideEffects(overrides: Partial<SourceFetchPreviewSideEffects> = {}): SourceFetchPreviewSideEffects {
  return {
    internalDraftGetCalled: false,
    externalSourceGetsCalled: false,
    reviewResultInserted: false,
    contentRevisionUpdated: false,
    imagePlanUpdated: false,
    workflowCompleted: false,
    notificationSent: false,
    publicationCreated: false,
    publishQueueCreated: false,
    finalApprovalCreated: false,
    publishedContentsCreated: false,
    storageUploaded: false,
    imageGenerated: false,
    ...overrides,
  };
}

export function assertInternalSourceFetchPreviewAuthorized(request: Request): boolean {
  const expectedSecret = process.env.INTERNAL_SOURCE_FETCH_PREVIEW_TOKEN;
  const token = readBearerToken(request.headers.get("authorization"));
  if (!expectedSecret || !token) return false;
  const actual = Buffer.from(token);
  const expected = Buffer.from(expectedSecret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function readBearerToken(value: string | null): string | null {
  if (!value) return null;
  const [scheme, token, extra] = value.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token || extra) return null;
  return token;
}

export function parseSourceFetchPreviewPayload(payload: unknown): { ok: true; value: SourceFetchPreviewRequest } | { ok: false; errorCode: SourceFetchPreviewErrorCode; errors: string[] } {
  const errors: string[] = [];
  let errorCode: SourceFetchPreviewErrorCode = "VALIDATION_ERROR";
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, errorCode, errors: ["Request body must be a JSON object."] };
  }
  const body = payload as Record<string, unknown>;
  if (body.dryRun !== true) errors.push("dryRun must be true.");
  if (typeof body.contentId !== "string" || !body.contentId.trim()) errors.push("contentId must be a non-empty string.");
  if (typeof body.revisionId !== "string" || !body.revisionId.trim()) {
    errors.push("revisionId must be a non-empty string.");
    if (typeof body.revisionId === "string") errorCode = "INVALID_REVISION_ID";
  } else if (!isCanonicalPositiveSafeIntegerString(body.revisionId)) {
    errors.push("revisionId must be a canonical positive safe integer string.");
    errorCode = "INVALID_REVISION_ID";
  }
  if (!Array.isArray(body.sourceIds)) errors.push("sourceIds must be an array.");
  if ("url" in body || "requestedUrl" in body || "sourceUrl" in body || "sources" in body) {
    errors.push("Arbitrary source URLs are not accepted; sourceIds must refer to the stored draft sources.");
  }
  const sourceIds = Array.isArray(body.sourceIds) ? body.sourceIds : [];
  if (sourceIds.length === 0) errors.push("sourceIds must not be empty.");
  if (sourceIds.length > MAX_SOURCE_FETCH_COUNT) errors.push(`sourceIds must contain at most ${MAX_SOURCE_FETCH_COUNT} items.`);
  const seen = new Set<string>();
  for (const sourceId of sourceIds) {
    if (typeof sourceId !== "string" || !sourceId.trim()) {
      errors.push("Each sourceId must be a non-empty string.");
      continue;
    }
    const normalized = sourceId.trim();
    if (seen.has(normalized)) errors.push("sourceIds must not contain duplicates.");
    seen.add(normalized);
  }
  if (errors.length) return { ok: false, errorCode: errors.length === 1 ? errorCode : "VALIDATION_ERROR", errors };
  return {
    ok: true,
    value: {
      dryRun: true,
      contentId: String(body.contentId).trim(),
      revisionId: String(body.revisionId).trim(),
      sourceIds: sourceIds.map((sourceId) => String(sourceId).trim()),
    },
  };
}

export function validateDraftSourcesForPreview(request: SourceFetchPreviewRequest, draft: ContentDraftReadSuccess): { ok: true; sources: ContentDraftReadSuccess["sources"] } | { ok: false; errorCode: SourceFetchPreviewErrorCode; errors: string[] } {
  const errors: string[] = [];
  let errorCode: SourceFetchPreviewErrorCode = "VALIDATION_ERROR";
  if (String(draft.contentId) !== request.contentId) errors.push("Draft contentId does not match request contentId.");
  if (String(draft.revisionId) !== request.revisionId) errors.push("Draft revisionId does not match request revisionId.");
  const byId = new Map(draft.sources.map((source) => [String(source.sourceId), source]));
  const sources = [];
  for (const sourceId of request.sourceIds) {
    const source = byId.get(sourceId);
    if (!source) errors.push(`Requested sourceId ${sourceId} was not found in the draft sources.`);
    else sources.push(source);
  }
  const canonicalUrls = new Map<string, string>();
  for (const source of sources) {
    const canonicalUrl = canonicalizeStoredSourceUrl(source.url);
    if (!canonicalUrl) continue;
    const existingSourceId = canonicalUrls.get(canonicalUrl);
    if (existingSourceId) {
      errors.push(`Duplicate stored source URL for sourceIds ${existingSourceId} and ${source.sourceId}.`);
      errorCode = "DUPLICATE_DRAFT_SOURCE_URL";
      continue;
    }
    canonicalUrls.set(canonicalUrl, source.sourceId);
  }
  return errors.length ? { ok: false, errorCode: errors.length === 1 ? errorCode : "VALIDATION_ERROR", errors } : { ok: true, sources };
}

export async function fetchSourcePreviews(
  sources: ContentDraftReadSuccess["sources"],
  deps: SafeSourceFetchDependencies = {},
): Promise<SourceFetchPreviewResult[]> {
  const results: SourceFetchPreviewResult[] = [];
  for (const source of sources) {
    results.push(await fetchOneSourcePreview(source, deps));
  }
  return results;
}

async function fetchOneSourcePreview(
  source: ContentDraftReadSuccess["sources"][number],
  deps: SafeSourceFetchDependencies,
): Promise<SourceFetchPreviewResult> {
  const fetchedAt = (deps.now?.() ?? new Date()).toISOString();
  const requestedUrl = source.url;
  const base = (warnings: string[], values: Partial<SourceFetchPreviewResult> = {}): SourceFetchPreviewResult => ({
    sourceId: source.sourceId,
    title: source.title,
    publisherName: source.publisherName,
    requestedUrl,
    finalUrl: null,
    fetchSucceeded: false,
    httpStatus: null,
    contentType: null,
    contentLengthHeader: null,
    bytesRead: 0,
    maxAllowedBytes: MAX_SOURCE_RESPONSE_BYTES,
    responseTooLarge: false,
    fetchedAt,
    textPreview: "",
    textPreviewLength: 0,
    textDigest: null,
    verificationStatus: "verification_required",
    verificationWarnings: warnings,
    ...values,
  });

  const urlPolicy = await validateSourceUrl(requestedUrl, deps.resolveHostname);
  if (!urlPolicy.ok) return base(urlPolicy.warnings);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOURCE_FETCH_TIMEOUT_MS);
  try {
    const response = await (deps.fetchImpl ?? fetch)(urlPolicy.url.href, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "HealthKnowhowSourceFetchPreview/1.0",
        Accept: "text/html, application/xhtml+xml, text/plain",
        "Accept-Encoding": "identity",
      },
    });
    const headers = response.headers;
    const contentType = headers.get("content-type");
    const contentEncoding = headers.get("content-encoding");
    const contentLengthHeader = headers.get("content-length");
    const common = { finalUrl: response.url || requestedUrl, httpStatus: response.status, contentType, contentLengthHeader };

    if (response.status >= 300 && response.status < 400) return base(["redirect_not_followed"], common);
    if (!isAllowedContentEncoding(contentEncoding)) return base(["compressed_response_forbidden"], common);
    if (!isAllowedContentType(contentType)) return base(["unsupported_content_type"], common);
    const declaredLength = parseContentLength(contentLengthHeader);
    if (declaredLength !== null && declaredLength > MAX_SOURCE_RESPONSE_BYTES) {
      return base(["response_size_limit_exceeded"], { ...common, responseTooLarge: true });
    }
    if (!response.body) return base(["response_body_missing"], common);

    const stream = await readLimitedResponse(response.body, controller);
    if (stream.responseTooLarge) return base(["response_size_limit_exceeded"], { ...common, bytesRead: stream.bytesRead, responseTooLarge: true });

    const text = new TextDecoder("utf-8", { fatal: false }).decode(stream.bytes);
    const textPreview = extractTextPreview(text);
    const digest = createHash("sha256").update(stream.bytes).digest("hex");
    const fetchSucceeded = response.status >= 200 && response.status < 300 && textPreview.length > 0;
    return base(
      fetchSucceeded
        ? ["Fetched for dry-run preview only.", "No medical or claim-support verification was performed."]
        : [`http_status_${response.status}`],
      {
        ...common,
        fetchSucceeded,
        bytesRead: stream.bytesRead,
        textPreview,
        textPreviewLength: textPreview.length,
        textDigest: `sha256:${digest}`,
        verificationStatus: fetchSucceeded ? "fetched_unverified" : "verification_required",
      },
    );
  } catch (error) {
    return base([error instanceof Error && error.name === "AbortError" ? "source_fetch_timeout" : "source_fetch_failed"]);
  } finally {
    clearTimeout(timeout);
  }
}

async function validateSourceUrl(
  value: string,
  resolveHostname: SafeSourceFetchDependencies["resolveHostname"] = defaultResolveHostname,
): Promise<{ ok: true; url: URL; warnings: [] } | { ok: false; warnings: string[] }> {
  const warnings: string[] = [];
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, warnings: ["invalid_url"] };
  }
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:") warnings.push("https_only");
  if (url.username || url.password) warnings.push("credentials_in_url_forbidden");
  if (url.port) warnings.push("non_standard_port_forbidden");
  if (isIP(hostname)) warnings.push("ip_literal_forbidden");
  if (isBlockedHostname(hostname)) warnings.push("localhost_loopback_private_or_reserved_host_forbidden");
  if (!ALLOWED_SOURCE_HOSTS.has(hostname)) warnings.push("host_not_allowed");
  if (warnings.length === 0) {
    try {
      const addresses = await resolveHostname(hostname);
      if (addresses.some((address) => isBlockedIpAddress(address))) warnings.push("resolved_private_or_reserved_ip_forbidden");
    } catch {
      warnings.push("dns_lookup_failed");
    }
  }
  return warnings.length ? { ok: false, warnings } : { ok: true, url, warnings: [] };
}

async function defaultResolveHostname(hostname: string): Promise<string[]> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

function isAllowedContentType(value: string | null): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase().split(";")[0]?.trim();
  return ALLOWED_CONTENT_TYPE_PREFIXES.includes(normalized);
}

function parseContentLength(value: string | null): number | null {
  if (!value || !/^[0-9]+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function isAllowedContentEncoding(value: string | null): boolean {
  if (!value) return true;
  const normalized = value.toLowerCase().trim();
  return normalized === "identity";
}

async function readLimitedResponse(body: ReadableStream<Uint8Array>, controller: AbortController): Promise<{ bytes: Uint8Array; bytesRead: number; responseTooLarge: boolean }> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_SOURCE_RESPONSE_BYTES) {
        await reader.cancel();
        controller.abort();
        return { bytes: new Uint8Array(), bytesRead, responseTooLarge: true };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, bytesRead, responseTooLarge: false };
}

function extractTextPreview(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SOURCE_TEXT_PREVIEW_CHARS);
}

function isBlockedHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname.endsWith(".localhost");
}

function isBlockedIpAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  const mappedIpv4 = extractIpv4MappedAddress(normalized);
  if (mappedIpv4) return isBlockedIpv4Address(mappedIpv4);
  if (isIP(normalized) === 4) return isBlockedIpv4Address(normalized);
  if (isIP(normalized) !== 6) return true;
  if (normalized === "::" || normalized === "0:0:0:0:0:0:0:0") return true;
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;
  if (matchesIpv6Prefix(normalized, "fc") || matchesIpv6Prefix(normalized, "fd")) return true;
  if (matchesIpv6Prefix(normalized, "fe8") || matchesIpv6Prefix(normalized, "fe9") || matchesIpv6Prefix(normalized, "fea") || matchesIpv6Prefix(normalized, "feb")) return true;
  if (matchesIpv6Prefix(normalized, "ff")) return true;
  if (normalized === "2001:db8::" || normalized.startsWith("2001:db8:")) return true;
  return false;
}

function isBlockedIpv4Address(address: string): boolean {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b, c, d] = parts;
  return (
    a === 0 ||
    a === 10 ||
    (a === 100 && b >= 64 && b <= 127) ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    (a >= 224 && a <= 239) ||
    a >= 240 ||
    (a === 255 && b === 255 && c === 255 && d === 255)
  );
}

function extractIpv4MappedAddress(address: string): string | null {
  const compactMatch = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(address);
  if (compactMatch) return compactMatch[1] ?? null;
  const expandedMatch = /^0:0:0:0:0:ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(address);
  return expandedMatch?.[1] ?? null;
}

function matchesIpv6Prefix(address: string, prefix: string): boolean {
  return address.replace(/^0+/, "").startsWith(prefix);
}

function isCanonicalPositiveSafeIntegerString(value: string): boolean {
  if (!/^[1-9][0-9]*$/.test(value)) return false;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && String(parsed) === value;
}

function canonicalizeStoredSourceUrl(value: string): string | null {
  try {
    const canonicalUrl = new URL(value);
    canonicalUrl.hash = "";
    return canonicalUrl.href;
  } catch {
    return null;
  }
}
