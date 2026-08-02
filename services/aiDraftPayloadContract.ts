export type AiDraftPayload = Readonly<{
  requestId: string;
  payloadFingerprint: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  locale: string;
  country: string;
  sourceIds: readonly string[];
  tags: readonly string[];
  manualReviewRequired: true;
  finalApprovalGranted: false;
  persistable: false;
  publishable: false;
  publicationTriggered: false;
  notificationSent: false;
  medicalVerificationCompleted: false;
  failClosed: true;
}>;

export type AiDraftPayloadFailureReasonCode =
  | "AI_DRAFT_PAYLOAD_INPUT_NOT_OBJECT"
  | "AI_DRAFT_PAYLOAD_INPUT_KEYS_INVALID"
  | "AI_DRAFT_PAYLOAD_INPUT_ACCESSOR_REJECTED"
  | "AI_DRAFT_PAYLOAD_REQUEST_ID_INVALID"
  | "AI_DRAFT_PAYLOAD_FINGERPRINT_INVALID"
  | "AI_DRAFT_PAYLOAD_TITLE_INVALID"
  | "AI_DRAFT_PAYLOAD_SLUG_INVALID"
  | "AI_DRAFT_PAYLOAD_SUMMARY_INVALID"
  | "AI_DRAFT_PAYLOAD_BODY_INVALID"
  | "AI_DRAFT_PAYLOAD_LOCALE_INVALID"
  | "AI_DRAFT_PAYLOAD_COUNTRY_INVALID"
  | "AI_DRAFT_PAYLOAD_SOURCE_IDS_INVALID"
  | "AI_DRAFT_PAYLOAD_TAGS_INVALID"
  | "AI_DRAFT_PAYLOAD_FORBIDDEN_CONTENT_DETECTED"
  | "AI_DRAFT_PAYLOAD_CONTRACT_ERROR";

export type AiDraftPayloadBuildResult =
  | Readonly<{
      valid: true;
      payload: AiDraftPayload;
      failClosed: false;
      reasonCode: "AI_DRAFT_PAYLOAD_CONTRACT_VALID";
    }>
  | Readonly<{
      valid: false;
      payload: null;
      failClosed: true;
      manualReviewRequired: true;
      persistable: false;
      publishable: false;
      publicationTriggered: false;
      notificationSent: false;
      reasonCode: AiDraftPayloadFailureReasonCode;
    }>;

type AiDraftPayloadInputSnapshot = Readonly<{
  requestId: unknown;
  payloadFingerprint: unknown;
  title: unknown;
  slug: unknown;
  summary: unknown;
  body: unknown;
  locale: unknown;
  country: unknown;
  sourceIds: unknown;
  tags: unknown;
}>;

type SnapshotResult =
  | { valid: true; value: AiDraftPayloadInputSnapshot }
  | { valid: false; reasonCode: AiDraftPayloadFailureReasonCode };

type ArraySnapshotResult =
  | { valid: true; value: readonly string[] }
  | { valid: false };

const ALLOWED_INPUT_KEYS = Object.freeze([
  "requestId",
  "payloadFingerprint",
  "title",
  "slug",
  "summary",
  "body",
  "locale",
  "country",
  "sourceIds",
  "tags",
] as const);

const REQUIRED_INPUT_KEYS = Object.freeze(ALLOWED_INPUT_KEYS);
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SHA_256_HEX_PATTERN = /^[a-f0-9]{64}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOCALE_PATTERN = /^[a-z]{2}-[A-Z]{2}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const SAFE_INTERNAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;
const FORBIDDEN_KEY_PATTERN =
  new RegExp(
    [
      "authorization",
      "bearer",
      "token",
      "api_?key",
      "api-key",
      "servicerole",
      "service_role",
      "service-role",
      "password",
      "cookie",
      "session",
      "secret",
      "supa" + "base",
      "dbclient",
      "provideradapter",
      "rawresult",
      "rawproviderresult",
      "providerresult",
      "rawerror",
      "stack",
      "execute",
      "promise",
      "abortsignal",
      "abortcontroller",
      "scheduler",
      "coordinator",
      "supervisor",
    ].join("|"),
    "i",
  );
const CREDENTIAL_VALUE_PATTERN =
  /authorization\s*[:=]\s*bearer\s+\S+|\bbearer\s+(?:(?:[A-Za-z0-9_-]+\.){2}[A-Za-z0-9_-]+|[A-Za-z0-9._~+/-]{32,}=*)\b|\bservice_role(?:_secret)?\s*[:=]\s*\S+|\bservice-role-key\s*[:=]\s*\S+|\bapi[-_ ]?key\s*[:=]\s*\S+|\bsk-[A-Za-z0-9][A-Za-z0-9_-]*\b|\bsb_secret[A-Za-z0-9_-]*\b|\u0000/iu;

export function buildAiDraftPayload(input: unknown): AiDraftPayloadBuildResult {
  try {
    const snapshot = snapshotInput(input);
    if (!snapshot.valid) return failure(snapshot.reasonCode);

    if (!isValidRequestId(snapshot.value.requestId)) return failure("AI_DRAFT_PAYLOAD_REQUEST_ID_INVALID");
    if (!isValidPayloadFingerprint(snapshot.value.payloadFingerprint)) {
      return failure("AI_DRAFT_PAYLOAD_FINGERPRINT_INVALID");
    }

    const title = normalizeRequiredString(snapshot.value.title, 1, 200);
    if (title === null) return failure("AI_DRAFT_PAYLOAD_TITLE_INVALID");

    const slug = normalizeSlug(snapshot.value.slug);
    if (slug === null) return failure("AI_DRAFT_PAYLOAD_SLUG_INVALID");

    const summary = normalizeSummary(snapshot.value.summary);
    if (summary.valid === false) return failure("AI_DRAFT_PAYLOAD_SUMMARY_INVALID");

    const body = normalizeRequiredString(snapshot.value.body, 1, 50_000);
    if (body === null) return failure("AI_DRAFT_PAYLOAD_BODY_INVALID");

    const locale = normalizePatternString(snapshot.value.locale, LOCALE_PATTERN);
    if (locale === null) return failure("AI_DRAFT_PAYLOAD_LOCALE_INVALID");

    const country = normalizePatternString(snapshot.value.country, COUNTRY_PATTERN);
    if (country === null) return failure("AI_DRAFT_PAYLOAD_COUNTRY_INVALID");

    const sourceIds = snapshotStringArray(snapshot.value.sourceIds, {
      minLength: 1,
      maxLength: 10,
      maxItemCodePoints: 128,
      pattern: SAFE_INTERNAL_ID_PATTERN,
      trimItems: true,
    });
    if (!sourceIds.valid) return failure("AI_DRAFT_PAYLOAD_SOURCE_IDS_INVALID");

    const tags = snapshotStringArray(snapshot.value.tags, {
      minLength: 0,
      maxLength: 10,
      maxItemCodePoints: 40,
      trimItems: true,
    });
    if (!tags.valid) return failure("AI_DRAFT_PAYLOAD_TAGS_INVALID");

    const valuesForSecretScan = [
      snapshot.value.requestId,
      snapshot.value.payloadFingerprint,
      title,
      slug,
      summary.value,
      body,
      locale,
      country,
      ...sourceIds.value,
      ...tags.value,
    ];
    if (valuesForSecretScan.some((value) => containsForbiddenContent(value))) {
      return failure("AI_DRAFT_PAYLOAD_FORBIDDEN_CONTENT_DETECTED");
    }

    const payload: AiDraftPayload = Object.freeze({
      requestId: snapshot.value.requestId,
      payloadFingerprint: snapshot.value.payloadFingerprint,
      title,
      slug,
      summary: summary.value,
      body,
      locale,
      country,
      sourceIds: sourceIds.value,
      tags: tags.value,
      manualReviewRequired: true,
      finalApprovalGranted: false,
      persistable: false,
      publishable: false,
      publicationTriggered: false,
      notificationSent: false,
      medicalVerificationCompleted: false,
      failClosed: true,
    });

    return Object.freeze({
      valid: true,
      payload,
      failClosed: false,
      reasonCode: "AI_DRAFT_PAYLOAD_CONTRACT_VALID",
    });
  } catch {
    return failure("AI_DRAFT_PAYLOAD_CONTRACT_ERROR");
  }
}

