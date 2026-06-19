import type { Metadata } from "next";
import Link from "next/link";
import {
  emergencyWarningItems,
  hospitalVisitChecklist,
  medicalSpecialties,
  sampleHospitals,
  symptomSpecialtyMappings,
} from "@/data/hospitalMockData";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "증상으로 병원 찾기 | Health Knowhow",
  description: "증상, 부위, 기간, 기저질환을 바탕으로 참고용 진료과와 병원 검색 구조를 안내하는 mock 페이지입니다.",
};

const bodyPartOptions = ["발/다리", "피부", "관절/허리", "복부/소화기", "비뇨기", "여성질환", "전신증상", "기타"];
const durationOptions = ["오늘 시작", "2~3일", "1주 이상", "1개월 이상", "2개월 이상"];
const conditionOptions = ["당뇨", "고혈압", "고지혈증", "심혈관질환", "없음", "기타"];
const currentStatusOptions = ["통증", "붓기", "진물", "출혈", "열감", "가려움", "움직임 제한", "반복 증상"];
const radiusOptions = ["1km", "3km", "5km", "10km"];
const specialtyRecommendationMappings = symptomSpecialtyMappings.filter((mapping) => mapping.cautionLevel !== "urgent");

export default function FindHospitalPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <HeroSection />

      <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
        <MedicalNotice />
        <SymptomInputSection />
        <SpecialtyRecommendationSection />
        <HospitalSearchMockSection />
        <HospitalVisitChecklistSection />
        <MonthlyReportCtaSection />
        <EmergencyWarningSection />
      </section>
    </main>
  );
}

function HeroSection() {
  return (
    <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
      <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <Link href="/" className="text-sm font-bold text-[#2f6c48] hover:text-[#173d2d]">
          Health Knowhow
        </Link>
        <h1 className="mt-5 text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl">증상으로 병원 찾기</h1>
        <p className="mt-5 max-w-4xl text-lg leading-8 text-[#355845]">
          입력한 증상을 바탕으로 참고할 수 있는 진료과와 가까운 병원 검색 구조를 안내합니다. 이 정보는 진단이
          아니라 참고용입니다.
        </p>
      </div>
    </section>
  );
}

function MedicalNotice() {
  return (
    <section className="rounded-lg border border-[#efb8a5] bg-[#fff7f3] p-5 text-sm font-semibold leading-7 text-[#714533] shadow-sm sm:p-6">
      본 기능은 의료 진단이나 치료를 제공하지 않습니다. 입력한 증상을 바탕으로 관련 진료과와 병원 검색 방향을
      참고용으로 안내합니다. 증상이 심하거나 오래 지속되거나 당뇨 등 기저질환이 있는 경우 의료진과 상담하세요.
      응급 증상은 즉시 119 또는 응급실을 이용하세요.
    </section>
  );
}

function SymptomInputSection() {
  return (
    <section className="mt-8 rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm sm:p-6">
      <SectionTitle eyebrow="증상 입력" title="증상과 현재 상태를 정리해보세요" />
      <div className="grid gap-4 lg:grid-cols-2">
        <TextField label="증상 키워드" placeholder="예: 발목 상처, 피부 가려움, 무릎 통증, 혈당 문제" />
        <SelectField label="증상 부위" options={bodyPartOptions} />
        <SelectField label="증상 기간" options={durationOptions} />
        <SelectField label="기저질환 여부" options={conditionOptions} />
      </div>
      <div className="mt-5">
        <p className="text-sm font-extrabold text-[#173d2d]">현재 상태</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {currentStatusOptions.map((item) => (
            <label key={item} className="flex items-center gap-3 rounded-lg border border-[#dfe8d8] bg-[#fffdf7] p-3 text-sm font-bold text-[#173d2d]">
              <input type="checkbox" className="h-4 w-4 rounded border-[#9db896] accent-[#174330]" />
              {item}
            </label>
          ))}
        </div>
      </div>
      <button type="button" className="mt-6 min-h-12 rounded-lg bg-[#174330] px-6 text-base font-bold text-white shadow-sm">
        관련 진료과 확인 mock
      </button>
    </section>
  );
}

