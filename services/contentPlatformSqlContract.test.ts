import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase", "drafts", "001_content_platform_rpc.sql"),
  "utf8",
);

describe("content platform SQL draft contract", () => {
  it.each([
    "sites", "topics", "sources", "contents", "content_sources", "content_secondary_topics",
    "content_drafts", "content_draft_sources", "content_revisions", "content_revision_sources",
    "content_reviews", "content_approvals", "content_publications", "content_operations",
  ])("declares the %s table", (table) => {
    expect(sql).toContain(`create table public.${table}`);
  });

  it.each(["execute_final_approval", "execute_publication"])("declares the %s RPC", (rpc) => {
    expect(sql).toContain(`function public.${rpc}`);
  });

  it("creates referenced objects before their dependants", () => {
    const order = [
      "create table public.sites",
      "create table public.topics",
      "create table public.contents",
      "create table public.content_drafts",
      "create table public.content_revisions",
      "create table public.content_reviews",
      "create table public.content_approvals",
      "create table public.content_publications",
      "create table public.content_operations",
      "function public.execute_final_approval",
      "function public.execute_publication",
    ].map((marker) => sql.indexOf(marker));
    expect(order.every((position) => position >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it.each([
    "p_operation_id", "p_operation_fingerprint", "p_content_id", "p_revision_id",
    "p_expected_content_updated_at", "p_created_at",
  ])("contains required shared RPC input %s", (input) => {
    expect(sql).toContain(input);
  });

  it("contains RPC-specific request fields", () => {
    for (const input of [
      "p_review_id", "p_approval_id", "p_comment",
      "p_publication_id", "p_mode", "p_scheduled_at",
    ]) {
      expect(sql).toContain(input);
    }
  });

  it.each([
    "CONTENT_UPDATED", "WORKFLOW_CHANGED", "OPERATION_PAYLOAD_MISMATCH", "ENTITY_NOT_FOUND",
    "ENTITY_RELATION_MISMATCH", "FORBIDDEN", "REVIEW_NOT_APPROVED", "REVISION_NOT_CURRENT",
    "APPROVAL_NOT_VALID", "PUBLICATION_ALREADY_EXISTS", "INVALID_SCHEDULE",
  ])("contains RPC error code %s", (code) => {
    expect(sql).toContain(`'${code}'`);
  });

  it("keeps writes atomic inside PostgreSQL functions", () => {
    expect(sql).toContain("insert into public.content_approvals");
    expect(sql).toContain("insert into public.content_publications");
    expect(sql).toContain("update public.contents set");
    expect(sql).toContain("for update");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql.match(/get diagnostics v_updated_count = row_count/g)).toHaveLength(2);
    expect(sql).toContain("and updated_at = p_expected_content_updated_at");
  });

  it("declares supporting uniqueness for every composite foreign key", () => {
    expect(sql).toContain("unique (site_id, id)");
    expect(sql).toContain("unique (id, content_id)");
    expect(sql).toContain("unique (id, content_id, revision_id)");
  });

  it("matches the optional publication schedule and RPC success keys", () => {
    expect(sql).toContain("p_scheduled_at timestamptz default null");
    for (const key of [
      "operationId", "contentId", "revisionId", "resultEntityId",
      "nextWorkflowStatus", "contentUpdatedAt",
    ]) {
      expect(sql).toContain(`'${key}'`);
    }
  });

  it("keeps sensitive mutations behind authenticated security-definer RPCs", () => {
    expect(sql.match(/security definer/g)).toHaveLength(2);
    expect(sql).toContain("revoke insert, update, delete on public.contents");
    expect(sql).toContain("grant execute on function public.execute_final_approval");
    expect(sql).toContain("grant execute on function public.execute_publication");
  });

  it("does not contain execution tooling commands", () => {
    expect(sql).not.toMatch(/\b(psql|supabase db push|supabase migration up)\b/i);
  });

  it("has balanced function body delimiters and statement terminators", () => {
    expect(sql.match(/\$\$/g)).toHaveLength(4);
    expect(sql.match(/create or replace function/g)).toHaveLength(2);
    expect(sql.match(/end;\s*\$\$;/g)).toHaveLength(2);
  });
});
