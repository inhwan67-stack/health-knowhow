import { describe, expect, it } from "vitest";
import type {
  NormalizedSourceCandidate,
  NormalizedTrendCandidate,
  ProviderResult,
} from "../types/content-collection-provider";
import { processCollectionProviderResults } from "./contentCollectionApplication";

const windowFixture = {
  startDate: "2026-07-01",
  endDate: "2026-07-15",
  timeUnit: "date",
} as const;

const naverTrend: NormalizedTrendCandidate = {
  providerId: "naver-datalab",
  siteId: "site-health-knowhow",
  externalKey: {
    providerId: "naver-datalab",
    externalId: "naver:heat-rash",
  },
  label: "땀띠",
  normalizedKeyword: "땀띠",
  relatedKeywords: ["아기 땀띠"],
  locale: "ko-KR",
  country: "KR",
  window: windowFixture,
  collectedAt: "2026-07-15T09:00:00+09:00",
  score: 88,
  scoreUnit: "relative_interest",
  rawMetadata: {
    preserved: true,
    rawPayload: {
      ratio: 88,
    },
  },
  suggestedTopic: {
    name: "땀띠",
    slug: "heat-rash",
    topicType: "search_trend",
    keywords: ["땀띠", "아기 땀띠"],
    trendScore: 88,
  },
};

const youtubeTrend: NormalizedTrendCandidate = {
  providerId: "youtube-data-api",
  siteId: "site-health-knowhow",
  externalKey: {
    providerId: "youtube-data-api",
    externalId: "youtube-query:blood-sugar-spike",
  },
  label: "혈당스파이크",
  normalizedKeyword: "혈당스파이크",
  relatedKeywords: ["식후 혈당"],
  locale: "ko-KR",
  country: "KR",
  window: windowFixture,
  collectedAt: "2026-07-15T09:00:00+09:00",
  score: 11,
  scoreUnit: "mention_count",
  rawMetadata: {
    preserved: true,
  },
  suggestedTopic: {
    name: "혈당스파이크",
    topicType: "video_trend",
    keywords: ["혈당스파이크", "식후 혈당"],
  },
};

const youtubeSource: NormalizedSourceCandidate = {
  providerId: "youtube-data-api",
  siteId: "site-health-knowhow",
  externalKey: {
    providerId: "youtube-data-api",
    externalId: "yt-video-001",
    sourceUrl: "https://www.youtube.com/watch?v=yt-video-001",
  },
  sourceUrl: "https://www.youtube.com/watch?v=yt-video-001",
  canonicalUrl: "https://www.youtube.com/watch?v=yt-video-001",
  title: "식후 혈당 관리 방법",
  publisherName: "건강 채널",
  sourceType: "video",
  language: "ko",
  locale: "ko-KR",
  country: "KR",
  retrievedAt: "2026-07-15T09:00:00+09:00",
  trustLevel: "review_required",
  verificationStatus: "pending",
  rawMetadata: {
    preserved: true,
    rawPayload: {
      videoId: "yt-video-001",
    },
  },
  suggestedSource: {
    sourceType: "video",
    publisherName: "건강 채널",
    title: "식후 혈당 관리 방법",
    canonicalUrl: "https://www.youtube.com/watch?v=yt-video-001",
    language: "ko",
    trustLevel: "review_required",
    verificationStatus: "pending",
  },
};

const officialSource: NormalizedSourceCandidate = {
  providerId: "official-medical-public-source",
  siteId: "site-health-knowhow",
  externalKey: {
    providerId: "official-medical-public-source",
    externalId: "official:heat-illness",
    sourceUrl: "https://example.go.kr/health/heat-illness",
  },
  sourceUrl: "https://example.go.kr/health/heat-illness",
  canonicalUrl: "https://example.go.kr/health/heat-illness",
  title: "온열질환 예방수칙",
  publisherName: "공식 공공기관",
  sourceType: "government",
  language: "ko",
  locale: "ko-KR",
  country: "KR",
  retrievedAt: "2026-07-15T09:00:00+09:00",
  trustLevel: "trusted",
  verificationStatus: "pending",
  rawMetadata: {
    preserved: true,
  },
  suggestedSource: {
    sourceType: "government",
    publisherName: "공식 공공기관",
    title: "온열질환 예방수칙",
    canonicalUrl: "https://example.go.kr/health/heat-illness",
    language: "ko",
    trustLevel: "trusted",
    verificationStatus: "pending",
  },
};

