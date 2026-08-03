import {
  validateAiDraftGenerationCandidate,
  type AiDraftGenerationCandidate,
  type AiDraftGenerationSystemContext,
} from "./aiDraftGenerationCandidateValidation";
import type { AiDraftPayload } from "./aiDraftPayloadContract";

export const AI_DRAFT_PROVIDER_GENERATION_CAPABILITY = "ai_medical_draft_generation" as const;
export const AI_DRAFT_PROVIDER_GENERATION_TRUST_TIER = "medical_review_approved" as const;

export type AiDraftProviderGenerationCapability = typeof AI_DRAFT_PROVIDER_GENERATION_CAPABILITY;
export type AiDraftProviderGenerationTrustTier = typeof AI_DRAFT_PROVIDER_GENERATION_TRUST_TIER;

export type AiDraftProviderGenerationExecutionBoundary = Readonly<{
  providerId: string;
  capability: AiDraftProviderGenerationCapability;
  trustTier: AiDraftProviderGenerationTrustTier;
  adapterExecutionAllowed: true;
}>;

export type AiDraftProviderGenerationCandidate = Readonly<{
  providerId: string;
  capability: string;
  approvedForSelection: boolean;
  trustTier: string;
  executionBoundary?: AiDraftProviderGenerationExecutionBoundary | null;
}>;

export type AiDraftProviderGenerationRequest = AiDraftGenerationSystemContext &
  Readonly<{
    capability: string;
  }>;

export type AiDraftProviderGenerationResolverRequest = Readonly<{
  requestId: string;
  payloadFingerprint: string;
  capability: AiDraftProviderGenerationCapability;
}>;

export type AiDraftProviderGenerationAdapterRequest = AiDraftGenerationSystemContext &
  Readonly<{
    capability: AiDraftProviderGenerationCapability;
    providerId: string;
    executionBoundary: AiDraftProviderGenerationExecutionBoundary;
  }>;

export type AiDraftProviderGenerationAdapterResult = Readonly<{
  candidate: AiDraftGenerationCandidate;
  outputReference: AiDraftProviderGenerationOutputReference;
}>;

export type AiDraftProviderGenerationOutputReference = Readonly<{
  providerId: string;
  capability: AiDraftProviderGenerationCapability;
  referenceId: string;
}>;

export type AiDraftProviderGenerationDependencies = Readonly<{
  resolveCandidate: (
    request: AiDraftProviderGenerationResolverRequest,
  ) => Promise<AiDraftProviderGenerationCandidate | null> | AiDraftProviderGenerationCandidate | null;
  executeAdapter: (
    request: AiDraftProviderGenerationAdapterRequest,
  ) => Promise<unknown> | unknown;
}>;

type RequestSnapshotResult =
  | { valid: true; value: AiDraftProviderGenerationRequest }
  | { valid: false };

export type AiDraftProviderGenerationReasonCode =
  | "AI_DRAFT_PROVIDER_GENERATION_READY_FOR_MANUAL_REVIEW"
  | "AI_DRAFT_PROVIDER_GENERATION_REQUEST_INVALID"
  | "AI_DRAFT_PROVIDER_GENERATION_CAPABILITY_INVALID"
  | "AI_DRAFT_PROVIDER_GENERATION_NO_CANDIDATE"
  | "AI_DRAFT_PROVIDER_GENERATION_RESOLVER_EXCEPTION"
  | "AI_DRAFT_PROVIDER_GENERATION_CANDIDATE_INVALID"
  | "AI_DRAFT_PROVIDER_GENERATION_CANDIDATE_CAPABILITY_MISMATCH"
  | "AI_DRAFT_PROVIDER_GENERATION_PROVIDER_ID_INVALID"
  | "AI_DRAFT_PROVIDER_GENERATION_PROVIDER_NOT_APPROVED"
  | "AI_DRAFT_PROVIDER_GENERATION_TRUST_TIER_BLOCKED"
  | "AI_DRAFT_PROVIDER_GENERATION_EXECUTION_BOUNDARY_MISSING"
  | "AI_DRAFT_PROVIDER_GENERATION_ADAPTER_EXCEPTION"
  | "AI_DRAFT_PROVIDER_GENERATION_ADAPTER_OUTPUT_INVALID"
  | "AI_DRAFT_PROVIDER_GENERATION_PAYLOAD_INVALID";

