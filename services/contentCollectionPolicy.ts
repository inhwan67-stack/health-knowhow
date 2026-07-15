import {
  INITIAL_HEALTH_KNOWHOW_COLLECTION_PROVIDERS,
  providerSupports,
  type CollectionProvider,
  type CollectionProviderId,
} from "../types/content-collection-provider";
import type {
  MappedSourceCandidate,
  MappedTopicCandidate,
  ProviderCandidateKind,
} from "./contentCollectionMapper";

export type CollectionCandidateValidationSeverity = "invalid" | "warning";

export type CollectionCandidateValidationCode =
  | "MISSING_PROVIDER_ID"
  | "UNKNOWN_PROVIDER"
  | "MISSING_DUPLICATE_KEY"
  | "MISSING_EXTERNAL_IDENTIFIER"
  | "TOPIC_NAME_REQUIRED"
  | "TOPIC_IDENTIFIER_REQUIRED"
  | "INVALID_TREND_SCORE"
  | "TREND_SCORE_OUT_OF_RANGE"
  | "INVALID_COLLECTED_AT"
  | "LOCALE_OR_COUNTRY_MISSING"
  | "SOURCE_TITLE_REQUIRED"
  | "SOURCE_URL_REQUIRED"
  | "INVALID_SOURCE_URL"
  | "CONTENT_HASH_TOO_SHORT"
  | "PROVIDER_CAPABILITY_MISMATCH"
  | "NAVER_SOURCE_FORBIDDEN"
  | "OFFICIAL_SOURCE_TRUST_POLICY_VIOLATION"
  | "YOUTUBE_SOURCE_TRUST_POLICY_VIOLATION"
  | "RAW_METADATA_NOT_PRESERVED"
  | "RAW_METADATA_DOMAIN_OVERLAP"
  | "DUPLICATE_CANDIDATE";

export type CollectionCandidateValidationIssue = {
  severity: CollectionCandidateValidationSeverity;
  code: CollectionCandidateValidationCode;
  reason: string;
};

export type CollectionCandidateValidationResult = {
  valid: boolean;
  invalid: CollectionCandidateValidationIssue[];
  warning: CollectionCandidateValidationIssue[];
};

export type CollectionCandidateValidationContext = {
  providers?: readonly CollectionProvider[];
};

export function validateTopicCandidateForStorage(
  candidate: MappedTopicCandidate,
  context: CollectionCandidateValidationContext = {},
): CollectionCandidateValidationResult {
  const issues: CollectionCandidateValidationIssue[] = [
    ...validateCommonCandidateFields(candidate, "topic", context),
  ];

  if (!candidate.domain.name.trim()) {
    issues.push(invalid("TOPIC_NAME_REQUIRED", "Topic candidate name is required."));
  }

  if (!candidate.domain.slug?.trim() && candidate.domain.keywords.length === 0) {
    issues.push(
      invalid(
        "TOPIC_IDENTIFIER_REQUIRED",
        "Topic candidate needs a slug or at least one keyword for review and deduplication.",
      ),
    );
  }

  if (candidate.domain.trendScore !== undefined) {
    if (!Number.isFinite(candidate.domain.trendScore)) {
      issues.push(invalid("INVALID_TREND_SCORE", "Topic trendScore must be a finite number."));
    } else if (candidate.domain.trendScore < 0 || candidate.domain.trendScore > 100) {
      issues.push(
        warning(
          "TREND_SCORE_OUT_OF_RANGE",
          "Topic trendScore is outside the normalized 0-100 range and should be reviewed.",
        ),
      );
    }
  }

  return toResult(issues);
}

export function validateSourceCandidateForStorage(
  candidate: MappedSourceCandidate,
  context: CollectionCandidateValidationContext = {},
): CollectionCandidateValidationResult {
  const issues: CollectionCandidateValidationIssue[] = [
    ...validateCommonCandidateFields(candidate, "source", context),
  ];

  if (!candidate.domain.title.trim()) {
    issues.push(invalid("SOURCE_TITLE_REQUIRED", "Source candidate title is required."));
  }

  if (!candidate.domain.canonicalUrl.trim()) {
    issues.push(invalid("SOURCE_URL_REQUIRED", "Source candidate canonicalUrl is required."));
  } else if (!isValidHttpUrl(candidate.domain.canonicalUrl)) {
    issues.push(invalid("INVALID_SOURCE_URL", "Source candidate canonicalUrl must be a valid HTTP(S) URL."));
  }

  const hasExternalFallback =
    Boolean(candidate.provenance.externalKey.externalId?.trim()) ||
    Boolean(candidate.provenance.externalKey.sourceUrl?.trim()) ||
    Boolean(candidate.provenance.externalKey.contentHash?.trim()) ||
    Boolean(candidate.domain.contentHash?.trim());

  if (!hasExternalFallback) {
    issues.push(
      invalid(
        "MISSING_EXTERNAL_IDENTIFIER",
        "Source candidate needs externalId, sourceUrl, or contentHash before storage.",
      ),
    );
  }

  const contentHash = candidate.provenance.externalKey.contentHash ?? candidate.domain.contentHash;
  if (contentHash !== undefined && contentHash.trim().length < 12) {
    issues.push(warning("CONTENT_HASH_TOO_SHORT", "contentHash is too short to be a strong fallback key."));
  }

  if (candidate.provenance.providerId === "naver-datalab") {
    issues.push(invalid("NAVER_SOURCE_FORBIDDEN", "Naver DataLab can create Topic candidates, not Source candidates."));
  }

  if (
    candidate.provenance.providerId === "official-medical-public-source" &&
    candidate.domain.trustLevel !== "trusted"
  ) {
    issues.push(
      invalid(
        "OFFICIAL_SOURCE_TRUST_POLICY_VIOLATION",
        "Official medical/public sources must enter with trusted trustLevel.",
      ),
    );
  }

  if (candidate.provenance.providerId === "youtube-data-api" && candidate.domain.trustLevel !== "review_required") {
    issues.push(
      invalid(
        "YOUTUBE_SOURCE_TRUST_POLICY_VIOLATION",
        "YouTube sources must enter as review_required, not trusted medical evidence.",
      ),
    );
  }

  return toResult(issues);
}

