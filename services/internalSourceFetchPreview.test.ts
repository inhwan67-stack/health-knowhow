import { describe, expect, it, vi } from "vitest";

import {
  MAX_SOURCE_RESPONSE_BYTES,
  assertInternalSourceFetchPreviewAuthorized,
  fetchSourcePreviews,
  parseSourceFetchPreviewPayload,
  validateDraftSourcesForPreview,
  type SourceFetchPreviewRequest,
} from "./internalSourceFetchPreview";
import type { ContentDraftReadSuccess } from "./contentDraftReadService";

const draft = {
  contentId: "819852773404",
  revisionId: "13",
  revisionNumber: 1,
  revisionStatus: "draft",
  title: "숙면을 돕는 기본적인 수면 습관",
  summary: "summary",
  bodyMarkdown: "body",
  structuredContent: null,
  slug: "sleep-basic-habits",
  category: { id: "sleep", name: "수면", slug: "sleep" },
  authorName: "Health Knowhow",
  idempotencyKey: null,
  requestFingerprint: null,
  sources: [
    source("2", "https://www.cdc.gov/sleep/about/index.html"),
    source("3", "https://www.nhlbi.nih.gov/health/sleep-deprivation/healthy-sleep-habits"),
    source("4", "https://medlineplus.gov/healthysleep.html"),
  ],
} satisfies ContentDraftReadSuccess;

describe("internal source fetch preview auth and payload", () => {
  it("requires Bearer token with timing-safe exact value", () => {
    process.env.INTERNAL_SOURCE_FETCH_PREVIEW_TOKEN = "source-secret";

    expect(assertInternalSourceFetchPreviewAuthorized(new Request("http://local", {
      headers: { Authorization: "Bearer source-secret" },
    }))).toBe(true);
    expect(assertInternalSourceFetchPreviewAuthorized(new Request("http://local"))).toBe(false);
    expect(assertInternalSourceFetchPreviewAuthorized(new Request("http://local", {
      headers: { Authorization: "Basic source-secret" },
    }))).toBe(false);
    expect(assertInternalSourceFetchPreviewAuthorized(new Request("http://local", {
      headers: { Authorization: "Bearer wrong" },
    }))).toBe(false);
  });

  it("validates dryRun, string ids, sourceIds, duplicates, max count, and arbitrary URL fields", () => {
    expect(parseSourceFetchPreviewPayload({ dryRun: false, contentId: "1", revisionId: "13", sourceIds: ["2"] })).toMatchObject({ ok: false });
    expect(parseSourceFetchPreviewPayload({ dryRun: true, revisionId: "13", sourceIds: ["2"] })).toMatchObject({ ok: false });
    expect(parseSourceFetchPreviewPayload({ dryRun: true, contentId: "1", sourceIds: ["2"] })).toMatchObject({ ok: false });
    expect(parseSourceFetchPreviewPayload({ dryRun: true, contentId: "1", revisionId: "13", sourceIds: [] })).toMatchObject({ ok: false });
    expect(parseSourceFetchPreviewPayload({ dryRun: true, contentId: "1", revisionId: "13", sourceIds: ["2", "2"] })).toMatchObject({ ok: false });
    expect(parseSourceFetchPreviewPayload({ dryRun: true, contentId: "1", revisionId: "13", sourceIds: ["1", "2", "3", "4"] })).toMatchObject({ ok: false });
    expect(parseSourceFetchPreviewPayload({ dryRun: true, contentId: "1", revisionId: "13", sourceIds: ["2"], url: "https://evil.example" })).toMatchObject({ ok: false });
    expect(parseSourceFetchPreviewPayload({ dryRun: true, contentId: "819852773404", revisionId: "13", sourceIds: ["2", "3", "4"] })).toMatchObject({ ok: true });
  });

  it("rejects non-canonical revisionId values before callers can query the draft", () => {
    const blocked = ["", "0", "-1", "+13", "13.0", "1e3", " 13 ", "013", "abc", String(Number.MAX_SAFE_INTEGER + 1)];

    for (const revisionId of blocked) {
      expect(parseSourceFetchPreviewPayload({
        dryRun: true,
        contentId: "819852773404",
        revisionId,
        sourceIds: ["2"],
      })).toMatchObject({ ok: false, errorCode: "INVALID_REVISION_ID" });
    }

    expect(parseSourceFetchPreviewPayload({
      dryRun: true,
      contentId: "819852773404",
      revisionId: "999",
      sourceIds: ["2"],
    })).toMatchObject({ ok: true });
  });

  it("accepts only sourceIds that exist on the stored draft and match content/revision", () => {
    const request: SourceFetchPreviewRequest = { dryRun: true, contentId: "819852773404", revisionId: "13", sourceIds: ["2", "4"] };
    expect(validateDraftSourcesForPreview(request, draft)).toMatchObject({ ok: true, sources: [{ sourceId: "2" }, { sourceId: "4" }] });
    expect(validateDraftSourcesForPreview({ ...request, contentId: "wrong" }, draft)).toMatchObject({ ok: false });
    expect(validateDraftSourcesForPreview({ ...request, revisionId: "99" }, draft)).toMatchObject({ ok: false });
    expect(validateDraftSourcesForPreview({ ...request, sourceIds: ["999"] }, draft)).toMatchObject({ ok: false });
  });

  it("rejects duplicate stored source URLs after canonicalizing fragments, host case, and default HTTPS port", () => {
    const request: SourceFetchPreviewRequest = { dryRun: true, contentId: "819852773404", revisionId: "13", sourceIds: ["2", "5"] };
    const duplicateDraft = {
      ...draft,
      sources: [
        source("2", "https://www.cdc.gov:443/sleep/about/index.html#top"),
        source("5", "https://WWW.CDC.GOV/sleep/about/index.html#section"),
      ],
    } satisfies ContentDraftReadSuccess;

    expect(validateDraftSourcesForPreview(request, duplicateDraft)).toMatchObject({
      ok: false,
      errorCode: "DUPLICATE_DRAFT_SOURCE_URL",
      errors: [expect.stringContaining("sourceIds 2 and 5")],
    });

    const queryDiffersDraft = {
      ...draft,
      sources: [
        source("2", "https://www.cdc.gov/sleep/about/index.html?a=1"),
        source("5", "https://www.cdc.gov/sleep/about/index.html?a=2"),
      ],
    } satisfies ContentDraftReadSuccess;
    expect(validateDraftSourcesForPreview(request, queryDiffersDraft)).toMatchObject({ ok: true });
  });
});

