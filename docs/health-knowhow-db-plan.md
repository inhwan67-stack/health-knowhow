# Health Knowhow Database Plan

이 문서는 현재 mock UI를 유지하면서 향후 PostgreSQL, n8n, AI API, 병원 검색 API로 확장하기 위한 데이터 설계 초안입니다.

## 설계 원칙

- 건강노하우는 의료 진단이나 치료를 제공하지 않는다.
- 건강정보와 사용자 경험은 참고용으로 표시한다.
- 건강사진, 처방전, 약 봉투, 병원 방문 기록, 복용약 정보는 민감정보로 취급한다.
- 개인 건강 기록의 기본값은 비공개이다.
- 익명 공개는 사용자 명시 동의와 관리자 검토 후에만 허용한다.
- AI 리포트는 진단이 아니라 사용자가 입력한 기록의 요약이다.
- 응급 증상, 오래 지속되는 증상, 당뇨 등 기저질환이 있는 경우 의료기관 상담 안내를 함께 표시한다.

## A. 건강정보 블로그

### health_articles

| Column | Type draft | Note |
| --- | --- | --- |
| id | uuid | primary key |
| title | text | 글 제목 |
| slug | text | unique |
| category_id | uuid | article_categories.id |
| summary | text | 카드/검색 요약 |
| content | text | 본문 |
| status | text | draft, review, published, archived |
| ad_enabled | boolean | 애드센스/광고 노출 여부 |
| seo_title | text | SEO title |
| seo_description | text | SEO description |
| created_at | timestamptz | 생성일 |
| updated_at | timestamptz | 수정일 |
| published_at | timestamptz | 게시일 |

### article_categories

| Column | Type draft | Note |
| --- | --- | --- |
| id | uuid | primary key |
| name | text | 카테고리명 |
| slug | text | unique |
| description | text | 설명 |

### article_tags

| Column | Type draft | Note |
| --- | --- | --- |
| id | uuid | primary key |
| name | text | 태그명 |
| slug | text | unique |

### article_sources

| Column | Type draft | Note |
| --- | --- | --- |
| id | uuid | primary key |
| article_id | uuid | health_articles.id |
| source_title | text | 출처 제목 |
| source_url | text | 출처 URL |
| source_type | text | public, medical, blog, video, etc. |
| summary | text | 출처 요약 |

## B. 사용자 증상 기록

### health_cases

| Column | Type draft | Note |
| --- | --- | --- |
| id | uuid | primary key |
| user_id | uuid | auth user id |
| title | text | 기록 제목 |
| body_part | text | 증상 부위 |
| symptom_type | text | 통증, 가려움, 발진 등 |
| description | text | 증상 설명 |
| started_at | date | 발생일 |
| duration_text | text | 지속 기간 |
| underlying_conditions | text[] | 당뇨, 고혈압 등 기저질환 |
| privacy_status | text | private, shared_anonymous, public |
| share_status | text | none, requested, approved, rejected, needs_revision |
| created_at | timestamptz | 생성일 |
| updated_at | timestamptz | 수정일 |

### case_photos

사진은 민감정보로 취급하며 기본값은 비공개이다. 공개 전 얼굴, 신체 식별 가능 정보, 처방전 식별정보가 포함되지 않았는지 검토해야 한다.

| Column | Type draft | Note |
| --- | --- | --- |
| id | uuid | primary key |
| case_id | uuid | health_cases.id |
| photo_url | text | storage URL |
| photo_type | text | symptom, prescription, medicine_bag, medicine, etc. |
| taken_at | timestamptz | 촬영일 |
| memo | text | 메모 |
| is_private | boolean | default true |
| created_at | timestamptz | 생성일 |

### case_progress_logs

| Column | Type draft | Note |
| --- | --- | --- |
| id | uuid | primary key |
| case_id | uuid | health_cases.id |
| log_date | date | 기록일 |
| pain_level | integer | 0-10 |
| itch_level | integer | 0-10 |
| swelling | boolean | 붓기 여부 |
| discharge | boolean | 진물 여부 |
| memo | text | 경과 메모 |
| created_at | timestamptz | 생성일 |

## C. 병원 방문과 처방 기록

### case_medical_visits

병원 방문 기록과 진단명 텍스트는 민감정보이다. 사용자 본인만 볼 수 있게 RLS를 적용한다.

