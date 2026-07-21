import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPublishContentRequestFingerprint,
  validatePublishContentRequest,
  type ValidatedPublishContentRequest,
} from "./publishContentApiPolicy";

const adminMock = vi.hoisted(() => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => adminMock);
vi.mock("../lib/supabase/admin", () => adminMock);

const validBody = {
  queueId: "2",
  publicationId: "5",
  contentId: "13",
  title: "콘텐츠 제목",
  slug: "content-slug",
  publishingPackage: {},
  publishApproved: true,
  publishedBy: "owner",
};

type PublishedContentRow = {
  queue_id: string | null;
  publication_id: string;
  content_id: string;
  title: string;
  slug: string;
  publish_status: string;
  published_at: string;
  request_fingerprint: string;
};

function validated(overrides: Partial<ValidatedPublishContentRequest> = {}) {
  const result = validatePublishContentRequest({ ...validBody, ...overrides });
  if (!result.ok) throw new Error("fixture should be valid");
  return result.value;
}

function publishedRow(
  overrides: Partial<PublishedContentRow> = {},
  fingerprintInput: ValidatedPublishContentRequest = validated(),
): PublishedContentRow {
  return {
    queue_id: "2",
    publication_id: "5",
    content_id: "13",
    title: "肄섑뀗痢??쒕ぉ",
    slug: "content-slug",
    publish_status: "published",
    published_at: "2026-07-21T00:00:00.000Z",
    request_fingerprint: createPublishContentRequestFingerprint(fingerprintInput),
    ...overrides,
  };
}

function createSupabaseMock(options: {
  initialRows?: PublishedContentRow[];
  insertError?: { code?: string };
  publicationIdRowsAfterInsertError?: PublishedContentRow[];
  slugRowsAfterInsertError?: PublishedContentRow[];
}) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({
            data: options.initialRows ?? [],
            error: null,
          }),
        })),
        eq: vi.fn((field: string) => ({
          limit: vi.fn().mockResolvedValue({
            data:
              field === "publication_id"
                ? options.publicationIdRowsAfterInsertError ?? []
                : options.slugRowsAfterInsertError ?? [],
            error: null,
          }),
        })),
      })),
      insert: vi.fn((payload: Record<string, unknown>) => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue(
            options.insertError
              ? { data: null, error: options.insertError }
              : {
                  data: {
                    queue_id: payload.queue_id,
                    publication_id: payload.publication_id,
                    content_id: payload.content_id,
                    title: payload.title,
                    slug: payload.slug,
                    publish_status: payload.publish_status,
                    published_at: "2026-07-21T00:00:00.000Z",
                    request_fingerprint: payload.request_fingerprint,
                  },
                  error: null,
                },
          ),
        })),
      })),
    })),
  };
}

