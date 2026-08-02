import { describe, expect, it } from "vitest";
import { buildAiDraftPayload } from "./aiDraftPayloadContract";

const fingerprint = "a".repeat(64);

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    requestId: "ai-draft:819852773404:13",
    payloadFingerprint: fingerprint,
    title: "수면 리듬을 안정시키는 생활 습관",
    slug: "sleep-rhythm-habits",
    summary: "매일 비슷한 시간에 자고 일어나는 습관은 수면 리듬 안정에 도움이 됩니다.",
    body: "충분한 수면과 일정한 기상 시간은 건강한 생활 리듬을 만드는 데 도움이 됩니다.",
    locale: "ko-KR",
    country: "KR",
    sourceIds: ["cdc-safe-fetch", "nhlbi-sleep"],
    tags: ["수면", "생활습관"],
    ...overrides,
  };
}

function expectFailure(input: unknown, reasonCode: string) {
  const result = buildAiDraftPayload(input);
  expect(result).toMatchObject({
    valid: false,
    payload: null,
    failClosed: true,
    manualReviewRequired: true,
    persistable: false,
    publishable: false,
    publicationTriggered: false,
    notificationSent: false,
    reasonCode,
  });
  expect(Object.isFrozen(result)).toBe(true);
  return result;
}

describe("buildAiDraftPayload", () => {
  it("accepts a valid minimal payload", () => {
    const result = buildAiDraftPayload(validInput({ summary: null, tags: [] }));

    expect(result).toMatchObject({
      valid: true,
      failClosed: false,
      reasonCode: "AI_DRAFT_PAYLOAD_CONTRACT_VALID",
    });
    expect(result.payload).toMatchObject({
      requestId: "ai-draft:819852773404:13",
      payloadFingerprint: fingerprint,
      title: "수면 리듬을 안정시키는 생활 습관",
      slug: "sleep-rhythm-habits",
      summary: null,
      locale: "ko-KR",
      country: "KR",
      sourceIds: ["cdc-safe-fetch", "nhlbi-sleep"],
      tags: [],
      manualReviewRequired: true,
      finalApprovalGranted: false,
      persistable: false,
      publishable: false,
      publicationTriggered: false,
      notificationSent: false,
      medicalVerificationCompleted: false,
      failClosed: true,
    });
  });

  it("accepts a valid maximum payload", () => {
    const result = buildAiDraftPayload(validInput({
      title: "가".repeat(200),
      slug: "a".repeat(160),
      summary: "나".repeat(1_000),
      body: "다".repeat(50_000),
      sourceIds: Array.from({ length: 10 }, (_, index) => `source-${index}`),
      tags: Array.from({ length: 10 }, (_, index) => `태그${index}`),
    }));

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.title).toHaveLength(200);
      expect(Array.from(result.payload.body)).toHaveLength(50_000);
      expect(result.payload.sourceIds).toHaveLength(10);
      expect(result.payload.tags).toHaveLength(10);
    }
  });

  it("freezes result, payload, sourceIds, and tags", () => {
    const result = buildAiDraftPayload(validInput());

    expect(Object.isFrozen(result)).toBe(true);
    expect(result.valid && Object.isFrozen(result.payload)).toBe(true);
    expect(result.valid && Object.isFrozen(result.payload.sourceIds)).toBe(true);
    expect(result.valid && Object.isFrozen(result.payload.tags)).toBe(true);
  });

  it("returns a fresh result object on every call", () => {
    const first = buildAiDraftPayload(validInput());
    const second = buildAiDraftPayload(validInput());

    expect(first).not.toBe(second);
    expect(first.valid && second.valid && first.payload).not.toBe(second.valid && second.payload);
  });

  it("does not mutate the input object or arrays", () => {
    const sourceIds = ["cdc-safe-fetch", "nhlbi-sleep"];
    const tags = ["수면", "생활습관"];
    const input = validInput({ sourceIds, tags });
    const before = JSON.stringify({ input, sourceIds, tags });

    buildAiDraftPayload(input);

    expect(JSON.stringify({ input, sourceIds, tags })).toBe(before);
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(sourceIds)).toBe(false);
    expect(Object.isFrozen(tags)).toBe(false);
  });

  it.each([null, undefined])("rejects %s input", (input) => {
    expectFailure(input, "AI_DRAFT_PAYLOAD_INPUT_NOT_OBJECT");
  });

  it.each(["text", 1, true, []])("rejects primitive or array input %#", (input) => {
    expectFailure(input, "AI_DRAFT_PAYLOAD_INPUT_NOT_OBJECT");
  });

  it("rejects missing required keys", () => {
    const input = validInput();
    Reflect.deleteProperty(input, "title");
    expectFailure(input, "AI_DRAFT_PAYLOAD_INPUT_KEYS_INVALID");
  });

  it("rejects extra own keys", () => {
    expectFailure(validInput({ contentId: "819852773404" }), "AI_DRAFT_PAYLOAD_INPUT_KEYS_INVALID");
  });

  it("rejects symbol keys", () => {
    const input = validInput();
    Object.defineProperty(input, Symbol("secret"), { value: "x", enumerable: true });
    expectFailure(input, "AI_DRAFT_PAYLOAD_INPUT_KEYS_INVALID");
  });

  it("rejects non-enumerable keys", () => {
    const input = validInput();
    Object.defineProperty(input, "hidden", { value: "x", enumerable: false });
    expectFailure(input, "AI_DRAFT_PAYLOAD_INPUT_KEYS_INVALID");
  });

  it.each(["title", "body"] as const)("rejects non-enumerable allowed field %s", (field) => {
    const input = validInput();
    Object.defineProperty(input, field, {
      value: input[field],
      enumerable: false,
      configurable: true,
    });

    expectFailure(input, "AI_DRAFT_PAYLOAD_INPUT_KEYS_INVALID");
  });

  it("does not accept inherited fields as a replacement for own keys", () => {
    const input = Object.create({ tags: [] }) as Record<string, unknown>;
    for (const [key, value] of Object.entries(validInput())) {
      if (key !== "tags") input[key] = value;
    }
    expectFailure(input, "AI_DRAFT_PAYLOAD_INPUT_NOT_OBJECT");
  });

  it("rejects objects with custom prototypes even when all allowed fields are own properties", () => {
    const input = Object.assign(Object.create({ custom: true }), validInput());

    expectFailure(input, "AI_DRAFT_PAYLOAD_INPUT_NOT_OBJECT");
  });

  it("rejects class instances even when all allowed fields are own properties", () => {
    class DraftInput {
      requestId = "ai-draft:819852773404:13";
      payloadFingerprint = fingerprint;
      title = "Title";
      slug = "sleep-rhythm-habits";
      summary = null;
      body = "Body";
      locale = "ko-KR";
      country = "KR";
      sourceIds = ["source-1"];
      tags = [];
    }

    expectFailure(new DraftInput(), "AI_DRAFT_PAYLOAD_INPUT_NOT_OBJECT");
  });

  it("accepts Object.create(null) when all allowed fields are own data properties", () => {
    const input = Object.assign(Object.create(null), validInput());
    const result = buildAiDraftPayload(input);

    expect(result.valid).toBe(true);
  });

  it("rejects getter keys", () => {
    const input = validInput();
    Object.defineProperty(input, "title", { get: () => "title", enumerable: true });
    expectFailure(input, "AI_DRAFT_PAYLOAD_INPUT_ACCESSOR_REJECTED");
  });

  it("rejects setter keys", () => {
    const input = validInput();
    Object.defineProperty(input, "title", { set: () => undefined, enumerable: true });
    expectFailure(input, "AI_DRAFT_PAYLOAD_INPUT_ACCESSOR_REJECTED");
  });

  it("uses descriptor snapshots instead of Proxy get traps", () => {
    const input = new Proxy(validInput(), {
      get(target, property, receiver) {
        if (property === "title") return "tampered";
        return Reflect.get(target, property, receiver);
      },
    });

    const result = buildAiDraftPayload(input);

    expect(result.valid).toBe(true);
    expect(result.valid && result.payload.title).toBe("수면 리듬을 안정시키는 생활 습관");
  });

  it("fails closed when descriptor lookup throws", () => {
    const input = new Proxy(validInput(), {
      ownKeys() {
        throw new Error("secret stack");
      },
    });

    const result = expectFailure(input, "AI_DRAFT_PAYLOAD_CONTRACT_ERROR");
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("fails closed when prototype lookup throws", () => {
    const input = new Proxy(validInput(), {
      getPrototypeOf() {
        throw new Error("secret prototype");
      },
    });

    const result = expectFailure(input, "AI_DRAFT_PAYLOAD_CONTRACT_ERROR");
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("rejects invalid requestId", () => {
    expectFailure(validInput({ requestId: " bad" }), "AI_DRAFT_PAYLOAD_REQUEST_ID_INVALID");
  });

  it("rejects invalid fingerprint", () => {
    expectFailure(validInput({ payloadFingerprint: "A".repeat(64) }), "AI_DRAFT_PAYLOAD_FINGERPRINT_INVALID");
  });

  it("rejects empty title", () => {
    expectFailure(validInput({ title: "   " }), "AI_DRAFT_PAYLOAD_TITLE_INVALID");
  });

  it("rejects overly long title by code points", () => {
    expectFailure(validInput({ title: "가".repeat(201) }), "AI_DRAFT_PAYLOAD_TITLE_INVALID");
  });

  it("rejects invalid slug", () => {
    expectFailure(validInput({ slug: "Bad_Slug" }), "AI_DRAFT_PAYLOAD_SLUG_INVALID");
  });

  it("normalizes empty summary to null", () => {
    const result = buildAiDraftPayload(validInput({ summary: "   " }));
    expect(result.valid && result.payload.summary).toBe(null);
  });

  it("rejects overly long summary", () => {
    expectFailure(validInput({ summary: "요".repeat(1_001) }), "AI_DRAFT_PAYLOAD_SUMMARY_INVALID");
  });

  it("rejects empty body", () => {
    expectFailure(validInput({ body: "   " }), "AI_DRAFT_PAYLOAD_BODY_INVALID");
  });

  it("rejects overly long body", () => {
    expectFailure(validInput({ body: "가".repeat(50_001) }), "AI_DRAFT_PAYLOAD_BODY_INVALID");
  });

  it("rejects invalid locale", () => {
    expectFailure(validInput({ locale: "ko-kr" }), "AI_DRAFT_PAYLOAD_LOCALE_INVALID");
  });

  it("rejects invalid country", () => {
    expectFailure(validInput({ country: "KOR" }), "AI_DRAFT_PAYLOAD_COUNTRY_INVALID");
  });

  it("rejects empty sourceIds", () => {
    expectFailure(validInput({ sourceIds: [] }), "AI_DRAFT_PAYLOAD_SOURCE_IDS_INVALID");
  });

  it("rejects more than 10 sourceIds", () => {
    expectFailure(
      validInput({ sourceIds: Array.from({ length: 11 }, (_, index) => `source-${index}`) }),
      "AI_DRAFT_PAYLOAD_SOURCE_IDS_INVALID",
    );
  });

  it("rejects duplicate sourceIds", () => {
    expectFailure(validInput({ sourceIds: ["source-1", "source-1"] }), "AI_DRAFT_PAYLOAD_SOURCE_IDS_INVALID");
  });

  it("rejects sparse sourceIds", () => {
    expectFailure(validInput({ sourceIds: Array(1) }), "AI_DRAFT_PAYLOAD_SOURCE_IDS_INVALID");
  });

  it("rejects sourceIds with extra properties", () => {
    const sourceIds = ["source-1"];
    Object.defineProperty(sourceIds, "extra", { value: "x", enumerable: true });
    expectFailure(validInput({ sourceIds }), "AI_DRAFT_PAYLOAD_SOURCE_IDS_INVALID");
  });

  it("rejects non-enumerable sourceIds array indexes", () => {
    const sourceIds = ["source-1"];
    Object.defineProperty(sourceIds, "0", {
      value: "source-1",
      enumerable: false,
      configurable: true,
    });

    expectFailure(validInput({ sourceIds }), "AI_DRAFT_PAYLOAD_SOURCE_IDS_INVALID");
  });

  it("allows normal arrays even though sourceIds length is non-enumerable", () => {
    const sourceIds = ["source-1"];

    expect(Object.getOwnPropertyDescriptor(sourceIds, "length")?.enumerable).toBe(false);

    const result = buildAiDraftPayload(validInput({ sourceIds }));

    expect(result.valid).toBe(true);
    expect(result.valid && result.payload.sourceIds).toEqual(["source-1"]);
  });

  it("does not call sourceIds Proxy get traps while reading length or values", () => {
    let getCallCount = 0;
    const sourceIds = new Proxy(["source-1"], {
      get(target, property, receiver) {
        getCallCount += 1;
        return Reflect.get(target, property, receiver);
      },
    });

    const result = buildAiDraftPayload(validInput({ sourceIds }));

    expect(result.valid).toBe(true);
    expect(getCallCount).toBe(0);
  });

  it("uses sourceIds descriptor length even when Proxy get returns a false length", () => {
    let getCallCount = 0;
    const sourceIds = new Proxy(["source-1"], {
      get(target, property, receiver) {
        getCallCount += 1;
        if (property === "length") return 0;
        return Reflect.get(target, property, receiver);
      },
    });

    const result = buildAiDraftPayload(validInput({ sourceIds }));

    expect(result.valid).toBe(true);
    expect(result.valid && result.payload.sourceIds).toEqual(["source-1"]);
    expect(getCallCount).toBe(0);
  });

  it("rejects more than 10 tags", () => {
    expectFailure(
      validInput({ tags: Array.from({ length: 11 }, (_, index) => `tag-${index}`) }),
      "AI_DRAFT_PAYLOAD_TAGS_INVALID",
    );
  });

  it("rejects duplicate tags", () => {
    expectFailure(validInput({ tags: ["수면", "수면"] }), "AI_DRAFT_PAYLOAD_TAGS_INVALID");
  });

  it("rejects sparse tags", () => {
    expectFailure(validInput({ tags: Array(1) }), "AI_DRAFT_PAYLOAD_TAGS_INVALID");
  });

  it("rejects overly long tag", () => {
    expectFailure(validInput({ tags: ["가".repeat(41)] }), "AI_DRAFT_PAYLOAD_TAGS_INVALID");
  });

  it("rejects non-enumerable tags array indexes", () => {
    const tags = ["tag-1"];
    Object.defineProperty(tags, "0", {
      value: "tag-1",
      enumerable: false,
      configurable: true,
    });

    expectFailure(validInput({ tags }), "AI_DRAFT_PAYLOAD_TAGS_INVALID");
  });

  it("allows normal arrays even though tags length is non-enumerable", () => {
    const tags = ["tag-1"];

    expect(Object.getOwnPropertyDescriptor(tags, "length")?.enumerable).toBe(false);

    const result = buildAiDraftPayload(validInput({ tags }));

    expect(result.valid).toBe(true);
    expect(result.valid && result.payload.tags).toEqual(["tag-1"]);
  });

  it("does not call tags Proxy get traps while reading length or values", () => {
    let getCallCount = 0;
    const tags = new Proxy(["tag-1"], {
      get(target, property, receiver) {
        getCallCount += 1;
        return Reflect.get(target, property, receiver);
      },
    });

    const result = buildAiDraftPayload(validInput({ tags }));

    expect(result.valid).toBe(true);
    expect(getCallCount).toBe(0);
  });

  it("does not call tags length get traps even when they throw", () => {
    let getCallCount = 0;
    const tags = new Proxy(["tag-1"], {
      get(_target, property) {
        getCallCount += 1;
        if (property === "length") throw new Error("secret length");
        return "tampered";
      },
    });

    const result = buildAiDraftPayload(validInput({ tags }));

    expect(result.valid).toBe(true);
    expect(result.valid && result.payload.tags).toEqual(["tag-1"]);
    expect(getCallCount).toBe(0);
  });

  it.each([
    ["finalApprovalGranted", true],
    ["persistable", true],
    ["publishable", true],
    ["publicationTriggered", true],
    ["notificationSent", true],
  ])("rejects injected status field %s", (field, value) => {
    expectFailure(validInput({ [field]: value }), "AI_DRAFT_PAYLOAD_INPUT_KEYS_INVALID");
  });

  it("rejects Authorization Bearer credentials without exposing them", () => {
    const secret = "Authorization: Bearer super-secret-token";
    const result = expectFailure(validInput({ body: secret }), "AI_DRAFT_PAYLOAD_FORBIDDEN_CONTENT_DETECTED");
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("rejects API key credential patterns", () => {
    expectFailure(validInput({ summary: "api_key=abcd1234" }), "AI_DRAFT_PAYLOAD_FORBIDDEN_CONTENT_DETECTED");
  });

  it.each([
    "간호사의 service role은 환자 교육입니다.",
    "The nurse service role includes patient education.",
    "service-role-in-healthcare",
    "Bearer token 인증 방식에 대한 일반 설명입니다.",
    "이 문장은 token이라는 일반 단어를 설명합니다.",
  ])("allows non-credential explanatory text: %s", (body) => {
    const result = buildAiDraftPayload(validInput({ body }));

    expect(result.valid).toBe(true);
  });

  it.each([
    "Authorization: Bearer super-secret-token",
    "authorization = Bearer super-secret-token",
    "service_role=super-secret-value",
    "service-role-key: super-secret-value",
    "service_role_secret=super-secret-value",
    "api_key=abcd1234",
    "api-key: abcd1234",
    "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature",
    "Bearer abcdefghijklmnopqrstuvwxyzABCDEF123456",
    "sb_secret_live_value",
  ])("rejects credential-shaped content without exposing it: %s", (secret) => {
    const result = expectFailure(validInput({ body: secret }), "AI_DRAFT_PAYLOAD_FORBIDDEN_CONTENT_DETECTED");

    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("rejects null bytes in content", () => {
    expectFailure(validInput({ body: "안전한 문장\u0000숨은 값" }), "AI_DRAFT_PAYLOAD_BODY_INVALID");
  });

  it("rejects raw provider result keys", () => {
    expectFailure(validInput({ rawProviderResult: { data: "x" } }), "AI_DRAFT_PAYLOAD_INPUT_KEYS_INVALID");
  });

  it("rejects function injection", () => {
    expectFailure(validInput({ tags: [() => "x"] }), "AI_DRAFT_PAYLOAD_TAGS_INVALID");
  });

  it("rejects Promise injection", () => {
    expectFailure(validInput({ body: Promise.resolve("x") }), "AI_DRAFT_PAYLOAD_BODY_INVALID");
  });

  it("rejects AbortSignal-like injection as an extra key", () => {
    expectFailure(validInput({ AbortSignal: { aborted: false } }), "AI_DRAFT_PAYLOAD_INPUT_KEYS_INVALID");
  });

  it("does not expose secret or raw input in JSON failure results", () => {
    const result = buildAiDraftPayload(validInput({ body: "sk-abc123" }));
    expect(JSON.stringify(result)).not.toMatch(/sk-abc123|raw|stack/i);
  });

  it("does not import or call database, storage, publication, notification, provider resilience, or environment APIs", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(new URL("./aiDraftPayloadContract.ts", import.meta.url), "utf8");

    expect(source).not.toMatch(/from\s+["'].*supabase/i);
    expect(source).not.toMatch(/\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.rpc\s*\(/);
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/\bstorage\s*\./i);
    expect(source).not.toMatch(/\bpublication\s*\(/i);
    expect(source).not.toMatch(/\bnotification\s*\(/i);
    expect(source).not.toMatch(/ProviderRetry|TimeoutCoordinator|CancellationSupervisor/);
    expect(source).not.toMatch(/AbortController|process\.env/);
  });

  it("does not reject ordinary medical text containing the Korean word token", () => {
    const result = buildAiDraftPayload(validInput({
      body: "이 문장은 token이라는 일반 단어를 설명하지만 인증 정보는 포함하지 않습니다.",
    }));

    expect(result.valid).toBe(true);
  });
});
