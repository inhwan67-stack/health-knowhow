import { describe, expect, it, vi } from "vitest";

import {
  validateAiDraftGenerationCandidate,
  type AiDraftGenerationCandidate,
  type AiDraftGenerationSystemContext,
} from "./aiDraftGenerationCandidateValidation";

const VALID_HASH = "a".repeat(64);
const SYSTEM_CONTEXT_OWN_KEYS_FOR_TEST = Object.freeze([
  "requestId",
  "payloadFingerprint",
  "locale",
  "country",
  "sourceIds",
]);
const CANDIDATE_OWN_KEYS_FOR_TEST = Object.freeze(["title", "slug", "summary", "body", "tags"]);

function systemContext(overrides: Partial<AiDraftGenerationSystemContext> = {}): AiDraftGenerationSystemContext {
  return {
    requestId: "draft-request-1",
    payloadFingerprint: VALID_HASH,
    locale: "ko-KR",
    country: "KR",
    sourceIds: Object.freeze(["source-1", "source-2"]),
    ...overrides,
  };
}

function candidate(overrides: Partial<AiDraftGenerationCandidate> = {}): AiDraftGenerationCandidate {
  return {
    title: "고혈압 관리 기본 안내",
    slug: "hypertension-care-guide",
    summary: "생활 습관과 진료 상담을 함께 다루는 초안입니다.",
    body: "고혈압 관리는 정기적인 혈압 확인과 의료진 상담을 함께 고려해야 합니다.",
    tags: Object.freeze(["혈압", "건강관리"]),
    ...overrides,
  };
}

function expectFailClosed(result: ReturnType<typeof validateAiDraftGenerationCandidate>) {
  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.payload).toBeNull();
    expect(result.failClosed).toBe(true);
    expect(result.manualReviewRequired).toBe(true);
    expect(result.finalApprovalGranted).toBe(false);
    expect(result.persistable).toBe(false);
    expect(result.publishable).toBe(false);
    expect(result.publicationTriggered).toBe(false);
    expect(result.notificationSent).toBe(false);
    expect(result.medicalVerificationCompleted).toBe(false);
    expect(result.sideEffects).toEqual({
      providerCalled: false,
      databaseWritten: false,
      storageWritten: false,
      n8nTriggered: false,
      publicationTriggered: false,
      notificationSent: false,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.sideEffects)).toBe(true);
  }
}

function expectPayloadContractRejected(result: ReturnType<typeof validateAiDraftGenerationCandidate>, contractReasonCode: string) {
  expectFailClosed(result);
  if (!result.valid) {
    expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_PAYLOAD_CONTRACT_REJECTED");
    expect(result.contractReasonCode).toBe(contractReasonCode);
  }
}

