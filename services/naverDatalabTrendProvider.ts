import type {
  CollectionRequest,
  NormalizedTrendCandidate,
  ProviderError,
  ProviderResult,
} from "../types/content-collection-provider";
import type { JsonValue } from "../types/content-platform";

export const NAVER_DATALAB_PROVIDER_ID = "naver-datalab" as const;
export const NAVER_DATALAB_SEARCH_TREND_ENDPOINT =
  "https://openapi.naver.com/v1/datalab/search" as const;
export const NAVER_DATALAB_HTTP_METHOD = "POST" as const;

export type NaverDatalabTimeUnit = "date" | "week" | "month";
export type NaverDatalabDevice = "pc" | "mo";
export type NaverDatalabGender = "m" | "f";
export type NaverDatalabAge =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11";

export type NaverDatalabKeywordGroup = {
  groupName: string;
  keywords: string[];
};

export type NaverDatalabSearchTrendRequest = {
  startDate: string;
  endDate: string;
  timeUnit: NaverDatalabTimeUnit;
  keywordGroups: NaverDatalabKeywordGroup[];
  device?: NaverDatalabDevice;
  gender?: NaverDatalabGender;
  ages?: NaverDatalabAge[];
};

export type NaverDatalabSearchTrendResponse = {
  startDate: string;
  endDate: string;
  timeUnit: NaverDatalabTimeUnit;
  results: Array<{
    title: string;
    keywords: string[];
    data: Array<{
      period: string;
      ratio: number | string;
    }>;
  }>;
};

export type NaverDatalabErrorResponse = {
  errorCode?: string;
  errorMessage?: string;
  message?: string;
};

export type NaverDatalabRequestMappingResult =
  | {
      ok: true;
      endpoint: typeof NAVER_DATALAB_SEARCH_TREND_ENDPOINT;
      method: typeof NAVER_DATALAB_HTTP_METHOD;
      request: NaverDatalabSearchTrendRequest;
    }
  | {
      ok: false;
      error: ProviderError;
    };

export function mapCollectionRequestToNaverDatalabRequest(
  request: CollectionRequest,
  occurredAt: string = request.requestedAt,
): NaverDatalabRequestMappingResult {
  if (request.providerId !== NAVER_DATALAB_PROVIDER_ID) {
    return {
      ok: false,
      error: createNaverProviderError({
        code: "UNSUPPORTED_CAPABILITY",
        message: `Unsupported provider for Naver DataLab adapter: ${request.providerId}.`,
        retryable: false,
        occurredAt,
      }),
    };
  }

  if (!request.window) {
    return {
      ok: false,
      error: createNaverProviderError({
        code: "INVALID_REQUEST",
        message: "Naver DataLab request requires a collection window.",
        retryable: false,
        occurredAt,
      }),
    };
  }

  if (request.window.timeUnit === "hour") {
    return {
      ok: false,
      error: createNaverProviderError({
        code: "UNSUPPORTED_CAPABILITY",
        message: "Naver DataLab supports date, week, and month timeUnit only.",
        retryable: false,
        occurredAt,
      }),
    };
  }

  const keywordGroups = getKeywordGroups(request);
  if (!keywordGroups.ok) {
    return {
      ok: false,
      error: createNaverProviderError({
        code: "INVALID_REQUEST",
        message: keywordGroups.reason,
        retryable: false,
        occurredAt,
      }),
    };
  }

  const optionalFilters = getOptionalFilters(request.providerOptions);
  if (!optionalFilters.ok) {
    return {
      ok: false,
      error: createNaverProviderError({
        code: "INVALID_REQUEST",
        message: optionalFilters.reason,
        retryable: false,
        occurredAt,
      }),
    };
  }

  return {
    ok: true,
    endpoint: NAVER_DATALAB_SEARCH_TREND_ENDPOINT,
    method: NAVER_DATALAB_HTTP_METHOD,
    request: compactUndefined({
      startDate: request.window.startDate,
      endDate: request.window.endDate,
      timeUnit: request.window.timeUnit,
      keywordGroups: keywordGroups.value,
      ...optionalFilters.value,
    }) as NaverDatalabSearchTrendRequest,
  };
}

