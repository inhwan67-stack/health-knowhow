import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ExperienceDisclaimer from "@/app/components/ExperienceDisclaimer";
import MedicalDisclaimer from "@/app/components/MedicalDisclaimer";
import { getDiseaseBySlug } from "@/data/diseases";
import { getExperienceBySlug } from "@/data/experiences";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const experience = getExperienceBySlug(slug);

  if (!experience) {
    return {
      title: "건강관리 경험담 | Health Knowhow",
      description: "개인 건강관리 경험담을 참고자료로 확인하세요.",
    };
  }

  return {
    title: `${experience.title} | 건강관리 경험담`,
    description: `${experience.diseaseName || experience.symptom}에 대한 개인 건강관리 경험담입니다. 의학적 진단이나 치료법이 아닌 참고자료로 확인하세요.`,
  };
}

export default async function ExperienceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const experience = getExperienceBySlug(slug);

  if (!experience) notFound();

  const disease = experience.diseaseSlug ? getDiseaseBySlug(experience.diseaseSlug) : undefined;

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
          <Link href="/experiences" className="text-sm font-bold text-[#2f6c48] hover:text-[#173d2d]">
            경험담 목록으로 돌아가기
          </Link>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#f5f0e4] px-3 py-1.5 text-xs font-bold text-[#596344]">개인 경험담</span>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#2f6c48]">{experience.category}</span>
          </div>
          <h1 className="mt-5 max-w-5xl text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl">
            {experience.title}
          </h1>
          <p className="mt-4 max-w-4xl text-lg leading-8 text-[#355845]">
            이 글은 개인 경험담입니다. 의학적 진단, 치료, 처방을 대신하지 않으며, 모든 사람에게 동일하게 적용되지 않을 수 있습니다.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-6 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-12">
        <article className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm sm:p-7">
          <p className="text-sm font-bold text-[#2f6c48]">
            {experience.diseaseName || experience.symptom} · {experience.nickname} · {formatDate(experience.createdAt)}
          </p>
          <h2 className="mt-5 text-2xl font-bold text-[#1b4631]">경험 요약</h2>
          <p className="mt-3 text-base leading-8 text-[#526257]">{experience.summary}</p>

          <InfoBlock title="증상 설명" content={experience.content || experience.symptomDescription} />
          <InfoBlock title="병원 진료 여부" content={experience.hospitalVisited} />
          <InfoBlock title="도움이 되었던 음식" content={experience.helpfulFoods || "미입력"} />
          <InfoBlock title="주의했던 음식" content={experience.cautionFoods || "미입력"} />
          <InfoBlock title="도움이 되었던 운동 또는 활동" content={experience.helpfulExercises || "미입력"} />
          <InfoBlock title="도움이 되었던 생활습관" content={experience.helpfulHabits || "미입력"} />
          <InfoBlock title="주의할 점" content={experience.caution || "개인에 따라 다를 수 있습니다."} />
          {experience.helpfulVideos ? (
            <a
              href={experience.helpfulVideos}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-bold text-[#174330] transition hover:bg-[#eef6e9]"
            >
              참고했던 영상 또는 자료 링크
            </a>
          ) : null}
        </article>

        <aside className="grid gap-5 self-start">
          <div className="rounded-lg border border-[#d9d1aa] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm font-extrabold text-[#7a6230]">경험담 주의 안내</p>
            <p className="mt-3 text-sm leading-7 text-[#5b6146]">
              이 글은 개인 경험담입니다. 의학적 진단, 치료, 처방을 대신하지 않으며, 모든 사람에게 동일하게 적용되지 않을 수 있습니다.
            </p>
          </div>
          {disease ? (
            <Link
              href={`/diseases/${disease.slug}`}
              className="min-h-11 rounded-lg border border-[#174330] bg-white px-4 py-3 text-center text-sm font-bold text-[#174330] transition hover:bg-[#eef6e9]"
            >
              관련 질병 상세 페이지
            </Link>
          ) : null}
          <Link
            href={`/search?q=${encodeURIComponent(experience.symptom || experience.diseaseName)}`}
            className="min-h-11 rounded-lg bg-[#174330] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-[#255f42]"
          >
            관련 검색 결과 보기
          </Link>
        </aside>
      </section>

      <ExperienceDisclaimer />
      <MedicalDisclaimer />
    </main>
  );
}

function InfoBlock({ title, content }: { title: string; content: string }) {
  return (
    <section className="mt-6 rounded-lg bg-[#fffdf7] p-5">
      <h3 className="text-lg font-bold text-[#1b4631]">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-base leading-8 text-[#526257]">{content}</p>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(value));
}
