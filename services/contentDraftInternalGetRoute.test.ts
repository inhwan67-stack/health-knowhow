import { beforeEach, describe, expect, it, vi } from "vitest";

const adminMock = vi.hoisted(() => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => adminMock);

function createBuilder(result: { data: unknown; error: { code?: string; message?: string } | null }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

function createSupabaseMock(options: { found?: boolean; dbConfigured?: boolean; revisionError?: boolean } = {}) {
  if (options.dbConfigured === false) {
    return null;
  }

  if (options.revisionError) {
    return {
      from: vi.fn(() => createBuilder({ data: null, error: { code: "PGRST500", message: "raw provider failure" } })),
    };
  }

  if (options.found === false) {
    return {
      from: vi.fn(() => createBuilder({ data: null, error: null })),
    };
  }

  const builders: Record<string, ReturnType<typeof createBuilder>[]> = {
    content_revisions: [
      createBuilder({
        data: {
          id: 12,
          content_id: 828855131628,
          revision_number: 1,
          revision_status: "draft",
          revised_draft: {},
        },
        error: null,
      }),
    ],
    content_revision_public_metadata: [
      createBuilder({
        data: {
          content_id: 828855131628,
          revision_id: 12,
          revision_number: 1,
          slug: "sleep-basic-habits",
          title: "숙면을 돕는 기본적인 수면 습관",
          summary: "수면 습관 초안 요약",
          body_markdown: "## 숙면 습관",
          structured_content: { sections: [] },
          category_id: "sleep-health",
          category_name: "수면 건강",
          category_slug: "sleep-health",
          author_name: "Health Knowhow",
          metadata: {
            idempotencyKey: "health-info-sleep-basic-habits-20260727-v1",
            requestFingerprint: "abc123",
          },
        },
        error: null,
      }),
    ],
    content_revision_source_references: [
      createBuilder({
        data: [
          { source_id: 701, usage_type: "supporting", relevance_note: "one" },
          { source_id: 702, usage_type: "supporting", relevance_note: "two" },
          { source_id: 703, usage_type: "supporting", relevance_note: "three" },
        ],
        error: null,
      }),
    ],
    content_public_sources: [
      createBuilder({
        data: {
          id: 701,
          source_title: "CDC Sleep",
          source_url: "https://www.cdc.gov/sleep/about/index.html",
          publisher_name: "CDC",
          source_type: "government",
          summary: "CDC sleep overview.",
          verification_status: "verification_required",
          trust_level: "review_required",
          metadata: {},
        },
        error: null,
      }),
      createBuilder({
        data: {
          id: 702,
          source_title: "NHLBI Sleep Habits",
          source_url: "https://www.nhlbi.nih.gov/health/sleep-deprivation/healthy-sleep-habits",
          publisher_name: "NHLBI",
          source_type: "government",
          summary: "NHLBI sleep habits.",
          verification_status: "verification_required",
          trust_level: "review_required",
          metadata: {},
        },
        error: null,
      }),
      createBuilder({
        data: {
          id: 703,
          source_title: "MedlinePlus Healthy Sleep",
          source_url: "https://medlineplus.gov/healthysleep.html",
          publisher_name: "MedlinePlus",
          source_type: "government",
          summary: "MedlinePlus healthy sleep.",
          verification_status: "verification_required",
          trust_level: "review_required",
          metadata: {},
        },
        error: null,
      }),
    ],
  };
  const calls: Array<{ table: string }> = [];
  return {
    calls,
    from: vi.fn((table: string) => {
      calls.push({ table });
      const builder = builders[table]?.shift();
      if (!builder) throw new Error(`Unexpected table call: ${table}`);
      return builder;
    }),
  };
}

async function get(
  revisionId: string,
  token = "draft-secret",
  options: { found?: boolean; dbConfigured?: boolean; revisionError?: boolean } = {},
) {
  process.env.INTERNAL_CONTENT_DRAFTS_TOKEN = "draft-secret";
  const supabase = createSupabaseMock(options);
  adminMock.getSupabaseAdminClient.mockReturnValue(supabase);

  const { GET } = await import("../app/api/internal/content-drafts/[revisionId]/route");
  const response = await GET(
    new Request(`http://localhost/api/internal/content-drafts/${revisionId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    { params: { revisionId } },
  );

  return { status: response.status, body: await response.json(), supabase };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("GET /api/internal/content-drafts/[revisionId]", () => {
  it("returns a draft with three sources and no side effects", async () => {
    const result = await get("12");

    expect(result).toMatchObject({
      status: 200,
      body: {
        success: true,
        contentId: "828855131628",
        revisionId: "12",
        revisionNumber: 1,
        title: "숙면을 돕는 기본적인 수면 습관",
        sources: [{ sourceId: "701" }, { sourceId: "702" }, { sourceId: "703" }],
        sideEffects: {
          publicationCreated: false,
          websitePublishQueueCreated: false,
          finalApprovalCreated: false,
          publishedContentsCreated: false,
          externalCalls: false,
        },
      },
    });
    expect(result.body.sources).toHaveLength(3);
    const tableCalls = result.supabase && "calls" in result.supabase
      ? (result.supabase as { calls: Array<{ table: string }> }).calls.map((call) => call.table)
      : [];
    expect(tableCalls).not.toContain("content_publications");
    expect(tableCalls).not.toContain("website_publish_queue");
    expect(tableCalls).not.toContain("content_approvals");
    expect(tableCalls).not.toContain("published_contents");
  });

  it("rejects invalid auth tokens", async () => {
    const result = await get("12", "wrong-secret");

    expect(result).toMatchObject({
      status: 401,
      body: { success: false, errorCode: "UNAUTHORIZED" },
    });
  });

  it("rejects non-numeric revision ids", async () => {
    const result = await get("abc");

    expect(result).toMatchObject({
      status: 400,
      body: { success: false, errorCode: "VALIDATION_ERROR" },
    });
    expect(result.body).not.toHaveProperty("field");
  });

  it("returns 404 when the revision does not exist", async () => {
    const result = await get("999", "draft-secret", { found: false });

    expect(result).toMatchObject({
      status: 404,
      body: { success: false, errorCode: "DRAFT_NOT_FOUND" },
    });
    expect(result.body).not.toHaveProperty("table");
    expect(result.body).not.toHaveProperty("providerCode");
  });

  it("hides table and provider codes from 500 responses", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await get("12", "draft-secret", { revisionError: true });

    expect(result).toMatchObject({
      status: 500,
      body: {
        success: false,
        errorCode: "DRAFT_READ_FAILED",
        message: "Failed to read content draft.",
      },
    });
    expect(result.body).not.toHaveProperty("table");
    expect(result.body).not.toHaveProperty("providerCode");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("raw provider failure");
    errorSpy.mockRestore();
  });

  it("hides table and provider codes from 503 responses", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await get("12", "draft-secret", { dbConfigured: false });

    expect(result).toMatchObject({
      status: 503,
      body: {
        success: false,
        errorCode: "DB_NOT_CONFIGURED",
        message: "Internal draft storage is not configured.",
      },
    });
    expect(result.body).not.toHaveProperty("table");
    expect(result.body).not.toHaveProperty("providerCode");
    errorSpy.mockRestore();
  });
});
