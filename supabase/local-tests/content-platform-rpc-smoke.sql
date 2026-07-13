\set ON_ERROR_STOP on
\pset pager off
\pset format unaligned
\pset tuples_only on

begin;

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

create temporary table _test_results (
  scenario text not null,
  expected text not null,
  actual text not null,
  passed boolean not null
) on commit drop;

create temporary table _rpc_results (
  scenario text not null,
  step text not null,
  result jsonb not null
) on commit drop;

insert into public.profiles (id, email, display_name, role)
values ('00000000-0000-0000-0000-000000000001', 'admin-local@example.test', 'Local Admin', 'admin');

create function pg_temp.content_platform_case(
  p_n integer,
  p_workflow_status text default 'final_approved',
  p_approval_status text default 'approved',
  p_content_updated_at timestamptz default '2026-07-13T00:00:00Z'
) returns table (
  content_id uuid,
  revision_id uuid,
  review_id uuid,
  approval_id uuid,
  publication_id uuid
)
language plpgsql
as $$
declare
  suffix text := lpad(p_n::text, 12, '0');
  v_site_id uuid := ('10000000-0000-0000-0000-' || suffix)::uuid;
  v_topic_id uuid := ('20000000-0000-0000-0000-' || suffix)::uuid;
  v_content_id uuid := ('30000000-0000-0000-0000-' || suffix)::uuid;
  v_revision_id uuid := ('40000000-0000-0000-0000-' || suffix)::uuid;
  v_review_id uuid := ('50000000-0000-0000-0000-' || suffix)::uuid;
  v_approval_id uuid := ('60000000-0000-0000-0000-' || suffix)::uuid;
  v_publication_id uuid := ('70000000-0000-0000-0000-' || suffix)::uuid;
begin
  insert into public.sites (
    id, key, name, domain, content_domain, default_locale, timezone, status,
    settings, created_at, updated_at
  ) values (
    v_site_id, 'rpc-auto-site-' || p_n, 'RPC Auto Site ' || p_n,
    'rpc-auto-' || p_n || '.test.local', 'health', 'ko-KR', 'Asia/Seoul',
    'active', '{}'::jsonb, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z'
  );

  insert into public.topics (
    id, site_id, parent_topic_id, name, slug, topic_type, keywords, status,
    trend_score, last_collected_at, created_at, updated_at
  ) values (
    v_topic_id, v_site_id, null, 'RPC Auto Topic ' || p_n,
    'rpc-auto-topic-' || p_n, 'test', array[]::text[], 'active',
    null, null, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z'
  );

  insert into public.contents (
    id, site_id, primary_topic_id, content_type, working_title, slug,
    workflow_status, current_revision_id, approved_revision_id,
    published_revision_id, created_by_type, created_by_id, created_at,
    updated_at, archived_at
  ) values (
    v_content_id, v_site_id, v_topic_id, 'article', 'RPC Auto Content ' || p_n,
    'rpc-auto-content-' || p_n, p_workflow_status, null, null, null,
    'human', '00000000-0000-0000-0000-000000000001',
    '2026-07-13T00:00:00Z', p_content_updated_at, null
  );

  insert into public.content_revisions (
    id, content_id, parent_revision_id, source_draft_id, revision_number,
    author_type, title, summary, body_markdown, structured_blocks, seo_title,
    seo_description, change_summary, content_hash, created_by_type,
    created_by_id, created_at
  ) values (
    v_revision_id, v_content_id, null, null, 1, 'human',
    'RPC Auto Revision ' || p_n, 'Summary', 'Body', null, 'SEO',
    'Description', 'Initial', 'hash-rpc-auto-' || p_n, 'human',
    '00000000-0000-0000-0000-000000000001', '2026-07-13T00:00:00Z'
  );

  update public.contents
  set current_revision_id = v_revision_id,
      approved_revision_id = v_revision_id
  where id = v_content_id;

  insert into public.content_reviews (
    id, content_id, revision_id, stage, status, reviewer_id, comment,
    checklist_result, risk_scan_result, created_at, decided_at
  ) values (
    v_review_id, v_content_id, v_revision_id, 'first_review', 'approved',
    '00000000-0000-0000-0000-000000000001', 'review ok', '{}'::jsonb,
    '{}'::jsonb, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z'
  );

  insert into public.content_approvals (
    id, content_id, revision_id, first_review_id, status, approver_id,
    comment, created_at, decided_at, revoked_at
  ) values (
    v_approval_id, v_content_id, v_revision_id, v_review_id, p_approval_status,
    '00000000-0000-0000-0000-000000000001', 'approval for RPC auto ' || p_n,
    '2026-07-13T00:00:00Z',
    case when p_approval_status = 'approved' then '2026-07-13T00:00:00Z'::timestamptz else null end,
    case when p_approval_status = 'revoked' then '2026-07-13T00:01:00Z'::timestamptz else null end
  );

  return query select v_content_id, v_revision_id, v_review_id, v_approval_id, v_publication_id;
