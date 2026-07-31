import { describe, expect, it } from "vitest";

import {
  buildCanonicalMedicalReviewPreview,
  parseCanonicalPreviewPayload,
  stableStringify,
  type CanonicalPreviewRequest,
} from "./internalMedicalReviewCanonicalPreview";

describe("internal medical review canonical preview", () => {
  it("creates stable fingerprints regardless of object key and array order", () => {
    const first = buildCanonicalMedicalReviewPreview(fixtureRequest());
    const second = buildCanonicalMedicalReviewPreview({
      ...fixtureRequest(),
      claimCandidates: [...fixtureRequest().claimCandidates].reverse(),
      sourceCandidates: [...fixtureRequest().sourceCandidates].reverse().map((source) => ({
        trustLevel: source.trustLevel,
        verificationStatus: source.verificationStatus,
        candidateOnly: source.candidateOnly,
        sourceType: source.sourceType,
        publisherName: source.publisherName,
        requestedUrl: source.requestedUrl,
        title: source.title,
        sourceId: source.sourceId,
      })),
      sourceFetchPreviews: [...fixtureRequest().sourceFetchPreviews].reverse(),
    });

    expect(first.payloadFingerprintPreview).toBe(second.payloadFingerprintPreview);
    expect(first.payloadFingerprintPreview).toMatch(/^[a-f0-9]{64}$/);
    expect(stableStringify(first.canonicalMaterialPreview)).toBe(stableStringify(second.canonicalMaterialPreview));
  });

  it("preserves actual n8n requestedUrl field in canonical material", () => {
    const preview = buildCanonicalMedicalReviewPreview(fixtureRequest());

    expect(preview.canonicalMaterialPreview.sources).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceId: "2",
        requestedUrl: "https://www.cdc.gov/sleep/",
        candidateOnly: true,
        verificationStatus: "verification_required",
        trustLevel: "review_required",
      }),
    ]));
    expect(JSON.stringify(preview.canonicalMaterialPreview)).not.toContain("\"url\":");
  });

  it("changes fingerprint when meaningful claim content or source text digest changes", () => {
    const baseline = buildCanonicalMedicalReviewPreview(fixtureRequest()).payloadFingerprintPreview;
    const claimChanged = buildCanonicalMedicalReviewPreview({
      ...fixtureRequest(),
      claimCandidates: fixtureRequest().claimCandidates.map((claim) => claim.claimId === "claim-001" ? { ...claim, normalizedClaim: "수면 습관은 건강에 다른 영향을 줄 수 있습니다." } : claim),
    }).payloadFingerprintPreview;
    const digestChanged = buildCanonicalMedicalReviewPreview({
      ...fixtureRequest(),
      sourceFetchPreviews: fixtureRequest().sourceFetchPreviews.map((source) => source.sourceId === "2" ? { ...source, textDigest: "b".repeat(64) } : source),
    }).payloadFingerprintPreview;

    expect(claimChanged).not.toBe(baseline);
    expect(digestChanged).not.toBe(baseline);
  });

  it("excludes fetchedAt, requestId, and full source text from canonical material", () => {
    const first = buildCanonicalMedicalReviewPreview(fixtureRequest()).payloadFingerprintPreview;
    const second = buildCanonicalMedicalReviewPreview({
      ...fixtureRequest(),
      sourceFetchPreviews: fixtureRequest().sourceFetchPreviews.map((source) => ({
        ...source,
        fetchedAt: "2099-01-01T00:00:00.000Z",
        requestId: "runtime-only-id",
      }) as never),
    }).payloadFingerprintPreview;
    const serialized = JSON.stringify(buildCanonicalMedicalReviewPreview(fixtureRequest()).canonicalMaterialPreview);

    expect(second).toBe(first);
    expect(serialized).not.toContain("fetchedAt");
    expect(serialized).not.toContain("requestId");
    expect(serialized).not.toContain("\"textPreview\":");
    expect(serialized).not.toContain("full preview must not be copied");
    expect(serialized).not.toContain("preview text must not be copied");
    expect(serialized).not.toContain("<html");
    expect(serialized).toContain("textDigest");
    expect(serialized).toContain("textPreviewLength");
  });

  it("rejects malformed payloads, duplicate IDs, too many items, and non-preview states", () => {
    expect(parseCanonicalPreviewPayload({ ...fixtureRequest(), dryRun: false }).ok).toBe(false);
    expect(parseCanonicalPreviewPayload({ ...fixtureRequest(), reviewEngineExecuted: true }).ok).toBe(false);
    expect(parseCanonicalPreviewPayload({ ...fixtureRequest(), approvedClaimIds: ["claim-001"] }).ok).toBe(false);
    expect(parseCanonicalPreviewPayload({
      ...fixtureRequest(),
      claimCandidates: [fixtureRequest().claimCandidates[0], fixtureRequest().claimCandidates[0]],
    }).ok).toBe(false);
    expect(parseCanonicalPreviewPayload({
      ...fixtureRequest(),
      sourceCandidates: [fixtureRequest().sourceCandidates[0], fixtureRequest().sourceCandidates[0]],
    }).ok).toBe(false);
    expect(parseCanonicalPreviewPayload({
      ...fixtureRequest(),
      sourceFetchPreviews: [fixtureRequest().sourceFetchPreviews[0], { ...fixtureRequest().sourceFetchPreviews[0], fullHtml: "<html></html>" }],
    }).ok).toBe(false);
    expect(parseCanonicalPreviewPayload({
      ...fixtureRequest(),
      claimCandidates: Array.from({ length: 51 }, (_, index) => ({ ...fixtureRequest().claimCandidates[0], claimId: `claim-${String(index).padStart(3, "0")}` })),
    }).ok).toBe(false);
  });

  it("rejects verified, approved, final, trusted, passed, or candidateOnly=false source candidates", () => {
    for (const invalid of [
      { verificationStatus: "verified" },
      { verificationStatus: "approved" },
      { verificationStatus: "final" },
      { verificationStatus: "passed" },
      { trustLevel: "trusted" },
      { candidateOnly: false },
    ]) {
      expect(parseCanonicalPreviewPayload({
        ...fixtureRequest(),
        sourceCandidates: [{ ...fixtureRequest().sourceCandidates[0], ...invalid }, ...fixtureRequest().sourceCandidates.slice(1)],
      }).ok).toBe(false);
    }
  });

  it("rejects mismatched source candidate, fetch preview, and claim candidateSourceIds sets", () => {
    expect(parseCanonicalPreviewPayload({
      ...fixtureRequest(),
      sourceFetchPreviews: fixtureRequest().sourceFetchPreviews.filter((source) => source.sourceId !== "3"),
    }).ok).toBe(false);
    expect(parseCanonicalPreviewPayload({
      ...fixtureRequest(),
      sourceFetchPreviews: [...fixtureRequest().sourceFetchPreviews, { ...fixtureRequest().sourceFetchPreviews[0], sourceId: "unknown-source" }],
    }).ok).toBe(false);
    expect(parseCanonicalPreviewPayload({
      ...fixtureRequest(),
      claimCandidates: [{ ...fixtureRequest().claimCandidates[0], candidateSourceIds: ["unknown-source"] }, ...fixtureRequest().claimCandidates.slice(1)],
    }).ok).toBe(false);
  });

  it("rejects invalid bytesRead values without coercion", () => {
    for (const invalidBytesRead of ["1200", Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(parseCanonicalPreviewPayload({
        ...fixtureRequest(),
        sourceFetchPreviews: [{ ...fixtureRequest().sourceFetchPreviews[0], bytesRead: invalidBytesRead }, ...fixtureRequest().sourceFetchPreviews.slice(1)],
      }).ok).toBe(false);
    }
    expect(parseCanonicalPreviewPayload({
      ...fixtureRequest(),
      sourceFetchPreviews: [{ ...fixtureRequest().sourceFetchPreviews[0], bytesRead: null }, ...fixtureRequest().sourceFetchPreviews.slice(1)],
    }).ok).toBe(true);
    expect(parseCanonicalPreviewPayload({
      ...fixtureRequest(),
      sourceFetchPreviews: [{ ...fixtureRequest().sourceFetchPreviews[0], bytesRead: 0 }, ...fixtureRequest().sourceFetchPreviews.slice(1)],
    }).ok).toBe(true);
  });
});