describe("validateAiDraftGenerationCandidate", () => {
  it("builds a frozen safe payload from separated system context and AI candidate fields", () => {
    const result = validateAiDraftGenerationCandidate(systemContext(), candidate());

    expect(result.valid).toBe(true);
    if (!result.valid) throw new Error("expected valid result");

    expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_CANDIDATE_VALID");
    expect(result.contractReasonCode).toBeNull();
    expect(result.failClosed).toBe(false);
    expect(result.payload).toMatchObject({
      requestId: "draft-request-1",
      payloadFingerprint: VALID_HASH,
      title: "고혈압 관리 기본 안내",
      slug: "hypertension-care-guide",
      summary: "생활 습관과 진료 상담을 함께 다루는 초안입니다.",
      body: "고혈압 관리는 정기적인 혈압 확인과 의료진 상담을 함께 고려해야 합니다.",
      locale: "ko-KR",
      country: "KR",
      manualReviewRequired: true,
      finalApprovalGranted: false,
      persistable: false,
      publishable: false,
      publicationTriggered: false,
      notificationSent: false,
      medicalVerificationCompleted: false,
      failClosed: true,
    });
    expect(result.payload.sourceIds).toEqual(["source-1", "source-2"]);
    expect(result.payload.tags).toEqual(["혈압", "건강관리"]);
    expect(result.sideEffects).toEqual({
      providerCalled: false,
      databaseWritten: false,
      storageWritten: false,
      n8nTriggered: false,
      publicationTriggered: false,
      notificationSent: false,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.payload)).toBe(true);
    expect(Object.isFrozen(result.payload.sourceIds)).toBe(true);
    expect(Object.isFrozen(result.payload.tags)).toBe(true);
    expect(Object.isFrozen(result.sideEffects)).toBe(true);
  });

  it("returns a fresh deterministic result object for the same inputs", () => {
    const context = systemContext();
    const draft = candidate();

    const first = validateAiDraftGenerationCandidate(context, draft);
    const second = validateAiDraftGenerationCandidate(context, draft);

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });

  it("accepts null-prototype system context and candidate objects", () => {
    const context = Object.assign(Object.create(null), systemContext());
    const draft = Object.assign(Object.create(null), candidate());

    const result = validateAiDraftGenerationCandidate(context, draft);

    expect(result.valid).toBe(true);
  });

  it.each([null, undefined, "text", 7, true, []])(
    "rejects non-object system context without throwing: %p",
    (value) => {
      const result = validateAiDraftGenerationCandidate(value, candidate());

      expectFailClosed(result);
      if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_SYSTEM_CONTEXT_NOT_OBJECT");
    },
  );

  it("rejects system context with a missing required key", () => {
    const { requestId, ...invalid } = systemContext();

    const result = validateAiDraftGenerationCandidate(invalid, candidate());

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_SYSTEM_CONTEXT_KEYS_INVALID");
    expect(requestId).toBe("draft-request-1");
  });

  it("rejects system context with an extra key", () => {
    const result = validateAiDraftGenerationCandidate({ ...systemContext(), token: "secret" }, candidate());

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_SYSTEM_CONTEXT_KEYS_INVALID");
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("rejects system context with a symbol key", () => {
    const context = { ...systemContext() } as Record<PropertyKey, unknown>;
    context[Symbol("secret")] = "value";

    const result = validateAiDraftGenerationCandidate(context, candidate());

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_SYSTEM_CONTEXT_KEYS_INVALID");
  });

  it("rejects system context with a non-enumerable required field", () => {
    const context = { ...systemContext() };
    Object.defineProperty(context, "requestId", {
      value: "draft-request-1",
      enumerable: false,
      configurable: true,
    });

    const result = validateAiDraftGenerationCandidate(context, candidate());

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_SYSTEM_CONTEXT_KEYS_INVALID");
  });

  it("rejects system context getter properties", () => {
    const context = { ...systemContext() };
    Object.defineProperty(context, "requestId", {
      get: () => "draft-request-1",
      enumerable: true,
      configurable: true,
    });

    const result = validateAiDraftGenerationCandidate(context, candidate());

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_SYSTEM_CONTEXT_ACCESSOR_REJECTED");
  });

  it("rejects system context setter-only properties", () => {
    const context = { ...systemContext() };
    Object.defineProperty(context, "requestId", {
      set: () => undefined,
      enumerable: true,
      configurable: true,
    });

    const result = validateAiDraftGenerationCandidate(context, candidate());

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_SYSTEM_CONTEXT_ACCESSOR_REJECTED");
  });

  it("rejects custom prototype and class instance system contexts", () => {
    class ContextClass {
      requestId = "draft-request-1";
      payloadFingerprint = VALID_HASH;
      locale = "ko-KR";
      country = "KR";
      sourceIds = ["source-1"];
    }

    const customPrototype = Object.create({ inherited: true });
    Object.assign(customPrototype, systemContext());

    for (const value of [customPrototype, new ContextClass()]) {
      const result = validateAiDraftGenerationCandidate(value, candidate());

      expectFailClosed(result);
      if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_SYSTEM_CONTEXT_NOT_OBJECT");
    }
  });

  it("rejects inherited system context fields", () => {
    const context = Object.create(systemContext());

    const result = validateAiDraftGenerationCandidate(context, candidate());

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_SYSTEM_CONTEXT_NOT_OBJECT");
  });


  it("fails closed when system context prototype lookup throws", () => {
    const proxy = new Proxy(systemContext(), {
      getPrototypeOf() {
        throw new Error("Authorization Bearer secret https://evil.example");
      },
    });

    const result = validateAiDraftGenerationCandidate(proxy, candidate());

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_VALIDATION_ERROR");
    expect(JSON.stringify(result)).not.toContain("evil.example");
  });
  it("snapshots system context descriptors without invoking get traps", () => {
    const getTrap = vi.fn();
    const proxy = new Proxy(systemContext(), {
      get(target, property, receiver) {
        getTrap(property);
        return Reflect.get(target, property, receiver);
      },
    });

    const result = validateAiDraftGenerationCandidate(proxy, candidate());

    expect(result.valid).toBe(true);
    expect(getTrap).not.toHaveBeenCalled();
  });

  it("rejects stateful system context ownKeys using the descriptor snapshot keys", () => {
    let ownKeysCallCount = 0;
    const proxy = new Proxy({ ...systemContext(), token: "secret" }, {
      ownKeys(target) {
        ownKeysCallCount += 1;
        if (ownKeysCallCount === 1) return Reflect.ownKeys(target);
        return SYSTEM_CONTEXT_OWN_KEYS_FOR_TEST;
      },
    });

    const result = validateAiDraftGenerationCandidate(proxy, candidate());

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_SYSTEM_CONTEXT_KEYS_INVALID");
    expect(ownKeysCallCount).toBe(1);
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("fails closed when system context descriptor reflection throws", () => {
    const proxy = new Proxy(systemContext(), {
      ownKeys() {
        throw new Error("Authorization Bearer secret https://evil.example");
      },
    });

    const result = validateAiDraftGenerationCandidate(proxy, candidate());

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_VALIDATION_ERROR");
    expect(JSON.stringify(result)).not.toContain("evil.example");
  });

  it.each([null, undefined, "text", 7, true, []])("rejects non-object candidate without throwing: %p", (value) => {
    const result = validateAiDraftGenerationCandidate(systemContext(), value);

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_CANDIDATE_NOT_OBJECT");
  });

  it("rejects candidate with missing title or body", () => {
    const { title, ...missingTitle } = candidate();
    const { body, ...missingBody } = candidate();

    for (const value of [missingTitle, missingBody]) {
      const result = validateAiDraftGenerationCandidate(systemContext(), value);

      expectFailClosed(result);
      if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_CANDIDATE_KEYS_INVALID");
    }
    expect(title).toBe("고혈압 관리 기본 안내");
    expect(body).toContain("고혈압");
  });

  it.each([
    ["system-owned requestId", { requestId: "attacker-request" }],
    ["payloadFingerprint", { payloadFingerprint: VALID_HASH }],
    ["locale", { locale: "en-US" }],
    ["country", { country: "US" }],
    ["sourceIds", { sourceIds: ["attacker-source"] }],
    ["manualReviewRequired", { manualReviewRequired: false }],
    ["finalApprovalGranted", { finalApprovalGranted: true }],
    ["persistable", { persistable: true }],
    ["publishable", { publishable: true }],
    ["publicationTriggered", { publicationTriggered: true }],
    ["notificationSent", { notificationSent: true }],
    ["medicalVerificationCompleted", { medicalVerificationCompleted: true }],
    ["failClosed", { failClosed: false }],
    ["contentId", { contentId: "content-1" }],
    ["revisionId", { revisionId: "revision-1" }],
    ["revisionNumber", { revisionNumber: 7 }],
    ["rawProviderResult", { rawProviderResult: "secret result" }],
    ["providerResult", { providerResult: "secret result" }],
    ["rawError", { rawError: "secret error" }],
    ["stack", { stack: "secret stack" }],
    ["authorization", { authorization: "Bearer secret" }],
    ["token", { token: "secret token" }],
    ["secret", { secret: "secret value" }],
  ])("rejects candidate injection field: %s", (_label, extra) => {
    const result = validateAiDraftGenerationCandidate(systemContext(), { ...candidate(), ...extra });

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_CANDIDATE_KEYS_INVALID");
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("rejects candidate with a symbol key", () => {
    const draft = { ...candidate() } as Record<PropertyKey, unknown>;
    draft[Symbol("rawProviderResult")] = "secret";

    const result = validateAiDraftGenerationCandidate(systemContext(), draft);

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_CANDIDATE_KEYS_INVALID");
  });

  it("rejects candidate with a non-enumerable required field", () => {
    const draft = { ...candidate() };
    Object.defineProperty(draft, "body", {
      value: "안전한 본문",
      enumerable: false,
      configurable: true,
    });

    const result = validateAiDraftGenerationCandidate(systemContext(), draft);

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_CANDIDATE_KEYS_INVALID");
  });

  it("rejects candidate getter properties", () => {
    const draft = { ...candidate() };
    Object.defineProperty(draft, "body", {
      get: () => "안전한 본문",
      enumerable: true,
      configurable: true,
    });

    const result = validateAiDraftGenerationCandidate(systemContext(), draft);

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_CANDIDATE_ACCESSOR_REJECTED");
  });

  it("rejects candidate setter-only properties", () => {
    const draft = { ...candidate() };
    Object.defineProperty(draft, "body", {
      set: () => undefined,
      enumerable: true,
      configurable: true,
    });

    const result = validateAiDraftGenerationCandidate(systemContext(), draft);

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_CANDIDATE_ACCESSOR_REJECTED");
  });

  it("rejects custom prototype and class instance candidates", () => {
    class CandidateClass {
      title = "고혈압 관리 기본 안내";
      slug = "hypertension-care-guide";
      summary = null;
      body = "고혈압 관리는 의료진 상담을 포함합니다.";
      tags = ["혈압"];
    }

    const customPrototype = Object.create({ inherited: true });
    Object.assign(customPrototype, candidate());

    for (const value of [customPrototype, new CandidateClass()]) {
      const result = validateAiDraftGenerationCandidate(systemContext(), value);

      expectFailClosed(result);
      if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_CANDIDATE_NOT_OBJECT");
    }
  });

  it("rejects inherited candidate fields", () => {
    const draft = Object.create(candidate());

    const result = validateAiDraftGenerationCandidate(systemContext(), draft);

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_CANDIDATE_NOT_OBJECT");
  });


  it("fails closed when candidate prototype lookup throws", () => {
    const proxy = new Proxy(candidate(), {
      getPrototypeOf() {
        throw new Error("token secret stack");
      },
    });

    const result = validateAiDraftGenerationCandidate(systemContext(), proxy);

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_VALIDATION_ERROR");
    expect(JSON.stringify(result)).not.toContain("token secret stack");
  });
  it("snapshots candidate descriptors without invoking get traps", () => {
    const getTrap = vi.fn();
    const proxy = new Proxy(candidate(), {
      get(target, property, receiver) {
        getTrap(property);
        return Reflect.get(target, property, receiver);
      },
    });

    const result = validateAiDraftGenerationCandidate(systemContext(), proxy);

    expect(result.valid).toBe(true);
    expect(getTrap).not.toHaveBeenCalled();
  });

  it("rejects stateful candidate ownKeys using the descriptor snapshot keys", () => {
    let ownKeysCallCount = 0;
    const proxy = new Proxy({ ...candidate(), token: "secret" }, {
      ownKeys(target) {
        ownKeysCallCount += 1;
        if (ownKeysCallCount === 1) return Reflect.ownKeys(target);
        return CANDIDATE_OWN_KEYS_FOR_TEST;
      },
    });

    const result = validateAiDraftGenerationCandidate(systemContext(), proxy);

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_CANDIDATE_KEYS_INVALID");
    expect(ownKeysCallCount).toBe(1);
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("fails closed when candidate descriptor reflection throws", () => {
    const proxy = new Proxy(candidate(), {
      getOwnPropertyDescriptor() {
        throw new Error("token secret stack");
      },
    });

    const result = validateAiDraftGenerationCandidate(systemContext(), proxy);

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_VALIDATION_ERROR");
    expect(JSON.stringify(result)).not.toContain("token secret stack");
  });

  it.each([
    ["invalid title", candidate({ title: "" }), "AI_DRAFT_PAYLOAD_TITLE_INVALID"],
    ["invalid slug", candidate({ slug: "Invalid Slug" }), "AI_DRAFT_PAYLOAD_SLUG_INVALID"],
    ["invalid body", candidate({ body: "" }), "AI_DRAFT_PAYLOAD_BODY_INVALID"],
    ["invalid locale", candidate(), "AI_DRAFT_PAYLOAD_LOCALE_INVALID", systemContext({ locale: "ko" })],
    ["invalid country", candidate(), "AI_DRAFT_PAYLOAD_COUNTRY_INVALID", systemContext({ country: "KOR" })],
    ["invalid sourceIds", candidate(), "AI_DRAFT_PAYLOAD_SOURCE_IDS_INVALID", systemContext({ sourceIds: [] })],
    ["invalid tags", candidate({ tags: ["x".repeat(41)] }), "AI_DRAFT_PAYLOAD_TAGS_INVALID"],
  ])("wraps payload contract failure for %s", (_label, draft, expectedReason, context = systemContext()) => {
    const result = validateAiDraftGenerationCandidate(context, draft);

    expectPayloadContractRejected(result, expectedReason);
  });

  it("wraps credential-shaped candidate content without exposing the credential", () => {
    const result = validateAiDraftGenerationCandidate(
      systemContext(),
      candidate({ body: "Authorization: Bearer super-secret-token" }),
    );

    expectPayloadContractRejected(result, "AI_DRAFT_PAYLOAD_FORBIDDEN_CONTENT_DETECTED");
    expect(JSON.stringify(result)).not.toContain("super-secret-token");
  });

  it("does not allow candidate content identifiers into the payload contract input", () => {
    const result = validateAiDraftGenerationCandidate(systemContext(), {
      ...candidate(),
      contentId: "content-1",
    });

    expectFailClosed(result);
    if (!result.valid) expect(result.reasonCode).toBe("AI_DRAFT_GENERATION_CANDIDATE_KEYS_INVALID");
    expect(JSON.stringify(result)).not.toContain("content-1");
  });

  it("does not mutate input objects or arrays", () => {
    const sourceIds = ["source-1", "source-2"];
    const tags = ["혈압", "건강관리"];
    const context = systemContext({ sourceIds });
    const draft = candidate({ tags });
    const beforeContext = JSON.stringify(context);
    const beforeDraft = JSON.stringify(draft);

    const result = validateAiDraftGenerationCandidate(context, draft);

    expect(result.valid).toBe(true);
    expect(JSON.stringify(context)).toBe(beforeContext);
    expect(JSON.stringify(draft)).toBe(beforeDraft);
    expect(sourceIds).toEqual(["source-1", "source-2"]);
    expect(tags).toEqual(["혈압", "건강관리"]);
    expect(Object.isFrozen(sourceIds)).toBe(false);
    expect(Object.isFrozen(tags)).toBe(false);
  });

  it("keeps failure JSON free of raw provider results, stack, token, and URLs", () => {
    const result = validateAiDraftGenerationCandidate(systemContext(), {
      ...candidate(),
      rawProviderResult: "Authorization Bearer secret https://evil.example stack",
    });

    const serialized = JSON.stringify(result);

    expectFailClosed(result);
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("Bearer");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("https://evil.example");
    expect(serialized).not.toContain("stack");
  });

  it("never reports provider, database, storage, n8n, publication, or notification side effects", () => {
    const success = validateAiDraftGenerationCandidate(systemContext(), candidate());
    const failure = validateAiDraftGenerationCandidate(systemContext(), { ...candidate(), providerResult: "raw" });

    for (const result of [success, failure]) {
      expect(result.sideEffects).toEqual({
        providerCalled: false,
        databaseWritten: false,
        storageWritten: false,
        n8nTriggered: false,
        publicationTriggered: false,
        notificationSent: false,
      });
    }
  });
});
