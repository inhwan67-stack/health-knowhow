import type {
  CollectionProviderId,
  CollectionWindow,
  ExternalDuplicateKey,
  NormalizedSourceCandidate,
  NormalizedTrendCandidate,
  ProviderRawMetadata,
} from "../types/content-collection-provider";
import type {
  EntityId,
  IsoDateTime,
  JsonValue,
  SourceTrustLevel,
  SourceType,
  SourceVerificationStatus,
  TopicStatus,
} from "../types/content-platform";

export type ProviderCandidateKind = "topic" | "source";

export type ProviderCandidateProvenance = {
  providerId: CollectionProviderId;
  externalKey: ExternalDuplicateKey;
  duplicateKey: string;
  locale?: string;
  country?: string;
  collectedAt: IsoDateTime;
  window?: CollectionWindow;
  rawMetadata: ProviderRawMetadata;
};

export type TopicCandidateDomainFields = {
  siteId: EntityId;
  name: string;
  slug?: string;
  topicType: string;
  keywords: string[];
  status: TopicStatus;
  trendScore?: number;
  lastCollectedAt: IsoDateTime;
};

export type SourceCandidateDomainFields = {
  sourceType: SourceType;
  publisherName: string;
  title: string;
  canonicalUrl: string;
  publishedAt?: IsoDateTime;
  retrievedAt: IsoDateTime;
  summary?: string;
  language: string;
  trustLevel: SourceTrustLevel;
  verificationStatus: SourceVerificationStatus;
  contentHash?: string;
  metadata?: Record<string, JsonValue>;
};

export type MappedTopicCandidate = {
  kind: "topic";
  domain: TopicCandidateDomainFields;
  provenance: ProviderCandidateProvenance;
};

export type MappedSourceCandidate = {
  kind: "source";
  siteId?: EntityId;
  domain: SourceCandidateDomainFields;
  provenance: ProviderCandidateProvenance;
};

export type HybridCollectionMappingInput = {
  trendCandidates?: NormalizedTrendCandidate[];
  sourceCandidates?: NormalizedSourceCandidate[];
};

export type HybridCollectionMappingResult = {
  topicCandidates: MappedTopicCandidate[];
  sourceCandidates: MappedSourceCandidate[];
};

export function mapTrendCandidateToTopicCandidate(
  candidate: NormalizedTrendCandidate,
): MappedTopicCandidate {
  return {
    kind: "topic",
    domain: {
      siteId: candidate.siteId,
      name: candidate.suggestedTopic.name || candidate.label,
      slug: candidate.suggestedTopic.slug,
      topicType: candidate.suggestedTopic.topicType,
      keywords: uniqueStrings([
        candidate.normalizedKeyword,
        ...candidate.relatedKeywords,
        ...candidate.suggestedTopic.keywords,
      ]),
      status: "candidate",
      trendScore: candidate.suggestedTopic.trendScore ?? candidate.score,
      lastCollectedAt: candidate.collectedAt,
    },
    provenance: {
      providerId: candidate.providerId,
      externalKey: candidate.externalKey,
      duplicateKey: buildTopicDuplicateKey(candidate),
      locale: candidate.locale,
      country: candidate.country,
      collectedAt: candidate.collectedAt,
      window: candidate.window,
      rawMetadata: candidate.rawMetadata,
    },
  };
}

export function mapSourceCandidateToSourceCandidate(
  candidate: NormalizedSourceCandidate,
): MappedSourceCandidate {
  const canonicalUrl = candidate.suggestedSource.canonicalUrl || candidate.canonicalUrl || candidate.sourceUrl;
  const officialSource = candidate.providerId === "official-medical-public-source";

  return {
    kind: "source",
    siteId: candidate.siteId,
    domain: {
      sourceType: candidate.suggestedSource.sourceType,
      publisherName: candidate.suggestedSource.publisherName,
      title: candidate.suggestedSource.title,
      canonicalUrl,
      publishedAt: candidate.publishedAt,
      retrievedAt: candidate.retrievedAt,
      summary: candidate.summary,
      language: candidate.suggestedSource.language,
      trustLevel: officialSource ? "trusted" : candidate.suggestedSource.trustLevel,
      verificationStatus: candidate.suggestedSource.verificationStatus,
      contentHash: candidate.suggestedSource.contentHash ?? candidate.externalKey.contentHash,
      metadata: compactMetadata({
        ...candidate.suggestedSource.metadata,
        providerId: candidate.providerId,
        externalId: candidate.externalKey.externalId,
        locale: candidate.locale,
        country: candidate.country,
        sourceUrl: candidate.sourceUrl,
      }),
    },
    provenance: {
      providerId: candidate.providerId,
      externalKey: candidate.externalKey,
      duplicateKey: buildSourceDuplicateKey(candidate),
      locale: candidate.locale,
      country: candidate.country,
      collectedAt: candidate.retrievedAt,
      rawMetadata: candidate.rawMetadata,
    },
  };
}

export function mapHybridCollectionResults(
  input: HybridCollectionMappingInput,
): HybridCollectionMappingResult {
  return {
    topicCandidates: dedupeMappedTopicCandidates(
      (input.trendCandidates ?? []).map(mapTrendCandidateToTopicCandidate),
    ),
    sourceCandidates: dedupeMappedSourceCandidates(
      (input.sourceCandidates ?? []).map(mapSourceCandidateToSourceCandidate),
    ),
  };
}

export function dedupeMappedTopicCandidates(
  candidates: MappedTopicCandidate[],
): MappedTopicCandidate[] {
  return dedupeBy(candidates, (candidate) => candidate.provenance.duplicateKey);
}

export function dedupeMappedSourceCandidates(
  candidates: MappedSourceCandidate[],
): MappedSourceCandidate[] {
  return dedupeBy(candidates, (candidate) => candidate.provenance.duplicateKey);
}

export function buildTopicDuplicateKey(candidate: NormalizedTrendCandidate): string {
  return [
    candidate.providerId,
    candidate.externalKey.externalId ??
      `${candidate.normalizedKeyword}:${candidate.locale}:${candidate.country}:${candidate.window.startDate}:${candidate.window.endDate}:${candidate.window.timeUnit}`,
  ]
    .join(":")
    .toLowerCase();
}

export function buildSourceDuplicateKey(candidate: NormalizedSourceCandidate): string {
  const canonicalUrl = candidate.suggestedSource.canonicalUrl || candidate.canonicalUrl || candidate.sourceUrl;
  const stableKey =
    candidate.externalKey.externalId ??
    normalizeUrl(candidate.externalKey.sourceUrl ?? canonicalUrl) ??
    candidate.externalKey.contentHash ??
    candidate.suggestedSource.contentHash;

  return [candidate.providerId, stableKey ?? candidate.title].join(":").toLowerCase();
}

function dedupeBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeUrl(url?: string): string | undefined {
  return url?.trim().toLowerCase().replace(/\/$/, "");
}

function compactMetadata(metadata: Record<string, JsonValue | undefined>): Record<string, JsonValue> {
  return Object.fromEntries(
    Object.entries(metadata).filter((entry): entry is [string, JsonValue] => entry[1] !== undefined),
  );
}
