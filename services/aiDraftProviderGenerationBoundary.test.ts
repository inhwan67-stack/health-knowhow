import { describe, expect, it, vi } from "vitest";

import {
  AI_DRAFT_PROVIDER_GENERATION_CAPABILITY,
  AI_DRAFT_PROVIDER_GENERATION_TRUST_TIER,
  generateAiDraftWithProviderBoundary,
  type AiDraftProviderGenerationAdapterRequest,
  type AiDraftProviderGenerationCandidate,
  type AiDraftProviderGenerationDependencies,
  type AiDraftProviderGenerationRequest,
  type AiDraftProviderGenerationResult,
} from "./aiDraftProviderGenerationBoundary";

const VALID_HASH = "b".repeat(64);

type MutableAiDraftProviderGenerationRequest = {
  -readonly [K in keyof AiDraftProviderGenerationRequest]: AiDraftProviderGenerationRequest[K];
};

function request(overrides: Partial<AiDraftProviderGenerationRequest> = {}): AiDraftProviderGenerationRequest {
  return {
    requestId: "draft-provider-request-1",
    payloadFingerprint: VALID_HASH,
    locale: "ko-KR",
    country: "KR",
    sourceIds: Object.freeze(["source-1"]),
    capability: AI_DRAFT_PROVIDER_GENERATION_CAPABILITY,
    ...overrides,
  };
}

function candidate(overrides: Partial<AiDraftProviderGenerationCandidate> = {}): AiDraftProviderGenerationCandidate {
  const providerId = overrides.providerId ?? "fake-ai-draft-provider";
  return {
    providerId,
    capability: AI_DRAFT_PROVIDER_GENERATION_CAPABILITY,
    approvedForSelection: true,
    trustTier: AI_DRAFT_PROVIDER_GENERATION_TRUST_TIER,
    executionBoundary: {
      providerId,
      capability: AI_DRAFT_PROVIDER_GENERATION_CAPABILITY,
      trustTier: AI_DRAFT_PROVIDER_GENERATION_TRUST_TIER,
      adapterExecutionAllowed: true,
    },
    ...overrides,
  };
}

function draftCandidate() {
  return {
    title: "Blood pressure basics",
    slug: "blood-pressure-basics",
    summary: "Manual review draft only.",
    body: "Review blood pressure changes with a licensed clinician before changing care.",
    tags: Object.freeze(["blood-pressure", "review"]),
  };
}

function adapterOutput(overrides: Record<string, unknown> = {}) {
  return {
    candidate: draftCandidate(),
    outputReference: {
      providerId: "fake-ai-draft-provider",
      capability: AI_DRAFT_PROVIDER_GENERATION_CAPABILITY,
      referenceId: "safe-output-ref-1",
    },
    ...overrides,
  };
}

function dependencies(
  selectedCandidate: AiDraftProviderGenerationCandidate | null,
  adapterResult: unknown = adapterOutput(),
): AiDraftProviderGenerationDependencies & {
  resolveCandidate: ReturnType<typeof vi.fn>;
  executeAdapter: ReturnType<typeof vi.fn>;
} {
  return {
    resolveCandidate: vi.fn(async () => selectedCandidate),
    executeAdapter: vi.fn(async () => adapterResult),
  };
}

function expectSafeManualReviewOnly(result: AiDraftProviderGenerationResult) {
  expect(result.manualReviewRequired).toBe(true);
  expect(result.finalApprovalGranted).toBe(false);
  expect(result.persistable).toBe(false);
  expect(result.publishable).toBe(false);
  expect(result.publicationTriggered).toBe(false);
  expect(result.notificationSent).toBe(false);
  expect(result.medicalVerificationCompleted).toBe(false);
  expect(result.databaseWritten).toBe(false);
  expect(result.storageWritten).toBe(false);
  expect(result.n8nTriggered).toBe(false);
  expect(result.failClosed).toBe(true);
  expect(result.retryAttempted).toBe(false);
  expect(result.fallbackAttempted).toBe(false);
  expect(result.sideEffects).toEqual({
    databaseWritten: false,
    storageWritten: false,
    n8nTriggered: false,
    publicationTriggered: false,
    notificationSent: false,
    providerApiCalled: false,
  });
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.sideEffects)).toBe(true);
}

