import Link from "next/link";
import {
  experienceShareItems,
  healthCategories,
  medicationMockItems,
  medicalSpecialties,
  monthlyReportPreviewItems,
  pwaFeatureItems,
  referenceFilters,
  sampleReferences,
  specialtyMappings,
} from "@/data/healthMockData";

export function HealthBlogSection() {
  return (
    <section id="health-blog" className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
      <SectionHeader
        eyebrow="건강정보 블로그"
        title="검색으로 들어온 사용자가 바로 이해할 수 있는 질환별 참고 콘텐츠"
        description="질환과 증상별 글 주제를 카드로 정리해 검색 유입, 내부 탐색, 광고 수익화가 가능한 블로그형 구조를 준비합니다."
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {healthCategories.map((category) => (
          <article key={category.id} className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <h3 className="text-xl font-extrabold text-[#1b4631]">{category.name}</h3>
            <p className="mt-2 text-sm leading-6 text-[#526257]">{category.description}</p>
            <ul className="mt-4 grid gap-2 text-sm leading-6 text-[#526257]">
              {category.topics.map((topic) => (
                <li key={topic} className="flex gap-2">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#2f6c48]" />
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PrescriptionMedicationSection() {
  return (
    <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-extrabold text-[#2f6c48]">처방전/약 봉투 기록</p>
          <h2 className="mt-2 text-3xl font-extrabold leading-tight text-[#173d2d] sm:text-4xl">
            병원 처방과 복용 기록을 증상 경과와 함께 남깁니다
          </h2>
          <p className="mt-4 text-base leading-8 text-[#526257] sm:text-lg">
            처방전과 약 봉투에는 개인정보가 포함될 수 있으므로 기본값은 비공개로 저장되며, 공개 전 개인정보 마스킹과 관리자 검토가 필요합니다.
          </p>
        </div>
        <div className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {medicationMockItems.map((item) => (
              <div key={item} className="rounded-lg bg-[#fffdf7] p-4">
                <p className="text-sm font-extrabold text-[#1b4631]">{item}</p>
                <p className="mt-2 text-xs leading-5 text-[#6a776e]">실제 업로드와 OCR은 추후 연결 예정</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ExperienceShareSection() {
  return (
    <section id="experiences" className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
      <div className="rounded-lg border border-[#d9d1aa] bg-[#fffdf7] p-6 shadow-sm sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-extrabold text-[#7a6230]">치료 경험 공유</p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight text-[#173d2d] sm:text-4xl">
              나의 경험은 익명 참고 사례로만 공유됩니다
            </h2>
            <p className="mt-4 text-base leading-8 text-[#526257] sm:text-lg">
              개인 경험은 의료 조언이 아니며, 사용자가 공개를 선택한 경우에도 관리자 검토 후 참고 사례로 표시하는 구조를 보여줍니다.
            </p>
            <Link href="/experiences/new" className="mt-6 inline-flex rounded-lg bg-[#174330] px-5 py-3 text-base font-bold text-white shadow-sm">
              경험 공유 작성 mock
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {experienceShareItems.map((item) => (
              <div key={item} className="rounded-lg border border-[#e3dcc0] bg-white p-4">
                <p className="text-sm font-extrabold text-[#596344]">{item}</p>
                <p className="mt-2 text-sm leading-6 text-[#526257]">기본 비공개, 선택 공개, 검토 공개 원칙을 적용합니다.</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ReferenceResourceSection() {
  return (
    <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
      <SectionHeader
        eyebrow="한방·민간요법 참고자료"
        title="출처와 신뢰도를 분리해서 참고자료를 정리합니다"
        description="공식자료, 사용자 경험, 검증 필요 자료를 한 화면에서 구분하고 단정적인 치료 표현을 피하는 구조입니다."
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {referenceFilters.map((filter) => (
          <span key={filter} className="rounded-full border border-[#cbdac4] bg-white px-3 py-2 text-sm font-bold text-[#2f6c48]">
            {filter}
          </span>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {sampleReferences.map((resource) => (
          <article key={resource.id} className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
            <span className="rounded-full bg-[#eef6e9] px-3 py-1.5 text-xs font-extrabold text-[#2f6c48]">{formatReliability(resource.reliabilityLevel)}</span>
            <p className="mt-5 text-sm font-bold text-[#526257]">{formatSourceType(resource.sourceType)}</p>
            <h3 className="mt-2 text-xl font-extrabold text-[#173d2d]">{resource.title}</h3>
            <p className="mt-3 text-sm leading-6 text-[#526257]">{resource.summary}</p>
            <a href={resource.url} className="mt-4 inline-flex text-sm font-extrabold text-[#174330]">출처 링크 mock</a>
            <p className="mt-4 rounded-lg bg-[#fff7f3] p-3 text-xs font-semibold leading-5 text-[#714533]">{resource.warningNote}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HospitalSearchSection() {
  const matches = specialtyMappings.map((mapping) => {
    const specialty = medicalSpecialties.find((item) => item.id === mapping.specialtyId);
    return {
      symptom: mapping.symptomKeyword,
      department: specialty?.name ?? "진료과 확인 필요",
      guideText: mapping.guideText,
    };
  });

  return (
    <section id="hospital-search" className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div>
          <p className="text-sm font-extrabold text-[#2f6c48]">증상으로 병원 찾기</p>
          <h2 className="mt-2 text-3xl font-extrabold leading-tight text-[#173d2d] sm:text-4xl">
            증상을 입력하면 관련 진료과를 참고용으로 안내합니다
          </h2>
          <p className="mt-4 text-base leading-8 text-[#526257] sm:text-lg">
            검색 결과는 참고용이며, 응급 증상은 119 또는 응급실을 이용하세요. 위치 기반 병원 검색 API는 추후 연결 예정입니다.
          </p>
          <div className="mt-6 rounded-lg border border-[#cbdac4] bg-white p-4 shadow-sm">
            <label htmlFor="hospital-search-mock" className="text-sm font-extrabold text-[#173d2d]">증상 검색 mock</label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                id="hospital-search-mock"
                placeholder="예: 발진, 혈당, 허리 통증"
                className="min-h-12 flex-1 rounded-lg border border-[#c9d9c2] bg-[#fffdf7] px-4 text-base text-[#173d2d] outline-none"
              />
              <button type="button" className="min-h-12 rounded-lg bg-[#174330] px-5 text-base font-bold text-white">진료과 보기</button>
            </div>
          </div>
          <Link href="/find-hospital" className="mt-4 inline-flex rounded-lg border border-[#174330] bg-white px-5 py-3 text-base font-bold text-[#174330] shadow-sm">
            증상으로 병원 찾기 페이지 열기
          </Link>
        </div>
        <div className="grid gap-3">
          {matches.map((match) => (
            <article key={match.symptom} className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-[#526257]">{match.symptom}</p>
              <h3 className="mt-2 text-xl font-extrabold text-[#1b4631]">{match.department}</h3>
              <p className="mt-2 text-sm leading-6 text-[#526257]">{match.guideText}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MonthlyReportSection() {
  return (
    <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
      <div className="rounded-lg border border-[#b8d7e6] bg-[#fbfeff] p-6 shadow-sm sm:p-8">
        <SectionHeader
          eyebrow="월간 건강 리포트"
          title="한 달 동안 남긴 기록을 다음 진료에 가져갈 수 있게 요약합니다"
          description="AI 리포트는 진단이 아니라 사용자가 입력한 기록의 요약입니다."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {monthlyReportPreviewItems.map((item) => (
            <article key={item} className="rounded-lg bg-white p-5 shadow-sm">
              <p className="text-sm font-extrabold text-[#2b6f87]">{item}</p>
              <p className="mt-2 text-sm leading-6 text-[#526257]">기록 기반 요약 preview</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PwaSection() {
  return (
    <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
      <div className="grid gap-8 rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm sm:p-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-extrabold text-[#2f6c48]">모바일 앱/PWA 준비</p>
          <h2 className="mt-2 text-3xl font-extrabold leading-tight text-[#173d2d] sm:text-4xl">
            모바일 웹에서 바로 기록하고 나중에 PWA로 확장합니다
          </h2>
          <p className="mt-4 text-base leading-8 text-[#526257] sm:text-lg">
            실제 앱 설치, 알림, 오프라인 캐시는 다음 단계에서 manifest와 service worker를 연결해 구현합니다.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pwaFeatureItems.map((item) => (
            <div key={item} className="rounded-lg bg-[#f4faf0] p-4">
              <p className="text-sm font-extrabold text-[#1b4631]">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalMedicalNotice() {
  return (
    <section className="mx-auto max-w-[1440px] px-5 pb-14 sm:px-8 lg:px-12">
      <div className="rounded-lg border border-[#efb8a5] bg-[#fff7f3] p-6 shadow-sm sm:p-7">
        <p className="text-sm font-extrabold text-[#9a3f25]">의료 고지</p>
        <p className="mt-3 text-base font-semibold leading-8 text-[#714533] sm:text-lg">
          건강노하우는 의료 진단이나 치료를 제공하지 않습니다. 본 서비스의 정보와 사용자 경험은 참고용이며, 증상이 심하거나 오래 지속되거나 당뇨 등
          기저질환이 있는 경우 반드시 의료진과 상담하세요. 응급 증상은 즉시 119 또는 응급실을 이용하세요.
        </p>
      </div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-8">
      <p className="text-sm font-extrabold text-[#2f6c48]">{eyebrow}</p>
      <h2 className="mt-2 max-w-5xl text-3xl font-extrabold leading-tight text-[#173d2d] sm:text-4xl">{title}</h2>
      <p className="mt-4 max-w-4xl text-base leading-8 text-[#526257] sm:text-lg">{description}</p>
    </div>
  );
}

function formatReliability(value: "official" | "user_experience" | "needs_verification") {
  if (value === "official") return "공식자료";
  if (value === "user_experience") return "사용자 경험";
  return "검증 필요";
}

function formatSourceType(value: string) {
  const labels: Record<string, string> = {
    public: "공공기관 자료",
    medical: "의료기관 자료",
    korean_medicine: "한방 자료",
    home_remedy: "민간요법",
    user_experience: "사용자 경험",
    youtube: "유튜브",
    blog: "블로그/카페",
  };

  return labels[value] ?? value;
}
