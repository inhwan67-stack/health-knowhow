import { describe, expect, it } from "vitest";
import {
  INITIAL_HEALTH_KNOWHOW_COLLECTION_PROVIDERS,
  NAVER_DATALAB_PROVIDER,
  OFFICIAL_MEDICAL_PUBLIC_SOURCE_PROVIDER,
  YOUTUBE_DATA_API_PROVIDER,
  providerSupports,
  type CollectionProviderCapability,
  type NormalizedSourceCandidate,
  type NormalizedTrendCandidate,
  type ProviderError,
  type ProviderResult,
} from "./content-collection-provider";

type Includes<Union, Member> = Member extends Union ? true : false;
type Assert<T extends true> = T;
type AssertFalse<T extends false> = T;

type ProviderCapabilityDoesNotApprove = AssertFalse<
  Includes<CollectionProviderCapability, "approval:final:decide">
>;
type ProviderCapabilityDoesNotPublish = AssertFalse<
  Includes<CollectionProviderCapability, "publication:create">
>;
type ProviderCapabilityCanCreateTopicCandidate = Assert<
  Includes<CollectionProviderCapability, "topic:candidate:discover">
>;
type ProviderCapabilityCanDiscoverSource = Assert<
  Includes<CollectionProviderCapability, "source:candidate:discover">
>;

const capabilityBoundaryAssertions: [
  ProviderCapabilityDoesNotApprove,
  ProviderCapabilityDoesNotPublish,
  ProviderCapabilityCanCreateTopicCandidate,
  ProviderCapabilityCanDiscoverSource,
] = [false, false, true, true];

const requestWindow = {
  startDate: "2026-07-01",
  endDate: "2026-07-15",
  timeUnit: "date",
} as const;

describe("initial health-knowhow collection providers", () => {
  it("declares the three approved initial providers", () => {
    expect(INITIAL_HEALTH_KNOWHOW_COLLECTION_PROVIDERS.map((provider) => provider.id)).toEqual([
      "naver-datalab",
      "youtube-data-api",
      "official-medical-public-source",
    ]);
  });

  it("maps Naver DataLab to topic candidate discovery only", () => {
    expect(NAVER_DATALAB_PROVIDER.kind).toBe("trend");
    expect(NAVER_DATALAB_PROVIDER.authType).toBe("client_id_secret");
    expect(providerSupports(NAVER_DATALAB_PROVIDER, "trend:collect")).toBe(true);
    expect(providerSupports(NAVER_DATALAB_PROVIDER, "topic:candidate:discover")).toBe(true);
    expect(providerSupports(NAVER_DATALAB_PROVIDER, "source:candidate:discover")).toBe(false);
  });

  it("maps YouTube Data API to topic and video source discovery", () => {
    expect(YOUTUBE_DATA_API_PROVIDER.kind).toBe("hybrid");
    expect(YOUTUBE_DATA_API_PROVIDER.authType).toBe("api_key");
    expect(providerSupports(YOUTUBE_DATA_API_PROVIDER, "topic:candidate:discover")).toBe(true);
    expect(providerSupports(YOUTUBE_DATA_API_PROVIDER, "source:candidate:discover")).toBe(true);
    expect(providerSupports(YOUTUBE_DATA_API_PROVIDER, "source:video:discover")).toBe(true);
    expect(providerSupports(YOUTUBE_DATA_API_PROVIDER, "source:trusted:discover")).toBe(false);
  });

  it("maps official medical/public sources to trusted source discovery", () => {
    expect(OFFICIAL_MEDICAL_PUBLIC_SOURCE_PROVIDER.kind).toBe("source");
    expect(providerSupports(OFFICIAL_MEDICAL_PUBLIC_SOURCE_PROVIDER, "source:trusted:discover")).toBe(true);
    expect(providerSupports(OFFICIAL_MEDICAL_PUBLIC_SOURCE_PROVIDER, "trend:collect")).toBe(false);
  });

  it("keeps provider capabilities below final approval and publication", () => {
    expect(capabilityBoundaryAssertions).toEqual([false, false, true, true]);
  });
});

