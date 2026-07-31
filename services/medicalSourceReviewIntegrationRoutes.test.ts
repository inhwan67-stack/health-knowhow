import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { POST as postNotification } from "../app/api/internal/admin/notifications/route";
import { POST as postWorkflowComplete } from "../app/api/internal/content-workflow/medical-review-complete/route";
import { POST as postReviewResult } from "../app/api/internal/medical-source-review/results/route";
import {
  MEDICAL_SOURCE_REVIEW_PROMPT_VERSION,
  MEDICAL_SOURCE_REVIEW_SCHEMA_VERSION,
  MEDICAL_SOURCE_REVIEW_WORKFLOW_VERSION,
  TRUSTED_SOURCE_POLICY_VERSION,
  type MedicalSourceReviewResult,
} from "../types/medical-source-review";

const token = "test-internal-token";

function reviewResult(overrides: Partial<MedicalSourceReviewResult> = {}): MedicalSourceReviewResult {
  return {
    contentId: "819852773404",
    revisionId: "13",
    revisionNumber: 1,
    medicalReviewStatus: "passed",
    sourceReviewStatus: "verified",
    overallRiskLevel: "low",
    claims: [
      { claimId: "claim-001", originalText: "숙면에는 규칙적인 생활습관이 도움이 된다.", normalizedClaim: "규칙적인 생활습관은 숙면에 도움이 된다.", claimType: "lifestyle-advice", riskLevel: "low", sourceRequired: false, sourceIds: [], sourceStatus: "not_required", reviewerReason: "General low-risk sleep hygiene advice.", action: "keep" },
    ],
    sources: [],
    requiredChanges: [],
    unsupportedClaims: [],
    verificationRequiredClaims: [],
    approvedClaims: ["claim-001"],
    reviewSummary: { totalClaims: 1, supportedClaims: 0, partiallySupportedClaims: 0, unsupportedClaims: 0, verificationRequiredClaims: 0, criticalIssues: 0 },
    warnings: [],
    status: "awaiting_final_approval",
    reviewerType: "ai",
    reviewedAt: "2026-07-29T00:00:00.000Z",
    workflowVersion: MEDICAL_SOURCE_REVIEW_WORKFLOW_VERSION,
    promptVersion: MEDICAL_SOURCE_REVIEW_PROMPT_VERSION,
    schemaVersion: MEDICAL_SOURCE_REVIEW_SCHEMA_VERSION,
    sourcePolicyVersion: TRUSTED_SOURCE_POLICY_VERSION,
    ...overrides,
  };
}

