# Content Platform 운영 적용 전 릴리즈 체크리스트

작성일: 2026-07-13  
대상: health-knowhow 통합 콘텐츠 플랫폼 Supabase/PostgreSQL migration 및 RPC

이 문서는 현재 프로젝트에 작성된 content platform 도메인, RPC 계약, 로컬 Supabase 검증 결과를 기준으로 운영 Supabase 적용 전에 반드시 확인해야 할 항목을 정리한다.

운영 DB 또는 원격 Supabase에 바로 적용하기 위한 실행 문서가 아니다. 적용 전 검토, 백업, dry-run, 권한 확인, smoke test 범위를 고정하기 위한 체크리스트다.

## 1. 적용 대상 파일과 순서

- [ ] 운영 적용 대상 SQL을 `supabase/drafts/001_content_platform_rpc.sql` 기준으로 확정한다.
- [ ] 로컬 검증용 migration인 `supabase/local-tests/202607130001_content_platform_rpc_local_test.sql`은 운영 적용 파일로 그대로 사용하지 않는다.
- [ ] 로컬 테스트 전용 파일인 `supabase/local-tests/content-platform-rpc-smoke.sql`과 `supabase/local-tests/content-platform-safety-bundle.sql`은 운영 migration에 포함하지 않는다.
- [ ] 운영 migration 파일을 만들 경우, 파일명은 Supabase migration 순서가 명확한 timestamp prefix를 사용한다.
- [ ] 적용 순서는 `profiles` 선행 의존성 확인 후 content platform 테이블, constraint, index, RLS, RPC, grant 순서로 검토한다.

## 2. 기존 schema.sql 및 profiles 선행 의존성

- [ ] `public.profiles`가 운영 DB에 이미 존재하는지 확인한다.
- [ ] `public.profiles.id`가 `uuid primary key` 또는 content platform FK가 참조 가능한 unique key인지 확인한다.
- [ ] `public.profiles.role`에 `admin`을 식별할 수 있는 계약이 존재하는지 확인한다.
- [ ] 현재 로컬 테스트 migration에 추가한 `profiles` 정의가 기존 `supabase/schema.sql`의 profiles 계약과 충돌하지 않는지 확인한다.
- [ ] 운영 migration에서는 profiles를 새로 만들지, 기존 schema.sql 선행 migration에 의존할지 명확히 결정한다.
- [ ] 기존 profiles에 이미 데이터가 있다면 role 값과 check constraint 추가가 기존 데이터를 깨뜨리지 않는지 확인한다.

## 3. 원격 Supabase 적용 전 백업 확인

- [ ] 운영 Supabase 프로젝트 ID와 URL을 확인한다.
- [ ] 적용 전 운영 DB 백업 또는 restore point를 확보한다.
- [ ] 백업 생성 시각과 백업 파일/스냅샷 위치를 기록한다.
- [ ] 복구 권한을 가진 계정과 복구 절차 담당자를 확인한다.
- [ ] 적용 직전 운영 DB에 장시간 lock을 유발할 수 있는 작업이 없는지 확인한다.

## 4. 환경변수 및 프로젝트 연결 대상 확인

- [ ] 로컬 `.env` 또는 배포 환경변수가 운영 프로젝트를 가리키는지, 스테이징 프로젝트를 가리키는지 확인한다.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 대상이 의도한 프로젝트인지 확인한다.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 의도한 프로젝트의 key인지 확인한다.
- [ ] 서버 전용 service role key가 로컬 테스트나 클라이언트 번들에 노출되지 않는지 확인한다.
- [ ] `supabase link` 또는 CLI project ref가 운영 프로젝트인지 별도 확인한다.
- [ ] 실수 방지를 위해 운영 적용 전 현재 CLI 연결 상태를 화면 캡처 또는 로그로 남긴다.

## 5. migration 적용 전 dry-run 또는 diff 확인

- [ ] 원격 운영 DB에 적용하기 전에 격리된 로컬 Supabase에서 `supabase db reset`으로 migration 적용 성공을 확인한다.
- [ ] `npm.cmd run test:rpc:local`이 로컬 Supabase에서 12/12 통과하는지 확인한다.
- [ ] 가능하면 스테이징 Supabase 프로젝트에 먼저 migration을 적용한다.
- [ ] Supabase CLI의 diff 또는 migration preview 결과를 검토한다.
- [ ] 의도하지 않은 drop, truncate, 기존 테이블 변경이 없는지 확인한다.
- [ ] `supabase/schema.sql` 기존 legacy 구조와 이름 충돌이 없는지 확인한다.

## 6. 생성 예정 핵심 객체 확인

- [ ] `sites`
- [ ] `topics`
- [ ] `sources`
- [ ] `contents`
- [ ] `content_sources`
- [ ] `content_secondary_topics`
- [ ] `content_drafts`
- [ ] `content_draft_sources`
- [ ] `content_revisions`
- [ ] `content_revision_sources`
- [ ] `content_reviews`
- [ ] `content_approvals`
- [ ] `content_publications`
- [ ] `content_operations`
- [ ] `execute_final_approval(...)`
- [ ] `execute_publication(...)`