end;
$$;

create function pg_temp.final_approval_case(
  p_n integer,
  p_workflow_status text default 'final_approval_pending',
  p_review_status text default 'approved',
  p_content_updated_at timestamptz default '2026-07-13T00:00:00Z'
) returns table (
  content_id uuid,
  revision_id uuid,
  review_id uuid,
  approval_id uuid
)
language plpgsql
as $$
declare
  suffix text := lpad(p_n::text, 12, '0');
  v_site_id uuid := ('10000000-0000-0000-0000-' || suffix)::uuid;
  v_topic_id uuid := ('20000000-0000-0000-0000-' || suffix)::uuid;
  v_content_id uuid := ('30000000-0000-0000-0000-' || suffix)::uuid;
  v_revision_id uuid := ('40000000-0000-0000-0000-' || suffix)::uuid;
  v_review_id uuid := ('50000000-0000-0000-0000-' || suffix)::uuid;
  v_approval_id uuid := ('60000000-0000-0000-0000-' || suffix)::uuid;
begin
  insert into public.sites (
    id, key, name, domain, content_domain, default_locale, timezone, status,
    settings, created_at, updated_at
  ) values (
    v_site_id, 'rpc-final-site-' || p_n, 'RPC Final Site ' || p_n,
    'rpc-final-' || p_n || '.test.local', 'health', 'ko-KR', 'Asia/Seoul',
    'active', '{}'::jsonb, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z'
  );

  insert into public.topics (
    id, site_id, parent_topic_id, name, slug, topic_type, keywords, status,
    trend_score, last_collected_at, created_at, updated_at
  ) values (
    v_topic_id, v_site_id, null, 'RPC Final Topic ' || p_n,
    'rpc-final-topic-' || p_n, 'test', array[]::text[], 'active',
    null, null, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z'
  );

  insert into public.contents (
    id, site_id, primary_topic_id, content_type, working_title, slug,
    workflow_status, current_revision_id, approved_revision_id,
    published_revision_id, created_by_type, created_by_id, created_at,
    updated_at, archived_at
  ) values (
    v_content_id, v_site_id, v_topic_id, 'article', 'RPC Final Content ' || p_n,
    'rpc-final-content-' || p_n, p_workflow_status, null, null, null,
    'human', '00000000-0000-0000-0000-000000000001',
    '2026-07-13T00:00:00Z', p_content_updated_at, null
  );

  insert into public.content_revisions (
    id, content_id, parent_revision_id, source_draft_id, revision_number,
    author_type, title, summary, body_markdown, structured_blocks, seo_title,
    seo_description, change_summary, content_hash, created_by_type,
    created_by_id, created_at
  ) values (
    v_revision_id, v_content_id, null, null, 1, 'human',
    'RPC Final Revision ' || p_n, 'Summary', 'Body', null, 'SEO',
    'Description', 'Initial', 'hash-rpc-final-' || p_n, 'human',
    '00000000-0000-0000-0000-000000000001', '2026-07-13T00:00:00Z'
  );

  update public.contents
  set current_revision_id = v_revision_id
  where id = v_content_id;

  insert into public.content_reviews (
    id, content_id, revision_id, stage, status, reviewer_id, comment,
    checklist_result, risk_scan_result, created_at, decided_at
  ) values (
    v_review_id, v_content_id, v_revision_id, 'first_review', p_review_status,
    '00000000-0000-0000-0000-000000000001', 'review for final approval',
    '{}'::jsonb, '{}'::jsonb, '2026-07-13T00:00:00Z',
    case when p_review_status = 'pending' then null else '2026-07-13T00:00:00Z'::timestamptz end
  );

  return query select v_content_id, v_revision_id, v_review_id, v_approval_id;
