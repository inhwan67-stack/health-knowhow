import { describe, expect, it } from "vitest";

import { processCollectionProviderResults } from "./contentCollectionApplication";
import { createCollectionStorageCommands } from "./contentCollectionStorageCommand";
import { executeNaverDatalabSearchTrend } from "./naverDatalabHttpClient";
import {
  mapNaverDatalabResponseToTrendCandidates,
  type NaverDatalabSearchTrendRequest,
} from "./naverDatalabTrendProvider";

const providerId = "naver-datalab";
const siteId = "site-health-knowhow";
const liveDryRunEnabled = process.env.NAVER_DATALAB_LIVE_DRY_RUN === "1";

const describeLiveDryRun = liveDryRunEnabled ? describe : describe.skip;

describeLiveDryRun("Naver DataLab local live dry-run", () => {
  it("connects the real Naver API response through the collection pipeline without DB writes", async () => {
    const clientId = process.env.NAVER_DATALAB_CLIENT_ID;
    const clientSecret = process.env.NAVER_DATALAB_CLIENT_SECRET;
    const collectedAt = new Date().toISOString();
    const request = createBloodSugarTrendRequest();

    expect(clientId, "NAVER_DATALAB_CLIENT_ID must be set in the current PowerShell session.").toBeTruthy();
    expect(clientSecret, "NAVER_DATALAB_CLIENT_SECRET must be set in the current PowerShell session.").toBeTruthy();

    const httpResult = await executeNaverDatalabSearchTrend({
      credentials: {
        clientId: clientId!,
        clientSecret: clientSecret!,
      },
      request,
      occurredAt: collectedAt,
    });

    if (!httpResult.ok) {
      console.log(
        JSON.stringify(
          {
            ok: false,
            providerId,
            request: summarizeRequest(request),
            providerError: {
              code: httpResult.error.code,
              message: httpResult.error.message,
              httpStatus: httpResult.error.httpStatus,
              retryable: httpResult.error.retryable,
            },
            rawApiPayloadLogged: false,
            secretsLogged: false,
          },
          null,
          2,
        ),
      );
    }

    expect(httpResult.ok).toBe(true);
    if (!httpResult.ok) {
      return;
    }

    const normalizedResult = mapNaverDatalabResponseToTrendCandidates({
      request,
      response: httpResult.response,
      siteId,
      collectedAt,
    });
    const pipelineResult = processCollectionProviderResults({
      trendResults: [normalizedResult],
    });
    const storageCommandBatch = createCollectionStorageCommands({
      result: pipelineResult,
      operationIdForCandidate: (candidate, index) =>
        [
          "live-dry-run",
          candidate.kind,
          candidate.candidate.provenance.providerId,
          index + 1,
          collectedAt,
        ].join(":"),
    });

    const acceptedTopics = pipelineResult.accepted
      .filter((candidate) => candidate.kind === "topic")
      .map((candidate) => ({
        outcome: candidate.outcome,
        name: candidate.candidate.domain.name,
        trendScore: candidate.candidate.domain.trendScore,
        warnings: candidate.warnings.map((warning) => warning.code),
      }));

    const rejectedTopics = pipelineResult.rejected.map((candidate) => ({
      kind: candidate.kind,
      duplicateKey: candidate.duplicateKey,
      validationCodes: candidate.validation.invalid.map((issue) => issue.code),
      reasons: candidate.validation.invalid.map((issue) => issue.reason),
    }));

    console.log(
      JSON.stringify(
        {
          ok: normalizedResult.ok,
          providerId,
          request: summarizeRequest(request),
          httpStatus: httpResult.httpStatus,
          responseShape: summarizeNaverResponse(httpResult.response),
          normalizedCandidateCount: normalizedResult.ok ? normalizedResult.data.length : 0,
        sourceCandidateCount: 0,
        summary: pipelineResult.summary,
        topicCandidates: acceptedTopics,
        storageCommandSummary: {
          commandCount: storageCommandBatch.commands.length,
          skippedRejectedCount: storageCommandBatch.skippedRejectedCount,
          skippedProviderErrorCount: storageCommandBatch.skippedProviderErrorCount,
          commands: storageCommandBatch.commands.map((command) => ({
            kind: command.kind,
            target: command.kind === "topic_candidate_storage" ? "topic" : "source",
            providerId: command.provenance.providerId,
            duplicateKey: command.provenance.duplicateKey,
            operationIdPresent: Boolean(command.operationId),
            fingerprintPresent: Boolean(command.fingerprint),
            fingerprintPreview: maskFingerprint(command.fingerprint),
            topic:
              command.kind === "topic_candidate_storage"
                ? {
                    name: command.topic.name,
                    trendScore: command.topic.trendScore,
                  }
                : undefined,
          })),
        },
        rejected: rejectedTopics,
        providerErrors: pipelineResult.providerErrors.map((failure) => ({
            providerId: failure.providerId,
            code: failure.error.code,
            message: failure.error.message,
          })),
          rawApiPayloadLogged: false,
          secretsLogged: false,
        },
        null,
        2,
      ),
    );

    expect(normalizedResult.ok).toBe(true);
    expect(pipelineResult.summary.providerErrorCount).toBe(0);
    expect(pipelineResult.summary.rejectedCount).toBe(0);
    expect(pipelineResult.summary.acceptedCount + pipelineResult.summary.warningCount).toBeGreaterThan(0);
    expect(acceptedTopics.every((topic) => topic.name && typeof topic.trendScore === "number")).toBe(true);
    expect(storageCommandBatch.commands).toHaveLength(pipelineResult.accepted.length);
    expect(storageCommandBatch.commands.every((command) => command.kind === "topic_candidate_storage")).toBe(true);
    expect(storageCommandBatch.commands.every((command) => command.operationId && command.fingerprint)).toBe(true);
  });
});

function createBloodSugarTrendRequest(): NaverDatalabSearchTrendRequest {
  const { startDate, endDate } = getDryRunWindow();

  return {
    startDate,
    endDate,
    timeUnit: "date",
    keywordGroups: [
      {
        groupName: "혈당 관리",
        keywords: ["혈당 스파이크", "공복 혈당", "식후 혈당"],
      },
    ],
  };
}

function getDryRunWindow(): { startDate: string; endDate: string } {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 13);

  return {
    startDate: toDateString(start),
    endDate: toDateString(end),
  };
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function maskFingerprint(fingerprint: string): string {
  return `${fingerprint.slice(0, 24)}...len:${fingerprint.length}`;
}

function summarizeRequest(input: NaverDatalabSearchTrendRequest): {
  startDate: string;
  endDate: string;
  timeUnit: string;
  keywordGroups: Array<{ groupName: string; keywords: string[] }>;
} {
  return {
    startDate: input.startDate,
    endDate: input.endDate,
    timeUnit: input.timeUnit,
    keywordGroups: input.keywordGroups.map((group) => ({
      groupName: group.groupName,
      keywords: group.keywords,
    })),
  };
}

function summarizeNaverResponse(response: {
  startDate: string;
  endDate: string;
  timeUnit: string;
  results: Array<{ data: unknown[] }>;
}): {
  startDate: string;
  endDate: string;
  timeUnit: string;
  resultCount: number;
  dataPointCount: number;
} {
  return {
    startDate: response.startDate,
    endDate: response.endDate,
    timeUnit: response.timeUnit,
    resultCount: Array.isArray(response.results) ? response.results.length : 0,
    dataPointCount: Array.isArray(response.results)
      ? response.results.reduce((sum, result) => sum + (Array.isArray(result.data) ? result.data.length : 0), 0)
      : 0,
  };
}
