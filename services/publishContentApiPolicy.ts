import { createHash } from "node:crypto";

export type PublishContentRequestBody = {
  queueId?: unknown;
  publicationId?: unknown;
  contentId?: unknown;
  title?: unknown;
  slug?: unknown;
  publishingPackage?: unknown;
  publishApproved?: unknown;
  publishedBy?: unknown;
};

export type PublishContentValidationErrorCode =
  | "VALIDATION_ERROR"
  | "PUBLISH_NOT_APPROVED";

export type PublishContentValidationError = {
  errorCode: PublishContentValidationErrorCode;
  message: string;
};

export type ValidatedPublishContentRequest = {
  queueId: string;
  publicationId: string;
  contentId: string;
  title: string;
  slug: string;
  publishingPackage: Record<string, unknown>;
  publishApproved: true;
  publishedBy?: string;
};

export type PublishContentFingerprintInput = Pick<
  ValidatedPublishContentRequest,
  "publicationId" | "contentId" | "title" | "slug" | "publishingPackage"
>;

const NUMERIC_ID_PATTERN = /^\d+$/;
const SAFE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function validateNumericString(value: unknown, fieldName: string): string | PublishContentValidationError {
  if (typeof value !== "string" || !NUMERIC_ID_PATTERN.test(value.trim())) {
    return {
      errorCode: "VALIDATION_ERROR",
      message: `${fieldName} must be a numeric string.`,
    };
  }

  return value.trim();
}

function canonicalize(value: unknown): unknown {
  if (value === undefined) {
    return { __type: "undefined" };
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = canonicalize(value[key]);
        return accumulator;
      }, {});
  }

  return value;
}

export function createPublishContentRequestFingerprint(
  input: PublishContentFingerprintInput,
): string {
  const canonicalPayload = {
    publicationId: input.publicationId,
    contentId: input.contentId,
    title: input.title,
    slug: input.slug,
    publishingPackage: canonicalize(input.publishingPackage),
  };

  return createHash("sha256")
    .update(JSON.stringify(canonicalPayload))
    .digest("hex");
}

export function validatePublishContentRequest(
  body: PublishContentRequestBody,
): { ok: true; value: ValidatedPublishContentRequest } | { ok: false; error: PublishContentValidationError } {
  const queueId = validateNumericString(body.queueId, "queueId");
  if (typeof queueId !== "string") return { ok: false, error: queueId };

  const publicationId = validateNumericString(body.publicationId, "publicationId");
  if (typeof publicationId !== "string") return { ok: false, error: publicationId };

  const contentId = validateNumericString(body.contentId, "contentId");
  if (typeof contentId !== "string") return { ok: false, error: contentId };

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return {
      ok: false,
      error: {
        errorCode: "VALIDATION_ERROR",
        message: "title is required.",
      },
    };
  }

  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  if (!slug || !SAFE_SLUG_PATTERN.test(slug)) {
    return {
      ok: false,
      error: {
        errorCode: "VALIDATION_ERROR",
        message: "slug must use lowercase letters, numbers, and hyphens.",
      },
    };
  }

  if (!isPlainObject(body.publishingPackage)) {
    return {
      ok: false,
      error: {
        errorCode: "VALIDATION_ERROR",
        message: "publishingPackage must be an object.",
      },
    };
  }

  if (body.publishApproved !== true) {
    return {
      ok: false,
      error: {
        errorCode: "PUBLISH_NOT_APPROVED",
        message: "publishApproved must be true before content can be stored for publication.",
      },
    };
  }

  const publishedBy =
    typeof body.publishedBy === "string" && body.publishedBy.trim()
      ? body.publishedBy.trim()
      : undefined;

  return {
    ok: true,
    value: {
      queueId,
      publicationId,
      contentId,
      title,
      slug,
      publishingPackage: body.publishingPackage,
      publishApproved: true,
      ...(publishedBy ? { publishedBy } : {}),
    },
  };
}