end;
$$;

-- 1. pending Approval publication reject
select * from pg_temp.content_platform_case(101, 'final_approved', 'pending');

insert into _rpc_results (scenario, step, result)
select 'pending Approval publication reject', 'rpc',
  public.execute_publication(
    'rpc-auto-pending-reject-1', 'fingerprint-rpc-auto-pending-reject-1',
    '30000000-0000-0000-0000-000000000101',
    '40000000-0000-0000-0000-000000000101',
    '60000000-0000-0000-0000-000000000101',
    '70000000-0000-0000-0000-000000000101',
    'immediate', '2026-07-13T00:00:00Z', '2026-07-13T00:10:00Z', null
  );

insert into _test_results
select 'pending Approval publication reject',
       'APPROVAL_NOT_VALID, no publication, no operation, final_approved preserved',
       (select result::text from _rpc_results where scenario = 'pending Approval publication reject') ||
         ', publications=' || (select count(*) from public.content_publications where id = '70000000-0000-0000-0000-000000000101') ||
         ', workflow=' || (select workflow_status from public.contents where id = '30000000-0000-0000-0000-000000000101') ||
         ', operations=' || (select count(*) from public.content_operations where operation_id = 'rpc-auto-pending-reject-1'),
       (select result->>'code' from _rpc_results where scenario = 'pending Approval publication reject') = 'APPROVAL_NOT_VALID'
         and (select count(*) from public.content_publications where id = '70000000-0000-0000-0000-000000000101') = 0
         and (select workflow_status from public.contents where id = '30000000-0000-0000-0000-000000000101') = 'final_approved'
         and (select count(*) from public.content_operations where operation_id = 'rpc-auto-pending-reject-1') = 0;

-- 2. approved immediate publication success
select * from pg_temp.content_platform_case(102, 'final_approved', 'approved');

insert into _rpc_results (scenario, step, result)
select 'approved immediate publication success', 'rpc',
  public.execute_publication(
    'rpc-auto-success-1', 'fingerprint-rpc-auto-success-1',
    '30000000-0000-0000-0000-000000000102',
    '40000000-0000-0000-0000-000000000102',
    '60000000-0000-0000-0000-000000000102',
    '70000000-0000-0000-0000-000000000102',
    'immediate', '2026-07-13T00:00:00Z', '2026-07-13T00:10:00Z', null
  );

insert into _test_results
select 'approved immediate publication success',
       'committed, one published publication, content published, one operation',
       (select result::text from _rpc_results where scenario = 'approved immediate publication success') ||
         ', publications=' || (select count(*) from public.content_publications where id = '70000000-0000-0000-0000-000000000102' and status = 'published') ||
         ', workflow=' || (select workflow_status from public.contents where id = '30000000-0000-0000-0000-000000000102') ||
         ', published_revision_id=' || coalesce((select published_revision_id::text from public.contents where id = '30000000-0000-0000-0000-000000000102'), '<null>') ||
         ', operations=' || (select count(*) from public.content_operations where operation_id = 'rpc-auto-success-1'),
       (select result->>'outcome' from _rpc_results where scenario = 'approved immediate publication success') = 'committed'
         and (select count(*) from public.content_publications where id = '70000000-0000-0000-0000-000000000102' and status = 'published') = 1
         and (select workflow_status from public.contents where id = '30000000-0000-0000-0000-000000000102') = 'published'
         and (select published_revision_id from public.contents where id = '30000000-0000-0000-0000-000000000102') = '40000000-0000-0000-0000-000000000102'::uuid
         and (select count(*) from public.content_operations where operation_id = 'rpc-auto-success-1') = 1;

-- 3. replay idempotency
select * from pg_temp.content_platform_case(103, 'final_approved', 'approved');