## 7. constraint, FK, index 확인

- [ ] `content_operations.operation_id`가 primary key로 idempotency를 보장하는지 확인한다.
- [ ] `contents.workflow_status` check constraint가 현재 TypeScript workflow 상태와 일치하는지 확인한다.
- [ ] `content_reviews.status` check constraint가 TypeScript review status와 일치하는지 확인한다.
- [ ] `content_approvals.status` check constraint가 TypeScript approval status와 일치하는지 확인한다.
- [ ] `content_publications.status` check constraint가 TypeScript publication status와 일치하는지 확인한다.
- [ ] `content_revisions(id, content_id)` unique constraint가 존재하는지 확인한다.
- [ ] `content_reviews(id, content_id, revision_id)` unique constraint가 존재하는지 확인한다.
- [ ] `content_approvals(id, content_id, revision_id)` unique constraint가 존재하는지 확인한다.
- [ ] `contents.current_revision_id`, `approved_revision_id`, `published_revision_id`가 같은 content의 revision만 참조하도록 복합 FK가 있는지 확인한다.
- [ ] `content_approvals.first_review_id, content_id, revision_id`가 같은 review/revision 관계를 참조하는지 확인한다.
- [ ] `content_publications.approval_id, content_id, revision_id`가 같은 approval/revision 관계를 참조하는지 확인한다.
- [ ] active publication 중복 방지용 `content_publications_one_active_revision` partial unique index가 존재하는지 확인한다.
- [ ] 예약 발행 조회용 `content_publications_due` index가 존재하는지 확인한다.

## 8. RLS 활성화 확인

- [ ] content platform 대상 모든 테이블에서 RLS가 enabled인지 확인한다.
- [ ] `sites`
- [ ] `topics`
- [ ] `sources`
- [ ] `contents`
- [ ] `content_sources`
- [ ] `content_secondary_topics`
- [ ] `content_drafts`
- [ ] `content_draft_sources`
- [ ] `content_revisions`
- [ ] `content_revision_sources`
- [ ] `content_reviews`
- [ ] `content_approvals`
- [ ] `content_publications`
- [ ] `content_operations`
- [ ] anon/authenticated에 직접 insert/update/delete 권한이 열려 있지 않은지 확인한다.
- [ ] 운영 UI에서 필요한 read policy는 별도 설계 전까지 열지 않는다.

## 9. RPC 보안 속성 및 execute 권한 확인

- [ ] `execute_final_approval`이 `SECURITY DEFINER`인지 확인한다.
- [ ] `execute_publication`이 `SECURITY DEFINER`인지 확인한다.
- [ ] 두 RPC의 `search_path`가 `public, pg_temp`로 고정되어 있는지 확인한다.
- [ ] 두 RPC의 owner가 예상된 DB owner인지 확인한다.
- [ ] PUBLIC execute 권한이 revoke되어 있는지 확인한다.
- [ ] anon execute 권한이 revoke되어 있는지 확인한다.
- [ ] authenticated execute 권한이 grant되어 있는지 확인한다.
- [ ] 함수 내부에서 `auth.uid()`로 호출자를 확인하는지 확인한다.
- [ ] 함수 내부에서 `public.profiles.role = 'admin'`을 확인하는지 확인한다.
- [ ] AI Agent와 n8n이 admin profile 또는 final approval/publication 실행 권한을 갖지 않도록 운영 계정 정책을 확인한다.

## 10. RPC 내부 안전 규칙 확인

- [ ] `execute_final_approval`이 operation ledger replay를 먼저 확인하는지 확인한다.
- [ ] `execute_final_approval`이 fingerprint 불일치 시 `OPERATION_PAYLOAD_MISMATCH`를 반환하는지 확인한다.
- [ ] `execute_final_approval`이 `expectedContentUpdatedAt` 불일치 시 `CONTENT_UPDATED`를 반환하는지 확인한다.
- [ ] `execute_final_approval`이 workflow 불일치 시 `WORKFLOW_CHANGED`를 반환하는지 확인한다.
- [ ] `execute_final_approval`이 review status가 approved가 아니면 `REVIEW_NOT_APPROVED`를 반환하는지 확인한다.
- [ ] `execute_final_approval`이 current revision 불일치를 차단하는지 확인한다.
- [ ] `execute_publication`이 operation ledger replay를 먼저 확인하는지 확인한다.
- [ ] `execute_publication`이 fingerprint 불일치 시 `OPERATION_PAYLOAD_MISMATCH`를 반환하는지 확인한다.
- [ ] `execute_publication`이 `expectedContentUpdatedAt` 불일치 시 `CONTENT_UPDATED`를 반환하는지 확인한다.
- [ ] `execute_publication`이 workflow 불일치 시 `WORKFLOW_CHANGED`를 반환하는지 확인한다.
- [ ] `execute_publication`이 approval status가 approved가 아니면 `APPROVAL_NOT_VALID`를 반환하는지 확인한다.
- [ ] `execute_publication`이 approval/content/revision 관계 불일치를 차단하는지 확인한다.
- [ ] `execute_publication`이 기존 active publication 존재 시 `PUBLICATION_ALREADY_EXISTS`를 반환하는지 확인한다.

