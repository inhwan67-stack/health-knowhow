import { describe, expect, it } from "vitest";
import type {
  AcceptedCollectionCandidate,
  CollectionApplicationResult,
} from "./contentCollectionApplication";
import {
  canonicalizeJson,
  createCollectionCommandFingerprint,
  createCollectionStorageCommand,
  createCollectionStorageCommands,
} from "./contentCollectionStorageCommand";

const acceptedTopic: AcceptedCollectionCandidate = {
  kind: "topic",
  outcome: "accepted",
  warnings: [],
  candidate: {
    kind: "topic",
    domain: {
      siteId: "site-health-knowhow",
      name: "땀띠",
      slug: "heat-rash",
      topicType: "search_trend",
      keywords: ["땀띠", "아기 땀띠"],
      status: "candidate",
      trendScore: 88,
      lastCollectedAt: "2026-07-15T09:00:00+09:00",
    },
    provenance: {
      providerId: "naver-datalab",
      externalKey: {
        providerId: "naver-datalab",
        externalId: "naver:heat-rash",
      },
      duplicateKey: "naver-datalab:naver:heat-rash",
      locale: "ko-KR",
      country: "KR",
      collectedAt: "2026-07-15T09:00:00+09:00",
      rawMetadata: {
        preserved: true,
        rawPayload: {
          z: 1,
          a: {
            right: true,
            left: "stable",
          },
        },
      },
    },
  },
};

const warningTopic: AcceptedCollectionCandidate = {
  ...acceptedTopic,
  outcome: "accepted_with_warning",
  warnings: [
    {
      severity: "warning",
      code: "TREND_SCORE_OUT_OF_RANGE",
      reason: "Topic trendScore is outside the normalized 0-100 range and should be reviewed.",
    },
  ],
};

const acceptedSource: AcceptedCollectionCandidate = {
  kind: "source",
  outcome: "accepted",
  warnings: [],
  candidate: {
    kind: "source",
    siteId: "site-health-knowhow",
    domain: {
      sourceType: "video",
      publisherName: "건강 채널",
      title: "식후 혈당 관리 방법",
      canonicalUrl: "https://www.youtube.com/watch?v=yt-video-001",
      retrievedAt: "2026-07-15T09:00:00+09:00",
      language: "ko",
      trustLevel: "review_required",
      verificationStatus: "pending",
      metadata: {
        providerId: "youtube-data-api",
        externalId: "yt-video-001",
      },
    },
    provenance: {
      providerId: "youtube-data-api",
      externalKey: {
        providerId: "youtube-data-api",
        externalId: "yt-video-001",
        sourceUrl: "https://www.youtube.com/watch?v=yt-video-001",
      },
      duplicateKey: "youtube-data-api:yt-video-001",
      locale: "ko-KR",
      country: "KR",
      collectedAt: "2026-07-15T09:00:00+09:00",
      rawMetadata: {
        preserved: true,
        rawPayload: {
          videoId: "yt-video-001",
        },
      },
    },
  },
};