async function postPublishContent(
  body: Record<string, unknown>,
  supabaseMockOptions: Parameters<typeof createSupabaseMock>[0],
) {
  process.env.PUBLISH_API_SECRET = "test-secret";
  adminMock.getSupabaseAdminClient.mockReturnValue(createSupabaseMock(supabaseMockOptions));

  const { POST } = await import("../app/api/publish-content/route");
  const response = await POST(
    new Request("http://localhost/api/publish-content", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-secret",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  );

  return {
    status: response.status,
    body: await response.json(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("validatePublishContentRequest", () => {
  it("accepts a valid publish request", () => {
    expect(validatePublishContentRequest(validBody)).toEqual({
      ok: true,
      value: validBody,
    });
  });

  it.each(["queueId", "publicationId", "contentId"] as const)(
    "rejects a non-numeric %s",
    (fieldName) => {
      const result = validatePublishContentRequest({
        ...validBody,
        [fieldName]: "12a",
      });

      expect(result).toMatchObject({
        ok: false,
        error: { errorCode: "VALIDATION_ERROR" },
      });
    },
  );

  it("rejects an empty title", () => {
    expect(validatePublishContentRequest({ ...validBody, title: " " })).toMatchObject({
      ok: false,
      error: { errorCode: "VALIDATION_ERROR" },
    });
  });

  it.each(["Bad Slug", "../bad", "bad_slug", "-bad", "bad-"])(
    "rejects unsafe slug %s",
    (slug) => {
      expect(validatePublishContentRequest({ ...validBody, slug })).toMatchObject({
        ok: false,
        error: { errorCode: "VALIDATION_ERROR" },
      });
    },
  );

  it("rejects non-object publishingPackage", () => {
    expect(validatePublishContentRequest({ ...validBody, publishingPackage: [] })).toMatchObject({
      ok: false,
      error: { errorCode: "VALIDATION_ERROR" },
    });
  });

  it("rejects unapproved publishing", () => {
    expect(validatePublishContentRequest({ ...validBody, publishApproved: false })).toMatchObject({
      ok: false,
      error: { errorCode: "PUBLISH_NOT_APPROVED" },
    });
  });

  it("creates the same fingerprint when publishingPackage key order changes", () => {
    const first = validated({ publishingPackage: { b: 2, a: { d: 4, c: 3 } } });
    const second = validated({ publishingPackage: { a: { c: 3, d: 4 }, b: 2 } });

    expect(createPublishContentRequestFingerprint(first)).toBe(
      createPublishContentRequestFingerprint(second),
    );
  });
});

describe("POST /api/publish-content idempotency", () => {
  it("replays the same publicationId request when the fingerprint matches", async () => {
    const result = await postPublishContent(validBody, {
      initialRows: [publishedRow()],
    });

    expect(result).toMatchObject({
      status: 200,
      body: { success: true, alreadyPublished: true, publicationId: "5" },
    });
  });

  it.each([
    ["contentId", { contentId: "14" }],
    ["title", { title: "Different title" }],
    ["slug", { slug: "different-slug" }],
    ["publishingPackage", { publishingPackage: { changed: true } }],
  ])("rejects the same publicationId with a different %s", async (_fieldName, override) => {
    const result = await postPublishContent({ ...validBody, ...override }, {
      initialRows: [publishedRow()],
    });

    expect(result).toMatchObject({
      status: 409,
      body: { success: false, errorCode: "IDEMPOTENCY_CONFLICT" },
    });
  });

  it("rejects a different publicationId with an existing slug", async () => {
    const result = await postPublishContent({ ...validBody, publicationId: "6" }, {
      initialRows: [publishedRow()],
    });

    expect(result).toMatchObject({
      status: 409,
      body: { success: false, errorCode: "DUPLICATE_SLUG" },
    });
  });

  it("replays after a 23505 insert error when publicationId row has the same fingerprint", async () => {
    const result = await postPublishContent(validBody, {
      initialRows: [],
      insertError: { code: "23505" },
      publicationIdRowsAfterInsertError: [publishedRow()],
    });

    expect(result).toMatchObject({
      status: 200,
      body: { success: true, alreadyPublished: true, publicationId: "5" },
    });
  });

  it("returns IDEMPOTENCY_CONFLICT after a 23505 insert error when publicationId row differs", async () => {
    const result = await postPublishContent({ ...validBody, title: "Different title" }, {
      initialRows: [],
      insertError: { code: "23505" },
      publicationIdRowsAfterInsertError: [publishedRow()],
    });

    expect(result).toMatchObject({
      status: 409,
      body: { success: false, errorCode: "IDEMPOTENCY_CONFLICT" },
    });
  });

  it("returns DUPLICATE_SLUG after a 23505 insert error when only slug row exists", async () => {
    const result = await postPublishContent({ ...validBody, publicationId: "6" }, {
      initialRows: [],
      insertError: { code: "23505" },
      publicationIdRowsAfterInsertError: [],
      slugRowsAfterInsertError: [publishedRow()],
    });

    expect(result).toMatchObject({
      status: 409,
      body: { success: false, errorCode: "DUPLICATE_SLUG" },
    });
  });
});