## 11. 적용 직후 DB 객체 확인

- [ ] 생성된 content platform 테이블 목록을 조회한다.
- [ ] `execute_final_approval` 함수 signature를 조회한다.
- [ ] `execute_publication` 함수 signature를 조회한다.
- [ ] FK, unique, check constraint 목록을 조회한다.
- [ ] RLS 활성화 여부를 조회한다.
- [ ] RPC security definer, search_path, owner, execute ACL을 조회한다.
- [ ] `execute_publication` 함수 본문에 `approval.status = 'approved'` 강제 검사가 존재하는지 확인한다.

## 12. 자동 로컬 통합 테스트 확인

- [ ] 로컬 Supabase가 실행 중인지 확인한다.
- [ ] `npm.cmd run test:rpc:local`을 실행한다.
- [ ] `RPC_SAFETY_SUMMARY`의 `totalCount`가 12인지 확인한다.
- [ ] `RPC_SAFETY_SUMMARY`의 `passedCount`가 12인지 확인한다.
- [ ] `RPC_SAFETY_SUMMARY`의 `failedCount`가 0인지 확인한다.
- [ ] 출력 마지막에 `ROLLBACK`이 있는지 확인한다.
- [ ] 테스트 데이터가 남지 않았는지 필요 시 spot check한다.

## 13. 운영 smoke test 최소 범위

운영 적용 직후 실제 운영 데이터 생성을 최소화해야 하므로, 가능한 경우 스테이징 또는 별도 테스트 site에서 먼저 수행한다.

- [ ] admin profile이 없는 사용자가 RPC 실행 시 `FORBIDDEN`이 반환되는지 확인한다.
- [ ] admin profile이 있는 테스트 사용자로 final approval 정상 경로를 1회 확인한다.
- [ ] admin profile이 있는 테스트 사용자로 publication 정상 경로를 1회 확인한다.
- [ ] 승인되지 않은 approval로 publication이 거부되는지 확인한다.
- [ ] operationId replay가 중복 publication을 만들지 않는지 확인한다.
- [ ] 테스트로 생성한 운영 smoke data의 정리 또는 비공개 상태를 확인한다.

## 14. 실패 시 rollback 또는 복구 절차

- [ ] migration 적용 전 백업 위치를 다시 확인한다.
- [ ] migration 적용 실패 시 즉시 추가 migration 적용을 중단한다.
- [ ] 실패 로그, SQLSTATE, 실패 object를 기록한다.
- [ ] 이미 생성된 객체가 있는지 확인한다.
- [ ] 운영 데이터 변경이 있었는지 확인한다.
- [ ] 필요 시 백업 restore 또는 역방향 migration 계획을 실행한다.
- [ ] RPC 권한 노출 문제가 발견되면 즉시 execute 권한을 revoke한다.
- [ ] publication이 잘못 생성된 경우 content workflow와 publication status를 수동 수정하지 말고 별도 복구 SQL을 리뷰 후 실행한다.

## 15. 운영 적용 차단 조건

다음 중 하나라도 해당하면 운영 적용을 중단한다.

- [ ] 운영 Supabase 프로젝트 ref가 확실하지 않다.
- [ ] 운영 DB 백업 또는 restore point가 없다.
- [ ] `public.profiles` 계약이 확정되지 않았다.
- [ ] `npm.cmd run test:rpc:local`이 12/12 통과하지 않았다.
- [ ] RLS가 비활성화된 content platform 테이블이 있다.
- [ ] PUBLIC 또는 anon에 RPC execute 권한이 열려 있다.
- [ ] `execute_publication`에서 approval approved 검사가 확인되지 않는다.
- [ ] active publication 중복 방지 index가 없다.
- [ ] TypeScript RPC error contract와 SQL 반환 code가 불일치한다.
- [ ] 운영 적용 담당자가 rollback 절차를 모른다.

## 16. 명시적으로 남은 위험

- [ ] 실제 병렬 동시성 테스트는 아직 자동화되지 않았다.
- [ ] 예약 발행 worker는 아직 구현되지 않았다.
- [ ] 예약 발행 worker는 향후 `FOR UPDATE SKIP LOCKED`와 `scheduled -> publishing` 단일 transaction으로 구현해야 한다.
- [ ] 운영 관리자 UI는 아직 content platform RPC에 연결되지 않았다.
- [ ] legacy mock, CSV, HealthArticle, ArticleResource, Experience 데이터는 아직 새 content platform으로 이관되지 않았다.
- [ ] 의료 콘텐츠 전문가 검수 단계는 아직 별도 workflow로 강제되지 않는다.

## 17. 최종 승인 기록

- [ ] 적용 담당자:
- [ ] 검토 담당자:
- [ ] 적용 대상 Supabase project ref:
- [ ] 백업 생성 시각:
- [ ] dry-run 확인 시각:
- [ ] 로컬 통합 테스트 결과:
- [ ] 운영 적용 승인 여부:
- [ ] 비고:
