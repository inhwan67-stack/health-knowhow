import {
  buildAiDraftPayload,
  type AiDraftPayload,
  type AiDraftPayloadFailureReasonCode,
} from "./aiDraftPayloadContract";

export type AiDraftGenerationSystemContext = Readonly<{
  requestId: string;
  payloadFingerprint: string;
  locale: string;
  country: string;
  sourceIds: readonly string[];
}>;

export type AiDraftGenerationCandidate = Readonly<{
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  tags: readonly string[];
}>;

export type AiDraftGenerationValidationFailureReasonCode =
  | "AI_DRAFT_GENERATION_SYSTEM_CONTEXT_NOT_OBJECT"
  | "AI_DRAFT_GENERATION_SYSTEM_CONTEXT_KEYS_INVALID"
  | "AI_DRAFT_GENERATION_SYSTEM_CONTEXT_ACCESSOR_REJECTED"
  | "AI_DRAFT_GENERATION_CANDIDATE_NOT_OBJECT"
  | "AI_DRAFT_GENERATION_CANDIDATE_KEYS_INVALID"
  | "AI_DRAFT_GENERATION_CANDIDATE_ACCESSOR_REJECTED"
  | "AI_DRAFT_GENERATION_PAYLOAD_CONTRACT_REJECTED"
  | "AI_DRAFT_GENERATION_VALIDATION_ERROR";

export type AiDraftGenerationValidationSuccessReasonCode = "AI_DRAFT_GENERATION_CANDIDATE_VALID";

export type AiDraftGenerationValidationSideEffects = Readonly<{
  providerCalled: false;
  databaseWritten: false;
  storageWritten: false;
  n8nTriggered: false;
  publicationTriggered: false;
  notificationSent: false;
}>;

export type AiDraftGenerationValidationResult =
  | Readonly<{
      valid: true;
      payload: AiDraftPayload;
      failClosed: false;
      reasonCode: AiDraftGenerationValidationSuccessReasonCode;
      contractReasonCode: null;
      sideEffects: AiDraftGenerationValidationSideEffects;
    }>
  | Readonly<{
      valid: false;
      payload: null;
      failClosed: true;
      manualReviewRequired: true;
      finalApprovalGranted: false;
      persistable: false;
      publishable: false;
      publicationTriggered: false;
      notificationSent: false;
      medicalVerificationCompleted: false;
      reasonCode: AiDraftGenerationValidationFailureReasonCode;
      contractReasonCode: AiDraftPayloadFailureReasonCode | null;
      sideEffects: AiDraftGenerationValidationSideEffects;
    }>;

type SnapshotFailureReasonCode = Exclude<
  AiDraftGenerationValidationFailureReasonCode,
  "AI_DRAFT_GENERATION_PAYLOAD_CONTRACT_REJECTED"
>;

type SnapshotResult<T extends Readonly<Record<string, unknown>>> =
  | { valid: true; value: T }
  | { valid: false; reasonCode: SnapshotFailureReasonCode };

type PlainObjectCheckResult =
  | { valid: true; value: object }
  | { valid: false; reasonCode: "not-object" | "prototype-error" };

const SYSTEM_CONTEXT_KEYS = Object.freeze([
  "requestId",
  "payloadFingerprint",
  "locale",
  "country",
  "sourceIds",
] as const);

const CANDIDATE_KEYS = Object.freeze(["title", "slug", "summary", "body", "tags"] as const);

export function validateAiDraftGenerationCandidate(
  systemContext: unknown,
  candidate: unknown,
): AiDraftGenerationValidationResult {
  try {
    const contextSnapshot = snapshotExactOwnDataObject(systemContext, SYSTEM_CONTEXT_KEYS, {
      notObject: "AI_DRAFT_GENERATION_SYSTEM_CONTEXT_NOT_OBJECT",
      keysInvalid: "AI_DRAFT_GENERATION_SYSTEM_CONTEXT_KEYS_INVALID",
      accessorRejected: "AI_DRAFT_GENERATION_SYSTEM_CONTEXT_ACCESSOR_REJECTED",
    });
    if (!contextSnapshot.valid) return failure(contextSnapshot.reasonCode, null);

    const candidateSnapshot = snapshotExactOwnDataObject(candidate, CANDIDATE_KEYS, {
      notObject: "AI_DRAFT_GENERATION_CANDIDATE_NOT_OBJECT",
      keysInvalid: "AI_DRAFT_GENERATION_CANDIDATE_KEYS_INVALID",
      accessorRejected: "AI_DRAFT_GENERATION_CANDIDATE_ACCESSOR_REJECTED",
    });
    if (!candidateSnapshot.valid) return failure(candidateSnapshot.reasonCode, null);

    const payloadResult = buildAiDraftPayload({
      requestId: contextSnapshot.value.requestId,
      payloadFingerprint: contextSnapshot.value.payloadFingerprint,
      title: candidateSnapshot.value.title,
      slug: candidateSnapshot.value.slug,
      summary: candidateSnapshot.value.summary,
      body: candidateSnapshot.value.body,
      locale: contextSnapshot.value.locale,
      country: contextSnapshot.value.country,
      sourceIds: contextSnapshot.value.sourceIds,
      tags: candidateSnapshot.value.tags,
    });

    if (!payloadResult.valid) {
      return failure("AI_DRAFT_GENERATION_PAYLOAD_CONTRACT_REJECTED", payloadResult.reasonCode);
    }

    return Object.freeze({
      valid: true,
      payload: payloadResult.payload,
      failClosed: false,
      reasonCode: "AI_DRAFT_GENERATION_CANDIDATE_VALID",
      contractReasonCode: null,
      sideEffects: createNoSideEffects(),
    });
  } catch {
    return failure("AI_DRAFT_GENERATION_VALIDATION_ERROR", null);
  }
}

