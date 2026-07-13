# Content Platform 커밋 전 최종 리뷰 보고서

작성일: 2026-07-13  
대상 프로젝트: health-knowhow  
범위: 현재 미커밋 변경 전체

## 1. 최종 판정

현재 변경은 기능·테스트 관점에서 커밋 가능한 수준까지 검증되었다.

기존 보류 사유였던 로컬 검증용 migration은 `supabase/migrations` 밖으로 이동했다. 해당 SQL은 이제 운영 적용 대상이 아니라 `supabase/local-tests` 아래의 로컬 테스트 자료로 보관된다.

권장 판정:

- 코드, 타입, 서비스, RPC 계약, 로컬 테스트, 문서: commit 가능
- 로컬 검증용 migration: `supabase/local-tests/202607130001_content_platform_rpc_local_test.sql`로 보존
- 원격 Supabase 적용: 아직 금지

## 2. 최초 목표와 현재 구현 결과 비교

| 최초 목표 | 현재 결과 |
|---|---|
| 기존 health-knowhow를 새로 만들지 않는다 | 기존 앱 구조 유지 |
| 기존 기능 삭제·대규모 리팩터링 금지 | 기존 화면/컴포넌트/legacy mock 데이터 미변경 |
| 멀티 사이트 전제 통합 콘텐츠 도메인 설계 | `Site`, `Topic`, `Content`, `Source`, `Draft`, `Revision`, `Review`, `Approval`, `Publication` 타입 정의 |
| AI/n8n은 초안·source·revision까지만 허용 | capability 타입과 policy에서 final approval/publication 차단 |
| 최종 관리자 승인 없이는 발행 금지 | service policy, command factory, RPC SQL에서 검증 |
| Supabase 변경은 신중히 설계 후 검증 | draft SQL, 로컬 테스트 migration, 로컬 Supabase 검증 완료 |
| 자동 테스트로 안전 규칙 고정 | Vitest 158개 + 로컬 RPC 자동 통합 테스트 12개 통과 |
| 운영 적용 전 체크리스트 확보 | `docs/content-platform-release-checklist.md` 작성 완료 |

## 3. 생성·수정 파일 목록

### 3.1 package / test runner

- `package.json`
  - `test` script 추가
  - `test:rpc:local` script 추가
  - `vitest` devDependency 추가
- `package-lock.json`
  - Vitest 및 관련 의존성 lock 반영

### 3.2 domain / workflow 타입

- `types/content-platform.ts`
  - 통합 콘텐츠 플랫폼 도메인 타입
  - workflow/review/approval/publication 상태 전이
  - 자동화/관리자 capability
  - legacy model mapping
- `types/content-platform.test.ts`
  - 상태 전이와 capability 안전 규칙 단위 테스트
- `types/content-platform-rpc.ts`
  - `executeFinalApproval`, `executePublication` RPC request/response/error 계약
  - timestamp precision 및 operation fingerprint 계약

### 3.3 service policy / command / application

- `services/contentPlatformPolicy.ts`
  - final approval 생성 가능 여부 정책
  - publication 생성 가능 여부 정책
- `services/contentPlatformPolicy.test.ts`
  - review/approval/publication 관계 및 actor 권한 정책 테스트
- `services/contentPlatformCommand.ts`
  - `createFinalApprovalCommand`
  - `createPublicationCommand`
  - workflow + policy를 통과한 경우에만 엔터티 생성
- `services/contentPlatformCommand.test.ts`
  - command 성공/실패/불변성 테스트
- `services/contentPlatformApplication.ts`
  - repository transaction/idempotency/OCC 계약을 사용하는 application service
- `services/contentPlatformApplication.test.ts`
  - application service 성공/실패/중복 요청 테스트
- `services/inMemoryContentPlatformRepository.ts`
  - 로컬 테스트용 in-memory repository contract 구현
- `services/inMemoryContentPlatformRepository.test.ts`
  - repository transaction, operationId, expectedContentUpdatedAt 검증
- `services/contentPlatformRpcMapper.ts`
  - RPC response를 repository/application 결과로 mapping
- `services/contentPlatformRpcMapper.test.ts`
  - RPC error mapping 테스트
