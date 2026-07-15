import { describe, expect, it } from "vitest";
import type { MappedSourceCandidate, MappedTopicCandidate } from "./contentCollectionMapper";
import {
  validateSourceCandidateForStorage,
  validateTopicCandidateForStorage,
} from "./contentCollectionPolicy";

const validTopicCandidate: MappedTopicCandidate = {
  kind: "topic",
  domain: {
    siteId: "site-health-knowhow",
    name: "땀띠",
    slug: "heat-rash",
    topicType: "search_trend",
    keywords: ["땀띠", "여름 피부질환"],
    status: "candidate",
    trendScore: 92.1,
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
    window: {
      startDate: "2026-07-01",
      endDate: "2026-07-15",
      timeUnit: "date",
    },
    rawMetadata: {
      preserved: true,
      rawPayload: {
        ratio: 92.1,
      },
    },
  },
};

const validYoutubeSourceCandidate: MappedSourceCandidate = {
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
};

const validOfficialSourceCandidate: MappedSourceCandidate = {
  kind: "source",
  siteId: "site-health-knowhow",
  domain: {
    sourceType: "government",
    publisherName: "공식 공공기관",
    title: "온열질환 예방수칙",
    canonicalUrl: "https://example.go.kr/health/summer-heat-illness",
    retrievedAt: "2026-07-15T09:00:00+09:00",
    language: "ko",
    trustLevel: "trusted",
    verificationStatus: "pending",
  },
  provenance: {
    providerId: "official-medical-public-source",
    externalKey: {
      providerId: "official-medical-public-source",
      externalId: "kdca:summer-heat-illness",
      sourceUrl: "https://example.go.kr/health/summer-heat-illness",
    },
    duplicateKey: "official-medical-public-source:kdca:summer-heat-illness",
    locale: "ko-KR",
    country: "KR",
    collectedAt: "2026-07-15T09:00:00+09:00",
    rawMetadata: {
      preserved: true,
      rawPayload: {
        agency: "official",
      },
    },
  },
};

