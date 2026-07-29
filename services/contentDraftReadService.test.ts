import { describe, expect, it, vi } from "vitest";

import { getContentDraftByRevisionId } from "./contentDraftReadService";

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

function createSupabaseMock() {
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
          metadata: { sourceRole: "overview" },
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

describe("getContentDraftByRevisionId", () => {
  it("reads a draft with three sources and no side-effect tables", async () => {
    const supabase = createSupabaseMock();
    const result = await getContentDraftByRevisionId(supabase as never, 12);

    expect(result).toMatchObject({
      ok: true,
      value: {
        contentId: "828855131628",
        revisionId: "12",
        revisionNumber: 1,
        revisionStatus: "draft",
        slug: "sleep-basic-habits",
        sources: [
          { sourceId: "701", verificationStatus: "verification_required", trustLevel: "review_required" },
          { sourceId: "702" },
          { sourceId: "703" },
        ],
      },
    });
    expect(supabase.calls.map((call) => call.table)).toEqual([
      "content_revisions",
      "content_revision_public_metadata",
      "content_revision_source_references",
      "content_public_sources",
      "content_public_sources",
      "content_public_sources",
    ]);
    expect(supabase.calls.map((call) => call.table)).not.toContain("content_publications");
    expect(supabase.calls.map((call) => call.table)).not.toContain("website_publish_queue");
    expect(supabase.calls.map((call) => call.table)).not.toContain("content_approvals");
    expect(supabase.calls.map((call) => call.table)).not.toContain("published_contents");
  });

  it("returns not found for missing revisions", async () => {
    const supabase = {
      from: vi.fn(() => createBuilder({ data: null, error: null })),
    };

    const result = await getContentDraftByRevisionId(supabase as never, 999);

    expect(result).toMatchObject({
      ok: false,
      error: { errorCode: "DRAFT_NOT_FOUND", table: "content_revisions" },
    });
  });
});