- `services/contentPlatformSqlContract.test.ts`
  - TypeScript RPC 계약과 SQL draft의 오류 코드/함수 계약 정합성 테스트

### 3.4 Supabase SQL / local test

- `supabase/.gitignore`
  - Supabase init 생성 파일
- `supabase/config.toml`
  - Supabase local config
  - `[db.seed].enabled = false`로 seed 부재 문제 방지
- `supabase/drafts/001_content_platform_rpc.sql`
  - 운영 적용 전 검토용 content platform SQL draft
  - 테이블, constraint, RLS, RPC, grant 초안
- `supabase/local-tests/202607130001_content_platform_rpc_local_test.sql`
  - 로컬 Supabase 검증을 위해 만든 local test migration
  - 주의: 운영 적용 migration으로 그대로 사용하면 안 됨
- `supabase/local-tests/content-platform-safety-bundle.sql`
  - 수동 통합 안전 검증 SQL
  - WORKFLOW_CHANGED, rollback, 충돌, replay/OCC 경계, 예약 worker 전제 검증
- `supabase/local-tests/content-platform-rpc-smoke.sql`
  - npm 자동 로컬 RPC 통합 테스트용 SQL
  - publication 6개 + final approval 6개 = 총 12개 시나리오
- `scripts/run-local-rpc-safety-tests.mjs`
  - `npm.cmd run test:rpc:local` 실행 스크립트
  - 로컬 Supabase DB 컨테이너 탐색 후 psql 실행

### 3.5 문서

- `docs/content-platform-release-checklist.md`
  - 운영 적용 전 릴리즈 체크리스트
  - 17개 섹션, 149개 체크 항목
- `docs/content-platform-pre-commit-review.md`
  - 현재 문서
  - 커밋 전 최종 리뷰 보고서

## 4. 계층별 구현 요약

### 4.1 Domain / Workflow

- 통합 콘텐츠 모델의 핵심 엔터티를 TypeScript 타입으로 정의했다.
- workflow 상태 전이는 content/review/approval/publication으로 분리했다.
- AI Agent와 n8n의 capability를 제한하고, 관리자 capability와 분리했다.
- HealthArticle, ArticleResource, Experience는 새 모델로 즉시 이관하지 않고 legacy read-only mapping으로 정리했다.

### 4.2 Service Policy

- final approval 전 조건을 순수 함수로 검증한다.
  - review approved 여부
  - content/revision/review 관계 일치
  - current revision 여부
  - actor capability
  - AI/n8n 최종 승인 차단
- publication 전 조건을 순수 함수로 검증한다.
  - approval approved 여부
  - content/revision/approval 관계 일치
  - approved revision 일치
  - actor capability
  - AI/n8n 발행 차단
  - 예약 발행 시간 검증

### 4.3 Command Factory

- `createFinalApprovalCommand`
  - workflow 상태와 policy를 모두 통과한 경우에만 Approval 엔터티 생성
  - 외부 주입 id/time 사용
  - 입력 객체 mutate 금지
- `createPublicationCommand`
  - immediate/scheduled publication 생성
  - workflow와 policy 실패 시 Publication 미생성
  - 입력 객체 mutate 금지

### 4.4 Application / Repository

- repository contract는 operationId 기반 idempotency, expectedContentUpdatedAt 기반 OCC, transaction 경계를 표현한다.
- in-memory repository는 application service 테스트를 위해 동일 계약을 구현한다.
- application service는 command factory 결과를 repository transaction과 결합한다.

### 4.5 RPC / SQL

- `execute_final_approval`
  - admin profile 확인
  - operation ledger replay
  - fingerprint mismatch 차단
  - OCC
  - workflow guard
  - review approved 검증
  - Approval 저장 + Content workflow 변경을 단일 함수 안에서 처리
- `execute_publication`
  - admin profile 확인
  - operation ledger replay
  - fingerprint mismatch 차단
  - schedule 검증
  - OCC
  - workflow guard
  - approval approved 검증
  - active publication 중복 차단
  - Publication 저장 + Content workflow 변경을 단일 함수 안에서 처리

### 4.6 Local Test / Release Checklist