insert into _rpc_results (scenario, step, result)
select 'replay idempotency', 'first',
  public.execute_publication(
    'rpc-auto-replay-1', 'fingerprint-rpc-auto-replay-1',
    '30000000-0000-0000-0000-000000000103',
    '40000000-0000-0000-0000-000000000103',
    '60000000-0000-0000-0000-000000000103',
    '70000000-0000-0000-0000-000000000103',
    'immediate', '2026-07-13T00:00:00Z', '2026-07-13T00:10:00Z', null
  );

insert into _rpc_results (scenario, step, result)
select 'replay idempotency', 'second',
  public.execute_publication(
    'rpc-auto-replay-1', 'fingerprint-rpc-auto-replay-1',
    '30000000-0000-0000-0000-000000000103',
    '40000000-0000-0000-0000-000000000103',
    '60000000-0000-0000-0000-000000000103',
    '70000000-0000-0000-0000-000000000103',
    'immediate', '2026-07-13T00:00:00Z', '2026-07-13T00:10:00Z', null
  );

insert into _test_results
select 'replay idempotency',
       'first committed, second replayed, one publication, one operation',
       'first=' || (select result::text from _rpc_results where scenario = 'replay idempotency' and step = 'first') ||
         ', second=' || (select result::text from _rpc_results where scenario = 'replay idempotency' and step = 'second') ||
         ', publications=' || (select count(*) from public.content_publications where content_id = '30000000-0000-0000-0000-000000000103') ||
         ', operations=' || (select count(*) from public.content_operations where operation_id = 'rpc-auto-replay-1'),
       (select result->>'outcome' from _rpc_results where scenario = 'replay idempotency' and step = 'first') = 'committed'
         and (select result->>'outcome' from _rpc_results where scenario = 'replay idempotency' and step = 'second') = 'replayed'
         and (select count(*) from public.content_publications where content_id = '30000000-0000-0000-0000-000000000103') = 1
         and (select count(*) from public.content_operations where operation_id = 'rpc-auto-replay-1') = 1;

-- 4. OPERATION_PAYLOAD_MISMATCH
select * from pg_temp.content_platform_case(104, 'final_approved', 'approved');

insert into _rpc_results (scenario, step, result)
select 'OPERATION_PAYLOAD_MISMATCH', 'first',
  public.execute_publication(
    'rpc-auto-mismatch-1', 'fingerprint-rpc-auto-mismatch-original',
    '30000000-0000-0000-0000-000000000104',
    '40000000-0000-0000-0000-000000000104',
    '60000000-0000-0000-0000-000000000104',
    '70000000-0000-0000-0000-000000000104',
    'immediate', '2026-07-13T00:00:00Z', '2026-07-13T00:10:00Z', null
  );

insert into _rpc_results (scenario, step, result)
select 'OPERATION_PAYLOAD_MISMATCH', 'second',
  public.execute_publication(
    'rpc-auto-mismatch-1', 'fingerprint-rpc-auto-mismatch-changed',
    '30000000-0000-0000-0000-000000000104',
    '40000000-0000-0000-0000-000000000104',
    '60000000-0000-0000-0000-000000000104',
    '70000000-0000-0000-0000-000000000104',
    'immediate', '2026-07-13T00:00:00Z', '2026-07-13T00:10:00Z', null
  );

insert into _test_results
select 'OPERATION_PAYLOAD_MISMATCH',
       'first committed, second mismatch, one publication, original fingerprint stored',
       'first=' || (select result::text from _rpc_results where scenario = 'OPERATION_PAYLOAD_MISMATCH' and step = 'first') ||
         ', second=' || (select result::text from _rpc_results where scenario = 'OPERATION_PAYLOAD_MISMATCH' and step = 'second') ||
         ', publications=' || (select count(*) from public.content_publications where content_id = '30000000-0000-0000-0000-000000000104') ||
         ', stored_fingerprint=' || (select operation_fingerprint from public.content_operations where operation_id = 'rpc-auto-mismatch-1'),
       (select result->>'outcome' from _rpc_results where scenario = 'OPERATION_PAYLOAD_MISMATCH' and step = 'first') = 'committed'
         and (select result->>'code' from _rpc_results where scenario = 'OPERATION_PAYLOAD_MISMATCH' and step = 'second') = 'OPERATION_PAYLOAD_MISMATCH'
         and (select count(*) from public.content_publications where content_id = '30000000-0000-0000-0000-000000000104') = 1
         and (select operation_fingerprint from public.content_operations where operation_id = 'rpc-auto-mismatch-1') = 'fingerprint-rpc-auto-mismatch-original';

