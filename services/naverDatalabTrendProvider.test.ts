import { describe, expect, it } from "vitest";

import { mapTrendCandidateToTopicCandidate } from "./contentCollectionMapper";
import {
  NAVER_DATALAB_HTTP_METHOD,
  NAVER_DATALAB_PROVIDER_ID,
  NAVER_DATALAB_SEARCH_TREND_ENDPOINT,
  mapCollectionRequestToNaverDatalabRequest,
  mapNaverDatalabErrorToProviderError,
  mapNaverDatalabResponseToTrendCandidates,
  type NaverDatalabSearchTrendRequest,
  type NaverDatalabSearchTrendResponse,
} from "./naverDatalabTrendProvider";
import type { CollectionRequest } from "../types/content-collection-provider";

const requestedAt = "2026-07-15T00:00:00Z";
const collectedAt = "2026-07-15T00:01:00Z";
const siteId = "site-health-knowhow";

function createBaseCollectionRequest(
  overrides: Partial<CollectionRequest> = {},
): CollectionRequest {
  return {
    providerId: NAVER_DATALAB_PROVIDER_ID,
    siteId,
    locale: "ko-KR",
    country: "KR",
    collectedBy: "n8n",
    requestedAt,
    window: {
      startDate: "2026-07-01",
      endDate: "2026-07-14",
      timeUnit: "date",
    },
    seedKeywords: ["감기", "기침"],
    ...overrides,
  };
}

function createNaverRequest(
  overrides: Partial<NaverDatalabSearchTrendRequest> = {},
): NaverDatalabSearchTrendRequest {
  return {
    startDate: "2026-07-01",
    endDate: "2026-07-14",
    timeUnit: "date",
    keywordGroups: [
      {
        groupName: "감기",
        keywords: ["감기", "기침"],
      },
    ],
    ...overrides,
  };
}

function createNaverResponse(
  overrides: Partial<NaverDatalabSearchTrendResponse> = {},
): NaverDatalabSearchTrendResponse {
  return {
    startDate: "2026-07-01",
    endDate: "2026-07-14",
    timeUnit: "date",
    results: [
      {
        title: "감기",
        keywords: ["감기", "기침"],
        data: [
          { period: "2026-07-01", ratio: 10 },
          { period: "2026-07-02", ratio: 100 },
        ],
      },
    ],
    ...overrides,
  };
}

