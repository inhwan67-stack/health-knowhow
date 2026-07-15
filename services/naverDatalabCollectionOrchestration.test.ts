import { describe, expect, it } from "vitest";

import { processCollectionProviderResults } from "./contentCollectionApplication";
import { createCollectionStorageCommands } from "./contentCollectionStorageCommand";
import {
  mapNaverDatalabErrorToProviderError,
  mapNaverDatalabResponseToTrendCandidates,
  type NaverDatalabSearchTrendRequest,
  type NaverDatalabSearchTrendResponse,
} from "./naverDatalabTrendProvider";
import type {
  NormalizedTrendCandidate,
  ProviderResult,
} from "../types/content-collection-provider";

const siteId = "site-health-knowhow";
const collectedAt = "2026-07-15T09:00:00+09:00";

const naverRequest: NaverDatalabSearchTrendRequest = {
  startDate: "2026-07-01",
  endDate: "2026-07-14",
  timeUnit: "date",
  keywordGroups: [
    { groupName: "감기", keywords: ["감기", "기침"] },
    { groupName: "수면", keywords: ["수면", "불면증"] },
  ],
};

const naverResponse: NaverDatalabSearchTrendResponse = {
  startDate: "2026-07-01",
  endDate: "2026-07-14",
  timeUnit: "date",
  results: [
    {
      title: "감기",
      keywords: ["감기", "기침"],
      data: [
        { period: "2026-07-01", ratio: 20 },
        { period: "2026-07-02", ratio: 87 },
      ],
    },
    {
      title: "수면",
      keywords: ["수면", "불면증"],
      data: [
        { period: "2026-07-01", ratio: 10 },
        { period: "2026-07-02", ratio: 64 },
      ],
    },
  ],
};