-- 5. CONTENT_UPDATED OCC reject
select * from pg_temp.content_platform_case(105, 'final_approved', 'approved');

insert into _rpc_results (scenario, step, result)
select 'CONTENT_UPDATED OCC reject', 'rpc',
  public.execute_publication(
    'rpc-auto-content-updated-1', 'fingerprint-rpc-auto-content-updated-1',
    '30000000-0000-0000-0000-000000000105',
    '40000000-0000-0000-0000-000000000105',
    '60000000-0000-0000-0000-000000000105',
    '70000000-0000-0000-0000-000000000105',
    'immediate', '2026-07-12T23:59:59Z', '2026-07-13T00:10:00Z', null
  );

insert into _test_results
select 'CONTENT_UPDATED OCC reject',
       'CONTENT_UPDATED, no publication, no operation, content unchanged',
       (select result::text from _rpc_results where scenario = 'CONTENT_UPDATED OCC reject') ||
         ', publications=' || (select count(*) from public.content_publications where id = '70000000-0000-0000-0000-000000000105') ||
         ', workflow=' || (select workflow_status from public.contents where id = '30000000-0000-0000-0000-000000000105') ||
         ', updated_at=' || (select updated_at::text from public.contents where id = '30000000-0000-0000-0000-000000000105') ||
         ', operations=' || (select count(*) from public.content_operations where operation_id = 'rpc-auto-content-updated-1'),
       (select result->>'code' from _rpc_results where scenario = 'CONTENT_UPDATED OCC reject') = 'CONTENT_UPDATED'
         and (select count(*) from public.content_publications where id = '70000000-0000-0000-0000-000000000105') = 0
         and (select workflow_status from public.contents where id = '30000000-0000-0000-0000-000000000105') = 'final_approved'
         and (select updated_at from public.contents where id = '30000000-0000-0000-0000-000000000105') = '2026-07-13T00:00:00Z'::timestamptz
         and (select count(*) from public.content_operations where operation_id = 'rpc-auto-content-updated-1') = 0;

-- 6. WORKFLOW_CHANGED publication reject
select * from pg_temp.content_platform_case(106, 'first_review_approved', 'approved');

insert into _rpc_results (scenario, step, result)
select 'WORKFLOW_CHANGED publication reject', 'rpc',
  public.execute_publication(
    'rpc-auto-workflow-changed-1', 'fingerprint-rpc-auto-workflow-changed-1',
    '30000000-0000-0000-0000-000000000106',
    '40000000-0000-0000-0000-000000000106',
    '60000000-0000-0000-0000-000000000106',
    '70000000-0000-0000-0000-000000000106',
    'immediate', '2026-07-13T00:00:00Z', '2026-07-13T00:10:00Z', null
  );

insert into _test_results
select 'WORKFLOW_CHANGED publication reject',
       'WORKFLOW_CHANGED, no publication, no operation, workflow unchanged',
       (select result::text from _rpc_results where scenario = 'WORKFLOW_CHANGED publication reject') ||
         ', publications=' || (select count(*) from public.content_publications where id = '70000000-0000-0000-0000-000000000106') ||
         ', workflow=' || (select workflow_status from public.contents where id = '30000000-0000-0000-0000-000000000106') ||
         ', operations=' || (select count(*) from public.content_operations where operation_id = 'rpc-auto-workflow-changed-1'),
       (select result->>'code' from _rpc_results where scenario = 'WORKFLOW_CHANGED publication reject') = 'WORKFLOW_CHANGED'
         and (select count(*) from public.content_publications where id = '70000000-0000-0000-0000-000000000106') = 0
         and (select workflow_status from public.contents where id = '30000000-0000-0000-0000-000000000106') = 'first_review_approved'
         and (select count(*) from public.content_operations where operation_id = 'rpc-auto-workflow-changed-1') = 0;

-- 7. final approval committed success
select * from pg_temp.final_approval_case(201, 'final_approval_pending', 'approved');

