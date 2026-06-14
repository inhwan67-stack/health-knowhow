import Link from "next/link";
import DiseaseCategoryExplorer from "./components/DiseaseCategoryExplorer";
import HomeSearch from "./components/HomeSearch";
import MainDiseaseSearch from "./components/MainDiseaseSearch";
import MedicalDisclaimer from "./components/MedicalDisclaimer";
import { ArticleCards, VideoCards } from "./components/ResourceCards";
import { getArticles } from "@/data/articles";
import { getDiseases } from "@/data/diseases";
import { getApprovedExperiences } from "@/data/experiences";
import { getSymptoms } from "@/data/symptoms";
import { getVideos } from "@/data/videos";

export const dynamic = "force-dynamic";

const platformFeatures = [
  {
    title: "질병별 건강정보",
    description: "증상, 원인, 생활관리, 식이요법, 추천 식재료를 한 화면에서 확인합니다.",
  },
  {
    title: "영상과 외부 자료",
    description: "유튜브 영상과 웹 자료는 제목, 출처, 짧은 요약, 링크 중심으로 정리합니다.",
  },
  {
    title: "경험 공유",
    description: "개인의 관리 경험을 참고하되, 의료 판단과 구분해서 안전하게 살펴봅니다.",
  },
];

const careSummaryCards = [
  {
    title: "증상별 식이요법 참고",
    description: "검색어와 연결된 질병 정보를 기준으로 식재료, 주의 음식, 식사 습관을 함께 확인합니다.",
  },
  {
    title: "증상별 운동요법 참고",
    description: "통증 정도와 개인 상태에 따라 조절이 필요한 생활관리 참고 운동을 정리합니다.",
  },
  {
    title: "관련 영상자료 모아보기",
    description: "의학정보, 식이요법, 운동요법, 생활관리 영상을 구분해 검색 링크 중심으로 제공합니다.",
  },
];