function SpecialtyRecommendationSection() {
  return (
    <section className="mt-8">
      <SectionTitle eyebrow="관련 진료과 추천 mock" title="입력 예시에 따른 참고용 진료과" />
      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {specialtyRecommendationMappings.map((mapping) => {
          const specialty = medicalSpecialties.find((item) => item.id === mapping.specialtyId);

          return (
            <article key={mapping.id} className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${
                  mapping.cautionLevel === "urgent" ? "bg-[#fff7f3] text-[#9a3f25]" : "bg-[#eef6e9] text-[#2f6c48]"
                }`}
              >
                {mapping.symptomKeyword}
              </span>
              <h3 className="mt-5 text-2xl font-extrabold text-[#173d2d]">{specialty?.name ?? "진료과 확인 필요"}</h3>
              <p className="mt-3 text-sm leading-6 text-[#526257]">{specialty?.description}</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#405347]">{mapping.guideText}</p>
              <div className="mt-5 rounded-lg bg-[#fffdf7] p-4">
                <p className="text-sm font-extrabold text-[#173d2d]">방문 전 준비하면 좋은 기록</p>
                <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#526257]">
                  {mapping.visitPreparation.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#2f6c48]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-4 rounded-lg bg-[#fff7f3] p-3 text-xs font-semibold leading-5 text-[#714533]">
                {mapping.warningNote}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function HospitalSearchMockSection() {
  return (
    <section className="mt-10 rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm sm:p-6">
      <SectionTitle eyebrow="가까운 병원 검색 mock" title="위치 기반 병원 검색 API 연결 전 화면 구조" />
      {/* TODO: Kakao Local API 연동 예정 */}
      {/* TODO: Google Places API 연동 가능 */}
      {/* TODO: 공공데이터 의료기관 API 연동 가능 */}
      {/* TODO: 사용자 위치 권한 동의 필요 */}
      {/* TODO: 병원 검색 결과는 광고/추천처럼 보이지 않도록 주의 필요 */}
      {/* TODO: 검색 결과의 정확성 고지 필요 */}
      <div className="grid gap-4 lg:grid-cols-[180px_1fr_220px_160px]">
        <button type="button" className="min-h-12 rounded-lg border border-[#174330] bg-[#eef6e9] px-4 text-sm font-bold text-[#174330]">
          현재 위치 사용 mock
        </button>
        <TextField label="지역 직접 입력" placeholder="예: 서울 은평구, 이천시 중리동" />
        <SelectField label="진료과 선택" options={medicalSpecialties.map((item) => item.name)} />
        <SelectField label="검색 반경" options={radiusOptions} />
      </div>
      <button type="button" className="mt-5 min-h-12 rounded-lg bg-[#174330] px-6 text-base font-bold text-white shadow-sm">
        병원 검색 mock
      </button>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {sampleHospitals.map((hospital) => (
          <article key={hospital.id} className="rounded-lg border border-[#dfe8d8] bg-[#fffdf7] p-5">
            <p className="text-sm font-extrabold text-[#2f6c48]">{hospital.specialty}</p>
            <h3 className="mt-2 text-xl font-extrabold text-[#173d2d]">{hospital.name}</h3>
            <dl className="mt-4 grid gap-2 text-sm leading-6 text-[#526257]">
              <div>
                <dt className="font-bold text-[#173d2d]">주소</dt>
                <dd>{hospital.address}</dd>
              </div>
              <div>
                <dt className="font-bold text-[#173d2d]">거리</dt>
                <dd>{hospital.distance}</dd>
              </div>
              <div>
                <dt className="font-bold text-[#173d2d]">전화번호</dt>
                <dd>{hospital.phone}</dd>
              </div>
            </dl>
            <button type="button" className="mt-4 min-h-10 rounded-lg border border-[#174330] px-4 text-sm font-bold text-[#174330]">
              지도 보기 mock
            </button>
            <p className="mt-4 rounded-lg bg-white p-3 text-xs font-semibold leading-5 text-[#714533]">{hospital.notice}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function HospitalVisitChecklistSection() {
  return (
    <section className="mt-10 rounded-lg border border-[#d9d1aa] bg-[#fffdf7] p-5 shadow-sm sm:p-6">
      <SectionTitle eyebrow="병원 방문 준비 체크리스트" title="진료 전에 챙기면 좋은 자료" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {hospitalVisitChecklist.map((item) => (
          <div key={item.id} className="rounded-lg border border-[#e3dcc0] bg-white p-4 text-sm font-extrabold text-[#173d2d]">
            {item.label}
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href="/my-records/new" className="rounded-lg bg-[#174330] px-5 py-3.5 text-center text-base font-bold text-white">
          내 증상 기록하기
        </Link>
        <Link
          href="/my-records/new"
          className="rounded-lg border border-[#bcd2b2] bg-white px-5 py-3.5 text-center text-base font-bold text-[#174330]"
        >
          처방/복용 기록 남기기
        </Link>
      </div>
    </section>
  );
}

function MonthlyReportCtaSection() {
  return (
    <section className="mt-10 rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm sm:p-6">
      <p className="text-sm font-extrabold text-[#2f6c48]">월간 건강 리포트</p>
      <h2 className="mt-2 text-2xl font-extrabold text-[#173d2d]">병원 방문 전 한 달 기록을 확인해보세요</h2>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#526257]">
        증상 사진, 복용약, 병원 방문 기록을 월간 리포트로 정리하면 진료 때 설명할 내용을 준비하는 데 도움이 될 수 있습니다.
      </p>
      <Link href="/monthly-report" className="mt-5 inline-flex rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-bold text-[#174330]">
        월간 리포트 보기
      </Link>
    </section>
  );
}

function EmergencyWarningSection() {
  return (
    <section className="mt-10 rounded-lg border border-[#efb8a5] bg-[#fff7f3] p-5 shadow-sm sm:p-6">
      <p className="text-sm font-extrabold text-[#9a3f25]">응급 증상 안내</p>
      <h2 className="mt-2 text-2xl font-extrabold text-[#7a2e1d]">
        다음과 같은 경우에는 병원 검색보다 즉시 119 또는 응급실 이용을 고려하세요.
      </h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {emergencyWarningItems.map((item) => (
          <li key={item.id} className="rounded-lg bg-white p-4 text-sm font-extrabold text-[#714533]">
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5">
      <p className="text-sm font-extrabold text-[#2f6c48]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-extrabold leading-8 text-[#173d2d] sm:text-3xl">{title}</h2>
    </div>
  );
}

function TextField({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#173d2d]">
      {label}
      <input
        placeholder={placeholder}
        className="min-h-12 rounded-lg border border-[#c9d9c2] bg-[#fffdf7] px-4 text-base font-medium text-[#173d2d] outline-none transition placeholder:text-[#7a8a7f] focus:border-[#2f6c48] focus:ring-4 focus:ring-[#d9ead2]"
      />
    </label>
  );
}

function SelectField({ label, options }: { label: string; options: string[] }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#173d2d]">
      {label}
      <select className="min-h-12 rounded-lg border border-[#c9d9c2] bg-[#fffdf7] px-4 text-base font-medium text-[#173d2d] outline-none transition focus:border-[#2f6c48] focus:ring-4 focus:ring-[#d9ead2]">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