function snapshotInput(input: unknown): SnapshotResult {
  if (!isPlainObject(input)) return { valid: false, reasonCode: "AI_DRAFT_PAYLOAD_INPUT_NOT_OBJECT" };

  let descriptors: Record<PropertyKey, PropertyDescriptor>;
  let ownKeys: (string | symbol)[];
  try {
    descriptors = Object.getOwnPropertyDescriptors(input) as unknown as Record<PropertyKey, PropertyDescriptor>;
    ownKeys = Reflect.ownKeys(input);
  } catch {
    return { valid: false, reasonCode: "AI_DRAFT_PAYLOAD_CONTRACT_ERROR" };
  }

  if (!hasExactOwnKeys(ownKeys, ALLOWED_INPUT_KEYS)) {
    return { valid: false, reasonCode: "AI_DRAFT_PAYLOAD_INPUT_KEYS_INVALID" };
  }

    const snapshot: Record<string, unknown> = {};
    for (const key of REQUIRED_INPUT_KEYS) {
      const descriptor = descriptors[key];
      if (!descriptor) return { valid: false, reasonCode: "AI_DRAFT_PAYLOAD_INPUT_KEYS_INVALID" };
      if (!isDataDescriptor(descriptor)) {
        return { valid: false, reasonCode: "AI_DRAFT_PAYLOAD_INPUT_ACCESSOR_REJECTED" };
      }
      if (descriptor.enumerable !== true) {
        return { valid: false, reasonCode: "AI_DRAFT_PAYLOAD_INPUT_KEYS_INVALID" };
      }
      if (FORBIDDEN_KEY_PATTERN.test(key)) {
        return { valid: false, reasonCode: "AI_DRAFT_PAYLOAD_INPUT_KEYS_INVALID" };
      }
    snapshot[key] = descriptor.value;
  }

  return {
    valid: true,
    value: Object.freeze({
      requestId: snapshot.requestId,
      payloadFingerprint: snapshot.payloadFingerprint,
      title: snapshot.title,
      slug: snapshot.slug,
      summary: snapshot.summary,
      body: snapshot.body,
      locale: snapshot.locale,
      country: snapshot.country,
      sourceIds: snapshot.sourceIds,
      tags: snapshot.tags,
    }),
  };
}

function snapshotStringArray(
  value: unknown,
  options: {
    minLength: number;
    maxLength: number;
    maxItemCodePoints: number;
    pattern?: RegExp;
    trimItems: boolean;
  },
): ArraySnapshotResult {
  if (!Array.isArray(value)) return { valid: false };

  let descriptors: Record<PropertyKey, PropertyDescriptor>;
  let ownKeys: (string | symbol)[];
  try {
    descriptors = Object.getOwnPropertyDescriptors(value) as unknown as Record<PropertyKey, PropertyDescriptor>;
    ownKeys = Reflect.ownKeys(value);
  } catch {
    return { valid: false };
  }

  const lengthDescriptor = descriptors.length;
  if (!lengthDescriptor || !isDataDescriptor(lengthDescriptor)) return { valid: false };
  const length = lengthDescriptor.value;
  if (!Number.isSafeInteger(length) || length < options.minLength || length > options.maxLength) {
    return { valid: false };
  }

  if (!hasDenseArrayOwnKeys(ownKeys, length)) return { valid: false };

  const seen = new Set<string>();
  const snapshot: string[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !isEnumerableDataDescriptor(descriptor)) return { valid: false };
    if (typeof descriptor.value !== "string") return { valid: false };
    const normalized = options.trimItems ? descriptor.value.trim() : descriptor.value;
    if (!normalized) return { valid: false };
    if (codePointLength(normalized) > options.maxItemCodePoints) return { valid: false };
    if (CONTROL_CHARACTER_PATTERN.test(normalized)) return { valid: false };
    if (options.pattern && !options.pattern.test(normalized)) return { valid: false };
    if (seen.has(normalized)) return { valid: false };
    seen.add(normalized);
    snapshot.push(normalized);
  }

  return { valid: true, value: Object.freeze(snapshot) };
}

