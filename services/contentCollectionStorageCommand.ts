import type { JsonValue } from "../types/content-platform";
import type {
  AcceptedCollectionCandidate,
  CollectionApplicationResult,
} from "./contentCollectionApplication";
import type { CollectionCandidateValidationIssue } from "./contentCollectionPolicy";

export type CollectionStorageCommandKind = "topic_candidate_storage" | "source_candidate_storage";

export type CollectionStorageCommandProvenance = {
  providerId: string;
  externalId?: string;
  duplicateKey: string;
  collectedAt: string;
  locale?: string;
  country?: string;
};

export type CollectionStorageCommandBase = {
  kind: CollectionStorageCommandKind;
  operationId: string;
  fingerprint: string;
  provenance: CollectionStorageCommandProvenance;
  warnings: Array<Pick<CollectionCandidateValidationIssue, "code" | "reason">>;
  rawMetadataSnapshot: JsonValue;
  normalizedCandidateSnapshot: JsonValue;
};

export type TopicCandidateStorageCommand = CollectionStorageCommandBase & {
  kind: "topic_candidate_storage";
  topic: {
    siteId: string;
    name: string;
    slug?: string;
    topicType: string;
    keywords: string[];
    status: "candidate";
    trendScore?: number;
    lastCollectedAt: string;
  };
};

export type SourceCandidateStorageCommand = CollectionStorageCommandBase & {
  kind: "source_candidate_storage";
  source: {
    sourceType: string;
    publisherName: string;
    title: string;
    canonicalUrl: string;
    publishedAt?: string;
    retrievedAt: string;
    summary?: string;
    language: string;
    trustLevel: string;
    verificationStatus: string;
    contentHash?: string;
    metadata?: Record<string, JsonValue>;
  };
};

export type CollectionStorageCommand =
  | TopicCandidateStorageCommand
  | SourceCandidateStorageCommand;

export type CreateCollectionStorageCommandInput = {
  candidate: AcceptedCollectionCandidate;
  operationId: string;
};

export type CreateCollectionStorageCommandsInput = {
  result: CollectionApplicationResult;
  operationIdForCandidate: (candidate: AcceptedCollectionCandidate, index: number) => string;
};

export type CollectionStorageCommandBatch = {
  commands: CollectionStorageCommand[];
  skippedRejectedCount: number;
  skippedProviderErrorCount: number;
};

type TopicStorageCommandPayload = {
  commandKind: "topic_candidate_storage";
  topic: TopicCandidateStorageCommand["topic"];
  provenance: CollectionStorageCommandProvenance;
  warnings: TopicCandidateStorageCommand["warnings"];
  rawMetadataSnapshot: JsonValue;
  normalizedCandidateSnapshot: JsonValue;
};

type SourceStorageCommandPayload = {
  commandKind: "source_candidate_storage";
  source: SourceCandidateStorageCommand["source"];
  provenance: CollectionStorageCommandProvenance;
  warnings: SourceCandidateStorageCommand["warnings"];
  rawMetadataSnapshot: JsonValue;
  normalizedCandidateSnapshot: JsonValue;
};

export function createCollectionStorageCommand({
  candidate,
  operationId,
}: CreateCollectionStorageCommandInput): CollectionStorageCommand {
  if (candidate.kind === "topic") {
    const payload = createTopicPayload(candidate);
    const fingerprint = createCollectionCommandFingerprint(payload);

    return {
      kind: "topic_candidate_storage",
      operationId,
      fingerprint,
      provenance: payload.provenance,
      warnings: payload.warnings,
      rawMetadataSnapshot: payload.rawMetadataSnapshot,
      normalizedCandidateSnapshot: payload.normalizedCandidateSnapshot,
      topic: payload.topic,
    };
  }

  const payload = createSourcePayload(candidate);
  const fingerprint = createCollectionCommandFingerprint(payload);

  return {
    kind: "source_candidate_storage",
    operationId,
    fingerprint,
    provenance: payload.provenance,
    warnings: payload.warnings,
    rawMetadataSnapshot: payload.rawMetadataSnapshot,
    normalizedCandidateSnapshot: payload.normalizedCandidateSnapshot,
    source: payload.source,
  };
}

