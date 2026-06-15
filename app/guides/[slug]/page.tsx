import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ExperienceDisclaimer from "@/app/components/ExperienceDisclaimer";
import MedicalDisclaimer from "@/app/components/MedicalDisclaimer";
import { ArticleCards, VideoCards } from "@/app/components/ResourceCards";
import { getArticles } from "@/data/articles";
import { getApprovedExperiences } from "@/data/experiences";
import { getGuideBySlug, getGuides } from "@/data/guides";
import { getVideos } from "@/data/videos";

type GuideDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getGuides().map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: GuideDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return {
      title: "건강관리 가이드 | Health Knowhow",
      description: "증상과 질병별 생활관리 참고자료입니다.",
    };
  }

  return {
    title: guide.seoTitle,
    description: guide.seoDescription,
  };
}

export default async function GuideDetailPage({ params }: GuideDetailPageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) notFound();

  const videos = getVideos().filter((video) => guide.relatedVideoIds.includes(video.id));
  const articles = getArticles().filter((article) => guide.relatedArticleIds.includes(article.id));
  const experiences = getApprovedExperiences().filter((experience) => guide.relatedExperienceIds.includes(experience.id));

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
          <Link href="/guides" className="text-sm font-bold text-[#2f6c48] hover:text-[#173d2d]">
            건강관리 가이드
          </Link>
          <p className="mt-6 w-fit rounded-full border border-[#b7d0ac] bg-white px-3 py-1.5 text-sm font-bold text-[#2f6c48]">
            {guide.category}
          </p>
          <h1 className="mt-5 max-w-5xl text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl">
            {guide.title}
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-[#355845]">{guide.summary}</p>
          <p className="mt-6 max-w-4xl rounded-lg border border-[#b7d0ac] bg-white/85 p-5 text-base font-semibold leading-7 text-[#526257]">
            {guide.intro}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-12">
        <div className="grid gap-8">
          <GuideSection title="이런 증상일 때 확인해 볼 수 있습니다" items={guide.symptomsToCheck} />
          <GuideSection title="관련 가능성이 있는 건강정보" items={guide.relatedHealthInfo} />
          <GuideSection title="바로 진료가 필요한 주의 신호" items={guide.warningSigns} tone="warning" />
          <GuideSection title="생활관리 참고" items={guide.lifestyleTips} />
          <GuideSection title="식이요법 참고" items={guide.dietTips} />
          <GuideSection title="운동요법 또는 활동 참고" items={guide.exerciseTips} />
          {guide.cautionExerciseTips?.length ? (
            <GuideSection title="주의가 필요한 운동" items={guide.cautionExerciseTips} tone="warning" />
          ) : null}
          <GuideSection title="병원 방문 전 체크리스트" items={guide.hospitalChecklist} />
          <GuideSection title="의사에게 물어볼 질문" items={guide.doctorQuestions} />

          <section>
            <SectionHeader
              eyebrow="관련 영상자료"
              title="함께 참고할 수 있는 영상"
              description="영상자료는 일반 건강정보 참고용이며 의학적 진단, 치료, 처방을 대신하지 않습니다."
            />
            <VideoCards videos={videos} />
          </section>

          <section>
            <SectionHeader
              eyebrow="외부 참고자료"
              title="출처와 요약 중심의 자료"
              description="외부 자료는 원문 링크와 함께 확인할 수 있는 참고자료입니다."
            />
            <ArticleCards articles={articles} />
          </section>

          <section>
            <SectionHeader
              eyebrow="개인 경험담 안내"
              title="비슷한 주제의 사용자 경험"
              description="경험담은 작성자의 주관적 경험이며 의학적 진단이나 치료법이 아닙니다."
            />
            {experiences.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2">
                {experiences.map((experience) => (
                  <Link
                    key={experience.id}
                    href={`/experiences/${experience.slug}`}
                    className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span className="rounded-full bg-[#f5f0e4] px-3 py-1.5 text-xs font-bold text-[#596344]">
                      개인 경험담
                    </span>
                    <p className="mt-5 text-sm font-bold text-[#2f6c48]">
                      {experience.diseaseOrSymptom} · {experience.nickname}
                    </p>
                    <h3 className="mt-2 text-xl font-bold leading-7 text-[#1b4631]">{experience.title}</h3>
                    <p className="mt-3 text-base leading-7 text-[#526257]">{experience.summary}</p>
                    <p className="mt-5 text-sm font-bold text-[#174330]">경험담 읽기</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-[#dde6d7] bg-white p-6 text-base leading-7 text-[#526257] shadow-sm">
                현재 등록된 관련 경험담이 많지 않습니다. 관련 콘텐츠를 계속 보강하고 있습니다.
              </div>
            )}
          </section>
        </div>

        <aside className="self-start rounded-lg border border-[#cfe0c7] bg-white p-6 shadow-sm lg:sticky lg:top-24">
          <p className="text-sm font-extrabold text-[#2f6c48]">가이드 요약</p>
          <h2 className="mt-2 text-xl font-bold leading-7 text-[#173d2d]">{guide.title}</h2>
          <dl className="mt-5 grid gap-3 text-sm leading-6 text-[#526257]">
            <SummaryRow label="분류" value={guide.category} />
            <SummaryRow label="영상자료" value={`${videos.length}개`} />
            <SummaryRow label="외부 자료" value={`${articles.length}개`} />
            <SummaryRow label="경험담" value={`${experiences.length}개`} />
            <SummaryRow label="최근 확인" value={guide.updatedAt} />
          </dl>
          <Link
            href="/records"
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-bold text-[#174330] transition hover:bg-[#eef6e9]"
          >
            증상 기록 정리하기
          </Link>
          <p className="mt-5 rounded-lg bg-[#fffdf7] p-4 text-sm font-semibold leading-6 text-[#526257]">
            이 가이드는 참고자료입니다. 증상이 심하거나 반복되면 의료기관 상담을 권장합니다.
          </p>
        </aside>
      </section>

      <ExperienceDisclaimer />
      <MedicalDisclaimer />
    </main>
  );
}

function GuideSection({ title, items, tone = "default" }: { title: string; items: string[]; tone?: "default" | "warning" }) {
  const markerClass = tone === "warning" ? "bg-[#d96b3b]" : "bg-[#2f6c48]";
  const borderClass = tone === "warning" ? "border-[#efc1ad] bg-[#fff7f3]" : "border-[#dde6d7] bg-white";

  return (
    <section className={`rounded-lg border p-6 shadow-sm ${borderClass}`}>
      <h2 className="text-2xl font-bold text-[#173d2d]">{title}</h2>
      <ul className="mt-5 grid gap-3 text-base leading-7 text-[#526257]">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className={`mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full ${markerClass}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-5">
      <p className="text-sm font-bold text-[#2f6c48]">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold text-[#173d2d]">{title}</h2>
      <p className="mt-3 max-w-4xl text-base leading-7 text-[#526257]">{description}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3">
      <dt className="font-bold text-[#173d2d]">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
