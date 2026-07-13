\set ON_ERROR_STOP on

begin;

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

create temporary table _test_results (
  scenario text not null,
  expected text not null,
  actual text not null,
  passed boolean not null,
  notes text
) on commit drop;

create temporary table _rpc_results (
  scenario text not null,
  step text not null,
  result jsonb not null
) on commit drop;

insert into public.profiles (id, email, display_name, role)
values ('00000000-0000-0000-0000-000000000001', 'admin-local@example.test', 'Local Admin', 'admin');

-- Scenario 1: publication workflow guard
insert into public.sites (id, key, name, domain, content_domain, default_locale, timezone, status, settings, created_at, updated_at)
values ('11000000-0000-0000-0000-000000000001', 'bundle-workflow-site', 'Bundle Workflow Site', 'bundle-workflow.test.local', 'health', 'ko-KR', 'Asia/Seoul', 'active', '{}'::jsonb, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z');
insert into public.topics (id, site_id, parent_topic_id, name, slug, topic_type, keywords, status, trend_score, last_collected_at, created_at, updated_at)
values ('21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', null, 'Workflow Topic', 'workflow-topic', 'test', array[]::text[], 'active', null, null, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z');
insert into public.contents (id, site_id, primary_topic_id, content_type, working_title, slug, workflow_status, current_revision_id, approved_revision_id, published_revision_id, created_by_type, created_by_id, created_at, updated_at, archived_at)
values ('31000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'article', 'Workflow Content', 'workflow-content', 'first_review_approved', null, null, null, 'human', '00000000-0000-0000-0000-000000000001', '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z', null);
insert into public.content_revisions (id, content_id, parent_revision_id, source_draft_id, revision_number, author_type, title, summary, body_markdown, structured_blocks, seo_title, seo_description, change_summary, content_hash, created_by_type, created_by_id, created_at)
values ('41000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', null, null, 1, 'human', 'Workflow Revision', 'Summary', 'Body', null, 'SEO', 'Description', 'Initial', 'hash-bundle-workflow-1', 'human', '00000000-0000-0000-0000-000000000001', '2026-07-13T00:00:00Z');
update public.contents set current_revision_id = '41000000-0000-0000-0000-000000000001', approved_revision_id = '41000000-0000-0000-0000-000000000001' where id = '31000000-0000-0000-0000-000000000001';
insert into public.content_reviews (id, content_id, revision_id, stage, status, reviewer_id, comment, checklist_result, risk_scan_result, created_at, decided_at)
values ('51000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 'first_review', 'approved', '00000000-0000-0000-0000-000000000001', 'review ok', '{}'::jsonb, '{}'::jsonb, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z');
insert into public.content_approvals (id, content_id, revision_id, first_review_id, status, approver_id, comment, created_at, decided_at, revoked_at)
values ('61000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'approved', '00000000-0000-0000-0000-000000000001', 'approved but workflow not ready', '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z', null);

with rpc as (
  select public.execute_publication(
    'bundle-workflow-changed-1', 'fingerprint-bundle-workflow-changed-1',
    '31000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001',
    'immediate', '2026-07-13T00:00:00Z', '2026-07-13T00:10:00Z', null
  ) as result
), checks as (
  select
    result,
    (select count(*) from public.content_publications where id = '71000000-0000-0000-0000-000000000001') as publication_count,
    (select workflow_status from public.contents where id = '31000000-0000-0000-0000-000000000001') as workflow_status,
    (select count(*) from public.content_operations where operation_id = 'bundle-workflow-changed-1') as operation_count
  from rpc
)
insert into _test_results
select 'WORKFLOW_CHANGED publication guard',
       'WORKFLOW_CHANGED, no publication, no operation, content remains first_review_approved',
       result::text || ', publications=' || publication_count || ', workflow=' || workflow_status || ', operations=' || operation_count,
       result->>'code' = 'WORKFLOW_CHANGED' and publication_count = 0 and workflow_status = 'first_review_approved' and operation_count = 0,
       null
from checks;

-- Scenario 2: transaction rollback after an insert-time error inside execute_publication.
insert into public.sites (id, key, name, domain, content_domain, default_locale, timezone, status, settings, created_at, updated_at)
values ('11000000-0000-0000-0000-000000000002', 'bundle-rollback-site', 'Bundle Rollback Site', 'bundle-rollback.test.local', 'health', 'ko-KR', 'Asia/Seoul', 'active', '{}'::jsonb, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z');
insert into public.topics (id, site_id, parent_topic_id, name, slug, topic_type, keywords, status, trend_score, last_collected_at, created_at, updated_at)
values ('21000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', null, 'Rollback Topic', 'rollback-topic', 'test', array[]::text[], 'active', null, null, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z');
insert into public.contents (id, site_id, primary_topic_id, content_type, working_title, slug, workflow_status, current_revision_id, approved_revision_id, published_revision_id, created_by_type, created_by_id, created_at, updated_at, archived_at)
values
  ('31000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', 'article', 'Rollback Target Content', 'rollback-target-content', 'final_approved', null, null, null, 'human', '00000000-0000-0000-0000-000000000001', '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z', null),
  ('31000000-0000-0000-0000-000000000092', '11000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', 'article', 'Rollback Existing Content', 'rollback-existing-content', 'published', null, null, null, 'human', '00000000-0000-0000-0000-000000000001', '2026-07-13T00:00:00Z', '2026-07-13T00:10:00Z', null);
insert into public.content_revisions (id, content_id, parent_revision_id, source_draft_id, revision_number, author_type, title, summary, body_markdown, structured_blocks, seo_title, seo_description, change_summary, content_hash, created_by_type, created_by_id, created_at)
values
  ('41000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000002', null, null, 1, 'human', 'Rollback Target Revision', 'Summary', 'Body', null, 'SEO', 'Description', 'Initial', 'hash-bundle-rollback-target', 'human', '00000000-0000-0000-0000-000000000001', '2026-07-13T00:00:00Z'),
  ('41000000-0000-0000-0000-000000000092', '31000000-0000-0000-0000-000000000092', null, null, 1, 'human', 'Rollback Existing Revision', 'Summary', 'Body', null, 'SEO', 'Description', 'Initial', 'hash-bundle-rollback-existing', 'human', '00000000-0000-0000-0000-000000000001', '2026-07-13T00:00:00Z');
update public.contents set current_revision_id = '41000000-0000-0000-0000-000000000002', approved_revision_id = '41000000-0000-0000-0000-000000000002' where id = '31000000-0000-0000-0000-000000000002';
update public.contents set current_revision_id = '41000000-0000-0000-0000-000000000092', approved_revision_id = '41000000-0000-0000-0000-000000000092', published_revision_id = '41000000-0000-0000-0000-000000000092' where id = '31000000-0000-0000-0000-000000000092';
insert into public.content_reviews (id, content_id, revision_id, stage, status, reviewer_id, comment, checklist_result, risk_scan_result, created_at, decided_at)
values
  ('51000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000002', 'first_review', 'approved', '00000000-0000-0000-0000-000000000001', 'review ok', '{}'::jsonb, '{}'::jsonb, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z'),
  ('51000000-0000-0000-0000-000000000092', '31000000-0000-0000-0000-000000000092', '41000000-0000-0000-0000-000000000092', 'first_review', 'approved', '00000000-0000-0000-0000-000000000001', 'review ok', '{}'::jsonb, '{}'::jsonb, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z');
insert into public.content_approvals (id, content_id, revision_id, first_review_id, status, approver_id, comment, created_at, decided_at, revoked_at)
values
  ('61000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000002', 'approved', '00000000-0000-0000-0000-000000000001', 'approved target', '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z', null),
  ('61000000-0000-0000-0000-000000000092', '31000000-0000-0000-0000-000000000092', '41000000-0000-0000-0000-000000000092', '51000000-0000-0000-0000-000000000092', 'approved', '00000000-0000-0000-0000-000000000001', 'approved existing', '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z', null);
insert into public.content_publications (id, site_id, content_id, revision_id, approval_id, status, scheduled_at, published_at, created_by_admin_id, created_at, updated_at)
values ('71000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000092', '41000000-0000-0000-0000-000000000092', '61000000-0000-0000-0000-000000000092', 'published', null, '2026-07-13T00:10:00Z', '00000000-0000-0000-0000-000000000001', '2026-07-13T00:10:00Z', '2026-07-13T00:10:00Z');

do $$
declare
  target_publications integer;
  target_workflow text;
  target_operations integer;
begin
  begin
    perform public.execute_publication(
      'bundle-rollback-error-1', 'fingerprint-bundle-rollback-error-1',
      '31000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000002',
      '61000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000002',
      'immediate', '2026-07-13T00:00:00Z', '2026-07-13T00:10:00Z', null
    );
    insert into _test_results values ('transaction rollback on insert error', 'unique violation caught and target unchanged', 'unexpected success', false, 'expected duplicate publication id to raise unique_violation');
  exception when unique_violation then
    select count(*) into target_publications from public.content_publications where content_id = '31000000-0000-0000-0000-000000000002';
    select workflow_status into target_workflow from public.contents where id = '31000000-0000-0000-0000-000000000002';
    select count(*) into target_operations from public.content_operations where operation_id = 'bundle-rollback-error-1';
    insert into _test_results
    values (
      'transaction rollback on insert error',
      'unique violation caught, no target publication, workflow remains final_approved, no operation',
      'unique_violation, target_publications=' || target_publications || ', workflow=' || target_workflow || ', operations=' || target_operations,
      target_publications = 0 and target_workflow = 'final_approved' and target_operations = 0,
      null
    );
  end;
end $$;

-- Scenario 3: publication conflict guard, modeling a prior active publication winner.
insert into public.sites (id, key, name, domain, content_domain, default_locale, timezone, status, settings, created_at, updated_at)
values ('11000000-0000-0000-0000-000000000003', 'bundle-publication-conflict-site', 'Bundle Publication Conflict Site', 'bundle-publication-conflict.test.local', 'health', 'ko-KR', 'Asia/Seoul', 'active', '{}'::jsonb, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z');
insert into public.topics (id, site_id, parent_topic_id, name, slug, topic_type, keywords, status, trend_score, last_collected_at, created_at, updated_at)
values ('21000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', null, 'Publication Conflict Topic', 'publication-conflict-topic', 'test', array[]::text[], 'active', null, null, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z');
insert into public.contents (id, site_id, primary_topic_id, content_type, working_title, slug, workflow_status, current_revision_id, approved_revision_id, published_revision_id, created_by_type, created_by_id, created_at, updated_at, archived_at)
values ('31000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000003', 'article', 'Publication Conflict Content', 'publication-conflict-content', 'final_approved', null, null, null, 'human', '00000000-0000-0000-0000-000000000001', '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z', null);
insert into public.content_revisions (id, content_id, parent_revision_id, source_draft_id, revision_number, author_type, title, summary, body_markdown, structured_blocks, seo_title, seo_description, change_summary, content_hash, created_by_type, created_by_id, created_at)
values ('41000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000003', null, null, 1, 'human', 'Publication Conflict Revision', 'Summary', 'Body', null, 'SEO', 'Description', 'Initial', 'hash-bundle-publication-conflict', 'human', '00000000-0000-0000-0000-000000000001', '2026-07-13T00:00:00Z');
update public.contents set current_revision_id = '41000000-0000-0000-0000-000000000003', approved_revision_id = '41000000-0000-0000-0000-000000000003' where id = '31000000-0000-0000-0000-000000000003';
insert into public.content_reviews (id, content_id, revision_id, stage, status, reviewer_id, comment, checklist_result, risk_scan_result, created_at, decided_at)
values ('51000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000003', '41000000-0000-0000-0000-000000000003', 'first_review', 'approved', '00000000-0000-0000-0000-000000000001', 'review ok', '{}'::jsonb, '{}'::jsonb, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z');
insert into public.content_approvals (id, content_id, revision_id, first_review_id, status, approver_id, comment, created_at, decided_at, revoked_at)
values ('61000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000003', '41000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000003', 'approved', '00000000-0000-0000-0000-000000000001', 'approved conflict', '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z', null);
insert into public.content_publications (id, site_id, content_id, revision_id, approval_id, status, scheduled_at, published_at, created_by_admin_id, created_at, updated_at)
values ('71000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000003', '41000000-0000-0000-0000-000000000003', '61000000-0000-0000-0000-000000000003', 'published', null, '2026-07-13T00:09:00Z', '00000000-0000-0000-0000-000000000001', '2026-07-13T00:09:00Z', '2026-07-13T00:09:00Z');

with rpc as (
  select public.execute_publication(
    'bundle-publication-conflict-1', 'fingerprint-bundle-publication-conflict-1',
    '31000000-0000-0000-0000-000000000003', '41000000-0000-0000-0000-000000000003',
    '61000000-0000-0000-0000-000000000003', '71000000-0000-0000-0000-000000000093',
    'immediate', '2026-07-13T00:00:00Z', '2026-07-13T00:10:00Z', null
  ) as result
), checks as (
  select
    result,
    (select count(*) from public.content_publications where content_id = '31000000-0000-0000-0000-000000000003' and revision_id = '41000000-0000-0000-0000-000000000003') as publication_count,
    (select workflow_status from public.contents where id = '31000000-0000-0000-0000-000000000003') as workflow_status,
    (select count(*) from public.content_operations where operation_id = 'bundle-publication-conflict-1') as operation_count
  from rpc
)
insert into _test_results
select 'publication collision guard',
       'PUBLICATION_ALREADY_EXISTS, one active publication, no new operation',
       result::text || ', publications=' || publication_count || ', workflow=' || workflow_status || ', operations=' || operation_count,
       result->>'code' = 'PUBLICATION_ALREADY_EXISTS' and publication_count = 1 and workflow_status = 'final_approved' and operation_count = 0,
       'Models the same content/revision already having an active publication.'
from checks;

-- Scenario 4: final approval conflict after first successful approval.
insert into public.sites (id, key, name, domain, content_domain, default_locale, timezone, status, settings, created_at, updated_at)
values ('11000000-0000-0000-0000-000000000004', 'bundle-final-approval-conflict-site', 'Bundle Final Approval Conflict Site', 'bundle-final-approval-conflict.test.local', 'health', 'ko-KR', 'Asia/Seoul', 'active', '{}'::jsonb, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z');
insert into public.topics (id, site_id, parent_topic_id, name, slug, topic_type, keywords, status, trend_score, last_collected_at, created_at, updated_at)
values ('21000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', null, 'Final Approval Conflict Topic', 'final-approval-conflict-topic', 'test', array[]::text[], 'active', null, null, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z');
insert into public.contents (id, site_id, primary_topic_id, content_type, working_title, slug, workflow_status, current_revision_id, approved_revision_id, published_revision_id, created_by_type, created_by_id, created_at, updated_at, archived_at)
values ('31000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000004', 'article', 'Final Approval Conflict Content', 'final-approval-conflict-content', 'final_approval_pending', null, null, null, 'human', '00000000-0000-0000-0000-000000000001', '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z', null);
insert into public.content_revisions (id, content_id, parent_revision_id, source_draft_id, revision_number, author_type, title, summary, body_markdown, structured_blocks, seo_title, seo_description, change_summary, content_hash, created_by_type, created_by_id, created_at)
values ('41000000-0000-0000-0000-000000000004', '31000000-0000-0000-0000-000000000004', null, null, 1, 'human', 'Final Approval Conflict Revision', 'Summary', 'Body', null, 'SEO', 'Description', 'Initial', 'hash-bundle-final-approval-conflict', 'human', '00000000-0000-0000-0000-000000000001', '2026-07-13T00:00:00Z');
update public.contents set current_revision_id = '41000000-0000-0000-0000-000000000004' where id = '31000000-0000-0000-0000-000000000004';
insert into public.content_reviews (id, content_id, revision_id, stage, status, reviewer_id, comment, checklist_result, risk_scan_result, created_at, decided_at)
values ('51000000-0000-0000-0000-000000000004', '31000000-0000-0000-0000-000000000004', '41000000-0000-0000-0000-000000000004', 'first_review', 'approved', '00000000-0000-0000-0000-000000000001', 'review ok', '{}'::jsonb, '{}'::jsonb, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z');

insert into _rpc_results (scenario, step, result)
select 'final approval collision guard', 'first',
  public.execute_final_approval(
    'bundle-final-approval-first-1', 'fingerprint-bundle-final-approval-first-1',
    '31000000-0000-0000-0000-000000000004', '41000000-0000-0000-0000-000000000004',
    '51000000-0000-0000-0000-000000000004', '61000000-0000-0000-0000-000000000004',
    '2026-07-13T00:00:00Z', '2026-07-13T00:10:00Z', 'first final approval'
  );

insert into _rpc_results (scenario, step, result)
select 'final approval collision guard', 'second',
  public.execute_final_approval(
    'bundle-final-approval-second-1', 'fingerprint-bundle-final-approval-second-1',
    '31000000-0000-0000-0000-000000000004', '41000000-0000-0000-0000-000000000004',
    '51000000-0000-0000-0000-000000000004', '61000000-0000-0000-0000-000000000094',
    '2026-07-13T00:10:00Z', '2026-07-13T00:11:00Z', 'second final approval'
  );

with checks as (
  select
    (select result from _rpc_results where scenario = 'final approval collision guard' and step = 'first') as first_result,
    (select result from _rpc_results where scenario = 'final approval collision guard' and step = 'second') as second_result,
    (select count(*) from public.content_approvals where content_id = '31000000-0000-0000-0000-000000000004' and revision_id = '41000000-0000-0000-0000-000000000004') as approval_count,
    (select workflow_status from public.contents where id = '31000000-0000-0000-0000-000000000004') as workflow_status,
    (select count(*) from public.content_operations where operation_type = 'final_approval' and content_id = '31000000-0000-0000-0000-000000000004') as operation_count
)
insert into _test_results
select 'final approval collision guard',
       'first committed, second WORKFLOW_CHANGED, one approval, one operation',
       'first=' || first_result::text || ', second=' || second_result::text || ', approvals=' || approval_count || ', workflow=' || workflow_status || ', operations=' || operation_count,
       first_result->>'outcome' = 'committed' and second_result->>'code' = 'WORKFLOW_CHANGED' and approval_count = 1 and workflow_status = 'final_approved' and operation_count = 1,
       'Sequentially models the loser after row-lock serialization.'
from checks;

-- Scenario 5: replay returns before OCC, even if expected timestamp is stale.
insert into public.sites (id, key, name, domain, content_domain, default_locale, timezone, status, settings, created_at, updated_at)
values ('11000000-0000-0000-0000-000000000005', 'bundle-replay-occ-site', 'Bundle Replay OCC Site', 'bundle-replay-occ.test.local', 'health', 'ko-KR', 'Asia/Seoul', 'active', '{}'::jsonb, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z');
insert into public.topics (id, site_id, parent_topic_id, name, slug, topic_type, keywords, status, trend_score, last_collected_at, created_at, updated_at)
values ('21000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', null, 'Replay OCC Topic', 'replay-occ-topic', 'test', array[]::text[], 'active', null, null, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z');
insert into public.contents (id, site_id, primary_topic_id, content_type, working_title, slug, workflow_status, current_revision_id, approved_revision_id, published_revision_id, created_by_type, created_by_id, created_at, updated_at, archived_at)
values ('31000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000005', 'article', 'Replay OCC Content', 'replay-occ-content', 'final_approved', null, null, null, 'human', '00000000-0000-0000-0000-000000000001', '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z', null);
insert into public.content_revisions (id, content_id, parent_revision_id, source_draft_id, revision_number, author_type, title, summary, body_markdown, structured_blocks, seo_title, seo_description, change_summary, content_hash, created_by_type, created_by_id, created_at)
values ('41000000-0000-0000-0000-000000000005', '31000000-0000-0000-0000-000000000005', null, null, 1, 'human', 'Replay OCC Revision', 'Summary', 'Body', null, 'SEO', 'Description', 'Initial', 'hash-bundle-replay-occ', 'human', '00000000-0000-0000-0000-000000000001', '2026-07-13T00:00:00Z');
update public.contents set current_revision_id = '41000000-0000-0000-0000-000000000005', approved_revision_id = '41000000-0000-0000-0000-000000000005' where id = '31000000-0000-0000-0000-000000000005';
insert into public.content_reviews (id, content_id, revision_id, stage, status, reviewer_id, comment, checklist_result, risk_scan_result, created_at, decided_at)
values ('51000000-0000-0000-0000-000000000005', '31000000-0000-0000-0000-000000000005', '41000000-0000-0000-0000-000000000005', 'first_review', 'approved', '00000000-0000-0000-0000-000000000001', 'review ok', '{}'::jsonb, '{}'::jsonb, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z');
insert into public.content_approvals (id, content_id, revision_id, first_review_id, status, approver_id, comment, created_at, decided_at, revoked_at)
values ('61000000-0000-0000-0000-000000000005', '31000000-0000-0000-0000-000000000005', '41000000-0000-0000-0000-000000000005', '51000000-0000-0000-0000-000000000005', 'approved', '00000000-0000-0000-0000-000000000001', 'approved replay occ', '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z', null);

insert into _rpc_results (scenario, step, result)
select 'replay before OCC boundary', 'first',
  public.execute_publication(
    'bundle-replay-occ-1', 'fingerprint-bundle-replay-occ-1',
    '31000000-0000-0000-0000-000000000005', '41000000-0000-0000-0000-000000000005',
    '61000000-0000-0000-0000-000000000005', '71000000-0000-0000-0000-000000000005',
    'immediate', '2026-07-13T00:00:00Z', '2026-07-13T00:10:00Z', null
  );

insert into _rpc_results (scenario, step, result)
select 'replay before OCC boundary', 'second',
  public.execute_publication(
    'bundle-replay-occ-1', 'fingerprint-bundle-replay-occ-1',
    '31000000-0000-0000-0000-000000000005', '41000000-0000-0000-0000-000000000005',
    '61000000-0000-0000-0000-000000000005', '71000000-0000-0000-0000-000000000005',
    'immediate', '1900-01-01T00:00:00Z', '2026-07-13T00:10:00Z', null
  );

with checks as (
  select
    (select result from _rpc_results where scenario = 'replay before OCC boundary' and step = 'first') as first_result,
    (select result from _rpc_results where scenario = 'replay before OCC boundary' and step = 'second') as second_result,
    (select count(*) from public.content_publications where content_id = '31000000-0000-0000-0000-000000000005') as publication_count,
    (select count(*) from public.content_operations where operation_id = 'bundle-replay-occ-1') as operation_count
)
insert into _test_results
select 'replay before OCC boundary',
       'first committed, second replayed despite stale expectedContentUpdatedAt, one publication, one operation',
       'first=' || first_result::text || ', second=' || second_result::text || ', publications=' || publication_count || ', operations=' || operation_count,
       first_result->>'outcome' = 'committed' and second_result->>'outcome' = 'replayed' and publication_count = 1 and operation_count = 1,
       'Confirms ledger replay is evaluated before OCC.'
from checks;

-- Scenario 6: scheduled worker duplicate-processing preconditions.
with indexes as (
  select
    exists (
      select 1 from pg_indexes
      where schemaname = 'public'
        and tablename = 'content_publications'
        and indexname = 'content_publications_due'
        and indexdef ilike '%scheduled%'
    ) as due_index_exists,
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname ilike '%scheduled%publication%'
    ) as scheduled_worker_function_exists
)
insert into _test_results
select 'scheduled publication worker precondition',
       'due index exists; worker function intentionally absent in current two-RPC scope',
       'due_index_exists=' || due_index_exists || ', scheduled_worker_function_exists=' || scheduled_worker_function_exists,
       due_index_exists = true and scheduled_worker_function_exists = false,
       'Future worker must claim rows with FOR UPDATE SKIP LOCKED and scheduled -> publishing in one transaction.'
from indexes;

select
  scenario,
  case when passed then 'PASS' else 'FAIL' end as result,
  expected,
  actual,
  coalesce(notes, '') as notes
from _test_results
order by scenario;

select
  count(*) filter (where passed) as passed_count,
  count(*) filter (where not passed) as failed_count,
  count(*) as total_count
from _test_results;

rollback;