| Column | Type draft | Note |
| --- | --- | --- |
| id | uuid | primary key |
| case_id | uuid | health_cases.id |
| hospital_name | text | 병원명 |
| specialty | text | 진료과 |
| visit_date | date | 방문일 |
| doctor_note | text | 의사에게 들은 내용 |
| diagnosis_text | text | 진단명 또는 설명. 사용자 기록이며 확정 진단으로 표시하지 않음 |
| treatment_summary | text | 처치/치료 요약 |
| created_at | timestamptz | 생성일 |

### case_documents

처방전, 약 봉투, 검사 결과지는 민감정보이다. 기본값은 비공개이며, 공개 공유 대상에서 제외하는 것을 기본 정책으로 둔다.

| Column | Type draft | Note |
| --- | --- | --- |
| id | uuid | primary key |
| case_id | uuid | health_cases.id |
| document_type | text | prescription, medicine_bag, lab_result, receipt |
| file_url | text | storage URL |
| ocr_text | text | OCR 원문 |
| verified_text | text | 사용자 확인 후 텍스트 |
| is_private | boolean | default true |
| uploaded_at | timestamptz | 업로드일 |

### case_medicines

복용약 정보는 민감정보이다. 기본값은 비공개이며, 월간 리포트에는 사용자 확인용 요약으로만 표시한다.

| Column | Type draft | Note |
| --- | --- | --- |
| id | uuid | primary key |
| case_id | uuid | health_cases.id |
| medicine_name | text | 약 이름 |
| medicine_type | text | tablet, capsule, ointment, liquid, injection, etc. |
| dose | text | 용량 |
| frequency | text | 복용 횟수 |
| timing | text | 아침/점심/저녁/식후 등 |
| start_date | date | 시작일 |
| end_date | date | 종료일 |
| memo | text | 메모 |
| source_document_id | uuid | case_documents.id |

## D. 경험 공유와 참고자료

### case_references

| Column | Type draft | Note |
| --- | --- | --- |
| id | uuid | primary key |
| case_id | uuid | health_cases.id |
| title | text | 자료 제목 |
| url | text | 자료 URL |
| source_type | text | public, medical, korean_medicine, home_remedy, user_experience, youtube, blog |
| summary | text | 요약 |
| user_memo | text | 사용자 메모 |
| reliability_level | text | official, user_experience, needs_verification |
| warning_note | text | 주의 문구 |
| created_at | timestamptz | 생성일 |

### remedy_library

| Column | Type draft | Note |
| --- | --- | --- |
| id | uuid | primary key |
| title | text | 자료 제목 |
| category | text | 한방, 민간요법, 식이요법 등 |
| source_type | text | 출처 유형 |
| summary | text | 요약 |
| url | text | URL |
| reliability_level | text | official, user_experience, needs_verification |
| warning_note | text | 주의 문구 |
| created_at | timestamptz | 생성일 |

## E. 병원 찾기

### medical_specialties

| Column | Type draft | Note |
| --- | --- | --- |
| id | uuid | primary key |
| name | text | 진료과명 |
| description | text | 설명 |
| related_symptoms | text[] | 관련 증상 |

### symptom_specialty_map

| Column | Type draft | Note |
| --- | --- | --- |
| id | uuid | primary key |
| symptom_keyword | text | 증상 키워드 |
| body_part | text | 신체 부위 |
| specialty_id | uuid | medical_specialties.id |
| caution_level | text | normal, caution, urgent |
| guide_text | text | 참고 안내 |

### hospital_search_logs

위치 정보는 개인정보로 취급한다. 저장 필요성을 최소화하고, 저장 시 사용자 동의와 보관 기간 정책을 둔다.

| Column | Type draft | Note |
| --- | --- | --- |
| id | uuid | primary key |
| user_id | uuid | nullable |
| symptom_text | text | 검색 증상 |
| location_lat | numeric | 위도 |
| location_lng | numeric | 경도 |
| searched_specialty | text | 검색 진료과 |
| created_at | timestamptz | 검색일 |

## F. 월간 리포트와 뉴스레터

### monthly_reports

AI 리포트는 진단이 아니라 사용자가 입력한 기록의 요약이다. 리포트 화면에는 이 고지를 항상 표시한다.