insert into _rpc_results (scenario, step, result)
select 'final approval committed success', 'rpc',
  public.execute_final_approval(
    'rpc-final-success-1', 'fingerprint-rpc-final-success-1',
    '30000000-0000-0000-0000-000000000201',
    '40000000-0000-0000-0000-000000000201',
    '50000000-0000-0000-0000-000000000201',
    '60000000-0000-0000-0000-000000000201',
    '2026-07-13T00:00:00Z', '2026-07-13T00:10:00Z', 'final approval ok'
  );

insert into _test_results
select 'final approval committed success',
       'committed, one approved approval, content final_approved, one operation',
       (select result::text from _rpc_results where scenario = 'final approval committed success') ||
         ', approvals=' || (select count(*) from public.content_approvals where id = '60000000-0000-0000-0000-000000000201' and status = 'approved') ||
         ', workflow=' || (select workflow_status from public.contents where id = '30000000-0000-0000-0000-000000000201') ||
         ', approved_revision_id=' || coalesce((select approved_revision_id::text from public.contents where id = '30000000-0000-0000-0000-000000000201'), '<null>') ||
         ', operations=' || (select count(*) from public.content_operations where operation_id = 'rpc-final-success-1'),
       (select result->>'outcome' from _rpc_results where scenario = 'final approval committed success') = 'committed'
         and (select count(*) from public.content_approvals where id = '60000000-0000-0000-0000-000000000201' and status = 'approved') = 1
         and (select workflow_status from public.contents where id = '30000000-0000-0000-0000-000000000201') = 'final_approved'
         and (select approved_revision_id from public.contents where id = '30000000-0000-0000-0000-000000000201') = '40000000-0000-0000-0000-000000000201'::uuid
         and (select count(*) from public.content_operations where operation_id = 'rpc-final-success-1') = 1;

-- 8. final approval replay idempotency
select * from pg_temp.final_approval_case(202, 'final_approval_pending', 'approved');

insert into _rpc_results (scenario, step, result)
select 'final approval replay idempotency', 'first',
  public.execute_final_approval(
    'rpc-final-replay-1', 'fingerprint-rpc-final-replay-1',
    '30000000-0000-0000-0000-000000000202',
    '40000000-0000-0000-0000-000000000202',
    '50000000-0000-0000-0000-000000000202',
    '60000000-0000-0000-0000-000000000202',
    '2026-07-13T00:00:00Z', '2026-07-13T00:10:00Z', 'final approval replay'
  );

insert into _rpc_results (scenario, step, result)
select 'final approval replay idempotency', 'second',
  public.execute_final_approval(
    'rpc-final-replay-1', 'fingerprint-rpc-final-replay-1',
    '30000000-0000-0000-0000-000000000202',
    '40000000-0000-0000-0000-000000000202',
    '50000000-0000-0000-0000-000000000202',
    '60000000-0000-0000-0000-000000000202',
    '2026-07-13T00:00:00Z', '2026-07-13T00:10:00Z', 'final approval replay'
  );

insert into _test_results
select 'final approval replay idempotency',
       'first committed, second replayed, one approval, one operation',
       'first=' || (select result::text from _rpc_results where scenario = 'final approval replay idempotency' and step = 'first') ||
         ', second=' || (select result::text from _rpc_results where scenario = 'final approval replay idempotency' and step = 'second') ||
         ', approvals=' || (select count(*) from public.content_approvals where content_id = '30000000-0000-0000-0000-000000000202') ||
         ', operations=' || (select count(*) from public.content_operations where operation_id = 'rpc-final-replay-1'),
       (select result->>'outcome' from _rpc_results where scenario = 'final approval replay idempotency' and step = 'first') = 'committed'
         and (select result->>'outcome' from _rpc_results where scenario = 'final approval replay idempotency' and step = 'second') = 'replayed'
         and (select count(*) from public.content_approvals where content_id = '30000000-0000-0000-0000-000000000202') = 1
         and (select count(*) from public.content_operations where operation_id = 'rpc-final-replay-1') = 1;

-- 9. final approval OPERATION_PAYLOAD_MISMATCH
select * from pg_temp.final_approval_case(203, 'final_approval_pending', 'approved');