describe("content collection storage command factory", () => {
  it("creates a TopicCandidateStorageCommand from accepted Topic candidates", () => {
    const command = createCollectionStorageCommand({
      candidate: acceptedTopic,
      operationId: "op-topic-1",
    });

    expect(command.kind).toBe("topic_candidate_storage");
    expect(command.operationId).toBe("op-topic-1");
    expect(command.fingerprint).toMatch(/^collection-storage:v1:/);
    expect(command.provenance).toEqual({
      providerId: "naver-datalab",
      externalId: "naver:heat-rash",
      duplicateKey: "naver-datalab:naver:heat-rash",
      collectedAt: "2026-07-15T09:00:00+09:00",
      locale: "ko-KR",
      country: "KR",
    });
    if (command.kind !== "topic_candidate_storage") {
      throw new Error("Expected topic_candidate_storage command");
    }
    expect(command.topic).toMatchObject({
      name: "땀띠",
      status: "candidate",
      trendScore: 88,
      lastCollectedAt: "2026-07-15T09:00:00+09:00",
    });
    expect(command.rawMetadataSnapshot).toBe(acceptedTopic.candidate.provenance.rawMetadata);
  });

  it("creates a SourceCandidateStorageCommand preserving trust and verification state", () => {
    const command = createCollectionStorageCommand({
      candidate: acceptedSource,
      operationId: "op-source-1",
    });

    if (command.kind !== "source_candidate_storage") {
      throw new Error("Expected source_candidate_storage command");
    }
    expect(command.source).toMatchObject({
      sourceType: "video",
      canonicalUrl: "https://www.youtube.com/watch?v=yt-video-001",
      trustLevel: "review_required",
      verificationStatus: "pending",
    });
    expect(command.provenance.providerId).toBe("youtube-data-api");
    expect(command.normalizedCandidateSnapshot).toMatchObject({
      kind: "source",
      outcome: "accepted",
    });
  });

  it("preserves accepted_with_warning issues in command metadata", () => {
    const command = createCollectionStorageCommand({
      candidate: warningTopic,
      operationId: "op-topic-warning-1",
    });

    expect(command.warnings).toEqual([
      {
        code: "TREND_SCORE_OUT_OF_RANGE",
        reason: "Topic trendScore is outside the normalized 0-100 range and should be reviewed.",
      },
    ]);
    expect(command.normalizedCandidateSnapshot).toMatchObject({
      outcome: "accepted_with_warning",
    });
  });

  it("keeps operationId separate from fingerprint", () => {
    const first = createCollectionStorageCommand({
      candidate: acceptedTopic,
      operationId: "op-topic-a",
    });
    const second = createCollectionStorageCommand({
      candidate: acceptedTopic,
      operationId: "op-topic-b",
    });

    expect(first.operationId).not.toBe(second.operationId);
    expect(first.fingerprint).toBe(second.fingerprint);
  });

  it("creates stable fingerprints for semantically equal payloads regardless of object key order", () => {
    const left = createCollectionCommandFingerprint({
      b: 2,
      a: {
        z: true,
        y: "yes",
      },
    });
    const right = createCollectionCommandFingerprint({
      a: {
        y: "yes",
        z: true,
      },
      b: 2,
    });

    expect(left).toBe(right);
    expect(canonicalizeJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });

  it("does not create commands for rejected candidates or provider errors in a batch", () => {
    const result: CollectionApplicationResult = {
      accepted: [acceptedTopic, acceptedSource],
      rejected: [
        {
          kind: "source",
          outcome: "rejected",
          duplicateKey: "youtube-data-api:duplicate",
          providerId: "youtube-data-api",
          validation: {
            valid: false,
            invalid: [
              {
                severity: "invalid",
                code: "DUPLICATE_CANDIDATE",
                reason: "Duplicate candidate.",
              },
            ],
            warning: [],
          },
        },
      ],
      providerErrors: [
        {
          kind: "provider_error",
          providerId: "naver-datalab",
          error: {
            providerId: "naver-datalab",
            code: "RATE_LIMITED",
            message: "rate limited",
            retryable: true,
            occurredAt: "2026-07-15T09:00:00+09:00",
          },
        },
      ],
      summary: {
        acceptedCount: 2,
        warningCount: 0,
        rejectedCount: 1,
        providerErrorCount: 1,
        duplicateRejectedCount: 1,
        totalProcessedCount: 4,
      },
    };

    const batch = createCollectionStorageCommands({
      result,
      operationIdForCandidate: (candidate, index) =>
        `${candidate.candidate.provenance.providerId}:${index}`,
    });

    expect(batch.commands).toHaveLength(2);
    expect(batch.skippedRejectedCount).toBe(1);
    expect(batch.skippedProviderErrorCount).toBe(1);
    expect(batch.commands.map((command) => command.operationId)).toEqual([
      "naver-datalab:0",
      "youtube-data-api:1",
    ]);
  });
});