export type AiDraftProviderGenerationSideEffects = Readonly<{
  databaseWritten: false;
  storageWritten: false;
  n8nTriggered: false;
  publicationTriggered: false;
  notificationSent: false;
  providerApiCalled: false;
}>;

export type AiDraftProviderGenerationResult = Readonly<{
  generated: boolean;
  payload: AiDraftPayload | null;
  outputReference: AiDraftProviderGenerationOutputReference | null;
  selectedProviderId: string | null;
  capability: AiDraftProviderGenerationCapability | null;
  reasonCode: AiDraftProviderGenerationReasonCode;
  manualReviewRequired: true;
  finalApprovalGranted: false;
  persistable: false;
  publishable: false;
  publicationTriggered: false;
  notificationSent: false;
  medicalVerificationCompleted: false;
  databaseWritten: false;
  storageWritten: false;
  n8nTriggered: false;
  failClosed: true;
  retryAttempted: false;
  fallbackAttempted: false;
  sideEffects: AiDraftProviderGenerationSideEffects;
}>;

const REQUEST_KEYS = Object.freeze([
  "requestId",
  "payloadFingerprint",
  "locale",
  "country",
  "sourceIds",
  "capability",
] as const);

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SHA_256_HEX_PATTERN = /^[a-f0-9]{64}$/;
const LOCALE_PATTERN = /^[a-z]{2}-[A-Z]{2}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const SAFE_INTERNAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;
const CREDENTIAL_VALUE_PATTERN =
  /authorization\s*[:=]\s*bearer\s+\S+|\bbearer\s+(?:(?:[A-Za-z0-9_-]+\.){2}[A-Za-z0-9_-]+|[A-Za-z0-9._~+/-]{32,}=*)\b|\bservice_role(?:_secret)?\s*[:=]\s*\S+|\bservice-role-key\s*[:=]\s*\S+|\bapi[-_ ]?key\s*[:=]\s*\S+|\bsk-[A-Za-z0-9][A-Za-z0-9_-]*\b|\bsb_secret[A-Za-z0-9_-]*\b|\u0000/iu;