- 로컬 Supabase에서 실제 PostgreSQL 17 기준 migration 적용 성공을 확인했다.
- 수동 SQL 검증을 거쳐 핵심 RPC 안전 규칙을 확인했다.
- 이후 npm 자동 통합 테스트로 publication + final approval 총 12개 시나리오를 반복 가능하게 만들었다.
- 운영 적용 전 checklist를 문서화했다.

## 5. 기존 health-knowhow 기능 영향

기존 화면, 컴포넌트, mock/CSV 데이터, Supabase 운영 schema, 환경변수는 이번 작업에서 직접 수정하지 않았다.

영향 범위:

- 런타임 UI 변경 없음
- 기존 health article 화면 변경 없음
- 기존 experience review 화면 변경 없음
- 기존 record/health 민감정보 모델 변경 없음
- 기존 mock/CSV 데이터 변경 없음
- 기존 운영 Supabase DB 변경 없음

단, `package.json`에 test script와 Vitest가 추가되어 개발 환경 의존성은 변경되었다.

## 6. 삭제되거나 깨진 기존 기능 여부

현재까지 확인한 범위에서 삭제된 기존 기능은 없다.

확인 근거:

- 기존 앱 파일 삭제 없음
- 기존 화면 파일 수정 없음
- 기존 service 파일 중 legacy 서비스 수정 없음
- `npm.cmd test`: 158개 테스트 통과
- `npx.cmd tsc --noEmit`: 통과
- `npm.cmd run lint`: 통과

주의:

- 전체 Next.js build는 이번 최종 리뷰 단계에서 새로 실행하지 않았다.
- UI 변경이 없으므로 브라우저에서 직접 보이는 변경도 없다.

## 7. 테스트 결과 전체 요약

### 7.1 Unit / Type / Lint

- `npm.cmd test`
  - 7 files passed
  - 158 tests passed
- `npx.cmd tsc --noEmit`
  - 통과
- `npm.cmd run lint`
  - 통과
- `git diff --check`
  - 통과
  - 단, `package.json` CRLF warning 존재

### 7.2 로컬 PostgreSQL/Supabase 실제 검증

오빠 일반 Windows PowerShell에서 로컬 Supabase/Docker 환경으로 확인했다.

- Supabase init 완료
- local config seed disabled
- local Supabase start 성공
- local db reset 성공
- content platform 테이블/RPC/constraint/RLS/security definer 확인
- pending Approval publication reject 성공
- approved immediate publication success 성공
- replay idempotency 성공
- `OPERATION_PAYLOAD_MISMATCH` 성공
- `CONTENT_UPDATED` OCC reject 성공
- 통합 DB/RPC 안전 검증 6 PASS / 0 FAIL
- npm 자동 로컬 RPC 통합 테스트 12 PASS / 0 FAIL
- 모든 로컬 DB 테스트에서 `ROLLBACK` 확인

## 8. 원격 Supabase에 아직 적용되지 않은 항목

다음 항목은 아직 원격 Supabase 또는 운영 DB에 적용하지 않았다.

- content platform 신규 테이블
- FK / unique / check constraint
- RLS 설정
- `execute_final_approval` RPC
- `execute_publication` RPC
- grant/revoke 권한 설정
- operation ledger 구조
- publication 중복 방지 index
- scheduled publication due index

운영 적용 전 `docs/content-platform-release-checklist.md`의 차단 조건을 먼저 만족해야 한다.

## 9. 운영 적용 차단 조건

운영 적용은 다음 조건 중 하나라도 해당하면 차단해야 한다.

- 운영 Supabase project ref가 확실하지 않다.
- 운영 DB 백업 또는 restore point가 없다.
- `public.profiles` 계약이 확정되지 않았다.
- `npm.cmd run test:rpc:local`이 12/12 통과하지 않는다.
- RLS 비활성 content platform 테이블이 있다.
- PUBLIC 또는 anon에 RPC execute 권한이 열려 있다.
- `execute_publication`에서 approval approved 검사가 확인되지 않는다.
- active publication 중복 방지 index가 없다.
- TypeScript RPC error contract와 SQL 반환 code가 불일치한다.
- 운영 적용 담당자가 rollback 절차를 모른다.

## 10. 실제 설계 결함 발견 여부

현재까지 확인된 실제 설계 결함은 없다.

검증 중 발견되어 보정한 것은 다음 성격이다.

