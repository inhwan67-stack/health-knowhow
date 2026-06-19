import type { Metadata } from "next";
import Link from "next/link";
import { healthArticleCategories, healthBlogArticles, getHealthArticleCategory } from "@/data/healthArticleMockData";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "건강정보 블로그 | Health Knowhow",
  description: "질병, 증상, 식이요법, 운동요법, 병원 진료과 정보를 쉽게 찾아볼 수 있는 건강정보 콘텐츠입니다.",
};

export default function HealthArticlesPage() {
  const topArticles = healthBlogArticles.slice(0, 4);
  const bottomArticles = healthBlogArticles.slice(4);

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <HeroSection />

      <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
        <SearchBox />
        <CategoryFilter />

        <section className="mt-10">
          <div className="mb-6">
            <p className="text-sm font-extrabold text-[#2f6c48]">추천 글</p>
            <h2 className="mt-2 text-3xl font-extrabold text-[#173d2d]">자주 찾는 건강정보 콘텐츠</h2>
          </div>

          <ArticleGrid articles={topArticles} />
          <AdMock className="my-8" />
          <ArticleGrid articles={bottomArticles} />
          <AdMock className="mt-8" />
        </section>

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
        <h1 className="mt-5 text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl">
          건강정보 블로그
        </h1>
        <p className="mt-5 max-w-4xl text-lg leading-8 text-[#355845]">
          질병, 증상, 식이요법, 운동요법, 병원 진료과 정보를 쉽게 찾아볼 수 있는 건강정보 콘텐츠입니다.
        </p>
      </div>
    </section>
  );
}

function SearchBox() {
  return (
    <div className="rounded-lg border border-[#cbdac4] bg-white p-4 shadow-sm sm:p-5">
      <label htmlFor="health-article-search" className="text-sm font-extrabold text-[#173d2d]">
        건강정보 검색 mock
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          id="health-article-search"
          placeholder="예: 당뇨 초기증상, 혈당스파이크, 피부 상처, 고혈압 식단"
          className="min-h-12 flex-1 rounded-lg border border-[#c9d9c2] bg-[#fffdf7] px-4 text-base text-[#173d2d] outline-none transition placeholder:text-[#7a8a7f] focus:border-[#2f6c48] focus:ring-4 focus:ring-[#d9ead2]"
        />
        <button type="button" className="min-h-12 rounded-lg bg-[#174330] px-6 text-base font-bold text-white">
          검색 mock
        </button>
      </div>
    </div>
  );
}

function CategoryFilter() {
  return (
    <div className="mt-8">
      <p className="text-sm font-extrabold text-[#2f6c48]">카테고리</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {healthArticleCategories.map((category) => (
          <button
            key={category.id}
            type="button"
            className="rounded-full border border-[#cbdac4] bg-white px-4 py-2 text-sm font-bold text-[#2f6c48] shadow-sm transition hover:bg-[#eef6e9]"
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function ArticleGrid({ articles }: { articles: typeof healthBlogArticles }) {
  if (articles.length === 0) return null;

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {articles.map((article) => {
        const category = getHealthArticleCategory(article.categoryId);

        return (
          <article key={article.id} className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <span className="rounded-full bg-[#eef6e9] px-3 py-1.5 text-xs font-extrabold text-[#2f6c48]">
              {category?.name ?? "건강정보"}
            </span>
            <h3 className="mt-5 text-xl font-extrabold leading-7 text-[#173d2d]">{article.title}</h3>
            <p className="mt-3 text-sm leading-6 text-[#526257]">{article.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(article.tags ?? []).map((tag) => (
                <span key={tag} className="rounded-full bg-[#f5f0e4] px-2.5 py-1 text-xs font-bold text-[#596344]">
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm font-bold text-[#6a776e]">읽는 시간 {article.readTime ?? "4분"}</p>
            <p className="mt-4 rounded-lg bg-[#fff7f3] p-3 text-xs font-semibold leading-5 text-[#714533]">
              의료정보 고지: 일반 건강정보이며 진단이나 치료를 대체하지 않습니다.
            </p>
            <Link
              href={`/health-articles/${article.slug}`}
              className="mt-5 inline-flex rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-extrabold text-[#174330] transition hover:bg-[#eef6e9]"
            >
              자세히 보기
            </Link>
          </article>
        );
      })}
    </div>
  );
}

function AdMock({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-dashed border-[#b8d7e6] bg-[#fbfeff] p-6 text-center shadow-sm ${className}`}>
      <p className="text-sm font-extrabold text-[#2b6f87]">광고 영역 mock - 추후 Google AdSense 연동 예정</p>
    </div>
  );
}

function RelatedFeatureCta() {
  return (
    <section className="mt-10 rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm sm:p-7">
      <p className="text-sm font-extrabold text-[#2f6c48]">관련 기능</p>
      <h2 className="mt-2 text-2xl font-extrabold text-[#173d2d]">읽은 내용을 내 기록과 연결해보세요</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link href="/my-records/new" className="rounded-lg bg-[#174330] px-5 py-3.5 text-center text-base font-bold text-white">
          내 증상 기록하기
        </Link>
        <Link href="/experiences" className="rounded-lg border border-[#bcd2b2] bg-[#fffdf7] px-5 py-3.5 text-center text-base font-bold text-[#174330]">
          비슷한 경험 사례 보기
        </Link>
        <Link href="/find-hospital" className="rounded-lg border border-[#bcd2b2] bg-[#fffdf7] px-5 py-3.5 text-center text-base font-bold text-[#174330]">
          증상으로 병원 찾기
        </Link>
      </div>
    </section>
  );
}