export async function generateAiDraftWithProviderBoundary(
  request: unknown,
  dependencies: AiDraftProviderGenerationDependencies,
): Promise<AiDraftProviderGenerationResult> {
  const requestSnapshot = snapshotRequest(request);
  if (!requestSnapshot.valid) {
    return failure("AI_DRAFT_PROVIDER_GENERATION_REQUEST_INVALID", null);
  }

  const safeRequest = requestSnapshot.value;
  if (safeRequest.capability !== AI_DRAFT_PROVIDER_GENERATION_CAPABILITY) {
    return failure("AI_DRAFT_PROVIDER_GENERATION_CAPABILITY_INVALID", null);
  }

  const resolverRequest: AiDraftProviderGenerationResolverRequest = Object.freeze({
    requestId: safeRequest.requestId,
    payloadFingerprint: safeRequest.payloadFingerprint,
    capability: AI_DRAFT_PROVIDER_GENERATION_CAPABILITY,
  });
  let rawCandidate: AiDraftProviderGenerationCandidate | null;
  try {
    rawCandidate = await dependencies.resolveCandidate(resolverRequest);
  } catch {
    return failure("AI_DRAFT_PROVIDER_GENERATION_RESOLVER_EXCEPTION", null);
  }

  if (rawCandidate === null) return failure("AI_DRAFT_PROVIDER_GENERATION_NO_CANDIDATE", null);

  const candidateSnapshot = snapshotCandidate(rawCandidate);
  if (!candidateSnapshot.valid) return failure("AI_DRAFT_PROVIDER_GENERATION_CANDIDATE_INVALID", null);

  const candidate = candidateSnapshot.value;
  if (candidate.capability !== AI_DRAFT_PROVIDER_GENERATION_CAPABILITY) {
    return failure("AI_DRAFT_PROVIDER_GENERATION_CANDIDATE_CAPABILITY_MISMATCH", safeProviderId(candidate.providerId));
  }
  if (!isSafeProviderId(candidate.providerId)) {
    return failure("AI_DRAFT_PROVIDER_GENERATION_PROVIDER_ID_INVALID", null);
  }
  if (candidate.approvedForSelection !== true) {
    return failure("AI_DRAFT_PROVIDER_GENERATION_PROVIDER_NOT_APPROVED", candidate.providerId);
  }
  if (candidate.trustTier !== AI_DRAFT_PROVIDER_GENERATION_TRUST_TIER) {
    return failure("AI_DRAFT_PROVIDER_GENERATION_TRUST_TIER_BLOCKED", candidate.providerId);
  }
  const executionBoundary = snapshotExecutionBoundary(candidate.executionBoundary, candidate.providerId);
  if (executionBoundary === null) {
    return failure("AI_DRAFT_PROVIDER_GENERATION_EXECUTION_BOUNDARY_MISSING", candidate.providerId);
  }

  const adapterRequest: AiDraftProviderGenerationAdapterRequest = Object.freeze({
    requestId: safeRequest.requestId,
    payloadFingerprint: safeRequest.payloadFingerprint,
    locale: safeRequest.locale,
    country: safeRequest.country,
    sourceIds: safeRequest.sourceIds,
    capability: AI_DRAFT_PROVIDER_GENERATION_CAPABILITY,
    providerId: candidate.providerId,
    executionBoundary,
  });

  let adapterResult: unknown;
  try {
    adapterResult = await dependencies.executeAdapter(adapterRequest);
  } catch {
    return failure("AI_DRAFT_PROVIDER_GENERATION_ADAPTER_EXCEPTION", candidate.providerId);
  }

  const adapterSnapshot = snapshotAdapterResult(adapterResult, candidate.providerId);
  if (!adapterSnapshot.valid) {
    return failure("AI_DRAFT_PROVIDER_GENERATION_ADAPTER_OUTPUT_INVALID", candidate.providerId);
  }

  const validation = validateAiDraftGenerationCandidate(
    {
      requestId: safeRequest.requestId,
      payloadFingerprint: safeRequest.payloadFingerprint,
      locale: safeRequest.locale,
      country: safeRequest.country,
      sourceIds: safeRequest.sourceIds,
    },
    adapterSnapshot.value.candidate,
  );
  if (!validation.valid) return failure("AI_DRAFT_PROVIDER_GENERATION_PAYLOAD_INVALID", candidate.providerId);

  return Object.freeze({
    generated: true,
    payload: validation.payload,
    outputReference: adapterSnapshot.value.outputReference,
    selectedProviderId: candidate.providerId,
    capability: AI_DRAFT_PROVIDER_GENERATION_CAPABILITY,
    reasonCode: "AI_DRAFT_PROVIDER_GENERATION_READY_FOR_MANUAL_REVIEW",
    ...safeFlags(),
  });
}

function snapshotRequest(value: unknown): RequestSnapshotResult {
  try {
    if (!isPlainObject(value)) return { valid: false };
    if (!hasExactOwnKeys(value, REQUEST_KEYS)) return { valid: false };

    const requestId = readDataProperty(value, "requestId");
    const payloadFingerprint = readDataProperty(value, "payloadFingerprint");
    const locale = readDataProperty(value, "locale");
    const country = readDataProperty(value, "country");
    const sourceIds = snapshotSourceIds(readDataProperty(value, "sourceIds"));
    const capability = readDataProperty(value, "capability");

    if (!isValidRequestId(requestId)) return { valid: false };
    if (!isValidPayloadFingerprint(payloadFingerprint)) return { valid: false };
    if (!isValidPatternString(locale, LOCALE_PATTERN)) return { valid: false };
    if (!isValidPatternString(country, COUNTRY_PATTERN)) return { valid: false };
    if (!sourceIds.valid) return { valid: false };
    if (typeof capability !== "string") return { valid: false };
    if ([requestId, payloadFingerprint, locale, country, capability, ...sourceIds.value].some(containsForbiddenContent)) {
      return { valid: false };
    }

    return {
      valid: true,
      value: Object.freeze({
        requestId,
        payloadFingerprint,
        locale,
        country,
        sourceIds: sourceIds.value,
        capability,
      }),
    };
  } catch {
    return { valid: false };
  }
}

