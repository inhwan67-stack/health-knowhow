import { describe, expect, it } from "vitest";
import type {
  NormalizedSourceCandidate,
  NormalizedTrendCandidate,
} from "../types/content-collection-provider";
import {
  buildSourceDuplicateKey,
  buildTopicDuplicateKey,
  dedupeMappedSourceCandidates,
  dedupeMappedTopicCandidates,
  mapHybridCollectionResults,
  mapSourceCandidateToSourceCandidate,
  mapTrendCandidateToTopicCandidate,
} from "./contentCollectionMapper";

const windowFixture = {
  startDate: "2026-07-01",
  endDate: "2026-07-15",
  timeUnit: "date",
} as const;

const naverTrendFixture: NormalizedTrendCandidate = {
  providerId: "naver-datalab",
  siteId: "site-health-knowhow",
  externalKey: {
    providerId: "naver-datalab",
    externalId: "naver:ko-KR:KR:heat-rash",
  },
  label: "땀띠",
  normalizedKeyword: "땀띠",
  relatedKeywords: ["여름 피부질환", "아기 땀띠"],
  locale: "ko-KR",
  country: "KR",
  window: windowFixture,
  collectedAt: "2026-07-15T09:00:00+09:00",
  score: 92.1,
  scoreUnit: "relative_interest",
  rawMetadata: {
    preserved: true,
    responseHash: "sha256:naver-trend",
    rawPayload: {
      ratio: 92.1,
      period: "date",
    },
  },
  suggestedTopic: {
    name: "땀띠",
    slug: "heat-rash",
    topicType: "search_trend",
    keywords: ["땀띠", "여름 피부질환"],
    trendScore: 92.1,
  },
};

const youtubeTrendFixture: NormalizedTrendCandidate = {
  providerId: "youtube-data-api",
  siteId: "site-health-knowhow",
  externalKey: {
    providerId: "youtube-data-api",
    externalId: "youtube-query:ko-KR:KR:혈당스파이크",
  },
  label: "혈당스파이크",
  normalizedKeyword: "혈당스파이크",
  relatedKeywords: ["식후 혈당", "당뇨 식단"],
  locale: "ko-KR",
  country: "KR",
  window: windowFixture,
  collectedAt: "2026-07-15T09:00:00+09:00",
  score: 14,
  scoreUnit: "mention_count",
  rawMetadata: {
    preserved: true,
    responseHash: "sha256:youtube-trend",
    rawPayload: {
      resultCount: 14,
    },
  },
  suggestedTopic: {
    name: "혈당스파이크",
    topicType: "video_trend",
    keywords: ["혈당스파이크", "식후 혈당", "당뇨 식단"],
  },
};