insert into _rpc_results (scenario, step, result)
select 'final approval OPERATION_PAYLOAD_MISMATCH', 'first',
  public.execute_final_approval(
    'rpc-final-mismatch-1', 'fingerprint-rpc-final-mismatch-original',
    '30000000-0000-0000-0000-000000000203',
    '40000000-0000-0000-0000-000000000203',
    '50000000-0000-0000-0000-000000000203',
    '60000000-0000-0000-0000-000000000203',
    '2026-07-13T00:00:00Z', '2026-07-13T00:10:00Z', 'final approval mismatch'
  );

insert into _rpc_results (scenario, step, result)
select 'final approval OPERATION_PAYLOAD_MISMATCH', 'second',
  public.execute_final_approval(
    'rpc-final-mismatch-1', 'fingerprint-rpc-final-mismatch-changed',
    '30000000-0000-0000-0000-000000000203',
    '40000000-0000-0000-0000-000000000203',
    '50000000-0000-0000-0000-000000000203',
    '60000000-0000-0000-0000-000000000203',
    '2026-07-13T00:00:00Z', '2026-07-13T00:10:00Z', 'final approval mismatch'
  );

insert into _test_results
select 'final approval OPERATION_PAYLOAD_MISMATCH',
       'first committed, second mismatch, one approval, original fingerprint stored',
       'first=' || (select result::text from _rpc_results where scenario = 'final approval OPERATION_PAYLOAD_MISMATCH' and step = 'first') ||
         ', second=' || (select result::text from _rpc_results where scenario = 'final approval OPERATION_PAYLOAD_MISMATCH' and step = 'second') ||
         ', approvals=' || (select count(*) from public.content_approvals where content_id = '30000000-0000-0000-0000-000000000203') ||
         ', stored_fingerprint=' || (select operation_fingerprint from public.content_operations where operation_id = 'rpc-final-mismatch-1'),
       (select result->>'outcome' from _rpc_results where scenario = 'final approval OPERATION_PAYLOAD_MISMATCH' and step = 'first') = 'committed'
         and (select result->>'code' from _rpc_results where scenario = 'final approval OPERATION_PAYLOAD_MISMATCH' and step = 'second') = 'OPERATION_PAYLOAD_MISMATCH'
         and (select count(*) from public.content_approvals where content_id = '30000000-0000-0000-0000-000000000203') = 1
         and (select operation_fingerprint from public.content_operations where operation_id = 'rpc-final-mismatch-1') = 'fingerprint-rpc-final-mismatch-original';

-- 10. final approval CONTENT_UPDATED OCC reject
select * from pg_temp.final_approval_case(204, 'final_approval_pending', 'approved');

insert into _rpc_results (scenario, step, result)
select 'final approval CONTENT_UPDATED OCC reject', 'rpc',
  public.execute_final_approval(
    'rpc-final-content-updated-1', 'fingerprint-rpc-final-content-updated-1',
    '30000000-0000-0000-0000-000000000204',
    '40000000-0000-0000-0000-000000000204',
    '50000000-0000-0000-0000-000000000204',
    '60000000-0000-0000-0000-000000000204',
    '2026-07-12T23:59:59Z', '2026-07-13T00:10:00Z', 'stale approval'
  );

insert into _test_results
select 'final approval CONTENT_UPDATED OCC reject',
       'CONTENT_UPDATED, no approval, no operation, workflow unchanged',
       (select result::text from _rpc_results where scenario = 'final approval CONTENT_UPDATED OCC reject') ||
         ', approvals=' || (select count(*) from public.content_approvals where id = '60000000-0000-0000-0000-000000000204') ||
         ', workflow=' || (select workflow_status from public.contents where id = '30000000-0000-0000-0000-000000000204') ||
         ', operations=' || (select count(*) from public.content_operations where operation_id = 'rpc-final-content-updated-1'),
       (select result->>'code' from _rpc_results where scenario = 'final approval CONTENT_UPDATED OCC reject') = 'CONTENT_UPDATED'
         and (select count(*) from public.content_approvals where id = '60000000-0000-0000-0000-000000000204') = 0
         and (select workflow_status from public.contents where id = '30000000-0000-0000-0000-000000000204') = 'final_approval_pending'
         and (select count(*) from public.content_operations where operation_id = 'rpc-final-content-updated-1') = 0;