function snapshotAdapterResult(
  value: unknown,
  providerId: string,
): { valid: true; value: AiDraftProviderGenerationAdapterResult } | { valid: false } {
  try {
    if (!isPlainObject(value)) return { valid: false };
    if (!hasExactOwnKeys(value, ["candidate", "outputReference"])) return { valid: false };

    const candidate = readDataProperty(value, "candidate");
    const outputReference = snapshotOutputReference(readDataProperty(value, "outputReference"), providerId);
    if (!isPlainObject(candidate) || outputReference === null) return { valid: false };

    return {
      valid: true,
      value: Object.freeze({
        candidate: candidate as AiDraftGenerationCandidate,
        outputReference,
      }),
    };
  } catch {
    return { valid: false };
  }
}

function snapshotOutputReference(value: unknown, providerId: string): AiDraftProviderGenerationOutputReference | null {
  try {
    if (!isPlainObject(value)) return null;
    if (!hasExactOwnKeys(value, ["providerId", "capability", "referenceId"])) return null;
    const referenceProviderId = readDataProperty(value, "providerId");
    const capability = readDataProperty(value, "capability");
    const referenceId = readDataProperty(value, "referenceId");

    if (referenceProviderId !== providerId) return null;
    if (capability !== AI_DRAFT_PROVIDER_GENERATION_CAPABILITY) return null;
    if (!isSafeReferenceId(referenceId)) return null;

    return Object.freeze({
      providerId,
      capability: AI_DRAFT_PROVIDER_GENERATION_CAPABILITY,
      referenceId,
    });
  } catch {
    return null;
  }
}

function failure(
  reasonCode: Exclude<AiDraftProviderGenerationReasonCode, "AI_DRAFT_PROVIDER_GENERATION_READY_FOR_MANUAL_REVIEW">,
  selectedProviderId: string | null,
): AiDraftProviderGenerationResult {
  return Object.freeze({
    generated: false,
    payload: null,
    outputReference: null,
    selectedProviderId,
    capability:
      reasonCode === "AI_DRAFT_PROVIDER_GENERATION_CAPABILITY_INVALID"
        ? null
        : AI_DRAFT_PROVIDER_GENERATION_CAPABILITY,
    reasonCode,
    ...safeFlags(),
  });
}

function safeFlags() {
  return {
    manualReviewRequired: true,
    finalApprovalGranted: false,
    persistable: false,
    publishable: false,
    publicationTriggered: false,
    notificationSent: false,
    medicalVerificationCompleted: false,
    databaseWritten: false,
    storageWritten: false,
    n8nTriggered: false,
    failClosed: true,
    retryAttempted: false,
    fallbackAttempted: false,
    sideEffects: createNoSideEffects(),
  } as const;
}

function createNoSideEffects(): AiDraftProviderGenerationSideEffects {
  return Object.freeze({
    databaseWritten: false,
    storageWritten: false,
    n8nTriggered: false,
    publicationTriggered: false,
    notificationSent: false,
    providerApiCalled: false,
  });
}

function snapshotCandidate(
  value: unknown,
): { valid: true; value: AiDraftProviderGenerationCandidate } | { valid: false } {
  try {
    if (!isPlainObject(value)) return { valid: false };
    if (!hasExactOwnKeys(value, ["providerId", "capability", "approvedForSelection", "trustTier", "executionBoundary"])) {
      return { valid: false };
    }

    return {
      valid: true,
      value: Object.freeze({
        providerId: readDataProperty(value, "providerId"),
        capability: readDataProperty(value, "capability"),
        approvedForSelection: readDataProperty(value, "approvedForSelection"),
        trustTier: readDataProperty(value, "trustTier"),
        executionBoundary: readDataProperty(value, "executionBoundary"),
      }) as AiDraftProviderGenerationCandidate,
    };
  } catch {
    return { valid: false };
  }
}

function snapshotExecutionBoundary(
  value: unknown,
  providerId: string,
): AiDraftProviderGenerationExecutionBoundary | null {
  try {
    if (!isPlainObject(value)) return null;
    if (!hasExactOwnKeys(value, ["providerId", "capability", "trustTier", "adapterExecutionAllowed"])) return null;
    const boundaryProviderId = readDataProperty(value, "providerId");
    const capability = readDataProperty(value, "capability");
    const trustTier = readDataProperty(value, "trustTier");
    const adapterExecutionAllowed = readDataProperty(value, "adapterExecutionAllowed");
    if (boundaryProviderId !== providerId) return null;
    if (capability !== AI_DRAFT_PROVIDER_GENERATION_CAPABILITY) return null;
    if (trustTier !== AI_DRAFT_PROVIDER_GENERATION_TRUST_TIER) return null;
    if (adapterExecutionAllowed !== true) return null;

    return Object.freeze({
      providerId,
      capability: AI_DRAFT_PROVIDER_GENERATION_CAPABILITY,
      trustTier: AI_DRAFT_PROVIDER_GENERATION_TRUST_TIER,
      adapterExecutionAllowed: true,
    });
  } catch {
    return null;
  }
}

