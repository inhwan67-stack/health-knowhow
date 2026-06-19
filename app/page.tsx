import Link from "next/link";
import {
  ExperienceShareSection,
  FinalMedicalNotice,
  HealthBlogSection,
  HospitalSearchSection,
  MonthlyReportSection,
  PrescriptionMedicationSection,
  PwaSection,
  ReferenceResourceSection,
} from "./components/HomePlatformSections";
import SymptomRecordSection from "./components/SymptomRecordSection";

export const dynamic = "force-dynamic";

const heroStats = [
  { label: "기록 영역", value: "증상·사진·약·방문" },
  { label: "공유 원칙", value: "비공개 기본" },
  { label: "정보 성격", value: "참고용 자료" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="relative overflow-hidden border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_54%,#dcebd4_100%)]">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-12 lg:py-16">
          <div className="flex flex-col justify-center">
            <p className="mb-5 w-fit rounded-full border border-[#b7d0ac] bg-white/85 px-4 py-2 text-sm font-extrabold text-[#2f6c48]">
              건강 경험 기록 플랫폼
            </p>
            <h1 className="max-w-5xl text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl lg:text-6xl">
              내 건강 경험을 기록하고, 비슷한 사례와 신뢰할 수 있는 정보를 함께 찾아보세요
            </h1>
            <p className="mt-6 max-w-4xl text-lg leading-8 text-[#355845] sm:text-xl sm:leading-9">
              건강노하우는 증상 기록, 치료 경과, 사용자 경험, 건강정보 블로그, 병원 찾기를 한 곳에서 관리할 수 있는 건강 경험 플랫폼입니다.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Link
                className="rounded-lg border border-[#174330] bg-[#174330] px-5 py-3.5 text-center text-base font-bold text-white shadow-sm transition hover:bg-[#255f42]"
                href="/my-records/new"
              >
                내 증상 기록하기
              </Link>
              <Link
                className="rounded-lg border border-[#bcd2b2] bg-white px-5 py-3.5 text-center text-base font-bold text-[#174330] shadow-sm transition hover:bg-[#eef6e9]"
                href="/health-articles"
              >
                건강정보 보기
              </Link>
              <Link
                className="rounded-lg border border-[#bcd2b2] bg-white px-5 py-3.5 text-center text-base font-bold text-[#174330] shadow-sm transition hover:bg-[#eef6e9]"
                href="/experiences"
              >
                비슷한 사례 찾기
              </Link>
            </div>

            <p className="mt-6 max-w-4xl rounded-lg border border-[#d9d1aa] bg-white/80 p-4 text-sm font-semibold leading-6 text-[#596344]">
              본 서비스는 의료 진단이나 치료를 제공하지 않으며, 사용자의 건강기록과 참고정보 정리를 돕는 서비스입니다.
            </p>
          </div>

          <aside className="rounded-lg border border-[#c7d9bd] bg-white/92 p-6 shadow-[0_20px_70px_rgba(31,75,54,0.12)]">
            <p className="text-sm font-extrabold text-[#2f6c48]">플랫폼 미리보기</p>
            <h2 className="mt-3 text-2xl font-extrabold leading-8 text-[#173d2d]">
              기록은 비공개로 시작하고, 공유는 익명 검토 후 진행합니다
            </h2>
            <div className="mt-6 grid gap-3">
              {heroStats.map((stat) => (
                <div key={stat.label} className="rounded-lg bg-[#f4faf0] p-4">
                  <p className="text-xs font-extrabold text-[#2f6c48]">{stat.label}</p>
                  <p className="mt-1 text-lg font-extrabold text-[#173d2d]">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-lg bg-[#fff7f3] p-4">
              <p className="text-sm font-extrabold text-[#9a3f25]">응급 안내</p>
              <p className="mt-2 text-sm leading-6 text-[#714533]">
                심한 통증, 호흡곤란, 의식 저하, 심한 출혈 등 응급 증상은 기록보다 119 또는 응급실 이용이 우선입니다.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <HealthBlogSection />
      <SymptomRecordSection />
      <PrescriptionMedicationSection />
      <ExperienceShareSection />
      <ReferenceResourceSection />
      <HospitalSearchSection />
      <MonthlyReportSection />
      <PwaSection />
      <FinalMedicalNotice />
    </main>
  );
}
