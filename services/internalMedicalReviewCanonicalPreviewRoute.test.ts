import { describe, expect, it, vi, beforeEach } from "vitest";

import { POST } from "../app/api/internal/medical-source-review/canonical-preview/route";
import type { CanonicalPreviewRequest } from "./internalMedicalReviewCanonicalPreview";

describe("internal medical review canonical preview route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_MEDICAL_REVIEW_CANONICAL_PREVIEW_TOKEN = "canonical-secret";
  });

  it("rejects unauthenticated requests before canonical helper output is exposed", async () => {
    const response = await POST(jsonRequest(fixtureRequest(), undefined));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("Content-Type")).toContain("charset=utf-8");
    expect(body).toMatchObject({
      success: false,
      errorCode: "UNAUTHORIZED",
      persisted: false,
      persistable: false,
      sideEffects: noSideEffects(),
    });
    expect(JSON.stringify(body)).not.toContain("canonical-secret");
  });

  it("rejects dryRun=false and malformed payloads without side effects", async () => {
    const dryRunFalse = await POST(jsonRequest({ ...fixtureRequest(), dryRun: false }, "canonical-secret"));
    const malformed = await POST(new Request("http://localhost/api/internal/medical-source-review/canonical-preview", {
      method: "POST",
      headers: { Authorization: "Bearer canonical-secret", "Content-Type": "application/json" },
      body: "{not-json",
    }));

    expect(dryRunFalse.status).toBe(400);
    expect(dryRunFalse.headers.get("Content-Type")).toContain("charset=utf-8");
    expect(await dryRunFalse.json()).toMatchObject({ success: false, errorCode: "VALIDATION_ERROR", sideEffects: noSideEffects() });
    expect(malformed.status).toBe(400);
    expect(malformed.headers.get("Content-Type")).toContain("charset=utf-8");
    expect(await malformed.json()).toMatchObject({ success: false, errorCode: "VALIDATION_ERROR", sideEffects: noSideEffects() });
  });

  it("enforces body size before parsing JSON", async () => {
    const response = await POST(new Request("http://localhost/api/internal/medical-source-review/canonical-preview", {
      method: "POST",
      headers: { Authorization: "Bearer canonical-secret", "Content-Type": "application/json" },
      body: JSON.stringify({ padding: "x".repeat(130 * 1024) }),
    }));

    expect(response.status).toBe(413);
    expect(response.headers.get("Content-Type")).toContain("charset=utf-8");
    expect(await response.json()).toMatchObject({ success: false, errorCode: "PAYLOAD_TOO_LARGE", sideEffects: noSideEffects() });
  });

  it("returns no-store canonical preview without DB, RPC, write, external fetch, or token exposure", async () => {
    const response = await POST(jsonRequest(fixtureRequest(), "canonical-secret"));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("Content-Type")).toContain("charset=utf-8");
    expect(body).toMatchObject({
      success: true,
      dryRun: true,
      contentId: "819852773404",
      revisionId: "13",
      persisted: false,
      persistable: false,
      sideEffects: noSideEffects(),
    });
    expect(body.payloadFingerprintPreview).toMatch(/^[a-f0-9]{64}$/);
    expect(body.canonicalMaterialPreview.claims.map((claim: { claimId: string }) => claim.claimId)).toEqual(["claim-001", "claim-002"]);
    expect(body.canonicalMaterialPreview.sources.map((source: { sourceId: string }) => source.sourceId)).toEqual(["2", "3", "4"]);
    expect(serialized).toContain("textDigest");
    expect(serialized).toContain("textPreviewLength");
    expect(serialized).not.toContain("\"textPreview\":");
    expect(serialized).not.toContain("full preview must not be copied");
    expect(serialized).not.toContain("preview text must not be copied");
    expect(serialized).not.toContain("fullHtml");
    expect(serialized).not.toContain("canonical-secret");
  });
});

function jsonRequest(payload: unknown, bearerToken: string | undefined): Request {
  return new Request("http://localhost/api/internal/medical-source-review/canonical-preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
}

function noSideEffects() {
  return {
    externalCalls: false,
    databaseRead: false,
    databaseWrite: false,
    rpcCalled: false,
    notificationSent: false,
    publicationCreated: false,
    storageUploaded: false,
    imageGenerated: false,
  };
}

function fixtureRequest(): CanonicalPreviewRequest {
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