| Column | Type draft | Note |
| --- | --- | --- |
| id | uuid | primary key |
| user_id | uuid | auth user id |
| report_month | date | 월 기준 |
| summary | text | 전체 요약 |
| symptom_changes | jsonb | 증상 변화 |
| medical_visits_summary | text | 병원 방문 요약 |
| medicine_summary | text | 복용약 요약 |
| suggested_questions | text[] | 다음 진료 질문 |
| related_articles | jsonb | 관련 글 추천 |
| created_at | timestamptz | 생성일 |

### newsletter_subscriptions

| Column | Type draft | Note |
| --- | --- | --- |
| id | uuid | primary key |
| user_id | uuid | nullable |
| email | text | 이메일 |
| topics | text[] | 관심 주제 |
| is_active | boolean | 구독 여부 |
| consent_at | timestamptz | 동의일 |

### report_delivery_logs

| Column | Type draft | Note |
| --- | --- | --- |
| id | uuid | primary key |
| report_id | uuid | monthly_reports.id |
| delivery_channel | text | email, push, in_app |
| status | text | pending, sent, failed |
| sent_at | timestamptz | 발송일 |

## G. 개인정보와 동의

### consent_records

| Column | Type draft | Note |
| --- | --- | --- |
| id | uuid | primary key |
| user_id | uuid | auth user id |
| consent_type | text | privacy, ai_summary, anonymous_share, newsletter |
| consent_version | text | 약관 버전 |
| agreed | boolean | 동의 여부 |
| agreed_at | timestamptz | 동의일 |

### privacy_settings

| Column | Type draft | Note |
| --- | --- | --- |
| id | uuid | primary key |
| user_id | uuid | auth user id |
| default_case_privacy | text | private default 권장 |
| allow_anonymous_share | boolean | 익명 공유 허용 |
| allow_ai_summary | boolean | AI 요약 허용 |
| allow_newsletter | boolean | 뉴스레터 허용 |

## n8n Workflow Plan

- 새 증상 기록 등록 알림
- 3일 후 경과 사진 업로드 알림
- 처방전 OCR 추출 후 사용자 확인 요청
- 월간 건강 리포트 생성
- 뉴스레터 발송
- 위험 키워드 감지 시 의료기관 진료 안내 문구 표시
- 익명 공유 요청 시 관리자 검토 알림

권장 흐름:

1. PostgreSQL insert/update event 또는 Supabase webhook을 n8n으로 전달한다.
2. n8n에서 사용자 동의 상태와 privacy_settings를 확인한다.
3. 민감정보가 포함된 payload는 최소화하고, 필요 시 record id만 전달한다.
4. AI/OCR 처리 전 사용자의 `allow_ai_summary` 또는 문서 처리 동의를 확인한다.
5. 처리 결과는 바로 공개하지 않고 사용자 확인 또는 관리자 검토 상태로 저장한다.

## Hospital Search API Plan

현재는 mock 구조만 유지한다. 실제 API 연결 후보는 다음과 같다.

- Kakao Local API
- Google Places API
- 공공데이터 의료기관 API

연동 순서:

1. symptom_specialty_map으로 증상 키워드를 진료과로 매칭한다.
2. 사용자가 위치 권한을 허용한 경우에만 위도/경도를 사용한다.
3. 병원 검색 API에는 진료과, 위치, 반경을 전달한다.
4. 결과에는 광고 여부, 출처 API, 거리, 업데이트 기준을 표시한다.
5. 응급 증상은 병원 목록보다 119/응급실 안내를 우선 표시한다.

## PostgreSQL 연동 작업 순서

1. Auth와 profiles 테이블을 먼저 구성한다.
2. privacy_settings와 consent_records를 구성한다.
3. health_cases, case_progress_logs를 먼저 연결한다.
4. case_photos, case_documents는 Storage 정책과 함께 연결한다.
5. case_medical_visits, case_medicines를 연결한다.
6. 공유 요청 상태와 관리자 검토 화면을 연결한다.
7. health_articles와 article_categories를 CMS 형태로 연결한다.
8. medical_specialties와 symptom_specialty_map을 연결한다.
9. hospital_search_logs는 위치정보 보관 정책 확정 후 연결한다.
10. monthly_reports와 newsletter_subscriptions를 n8n workflow와 연결한다.