describe("Naver DataLab TrendProvider adapter", () => {
  describe("request mapping", () => {
    it("maps a single keyword group request to the official Naver DataLab request shape", () => {
      const result = mapCollectionRequestToNaverDatalabRequest(
        createBaseCollectionRequest({
          providerOptions: {
            keywordGroups: [{ groupName: "감기", keywords: ["감기", "목감기"] }],
          },
        }),
      );

      expect(result).toEqual({
        ok: true,
        endpoint: NAVER_DATALAB_SEARCH_TREND_ENDPOINT,
        method: NAVER_DATALAB_HTTP_METHOD,
        request: {
          startDate: "2026-07-01",
          endDate: "2026-07-14",
          timeUnit: "date",
          keywordGroups: [{ groupName: "감기", keywords: ["감기", "목감기"] }],
        },
      });
    });

    it("maps multiple keyword groups without optional filters", () => {
      const result = mapCollectionRequestToNaverDatalabRequest(
        createBaseCollectionRequest({
          providerOptions: {
            keywordGroups: [
              { groupName: "감기", keywords: ["감기"] },
              { groupName: "독감", keywords: ["독감", "인플루엔자"] },
            ],
          },
        }),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error("request mapping unexpectedly failed");
      }
      expect(result.request.keywordGroups).toHaveLength(2);
      expect(result.request).not.toHaveProperty("device");
      expect(result.request).not.toHaveProperty("gender");
      expect(result.request).not.toHaveProperty("ages");
    });

    it("maps optional device, gender, and ages filters", () => {
      const result = mapCollectionRequestToNaverDatalabRequest(
        createBaseCollectionRequest({
          providerOptions: {
            keywordGroups: [{ groupName: "다이어트", keywords: ["다이어트"] }],
            device: "mo",
            gender: "f",
            ages: ["3", "4", "5"],
          },
        }),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error("request mapping unexpectedly failed");
      }
      expect(result.request.device).toBe("mo");
      expect(result.request.gender).toBe("f");
      expect(result.request.ages).toEqual(["3", "4", "5"]);
    });

    it.each([
      ["date", "date"],
      ["week", "week"],
      ["month", "month"],
    ] as const)("maps %s timeUnit", (_, timeUnit) => {
      const result = mapCollectionRequestToNaverDatalabRequest(
        createBaseCollectionRequest({
          window: {
            startDate: "2026-07-01",
            endDate: "2026-07-14",
            timeUnit,
          },
        }),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error("request mapping unexpectedly failed");
      }
      expect(result.request.timeUnit).toBe(timeUnit);
    });

    it("rejects hour timeUnit before any API call boundary", () => {
      const result = mapCollectionRequestToNaverDatalabRequest(
        createBaseCollectionRequest({
          window: {
            startDate: "2026-07-01",
            endDate: "2026-07-14",
            timeUnit: "hour",
          },
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error("hour request unexpectedly succeeded");
      }
      expect(result.error.code).toBe("UNSUPPORTED_CAPABILITY");
      expect(result.error.retryable).toBe(false);
    });
  });

  describe("response normalization", () => {
    it("normalizes ratio 0 and 100 into trendScore without changing the provider scale", () => {
      const request = createNaverRequest();
      const response = createNaverResponse({
        results: [
          {
            title: "감기",
            keywords: ["감기"],
            data: [{ period: "2026-07-01", ratio: 0 }],
          },
          {
            title: "독감",
            keywords: ["독감"],
            data: [{ period: "2026-07-01", ratio: 100 }],
          },
        ],
      });

      const result = mapNaverDatalabResponseToTrendCandidates({
        request,
        response,
        siteId,
        collectedAt,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error("response normalization unexpectedly failed");
      }
      expect(result.data.map((candidate) => candidate.score)).toEqual([0, 100]);
      expect(result.data.map((candidate) => candidate.suggestedTopic.trendScore)).toEqual([0, 100]);
      expect(result.data.every((candidate) => candidate.scoreUnit === "relative_interest")).toBe(true);
    });

    it("normalizes multiple period data and preserves provider raw metadata separately", () => {
      const request = createNaverRequest({ timeUnit: "week" });
      const response = createNaverResponse({
        timeUnit: "week",
        results: [
          {
            title: "수면",
            keywords: ["수면", "불면증"],
            data: [
              { period: "2026-06-29", ratio: "25" },
              { period: "2026-07-06", ratio: "50" },
            ],
          },
        ],
      });

      const result = mapNaverDatalabResponseToTrendCandidates({
        request,
        response,
        siteId,
        collectedAt,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error("response normalization unexpectedly failed");
      }
      expect(result.data[0]?.score).toBe(50);
      expect(result.data[0]?.changeRate).toBe(1);
      expect(result.data[0]?.window.timeUnit).toBe("week");
      expect(result.data[0]?.rawMetadata.preserved).toBe(true);
      expect(result.data[0]?.rawMetadata.rawPayload).toMatchObject({
        responseResult: {
          title: "수면",
          data: [
            { period: "2026-06-29", ratio: 25 },
            { period: "2026-07-06", ratio: 50 },
          ],
        },
      });
    });

    it("uses stable externalId and downstream duplicateKey for the same response", () => {
      const request = createNaverRequest({ timeUnit: "month" });
      const response = createNaverResponse({ timeUnit: "month" });

      const first = mapNaverDatalabResponseToTrendCandidates({
        request,
        response,
        siteId,
        collectedAt,
      });
      const second = mapNaverDatalabResponseToTrendCandidates({
        request,
        response,
        siteId,
        collectedAt: "2026-07-15T00:02:00Z",
      });

      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      if (!first.ok || !second.ok) {
        throw new Error("response normalization unexpectedly failed");
      }

      expect(first.data[0]?.externalKey.externalId).toBe(second.data[0]?.externalKey.externalId);
      expect(mapTrendCandidateToTopicCandidate(first.data[0]!).provenance.duplicateKey).toBe(
        mapTrendCandidateToTopicCandidate(second.data[0]!).provenance.duplicateKey,
      );
    });

    it("returns a provider parsing error for malformed response bodies", () => {
      const result = mapNaverDatalabResponseToTrendCandidates({
        request: createNaverRequest(),
        response: {
          startDate: "2026-07-01",
          endDate: "2026-07-14",
          timeUnit: "date",
          results: [
            {
              title: "감기",
              keywords: ["감기"],
              data: [{ period: "2026-07-01", ratio: Number.NaN }],
            },
          ],
        },
        siteId,
        collectedAt,
      });

      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error("malformed response unexpectedly succeeded");
      }
      expect(result.error.code).toBe("PARSING_FAILED");
      expect(result.error.rawMetadata?.preserved).toBe(true);
    });
  });

  describe("provider error mapping", () => {
    it("maps rate limit responses separately from quota exhaustion", () => {
      const error = mapNaverDatalabErrorToProviderError({
        httpStatus: 429,
        response: { errorMessage: "Too many requests" },
        occurredAt: collectedAt,
      });

      expect(error.code).toBe("RATE_LIMITED");
      expect(error.retryable).toBe(true);
      expect(error.httpStatus).toBe(429);
    });

    it("maps documented quota risk by message while preserving raw error metadata", () => {
      const error = mapNaverDatalabErrorToProviderError({
        httpStatus: 403,
        response: { errorCode: "QUOTA", errorMessage: "Daily quota limit exceeded" },
        occurredAt: collectedAt,
      });

      expect(error.code).toBe("QUOTA_EXCEEDED");
      expect(error.retryable).toBe(false);
      expect(error.rawMetadata?.rawPayload).toEqual({
        errorCode: "QUOTA",
        errorMessage: "Daily quota limit exceeded",
      });
    });

    it("maps provider request and availability errors", () => {
      expect(
        mapNaverDatalabErrorToProviderError({
          httpStatus: 400,
          response: { errorMessage: "Bad request" },
          occurredAt: collectedAt,
        }).code,
      ).toBe("INVALID_REQUEST");

      expect(
        mapNaverDatalabErrorToProviderError({
          httpStatus: 500,
          response: { errorMessage: "Internal server error" },
          occurredAt: collectedAt,
        }).code,
      ).toBe("PROVIDER_UNAVAILABLE");
    });
  });
});