describe("content collection application service", () => {
  it("processes TrendProvider results into accepted Topic candidates", () => {
    const result = processCollectionProviderResults({
      trendResults: [okTrendResult("naver-datalab", [naverTrend])],
    });

    expect(result.summary).toMatchObject({
      acceptedCount: 1,
      warningCount: 0,
      rejectedCount: 0,
      providerErrorCount: 0,
    });
    expect(result.accepted[0]?.kind).toBe("topic");
    expect(result.accepted[0]?.candidate.provenance.providerId).toBe("naver-datalab");
  });

  it("processes SourceProvider results into accepted Source candidates", () => {
    const result = processCollectionProviderResults({
      sourceResults: [okSourceResult("official-medical-public-source", [officialSource])],
    });

    expect(result.summary.acceptedCount).toBe(1);
    expect(result.accepted[0]?.kind).toBe("source");
    expect(result.accepted[0]?.candidate.provenance.providerId).toBe("official-medical-public-source");
  });

  it("processes HybridCollectionProvider results into separate Topic and Source candidates", () => {
    const result = processCollectionProviderResults({
      trendResults: [okTrendResult("youtube-data-api", [youtubeTrend])],
      sourceResults: [okSourceResult("youtube-data-api", [youtubeSource])],
    });

    expect(result.accepted.map((candidate) => candidate.kind)).toEqual(["topic", "source"]);
    expect(result.summary).toMatchObject({
      acceptedCount: 2,
      warningCount: 0,
      rejectedCount: 0,
      totalProcessedCount: 2,
    });
  });

  it("accepts warning candidates separately from clean accepted candidates", () => {
    const result = processCollectionProviderResults({
      trendResults: [
        okTrendResult("naver-datalab", [
          {
            ...naverTrend,
            externalKey: {
              providerId: "naver-datalab",
              externalId: "naver:warning-trend",
            },
            suggestedTopic: {
              ...naverTrend.suggestedTopic,
              trendScore: 140,
            },
          },
        ]),
      ],
    });

    expect(result.summary.acceptedCount).toBe(0);
    expect(result.summary.warningCount).toBe(1);
    expect(result.accepted[0]?.outcome).toBe("accepted_with_warning");
    expect(result.accepted[0]?.warnings.map((warning) => warning.code)).toContain("TREND_SCORE_OUT_OF_RANGE");
  });

  it("rejects invalid candidates and preserves validation codes and reasons", () => {
    const result = processCollectionProviderResults({
      sourceResults: [
        okSourceResult("youtube-data-api", [
          {
            ...youtubeSource,
            suggestedSource: {
              ...youtubeSource.suggestedSource,
              trustLevel: "trusted",
            },
          },
        ]),
      ],
    });

    expect(result.summary.rejectedCount).toBe(1);
    expect(result.rejected[0]?.validation.invalid).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "YOUTUBE_SOURCE_TRUST_POLICY_VIOLATION",
          reason: expect.any(String),
        }),
      ]),
    );
  });

  it("deduplicates by provider duplicateKey and rejects later duplicates", () => {
    const result = processCollectionProviderResults({
      trendResults: [okTrendResult("naver-datalab", [naverTrend, { ...naverTrend, label: "중복 땀띠" }])],
    });

    expect(result.summary.acceptedCount).toBe(1);
    expect(result.summary.rejectedCount).toBe(1);
    expect(result.summary.duplicateRejectedCount).toBe(1);
    expect(result.rejected[0]?.validation.invalid.map((issue) => issue.code)).toContain("DUPLICATE_CANDIDATE");
  });

  it("separates provider errors from candidate validation errors", () => {
    const result = processCollectionProviderResults({
      trendResults: [
        {
          ok: false,
          providerId: "naver-datalab",
          error: {
            providerId: "naver-datalab",
            code: "RATE_LIMITED",
            message: "Naver DataLab quota temporarily limited",
            retryable: true,
            occurredAt: "2026-07-15T09:00:00+09:00",
            retryAfterSeconds: 60,
          },
        },
      ],
      sourceResults: [
        okSourceResult("youtube-data-api", [
          {
            ...youtubeSource,
            title: "",
            suggestedSource: {
              ...youtubeSource.suggestedSource,
              title: "",
            },
          },
        ]),
      ],
    });

    expect(result.providerErrors).toHaveLength(1);
    expect(result.providerErrors[0]?.error.code).toBe("RATE_LIMITED");
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.validation.invalid.map((issue) => issue.code)).toContain("SOURCE_TITLE_REQUIRED");
    expect(result.summary).toMatchObject({
      providerErrorCount: 1,
      rejectedCount: 1,
      totalProcessedCount: 2,
    });
  });
});

function okTrendResult(
  providerId: ProviderResult<NormalizedTrendCandidate>["providerId"],
  data: NormalizedTrendCandidate[],
): ProviderResult<NormalizedTrendCandidate> {
  return {
    ok: true,
    providerId,
    collectedAt: "2026-07-15T09:00:00+09:00",
    data,
  };
}

function okSourceResult(
  providerId: ProviderResult<NormalizedSourceCandidate>["providerId"],
  data: NormalizedSourceCandidate[],
): ProviderResult<NormalizedSourceCandidate> {
  return {
    ok: true,
    providerId,
    collectedAt: "2026-07-15T09:00:00+09:00",
    data,
  };
}