function safeProviderId(providerId: unknown): string | null {
  return isSafeProviderId(providerId) ? providerId : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function hasExactOwnKeys(value: Record<string, unknown>, allowedKeys: readonly string[]): boolean {
  let descriptors: Record<PropertyKey, PropertyDescriptor>;
  let ownKeys: (string | symbol)[];
  try {
    descriptors = Object.getOwnPropertyDescriptors(value);
    ownKeys = Reflect.ownKeys(value);
  } catch {
    return false;
  }

  if (ownKeys.some((key) => typeof key === "symbol")) return false;
  if (ownKeys.length !== allowedKeys.length) return false;
  if (Object.keys(descriptors).length !== allowedKeys.length) return false;
  const allowed = new Set(allowedKeys);

  for (const key of ownKeys) {
    if (typeof key !== "string" || !allowed.has(key)) return false;
    const descriptor = descriptors[key];
    if (!descriptor || !isDataDescriptor(descriptor) || descriptor.enumerable !== true) return false;
  }

  return true;
}

function readDataProperty(value: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && isDataDescriptor(descriptor) ? descriptor.value : undefined;
}

function snapshotSourceIds(value: unknown): { valid: true; value: readonly string[] } | { valid: false } {
  try {
    if (!Array.isArray(value)) return { valid: false };
    const descriptors = Object.getOwnPropertyDescriptors(value) as unknown as Record<PropertyKey, PropertyDescriptor>;
    const ownKeys = Reflect.ownKeys(value);
    const lengthDescriptor = descriptors.length;
    if (!lengthDescriptor || !isDataDescriptor(lengthDescriptor)) return { valid: false };
    const length = lengthDescriptor.value;
    if (!Number.isSafeInteger(length) || length < 1 || length > 10) return { valid: false };
    if (!hasDenseArrayOwnKeys(ownKeys, length)) return { valid: false };

    const seen = new Set<string>();
    const snapshot: string[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !isDataDescriptor(descriptor) || descriptor.enumerable !== true) return { valid: false };
      if (typeof descriptor.value !== "string") return { valid: false };
      const sourceId = descriptor.value.trim();
      if (!sourceId) return { valid: false };
      if (sourceId.length > 128) return { valid: false };
      if (CONTROL_CHARACTER_PATTERN.test(sourceId)) return { valid: false };
      if (!SAFE_INTERNAL_ID_PATTERN.test(sourceId)) return { valid: false };
      if (containsForbiddenContent(sourceId)) return { valid: false };
      if (seen.has(sourceId)) return { valid: false };
      seen.add(sourceId);
      snapshot.push(sourceId);
    }

    return { valid: true, value: Object.freeze(snapshot) };
  } catch {
    return { valid: false };
  }
}

function hasDenseArrayOwnKeys(ownKeys: readonly (string | symbol)[], length: number): boolean {
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

function isDataDescriptor(descriptor: PropertyDescriptor): descriptor is PropertyDescriptor & { value: unknown } {
  return Object.prototype.hasOwnProperty.call(descriptor, "value") && !descriptor.get && !descriptor.set;
}

function isValidRequestId(value: unknown): value is string {
  return typeof value === "string" && value === value.trim() && REQUEST_ID_PATTERN.test(value);
}

function isValidPayloadFingerprint(value: unknown): value is string {
  return typeof value === "string" && SHA_256_HEX_PATTERN.test(value);
}

function isValidPatternString(value: unknown, pattern: RegExp): value is string {
  return typeof value === "string" && value === value.trim() && pattern.test(value);
}

function containsForbiddenContent(value: unknown): boolean {
  return typeof value === "string" && CREDENTIAL_VALUE_PATTERN.test(value);
}

function isSafeReferenceId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
}

function isSafeProviderId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value);
}
