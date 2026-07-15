import { describe, expect, it } from "vitest";
import type {
  SourceCandidateStorageCommand,
  TopicCandidateStorageCommand,
} from "./contentCollectionStorageCommand";
import { InMemoryCollectionStorageRepository } from "./inMemoryCollectionStorageRepository";

const topicCommand: TopicCandidateStorageCommand = {
  kind: "topic_candidate_storage",
  operationId: "op-topic-1",
  fingerprint: "fingerprint-topic-1",
  provenance: {
    providerId: "naver-datalab",
    externalId: "naver:heat-rash",
    duplicateKey: "naver-datalab:naver:heat-rash",
    collectedAt: "2026-07-15T09:00:00+09:00",
    locale: "ko-KR",
    country: "KR",
  },
  warnings: [],
  rawMetadataSnapshot: {
    preserved: true,
    rawPayload: {
      ratio: 88,
    },
  },
  normalizedCandidateSnapshot: {
    kind: "topic",
    outcome: "accepted",
  },
  topic: {
    siteId: "site-health-knowhow",
    name: "땀띠",
    slug: "heat-rash",
    topicType: "search_trend",
    keywords: ["땀띠"],
    status: "candidate",
    trendScore: 88,
    lastCollectedAt: "2026-07-15T09:00:00+09:00",
  },
};

const sourceCommand: SourceCandidateStorageCommand = {
  kind: "source_candidate_storage",
  operationId: "op-source-1",
  fingerprint: "fingerprint-source-1",
  provenance: {
    providerId: "youtube-data-api",
    externalId: "yt-video-001",
    duplicateKey: "youtube-data-api:yt-video-001",
    collectedAt: "2026-07-15T09:00:00+09:00",
    locale: "ko-KR",
    country: "KR",
  },
  warnings: [],
  rawMetadataSnapshot: {
    preserved: true,
    rawPayload: {
      videoId: "yt-video-001",
    },
  },
  normalizedCandidateSnapshot: {
    kind: "source",
    outcome: "accepted",
  },
  source: {
    sourceType: "video",
    publisherName: "건강 채널",
    title: "식후 혈당 관리 방법",
    canonicalUrl: "https://www.youtube.com/watch?v=yt-video-001",
    retrievedAt: "2026-07-15T09:00:00+09:00",
    language: "ko",
    trustLevel: "review_required",
    verificationStatus: "pending",
  },
};

describe("InMemoryCollectionStorageRepository", () => {
  it("commits a TopicCandidateStorageCommand", async () => {
    const repository = new InMemoryCollectionStorageRepository();

    const result = await repository.saveTopicCandidate(topicCommand);

    expect(result).toMatchObject({
      status: "committed",
      operationId: "op-topic-1",
      fingerprint: "fingerprint-topic-1",
      storedEntityId: "topic-candidate-1",
    });
    expect(repository.listTopicCandidates()).toEqual([topicCommand]);
    expect(repository.listSourceCandidates()).toEqual([]);
  });

  it("commits a SourceCandidateStorageCommand", async () => {
    const repository = new InMemoryCollectionStorageRepository();

    const result = await repository.saveSourceCandidate(sourceCommand);

    expect(result).toMatchObject({
      status: "committed",
      operationId: "op-source-1",
      fingerprint: "fingerprint-source-1",
      storedEntityId: "source-candidate-1",
    });
    expect(repository.listSourceCandidates()).toEqual([sourceCommand]);
  });

  it("replays the same operationId and fingerprint without creating another row", async () => {
    const repository = new InMemoryCollectionStorageRepository();

    const first = await repository.saveTopicCandidate(topicCommand);
    const second = await repository.saveTopicCandidate({ ...topicCommand });

    expect(first.status).toBe("committed");
    expect(second).toMatchObject({
      status: "replayed",
      operationId: "op-topic-1",
      fingerprint: "fingerprint-topic-1",
      storedEntityId: "topic-candidate-1",
    });
    expect(repository.listTopicCandidates()).toHaveLength(1);
  });

  it("rejects same operationId with a different fingerprint", async () => {
    const repository = new InMemoryCollectionStorageRepository();

    await repository.saveTopicCandidate(topicCommand);
    const result = await repository.saveTopicCandidate({
      ...topicCommand,
      fingerprint: "fingerprint-topic-changed",
    });

    expect(result).toEqual({
      status: "rejected",
      operationId: "op-topic-1",
      code: "OPERATION_PAYLOAD_MISMATCH",
      reason: "operationId already exists with a different fingerprint.",
      existingEntityId: "topic-candidate-1",
    });
    expect(repository.listTopicCandidates()).toHaveLength(1);
  });

  it("rejects duplicateKey re-save even with a different operationId", async () => {
    const repository = new InMemoryCollectionStorageRepository();

    await repository.saveSourceCandidate(sourceCommand);
    const result = await repository.saveSourceCandidate({
      ...sourceCommand,
      operationId: "op-source-duplicate",
      fingerprint: "fingerprint-source-duplicate",
    });

    expect(result).toMatchObject({
      status: "rejected",
      operationId: "op-source-duplicate",
      code: "DUPLICATE_CANDIDATE",
    });
    expect(repository.listSourceCandidates()).toHaveLength(1);
  });

  it("preserves warning metadata and provider provenance/raw metadata", async () => {
    const repository = new InMemoryCollectionStorageRepository();
    const warningTopic: TopicCandidateStorageCommand = {
      ...topicCommand,
      operationId: "op-topic-warning",
      fingerprint: "fingerprint-topic-warning",
      provenance: {
        ...topicCommand.provenance,
        duplicateKey: "naver-datalab:warning-topic",
      },
      warnings: [
        {
          code: "TREND_SCORE_OUT_OF_RANGE",
          reason: "Review score normalization.",
        },
      ],
    };

    await repository.saveTopicCandidate(warningTopic);

    expect(repository.listTopicCandidates()[0]).toMatchObject({
      provenance: {
        providerId: "naver-datalab",
        duplicateKey: "naver-datalab:warning-topic",
      },
      warnings: [
        {
          code: "TREND_SCORE_OUT_OF_RANGE",
          reason: "Review score normalization.",
        },
      ],
      rawMetadataSnapshot: {
        preserved: true,
      },
    });
  });

  it("keeps Topic and Source duplicateKey spaces separated", async () => {
    const repository = new InMemoryCollectionStorageRepository();
    const sameDuplicateKey = "provider:same-key";

    const topicResult = await repository.saveTopicCandidate({
      ...topicCommand,
      provenance: {
        ...topicCommand.provenance,
        duplicateKey: sameDuplicateKey,
      },
    });
    const sourceResult = await repository.saveSourceCandidate({
      ...sourceCommand,
      provenance: {
        ...sourceCommand.provenance,
        duplicateKey: sameDuplicateKey,
      },
    });

    expect(topicResult.status).toBe("committed");
    expect(sourceResult.status).toBe("committed");
    expect(repository.listTopicCandidates()).toHaveLength(1);
    expect(repository.listSourceCandidates()).toHaveLength(1);
  });

  it("does not partially save when duplicate rejection happens", async () => {
    const repository = new InMemoryCollectionStorageRepository();

    await repository.saveTopicCandidate(topicCommand);
    const before = repository.listTopicCandidates();
    const rejected = await repository.saveTopicCandidate({
      ...topicCommand,
      operationId: "op-topic-duplicate",
      fingerprint: "fingerprint-topic-duplicate",
    });
    const after = repository.listTopicCandidates();

    expect(rejected.status).toBe("rejected");
    expect(after).toEqual(before);
  });
});