function expectFailClosed(result: AiDraftProviderGenerationResult) {
  expect(result.generated).toBe(false);
  expect(result.payload).toBeNull();
  expect(result.outputReference).toBeNull();
  expectSafeManualReviewOnly(result);
}

function expectRequestInvalid(result: AiDraftProviderGenerationResult, deps: ReturnType<typeof dependencies>) {
  expectFailClosed(result);
  expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_REQUEST_INVALID");
  expect(result.selectedProviderId).toBeNull();
  expect(deps.resolveCandidate).not.toHaveBeenCalled();
  expect(deps.executeAdapter).not.toHaveBeenCalled();
}

describe("generateAiDraftWithProviderBoundary", () => {
  it("fails closed for the wrong capability without resolving or calling the adapter", async () => {
    const deps = dependencies(candidate());

    const result = await generateAiDraftWithProviderBoundary(request({ capability: "ai_medical_review" }), deps);

    expectFailClosed(result);
    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_CAPABILITY_INVALID");
    expect(result.capability).toBeNull();
    expect(deps.resolveCandidate).not.toHaveBeenCalled();
    expect(deps.executeAdapter).not.toHaveBeenCalled();
  });

  it("fails closed before resolver execution when request is undefined", async () => {
    const deps = dependencies(candidate());

    const result = await generateAiDraftWithProviderBoundary(undefined, deps);

    expectRequestInvalid(result, deps);
  });

  it.each([null, "request", 7, true, []])(
    "fails closed before resolver execution for primitive, null, or array requests: %p",
    async (value) => {
      const deps = dependencies(candidate());

      const result = await generateAiDraftWithProviderBoundary(value, deps);

      expectRequestInvalid(result, deps);
    },
  );

  it("fails closed before resolver execution for class instance and custom prototype requests", async () => {
    class RequestClass {
      requestId = "draft-provider-request-1";
      payloadFingerprint = VALID_HASH;
      locale = "ko-KR";
      country = "KR";
      sourceIds = ["source-1"];
      capability = AI_DRAFT_PROVIDER_GENERATION_CAPABILITY;
    }
    const customPrototype = Object.create({ inherited: true });
    Object.assign(customPrototype, request());

    for (const value of [new RequestClass(), customPrototype]) {
      const deps = dependencies(candidate());

      const result = await generateAiDraftWithProviderBoundary(value, deps);

      expectRequestInvalid(result, deps);
    }
  });

  it("fails closed for request accessor properties without invoking getters or leaking secrets", async () => {
    const deps = dependencies(candidate());
    const accessor = { ...request() };
    Object.defineProperty(accessor, "requestId", {
      get: () => {
        throw new Error("getter secret https://request.example");
      },
      enumerable: true,
    });

    const result = await generateAiDraftWithProviderBoundary(accessor, deps);

    expectRequestInvalid(result, deps);
    expect(JSON.stringify(result)).not.toMatch(/getter|secret|https|request\.example/);
  });

  it("fails closed for request capability throwing Proxy without rejecting or leaking traps", async () => {
    const deps = dependencies(candidate());
    const trappedRequest = new Proxy(request(), {
      getOwnPropertyDescriptor(target, property) {
        if (property === "capability") throw new Error("capability trap secret stack");
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
    });

    const result = await generateAiDraftWithProviderBoundary(trappedRequest, deps);

    expectRequestInvalid(result, deps);
    expect(JSON.stringify(result)).not.toMatch(/capability trap|secret|stack/);
  });

  it("fails closed for request sourceIds throwing getter and Proxy without rejecting", async () => {
    const accessor = { ...request() };
    Object.defineProperty(accessor, "sourceIds", {
      get: () => {
        throw new Error("sourceIds getter secret");
      },
      enumerable: true,
    });
    const trappedSourceIds = new Proxy(["source-1"], {
      ownKeys() {
        throw new Error("sourceIds trap secret");
      },
    });

    for (const value of [accessor, request({ sourceIds: trappedSourceIds })]) {
      const deps = dependencies(candidate());

      const result = await generateAiDraftWithProviderBoundary(value, deps);

      expectRequestInvalid(result, deps);
      expect(JSON.stringify(result)).not.toMatch(/sourceIds|getter|trap|secret/);
    }
  });

  it("fails closed before resolver execution for request symbol keys and extra keys", async () => {
    for (const value of [{ ...request(), [Symbol("secret")]: "hidden" }, { ...request(), extra: "field" }]) {
      const deps = dependencies(candidate());

      const result = await generateAiDraftWithProviderBoundary(value, deps);

      expectRequestInvalid(result, deps);
    }
  });

  it.each([
    ["invalid requestId", { requestId: "" }],
    ["invalid fingerprint", { payloadFingerprint: "A".repeat(64) }],
    ["invalid locale", { locale: "ko_kr" }],
    ["invalid country", { country: "kr" }],
    ["empty sourceIds", { sourceIds: [] }],
    ["unsafe sourceId", { sourceIds: ["source id"] }],
    ["duplicate sourceId", { sourceIds: ["source-1", "source-1"] }],
    ["credential sourceId", { sourceIds: ["Bearer abcdefghijklmnopqrstuvwxyz123456"] }],
  ])("fails closed before resolver execution for invalid request context: %s", async (_label, overrides) => {
    const deps = dependencies(candidate());

    const result = await generateAiDraftWithProviderBoundary(request(overrides), deps);

    expectRequestInvalid(result, deps);
  });

  it("fails closed before resolver execution for sparse sourceIds and sourceIds descriptor traps", async () => {
    const sparseSourceIds = ["source-1"];
    sparseSourceIds.length = 2;
    const accessorSourceIds = ["source-1"];
    Object.defineProperty(accessorSourceIds, "0", {
      get: () => "source-1",
      enumerable: true,
    });
    const descriptorTrapSourceIds = new Proxy(["source-1"], {
      getOwnPropertyDescriptor() {
        throw new Error("source descriptor trap secret");
      },
    });

    for (const sourceIds of [sparseSourceIds, accessorSourceIds, descriptorTrapSourceIds]) {
      const deps = dependencies(candidate());

      const result = await generateAiDraftWithProviderBoundary(request({ sourceIds }), deps);

      expectRequestInvalid(result, deps);
      expect(JSON.stringify(result)).not.toMatch(/descriptor|trap|secret/);
    }
  });

  it("uses only the request snapshot for resolver, adapter, and candidate validation", async () => {
    const mutableRequest: MutableAiDraftProviderGenerationRequest = {
      requestId: "draft-provider-request-1",
      payloadFingerprint: VALID_HASH,
      locale: "ko-KR",
      country: "KR",
      sourceIds: ["source-1"],
      capability: AI_DRAFT_PROVIDER_GENERATION_CAPABILITY,
    };
    const deps = dependencies(candidate());
    deps.resolveCandidate.mockImplementationOnce(async (resolverRequest) => {
      expect(resolverRequest).toEqual({
        requestId: "draft-provider-request-1",
        payloadFingerprint: VALID_HASH,
        capability: AI_DRAFT_PROVIDER_GENERATION_CAPABILITY,
      });
      mutableRequest.requestId = "mutated-request";
      mutableRequest.payloadFingerprint = "c".repeat(64);
      mutableRequest.locale = "en-US";
      mutableRequest.country = "US";
      mutableRequest.sourceIds = ["mutated-source"];
      return candidate();
    });

    const result = await generateAiDraftWithProviderBoundary(mutableRequest, deps);

    expect(result.generated).toBe(true);
    expect(result.payload?.requestId).toBe("draft-provider-request-1");
    expect(result.payload?.payloadFingerprint).toBe(VALID_HASH);
    expect(result.payload?.locale).toBe("ko-KR");
    expect(result.payload?.country).toBe("KR");
    expect(result.payload?.sourceIds).toEqual(["source-1"]);
    const adapterRequest = deps.executeAdapter.mock.calls[0]?.[0] as AiDraftProviderGenerationAdapterRequest;
    expect(adapterRequest.requestId).toBe("draft-provider-request-1");
    expect(adapterRequest.payloadFingerprint).toBe(VALID_HASH);
    expect(adapterRequest.locale).toBe("ko-KR");
    expect(adapterRequest.country).toBe("KR");
    expect(adapterRequest.sourceIds).toEqual(["source-1"]);
    expect(Object.isFrozen(adapterRequest.sourceIds)).toBe(true);
  });

  it("fails closed when the resolver returns no candidate", async () => {
    const deps = dependencies(null);

    const result = await generateAiDraftWithProviderBoundary(request(), deps);

    expectFailClosed(result);
    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_NO_CANDIDATE");
    expect(deps.resolveCandidate).toHaveBeenCalledTimes(1);
    expect(deps.executeAdapter).not.toHaveBeenCalled();
  });

  it("fails closed when the candidate capability mismatches", async () => {
    const deps = dependencies(candidate({ capability: "ai_medical_review" }));

    const result = await generateAiDraftWithProviderBoundary(request(), deps);

    expectFailClosed(result);
    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_CANDIDATE_CAPABILITY_MISMATCH");
    expect(result.selectedProviderId).toBe("fake-ai-draft-provider");
    expect(deps.executeAdapter).not.toHaveBeenCalled();
  });

  it("fails closed when the candidate is not approved for selection", async () => {
    const deps = dependencies(candidate({ approvedForSelection: false }));

    const result = await generateAiDraftWithProviderBoundary(request(), deps);

    expectFailClosed(result);
    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_PROVIDER_NOT_APPROVED");
    expect(deps.executeAdapter).not.toHaveBeenCalled();
  });

  it("fails closed when the candidate trust tier is not medical review approved", async () => {
    const deps = dependencies(candidate({ trustTier: "trusted_service" }));

    const result = await generateAiDraftWithProviderBoundary(request(), deps);

    expectFailClosed(result);
    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_TRUST_TIER_BLOCKED");
    expect(deps.executeAdapter).not.toHaveBeenCalled();
  });

  it("fails closed when execution boundary metadata is missing", async () => {
    const deps = dependencies(candidate({ executionBoundary: null }));

    const result = await generateAiDraftWithProviderBoundary(request(), deps);

    expectFailClosed(result);
    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_EXECUTION_BOUNDARY_MISSING");
    expect(deps.executeAdapter).not.toHaveBeenCalled();
  });

  it("calls the injected fake adapter exactly once for a valid fake candidate", async () => {
    const deps = dependencies(candidate());

    const result = await generateAiDraftWithProviderBoundary(request(), deps);

    expect(result.generated).toBe(true);
    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_READY_FOR_MANUAL_REVIEW");
    expect(result.payload).toMatchObject({
      requestId: "draft-provider-request-1",
      payloadFingerprint: VALID_HASH,
      title: "Blood pressure basics",
      slug: "blood-pressure-basics",
      manualReviewRequired: true,
      finalApprovalGranted: false,
      persistable: false,
      publishable: false,
      publicationTriggered: false,
      notificationSent: false,
      medicalVerificationCompleted: false,
      failClosed: true,
    });
    expect(result.outputReference).toEqual({
      providerId: "fake-ai-draft-provider",
      capability: AI_DRAFT_PROVIDER_GENERATION_CAPABILITY,
      referenceId: "safe-output-ref-1",
    });
    expectSafeManualReviewOnly(result);
    expect(deps.executeAdapter).toHaveBeenCalledTimes(1);
    expect(deps.executeAdapter).toHaveBeenCalledWith({
      requestId: "draft-provider-request-1",
      payloadFingerprint: VALID_HASH,
      locale: "ko-KR",
      country: "KR",
      sourceIds: ["source-1"],
      capability: AI_DRAFT_PROVIDER_GENERATION_CAPABILITY,
      providerId: "fake-ai-draft-provider",
      executionBoundary: {
        providerId: "fake-ai-draft-provider",
        capability: AI_DRAFT_PROVIDER_GENERATION_CAPABILITY,
        trustTier: AI_DRAFT_PROVIDER_GENERATION_TRUST_TIER,
        adapterExecutionAllowed: true,
      },
    } satisfies AiDraftProviderGenerationAdapterRequest);
  });

  it("converts an adapter exception into a structured fail-closed result without retry or fallback", async () => {
    const deps = dependencies(candidate());
    deps.executeAdapter.mockRejectedValueOnce(new Error("Authorization Bearer secret https://evil.example"));

    const result = await generateAiDraftWithProviderBoundary(request(), deps);

    expectFailClosed(result);
    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_ADAPTER_EXCEPTION");
    expect(result.retryAttempted).toBe(false);
    expect(result.fallbackAttempted).toBe(false);
    expect(deps.executeAdapter).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toMatch(/Authorization|Bearer|secret|evil/);
  });

  it("fails closed when adapter output is structurally invalid", async () => {
    const deps = dependencies(candidate(), {
      candidate: draftCandidate(),
      outputReference: {
        providerId: "fake-ai-draft-provider",
        capability: AI_DRAFT_PROVIDER_GENERATION_CAPABILITY,
        referenceId: "safe-output-ref-1",
        rawProviderResult: "Authorization Bearer secret",
      },
    });

    const result = await generateAiDraftWithProviderBoundary(request(), deps);

    expectFailClosed(result);
    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_ADAPTER_OUTPUT_INVALID");
    expect(deps.executeAdapter).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toMatch(/Authorization|Bearer|secret|rawProviderResult/);
  });

  it("propagates only safe output references without raw secret or internal metadata", async () => {
    const deps = dependencies(
      candidate(),
      adapterOutput({
        outputReference: {
          providerId: "fake-ai-draft-provider",
          capability: AI_DRAFT_PROVIDER_GENERATION_CAPABILITY,
          referenceId: "safe-output-ref-2",
        },
      }),
    );

    const result = await generateAiDraftWithProviderBoundary(request(), deps);

    expect(result.outputReference).toEqual({
      providerId: "fake-ai-draft-provider",
      capability: AI_DRAFT_PROVIDER_GENERATION_CAPABILITY,
      referenceId: "safe-output-ref-2",
    });
    expect(JSON.stringify(result)).not.toMatch(/rawProviderResult|Authorization|Bearer|secret|stack|internalMetadata/);
  });

  it("keeps every result side-effect flag false", async () => {
    const results = await Promise.all([
      generateAiDraftWithProviderBoundary(request({ capability: "notification" }), dependencies(candidate())),
      generateAiDraftWithProviderBoundary(request(), dependencies(null)),
      generateAiDraftWithProviderBoundary(request(), dependencies(candidate({ approvedForSelection: false }))),
      generateAiDraftWithProviderBoundary(request(), dependencies(candidate())),
    ]);

    for (const result of results) {
      expectSafeManualReviewOnly(result);
    }
  });

  it("never calls the adapter more than once for success, invalid output, or thrown failures", async () => {
    const success = dependencies(candidate());
    const invalid = dependencies(candidate(), { invalid: true });
    const thrown = dependencies(candidate());
    thrown.executeAdapter.mockRejectedValueOnce(new Error("provider unavailable"));

    await generateAiDraftWithProviderBoundary(request(), success);
    await generateAiDraftWithProviderBoundary(request(), invalid);
    await generateAiDraftWithProviderBoundary(request(), thrown);

    expect(success.executeAdapter).toHaveBeenCalledTimes(1);
    expect(invalid.executeAdapter).toHaveBeenCalledTimes(1);
    expect(thrown.executeAdapter).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the resolver throws synchronously without exposing raw errors", async () => {
    const deps = dependencies(null);
    deps.resolveCandidate.mockImplementationOnce(() => {
      throw new Error("Authorization Bearer secret https://evil.example");
    });

    const result = await generateAiDraftWithProviderBoundary(request(), deps);

    expectFailClosed(result);
    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_RESOLVER_EXCEPTION");
    expect(deps.executeAdapter).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(/Authorization|Bearer|secret|evil|https/);
  });

  it("fails closed when the resolver rejects without calling the adapter", async () => {
    const deps = dependencies(null);
    deps.resolveCandidate.mockRejectedValueOnce(new Error("resolver unavailable"));

    const result = await generateAiDraftWithProviderBoundary(request(), deps);

    expectFailClosed(result);
    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_RESOLVER_EXCEPTION");
    expect(deps.executeAdapter).not.toHaveBeenCalled();
  });

  it.each([undefined, "candidate", 7, true, [], { ...candidate(), extra: "field" }])(
    "fails closed for malformed resolver candidates without rejecting: %p",
    async (value) => {
      const deps = dependencies(value as AiDraftProviderGenerationCandidate);

      const result = await generateAiDraftWithProviderBoundary(request(), deps);

      expectFailClosed(result);
      expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_CANDIDATE_INVALID");
      expect(deps.executeAdapter).not.toHaveBeenCalled();
    },
  );

  it("fails closed for class, custom prototype, symbol key, and accessor resolver candidates", async () => {
    class CandidateClass {
      providerId = "fake-ai-draft-provider";
      capability = AI_DRAFT_PROVIDER_GENERATION_CAPABILITY;
      approvedForSelection = true;
      trustTier = AI_DRAFT_PROVIDER_GENERATION_TRUST_TIER;
      executionBoundary = candidate().executionBoundary;
    }
    const customPrototype = Object.create({ inherited: true });
    Object.assign(customPrototype, candidate());
    const symbolKey = { ...candidate(), [Symbol("secret")]: "hidden" };
    const accessor = { ...candidate() };
    Object.defineProperty(accessor, "providerId", {
      get: () => "fake-ai-draft-provider",
      enumerable: true,
    });

    for (const value of [new CandidateClass(), customPrototype, symbolKey, accessor]) {
      const deps = dependencies(value as AiDraftProviderGenerationCandidate);

      const result = await generateAiDraftWithProviderBoundary(request(), deps);

      expectFailClosed(result);
      expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_CANDIDATE_INVALID");
      expect(deps.executeAdapter).not.toHaveBeenCalled();
    }
  });

  it("fails closed for throwing and stateful resolver candidate descriptor proxies", async () => {
    const throwingProxy = new Proxy(candidate(), {
      ownKeys() {
        throw new Error("trap secret stack");
      },
    });
    let ownKeysCallCount = 0;
    const statefulProxy = new Proxy({ ...candidate(), token: "secret" }, {
      ownKeys(target) {
        ownKeysCallCount += 1;
        if (ownKeysCallCount === 1) return Reflect.ownKeys(target);
        return ["providerId", "capability", "approvedForSelection", "trustTier", "executionBoundary"];
      },
    });

    for (const value of [throwingProxy, statefulProxy]) {
      const deps = dependencies(value as AiDraftProviderGenerationCandidate);

      const result = await generateAiDraftWithProviderBoundary(request(), deps);

      expectFailClosed(result);
      expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_CANDIDATE_INVALID");
      expect(deps.executeAdapter).not.toHaveBeenCalled();
      expect(JSON.stringify(result)).not.toMatch(/trap|secret|stack|token/);
    }
  });

  it.each(["", "fake provider", "fake\nprovider", "x".repeat(65), "fake:provider"])(
    "fails closed before adapter execution for unsafe provider ids: %p",
    async (providerId) => {
      const deps = dependencies(candidate({ providerId }));

      const result = await generateAiDraftWithProviderBoundary(request(), deps);

      expectFailClosed(result);
      expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_PROVIDER_ID_INVALID");
      expect(result.selectedProviderId).toBeNull();
      expect(deps.executeAdapter).not.toHaveBeenCalled();
      if (providerId.length > 0) {
        expect(JSON.stringify(result)).not.toContain(providerId);
      }
    },
  );

  it.each([
    ["provider id mismatch", { providerId: "other-provider" }],
    ["capability mismatch", { capability: "ai_medical_review" }],
    ["trust tier mismatch", { trustTier: "trusted_service" }],
    ["adapter execution disabled", { adapterExecutionAllowed: false }],
  ])("fails closed for execution boundary mismatch: %s", async (_label, boundaryOverride) => {
    const base = candidate();
    const deps = dependencies(
      candidate({
        executionBoundary: {
          ...base.executionBoundary,
          ...boundaryOverride,
        } as AiDraftProviderGenerationCandidate["executionBoundary"],
      }),
    );

    const result = await generateAiDraftWithProviderBoundary(request(), deps);

    expectFailClosed(result);
    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_EXECUTION_BOUNDARY_MISSING");
    expect(deps.executeAdapter).not.toHaveBeenCalled();
  });

  it("fails closed when execution boundary descriptor traps throw", async () => {
    const boundary = new Proxy(candidate().executionBoundary as object, {
      getOwnPropertyDescriptor() {
        throw new Error("boundary trap secret");
      },
    });
    const deps = dependencies(candidate({ executionBoundary: boundary as AiDraftProviderGenerationCandidate["executionBoundary"] }));

    const result = await generateAiDraftWithProviderBoundary(request(), deps);

    expectFailClosed(result);
    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_EXECUTION_BOUNDARY_MISSING");
    expect(deps.executeAdapter).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(/boundary|trap|secret/);
  });

  it("fails closed after one adapter call when the adapter envelope candidate fails validation", async () => {
    const deps = dependencies(candidate(), adapterOutput({ candidate: { ...draftCandidate(), title: "" } }));

    const result = await generateAiDraftWithProviderBoundary(request(), deps);

    expectFailClosed(result);
    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_PAYLOAD_INVALID");
    expect(deps.executeAdapter).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["missing output reference", { candidate: draftCandidate() }],
    [
      "output provider mismatch",
      adapterOutput({ outputReference: { providerId: "other-provider", capability: AI_DRAFT_PROVIDER_GENERATION_CAPABILITY, referenceId: "safe-output-ref-1" } }),
    ],
    [
      "output capability mismatch",
      adapterOutput({ outputReference: { providerId: "fake-ai-draft-provider", capability: "ai_medical_review", referenceId: "safe-output-ref-1" } }),
    ],
    [
      "invalid reference id",
      adapterOutput({ outputReference: { providerId: "fake-ai-draft-provider", capability: AI_DRAFT_PROVIDER_GENERATION_CAPABILITY, referenceId: "" } }),
    ],
  ])("fails closed for invalid adapter output reference: %s", async (_label, adapterResult) => {
    const deps = dependencies(candidate(), adapterResult);

    const result = await generateAiDraftWithProviderBoundary(request(), deps);

    expectFailClosed(result);
    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_ADAPTER_OUTPUT_INVALID");
    expect(deps.executeAdapter).toHaveBeenCalledTimes(1);
  });

  it("fails closed when adapter output descriptor traps throw without exposing trap messages", async () => {
    const adapterResult = new Proxy(adapterOutput(), {
      getOwnPropertyDescriptor() {
        throw new Error("adapter trap secret stack");
      },
    });
    const deps = dependencies(candidate(), adapterResult);

    const result = await generateAiDraftWithProviderBoundary(request(), deps);

    expectFailClosed(result);
    expect(result.reasonCode).toBe("AI_DRAFT_PROVIDER_GENERATION_ADAPTER_OUTPUT_INVALID");
    expect(deps.executeAdapter).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toMatch(/adapter|trap|secret|stack/);
  });

  it("keeps all failed runtime-hardening paths manual-review-only without retry or fallback", async () => {
    const cases = [
      dependencies(null),
      dependencies(candidate({ providerId: "" })),
      dependencies(candidate({ executionBoundary: null })),
      dependencies(candidate(), { invalid: true }),
    ];

    for (const deps of cases) {
      const result = await generateAiDraftWithProviderBoundary(request(), deps);

      expectFailClosed(result);
      expect(result.retryAttempted).toBe(false);
      expect(result.fallbackAttempted).toBe(false);
    }
  });
});