describe("fetchSourcePreviews", () => {
  it("fetches allowed HTTPS sources with GET, manual redirect, no-store, timeout signal, and text digest", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response("<html><nav>menu</nav><main>Sleep habits help healthy sleep.</main><script>x</script></html>", {
      status: 200,
      contentType: "text/html; charset=utf-8",
    }));

    const results = await fetchSourcePreviews([draft.sources[0]], {
      fetchImpl: fetchImpl as never,
      resolveHostname: async () => ["23.1.1.1"],
      now: () => new Date("2026-07-29T00:00:00.000Z"),
    });

    expect(fetchImpl).toHaveBeenCalledWith("https://www.cdc.gov/sleep/about/index.html", expect.objectContaining({
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      headers: expect.objectContaining({
        Accept: "text/html, application/xhtml+xml, text/plain",
        "Accept-Encoding": "identity",
      }),
    }));
    expect(results[0]).toMatchObject({
      sourceId: "2",
      fetchSucceeded: true,
      httpStatus: 200,
      contentType: "text/html; charset=utf-8",
      verificationStatus: "fetched_unverified",
    });
    expect(results[0].textPreview).toContain("Sleep habits");
    expect(results[0].textPreview).not.toContain("<script>");
    expect(results[0].textDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("blocks unsafe URL policies before fetch", async () => {
    const unsafe = [
      "http://www.cdc.gov/sleep",
      "https://user:pass@www.cdc.gov/sleep",
      "https://127.0.0.1/sleep",
      "https://localhost/sleep",
      "https://www.cdc.gov:8443/sleep",
      "https://cdc.gov.attacker.example/sleep",
      "https://www.cdc.gov.attacker.example/sleep",
      "https://evilcdc.gov/sleep",
      "https://www-cdc-gov.example/sleep",
      "https://medlineplus.gov.example/sleep",
    ].map((url, index) => source(String(index + 1), url));
    const fetchImpl = vi.fn();

    const results = await fetchSourcePreviews(unsafe, {
      fetchImpl: fetchImpl as never,
      resolveHostname: async () => ["23.1.1.1"],
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(results.every((result) => result.fetchSucceeded === false)).toBe(true);
    expect(results.map((result) => result.verificationWarnings.join(","))).toEqual(expect.arrayContaining([
      expect.stringContaining("https_only"),
      expect.stringContaining("credentials_in_url_forbidden"),
      expect.stringContaining("ip_literal_forbidden"),
      expect.stringContaining("localhost_loopback_private_or_reserved_host_forbidden"),
      expect.stringContaining("non_standard_port_forbidden"),
      expect.stringContaining("host_not_allowed"),
    ]));
  });

  it("blocks DNS results that resolve to private addresses", async () => {
    const fetchImpl = vi.fn();
    const results = await fetchSourcePreviews([draft.sources[0]], {
      fetchImpl: fetchImpl as never,
      resolveHostname: async () => ["10.0.0.7"],
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(results[0]).toMatchObject({ fetchSucceeded: false, verificationWarnings: ["resolved_private_or_reserved_ip_forbidden"] });
  });

  it("allows all-public DNS results and blocks mixed, documentation, reserved, and IPv4-mapped private results", async () => {
    const publicIpv4Fetch = vi.fn().mockResolvedValue(response("public", { status: 200, contentType: "text/plain" }));
    const publicIpv4 = await fetchSourcePreviews([draft.sources[0]], {
      fetchImpl: publicIpv4Fetch as never,
      resolveHostname: async () => ["23.1.1.1"],
    });
    expect(publicIpv4[0]).toMatchObject({ fetchSucceeded: true });

    const publicIpv6Fetch = vi.fn().mockResolvedValue(response("public", { status: 200, contentType: "text/plain" }));
    const publicIpv6 = await fetchSourcePreviews([draft.sources[0]], {
      fetchImpl: publicIpv6Fetch as never,
      resolveHostname: async () => ["2600:1408:ec00:36::1736:7f31"],
    });
    expect(publicIpv6[0]).toMatchObject({ fetchSucceeded: true });

    const blockedAddressSets = [
      ["23.1.1.1", "10.0.0.1"],
      ["192.0.2.1"],
      ["198.51.100.1"],
      ["203.0.113.1"],
      ["2001:db8::1"],
      ["::ffff:127.0.0.1"],
      ["::ffff:10.0.0.1"],
      ["::ffff:192.168.1.1"],
      ["::ffff:192.0.2.1"],
      ["not-an-ip-address"],
    ];

    for (const addresses of blockedAddressSets) {
      const fetchImpl = vi.fn();
      const results = await fetchSourcePreviews([draft.sources[0]], {
        fetchImpl: fetchImpl as never,
        resolveHostname: async () => addresses,
      });
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(results[0]).toMatchObject({
        fetchSucceeded: false,
        verificationWarnings: ["resolved_private_or_reserved_ip_forbidden"],
      });
    }
  });

  it("isolates DNS lookup failures as a source-level failure", async () => {
    const fetchImpl = vi.fn();
    const results = await fetchSourcePreviews([draft.sources[0]], {
      fetchImpl: fetchImpl as never,
      resolveHostname: async () => {
        throw new Error("lookup failed");
      },
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(results[0]).toMatchObject({ fetchSucceeded: false, verificationWarnings: ["dns_lookup_failed"] });
  });

  it("does not follow redirects and does not use Location as a follow-up URL", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response("", {
      status: 302,
      headers: { location: "https://evil.example/" },
    }));

    const results = await fetchSourcePreviews([draft.sources[0]], {
      fetchImpl: fetchImpl as never,
      resolveHostname: async () => ["23.1.1.1"],
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(results[0]).toMatchObject({ fetchSucceeded: false, httpStatus: 302, verificationWarnings: ["redirect_not_followed"] });
    expect(results[0].finalUrl).toBe("https://www.cdc.gov/sleep/about/index.html");
  });

  it("rejects unsupported content-type before reading body", async () => {
    const body = streamFrom("PDF body should not be read");
    const cancelSpy = vi.spyOn(body, "getReader");
    const fetchImpl = vi.fn().mockResolvedValue(response(body, { status: 200, contentType: "application/pdf" }));

    const results = await fetchSourcePreviews([draft.sources[0]], {
      fetchImpl: fetchImpl as never,
      resolveHostname: async () => ["23.1.1.1"],
    });

    expect(cancelSpy).not.toHaveBeenCalled();
    expect(results[0]).toMatchObject({ fetchSucceeded: false, verificationWarnings: ["unsupported_content_type"], bytesRead: 0 });
  });

  it("rejects compressed responses before reading body", async () => {
    const encodings = ["gzip", "br", "deflate", "compress", "gzip, br"];

    for (const encoding of encodings) {
      const body = streamFrom("compressed body should not be read");
      const readerSpy = vi.spyOn(body, "getReader");
      const fetchImpl = vi.fn().mockResolvedValue(response(body, {
        status: 200,
        contentType: "text/plain",
        headers: { "content-encoding": encoding },
      }));

      const results = await fetchSourcePreviews([draft.sources[0]], {
        fetchImpl: fetchImpl as never,
        resolveHostname: async () => ["23.1.1.1"],
      });

      expect(readerSpy).not.toHaveBeenCalled();
      expect(results[0]).toMatchObject({
        fetchSucceeded: false,
        verificationStatus: "verification_required",
        verificationWarnings: ["compressed_response_forbidden"],
        bytesRead: 0,
      });
    }
  });

  it("allows identity or absent content-encoding responses", async () => {
    const absent = await fetchSourcePreviews([draft.sources[0]], {
      fetchImpl: vi.fn().mockResolvedValue(response("plain", { status: 200, contentType: "text/plain" })) as never,
      resolveHostname: async () => ["23.1.1.1"],
    });
    const identity = await fetchSourcePreviews([draft.sources[0]], {
      fetchImpl: vi.fn().mockResolvedValue(response("plain", {
        status: 200,
        contentType: "text/plain",
        headers: { "content-encoding": "identity" },
      })) as never,
      resolveHostname: async () => ["23.1.1.1"],
    });

    expect(absent[0]).toMatchObject({ fetchSucceeded: true });
    expect(identity[0]).toMatchObject({ fetchSucceeded: true });
  });

  it("rejects content-length that exceeds the hard byte limit before reading body", async () => {
    const body = streamFrom("too large");
    const readerSpy = vi.spyOn(body, "getReader");
    const fetchImpl = vi.fn().mockResolvedValue(response(body, {
      status: 200,
      contentType: "text/plain",
      headers: { "content-length": String(MAX_SOURCE_RESPONSE_BYTES + 1) },
    }));

    const results = await fetchSourcePreviews([draft.sources[0]], {
      fetchImpl: fetchImpl as never,
      resolveHostname: async () => ["23.1.1.1"],
    });

    expect(readerSpy).not.toHaveBeenCalled();
    expect(results[0]).toMatchObject({ responseTooLarge: true, verificationWarnings: ["response_size_limit_exceeded"] });
  });

  it("accepts content-length equal to the hard byte limit", async () => {
    const body = new Uint8Array(MAX_SOURCE_RESPONSE_BYTES);
    body.fill(65);
    const fetchImpl = vi.fn().mockResolvedValue(response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(body);
        controller.close();
      },
    }), {
      status: 200,
      contentType: "text/plain",
      headers: { "content-length": String(MAX_SOURCE_RESPONSE_BYTES) },
    }));

    const results = await fetchSourcePreviews([draft.sources[0]], {
      fetchImpl: fetchImpl as never,
      resolveHostname: async () => ["23.1.1.1"],
    });

    expect(results[0]).toMatchObject({ fetchSucceeded: true, bytesRead: MAX_SOURCE_RESPONSE_BYTES });
  });

  it("ignores invalid content-length values and still applies stream limiting", async () => {
    const body = streamFrom("plain source body");
    const fetchImpl = vi.fn().mockResolvedValue(response(body, {
      status: 200,
      contentType: "text/plain",
      headers: { "content-length": "-1" },
    }));

    const results = await fetchSourcePreviews([draft.sources[0]], {
      fetchImpl: fetchImpl as never,
      resolveHostname: async () => ["23.1.1.1"],
    });

    expect(results[0]).toMatchObject({ fetchSucceeded: true });
  });

  it("aborts stream reads when actual bytes exceed the hard limit", async () => {
    const large = new Uint8Array(MAX_SOURCE_RESPONSE_BYTES + 1);
    large.fill(65);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(large);
      },
      cancel: vi.fn(),
    });
    const fetchImpl = vi.fn().mockResolvedValue(response(body, { status: 200, contentType: "text/plain" }));

    const results = await fetchSourcePreviews([draft.sources[0]], {
      fetchImpl: fetchImpl as never,
      resolveHostname: async () => ["23.1.1.1"],
    });

    expect(results[0]).toMatchObject({ fetchSucceeded: false, responseTooLarge: true, verificationWarnings: ["response_size_limit_exceeded"] });
    expect(results[0].bytesRead).toBe(MAX_SOURCE_RESPONSE_BYTES + 1);
  });

  it("cancels immediately when accumulated chunks exceed the hard limit without reading later chunks", async () => {
    const first = new Uint8Array(MAX_SOURCE_RESPONSE_BYTES);
    first.fill(65);
    const second = new Uint8Array(1);
    second.fill(66);
    const cancel = vi.fn();
    let pulls = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        if (pulls === 1) controller.enqueue(first);
        else if (pulls === 2) controller.enqueue(second);
        else controller.enqueue(new TextEncoder().encode("must-not-read"));
      },
      cancel,
    });
    const fetchImpl = vi.fn().mockResolvedValue(response(body, { status: 200, contentType: "text/plain" }));

    const results = await fetchSourcePreviews([draft.sources[0]], {
      fetchImpl: fetchImpl as never,
      resolveHostname: async () => ["23.1.1.1"],
    });

    expect(results[0]).toMatchObject({ fetchSucceeded: false, responseTooLarge: true, verificationWarnings: ["response_size_limit_exceeded"] });
    expect(results[0].bytesRead).toBe(MAX_SOURCE_RESPONSE_BYTES + 1);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(pulls).toBeGreaterThanOrEqual(2);
  });

  it("isolates one source failure while continuing other sources", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("DNS failure with secret-looking text"))
      .mockResolvedValueOnce(response("plain sleep source text", { status: 200, contentType: "text/plain" }));

    const results = await fetchSourcePreviews([draft.sources[0], draft.sources[1]], {
      fetchImpl: fetchImpl as never,
      resolveHostname: async () => ["23.1.1.1"],
    });

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ fetchSucceeded: false, verificationWarnings: ["source_fetch_failed"] });
    expect(results[1]).toMatchObject({ fetchSucceeded: true });
  });
});

function source(sourceId: string, url: string): ContentDraftReadSuccess["sources"][number] {
  return {
    sourceId,
    title: `Source ${sourceId}`,
    url,
    publisherName: "Publisher",
    sourceType: "government",
    summary: "summary",
    verificationStatus: "verification_required",
    trustLevel: "review_required",
    usageType: "supporting",
    relevanceNote: null,
    metadata: {},
  };
}

function response(body: string | ReadableStream<Uint8Array>, options: { status: number; contentType?: string; headers?: Record<string, string> }) {
  const headers = new Headers(options.headers);
  if (options.contentType) headers.set("content-type", options.contentType);
  return {
    status: options.status,
    url: "https://www.cdc.gov/sleep/about/index.html",
    headers,
    body: typeof body === "string" ? streamFrom(body) : body,
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