describe("Naver DataLab collection dry-run orchestration", () => {
  it("moves a single keyword group fixture through the full Topic candidate pipeline", () => {
    const normalized = normalizeNaverResponse({
      ...naverResponse,
      results: [naverResponse.results[0]!],
    });
    const result = processCollectionProviderResults({
      trendResults: [normalized],
    });

    expect(result.summary).toMatchObject({
      acceptedCount: 1,
      warningCount: 0,
      rejectedCount: 0,
      providerErrorCount: 0,
      totalProcessedCount: 1,
    });
    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]?.kind).toBe("topic");
    expect(result.accepted[0]?.outcome).toBe("accepted");
    expect(result.accepted[0]?.candidate.domain).toMatchObject({
      siteId,
      name: "감기",
      topicType: "search_trend",
      trendScore: 87,
      lastCollectedAt: collectedAt,
    });
    expect(result.accepted[0]?.candidate.provenance).toMatchObject({
      providerId: "naver-datalab",
      locale: "ko-KR",
      country: "KR",
      collectedAt,
    });
    expect(result.accepted[0]?.candidate.provenance.externalKey.externalId).toContain("naver-datalab");
    expect(result.accepted[0]?.candidate.provenance.duplicateKey).toContain("naver-datalab");
    expect(result.accepted[0]?.candidate.provenance.rawMetadata.preserved).toBe(true);
  });

  it("moves multiple keyword groups into multiple accepted Topic candidates and no Source candidates", () => {
    const normalized = normalizeNaverResponse(naverResponse);
    const result = processCollectionProviderResults({
      trendResults: [normalized],
    });

    expect(result.summary).toMatchObject({
      acceptedCount: 2,
      rejectedCount: 0,
      providerErrorCount: 0,
      totalProcessedCount: 2,
    });
    expect(result.accepted.map((candidate) => candidate.kind)).toEqual(["topic", "topic"]);
    const acceptedTopics = result.accepted.filter((candidate) => candidate.kind === "topic");
    expect(acceptedTopics.map((candidate) => candidate.candidate.domain.name)).toEqual(["감기", "수면"]);
    expect(acceptedTopics.map((candidate) => candidate.candidate.domain.trendScore)).toEqual([87, 64]);
  });

  it("creates Topic storage commands from accepted Naver Topic candidates without saving them", () => {
    const normalized = normalizeNaverResponse(naverResponse);
    const result = processCollectionProviderResults({
      trendResults: [normalized],
    });
    const commandBatch = createCollectionStorageCommands({
      result,
      operationIdForCandidate: (candidate, index) =>
        `live-dry-run:${candidate.kind}:${candidate.candidate.provenance.providerId}:${index + 1}`,
    });

    expect(commandBatch.skippedRejectedCount).toBe(0);
    expect(commandBatch.skippedProviderErrorCount).toBe(0);
    expect(commandBatch.commands).toHaveLength(2);
    expect(commandBatch.commands.every((command) => command.kind === "topic_candidate_storage")).toBe(true);
    expect(commandBatch.commands.map((command) => command.provenance.providerId)).toEqual([
      "naver-datalab",
      "naver-datalab",
    ]);
    expect(commandBatch.commands.every((command) => command.operationId.length > 0)).toBe(true);
    expect(commandBatch.commands.every((command) => command.fingerprint.startsWith("collection-storage:v1:"))).toBe(true);
    expect(
      commandBatch.commands.map((command) =>
        command.kind === "topic_candidate_storage"
          ? {
              name: command.topic.name,
              trendScore: command.topic.trendScore,
            }
          : undefined,
      ),
    ).toEqual([
      { name: "감기", trendScore: 87 },
      { name: "수면", trendScore: 64 },
    ]);
  });

  it("rejects duplicate Naver candidates by duplicateKey while preserving the first accepted candidate", () => {
    const normalized = normalizeNaverResponse({
      ...naverResponse,
      results: [naverResponse.results[0]!, naverResponse.results[0]!],
    });
    const result = processCollectionProviderResults({
      trendResults: [normalized],
    });

    expect(result.summary).toMatchObject({
      acceptedCount: 1,
      rejectedCount: 1,
      duplicateRejectedCount: 1,
    });
    expect(result.rejected[0]?.kind).toBe("topic");
    expect(result.rejected[0]?.validation.invalid).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DUPLICATE_CANDIDATE",
        }),
      ]),
    );
  });

  it("rejects malformed normalized Naver candidates through validation policy", () => {
    const normalized = normalizeNaverResponse({
      ...naverResponse,
      results: [naverResponse.results[0]!],
    });
    if (!normalized.ok) {
      throw new Error("Naver fixture normalization unexpectedly failed");
    }

    const malformedCandidate: NormalizedTrendCandidate = {
      ...normalized.data[0]!,
      label: "",
      externalKey: {
        providerId: "naver-datalab",
      },
      suggestedTopic: {
        ...normalized.data[0]!.suggestedTopic,
        name: "",
        slug: "",
        keywords: [],
      },
      relatedKeywords: [],
      normalizedKeyword: "",
    };

    const result = processCollectionProviderResults({
      trendResults: [
        {
          ...normalized,
          data: [malformedCandidate],
        },
      ],
    });

    expect(result.summary.acceptedCount).toBe(0);
    expect(result.summary.rejectedCount).toBe(1);
    expect(result.rejected[0]?.validation.invalid.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["MISSING_EXTERNAL_IDENTIFIER", "TOPIC_NAME_REQUIRED", "TOPIC_IDENTIFIER_REQUIRED"]),
    );
  });

  it("keeps provider errors separate from candidate validation errors", () => {
    const providerError = mapNaverDatalabErrorToProviderError({
      httpStatus: 429,
      response: { errorMessage: "Too many requests" },
      occurredAt: collectedAt,
    });
    const normalized = normalizeNaverResponse({
      ...naverResponse,
      results: [naverResponse.results[0]!],
    });
    if (!normalized.ok) {
      throw new Error("Naver fixture normalization unexpectedly failed");
    }

    const result = processCollectionProviderResults({
      trendResults: [
        {
          ok: false,
          providerId: "naver-datalab",
          error: providerError,
        },
        {
          ...normalized,
          data: [
            {
              ...normalized.data[0]!,
              label: "",
              suggestedTopic: {
                ...normalized.data[0]!.suggestedTopic,
                name: "",
                slug: "",
                keywords: [],
              },
              relatedKeywords: [],
              normalizedKeyword: "",
            },
          ],
        },
      ],
    });

    expect(result.summary).toMatchObject({
      acceptedCount: 0,
      rejectedCount: 1,
      providerErrorCount: 1,
      totalProcessedCount: 2,
    });
    expect(result.providerErrors[0]?.error.code).toBe("RATE_LIMITED");
    expect(result.rejected[0]?.validation.invalid.map((issue) => issue.code)).toContain("TOPIC_NAME_REQUIRED");
  });
});

function normalizeNaverResponse(
  response: NaverDatalabSearchTrendResponse,
): ProviderResult<NormalizedTrendCandidate> {
  return mapNaverDatalabResponseToTrendCandidates({
    request: naverRequest,
    response,
    siteId,
    collectedAt,
  });
}
