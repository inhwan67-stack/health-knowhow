import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const adminMock = vi.hoisted(() => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => adminMock);
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn().mockResolvedValue([{ address: "23.1.1.1" }]),
}));

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

function createSupabaseMock(options: { contentId?: string; revisionId?: number; found?: boolean; duplicateSourceUrl?: boolean } = {}) {
  if (options.found === false) {
    return { from: vi.fn(() => createBuilder({ data: null, error: null })) };
  }
  const revisionId = options.revisionId ?? 13;
  const contentId = options.contentId ?? "819852773404";
  const builders: Record<string, ReturnType<typeof createBuilder>[]> = {
    content_revisions: [
      createBuilder({
        data: { id: revisionId, content_id: contentId, revision_number: 1, revision_status: "draft", revised_draft: {} },
        error: null,
      }),
    ],
    content_revision_public_metadata: [
      createBuilder({
        data: {
          content_id: contentId,
          revision_id: revisionId,
          revision_number: 1,
          slug: "sleep-basic-habits",
          title: "숙면을 돕는 기본적인 수면 습관",
          summary: "summary",
          body_markdown: "body",
          structured_content: {},
          category_id: "sleep",
          category_name: "수면",
          category_slug: "sleep",
          author_name: "Health Knowhow",
          metadata: {},
        },
        error: null,
      }),
    ],
    content_revision_source_references: [
      createBuilder({
        data: [
          { source_id: 2, usage_type: "supporting", relevance_note: "CDC" },
          { source_id: 3, usage_type: "supporting", relevance_note: "NHLBI" },
          { source_id: 4, usage_type: "supporting", relevance_note: "MedlinePlus" },
        ],
        error: null,
      }),
    ],
    content_public_sources: [
      createBuilder({ data: sourceRow(2, "https://www.cdc.gov/sleep/about/index.html"), error: null }),
      createBuilder({ data: sourceRow(3, options.duplicateSourceUrl ? "https://www.cdc.gov:443/sleep/about/index.html#duplicate" : "https://www.nhlbi.nih.gov/health/sleep-deprivation/healthy-sleep-habits"), error: null }),
      createBuilder({ data: sourceRow(4, "https://medlineplus.gov/healthysleep.html"), error: null }),
    ],
  };
  const calls: string[] = [];
  return {
    calls,
    from: vi.fn((table: string) => {
      calls.push(table);
      const builder = builders[table]?.shift();
      if (!builder) throw new Error(`Unexpected table call: ${table}`);
      return builder;
    }),
  };
}

