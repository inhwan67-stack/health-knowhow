import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getHealthArticleBySlug, getHealthArticleCategory, healthBlogArticles } from "@/data/healthArticleMockData";
import type { RelatedCase, RelatedSpecialty } from "@/data/healthMockData";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getHealthArticleBySlug(slug);

  if (!article) {
    return {
      title: "건강정보 글 | Health Knowhow",
    };
  }

  return {
    title: `${article.seoTitle} | Health Knowhow`,
    description: article.seoDescription,
  };
}

export default async function HealthArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getHealthArticleBySlug(slug);

  if (!article) notFound();

  const category = getHealthArticleCategory(article.categoryId);
  const sections = article.sections ?? fallbackSections(article.title);
  const tableOfContents = article.tableOfContents ?? sections.map((section) => section.heading);
  const relatedArticles = healthBlogArticles.filter((item) => item.id !== article.id).slice(0, 3);

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <article>
        <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
          <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
            <Link href="/health-articles" className="text-sm font-bold text-[#2f6c48] hover:text-[#173d2d]">
              건강정보 블로그
            </Link>
            <p className="mt-6 w-fit rounded-full border border-[#b7d0ac] bg-white px-3 py-1.5 text-sm font-extrabold text-[#2f6c48]">
              {category?.name ?? "건강정보"}
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl">
              {article.title}
            </h1>
            <p className="mt-5 max-w-4xl text-lg leading-8 text-[#355845]">{article.summary}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold text-[#526257]">
              <span>{article.publishedAt ?? "2026-06-01"}</span>
              <span>·</span>
              <span>읽는 시간 {article.readTime ?? "4분"}</span>
            </div>
            <p className="mt-6 rounded-lg border border-[#efb8a5] bg-[#fff7f3] p-4 text-sm font-semibold leading-6 text-[#714533]">
              이 글은 일반 건강정보이며 의료 진단이나 치료를 대체하지 않습니다. 증상이 심하거나 오래 지속되거나 당뇨 등 기저질환이 있는 경우 의료진과 상담하세요.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1120px] gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[260px_1fr] lg:px-12">
          <aside className="self-start rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <p className="text-sm font-extrabold text-[#2f6c48]">목차</p>
            <ol className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-[#526257]">
              {tableOfContents.map((item) => (
                <li key={item}>
                  <a href={`#${toAnchor(item)}`} className="hover:text-[#174330]">
                    {item}
                  </a>
                </li>
              ))}
            </ol>
          </aside>

          <div className="min-w-0">
            <section className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm sm:p-8">
              <p className="text-lg leading-8 text-[#405347]">
                당뇨가 있거나 혈당 관리를 하고 있다면 피부 상처의 변화를 조금 더 꼼꼼히 살펴보는 것이 도움이 될 수 있습니다.
                다만 증상만으로 상태를 판단하기는 어렵기 때문에, 이 글은 진단이 아니라 기록과 상담 준비를 돕는 참고자료입니다.
              </p>
            </section>

            <AdMock className="my-8" />

            <div className="grid gap-8">
              {sections.map((section, index) => (
                <section key={section.heading} id={toAnchor(section.heading)} className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm sm:p-8">
                  <p className="text-sm font-extrabold text-[#2f6c48]">0{index + 1}</p>
                  <h2 className="mt-2 text-2xl font-extrabold leading-8 text-[#173d2d]">{section.heading}</h2>
                  <div className="mt-5 grid gap-4 text-base leading-8 text-[#405347]">
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <section className="mt-8 rounded-lg border border-[#cfe0c7] bg-[#f4faf0] p-6 shadow-sm sm:p-8">
              <p className="text-sm font-extrabold text-[#2f6c48]">정리</p>
              <p className="mt-3 text-base leading-8 text-[#405347]">
                당뇨와 상처 관리는 개인 상태에 따라 다르게 접근해야 합니다. 상처의 위치, 기간, 통증, 붓기, 진물 여부를 기록하고
                증상이 심하거나 오래 지속되면 의료진과 상담하는 것이 좋습니다.
              </p>
            </section>

            <section className="mt-8 rounded-lg border border-[#efb8a5] bg-[#fff7f3] p-6 shadow-sm sm:p-8">
              <p className="text-sm font-extrabold text-[#9a3f25]">병원 진료가 필요한 경우</p>
              <ul className="mt-4 grid gap-2 text-sm font-semibold leading-6 text-[#714533]">
                {["상처가 커지거나 붉은기가 퍼지는 경우", "진물, 고름처럼 보이는 분비물, 열감이 있는 경우", "통증이 심하거나 감각 변화가 있는 경우", "당뇨 등 기저질환이 있고 상처가 오래 지속되는 경우"].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#9a3f25]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-8 rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-extrabold text-[#2f6c48]">참고자료</p>
              <div className="mt-5 grid gap-4">
                {(article.sources ?? []).map((source) => (
                  <a key={source.id} href={source.sourceUrl} className="rounded-lg border border-[#dde6d7] bg-[#fffdf7] p-4 transition hover:bg-[#f4faf0]">
                    <p className="text-sm font-extrabold text-[#173d2d]">{source.sourceTitle}</p>
                    <p className="mt-2 text-sm leading-6 text-[#526257]">{source.summary}</p>
                  </a>
                ))}
              </div>
            </section>

            <RelatedCaseSection cases={article.relatedCases ?? []} />
            <RelatedSpecialtySection specialties={article.relatedSpecialties ?? []} />

            <AdMock className="mt-8" />

            <section className="mt-8 rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-extrabold text-[#2f6c48]">관련 글</p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {relatedArticles.map((item) => (
                  <Link key={item.id} href={`/health-articles/${item.slug}`} className="rounded-lg border border-[#dde6d7] bg-[#fffdf7] p-4 transition hover:bg-[#f4faf0]">
                    <p className="text-sm font-extrabold text-[#173d2d]">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#526257]">{item.summary}</p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="mt-8 rounded-lg border border-[#efb8a5] bg-[#fff7f3] p-6 shadow-sm sm:p-8">
              <p className="text-sm font-extrabold text-[#9a3f25]">의료 고지</p>
              <p className="mt-3 text-base font-semibold leading-8 text-[#714533]">
                이 글은 일반 건강정보이며 의료 진단이나 치료를 대체하지 않습니다. 증상이 심하거나 오래 지속되거나 당뇨 등 기저질환이 있는 경우 의료진과 상담하세요.
              </p>
            </section>
          </div>
        </section>
      </article>
    </main>
  );
}

function RelatedCaseSection({ cases }: { cases: RelatedCase[] }) {
  return (
    <section className="mt-8 rounded-lg border border-[#d9d1aa] bg-[#fffdf7] p-6 shadow-sm sm:p-8">
      <p className="text-sm font-extrabold text-[#7a6230]">비슷한 경험 기록</p>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#596344]">
        사용자 사례는 개인 경험이며 의료 조언이 아닙니다.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {cases.map((item) => (
          <article key={item.id} className="rounded-lg border border-[#e3dcc0] bg-white p-4">
            <h3 className="text-base font-extrabold text-[#173d2d]">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#526257]">{item.summary}</p>
            <p className="mt-3 text-xs font-bold leading-5 text-[#7a6230]">{item.privacyNote}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function RelatedSpecialtySection({ specialties }: { specialties: RelatedSpecialty[] }) {
  return (
    <section className="mt-8 rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-extrabold text-[#2f6c48]">관련 진료과 안내 mock</p>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#526257]">
        입력한 증상과 상황에 따라 적절한 진료과는 달라질 수 있습니다. 이 정보는 참고용입니다.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {specialties.map((item) => (
          <article key={item.id} className="rounded-lg bg-[#f4faf0] p-4">
            <h3 className="text-lg font-extrabold text-[#173d2d]">{item.name}</h3>
            <p className="mt-2 text-sm leading-6 text-[#526257]">{item.description}</p>
          </article>
        ))}
      </div>
      <Link
        href="/find-hospital"
        className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-bold text-[#174330] transition hover:bg-[#eef6e9]"
      >
        증상으로 병원 찾기
      </Link>
    </section>
  );
}

function AdMock({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-dashed border-[#b8d7e6] bg-[#fbfeff] p-6 text-center shadow-sm ${className}`}>
      <p className="text-sm font-extrabold text-[#2b6f87]">광고 영역 mock - 추후 Google AdSense 연동 예정</p>
    </div>
  );
}

function fallbackSections(title: string) {
  return [
    {
      heading: "도입문",
      body: [`${title}에 대해 자주 궁금해하는 내용을 일반 건강정보로 정리합니다. 이 글은 진단이나 치료를 대체하지 않습니다.`],
    },
    {
      heading: "확인하면 좋은 기록",
      body: ["증상 시작일, 부위, 통증 정도, 복용약, 병원 방문 여부를 함께 남기면 상담 준비에 도움이 될 수 있습니다."],
    },
    {
      heading: "의료기관 상담이 필요한 경우",
      body: ["증상이 심하거나 오래 지속되거나 기저질환이 있다면 의료진과 상담하세요."],
    },
  ];
}

function toAnchor(value: string) {
  return value.replace(/\s+/g, "-").replace(/[^\w가-힣-]/g, "").toLowerCase();
}