function snapshotExactOwnDataObject<const TKeys extends readonly string[]>(
  value: unknown,
  allowedKeys: TKeys,
  reasonCodes: Readonly<{
    notObject: SnapshotFailureReasonCode;
    keysInvalid: SnapshotFailureReasonCode;
    accessorRejected: SnapshotFailureReasonCode;
  }>,
): SnapshotResult<Readonly<Record<TKeys[number], unknown>>> {
  const plainObjectResult = checkPlainObject(value);
  if (!plainObjectResult.valid) {
    return {
      valid: false,
      reasonCode:
        plainObjectResult.reasonCode === "prototype-error"
          ? "AI_DRAFT_GENERATION_VALIDATION_ERROR"
          : reasonCodes.notObject,
    };
  }

  let descriptors: Record<PropertyKey, PropertyDescriptor>;
  let ownKeys: (string | symbol)[];
  try {
    descriptors = Object.getOwnPropertyDescriptors(plainObjectResult.value) as Record<
      PropertyKey,
      PropertyDescriptor
    >;
    ownKeys = Reflect.ownKeys(descriptors);
  } catch {
    return { valid: false, reasonCode: "AI_DRAFT_GENERATION_VALIDATION_ERROR" };
  }

  if (!hasExactOwnStringKeys(ownKeys, allowedKeys)) {
    return { valid: false, reasonCode: reasonCodes.keysInvalid };
  }

  const snapshot: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    const descriptor = descriptors[key];
    if (!descriptor) return { valid: false, reasonCode: reasonCodes.keysInvalid };
    if (!isDataDescriptor(descriptor)) return { valid: false, reasonCode: reasonCodes.accessorRejected };
    if (descriptor.enumerable !== true) return { valid: false, reasonCode: reasonCodes.keysInvalid };
    snapshot[key] = descriptor.value;
  }

  return {
    valid: true,
    value: Object.freeze(snapshot) as Readonly<Record<TKeys[number], unknown>>,
  };
}

function checkPlainObject(value: unknown): PlainObjectCheckResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { valid: false, reasonCode: "not-object" };
  }

  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return { valid: false, reasonCode: "not-object" };
    }
  } catch {
    return { valid: false, reasonCode: "prototype-error" };
  }

  return { valid: true, value };
}

function hasExactOwnStringKeys(ownKeys: readonly (string | symbol)[], allowedKeys: readonly string[]): boolean {
  if (ownKeys.some((key) => typeof key === "symbol")) return false;
  if (ownKeys.length !== allowedKeys.length) return false;

  const allowed = new Set(allowedKeys);
  for (const key of ownKeys) {
    if (typeof key !== "string" || !allowed.has(key)) return false;
  }

  return true;
}

function isDataDescriptor(descriptor: PropertyDescriptor): descriptor is PropertyDescriptor & { value: unknown } {
  return Object.prototype.hasOwnProperty.call(descriptor, "value") && !descriptor.get && !descriptor.set;
}

function failure(
  reasonCode: AiDraftGenerationValidationFailureReasonCode,
  contractReasonCode: AiDraftPayloadFailureReasonCode | null,
): AiDraftGenerationValidationResult {
  return Object.freeze({
    valid: false,
    payload: null,
    failClosed: true,
    manualReviewRequired: true,
    finalApprovalGranted: false,
    persistable: false,
    publishable: false,
    publicationTriggered: false,
    notificationSent: false,
    medicalVerificationCompleted: false,
    reasonCode,
    contractReasonCode,
    sideEffects: createNoSideEffects(),
  });
}

function createNoSideEffects(): AiDraftGenerationValidationSideEffects {
  return Object.freeze({
    providerCalled: false,
    databaseWritten: false,
    storageWritten: false,
    n8nTriggered: false,
    publicationTriggered: false,
    notificationSent: false,
  });
}