export default function Home() {
  const diseases = getDiseases();
  const videos = getVideos();
  const articles = getArticles();
  const experiences = getApprovedExperiences();
  const symptoms = getSymptoms();
  const featuredVideos = videos.slice(0, 3);
  const featuredArticles = articles.slice(0, 3);
  const recentExperiences = experiences.slice(0, 3);

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="relative overflow-hidden border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_54%,#dcebd4_100%)]">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_400px] lg:px-12 lg:py-16">
          <div className="flex flex-col justify-center">
            <p className="mb-5 w-fit rounded-full border border-[#b7d0ac] bg-white/85 px-4 py-2 text-sm font-bold text-[#2f6c48]">
              질병별 건강정보 검색 플랫폼
            </p>
            <h1 className="max-w-5xl text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl lg:text-6xl">
              증상과 질병명으로 필요한 건강정보를 빠르게 찾으세요
            </h1>
            <p className="mt-6 max-w-4xl text-lg leading-8 text-[#355845] sm:text-xl sm:leading-9">
              Health Knowhow는 질병별 증상, 생활관리, 식이요법, 영상자료, 사용자 경험담을 한곳에서
              탐색할 수 있도록 확장한 건강정보 플랫폼입니다.
            </p>

            <div className="mt-8 max-w-5xl">
              <HomeSearch />
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <Link className="rounded-lg border border-[#174330] bg-[#174330] px-5 py-3.5 text-center text-base font-bold text-white shadow-sm" href="#disease-search">
                질병정보 보기
              </Link>
              <Link className="rounded-lg border border-[#bcd2b2] bg-white px-5 py-3.5 text-center text-base font-bold text-[#174330] shadow-sm" href="#food-resources">
                식이요법 보기
              </Link>
              <Link className="rounded-lg border border-[#bcd2b2] bg-white px-5 py-3.5 text-center text-base font-bold text-[#174330] shadow-sm" href="/submit">
                경험 공유하기
              </Link>
            </div>
          </div>

          <aside className="rounded-lg border border-[#c7d9bd] bg-white/90 p-6 shadow-[0_20px_70px_rgba(31,75,54,0.12)]">
            <p className="text-sm font-bold text-[#2f6c48]">현재 샘플 데이터</p>
            <p className="mt-3 text-5xl font-extrabold text-[#174330]">{diseases.length}개</p>
            <p className="mt-3 text-base leading-7 text-[#526257]">
              당뇨, 고혈압, 위염, 역류성 식도염, 관절염, 불면증 등 자주 찾는 주제를 먼저 구성했습니다.
            </p>
            <div className="mt-7 rounded-lg bg-[#eef6e9] p-5">
              <p className="text-sm font-bold text-[#2f6c48]">최근 개인 경험담</p>
              <h2 className="mt-2 text-xl font-bold leading-7 text-[#174330]">{experiences[0]?.title}</h2>
              <p className="mt-3 text-base leading-7 text-[#526257]">{experiences[0]?.symptomDescription}</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
        <div className="mb-8">
          <p className="text-sm font-bold text-[#2f6c48]">플랫폼 방향</p>
          <h2 className="mt-2 text-3xl font-bold text-[#173d2d] sm:text-4xl">
            단순 정보 목록이 아니라 검색 가능한 건강 경험 허브
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {platformFeatures.map((feature) => (
            <article key={feature.title} className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-bold text-[#1b4631]">{feature.title}</h3>
              <p className="mt-4 text-base leading-8 text-[#526257]">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-14 sm:px-8 lg:px-12">
        <div className="mb-8">
          <p className="text-sm font-bold text-[#2f6c48]">생활관리 자료 확장</p>
          <h2 className="mt-2 text-3xl font-bold text-[#173d2d] sm:text-4xl">
            운동요법과 식이요법까지 함께 확인하세요
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#526257]">
            아래 자료는 진단이나 치료가 아니라 검색어와 등록된 건강정보를 바탕으로 정리한 생활관리 참고자료입니다.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {careSummaryCards.map((card) => (
            <article key={card.title} className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-bold text-[#1b4631]">{card.title}</h3>
              <p className="mt-4 text-base leading-8 text-[#526257]">{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <MainDiseaseSearch diseases={diseases} symptoms={symptoms} />

      <section id="video-resources" className="mx-auto max-w-[1440px] scroll-mt-28 px-5 py-14 sm:px-8 lg:px-12">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[#2f6c48]">추천 영상자료</p>
            <h2 className="mt-2 text-3xl font-bold text-[#173d2d] sm:text-4xl">샘플 영상 카드</h2>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-[#526257]">
              영상자료는 참고용이며 의학적 진단이나 치료를 대신하지 않습니다.
            </p>
          </div>
          <Link href="/videos" className="w-fit rounded-lg border border-[#bcd2b2] bg-white px-4 py-2.5 text-sm font-bold text-[#2f6c48] shadow-sm hover:text-[#174330]">
            영상자료 더 보기
          </Link>
        </div>
        <VideoCards videos={featuredVideos} />
      </section>

      <section id="food-resources" className="mx-auto max-w-[1440px] scroll-mt-28 px-5 py-14 sm:px-8 lg:px-12">
        <div className="mb-6">
          <p className="text-sm font-bold text-[#2f6c48]">식이요법과 참고 웹자료</p>
          <h2 className="mt-2 text-3xl font-bold text-[#173d2d] sm:text-4xl">
            출처와 요약 중심의 외부 자료
          </h2>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-[#526257]">
            외부 글 전체를 복사하지 않고 제목, 출처, 짧은 요약, 링크 중심으로 정리합니다.
          </p>
        </div>
        <ArticleCards articles={featuredArticles} />
      </section>

      <section id="experience-preview" className="mx-auto max-w-[1440px] scroll-mt-28 px-5 py-14 sm:px-8 lg:px-12">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[#2f6c48]">최근 경험담</p>
            <h2 className="mt-2 text-3xl font-bold text-[#173d2d] sm:text-4xl">개인 경험담 3개</h2>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-[#526257]">
              개인 경험담은 의료정보와 구분되는 참고자료이며 진단이나 치료를 대신하지 않습니다.
            </p>
          </div>
          <Link href="/experiences" className="w-fit rounded-lg border border-[#174330] bg-white px-4 py-2.5 text-sm font-bold text-[#174330] shadow-sm hover:bg-[#eef6e9]">
            경험담 더 보기
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {recentExperiences.map((experience) => (
            <article key={experience.id} id={experience.id} className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="rounded-full bg-[#f5f0e4] px-3 py-1.5 text-xs font-bold text-[#596344]">
                개인 경험담
              </span>
              <p className="mt-5 text-sm font-bold text-[#2f6c48]">
                {experience.diseaseOrSymptom} · {experience.nickname}
              </p>
              <h3 className="mt-2 text-xl font-bold leading-7 text-[#1b4631]">{experience.title}</h3>
              <p className="mt-3 text-base leading-7 text-[#526257]">{experience.symptomDescription}</p>
              <Link
                href={`/experiences/${experience.slug}`}
                className="mt-5 inline-flex rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-bold text-[#174330] transition hover:bg-[#eef6e9]"
              >
                경험담 읽기
              </Link>
            </article>
          ))}
        </div>
      </section>

      <DiseaseCategoryExplorer />
      <MedicalDisclaimer />
    </main>
  );
}
