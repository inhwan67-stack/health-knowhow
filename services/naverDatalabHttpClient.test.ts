import { describe, expect, it } from "vitest";

import {
  NAVER_DATALAB_HTTP_METHOD,
  NAVER_DATALAB_SEARCH_TREND_ENDPOINT,
  type NaverDatalabSearchTrendRequest,
} from "./naverDatalabTrendProvider";
import {
  executeNaverDatalabSearchTrend,
  type NaverDatalabFetch,
} from "./naverDatalabHttpClient";

const occurredAt = "2026-07-15T09:00:00+09:00";
const credentials = {
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
};

const request: NaverDatalabSearchTrendRequest = {
  startDate: "2026-07-01",
  endDate: "2026-07-14",
  timeUnit: "date",
  keywordGroups: [
    {
      groupName: "혈당 관리",
      keywords: ["혈당 스파이크", "공복 혈당", "식후 혈당"],
    },
  ],
};

describe("Naver DataLab HTTP client adapter", () => {
  it("executes the official POST request without exposing credentials in the result", async () => {
    const calls: Array<Parameters<NaverDatalabFetch>> = [];
    const fetchImpl: NaverDatalabFetch = async (...args) => {
      calls.push(args);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          startDate: "2026-07-01",
          endDate: "2026-07-14",
          timeUnit: "date",
          results: [
            {
              title: "혈당 관리",
              keywords: ["혈당 스파이크", "공복 혈당", "식후 혈당"],
              data: [{ period: "2026-07-01", ratio: 100 }],
            },
          ],
        }),
      };
    };

    const result = await executeNaverDatalabSearchTrend({
      credentials,
      request,
      occurredAt,
      fetchImpl,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.[0]).toBe(NAVER_DATALAB_SEARCH_TREND_ENDPOINT);
    expect(calls[0]?.[1]).toMatchObject({
      method: NAVER_DATALAB_HTTP_METHOD,
      headers: {
        "Content-Type": "application/json",
        "X-Naver-Client-Id": credentials.clientId,
        "X-Naver-Client-Secret": credentials.clientSecret,
      },
      body: JSON.stringify(request),
    });
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toContain(credentials.clientId);
    expect(JSON.stringify(result)).not.toContain(credentials.clientSecret);
  });

  it("maps non-OK responses to provider errors without exposing credentials", async () => {
    const result = await executeNaverDatalabSearchTrend({
      credentials,
      request,
      occurredAt,
      fetchImpl: async () => ({
        ok: false,
        status: 429,
        json: async () => ({ errorMessage: "Too many requests" }),
      }),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("request unexpectedly succeeded");
    }
    expect(result.error.code).toBe("RATE_LIMITED");
    expect(result.error.httpStatus).toBe(429);
    expect(JSON.stringify(result)).not.toContain(credentials.clientId);
    expect(JSON.stringify(result)).not.toContain(credentials.clientSecret);
  });

  it("rejects missing credentials before calling fetch", async () => {
    let called = false;

    const result = await executeNaverDatalabSearchTrend({
      credentials: {
        clientId: "",
        clientSecret: "",
      },
      request,
      occurredAt,
      fetchImpl: async () => {
        called = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        };
      },
    });

    expect(called).toBe(false);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("request unexpectedly succeeded");
    }
    expect(result.error.code).toBe("AUTHENTICATION_FAILED");
  });

  it("maps network failures to retryable provider unavailable errors", async () => {
    const result = await executeNaverDatalabSearchTrend({
      credentials,
      request,
      occurredAt,
      fetchImpl: async () => {
        throw new Error("network unavailable");
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("request unexpectedly succeeded");
    }
    expect(result.error.code).toBe("PROVIDER_UNAVAILABLE");
    expect(result.error.retryable).toBe(true);
  });
});
