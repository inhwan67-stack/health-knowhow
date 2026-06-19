import type { Metadata } from "next";
import Link from "next/link";
import { sampleArticles } from "@/data/healthMockData";
import {
  monthlyMedicalVisits,
  monthlyMedicineRecords,
  monthlyPhotoTimeline,
  monthlySymptomSummary,
  sampleMonthlyReport,
  suggestedDoctorQuestions,
} from "@/data/monthlyReportMockData";
import ReportActionButtons from "./ReportActionButtons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "월간 건강 리포트 | Health Knowhow",
  description: "한 달 동안 남긴 건강 기록을 다음 진료 때 참고할 수 있도록 정리하는 월간 리포트 mock 페이지입니다.",
};

const fallbackRelatedArticles = [
  {
    id: "fallback-diabetes-wound",
    title: "당뇨 환자가 상처를 주의해야 하는 이유",
    slug: "diabetes-wound-care",
    summary: "당뇨와 상처 관리가 왜 중요한지 일반 건강정보로 정리합니다.",
    category: "당뇨",
  },
  {
    id: "fallback-skin-wound",
    title: "피부 상처가 오래 낫지 않을 때 확인할 점",
    slug: "skin-wound-checkpoints",
    summary: "상처 경과를 기록하고 의료진 상담을 준비할 때 참고할 항목입니다.",
    category: "피부질환",
  },
  {
    id: "fallback-blood-sugar",
    title: "혈당스파이크를 줄이는 생활습관",
    slug: "blood-sugar-spike-habits",
    summary: "혈당 변화 기록과 식사 습관을 함께 살펴보는 참고 콘텐츠입니다.",
    category: "식이요법",
  },
];

export default function MonthlyReportPage() {
  const relatedArticles = [...sampleArticles, ...fallbackRelatedArticles].slice(0, 3);

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <HeroSection />

      <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
        <MedicalNotice />
        <ReportSummaryCards />
        <SymptomSummarySection />
        <PhotoTimelineSection />
        <MedicalVisitSection />
        <MedicineSummarySection />
        <DoctorQuestionSection />
        <RelatedArticlesSection articles={relatedArticles} />
        <section id="monthly-report-actions" className="mt-10 rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle eyebrow="리포트 활용" title="다음 진료와 기록 관리에 연결하기" />
          <ReportActionButtons />
        </section>
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
        <h1 className="mt-5 text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl">월간 건강 리포트</h1>
        <p className="mt-5 max-w-4xl text-lg leading-8 text-[#355845]">
          한 달 동안 남긴 증상 기록, 사진 변화, 복용약, 병원 방문 기록을 정리해 다음 진료 때 참고할 수 있도록
          도와드립니다.
        </p>
      </div>
    </section>
  );
}

function MedicalNotice() {
  return (
    <section className="rounded-lg border border-[#efb8a5] bg-[#fff7f3] p-5 text-sm font-semibold leading-7 text-[#714533] shadow-sm sm:p-6">
      이 리포트는 사용자가 입력한 기록을 요약한 참고자료이며, 의료 진단이나 치료를 제공하지 않습니다. 증상이
      심하거나 오래 지속되거나 당뇨 등 기저질환이 있는 경우 의료진과 상담하세요.
    </section>
  );
}