export function mapNaverDatalabResponseToTrendCandidates({
  request,
  response,
  siteId,
  locale = "ko-KR",
  country = "KR",
  collectedAt,
}: {
  request: NaverDatalabSearchTrendRequest;
  response: NaverDatalabSearchTrendResponse;
  siteId: string;
  locale?: string;
  country?: string;
  collectedAt: string;
}): ProviderResult<NormalizedTrendCandidate> {
  if (!isValidNaverDatalabResponse(response)) {
    return {
      ok: false,
      providerId: NAVER_DATALAB_PROVIDER_ID,
      error: createNaverProviderError({
        code: "PARSING_FAILED",
        message: "Malformed Naver DataLab response.",
        retryable: false,
        occurredAt: collectedAt,
        rawPayload: response as unknown as JsonValue,
      }),
    };
  }

  return {
    ok: true,
    providerId: NAVER_DATALAB_PROVIDER_ID,
    collectedAt,
    data: response.results.map((result) => {
      const normalizedData = result.data.map((entry) => ({
        period: entry.period,
        ratio: Number(entry.ratio),
      }));
      const latest = normalizedData[normalizedData.length - 1];
      const previous = normalizedData[normalizedData.length - 2];
      const score = latest?.ratio ?? 0;

      return {
        providerId: NAVER_DATALAB_PROVIDER_ID,
        siteId,
        externalKey: {
          providerId: NAVER_DATALAB_PROVIDER_ID,
          externalId: buildNaverDatalabExternalId({
            siteId,
            locale,
            country,
            title: result.title,
            keywords: result.keywords,
            request,
          }),
        },
        label: result.title,
        normalizedKeyword: result.title,
        relatedKeywords: result.keywords,
        locale,
        country,
        window: {
          startDate: response.startDate,
          endDate: response.endDate,
          timeUnit: response.timeUnit,
        },
        collectedAt,
        score,
        scoreUnit: "relative_interest",
        changeRate: calculateChangeRate(previous?.ratio, latest?.ratio),
        rawMetadata: {
          preserved: true,
          rawPayload: {
            request,
            responseResult: {
              title: result.title,
              keywords: result.keywords,
              data: normalizedData,
            },
          },
        },
        suggestedTopic: {
          name: result.title,
          slug: slugifyKoreanSafe(result.title),
          topicType: "search_trend",
          keywords: result.keywords,
          trendScore: score,
        },
      };
    }),
    rawMetadata: {
      preserved: true,
      rawPayload: response as unknown as JsonValue,
    },
  };
}

export function mapNaverDatalabErrorToProviderError({
  httpStatus,
  response,
  occurredAt,
}: {
  httpStatus?: number;
  response?: NaverDatalabErrorResponse;
  occurredAt: string;
}): ProviderError {
  const message = response?.errorMessage ?? response?.message ?? `Naver DataLab error${httpStatus ? ` ${httpStatus}` : ""}.`;
  const quotaLikeMessage = /quota|limit|한도/i.test(message);

  if (quotaLikeMessage) {
    return createNaverProviderError({
      code: "QUOTA_EXCEEDED",
      message,
      retryable: false,
      httpStatus,
      occurredAt,
      rawPayload: response as JsonValue | undefined,
    });
  }

  if (httpStatus === 429) {
    return createNaverProviderError({
      code: "RATE_LIMITED",
      message,
      retryable: true,
      httpStatus,
      occurredAt,
      rawPayload: response as JsonValue | undefined,
    });
  }

  if (httpStatus === 403) {
    return createNaverProviderError({
      code: "AUTHENTICATION_FAILED",
      message,
      retryable: false,
      httpStatus,
      occurredAt,
      rawPayload: response as JsonValue | undefined,
    });
  }

  if (httpStatus === 400) {
    return createNaverProviderError({
      code: "INVALID_REQUEST",
      message,
      retryable: false,
      httpStatus,
      occurredAt,
      rawPayload: response as JsonValue | undefined,
    });
  }

  if (httpStatus !== undefined && httpStatus >= 500) {
    return createNaverProviderError({
      code: "PROVIDER_UNAVAILABLE",
      message,
      retryable: true,
      httpStatus,
      occurredAt,
      rawPayload: response as JsonValue | undefined,
    });
  }

  return createNaverProviderError({
    code: "UNKNOWN_PROVIDER_ERROR",
    message,
    retryable: false,
    httpStatus,
    occurredAt,
    rawPayload: response as JsonValue | undefined,
  });
}

export function buildNaverDatalabExternalId({
  siteId,
  locale,
  country,
  title,
  keywords,
  request,
}: {
  siteId: string;
  locale: string;
  country: string;
  title: string;
  keywords: string[];
  request: NaverDatalabSearchTrendRequest;
}): string {
  return [
    NAVER_DATALAB_PROVIDER_ID,
    siteId,
    locale,
    country,
    request.startDate,
    request.endDate,
    request.timeUnit,
    request.device ?? "all-device",
    request.gender ?? "all-gender",
    request.ages?.join("+") ?? "all-ages",
    title,
    ...keywords,
  ]
    .join(":")
    .toLowerCase();
}

function getKeywordGroups(
  request: CollectionRequest,
): { ok: true; value: NaverDatalabKeywordGroup[] } | { ok: false; reason: string } {
  const configuredKeywordGroups = request.providerOptions?.keywordGroups;

  if (configuredKeywordGroups !== undefined) {
    const parsed = parseKeywordGroups(configuredKeywordGroups);
    if (!parsed.ok) {
      return parsed;
    }

    return validateKeywordGroups(parsed.value);
  }

  if (!request.seedKeywords || request.seedKeywords.length === 0) {
    return { ok: false, reason: "Naver DataLab requires keywordGroups or seedKeywords." };
  }

  return validateKeywordGroups([
    {
      groupName: request.seedKeywords[0] ?? "seed",
      keywords: request.seedKeywords,
    },
  ]);
}

