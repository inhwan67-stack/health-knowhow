-- REVIEW-ONLY DRAFT. DO NOT APPLY TO SUPABASE YET.
-- Mirrors types/content-platform.ts and types/content-platform-rpc.ts.

create table public.sites (
  id uuid primary key,
  key text not null unique,
  name text not null,
  domain text not null unique,
  content_domain text not null,
  default_locale text not null,
  timezone text not null,
  status text not null check (status in ('active', 'inactive', 'archived')),
  settings jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table public.topics (
  id uuid primary key,
  site_id uuid not null references public.sites(id) on delete restrict,
  parent_topic_id uuid references public.topics(id) on delete restrict,
  name text not null,
  slug text not null,
  topic_type text not null,
  keywords text[] not null default '{}',
  status text not null check (status in ('candidate', 'active', 'paused', 'archived')),
  trend_score numeric,
  last_collected_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (site_id, slug),
  unique (id, site_id)
);

create table public.sources (
  id uuid primary key,
  source_type text not null check (source_type in ('government', 'medical', 'academic', 'news', 'blog', 'video', 'social', 'other')),
  publisher_name text not null,
  title text not null,
  canonical_url text not null,
  published_at timestamptz,
  retrieved_at timestamptz not null,
  raw_text text,
  raw_content_location text,
  summary text,
  language text not null,
  trust_level text not null check (trust_level in ('trusted', 'review_required', 'untrusted')),
  verification_status text not null check (verification_status in ('pending', 'verified', 'rejected', 'stale')),
  content_hash text,
  metadata jsonb,
  created_by_type text not null check (created_by_type in ('human', 'ai_agent', 'n8n', 'system')),
  created_by_id text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (canonical_url)
);

create table public.contents (
  id uuid primary key,
  site_id uuid not null references public.sites(id) on delete restrict,
  primary_topic_id uuid not null,
  content_type text not null check (content_type in ('article', 'guide', 'news', 'experience', 'other')),
  working_title text not null,
  slug text not null,
  workflow_status text not null check (workflow_status in ('drafting', 'first_review_pending', 'changes_requested', 'first_review_approved', 'final_approval_pending', 'final_approved', 'scheduled', 'published', 'publication_failed', 'rejected', 'archived')),
  current_revision_id uuid,
  approved_revision_id uuid,
  published_revision_id uuid,
  created_by_type text not null check (created_by_type in ('human', 'ai_agent', 'n8n', 'system')),
  created_by_id text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  archived_at timestamptz,
  unique (site_id, slug),
  unique (site_id, id),
  foreign key (primary_topic_id, site_id) references public.topics(id, site_id) on delete restrict
);

create table public.content_sources (
  content_id uuid not null references public.contents(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete restrict,
  usage_type text not null check (usage_type in ('primary', 'supporting', 'counterpoint', 'related')),
  relevance_note text,
  primary key (content_id, source_id)
);

create table public.content_secondary_topics (
  content_id uuid not null,
  site_id uuid not null,
  topic_id uuid not null,
  primary key (content_id, topic_id),
  foreign key (site_id, content_id) references public.contents(site_id, id) on delete cascade,
  foreign key (topic_id, site_id) references public.topics(id, site_id) on delete restrict
);

create table public.content_drafts (
  id uuid primary key,
  content_id uuid not null references public.contents(id) on delete cascade,
  origin text not null check (origin in ('ai', 'human', 'import')),
  status text not null check (status in ('generating', 'ready', 'failed', 'superseded')),
  title text not null,
  summary text,
  body_markdown text not null,
  structured_blocks jsonb,
  ai_generation jsonb,
  created_by_type text not null check (created_by_type in ('human', 'ai_agent', 'n8n', 'system')),
  created_by_id text not null,
  created_at timestamptz not null,
  completed_at timestamptz,
  failure_reason text,
  unique (id, content_id)
);

create table public.content_draft_sources (
  draft_id uuid not null references public.content_drafts(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete restrict,
  usage_type text not null check (usage_type in ('primary', 'supporting', 'counterpoint', 'related')),
  relevance_note text,
  primary key (draft_id, source_id)
);

create table public.content_revisions (
  id uuid primary key,
  content_id uuid not null references public.contents(id) on delete restrict,
  parent_revision_id uuid,
  source_draft_id uuid,
  revision_number integer not null check (revision_number > 0),
  author_type text not null check (author_type in ('ai', 'human', 'system')),
  title text not null,
  summary text,
  body_markdown text not null,
  structured_blocks jsonb,
  seo_title text,
  seo_description text,
  change_summary text,
  content_hash text not null,
  created_by_type text not null check (created_by_type in ('human', 'ai_agent', 'n8n', 'system')),
  created_by_id text not null,
  created_at timestamptz not null,
  unique (content_id, revision_number),
  unique (id, content_id),
  foreign key (parent_revision_id, content_id) references public.content_revisions(id, content_id) on delete restrict,
  foreign key (source_draft_id, content_id) references public.content_drafts(id, content_id) on delete restrict
);

create table public.content_revision_sources (
  revision_id uuid not null references public.content_revisions(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete restrict,
  usage_type text not null check (usage_type in ('primary', 'supporting', 'counterpoint', 'related')),
  relevance_note text,
  primary key (revision_id, source_id)
);

alter table public.contents
  add foreign key (current_revision_id, id) references public.content_revisions(id, content_id) on delete restrict,
  add foreign key (approved_revision_id, id) references public.content_revisions(id, content_id) on delete restrict,
  add foreign key (published_revision_id, id) references public.content_revisions(id, content_id) on delete restrict;

create table public.content_reviews (
  id uuid primary key,
  content_id uuid not null,
  revision_id uuid not null,
  stage text not null check (stage = 'first_review'),
  status text not null check (status in ('pending', 'approved', 'changes_requested', 'rejected')),
  reviewer_id uuid references public.profiles(id) on delete restrict,
  comment text,
  checklist_result jsonb,
  risk_scan_result jsonb,
  created_at timestamptz not null,
  decided_at timestamptz,
  unique (id, content_id, revision_id),
  foreign key (revision_id, content_id) references public.content_revisions(id, content_id) on delete restrict
);

create table public.content_approvals (
  id uuid primary key,
  content_id uuid not null,
  revision_id uuid not null,
  first_review_id uuid not null,
  status text not null check (status in ('pending', 'approved', 'rejected', 'revoked')),
  approver_id uuid references public.profiles(id) on delete restrict,
  comment text,
  created_at timestamptz not null,
  decided_at timestamptz,
  revoked_at timestamptz,
  unique (id, content_id, revision_id),
  foreign key (revision_id, content_id) references public.content_revisions(id, content_id) on delete restrict,
  foreign key (first_review_id, content_id, revision_id) references public.content_reviews(id, content_id, revision_id) on delete restrict,
  check ((status = 'revoked') = (revoked_at is not null))
);

create table public.content_publications (
  id uuid primary key,
  site_id uuid not null,
  content_id uuid not null,
  revision_id uuid not null,
  approval_id uuid not null,
  status text not null check (status in ('scheduled', 'publishing', 'published', 'failed', 'cancelled', 'unpublished')),
  scheduled_at timestamptz,
  published_at timestamptz,
  public_url text,
  external_post_id text unique,
  failure_reason text,
  created_by_admin_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (id, content_id, revision_id),
  foreign key (site_id, content_id) references public.contents(site_id, id) on delete restrict,
  foreign key (revision_id, content_id) references public.content_revisions(id, content_id) on delete restrict,
  foreign key (approval_id, content_id, revision_id) references public.content_approvals(id, content_id, revision_id) on delete restrict,
  check (status <> 'scheduled' or scheduled_at is not null),
  check (status <> 'published' or published_at is not null)
);

create unique index content_publications_one_active_revision
  on public.content_publications(content_id, revision_id)
  where status in ('scheduled', 'publishing', 'published');

create index content_publications_due
  on public.content_publications(scheduled_at, id)
  where status = 'scheduled';

create table public.content_operations (
  operation_id text primary key,
  operation_type text not null check (operation_type in ('final_approval', 'publication')),
  operation_fingerprint text not null,
  content_id uuid not null references public.contents(id) on delete restrict,
  result_entity_id uuid not null,
  response jsonb not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null
);

-- Deny direct API access by default. Read policies will be designed separately.
alter table public.sites enable row level security;
alter table public.topics enable row level security;
alter table public.sources enable row level security;
alter table public.contents enable row level security;
alter table public.content_sources enable row level security;
alter table public.content_secondary_topics enable row level security;
alter table public.content_drafts enable row level security;
alter table public.content_draft_sources enable row level security;
alter table public.content_revisions enable row level security;
alter table public.content_revision_sources enable row level security;
alter table public.content_reviews enable row level security;
alter table public.content_approvals enable row level security;
alter table public.content_publications enable row level security;
alter table public.content_operations enable row level security;

revoke insert, update, delete on public.contents from anon, authenticated;
revoke all on public.content_approvals, public.content_publications, public.content_operations from anon, authenticated;

create or replace function public.execute_final_approval(
  p_operation_id text,
  p_operation_fingerprint text,
  p_content_id uuid,
  p_revision_id uuid,
  p_review_id uuid,
  p_approval_id uuid,
  p_expected_content_updated_at timestamptz,
  p_created_at timestamptz,
  p_comment text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
set timezone = 'UTC'
as $$
declare
  v_user_id uuid := auth.uid();
  v_content public.contents%rowtype;
  v_review public.content_reviews%rowtype;
  v_existing public.content_operations%rowtype;
  v_response jsonb;
  v_updated_count integer;
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles where id = v_user_id and role = 'admin'
  ) then
    return jsonb_build_object('ok', false, 'operationId', p_operation_id, 'code', 'FORBIDDEN');
  end if;

  -- Serialize the same operation ID so a concurrent retry observes the ledger.
  perform pg_advisory_xact_lock(hashtextextended(p_operation_id, 0));

  select * into v_existing from public.content_operations where operation_id = p_operation_id;
  if found then
    if v_existing.operation_type <> 'final_approval'
       or v_existing.operation_fingerprint <> p_operation_fingerprint then
      return jsonb_build_object('ok', false, 'operationId', p_operation_id, 'code', 'OPERATION_PAYLOAD_MISMATCH');
    end if;
    return jsonb_set(v_existing.response, '{outcome}', '"replayed"'::jsonb, true);
  end if;

  select * into v_content from public.contents where id = p_content_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'operationId', p_operation_id, 'code', 'ENTITY_NOT_FOUND');
  end if;
  if v_content.updated_at <> p_expected_content_updated_at then
    return jsonb_build_object('ok', false, 'operationId', p_operation_id, 'code', 'CONTENT_UPDATED');
  end if;
  if v_content.workflow_status <> 'final_approval_pending' then
    return jsonb_build_object('ok', false, 'operationId', p_operation_id, 'code', 'WORKFLOW_CHANGED');
  end if;
  if not exists (
    select 1 from public.content_revisions where id = p_revision_id and content_id = p_content_id
  ) then
    return jsonb_build_object('ok', false, 'operationId', p_operation_id, 'code', 'ENTITY_RELATION_MISMATCH');
  end if;
  if v_content.current_revision_id is distinct from p_revision_id then
    return jsonb_build_object('ok', false, 'operationId', p_operation_id, 'code', 'REVISION_NOT_CURRENT');
  end if;

  select * into v_review from public.content_reviews where id = p_review_id;
  if not found then
    return jsonb_build_object('ok', false, 'operationId', p_operation_id, 'code', 'ENTITY_NOT_FOUND');
  end if;
  if v_review.content_id <> p_content_id or v_review.revision_id <> p_revision_id then
    return jsonb_build_object('ok', false, 'operationId', p_operation_id, 'code', 'ENTITY_RELATION_MISMATCH');
  end if;
  if v_review.status <> 'approved' then
    return jsonb_build_object('ok', false, 'operationId', p_operation_id, 'code', 'REVIEW_NOT_APPROVED');
  end if;

  insert into public.content_approvals (
    id, content_id, revision_id, first_review_id, status, approver_id,
    comment, created_at, decided_at
  ) values (
    p_approval_id, p_content_id, p_revision_id, p_review_id, 'approved', v_user_id,
    p_comment, p_created_at, p_created_at
  );

  update public.contents set
    workflow_status = 'final_approved',
    approved_revision_id = p_revision_id,
    updated_at = p_created_at
  where id = p_content_id
    and updated_at = p_expected_content_updated_at
    and workflow_status = 'final_approval_pending';
  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 1 then
    raise exception 'final approval content update invariant failed';
  end if;

  v_response := jsonb_build_object(
    'ok', true, 'outcome', 'committed', 'operationId', p_operation_id,
    'contentId', p_content_id, 'revisionId', p_revision_id,
    'resultEntityId', p_approval_id, 'approvalId', p_approval_id,
    'nextWorkflowStatus', 'final_approved', 'contentUpdatedAt', to_jsonb(p_created_at)
  );
  insert into public.content_operations (
    operation_id, operation_type, operation_fingerprint, content_id,
    result_entity_id, response, created_by, created_at
  ) values (
    p_operation_id, 'final_approval', p_operation_fingerprint, p_content_id,
    p_approval_id, v_response, v_user_id, p_created_at
  );
  return v_response;
end;
$$;

create or replace function public.execute_publication(
  p_operation_id text,
  p_operation_fingerprint text,
  p_content_id uuid,
  p_revision_id uuid,
  p_approval_id uuid,
  p_publication_id uuid,
  p_mode text,
  p_expected_content_updated_at timestamptz,
  p_created_at timestamptz,
  p_scheduled_at timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
set timezone = 'UTC'
as $$
declare
  v_user_id uuid := auth.uid();
  v_content public.contents%rowtype;
  v_approval public.content_approvals%rowtype;
  v_existing public.content_operations%rowtype;
  v_status text;
  v_response jsonb;
  v_updated_count integer;
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles where id = v_user_id and role = 'admin'
  ) then
    return jsonb_build_object('ok', false, 'operationId', p_operation_id, 'code', 'FORBIDDEN');
  end if;

  -- Serialize the same operation ID so a concurrent retry observes the ledger.
  perform pg_advisory_xact_lock(hashtextextended(p_operation_id, 0));

  select * into v_existing from public.content_operations where operation_id = p_operation_id;
  if found then
    if v_existing.operation_type <> 'publication'
       or v_existing.operation_fingerprint <> p_operation_fingerprint then
      return jsonb_build_object('ok', false, 'operationId', p_operation_id, 'code', 'OPERATION_PAYLOAD_MISMATCH');
    end if;
    return jsonb_set(v_existing.response, '{outcome}', '"replayed"'::jsonb, true);
  end if;

  if p_mode not in ('immediate', 'scheduled')
     or (p_mode = 'scheduled' and (p_scheduled_at is null or p_scheduled_at < statement_timestamp())) then
    return jsonb_build_object('ok', false, 'operationId', p_operation_id, 'code', 'INVALID_SCHEDULE');
  end if;

  select * into v_content from public.contents where id = p_content_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'operationId', p_operation_id, 'code', 'ENTITY_NOT_FOUND');
  end if;
  if v_content.updated_at <> p_expected_content_updated_at then
    return jsonb_build_object('ok', false, 'operationId', p_operation_id, 'code', 'CONTENT_UPDATED');
  end if;
  if v_content.workflow_status <> 'final_approved' then
    return jsonb_build_object('ok', false, 'operationId', p_operation_id, 'code', 'WORKFLOW_CHANGED');
  end if;
  if v_content.approved_revision_id is distinct from p_revision_id then
    return jsonb_build_object('ok', false, 'operationId', p_operation_id, 'code', 'APPROVAL_NOT_VALID');
  end if;

  select * into v_approval from public.content_approvals where id = p_approval_id;
  if not found or v_approval.status <> 'approved' then
    return jsonb_build_object('ok', false, 'operationId', p_operation_id, 'code', 'APPROVAL_NOT_VALID');
  end if;
  if v_approval.content_id <> p_content_id or v_approval.revision_id <> p_revision_id then
    return jsonb_build_object('ok', false, 'operationId', p_operation_id, 'code', 'ENTITY_RELATION_MISMATCH');
  end if;
  if exists (
    select 1 from public.content_publications
    where content_id = p_content_id and revision_id = p_revision_id
      and status in ('scheduled', 'publishing', 'published')
  ) then
    return jsonb_build_object('ok', false, 'operationId', p_operation_id, 'code', 'PUBLICATION_ALREADY_EXISTS');
  end if;

  v_status := case when p_mode = 'scheduled' then 'scheduled' else 'published' end;
  insert into public.content_publications (
    id, site_id, content_id, revision_id, approval_id, status,
    scheduled_at, published_at, created_by_admin_id, created_at, updated_at
  ) values (
    p_publication_id, v_content.site_id, p_content_id, p_revision_id, p_approval_id, v_status,
    case when p_mode = 'scheduled' then p_scheduled_at end,
    case when p_mode = 'immediate' then p_created_at end,
    v_user_id, p_created_at, p_created_at
  );

  update public.contents set
    workflow_status = v_status,
    published_revision_id = case when p_mode = 'immediate' then p_revision_id else published_revision_id end,
    updated_at = p_created_at
  where id = p_content_id
    and updated_at = p_expected_content_updated_at
    and workflow_status = 'final_approved';
  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 1 then
    raise exception 'publication content update invariant failed';
  end if;

  v_response := jsonb_strip_nulls(jsonb_build_object(
    'ok', true, 'outcome', 'committed', 'operationId', p_operation_id,
    'contentId', p_content_id, 'revisionId', p_revision_id,
    'resultEntityId', p_publication_id, 'publicationId', p_publication_id,
    'publicationStatus', v_status, 'scheduledAt', to_jsonb(p_scheduled_at),
    'publishedAt', case when p_mode = 'immediate' then to_jsonb(p_created_at) end,
    'nextWorkflowStatus', v_status, 'contentUpdatedAt', to_jsonb(p_created_at)
  ));
  insert into public.content_operations (
    operation_id, operation_type, operation_fingerprint, content_id,
    result_entity_id, response, created_by, created_at
  ) values (
    p_operation_id, 'publication', p_operation_fingerprint, p_content_id,
    p_publication_id, v_response, v_user_id, p_created_at
  );
  return v_response;
end;
$$;

revoke all on function public.execute_final_approval(text, text, uuid, uuid, uuid, uuid, timestamptz, timestamptz, text) from public, anon;
revoke all on function public.execute_publication(text, text, uuid, uuid, uuid, uuid, text, timestamptz, timestamptz, timestamptz) from public, anon;
grant execute on function public.execute_final_approval(text, text, uuid, uuid, uuid, uuid, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.execute_publication(text, text, uuid, uuid, uuid, uuid, text, timestamptz, timestamptz, timestamptz) to authenticated;

-- A future scheduled worker must claim due rows with FOR UPDATE SKIP LOCKED and
-- move scheduled -> publishing in the same transaction. That worker is outside
-- the two-RPC scope of this draft.