-- 11. final approval WORKFLOW_CHANGED reject
select * from pg_temp.final_approval_case(205, 'first_review_approved', 'approved');

insert into _rpc_results (scenario, step, result)
select 'final approval WORKFLOW_CHANGED reject', 'rpc',
  public.execute_final_approval(
    'rpc-final-workflow-changed-1', 'fingerprint-rpc-final-workflow-changed-1',
    '30000000-0000-0000-0000-000000000205',
    '40000000-0000-0000-0000-000000000205',
    '50000000-0000-0000-0000-000000000205',
    '60000000-0000-0000-0000-000000000205',
    '2026-07-13T00:00:00Z', '2026-07-13T00:10:00Z', 'wrong workflow'
  );

insert into _test_results
select 'final approval WORKFLOW_CHANGED reject',
       'WORKFLOW_CHANGED, no approval, no operation, workflow unchanged',
       (select result::text from _rpc_results where scenario = 'final approval WORKFLOW_CHANGED reject') ||
         ', approvals=' || (select count(*) from public.content_approvals where id = '60000000-0000-0000-0000-000000000205') ||
         ', workflow=' || (select workflow_status from public.contents where id = '30000000-0000-0000-0000-000000000205') ||
         ', operations=' || (select count(*) from public.content_operations where operation_id = 'rpc-final-workflow-changed-1'),
       (select result->>'code' from _rpc_results where scenario = 'final approval WORKFLOW_CHANGED reject') = 'WORKFLOW_CHANGED'
         and (select count(*) from public.content_approvals where id = '60000000-0000-0000-0000-000000000205') = 0
         and (select workflow_status from public.contents where id = '30000000-0000-0000-0000-000000000205') = 'first_review_approved'
         and (select count(*) from public.content_operations where operation_id = 'rpc-final-workflow-changed-1') = 0;

-- 12. final approval unapproved review reject
select * from pg_temp.final_approval_case(206, 'final_approval_pending', 'pending');

insert into _rpc_results (scenario, step, result)
select 'final approval unapproved review reject', 'rpc',
  public.execute_final_approval(
    'rpc-final-review-not-approved-1', 'fingerprint-rpc-final-review-not-approved-1',
    '30000000-0000-0000-0000-000000000206',
    '40000000-0000-0000-0000-000000000206',
    '50000000-0000-0000-0000-000000000206',
    '60000000-0000-0000-0000-000000000206',
    '2026-07-13T00:00:00Z', '2026-07-13T00:10:00Z', 'review pending'
  );

insert into _test_results
select 'final approval unapproved review reject',
       'REVIEW_NOT_APPROVED, no approval, no operation, workflow unchanged',
       (select result::text from _rpc_results where scenario = 'final approval unapproved review reject') ||
         ', approvals=' || (select count(*) from public.content_approvals where id = '60000000-0000-0000-0000-000000000206') ||
         ', workflow=' || (select workflow_status from public.contents where id = '30000000-0000-0000-0000-000000000206') ||
         ', operations=' || (select count(*) from public.content_operations where operation_id = 'rpc-final-review-not-approved-1'),
       (select result->>'code' from _rpc_results where scenario = 'final approval unapproved review reject') = 'REVIEW_NOT_APPROVED'
         and (select count(*) from public.content_approvals where id = '60000000-0000-0000-0000-000000000206') = 0
         and (select workflow_status from public.contents where id = '30000000-0000-0000-0000-000000000206') = 'final_approval_pending'
         and (select count(*) from public.content_operations where operation_id = 'rpc-final-review-not-approved-1') = 0;

select 'RPC_SAFETY_RESULT|' || scenario || '|' || case when passed then 'PASS' else 'FAIL' end || '|' || expected || '|' || actual
from _test_results
order by scenario;

select 'RPC_SAFETY_SUMMARY:' || jsonb_build_object(
  'passedCount', count(*) filter (where passed),
  'failedCount', count(*) filter (where not passed),
  'totalCount', count(*)
)::text
from _test_results;

rollback;