describe("medical source review integration routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_CONTENT_DRAFTS_TOKEN = token;
    process.env.INTERNAL_MEDICAL_SOURCE_REVIEW_WRITE_ENABLED = "false";
  });

  it("rejects unauthenticated requests before Supabase access", async () => {
    const response = await postReviewResult(jsonRequest(reviewResult(), undefined));

    expect(response.status).toBe(401);
    expect(getSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("validates review result dry-run without DB writes", async () => {
    const response = await postReviewResult(jsonRequest({ ...reviewResult(), dryRun: true }, token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, mode: "dry_run", persisted: false });
    expect(body.sideEffects.reviewResultInserted).toBe(false);
    expect(body.sideEffects.contentRevisionUpdated).toBe(false);
    expect(body.sideEffects.imagePlanUpdated).toBe(false);
    expect(getSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("blocks write mode while feature flag is false before Supabase access", async () => {
    const response = await postReviewResult(jsonRequest(reviewResult(), token));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({ ok: false, errorCode: "WRITE_NOT_ENABLED", mode: "write" });
    expect(getSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("calls review-result RPC exactly once when write flag is enabled", async () => {
    process.env.INTERNAL_MEDICAL_SOURCE_REVIEW_WRITE_ENABLED = "true";
    const rpc = vi.fn().mockResolvedValue({
      data: { decision: "inserted", persisted: true, contentId: "819852773404", revisionId: 13, medicalReviewStatus: "passed", sourceReviewStatus: "verified", workflowStatus: "awaiting_final_approval", safeReason: "ok" },
      error: null,
    });
    vi.mocked(getSupabaseAdminClient).mockReturnValue({ rpc } as never);

    const response = await postReviewResult(jsonRequest(reviewResult(), token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sideEffects).toMatchObject({ reviewResultInserted: true, contentRevisionUpdated: true, imagePlanUpdated: true });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("save_medical_source_review_result_atomic", expect.objectContaining({ p_review_result: expect.objectContaining({ payloadFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/) }) }));
  });

  it("keeps workflow-complete and admin-notification write paths behind the same flag", async () => {
    const workflowResponse = await postWorkflowComplete(jsonRequest({ contentId: "819852773404", revisionId: "13" }, token));
    const notificationResponse = await postNotification(jsonRequest({ type: "medical_source_review_complete", contentId: "819852773404", revisionId: "13" }, token));

    expect(workflowResponse.status).toBe(409);
    expect(notificationResponse.status).toBe(409);
    expect(getSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("n8n medical/source workflow sends Authorization on all three internal API calls", () => {
    const workflow = JSON.parse(readFileSync(join(process.cwd(), "n8n/health-knowhow-medical-source-review.json"), "utf8")) as { nodes: Array<{ name: string; parameters?: Record<string, unknown> }> };
    const targetNodes = ["Save Review Result", "Set Status Awaiting Final Approval", "Notify Admin"];

    for (const nodeName of targetNodes) {
      const node = workflow.nodes.find((item) => item.name === nodeName);
      expect(node).toBeTruthy();
      expect(JSON.stringify(node?.parameters)).toContain("Authorization");
      expect(JSON.stringify(node?.parameters)).toContain("HEALTH_KNOWHOW_INTERNAL_API_TOKEN");
    }
  });

  it("n8n production medical/source workflow checks revisionStatus instead of missing status field", () => {
    const workflow = JSON.parse(readFileSync(join(process.cwd(), "n8n/health-knowhow-medical-source-review.json"), "utf8")) as { nodes: Array<{ name: string; parameters?: Record<string, unknown> }> };
    const statusCheck = workflow.nodes.find((item) => item.name === "Draft Status Check");
    const serialized = JSON.stringify(statusCheck?.parameters);

    expect(statusCheck).toBeTruthy();
    expect(serialized).toContain("$json.revisionStatus");
    expect(serialized).toContain("review");
    expect(serialized).not.toContain("$json.status");
  });

  it("n8n dry-run medical/source workflow is isolated from write and notification paths", () => {
    type N8nWorkflow = {
      active: boolean;
      nodes: Array<{ name: string; type: string; parameters?: Record<string, unknown> }>;
      connections: Record<string, { main?: Array<Array<{ node: string; type: string; index: number }>> }>;
    };
    const workflow = JSON.parse(readFileSync(join(process.cwd(), "n8n/health-knowhow-medical-source-review-dry-run.json"), "utf8")) as N8nWorkflow;
    const serialized = JSON.stringify(workflow);
    const manualTrigger = workflow.nodes.find((item) => item.name === "Manual Trigger Only");
    const controlledInput = workflow.nodes.find((item) => item.name === "Controlled Dry-Run Input");
    const inputCheck = workflow.nodes.find((item) => item.name === "Input Valid Check");
    const fetchNode = workflow.nodes.find((item) => item.name === "Dry Run Draft Fetch");
    const readNode = workflow.nodes.find((item) => item.name === "Read Internal Draft");
    const contractVerify = workflow.nodes.find((item) => item.name === "Draft Contract Verify");
    const statusCheck = workflow.nodes.find((item) => item.name === "Draft Contract Check");
    const previewNode = workflow.nodes.find((item) => item.name === "Input Preview Output");

    expect(workflow.active).toBe(false);
    expect(manualTrigger?.type).toBe("n8n-nodes-base.manualTrigger");
    expect(controlledInput?.type).toBe("n8n-nodes-base.set");
    expect(workflow.connections["Manual Trigger Only"]?.main?.[0]?.[0]).toMatchObject({ node: "Controlled Dry-Run Input" });
    expect(workflow.connections["Controlled Dry-Run Input"]?.main?.[0]?.[0]).toMatchObject({ node: "Input Normalize" });
    expect(workflow.connections["Input Normalize"]?.main?.[0]?.[0]).toMatchObject({ node: "Input Valid Check" });
    const assignmentContainer = controlledInput?.parameters?.assignments as { assignments?: Array<{ name: string; type: string; value: unknown }> } | undefined;
    const assignments = assignmentContainer?.assignments;
    expect(assignments).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "dryRun", type: "boolean", value: true }),
      expect.objectContaining({ name: "contentId", type: "string", value: "819852773404" }),
      expect.objectContaining({ name: "revisionId", type: "string", value: "13" }),
      expect.objectContaining({ name: "locale", type: "string", value: "ko-KR" }),
      expect.objectContaining({ name: "country", type: "string", value: "KR" }),
      expect.objectContaining({ name: "inputMode", type: "string", value: "revision-13-controlled-input-preview" }),
    ]));
    expect(workflow.nodes.some((item) => item.type === "n8n-nodes-base.webhook")).toBe(false);
    expect(inputCheck).toBeTruthy();
    expect(workflow.connections["Input Valid Check"]?.main?.[0]?.[0]).toMatchObject({ node: "Read Internal Draft" });
    expect(workflow.connections["Input Valid Check"]?.main?.[1]?.[0]).toMatchObject({ node: "Invalid Input Output" });
    expect(fetchNode).toBeFalsy();
    expect(readNode).toBeTruthy();
    expect(JSON.stringify(readNode?.parameters)).toContain("/api/internal/content-drafts/");
    expect(JSON.stringify(readNode?.parameters)).toContain("Authorization");
    expect(JSON.stringify(readNode?.parameters)).toContain("INTERNAL_CONTENT_DRAFTS_TOKEN");
    expect(JSON.stringify(readNode?.parameters)).not.toContain("HEALTH_KNOWHOW_INTERNAL_API_TOKEN");
    expect(JSON.stringify(contractVerify?.parameters)).toContain("requestedContentId");
    expect(JSON.stringify(contractVerify?.parameters)).toContain("requestedRevisionId");
    expect(JSON.stringify(contractVerify?.parameters)).toContain("draft.success");
    expect(JSON.stringify(contractVerify?.parameters)).toContain("draft.revisionStatus !== 'draft'");
    expect(statusCheck).toBeTruthy();
    expect(serialized).toContain("dryRun=true is required");
    expect(serialized).toContain("contentId is required");
    expect(serialized).toContain("revisionId is required");
    expect(serialized).toContain("inputValid");
    expect(serialized).toContain("revision-13-controlled-input-preview");
    expect(serialized).toContain("contractValid");
    expect(serialized).toContain("sourceCandidates");
    expect(serialized).toContain("candidate_only");
    expect(serialized).toContain("reviewedClaims");
    expect(serialized).toContain("reviewedSources");
    expect(JSON.stringify(previewNode?.parameters)).toContain("reviewEngineExecuted: false");
    expect(JSON.stringify(previewNode?.parameters)).toContain("sourceVerificationExecuted: false");
    expect(JSON.stringify(previewNode?.parameters)).toContain("claimSourceMatchingExecuted: false");
    expect(JSON.stringify(previewNode?.parameters)).toContain("reviewSummary: null");
    expect(JSON.stringify(previewNode?.parameters)).toContain("canonicalMaterialPreview: null");
    expect(JSON.stringify(previewNode?.parameters)).toContain("payloadFingerprintPreview: null");
    expect(JSON.stringify(previewNode?.parameters)).toContain("persistable: false");
    expect(serialized).toContain("persisted");
    expect(serialized).toContain("false");
    expect(serialized).toContain("bodyMarkdown");
    expect(serialized).toContain("structuredContent");
    expect(workflow.nodes.some((item) => item.name === "Source URL Policy")).toBe(false);
    expect(workflow.nodes.some((item) => item.name === "Source Policy Check")).toBe(false);
    expect(workflow.nodes.some((item) => item.name === "Fetch Source Text")).toBe(false);
    expect(serialized).not.toContain("={{$json.url}}");
    expect(serialized).not.toContain("followRedirects");
    expect(serialized).not.toContain("cdc.gov/sleep");
    expect(serialized).not.toContain("www.nhlbi.nih.gov/health");
    expect(serialized).not.toContain("medlineplus.gov/healthysleep");

    expect(serialized).not.toContain("/api/internal/medical-source-review/results");
    expect(serialized).not.toContain("/api/internal/content-workflow/medical-review-complete");
    expect(serialized).not.toContain("/api/internal/admin/notifications");
    expect(serialized).not.toContain("save_medical_source_review_result_atomic");
    expect(serialized).not.toContain("published_contents");
    expect(serialized).not.toContain("website_publish_queue");
    expect(serialized).not.toContain("content_publications");
    expect(serialized).not.toContain("content_approvals");
    expect(serialized).not.toContain("storage.objects");
    expect(serialized).not.toContain("image generation");
  });

  it("n8n review-engine dry-run workflow uses server-side safe source preview without direct source GET paths", () => {
    type N8nWorkflow = {
      name: string;
      active: boolean;
      nodes: Array<{ name: string; type: string; parameters?: Record<string, unknown>; notes?: string; credentials?: Record<string, unknown>; continueOnFail?: boolean }>;
      settings?: Record<string, unknown>;
      connections: Record<string, { main?: Array<Array<{ node: string; type: string; index: number }>> }>;
    };
    const workflow = JSON.parse(readFileSync(join(process.cwd(), "n8n/health-knowhow-medical-source-review-engine-dry-run.json"), "utf8")) as N8nWorkflow;
    const serialized = JSON.stringify(workflow);
    const manualTrigger = workflow.nodes.find((item) => item.name === "Manual Trigger Only");
    const controlledInput = workflow.nodes.find((item) => item.name === "Controlled Dry-Run Input");
    const inputCheck = workflow.nodes.find((item) => item.name === "Input Valid Check");
    const draftRead = workflow.nodes.find((item) => item.name === "Read Internal Draft");
    const draftVerify = workflow.nodes.find((item) => item.name === "Draft Contract Verify");
    const claimExtract = workflow.nodes.find((item) => item.name === "Extract Claim Candidates");
    const buildSafeRequest = workflow.nodes.find((item) => item.name === "Build Safe Source Fetch Request");
    const safeRequestCheck = workflow.nodes.find((item) => item.name === "Safe Source Request Check");
    const safePreviewFetch = workflow.nodes.find((item) => item.name === "Fetch Sources via Safe Preview API");
    const safePreviewVerify = workflow.nodes.find((item) => item.name === "Safe Source Preview Contract Verify");
    const safePreviewCheck = workflow.nodes.find((item) => item.name === "Safe Source Preview Contract Check");
    const reviewPreview = workflow.nodes.find((item) => item.name === "Review Engine Dry-Run Preview Output");
    const httpNodes = workflow.nodes.filter((item) => item.type === "n8n-nodes-base.httpRequest");

    expect(workflow.name).toBe("Health Knowhow - Medical Source Review - REVIEW ENGINE DRY RUN");
    expect(workflow.active).toBe(false);
    expect(manualTrigger?.type).toBe("n8n-nodes-base.manualTrigger");
    expect(workflow.nodes.some((item) => item.type === "n8n-nodes-base.webhook")).toBe(false);
    expect(workflow.nodes.some((item) => item.type === "n8n-nodes-base.scheduleTrigger")).toBe(false);
    expect(controlledInput?.type).toBe("n8n-nodes-base.set");
    const assignmentContainer = controlledInput?.parameters?.assignments as { assignments?: Array<{ name: string; type: string; value: unknown }> } | undefined;
    expect(assignmentContainer?.assignments).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "dryRun", type: "boolean", value: true }),
      expect.objectContaining({ name: "contentId", type: "string", value: "819852773404" }),
      expect.objectContaining({ name: "revisionId", type: "string", value: "13" }),
      expect.objectContaining({ name: "locale", type: "string", value: "ko-KR" }),
      expect.objectContaining({ name: "country", type: "string", value: "KR" }),
      expect.objectContaining({ name: "inputMode", type: "string", value: "revision-13-review-engine-dry-run" }),
    ]));

    expect(workflow.connections["Manual Trigger Only"]?.main?.[0]?.[0]).toMatchObject({ node: "Controlled Dry-Run Input" });
    expect(workflow.connections["Controlled Dry-Run Input"]?.main?.[0]?.[0]).toMatchObject({ node: "Input Normalize" });
    expect(workflow.connections["Input Normalize"]?.main?.[0]?.[0]).toMatchObject({ node: "Input Valid Check" });
    expect(workflow.connections["Input Valid Check"]?.main?.[0]?.[0]).toMatchObject({ node: "Read Internal Draft" });
    expect(workflow.connections["Input Valid Check"]?.main?.[1]?.[0]).toMatchObject({ node: "Invalid Input Output" });
    expect(workflow.connections["Draft Contract Check"]?.main?.[0]?.[0]).toMatchObject({ node: "Extract Claim Candidates" });
    expect(workflow.connections["Draft Contract Check"]?.main?.[1]?.[0]).toMatchObject({ node: "Contract Block Output" });
    expect(workflow.connections["Extract Claim Candidates"]?.main?.[0]?.[0]).toMatchObject({ node: "Build Safe Source Fetch Request" });
    expect(workflow.connections["Build Safe Source Fetch Request"]?.main?.[0]?.[0]).toMatchObject({ node: "Safe Source Request Check" });
    expect(workflow.connections["Safe Source Request Check"]?.main?.[0]?.[0]).toMatchObject({ node: "Fetch Sources via Safe Preview API" });
    expect(workflow.connections["Safe Source Request Check"]?.main?.[1]?.[0]).toMatchObject({ node: "Safe Source Request Block Output" });
    expect(workflow.connections["Fetch Sources via Safe Preview API"]?.main?.[0]?.[0]).toMatchObject({ node: "Safe Source Preview Contract Verify" });
    expect(workflow.connections["Safe Source Preview Contract Verify"]?.main?.[0]?.[0]).toMatchObject({ node: "Safe Source Preview Contract Check" });
    expect(workflow.connections["Safe Source Preview Contract Check"]?.main?.[0]?.[0]).toMatchObject({ node: "Review Engine Dry-Run Preview Output" });
    expect(workflow.connections["Safe Source Preview Contract Check"]?.main?.[1]?.[0]).toMatchObject({ node: "Safe Source Preview Block Output" });

    expect(inputCheck).toBeTruthy();
    expect(draftRead).toBeTruthy();
    expect(draftRead?.parameters?.method).toBe("GET");
    expect(draftRead?.parameters?.url).toBe("{{ 'https://health-knowhow.vercel.app/api/internal/content-drafts/' + $json.requestedRevisionId }}");
    expect(String(draftRead?.parameters?.url)).not.toMatch(/^=/);
    expect(draftRead?.parameters?.authentication).toBe("genericCredentialType");
    expect(draftRead?.parameters?.genericAuthType).toBe("httpHeaderAuth");
    expect(JSON.stringify(draftRead?.credentials)).toContain("httpHeaderAuth");
    expect(JSON.stringify(draftRead?.parameters)).not.toContain("Authorization");
    expect(JSON.stringify(draftRead?.parameters)).not.toContain("$env");
    expect(JSON.stringify(draftRead?.parameters)).not.toContain("INTERNAL_CONTENT_DRAFTS_TOKEN");
    expect(JSON.stringify(draftVerify?.parameters)).toContain("draft.success !== true");
    expect(JSON.stringify(draftVerify?.parameters)).toContain("requestedContentId");
    expect(JSON.stringify(draftVerify?.parameters)).toContain("requestedRevisionId");
    expect(JSON.stringify(draftVerify?.parameters)).toContain("draft.revisionStatus !== 'draft'");
    expect(JSON.stringify(draftVerify?.parameters)).toContain("sourceIds.length < 1 || sourceIds.length > 3");
    expect(JSON.stringify(draftVerify?.parameters)).toContain("uniqueSourceIds.size !== sourceIds.length");

    expect(claimExtract).toBeTruthy();
    expect(JSON.stringify(claimExtract?.parameters)).toContain("title");
    expect(JSON.stringify(claimExtract?.parameters)).toContain("summary");
    expect(JSON.stringify(claimExtract?.parameters)).toContain("bodyMarkdown");
    expect(JSON.stringify(claimExtract?.parameters)).toContain("structuredContent");
    expect(JSON.stringify(claimExtract?.parameters)).toContain("candidate_only");
    expect(JSON.stringify(claimExtract?.parameters)).not.toContain("규칙적인 수면 시간이 수면 리듬 안정에 도움");

    expect(buildSafeRequest).toBeTruthy();
    expect(JSON.stringify(buildSafeRequest?.parameters)).toContain("safeSourcePreviewRequest");
    expect(JSON.stringify(buildSafeRequest?.parameters)).toContain("sourceIds: uniqueSourceIds");
    expect(JSON.stringify(buildSafeRequest?.parameters)).toContain("sourceIds must not be empty");
    expect(JSON.stringify(buildSafeRequest?.parameters)).toContain("sourceIds must contain at most 3 items");
    expect(JSON.stringify(buildSafeRequest?.parameters)).toContain("sourceIds must not contain duplicates");
    expect(JSON.stringify(buildSafeRequest?.parameters)).not.toContain("hostname");
    expect(JSON.stringify(buildSafeRequest?.parameters)).not.toContain("claim text");
    expect(JSON.stringify(buildSafeRequest?.parameters)).not.toContain("source text");
    expect(safeRequestCheck).toBeTruthy();

    expect(safePreviewFetch).toBeTruthy();
    expect(safePreviewFetch?.parameters?.method).toBe("POST");
    expect(safePreviewFetch?.parameters?.url).toBe("https://health-knowhow.vercel.app/api/internal/medical-source-review/source-fetch-preview");
    expect(safePreviewFetch?.parameters?.authentication).toBe("genericCredentialType");
    expect(safePreviewFetch?.parameters?.genericAuthType).toBe("httpHeaderAuth");
    expect(JSON.stringify(safePreviewFetch?.credentials)).toContain("Health Knowhow Source Fetch Preview Header Auth");
    expect(safePreviewFetch?.parameters?.sendBody).toBe(true);
    expect(safePreviewFetch?.parameters?.contentType).toBe("json");
    expect(safePreviewFetch?.parameters?.specifyBody).toBe("form");
    const bodyParameters = safePreviewFetch?.parameters?.bodyParameters as { parameters?: Array<{ name: string; value: string }> } | undefined;
    expect(bodyParameters?.parameters).toEqual([
      { name: "dryRun", value: "{{ true }}" },
      { name: "contentId", value: "{{ $json.safeSourcePreviewRequest.contentId }}" },
      { name: "revisionId", value: "{{ $json.safeSourcePreviewRequest.revisionId }}" },
      { name: "sourceIds", value: "{{ $json.safeSourcePreviewRequest.sourceIds }}" },
    ]);
    expect(JSON.stringify(safePreviewFetch?.parameters)).toContain("safeSourcePreviewRequest");
    expect(JSON.stringify(safePreviewFetch?.parameters)).not.toContain("JSON.stringify");
    expect(JSON.stringify(safePreviewFetch?.parameters)).not.toContain("jsonBody");
    expect(JSON.stringify(safePreviewFetch?.parameters)).not.toContain("Authorization");
    expect(JSON.stringify(safePreviewFetch?.parameters)).not.toContain("$env");
    expect(JSON.stringify(safePreviewFetch?.parameters)).not.toContain("INTERNAL_SOURCE_FETCH_PREVIEW_TOKEN");
    expect(safePreviewFetch?.continueOnFail).toBe(true);
    expect(httpNodes).toHaveLength(2);
    expect(httpNodes.map((item) => item.parameters?.method)).toEqual(["GET", "POST"]);
    expect(httpNodes.map((item) => item.parameters?.url)).toEqual([
      "{{ 'https://health-knowhow.vercel.app/api/internal/content-drafts/' + $json.requestedRevisionId }}",
      "https://health-knowhow.vercel.app/api/internal/medical-source-review/source-fetch-preview",
    ]);

    expect(safePreviewVerify).toBeTruthy();
    expect(JSON.stringify(safePreviewVerify?.parameters)).toContain("response.success !== true");
    expect(JSON.stringify(safePreviewVerify?.parameters)).toContain("response.persisted !== false");
    expect(JSON.stringify(safePreviewVerify?.parameters)).toContain("response.persistable !== false");
    expect(JSON.stringify(safePreviewVerify?.parameters)).toContain("response.sourceVerificationExecuted !== false");
    expect(JSON.stringify(safePreviewVerify?.parameters)).toContain("fullHtml");
    expect(JSON.stringify(safePreviewVerify?.parameters)).toContain("rawHtml");
    expect(JSON.stringify(safePreviewVerify?.parameters)).toContain("extractedSourceText");
    expect(JSON.stringify(safePreviewVerify?.parameters)).toContain("fullSourceText");
    expect(JSON.stringify(safePreviewVerify?.parameters)).toContain("write sideEffect");
    expect(JSON.stringify(safePreviewVerify?.parameters)).toContain("externalSourceGetsCalled");
    expect(safePreviewCheck).toBeTruthy();

    expect(reviewPreview).toBeTruthy();
    expect(JSON.stringify(reviewPreview?.parameters)).toContain("reviewEngineExecuted: false");
    expect(JSON.stringify(reviewPreview?.parameters)).toContain("sourceFetchExecuted: true");
    expect(JSON.stringify(reviewPreview?.parameters)).toContain("sourceVerificationExecuted: false");
    expect(JSON.stringify(reviewPreview?.parameters)).toContain("deterministicMatchingPreviewExecuted");
    expect(JSON.stringify(reviewPreview?.parameters)).toContain("claimSourceMatchingExecuted: false");
    expect(JSON.stringify(reviewPreview?.parameters)).toContain("persistableCandidate: false");
    expect(JSON.stringify(reviewPreview?.parameters)).toContain("const approvedClaimIds = []");
    expect(JSON.stringify(reviewPreview?.parameters)).toContain("persistable: false");
    expect(JSON.stringify(reviewPreview?.parameters)).toContain("persisted: false");
    expect(JSON.stringify(reviewPreview?.parameters)).toContain("canonicalMaterialPreview: null");
    expect(JSON.stringify(reviewPreview?.parameters)).toContain("payloadFingerprintPreview: null");
    expect(JSON.stringify(reviewPreview?.parameters)).toContain("reviewSummary");
    expect(serialized).toContain("claimMatchPreviews");
    expect(serialized).toContain("sourceFetchPreviews");
    expect(serialized).toContain("requiredChanges");
    expect(serialized).toContain("ko-KR");
    expect(serialized).toContain("Safe source fetch preview is not source verification");
    expect(serialized).toContain("Failed source fetch previews are preserved");
    expect(workflow.settings?.saveDataSuccessExecution).toBe("none");
    expect(workflow.settings?.saveDataErrorExecution).toBe("none");
    expect(serialized).not.toContain("$env");
    expect(serialized).not.toContain("Bearer ");
    expect(JSON.stringify(claimExtract?.parameters)).toContain("looksLikeClaim");

    expect(serialized).not.toContain("/api/internal/medical-source-review/results");
    expect(serialized).not.toContain("/api/internal/content-workflow/medical-review-complete");
    expect(serialized).not.toContain("/api/internal/admin/notifications");
    expect(serialized).not.toContain("save_medical_source_review_result_atomic");
    expect(serialized).not.toContain("Supabase write");
    expect(serialized).not.toContain("published_contents");
    expect(serialized).not.toContain("website_publish_queue");
    expect(serialized).not.toContain("content_publications");
    expect(serialized).not.toContain("content_approvals");
    expect(serialized).not.toContain("storage.objects");
  });

  it("n8n review-engine dry-run workflow code nodes compile and keep UTF-8 Korean claim extraction", () => {
    type N8nWorkflow = {
      nodes: Array<{ name: string; type: string; parameters?: { jsCode?: string } }>;
    };
    const workflowText = readFileSync(join(process.cwd(), "n8n/health-knowhow-medical-source-review-engine-dry-run.json"), "utf8");
    const workflow = JSON.parse(workflowText) as N8nWorkflow;
    const codeNodes = workflow.nodes.filter((item) => item.type === "n8n-nodes-base.code");

    expect(workflowText).not.toContain("\uFFFD");
    expect(workflowText).not.toContain("?섎즺");
    expect(workflowText).not.toContain("移댄럹");
    expect(workflowText).not.toContain("?섎㈃");
    expect(workflowText).toContain("의료진|상담|병원|진료|코골이|호흡|불면|주간 졸림");
    expect(workflowText).toContain("카페인|스마트폰|화면|취침|기상|침실|수면|숙면");
    expect(workflowText).toContain("수면|숙면|불면|졸림|코골이|호흡|카페인");

    expect(codeNodes.length).toBeGreaterThan(0);
    for (const node of codeNodes) {
      expect(node.parameters?.jsCode, `${node.name} should define jsCode`).toEqual(expect.any(String));
      expect(() => new Function("$json", "$node", "$input", node.parameters?.jsCode ?? "")).not.toThrow();
    }

    const claimExtract = workflow.nodes.find((item) => item.name === "Extract Claim Candidates");
    const executeClaimExtraction = new Function("$json", "$node", "$input", claimExtract?.parameters?.jsCode ?? "") as (
      json: Record<string, unknown>,
      node: Record<string, unknown>,
      input: Record<string, unknown>,
    ) => Array<{ json: { claimCandidates: Array<Record<string, unknown>> } }>;
    const fixtureSentences = [
      "매일 비슷한 시간에 자고 일어나는 습관은 수면 리듬을 안정시키는 데 도움이 됩니다.",
      "침실은 어둡고 조용하며 편안한 온도로 유지하는 것이 좋습니다.",
      "오후 늦은 카페인 조절이 수면에 도움이 될 수 있습니다.",
      "잠들기 전 화면 사용을 줄이는 것이 도움이 될 수 있습니다.",
      "불면이 오래 지속되거나 코골이, 호흡 멈춤이 있으면 의료진 상담이 필요합니다.",
    ];
    const fixtureText = fixtureSentences.join("\n");
    const fixtureSummary = "수면 리듬을 안정시키는 생활습관은 숙면에 도움이 됩니다.";
    const allInputText = ["숙면을 돕는 기본적인 수면 습관", fixtureSummary, fixtureText].join("\n");
    const result = executeClaimExtraction({
      title: "숙면을 돕는 기본적인 수면 습관",
      summary: fixtureSummary,
      bodyMarkdown: fixtureText,
      structuredContent: [],
      sources: [{ sourceId: "source-001" }, { sourceId: "source-002" }, { sourceId: "source-003" }],
    }, {}, {});
    const claimCandidates = result[0]?.json.claimCandidates ?? [];
    const claimIds = claimCandidates.map((claim) => claim.claimId);
    const serializedClaims = JSON.stringify(claimCandidates);

    expect(claimCandidates.length).toBeGreaterThan(0);
    for (const claim of claimCandidates) {
      expect(allInputText).toContain(String(claim.originalText));
      expect(claim.reviewStatus).toBe("candidate_only");
      expect(String(claim.originalText)).toMatch(/[가-힣]/);
      expect(String(claim.normalizedClaim)).toMatch(/[가-힣]/);
    }
    expect(new Set(claimIds).size).toBe(claimIds.length);
    expect(claimCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ claimType: "doctor-visit", riskLevel: "medium" }),
      expect.objectContaining({ claimType: "lifestyle-advice", riskLevel: "low" }),
    ]));
    expect(serializedClaims).toContain("의료진 상담");
    expect(serializedClaims).toContain("수면");
    expect(serializedClaims).not.toContain("approved");
    expect(serializedClaims).not.toContain("verified");
    expect(serializedClaims).not.toContain("final");
    expect(serializedClaims).not.toContain("\uFFFD");
  });
});

function jsonRequest(payload: unknown, bearerToken: string | undefined): Request {
  return new Request("http://localhost/api/internal/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
}
