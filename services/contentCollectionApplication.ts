import type {
  NormalizedSourceCandidate,
  NormalizedTrendCandidate,
  ProviderError,
  ProviderResult,
} from "../types/content-collection-provider";
import {
  mapSourceCandidateToSourceCandidate,
  mapTrendCandidateToTopicCandidate,
  type MappedSourceCandidate,
  type MappedTopicCandidate,
} from "./contentCollectionMapper";
import {
  validateSourceCandidateForStorage,
  validateTopicCandidateForStorage,
  type CollectionCandidateValidationIssue,
  type CollectionCandidateValidationResult,
} from "./contentCollectionPolicy";

export type CollectionCandidateKind = "topic" | "source";
export type CollectionCandidateOutcome = "accepted" | "accepted_with_warning" | "rejected";

export type AcceptedCollectionCandidate =
  | {
      kind: "topic";
      outcome: "accepted" | "accepted_with_warning";
      candidate: MappedTopicCandidate;
      warnings: CollectionCandidateValidationIssue[];
    }
  | {
      kind: "source";
      outcome: "accepted" | "accepted_with_warning";
      candidate: MappedSourceCandidate;
      warnings: CollectionCandidateValidationIssue[];
    };

export type RejectedCollectionCandidate = {
  kind: CollectionCandidateKind;
  outcome: "rejected";
  duplicateKey?: string;
  providerId?: string;
  validation: CollectionCandidateValidationResult;
};

export type CollectionProviderFailure = {
  kind: "provider_error";
  providerId: string;
  error: ProviderError;
};

export type CollectionApplicationSummary = {
  acceptedCount: number;
  warningCount: number;
  rejectedCount: number;
  providerErrorCount: number;
  duplicateRejectedCount: number;
  totalProcessedCount: number;
};

export type CollectionApplicationResult = {
  accepted: AcceptedCollectionCandidate[];
  rejected: RejectedCollectionCandidate[];
  providerErrors: CollectionProviderFailure[];
  summary: CollectionApplicationSummary;
};

export type CollectionApplicationInput = {
  trendResults?: Array<ProviderResult<NormalizedTrendCandidate>>;
  sourceResults?: Array<ProviderResult<NormalizedSourceCandidate>>;
};

export function processCollectionProviderResults(
  input: CollectionApplicationInput,
): CollectionApplicationResult {
  const accepted: AcceptedCollectionCandidate[] = [];
  const rejected: RejectedCollectionCandidate[] = [];
  const providerErrors: CollectionProviderFailure[] = [];
  const acceptedDuplicateKeys = new Set<string>();
  let duplicateRejectedCount = 0;

  for (const result of input.trendResults ?? []) {
    if (!result.ok) {
      providerErrors.push(toProviderFailure(result.providerId, result.error));
      continue;
    }

    for (const rawCandidate of result.data) {
      const candidate = mapTrendCandidateToTopicCandidate(rawCandidate);
      const validation = validateTopicCandidateForStorage(candidate);
      const duplicate = acceptedDuplicateKeys.has(candidate.provenance.duplicateKey);
      const finalValidation = duplicate ? withDuplicateIssue(validation) : validation;

      if (!finalValidation.valid) {
        rejected.push(
          toRejectedCandidate(
            "topic",
            candidate.provenance.duplicateKey,
            candidate.provenance.providerId,
            finalValidation,
          ),
        );
        duplicateRejectedCount += duplicate ? 1 : 0;
        continue;
      }

      acceptedDuplicateKeys.add(candidate.provenance.duplicateKey);
      accepted.push({
        kind: "topic",
        outcome: validation.warning.length > 0 ? "accepted_with_warning" : "accepted",
        candidate,
        warnings: validation.warning,
      });
    }
  }

  for (const result of input.sourceResults ?? []) {
    if (!result.ok) {
      providerErrors.push(toProviderFailure(result.providerId, result.error));
      continue;
    }

    for (const rawCandidate of result.data) {
      const candidate = mapSourceCandidateToSourceCandidate(rawCandidate);
      const validation = validateSourceCandidateForStorage(candidate);
      const duplicate = acceptedDuplicateKeys.has(candidate.provenance.duplicateKey);
      const finalValidation = duplicate ? withDuplicateIssue(validation) : validation;

      if (!finalValidation.valid) {
        rejected.push(
          toRejectedCandidate(
            "source",
            candidate.provenance.duplicateKey,
            candidate.provenance.providerId,
            finalValidation,
          ),
        );
        duplicateRejectedCount += duplicate ? 1 : 0;
        continue;
      }

      acceptedDuplicateKeys.add(candidate.provenance.duplicateKey);
      accepted.push({
        kind: "source",
        outcome: validation.warning.length > 0 ? "accepted_with_warning" : "accepted",
        candidate,
        warnings: validation.warning,
      });
    }
  }

  const warningCount = accepted.filter((candidate) => candidate.outcome === "accepted_with_warning").length;

  return {
    accepted,
    rejected,
    providerErrors,
    summary: {
      acceptedCount: accepted.filter((candidate) => candidate.outcome === "accepted").length,
      warningCount,
      rejectedCount: rejected.length,
      providerErrorCount: providerErrors.length,
      duplicateRejectedCount,
      totalProcessedCount: accepted.length + rejected.length + providerErrors.length,
    },
  };
}

function toProviderFailure(providerId: string, error: ProviderError): CollectionProviderFailure {
  return {
    kind: "provider_error",
    providerId,
    error,
  };
}

function toRejectedCandidate(
  kind: CollectionCandidateKind,
  duplicateKey: string,
  providerId: string,
  validation: CollectionCandidateValidationResult,
): RejectedCollectionCandidate {
  return {
    kind,
    outcome: "rejected",
    duplicateKey,
    providerId,
    validation,
  };
}

function withDuplicateIssue(
  validation: CollectionCandidateValidationResult,
): CollectionCandidateValidationResult {
  return {
    valid: false,
    invalid: [
      ...validation.invalid,
      {
        severity: "invalid",
        code: "DUPLICATE_CANDIDATE",
        reason: "Candidate duplicateKey was already accepted in this collection batch.",
      },
    ],
    warning: validation.warning,
  };
}
