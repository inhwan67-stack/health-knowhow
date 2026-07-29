import { timingSafeEqual } from "node:crypto";

export function assertInternalContentDraftAuthorized(request: Request): boolean {
  const expectedSecret = process.env.INTERNAL_CONTENT_DRAFTS_TOKEN;
  const token = readBearerToken(request.headers.get("authorization"));
  if (!expectedSecret || !token) return false;
  return safeTokenEquals(token, expectedSecret);
}

function readBearerToken(value: string | null): string | null {
  if (!value) return null;
  const [scheme, token] = value.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function safeTokenEquals(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