function hasExactOwnKeys(ownKeys: (string | symbol)[], allowedKeys: readonly string[]): boolean {
  if (ownKeys.some((key) => typeof key === "symbol")) return false;
  const stringKeys = ownKeys as string[];
  if (stringKeys.length !== allowedKeys.length) return false;
  const allowed = new Set(allowedKeys);
  return stringKeys.every((key) => allowed.has(key));
}

function hasDenseArrayOwnKeys(ownKeys: (string | symbol)[], length: number): boolean {
  for (const key of ownKeys) {
    if (typeof key === "symbol") return false;
    if (key === "length") continue;
    if (!/^(0|[1-9]\d*)$/.test(key)) return false;
    const index = Number(key);
    if (!Number.isSafeInteger(index) || index < 0 || index >= length) return false;
  }

  for (let index = 0; index < length; index += 1) {
    if (!ownKeys.includes(String(index))) return false;
  }

  return true;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    throw new Error("Prototype lookup failed.");
  }
}

function isDataDescriptor(descriptor: PropertyDescriptor): descriptor is PropertyDescriptor & { value: unknown } {
  return Object.prototype.hasOwnProperty.call(descriptor, "value") && !("get" in descriptor) && !("set" in descriptor);
}

function isEnumerableDataDescriptor(
  descriptor: PropertyDescriptor,
): descriptor is PropertyDescriptor & { value: unknown; enumerable: true } {
  return isDataDescriptor(descriptor) && descriptor.enumerable === true;
}

function isValidRequestId(value: unknown): value is string {
  return typeof value === "string" && value === value.trim() && REQUEST_ID_PATTERN.test(value);
}

function isValidPayloadFingerprint(value: unknown): value is string {
  return typeof value === "string" && SHA_256_HEX_PATTERN.test(value);
}

function normalizeRequiredString(value: unknown, minCodePoints: number, maxCodePoints: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  const length = codePointLength(normalized);
  if (length < minCodePoints || length > maxCodePoints) return null;
  if (CONTROL_CHARACTER_PATTERN.test(normalized)) return null;
  return normalized;
}

function normalizeSummary(value: unknown): { valid: true; value: string | null } | { valid: false } {
  if (value === null) return { valid: true, value: null };
  if (typeof value !== "string") return { valid: false };
  const normalized = value.trim();
  if (!normalized) return { valid: true, value: null };
  if (codePointLength(normalized) > 1_000) return { valid: false };
  if (CONTROL_CHARACTER_PATTERN.test(normalized)) return { valid: false };
  return { valid: true, value: normalized };
}

function normalizeSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || codePointLength(normalized) > 160) return null;
  if (!SLUG_PATTERN.test(normalized)) return null;
  return normalized;
}

function normalizePatternString(value: unknown, pattern: RegExp): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return pattern.test(normalized) ? normalized : null;
}

function containsForbiddenContent(value: unknown): boolean {
  return typeof value === "string" && CREDENTIAL_VALUE_PATTERN.test(value);
}

function codePointLength(value: string): number {
  return Array.from(value).length;
}

function failure(reasonCode: AiDraftPayloadFailureReasonCode): AiDraftPayloadBuildResult {
  return Object.freeze({
    valid: false,
    payload: null,
    failClosed: true,
    manualReviewRequired: true,
    persistable: false,
    publishable: false,
    publicationTriggered: false,
    notificationSent: false,
    reasonCode,
  });
}