const youtubeSourceFixture: NormalizedSourceCandidate = {
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
  publishedAt: "2026-07-14T12:00:00+09:00",
  retrievedAt: "2026-07-15T09:00:00+09:00",
  summary: "식후 혈당 관리에 대한 영상 후보",
  trustLevel: "review_required",
  verificationStatus: "pending",
  rawMetadata: {
    preserved: true,
    responseHash: "sha256:youtube-source",
    rawPayload: {
      videoId: "yt-video-001",
      channelTitle: "건강 채널",
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
    metadata: {
      channelTitle: "건강 채널",
    },
  },
};

const officialSourceFixture: NormalizedSourceCandidate = {
  providerId: "official-medical-public-source",
  siteId: "site-health-knowhow",
  externalKey: {
    providerId: "official-medical-public-source",
    externalId: "kdca:summer-heat-illness",
    sourceUrl: "https://example.go.kr/health/summer-heat-illness",
  },
  sourceUrl: "https://example.go.kr/health/summer-heat-illness",
  canonicalUrl: "https://example.go.kr/health/summer-heat-illness",
  title: "온열질환 예방수칙",
  publisherName: "공식 공공기관",
  sourceType: "government",
  language: "ko",
  locale: "ko-KR",
  country: "KR",
  publishedAt: "2026-07-10T00:00:00+09:00",
  retrievedAt: "2026-07-15T09:00:00+09:00",
  summary: "온열질환 예방을 위한 공식 안내",
  trustLevel: "review_required",
  verificationStatus: "pending",
  rawMetadata: {
    preserved: true,
    responseHash: "sha256:official-source",
    termsOfUseNote: "Do not store full text unless allowed.",
  },
  suggestedSource: {
    sourceType: "government",
    publisherName: "공식 공공기관",
    title: "온열질환 예방수칙",
    canonicalUrl: "https://example.go.kr/health/summer-heat-illness",
    language: "ko",
    trustLevel: "review_required",
    verificationStatus: "pending",
  },
};

describe("content collection mapper", () => {
  it("maps Naver DataLab trend candidates to Topic candidates with trend score", () => {
    const mapped = mapTrendCandidateToTopicCandidate(naverTrendFixture);

    expect(mapped.kind).toBe("topic");
    expect(mapped.domain).toEqual({
      siteId: "site-health-knowhow",
      name: "땀띠",
      slug: "heat-rash",
      topicType: "search_trend",
      keywords: ["땀띠", "여름 피부질환", "아기 땀띠"],
      status: "candidate",
      trendScore: 92.1,
      lastCollectedAt: "2026-07-15T09:00:00+09:00",
    });
    expect(mapped.provenance.providerId).toBe("naver-datalab");
    expect(mapped.provenance.locale).toBe("ko-KR");
    expect(mapped.provenance.country).toBe("KR");
    expect(mapped.provenance.rawMetadata).toBe(naverTrendFixture.rawMetadata);
  });

  it("keeps raw metadata separated from Topic domain fields", () => {
    const mapped = mapTrendCandidateToTopicCandidate(naverTrendFixture);

    expect("rawMetadata" in mapped.domain).toBe(false);
    expect(mapped.provenance.rawMetadata.rawPayload).toEqual({
      ratio: 92.1,
      period: "date",
    });
  });

  it("separates YouTube hybrid results into Topic and Source candidates", () => {
    const result = mapHybridCollectionResults({
      trendCandidates: [youtubeTrendFixture],
      sourceCandidates: [youtubeSourceFixture],
    });

    expect(result.topicCandidates).toHaveLength(1);
    expect(result.sourceCandidates).toHaveLength(1);
    expect(result.topicCandidates[0]?.domain.name).toBe("혈당스파이크");
    expect(result.topicCandidates[0]?.domain.trendScore).toBe(14);
    expect(result.sourceCandidates[0]?.domain.sourceType).toBe("video");
    expect(result.sourceCandidates[0]?.domain.trustLevel).toBe("review_required");
  });

  it("maps YouTube source candidates without treating video metadata as trusted medical evidence", () => {
    const mapped = mapSourceCandidateToSourceCandidate(youtubeSourceFixture);

    expect(mapped.domain.trustLevel).toBe("review_required");
    expect(mapped.domain.verificationStatus).toBe("pending");
    expect(mapped.domain.metadata).toMatchObject({
      providerId: "youtube-data-api",
      externalId: "yt-video-001",
      locale: "ko-KR",
      country: "KR",
      sourceUrl: "https://www.youtube.com/watch?v=yt-video-001",
    });
    expect("rawMetadata" in mapped.domain).toBe(false);
  });

  it("promotes official medical/public source candidates to trusted Source candidates pending verification", () => {
    const mapped = mapSourceCandidateToSourceCandidate(officialSourceFixture);

    expect(mapped.domain.sourceType).toBe("government");
    expect(mapped.domain.trustLevel).toBe("trusted");
    expect(mapped.domain.verificationStatus).toBe("pending");
    expect(mapped.domain.canonicalUrl).toBe("https://example.go.kr/health/summer-heat-illness");
    expect(mapped.provenance.rawMetadata).toBe(officialSourceFixture.rawMetadata);
  });

  it("builds duplicate keys from provider external ids first", () => {
    expect(buildTopicDuplicateKey(naverTrendFixture)).toBe("naver-datalab:naver:ko-kr:kr:heat-rash");
    expect(buildSourceDuplicateKey(youtubeSourceFixture)).toBe("youtube-data-api:yt-video-001");
  });

  it("falls back to canonical URL for source duplicate keys", () => {
    const withoutExternalId: NormalizedSourceCandidate = {
      ...youtubeSourceFixture,
      externalKey: {
        providerId: "youtube-data-api",
        sourceUrl: "https://www.youtube.com/watch?v=yt-video-001/",
      },
    };

    expect(buildSourceDuplicateKey(withoutExternalId)).toBe(
      "youtube-data-api:https://www.youtube.com/watch?v=yt-video-001",
    );
  });

  it("deduplicates same-provider Topic and Source candidates by duplicate key", () => {
    const topic = mapTrendCandidateToTopicCandidate(naverTrendFixture);
    const duplicateTopic = mapTrendCandidateToTopicCandidate({
      ...naverTrendFixture,
      label: "땀띠 중복 후보",
    });
    const source = mapSourceCandidateToSourceCandidate(youtubeSourceFixture);
    const duplicateSource = mapSourceCandidateToSourceCandidate({
      ...youtubeSourceFixture,
      title: "중복 영상 후보",
    });

    expect(dedupeMappedTopicCandidates([topic, duplicateTopic])).toEqual([topic]);
    expect(dedupeMappedSourceCandidates([source, duplicateSource])).toEqual([source]);
  });
});

