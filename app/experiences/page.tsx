import type { Metadata } from "next";
import Link from "next/link";
import { experienceCategories, sampleExperiences } from "@/data/healthMockData";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "경험 공유 | Health Knowhow",
  description:
    "비슷한 증상을 겪은 사람들의 기록과 생활관리 경험을 참고할 수 있는 개인 경험 공유 mock 페이지입니다.",
};

export default function ExperiencesPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <HeroSection />

      <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
        <MedicalNotice />
        <SearchArea />
        <CategoryFilter />
        <ExperienceCardList />
        <RelatedFeatureCta />
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
        <h1 className="mt-5 text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl">경험 공유</h1>
        <p className="mt-5 max-w-4xl text-lg leading-8 text-[#355845]">
          비슷한 증상을 겪은 사람들의 기록과 생활관리 경험을 참고할 수 있습니다. 모든 사례는 개인 경험이며
          의료 조언이 아닙니다.
        </p>
      </div>
    </section>
  );
}

function MedicalNotice() {
  return (
    <section className="rounded-lg border border-[#d9d1aa] bg-[#fffdf7] p-4 text-sm font-semibold leading-7 text-[#6a5530] shadow-sm sm:p-5">
      이곳의 경험 사례는 개인이 직접 작성한 기록이며, 의료 진단이나 치료를 대체하지 않습니다. 증상이 심하거나
      오래 지속되면 의료진과 상담하세요.
    </section>
  );
}

function SearchArea() {
  return (
    <section className="mt-8 rounded-lg border border-[#cbdac4] bg-white p-4 shadow-sm sm:p-5">
      <label htmlFor="experience-search" className="text-sm font-extrabold text-[#173d2d]">
        경험 사례 검색 mock
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          id="experience-search"
          placeholder="예: 당뇨 상처, 피부 트러블, 혈당관리, 연고 사용 경험"
          className="min-h-12 flex-1 rounded-lg border border-[#c9d9c2] bg-[#fffdf7] px-4 text-base text-[#173d2d] outline-none transition placeholder:text-[#7a8a7f] focus:border-[#2f6c48] focus:ring-4 focus:ring-[#d9ead2]"
        />
        <button type="button" className="min-h-12 rounded-lg bg-[#174330] px-6 text-base font-bold text-white">
          검색 mock
        </button>
      </div>
    </section>
  );
}

function CategoryFilter() {
  return (
    <section className="mt-8">
      <p className="text-sm font-extrabold text-[#2f6c48]">카테고리</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {experienceCategories.map((category) => (
          <button
            key={category}
            type="button"
            className="rounded-full border border-[#cbdac4] bg-white px-4 py-2 text-sm font-bold text-[#2f6c48] shadow-sm transition hover:bg-[#eef6e9]"
          >
            {category}
          </button>
        ))}
      </div>
    </section>
  );
}

function ExperienceCardList() {
  return (
    <section className="mt-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-[#2f6c48]">익명 공개 사례 mock</p>
          <h2 className="mt-2 text-3xl font-extrabold text-[#173d2d]">비슷한 경험 기록을 참고해보세요</h2>
        </div>
        <Link
          href="/experiences/new"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#174330] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#255f42]"
        >
          내 경험 공유하기
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {sampleExperiences.map((experience) => (
          <article
            key={experience.id}
            className="flex min-h-full flex-col rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#eef6e9] px-3 py-1.5 text-xs font-extrabold text-[#2f6c48]">
                개인 경험
              </span>
              <span className="rounded-full bg-[#f5f0e4] px-3 py-1.5 text-xs font-extrabold text-[#6a5530]">
                {experience.category}
              </span>
            </div>

            <h3 className="mt-5 text-xl font-extrabold leading-7 text-[#173d2d]">{experience.title}</h3>
            <p className="mt-3 text-sm font-bold text-[#6a776e]">
              {experience.anonymousAuthor} · {experience.recordPeriod}
            </p>
            <p className="mt-4 flex-1 text-sm leading-6 text-[#526257]">{experience.summary}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {experience.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-[#fffdf7] px-2.5 py-1 text-xs font-bold text-[#596344]">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="mt-5 grid gap-2 text-xs font-bold sm:grid-cols-2">
              <span className="rounded-lg bg-[#eef6e9] px-3 py-2 text-[#2f6c48]">
                공개 상태: {experience.visibility}
              </span>
              <span className="rounded-lg bg-[#fff7f3] px-3 py-2 text-[#714533]">{experience.cautionNote}</span>
            </div>

            <button
              type="button"
              aria-label={`${experience.title} 자세히 보기 mock`}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-extrabold text-[#174330] transition hover:bg-[#eef6e9]"
            >
              자세히 보기 mock
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function RelatedFeatureCta() {
  return (
    <section className="mt-12 rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm sm:p-7">
      <p className="text-sm font-extrabold text-[#2f6c48]">관련 기능</p>
      <h2 className="mt-2 text-2xl font-extrabold text-[#173d2d]">내 기록과 건강정보를 함께 정리해보세요</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link href="/experiences/new" className="rounded-lg bg-[#174330] px-5 py-3.5 text-center text-base font-bold text-white">
          내 경험 공유하기
        </Link>
        <Link
          href="/my-records/new"
          className="rounded-lg border border-[#bcd2b2] bg-[#fffdf7] px-5 py-3.5 text-center text-base font-bold text-[#174330]"
        >
          내 증상 기록하기
        </Link>
        <Link
          href="/health-articles"
          className="rounded-lg border border-[#bcd2b2] bg-[#fffdf7] px-5 py-3.5 text-center text-base font-bold text-[#174330]"
        >
          건강정보 블로그 보기
        </Link>
      </div>
    </section>
  );
}