export function fixtureRequest(): CanonicalPreviewRequest {
  return {
    dryRun: true,
    contentId: "819852773404",
    revisionId: "13",
    revisionNumber: 1,
    reviewEngineExecuted: false,
    sourceVerificationExecuted: false,
    approvedClaimIds: [],
    claimCandidates: [
      {
        claimId: "claim-002",
        originalText: "잠들기 전 화면 사용을 줄이는 것이 도움이 될 수 있습니다.",
        normalizedClaim: "잠들기 전 화면 사용을 줄이는 것이 도움이 될 수 있습니다.",
        claimType: "lifestyle-advice",
        riskLevel: "low",
        sourceRequired: true,
        candidateSourceIds: ["4", "2"],
        reviewStatus: "candidate_only",
        note: "candidate only",
      },
      {
        claimId: "claim-001",
        originalText: "수면 리듬을 안정시키는 생활습관은 숙면에 도움이 됩니다.",
        normalizedClaim: "수면 리듬을 안정시키는 생활습관은 숙면에 도움이 됩니다.",
        claimType: "lifestyle-advice",
        riskLevel: "low",
        sourceRequired: true,
        candidateSourceIds: ["2", "3", "4"],
        reviewStatus: "candidate_only",
      },
    ],
    sourceCandidates: [
      {
        sourceId: "4",
        title: "Healthy Sleep",
        requestedUrl: "https://medlineplus.gov/healthysleep.html",
        publisherName: "MedlinePlus",
        sourceType: "public_health",
        candidateOnly: true,
        verificationStatus: "verification_required",
        trustLevel: "review_required",
      },
      {
        sourceId: "2",
        title: "Sleep and Sleep Disorders",
        requestedUrl: "https://www.cdc.gov/sleep/",
        publisherName: "CDC",
        sourceType: "public_health",
        candidateOnly: true,
        verificationStatus: "verification_required",
        trustLevel: "review_required",
      },
      {
        sourceId: "3",
        title: "Sleep Deprivation and Deficiency",
        requestedUrl: "https://www.nhlbi.nih.gov/health/sleep-deprivation",
        publisherName: "NHLBI",
        sourceType: "public_health",
        candidateOnly: true,
        verificationStatus: "verification_required",
        trustLevel: "review_required",
      },
    ],
    sourceFetchPreviews: [
      {
        sourceId: "2",
        requestedUrl: "https://www.cdc.gov/sleep/",
        finalUrl: "https://www.cdc.gov/sleep/",
        fetchSucceeded: true,
        httpStatus: 200,
        contentType: "text/html; charset=utf-8",
        bytesRead: 1200,
        textPreviewLength: 500,
        textDigest: "a".repeat(64),
        verificationStatus: "fetched_unverified",
        verificationWarnings: [],
        fetchedAt: "2026-07-31T00:00:00.000Z",
        textPreview: "<html>full preview must not be copied</html>",
      },
      {
        sourceId: "3",
        requestedUrl: "https://www.nhlbi.nih.gov/health/sleep-deprivation",
        finalUrl: "https://www.nhlbi.nih.gov/health/sleep-deprivation",
        fetchSucceeded: true,
        httpStatus: 200,
        contentType: "text/html; charset=utf-8",
        bytesRead: 1000,
        textPreviewLength: 480,
        textDigest: "b".repeat(64),
        verificationStatus: "fetched_unverified",
        verificationWarnings: [],
        fetchedAt: "2026-07-31T00:00:00.000Z",
        textPreview: "preview text must not be copied",
      },
      {
        sourceId: "4",
        requestedUrl: "https://medlineplus.gov/healthysleep.html",
        finalUrl: "https://medlineplus.gov/healthysleep.html",
        fetchSucceeded: true,
        httpStatus: 200,
        contentType: "text/html; charset=utf-8",
        bytesRead: 900,
        textPreviewLength: 450,
        textDigest: "c".repeat(64),
        verificationStatus: "fetched_unverified",
        verificationWarnings: ["preview only"],
        fetchedAt: "2026-07-31T00:00:00.000Z",
        textPreview: "preview text must not be copied",
      },
    ],
  };
}
