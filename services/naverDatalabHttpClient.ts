import type { ProviderError } from "../types/content-collection-provider";
import type { JsonValue } from "../types/content-platform";
import {
  NAVER_DATALAB_HTTP_METHOD,
  NAVER_DATALAB_PROVIDER_ID,
  NAVER_DATALAB_SEARCH_TREND_ENDPOINT,
  mapNaverDatalabErrorToProviderError,
  type NaverDatalabErrorResponse,
  type NaverDatalabSearchTrendRequest,
  type NaverDatalabSearchTrendResponse,
} from "./naverDatalabTrendProvider";

export type NaverDatalabCredentials = {
  clientId: string;
  clientSecret: string;
};

export type NaverDatalabFetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

export type NaverDatalabFetch = (
  input: string,
  init: {
    method: typeof NAVER_DATALAB_HTTP_METHOD;
    headers: Record<string, string>;
    body: string;
  },
) => Promise<NaverDatalabFetchResponse>;

export type ExecuteNaverDatalabSearchTrendInput = {
  credentials: NaverDatalabCredentials;
  request: NaverDatalabSearchTrendRequest;
  occurredAt: string;
  fetchImpl?: NaverDatalabFetch;
};

export type ExecuteNaverDatalabSearchTrendResult =
  | {
      ok: true;
      providerId: typeof NAVER_DATALAB_PROVIDER_ID;
      httpStatus: number;
      response: NaverDatalabSearchTrendResponse;
    }
  | {
      ok: false;
      providerId: typeof NAVER_DATALAB_PROVIDER_ID;
      error: ProviderError;
    };

export async function executeNaverDatalabSearchTrend(
  input: ExecuteNaverDatalabSearchTrendInput,
): Promise<ExecuteNaverDatalabSearchTrendResult> {
  const credentialError = validateCredentials(input.credentials, input.occurredAt);
  if (credentialError) {
    return {
      ok: false,
      providerId: NAVER_DATALAB_PROVIDER_ID,
      error: credentialError,
    };
  }

  const fetchImpl = input.fetchImpl ?? getGlobalFetch();
  if (!fetchImpl) {
    return {
      ok: false,
      providerId: NAVER_DATALAB_PROVIDER_ID,
      error: {
        providerId: NAVER_DATALAB_PROVIDER_ID,
        code: "PROVIDER_UNAVAILABLE",
        message: "Fetch implementation is not available for Naver DataLab HTTP client.",
        retryable: false,
        occurredAt: input.occurredAt,
      },
    };
  }

  let response: NaverDatalabFetchResponse;
  try {
    response = await fetchImpl(NAVER_DATALAB_SEARCH_TREND_ENDPOINT, {
      method: NAVER_DATALAB_HTTP_METHOD,
      headers: {
        "Content-Type": "application/json",
        "X-Naver-Client-Id": input.credentials.clientId,
        "X-Naver-Client-Secret": input.credentials.clientSecret,
      },
      body: JSON.stringify(input.request),
    });
  } catch (error) {
    return {
      ok: false,
      providerId: NAVER_DATALAB_PROVIDER_ID,
      error: {
        providerId: NAVER_DATALAB_PROVIDER_ID,
        code: "PROVIDER_UNAVAILABLE",
        message: error instanceof Error ? error.message : "Naver DataLab request failed before receiving a response.",
        retryable: true,
        occurredAt: input.occurredAt,
      },
    };
  }

  const payload = await readJsonPayload(response);
  if (!response.ok) {
    return {
      ok: false,
      providerId: NAVER_DATALAB_PROVIDER_ID,
      error: mapNaverDatalabErrorToProviderError({
        httpStatus: response.status,
        response: toNaverErrorResponse(payload),
        occurredAt: input.occurredAt,
      }),
    };
  }

  return {
    ok: true,
    providerId: NAVER_DATALAB_PROVIDER_ID,
    httpStatus: response.status,
    response: payload as NaverDatalabSearchTrendResponse,
  };
}

function validateCredentials(
  credentials: NaverDatalabCredentials,
  occurredAt: string,
): ProviderError | undefined {
  if (!credentials.clientId.trim() || !credentials.clientSecret.trim()) {
    return {
      providerId: NAVER_DATALAB_PROVIDER_ID,
      code: "AUTHENTICATION_FAILED",
      message: "Naver DataLab client id and client secret are required.",
      retryable: false,
      occurredAt,
    };
  }

  return undefined;
}

function getGlobalFetch(): NaverDatalabFetch | undefined {
  if (typeof fetch !== "function") {
    return undefined;
  }

  return async (input, init) => {
    const response = await fetch(input, init);

    return {
      ok: response.ok,
      status: response.status,
      json: () => response.json(),
    };
  };
}

async function readJsonPayload(response: NaverDatalabFetchResponse): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function toNaverErrorResponse(payload: unknown): NaverDatalabErrorResponse | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }

  const record = payload as Record<string, JsonValue>;
  return {
    errorCode: typeof record.errorCode === "string" ? record.errorCode : undefined,
    errorMessage: typeof record.errorMessage === "string" ? record.errorMessage : undefined,
    message: typeof record.message === "string" ? record.message : undefined,
  };
}