describe("collection candidate policy", () => {
  it("accepts a valid Naver DataLab Topic candidate", () => {
    const result = validateTopicCandidateForStorage(validTopicCandidate);

    expect(result.valid).toBe(true);
    expect(result.invalid).toEqual([]);
    expect(result.warning).toEqual([]);
  });

  it("warns on out-of-range trendScore but keeps the Topic candidate reviewable", () => {
    const result = validateTopicCandidateForStorage({
      ...validTopicCandidate,
      domain: {
        ...validTopicCandidate.domain,
        trendScore: 121,
      },
    });

    expect(result.valid).toBe(true);
    expect(result.warning.map((issue) => issue.code)).toContain("TREND_SCORE_OUT_OF_RANGE");
  });

  it("rejects invalid Topic fields before storage", () => {
    const result = validateTopicCandidateForStorage({
      ...validTopicCandidate,
      domain: {
        ...validTopicCandidate.domain,
        name: "",
        slug: "",
        keywords: [],
        trendScore: Number.NaN,
      },
      provenance: {
        ...validTopicCandidate.provenance,
        duplicateKey: "",
        externalKey: {
          providerId: "naver-datalab",
        },
        collectedAt: "not-a-date",
      },
    });

    expect(result.valid).toBe(false);
    expect(result.invalid.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "MISSING_DUPLICATE_KEY",
        "MISSING_EXTERNAL_IDENTIFIER",
        "INVALID_COLLECTED_AT",
        "TOPIC_NAME_REQUIRED",
        "TOPIC_IDENTIFIER_REQUIRED",
        "INVALID_TREND_SCORE",
      ]),
    );
  });

  it("warns when locale or country is missing", () => {
    const result = validateTopicCandidateForStorage({
      ...validTopicCandidate,
      provenance: {
        ...validTopicCandidate.provenance,
        locale: undefined,
        country: "",
      },
    });

    expect(result.valid).toBe(true);
    expect(result.warning.map((issue) => issue.code)).toContain("LOCALE_OR_COUNTRY_MISSING");
  });

  it("accepts a YouTube source only as review_required", () => {
    const result = validateSourceCandidateForStorage(validYoutubeSourceCandidate);

    expect(result.valid).toBe(true);
    expect(result.invalid).toEqual([]);
  });

  it("rejects a YouTube source incorrectly marked trusted", () => {
    const result = validateSourceCandidateForStorage({
      ...validYoutubeSourceCandidate,
      domain: {
        ...validYoutubeSourceCandidate.domain,
        trustLevel: "trusted",
      },
    });

    expect(result.valid).toBe(false);
    expect(result.invalid.map((issue) => issue.code)).toContain("YOUTUBE_SOURCE_TRUST_POLICY_VIOLATION");
  });

  it("accepts an official medical/public source with trusted trustLevel and pending verification", () => {
    const result = validateSourceCandidateForStorage(validOfficialSourceCandidate);

    expect(result.valid).toBe(true);
    expect(result.invalid).toEqual([]);
  });

  it("rejects an official medical/public source that violates trusted initial policy", () => {
    const result = validateSourceCandidateForStorage({
      ...validOfficialSourceCandidate,
      domain: {
        ...validOfficialSourceCandidate.domain,
        trustLevel: "review_required",
      },
    });

    expect(result.valid).toBe(false);
    expect(result.invalid.map((issue) => issue.code)).toContain(
      "OFFICIAL_SOURCE_TRUST_POLICY_VIOLATION",
    );
  });

  it("rejects Naver DataLab data if it is mapped as a Source candidate", () => {
    const result = validateSourceCandidateForStorage({
      ...validYoutubeSourceCandidate,
      provenance: {
        ...validYoutubeSourceCandidate.provenance,
        providerId: "naver-datalab",
        externalKey: {
          providerId: "naver-datalab",
          externalId: "naver:wrong-source",
          sourceUrl: "https://search.naver.com/search.naver?query=wrong-source",
        },
        duplicateKey: "naver-datalab:naver:wrong-source",
      },
    });

    expect(result.valid).toBe(false);
    expect(result.invalid.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["PROVIDER_CAPABILITY_MISMATCH", "NAVER_SOURCE_FORBIDDEN"]),
    );
  });

  it("rejects invalid Source URL and missing title", () => {
    const result = validateSourceCandidateForStorage({
      ...validYoutubeSourceCandidate,
      domain: {
        ...validYoutubeSourceCandidate.domain,
        title: "",
        canonicalUrl: "not-a-url",
      },
    });

    expect(result.valid).toBe(false);
    expect(result.invalid.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["SOURCE_TITLE_REQUIRED", "INVALID_SOURCE_URL"]),
    );
  });

  it("warns when contentHash fallback is too short", () => {
    const result = validateSourceCandidateForStorage({
      ...validYoutubeSourceCandidate,
      domain: {
        ...validYoutubeSourceCandidate.domain,
        contentHash: "short",
      },
      provenance: {
        ...validYoutubeSourceCandidate.provenance,
        externalKey: {
          providerId: "youtube-data-api",
          contentHash: "short",
        },
      },
    });

    expect(result.valid).toBe(true);
    expect(result.warning.map((issue) => issue.code)).toContain("CONTENT_HASH_TOO_SHORT");
  });

  it("rejects raw metadata attempting to overlap normalized domain fields", () => {
    const result = validateSourceCandidateForStorage({
      ...validYoutubeSourceCandidate,
      provenance: {
        ...validYoutubeSourceCandidate.provenance,
        rawMetadata: {
          preserved: true,
          rawPayload: {
            title: "raw title must not overwrite normalized title",
          },
        },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.invalid.map((issue) => issue.code)).toContain("RAW_METADATA_DOMAIN_OVERLAP");
  });
});