describe("normalized trend candidate contract", () => {
  it("preserves provider identity, collection window, locale, and Topic candidate mapping", () => {
    const candidate: NormalizedTrendCandidate = {
      providerId: "naver-datalab",
      siteId: "site-health-knowhow",
      externalKey: {
        providerId: "naver-datalab",
        externalId: "naver-datalab:ko-KR:KR:수면장애",
      },
      label: "수면장애",
      normalizedKeyword: "수면장애",
      relatedKeywords: ["불면증", "잠이 안 올 때"],
      locale: "ko-KR",
      country: "KR",
      window: requestWindow,
      collectedAt: "2026-07-15T00:00:00+09:00",
      score: 81.4,
      scoreUnit: "relative_interest",
      changeRate: 0.17,
      rawMetadata: {
        preserved: true,
        responseHash: "sha256:trend-fixture",
        rawPayload: {
          providerRatio: 81.4,
          providerTimeUnit: "date",
        },
      },
      suggestedTopic: {
        name: "수면장애",
        slug: "sleep-disorder",
        topicType: "search_trend",
        keywords: ["수면장애", "불면증", "잠이 안 올 때"],
        trendScore: 81.4,
      },
    };

    expect(candidate.suggestedTopic.keywords).toContain("불면증");
    expect(candidate.externalKey.providerId).toBe(candidate.providerId);
    expect(candidate.window).toEqual(requestWindow);
    expect(candidate.rawMetadata.preserved).toBe(true);
  });
});

describe("normalized source candidate contract", () => {
  it("preserves external duplicate keys and maps official references toward Source creation", () => {
    const candidate: NormalizedSourceCandidate = {
      providerId: "official-medical-public-source",
      siteId: "site-health-knowhow",
      externalKey: {
        providerId: "official-medical-public-source",
        externalId: "kdca:example:respiratory-virus",
        sourceUrl: "https://example.go.kr/health/respiratory-virus",
      },
      sourceUrl: "https://example.go.kr/health/respiratory-virus",
      canonicalUrl: "https://example.go.kr/health/respiratory-virus",
      title: "호흡기 감염 예방 안내",
      publisherName: "공식 공공기관",
      sourceType: "government",
      language: "ko",
      locale: "ko-KR",
      country: "KR",
      publishedAt: "2026-07-14T00:00:00+09:00",
      retrievedAt: "2026-07-15T00:00:00+09:00",
      summary: "호흡기 감염 예방을 위한 공식 안내 자료",
      trustLevel: "trusted",
      verificationStatus: "pending",
      rawMetadata: {
        preserved: true,
        responseHash: "sha256:source-fixture",
        termsOfUseNote: "Store URL, summary, and metadata; avoid copying full copyrighted text.",
      },
      suggestedSource: {
        sourceType: "government",
        publisherName: "공식 공공기관",
        title: "호흡기 감염 예방 안내",
        canonicalUrl: "https://example.go.kr/health/respiratory-virus",
        language: "ko",
        trustLevel: "trusted",
        verificationStatus: "pending",
        metadata: {
          providerId: "official-medical-public-source",
          country: "KR",
        },
      },
    };

    expect(candidate.suggestedSource.trustLevel).toBe("trusted");
    expect(candidate.suggestedSource.canonicalUrl).toBe(candidate.canonicalUrl);
    expect(candidate.externalKey.sourceUrl).toBe(candidate.sourceUrl);
  });
});

describe("provider error contract", () => {
  it.each([
    ["RATE_LIMITED", true, 429],
    ["QUOTA_EXCEEDED", false, 403],
  ] as const)("distinguishes %s errors", (code, retryable, httpStatus) => {
    const error: ProviderError = {
      providerId: "youtube-data-api",
      code,
      message: `${code} from provider`,
      retryable,
      httpStatus,
      retryAfterSeconds: retryable ? 60 : undefined,
      occurredAt: "2026-07-15T00:00:00+09:00",
    };

    const result: ProviderResult<NormalizedSourceCandidate> = {
      ok: false,
      providerId: "youtube-data-api",
      error,
    };

    expect(result.error.code).toBe(code);
    expect(result.error.retryable).toBe(retryable);
  });
});