function validateCommonCandidateFields(
  candidate: MappedTopicCandidate | MappedSourceCandidate,
  kind: ProviderCandidateKind,
  context: CollectionCandidateValidationContext,
): CollectionCandidateValidationIssue[] {
  const issues: CollectionCandidateValidationIssue[] = [];
  const providerId = candidate.provenance.providerId;

  if (!providerId) {
    issues.push(invalid("MISSING_PROVIDER_ID", "providerId is required."));
  }

  const provider = findProvider(providerId, context.providers);
  if (!provider) {
    issues.push(invalid("UNKNOWN_PROVIDER", `Unknown providerId: ${providerId}.`));
  } else if (!providerSupports(provider, kind === "topic" ? "topic:candidate:discover" : "source:candidate:discover")) {
    issues.push(
      invalid(
        "PROVIDER_CAPABILITY_MISMATCH",
        `${providerId} does not support ${kind} candidate discovery.`,
      ),
    );
  }

  if (!candidate.provenance.duplicateKey.trim()) {
    issues.push(invalid("MISSING_DUPLICATE_KEY", "duplicateKey is required before storage."));
  }

  const hasExternalIdentifier =
    Boolean(candidate.provenance.externalKey.externalId?.trim()) ||
    Boolean(candidate.provenance.externalKey.sourceUrl?.trim()) ||
    Boolean(candidate.provenance.externalKey.contentHash?.trim());

  if (!hasExternalIdentifier) {
    issues.push(
      invalid(
        "MISSING_EXTERNAL_IDENTIFIER",
        "externalId, sourceUrl, or contentHash is required for provider-level deduplication.",
      ),
    );
  }

  if (!isValidIsoDate(candidate.provenance.collectedAt)) {
    issues.push(invalid("INVALID_COLLECTED_AT", "collectedAt must be a valid date-time string."));
  }

  if (!candidate.provenance.locale?.trim() || !candidate.provenance.country?.trim()) {
    issues.push(
      warning(
        "LOCALE_OR_COUNTRY_MISSING",
        "locale and country should be preserved to avoid mixing Korean and global signals.",
      ),
    );
  }

  if (!candidate.provenance.rawMetadata.preserved) {
    issues.push(
      warning(
        "RAW_METADATA_NOT_PRESERVED",
        "raw metadata should be preserved separately for audit and replay.",
      ),
    );
  }

  if (rawMetadataOverlapsDomain(candidate)) {
    issues.push(
      invalid(
        "RAW_METADATA_DOMAIN_OVERLAP",
        "raw metadata contains domain-like fields and must not overwrite normalized domain fields.",
      ),
    );
  }

  return issues;
}

function findProvider(
  providerId: CollectionProviderId,
  providers: readonly CollectionProvider[] = INITIAL_HEALTH_KNOWHOW_COLLECTION_PROVIDERS,
): CollectionProvider | undefined {
  return providers.find((provider) => provider.id === providerId);
}

function rawMetadataOverlapsDomain(candidate: MappedTopicCandidate | MappedSourceCandidate): boolean {
  const payload = candidate.provenance.rawMetadata.rawPayload;

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const forbiddenKeys = [
    "name",
    "slug",
    "trendScore",
    "title",
    "canonicalUrl",
    "trustLevel",
    "verificationStatus",
  ];

  return forbiddenKeys.some((key) => Object.prototype.hasOwnProperty.call(payload, key));
}

function isValidIsoDate(value: string): boolean {
  return value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function invalid(
  code: CollectionCandidateValidationCode,
  reason: string,
): CollectionCandidateValidationIssue {
  return { severity: "invalid", code, reason };
}

function warning(
  code: CollectionCandidateValidationCode,
  reason: string,
): CollectionCandidateValidationIssue {
  return { severity: "warning", code, reason };
}

function toResult(issues: CollectionCandidateValidationIssue[]): CollectionCandidateValidationResult {
  const invalidIssues = issues.filter((issue) => issue.severity === "invalid");
  const warningIssues = issues.filter((issue) => issue.severity === "warning");

  return {
    valid: invalidIssues.length === 0,
    invalid: invalidIssues,
    warning: warningIssues,
  };
}