async function post(payload: unknown, token = "source-secret", options: { contentId?: string; revisionId?: number; found?: boolean; duplicateSourceUrl?: boolean } = {}) {
  process.env.INTERNAL_SOURCE_FETCH_PREVIEW_TOKEN = "source-secret";
  const supabase = createSupabaseMock(options);
  adminMock.getSupabaseAdminClient.mockReturnValue(supabase);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    status: 200,
    url: "https://www.cdc.gov/sleep/about/index.html",
    headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
    body: streamFrom("<html><main>Sleep source text preview.</main></html>"),
  }));

  const { POST } = await import("../app/api/internal/medical-source-review/source-fetch-preview/route");
  const response = await POST(new Request("http://localhost/api/internal/medical-source-review/source-fetch-preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  }));
  return { response, body: await response.json(), supabase, fetchMock: fetch as unknown as ReturnType<typeof vi.fn> };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("POST /api/internal/medical-source-review/source-fetch-preview", () => {
  it("rejects unauthenticated requests before Supabase or fetch access", async () => {
    const result = await post(validPayload(), "wrong");

    expect(result.response.status).toBe(401);
    expect(result.body).toMatchObject({ success: false, errorCode: "UNAUTHORIZED", persisted: false, persistable: false });
    expect(adminMock.getSupabaseAdminClient).not.toHaveBeenCalled();
    expect(result.fetchMock).not.toHaveBeenCalled();
    expect(result.response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.stringify(result.body)).not.toContain("source-secret");
  });

  it("rejects malformed payloads before Supabase or fetch access", async () => {
    const result = await post({ ...validPayload(), dryRun: false });

    expect(result.response.status).toBe(400);
    expect(result.body).toMatchObject({ errorCode: "VALIDATION_ERROR", sourceFetchExecuted: false });
    expect(adminMock.getSupabaseAdminClient).not.toHaveBeenCalled();
    expect(result.fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-canonical revisionId values before Supabase or fetch access", async () => {
    const result = await post({ ...validPayload(), revisionId: "013" });

    expect(result.response.status).toBe(400);
    expect(result.body).toMatchObject({ errorCode: "INVALID_REVISION_ID", sourceFetchExecuted: false });
    expect(adminMock.getSupabaseAdminClient).not.toHaveBeenCalled();
    expect(result.fetchMock).not.toHaveBeenCalled();
  });

  it("rejects arbitrary URL fields before Supabase or fetch access", async () => {
    const result = await post({ ...validPayload(), url: "https://www.cdc.gov/sleep/about/index.html" });

    expect(result.response.status).toBe(400);
    expect(result.body.validationErrors.join(" ")).toContain("Arbitrary source URLs are not accepted");
    expect(adminMock.getSupabaseAdminClient).not.toHaveBeenCalled();
    expect(result.fetchMock).not.toHaveBeenCalled();
  });

  it("reads the draft, verifies stored source ownership, fetches selected source previews, and has no write side effects", async () => {
    const result = await post(validPayload());

    expect(result.response.status).toBe(200);
    expect(result.response.headers.get("Cache-Control")).toBe("no-store");
    expect(result.body).toMatchObject({
      success: true,
      dryRun: true,
      persisted: false,
      persistable: false,
      contentId: "819852773404",
      revisionId: "13",
      sourceFetchExecuted: true,
      sourceVerificationExecuted: false,
      sideEffects: {
        internalDraftGetCalled: true,
        externalSourceGetsCalled: true,
        reviewResultInserted: false,
        contentRevisionUpdated: false,
        imagePlanUpdated: false,
        workflowCompleted: false,
        notificationSent: false,
        publicationCreated: false,
        publishQueueCreated: false,
        finalApprovalCreated: false,
        publishedContentsCreated: false,
        storageUploaded: false,
        imageGenerated: false,
      },
    });
    expect(result.body.results).toHaveLength(3);
    expect(result.body.results[0].textDigest).toMatch(/^sha256:/);
    expect(result.fetchMock).toHaveBeenCalledTimes(3);
    expect(result.supabase.calls).toEqual([
      "content_revisions",
      "content_revision_public_metadata",
      "content_revision_source_references",
      "content_public_sources",
      "content_public_sources",
      "content_public_sources",
    ]);
    expect(JSON.stringify(result.body)).not.toContain("<html>");
  });

  it("rejects contentId mismatch before external source fetch", async () => {
    const result = await post(validPayload(), "source-secret", { contentId: "wrong" });

    expect(result.response.status).toBe(400);
    expect(result.body.validationErrors.join(" ")).toContain("contentId");
    expect(result.fetchMock).not.toHaveBeenCalled();
  });

  it("rejects missing sourceId before external source fetch", async () => {
    const result = await post({ ...validPayload(), sourceIds: ["999"] });

    expect(result.response.status).toBe(400);
    expect(result.body.validationErrors.join(" ")).toContain("sourceId 999");
    expect(result.fetchMock).not.toHaveBeenCalled();
  });

  it("rejects duplicate stored source URLs before external source fetch", async () => {
    const result = await post({ ...validPayload(), sourceIds: ["2", "3"] }, "source-secret", { duplicateSourceUrl: true });

    expect(result.response.status).toBe(400);
    expect(result.body).toMatchObject({ errorCode: "DUPLICATE_DRAFT_SOURCE_URL" });
    expect(result.body.validationErrors.join(" ")).toContain("sourceIds 2 and 3");
    expect(result.body.validationErrors.join(" ")).not.toContain("https://");
    expect(result.fetchMock).not.toHaveBeenCalled();
  });

  it("route and service contract contain no persistence, RPC, notification, publication, storage, or image generation path", () => {
    const routeSource = readFileSync(join(process.cwd(), "app/api/internal/medical-source-review/source-fetch-preview/route.ts"), "utf8");
    const serviceSource = readFileSync(join(process.cwd(), "services/internalSourceFetchPreview.ts"), "utf8");
    const combined = `${routeSource}\n${serviceSource}`;

    expect(routeSource).toContain("export async function POST");
    expect(routeSource).not.toContain("export async function GET");
    expect(routeSource).toContain('runtime = "nodejs"');
    expect(routeSource).toContain('dynamic = "force-dynamic"');
    expect(combined).not.toContain(".rpc(");
    expect(combined).not.toContain("save_medical_source_review_result_atomic");
    expect(combined).not.toContain("/api/internal/medical-source-review/results");
    expect(combined).not.toContain("/api/internal/content-workflow/medical-review-complete");
    expect(combined).not.toContain("/api/internal/admin/notifications");
    expect(combined).not.toContain("content_publications");
    expect(combined).not.toContain("website_publish_queue");
    expect(combined).not.toContain("content_approvals");
    expect(combined).not.toContain("published_contents");
    expect(combined).not.toContain("storage.objects");
    expect(combined).not.toContain("image generation");
  });
});

function validPayload() {
  return {
    dryRun: true,
    contentId: "819852773404",
    revisionId: "13",
    sourceIds: ["2", "3", "4"],
  };
}

function sourceRow(id: number, url: string) {
  return {
    id,
    source_title: `Source ${id}`,
    source_url: url,
    publisher_name: "Publisher",
    source_type: "government",
    summary: "summary",
    verification_status: "verification_required",
    trust_level: "review_required",
    metadata: {},
  };
}

function streamFrom(text: string) {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}