- 테스트 SQL 작성 오류
- PostgreSQL statement snapshot으로 인한 검증 SQL count 관측 문제
- 로컬 테스트 migration의 `profiles` 선행 의존성 누락

위 항목들은 설계 결함으로 판단하지 않았다. 다만 `profiles` 의존성은 운영 migration 설계 시 반드시 명시해야 한다.

## 11. 기술 부채 및 남은 위험

- 실제 병렬 동시성 테스트는 아직 자동화하지 않았다.
- 예약 발행 worker는 아직 구현되지 않았다.
- 예약 발행 worker는 향후 `FOR UPDATE SKIP LOCKED` 기반으로 구현해야 한다.
- 운영 관리자 UI는 아직 content platform RPC에 연결되지 않았다.
- 기존 legacy mock/CSV/HealthArticle/ArticleResource/Experience 데이터 이관은 아직 하지 않았다.
- 의료 콘텐츠 전문가 검수 단계는 아직 별도 workflow로 강제하지 않는다.
- 로컬 검증용 migration은 `supabase/local-tests`로 이동되어 운영 migration 자동 적용 대상에서는 제외되었다.

## 12. Git commit에 포함해도 되는 파일

다음 파일은 현재 작업의 의도를 반영하므로 commit 포함 가능하다.

- `package.json`
- `package-lock.json`
- `types/content-platform.ts`
- `types/content-platform.test.ts`
- `types/content-platform-rpc.ts`
- `services/contentPlatformPolicy.ts`
- `services/contentPlatformPolicy.test.ts`
- `services/contentPlatformCommand.ts`
- `services/contentPlatformCommand.test.ts`
- `services/contentPlatformApplication.ts`
- `services/contentPlatformApplication.test.ts`
- `services/inMemoryContentPlatformRepository.ts`
- `services/inMemoryContentPlatformRepository.test.ts`
- `services/contentPlatformRpcMapper.ts`
- `services/contentPlatformRpcMapper.test.ts`
- `services/contentPlatformSqlContract.test.ts`
- `scripts/run-local-rpc-safety-tests.mjs`
- `supabase/.gitignore`
- `supabase/config.toml`
- `supabase/drafts/001_content_platform_rpc.sql`
- `supabase/local-tests/202607130001_content_platform_rpc_local_test.sql`
- `supabase/local-tests/content-platform-rpc-smoke.sql`
- `supabase/local-tests/content-platform-safety-bundle.sql`
- `docs/content-platform-release-checklist.md`
- `docs/content-platform-pre-commit-review.md`

## 13. Git commit에서 제외하거나 정리 후 포함해야 할 파일

현재 필수 제외 파일은 없다.

다만 `supabase/local-tests/202607130001_content_platform_rpc_local_test.sql`은 운영 migration이 아니라 로컬 검증용 SQL이다. commit에 포함하더라도 운영 적용 대상이 아님을 리뷰어가 명확히 인지해야 한다.

운영 Supabase 적용 전에는 `supabase/drafts/001_content_platform_rpc.sql`과 로컬 검증 결과를 기준으로 별도의 production migration을 확정해야 한다.

## 14. 추천 commit message

추천 메시지:

```text
Add content platform workflow contracts and local RPC safety tests
```

조금 더 설명적인 메시지:

```text
Add content platform domain, approval/publication policies, RPC contracts, and local safety tests
```

## 15. 지금 commit/push 가능한 상태인지 최종 판정

commit:

- 가능
- 로컬 테스트 migration이 `supabase/local-tests`로 이동되어 운영 migration 폴더에 남아 있지 않다.

push:

- 아직 보류 권장
- 이유:
  - 운영 적용용 migration이 아직 확정되지 않았다.
  - 원격 Supabase 미적용 상태다.
  - 병렬 동시성 및 예약 발행 worker는 아직 남은 위험이다.

최종 결론:

현재 작업은 기술적으로 잘 검증되었고, 앱 기능을 깨뜨린 흔적은 없다. 로컬 테스트 migration도 운영 migration 폴더 밖으로 정리되었으므로 현재 상태는 commit 가능으로 판단한다. 다만 원격 Supabase 적용과 push는 별도 승인 전까지 보류가 안전하다.