function ReportSummaryCards() {
  const metrics = [
    { label: "리포트 기간", value: sampleMonthlyReport.periodLabel },
    { label: "기록한 증상 수", value: `${sampleMonthlyReport.symptomCount}건` },
    { label: "업로드한 사진 수", value: `${sampleMonthlyReport.photoCount}장` },
    { label: "병원 방문 기록 수", value: `${sampleMonthlyReport.medicalVisitCount}건` },
    { label: "복용약/연고 기록 수", value: `${sampleMonthlyReport.medicineRecordCount}건` },
    { label: "참고자료 첨부 수", value: `${sampleMonthlyReport.referenceCount}건` },
  ];

  return (
    <section className="mt-8">
      <SectionTitle eyebrow="리포트 요약" title={sampleMonthlyReport.summary} />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-[#526257]">{metric.label}</p>
            <p className="mt-3 text-2xl font-extrabold text-[#173d2d]">{metric.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SymptomSummarySection() {
  return (
    <section className="mt-10 rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm sm:p-6">
      <SectionTitle eyebrow="이번 달 증상 변화 요약" title="AI 요약 예정 영역입니다" />
      {/* TODO: 매월 1일 n8n Schedule Trigger로 리포트 생성 예정 */}
      {/* TODO: PostgreSQL에서 사용자별 월간 기록 조회 예정 */}
      {/* TODO: AI API로 기록 요약 생성 예정 */}
      {/* TODO: monthly_reports 테이블에 저장 예정 */}
      {/* TODO: 이메일 또는 앱 알림 발송 예정 */}
      {/* TODO: 민감정보는 AI 요청 전 비식별 처리 필요 */}
      <p className="rounded-lg bg-[#fffdf7] p-4 text-sm font-semibold leading-6 text-[#596344]">
        AI 요약 예정 영역입니다. 실제 서비스에서는 사용자의 기록을 바탕으로 요약하되, 진단이나 치료 판단은 하지
        않습니다.
      </p>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {monthlySymptomSummary.map((item) => (
          <article key={item.id} className="rounded-lg border border-[#dfe8d8] bg-[#fbfaf5] p-5">
            <h3 className="text-xl font-extrabold text-[#173d2d]">{item.mainSymptom}</h3>
            <p className="mt-2 text-sm font-bold text-[#2f6c48]">{item.recordPeriod}</p>
            <InfoLine label="좋아진 점" value={item.improvedPoint} />
            <InfoLine label="계속 관찰할 점" value={item.observationPoint} />
            <InfoLine label="병원 상담이 필요할 수 있는 항목" value={item.consultationPoint} />
          </article>
        ))}
      </div>
    </section>
  );
}

function PhotoTimelineSection() {
  return (
    <section className="mt-10">
      <SectionTitle eyebrow="사진 경과 타임라인 mock" title="날짜별 사진 기록 흐름" />
      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        {monthlyPhotoTimeline.map((item) => (
          <article key={item.id} className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
            <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-[#bcd2b2] bg-[#fffdf7] text-sm font-extrabold text-[#6a776e]">
              사진 placeholder
            </div>
            <p className="mt-4 text-sm font-extrabold text-[#2f6c48]">{item.date}</p>
            <h3 className="mt-1 text-lg font-extrabold text-[#173d2d]">{item.photoType}</h3>
            <p className="mt-2 text-sm leading-6 text-[#526257]">{item.memo}</p>
            <span className="mt-4 inline-flex rounded-full bg-[#f5f0e4] px-3 py-1.5 text-xs font-extrabold text-[#6a5530]">
              {item.privacyLabel}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

function MedicalVisitSection() {
  return (
    <section className="mt-10 rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm sm:p-6">
      <SectionTitle eyebrow="병원 방문 및 처방 기록 요약" title="진료 때 들은 설명과 다음 방문 일정을 정리합니다" />
      <div className="grid gap-4">
        {monthlyMedicalVisits.map((visit) => (
          <article key={visit.id} className="rounded-lg bg-[#fffdf7] p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <InfoLine label="방문일" value={visit.visitDate} />
              <InfoLine label="병원명" value={visit.hospitalName} />
              <InfoLine label="진료과" value={visit.specialty} />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <InfoLine label="의사에게 들은 설명" value={visit.doctorNote} />
              <InfoLine label="받은 치료/시술" value={visit.treatmentSummary} />
              <InfoLine label="다음 방문 예정일" value={visit.nextVisitDate} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MedicineSummarySection() {
  return (
    <section className="mt-10 rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm sm:p-6">
      <SectionTitle eyebrow="복용약/연고 기록 요약" title="이번 달에 입력한 약과 외용제 기록" />
      <div className="grid gap-4 md:grid-cols-3">
        {monthlyMedicineRecords.map((medicine) => (
          <article key={medicine.id} className="rounded-lg border border-[#dfe8d8] bg-[#fbfaf5] p-5">
            <span className="rounded-full bg-[#eef6e9] px-3 py-1.5 text-xs font-extrabold text-[#2f6c48]">{medicine.medicineType}</span>
            <h3 className="mt-4 text-xl font-extrabold text-[#173d2d]">{medicine.medicineName}</h3>
            <InfoLine label="복용 횟수" value={medicine.frequency} />
            <InfoLine label="복용 시간" value={medicine.timing} />
            <InfoLine label="복용 기간" value={medicine.period} />
            <InfoLine label="메모" value={medicine.memo} />
          </article>
        ))}
      </div>
      <p className="mt-5 rounded-lg bg-[#fff7f3] p-4 text-sm font-semibold leading-6 text-[#714533]">
        복용약 정보는 사용자가 입력한 기록입니다. 약 복용 변경은 반드시 의료진 또는 약사와 상담하세요.
      </p>
    </section>
  );
}

function DoctorQuestionSection() {
  return (
    <section className="mt-10 rounded-lg border border-[#d9d1aa] bg-[#fffdf7] p-5 shadow-sm sm:p-6">
      <SectionTitle eyebrow="다음 진료 때 물어볼 질문" title="진료 전 질문 목록 mock" />
      <ol className="grid gap-3">
        {suggestedDoctorQuestions.map((item, index) => (
          <li key={item.id} className="rounded-lg bg-white p-4 text-sm font-bold leading-6 text-[#173d2d]">
            {index + 1}. {item.question}
          </li>
        ))}
      </ol>
    </section>
  );
}

function RelatedArticlesSection({
  articles,
}: {
  articles: { id: string; title: string; slug: string; summary: string; category?: string }[];
}) {
  return (
    <section className="mt-10">
      <SectionTitle eyebrow="관련 건강정보 추천" title="이번 달 기록과 함께 참고할 수 있는 글" />
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        {articles.map((article) => (
          <article key={article.id} className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
            <p className="text-sm font-extrabold text-[#2f6c48]">{article.category ?? "건강정보"}</p>
            <h3 className="mt-3 text-xl font-extrabold leading-7 text-[#173d2d]">{article.title}</h3>
            <p className="mt-3 text-sm leading-6 text-[#526257]">{article.summary}</p>
            <Link
              href={`/health-articles/${article.slug}`}
              className="mt-5 inline-flex rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-extrabold text-[#174330] transition hover:bg-[#eef6e9]"
            >
              자세히 보기
            </Link>
          </article>
        ))}
      </div>
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

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-extrabold text-[#2f6c48]">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-[#526257]">{value}</p>
    </div>
  );
}