function parseKeywordGroups(
  value: JsonValue,
): { ok: true; value: NaverDatalabKeywordGroup[] } | { ok: false; reason: string } {
  if (!Array.isArray(value)) {
    return { ok: false, reason: "providerOptions.keywordGroups must be an array." };
  }

  const groups: NaverDatalabKeywordGroup[] = [];
  for (const item of value) {
    if (!item || Array.isArray(item) || typeof item !== "object") {
      return { ok: false, reason: "Each keyword group must be an object." };
    }

    const groupName = item.groupName;
    const keywords = item.keywords;
    if (typeof groupName !== "string" || !Array.isArray(keywords) || !keywords.every((keyword) => typeof keyword === "string")) {
      return { ok: false, reason: "Each keyword group needs string groupName and string[] keywords." };
    }

    groups.push({ groupName, keywords });
  }

  return { ok: true, value: groups };
}

function validateKeywordGroups(
  groups: NaverDatalabKeywordGroup[],
): { ok: true; value: NaverDatalabKeywordGroup[] } | { ok: false; reason: string } {
  if (groups.length === 0) {
    return { ok: false, reason: "At least one Naver DataLab keyword group is required." };
  }

  if (groups.length > 5) {
    return { ok: false, reason: "Naver DataLab supports up to 5 keyword groups." };
  }

  for (const group of groups) {
    if (!group.groupName.trim()) {
      return { ok: false, reason: "Naver DataLab keyword groupName is required." };
    }
    if (group.keywords.length === 0 || group.keywords.length > 20) {
      return { ok: false, reason: "Naver DataLab supports 1 to 20 keywords per group." };
    }
    if (group.keywords.some((keyword) => !keyword.trim())) {
      return { ok: false, reason: "Naver DataLab keywords cannot be blank." };
    }
  }

  return { ok: true, value: groups };
}

function getOptionalFilters(
  providerOptions: CollectionRequest["providerOptions"],
): { ok: true; value: Partial<NaverDatalabSearchTrendRequest> } | { ok: false; reason: string } {
  if (!providerOptions) {
    return { ok: true, value: {} };
  }

  const { device, gender, ages } = providerOptions;
  const filters: Partial<NaverDatalabSearchTrendRequest> = {};

  if (device !== undefined) {
    if (device !== "pc" && device !== "mo") {
      return { ok: false, reason: "Naver DataLab device must be pc or mo." };
    }
    filters.device = device;
  }

  if (gender !== undefined) {
    if (gender !== "m" && gender !== "f") {
      return { ok: false, reason: "Naver DataLab gender must be m or f." };
    }
    filters.gender = gender;
  }

  if (ages !== undefined) {
    if (!Array.isArray(ages) || !ages.every(isNaverAge)) {
      return { ok: false, reason: "Naver DataLab ages must be an array of supported age codes." };
    }
    filters.ages = ages;
  }

  return { ok: true, value: filters };
}

function isNaverAge(value: JsonValue): value is NaverDatalabAge {
  return (
    typeof value === "string" &&
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"].includes(value)
  );
}

function isValidNaverDatalabResponse(value: NaverDatalabSearchTrendResponse): boolean {
  return (
    typeof value.startDate === "string" &&
    typeof value.endDate === "string" &&
    (value.timeUnit === "date" || value.timeUnit === "week" || value.timeUnit === "month") &&
    Array.isArray(value.results) &&
    value.results.every(
      (result) =>
        typeof result.title === "string" &&
        Array.isArray(result.keywords) &&
        result.keywords.every((keyword) => typeof keyword === "string") &&
        Array.isArray(result.data) &&
        result.data.every(
          (entry) =>
            typeof entry.period === "string" &&
            (typeof entry.ratio === "number" || typeof entry.ratio === "string") &&
            Number.isFinite(Number(entry.ratio)),
        ),
    )
  );
}

function createNaverProviderError({
  code,
  message,
  retryable,
  occurredAt,
  httpStatus,
  rawPayload,
}: {
  code: ProviderError["code"];
  message: string;
  retryable: boolean;
  occurredAt: string;
  httpStatus?: number;
  rawPayload?: JsonValue;
}): ProviderError {
  return {
    providerId: NAVER_DATALAB_PROVIDER_ID,
    code,
    message,
    retryable,
    occurredAt,
    httpStatus,
    rawMetadata: rawPayload
      ? {
          preserved: true,
          rawPayload,
        }
      : undefined,
  };
}

function calculateChangeRate(previous?: number, latest?: number): number | undefined {
  if (previous === undefined || latest === undefined || previous === 0) {
    return undefined;
  }

  return (latest - previous) / previous;
}

function slugifyKoreanSafe(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function compactUndefined<T extends Record<string, unknown>>(record: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter((entry) => entry[1] !== undefined));
}