export function createCollectionStorageCommands({
  result,
  operationIdForCandidate,
}: CreateCollectionStorageCommandsInput): CollectionStorageCommandBatch {
  return {
    commands: result.accepted.map((candidate, index) =>
      createCollectionStorageCommand({
        candidate,
        operationId: operationIdForCandidate(candidate, index),
      }),
    ),
    skippedRejectedCount: result.rejected.length,
    skippedProviderErrorCount: result.providerErrors.length,
  };
}

export function createCollectionCommandFingerprint(payload: JsonValue): string {
  return `collection-storage:v1:${canonicalizeJson(payload)}`;
}

export function canonicalizeJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeJson).join(",")}]`;
  }

  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalizeJson(entryValue)}`)
    .join(",")}}`;
}

function createTopicPayload(
  candidate: Extract<AcceptedCollectionCandidate, { kind: "topic" }>,
): TopicStorageCommandPayload {
  const topic = {
    siteId: candidate.candidate.domain.siteId,
    name: candidate.candidate.domain.name,
    slug: candidate.candidate.domain.slug,
    topicType: candidate.candidate.domain.topicType,
    keywords: candidate.candidate.domain.keywords,
    status: candidate.candidate.domain.status,
    trendScore: candidate.candidate.domain.trendScore,
    lastCollectedAt: candidate.candidate.domain.lastCollectedAt,
  };

  return {
    commandKind: "topic_candidate_storage",
    topic: compactRecord(topic) as TopicCandidateStorageCommand["topic"],
    provenance: createProvenance(candidate),
    warnings: createWarningSnapshot(candidate.warnings),
    rawMetadataSnapshot: candidate.candidate.provenance.rawMetadata,
    normalizedCandidateSnapshot: {
      kind: candidate.kind,
      outcome: candidate.outcome,
      domain: compactJsonObject(topic),
      provenance: createProvenance(candidate),
    },
  };
}

function createSourcePayload(
  candidate: Extract<AcceptedCollectionCandidate, { kind: "source" }>,
): SourceStorageCommandPayload {
  const source = {
    sourceType: candidate.candidate.domain.sourceType,
    publisherName: candidate.candidate.domain.publisherName,
    title: candidate.candidate.domain.title,
    canonicalUrl: candidate.candidate.domain.canonicalUrl,
    publishedAt: candidate.candidate.domain.publishedAt,
    retrievedAt: candidate.candidate.domain.retrievedAt,
    summary: candidate.candidate.domain.summary,
    language: candidate.candidate.domain.language,
    trustLevel: candidate.candidate.domain.trustLevel,
    verificationStatus: candidate.candidate.domain.verificationStatus,
    contentHash: candidate.candidate.domain.contentHash,
    metadata: candidate.candidate.domain.metadata,
  };

  return {
    commandKind: "source_candidate_storage",
    source: compactRecord(source) as SourceCandidateStorageCommand["source"],
    provenance: createProvenance(candidate),
    warnings: createWarningSnapshot(candidate.warnings),
    rawMetadataSnapshot: candidate.candidate.provenance.rawMetadata,
    normalizedCandidateSnapshot: {
      kind: candidate.kind,
      outcome: candidate.outcome,
      domain: compactJsonObject(source),
      provenance: createProvenance(candidate),
    },
  };
}

function createProvenance(candidate: AcceptedCollectionCandidate): CollectionStorageCommandProvenance {
  return compactRecord({
    providerId: candidate.candidate.provenance.providerId,
    externalId: candidate.candidate.provenance.externalKey.externalId,
    duplicateKey: candidate.candidate.provenance.duplicateKey,
    collectedAt: candidate.candidate.provenance.collectedAt,
    locale: candidate.candidate.provenance.locale,
    country: candidate.candidate.provenance.country,
  }) as CollectionStorageCommandProvenance;
}

function createWarningSnapshot(
  warnings: CollectionCandidateValidationIssue[],
): Array<Pick<CollectionCandidateValidationIssue, "code" | "reason">> {
  return warnings.map(({ code, reason }) => ({ code, reason }));
}

function compactRecord<T extends Record<string, unknown>>(record: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter((entry) => entry[1] !== undefined));
}

function compactJsonObject(record: Record<string, unknown>): Record<string, JsonValue> {
  return Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, JsonValue] => entry[1] !== undefined),
  );
}
