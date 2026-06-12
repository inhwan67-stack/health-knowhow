import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MedicalDisclaimer from "@/app/components/MedicalDisclaimer";
import { ArticleCards, VideoCards } from "@/app/components/ResourceCards";
import { getArticlesByDisease } from "@/data/articles";
import { getDiseaseBySlug } from "@/data/diseases";
import { getExperiencesByDisease } from "@/data/experiences";
import { getFoodGuideByDisease } from "@/data/foods";
import { getVideosByDisease } from "@/data/videos";
import { searchExternalMedicalSources, type ExternalMedicalResource } from "@/services/medicalSources";

export const dynamic = "force-dynamic";

const recordChecklist = [
  "증상이 언제 시작되었는지",
  "증상이 얼마나 자주 나타나는지",
  "통증 또는 불편감 정도",
  "증상을 악화시키는 음식이나 상황",
  "복용 중인 약",
  "과거 병력",
  "가족력",
  "최근 체중 변화",
  "수면 상태",
  "스트레스 정도",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const disease = getDiseaseBySlug(slug);

  if (!disease) {
    return {
      title: "질병 정보 | Health Knowhow",
      description: "건강정보와 병원 방문 전 체크리스트를 확인하세요.",
    };
  }

  return {
    title: `${disease.name} 증상, 식이요법, 생활관리 정보 | Health Knowhow`,
    description: `${disease.name}와 관련된 주요 증상, 생활관리, 식이요법, 병원 방문 전 체크리스트와 참고자료를 확인하세요.`,
  };
}

export default async function DiseaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const disease = getDiseaseBySlug(slug);

  if (!disease) notFound();

  const foodGuide = getFoodGuideByDisease(disease.slug);
  const videos = getVideosByDisease(disease.slug);
  const articles = getArticlesByDisease(disease.slug);
  const relatedExperiences = getExperiencesByDisease(disease.slug);
  const externalMedicalResources = await searchExternalMedicalSources(`${disease.name} ${disease.slug}`);

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
          <Link href="/#disease-search" className="text-sm font-bold text-[#2f6c48] hover:text-[#173d2d]">
            질병 카드로 돌아가기
          </Link>
          <p className="mt-5 w-fit rounded-full border border-[#b7d0ac] bg-white px-3 py-1.5 text-sm font-bold text-[#2f6c48]">
            {disease.category}
          </p>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl lg:text-6xl">
            {disease.name}
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-[#355845] sm:text-xl">{disease.description}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/records?disease=${encodeURIComponent(disease.slug)}`}
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#174330] px-5 py-3 text-base font-bold text-white shadow-sm transition hover:bg-[#255f42]"
            >
              내 증상 기록하기
            </Link>
            <Link
              href="#visit-checklist"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#bcd2b2] bg-white px-5 py-3 text-base font-bold text-[#174330] shadow-sm transition hover:bg-[#eef6e9]"
            >
              병원 방문 전 체크리스트
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-6 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_420px] lg:px-12">
        <div className="grid gap-6">
          <InfoCard title="질병 요약 설명" items={[disease.summary]} />
          <InfoCard title="관련 증상" items={disease.relatedSymptoms} />
          <InfoCard title="주요 증상" items={disease.symptoms} />
          <InfoCard title="원인" items={disease.causes} />
          <InfoCard title="생활관리 방법" items={disease.lifestyle} />
          <InfoCard title="도움이 될 수 있는 식이요법" items={disease.diet} />
        </div>

        <aside className="grid gap-6 self-start">
          <div className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#1b4631]">추천 식재료</h2>
            {foodGuide ? (
              <div className="mt-5 grid gap-5">
                <FoodList title="도움이 될 수 있음" items={foodGuide.helpful} color="green" />
                <FoodList title="피해야 하거나 주의가 필요함" items={foodGuide.avoid} color="red" />
                <p className="rounded-lg bg-[#f5f0e4] p-4 text-sm leading-6 text-[#5b6146]">{foodGuide.note}</p>
              </div>
            ) : (
              <p className="mt-3 text-base text-[#526257]">등록된 식이요법 샘플이 없습니다.</p>
            )}
          </div>

          <div className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#1b4631]">진료과 안내</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {disease.department.map((department) => (
                <span key={department} className="rounded-full bg-[#eef6e9] px-3 py-1.5 text-sm font-bold text-[#2f6c48]">
                  {department}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section id="visit-checklist" className="mx-auto max-w-[1440px] scroll-mt-28 px-5 pb-12 sm:px-8 lg:px-12">
        <div className="rounded-lg border border-[#cfe0c7] bg-white p-6 shadow-sm sm:p-7">
          <p className="text-sm font-bold text-[#2f6c48]">병원 상담 전 정리 도구</p>
          <h2 className="mt-2 text-3xl font-bold text-[#173d2d]">병원 방문 전 체크리스트</h2>
          <p className="mt-3 max-w-4xl text-base leading-7 text-[#526257]">
            아래 내용은 병원 방문 전 증상과 생활습관을 정리하기 위한 참고용 체크리스트입니다. 진단이나 치료를 대신하지 않습니다.
          </p>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <ChecklistCard title="병원에 가야 할 수 있는 경우" items={disease.warningSigns} />
            <ChecklistCard title="진료과 안내" items={disease.department} />
            <ChecklistCard title="병원 방문 전 기록하면 좋은 내용" items={recordChecklist} />
            <ChecklistCard title="의사에게 물어볼 질문" items={disease.doctorQuestions} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-12 sm:px-8 lg:px-12">
        <div className="mb-5">
          <p className="text-sm font-bold text-[#2f6c48]">관련 영상자료</p>
          <h2 className="mt-2 text-3xl font-bold text-[#173d2d]">영상으로 참고하기</h2>
        </div>
        <VideoCards videos={videos} />
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-12 sm:px-8 lg:px-12">
        <div className="mb-5">
          <p className="text-sm font-bold text-[#2f6c48]">외부 의학 참고자료</p>
          <h2 className="mt-2 text-3xl font-bold text-[#173d2d]">전문자료로 확인하기</h2>
          <p className="mt-3 max-w-4xl text-base leading-7 text-[#526257]">
            외부 의학 참고자료는 사용자의 이해를 돕기 위한 링크와 요약 정보입니다. 원문 내용을 반드시 확인하시기 바랍니다.
          </p>
        </div>
        <ExternalMedicalCards resources={externalMedicalResources} />
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-12 sm:px-8 lg:px-12">
        <div className="mb-5">
          <p className="text-sm font-bold text-[#2f6c48]">참고 웹자료</p>
          <h2 className="mt-2 text-3xl font-bold text-[#173d2d]">외부 자료 확인하기</h2>
        </div>
        <ArticleCards articles={articles} />
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-12 sm:px-8 lg:px-12">
        <div className="mb-5">
          <p className="text-sm font-bold text-[#2f6c48]">관련 개인 경험담</p>
          <h2 className="mt-2 text-3xl font-bold text-[#173d2d]">개인 경험으로 참고하기</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#526257]">
            개인 경험담은 작성자의 주관적 경험이며, 의학적 진단이나 치료법이 아닙니다.
          </p>
        </div>
        {relatedExperiences.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {relatedExperiences.map((experience) => (
              <article key={experience.id} className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm">
                <span className="rounded-full bg-[#f5f0e4] px-3 py-1.5 text-xs font-bold text-[#596344]">
                  개인 경험담
                </span>
                <p className="mt-5 text-sm font-bold text-[#2f6c48]">
                  {experience.diseaseOrSymptom} · {experience.nickname}
                </p>
                <h3 className="mt-2 text-xl font-bold leading-7 text-[#1b4631]">{experience.title}</h3>
                <p className="mt-3 text-base leading-7 text-[#526257]">{experience.symptomDescription}</p>
                <div className="mt-4 rounded-lg bg-[#fffdf7] p-4 text-sm leading-6 text-[#526257]">
                  <p>
                    <strong className="text-[#1b4631]">생활습관:</strong> {experience.helpfulLifestyle}
                  </p>
                  <p className="mt-2">
                    <strong className="text-[#1b4631]">음식:</strong> {experience.helpfulFoods}
                  </p>
                  <p className="mt-2">
                    <strong className="text-[#1b4631]">주의:</strong> {experience.caution}
                  </p>
                </div>
                <Link
                  href={`/remedies#${experience.id}`}
                  className="mt-5 inline-flex rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-bold text-[#174330] transition hover:bg-[#eef6e9]"
                >
                  경험담 읽기
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-[#dde6d7] bg-white p-6 text-base leading-7 text-[#526257] shadow-sm">
            아직 연결된 경험담 샘플이 없습니다. 경험을 공유하려면 정보 등록 페이지를 이용해 주세요.
          </div>
        )}
      </section>

      <MedicalDisclaimer />
    </main>
  );
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-[#1b4631]">{title}</h2>
      <ul className="mt-5 grid gap-3 text-base leading-7 text-[#526257]">
        {items.map((item) => (
          <li key={item} className="rounded-lg bg-[#fffdf7] px-4 py-3">
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}

function FoodList({ title, items, color }: { title: string; items: string[]; color: "green" | "red" }) {
  const className =
    color === "green"
      ? "rounded-full bg-[#eef6e9] px-3 py-1.5 text-sm font-bold text-[#2f6c48]"
      : "rounded-full bg-[#fff0ea] px-3 py-1.5 text-sm font-bold text-[#9a4d3c]";

  return (
    <div>
      <p className="text-sm font-bold text-[#526257]">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className={className}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChecklistCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-lg border border-[#dde6d7] bg-[#fffdf7] p-5">
      <h3 className="text-xl font-bold text-[#1b4631]">{title}</h3>
      <ul className="mt-4 grid gap-2 text-base leading-7 text-[#526257]">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#2f6c48]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function ExternalMedicalCards({ resources }: { resources: ExternalMedicalResource[] }) {
  if (resources.length === 0) {
    return (
      <div className="rounded-lg border border-[#dde6d7] bg-white p-6 text-base text-[#526257] shadow-sm">
        현재 연결된 외부 의학 참고자료가 없습니다.
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {resources.map((resource) => (
        <article key={resource.id} className="rounded-lg border border-[#b8d7e6] bg-[#fbfeff] p-6 shadow-sm">
          <span className="rounded-full border border-[#9cc7d8] bg-white px-3 py-1.5 text-xs font-extrabold text-[#2b6f87]">
            외부 의학 참고자료
          </span>
          <p className="mt-5 text-sm font-bold text-[#2b6f87]">
            {resource.source} · {resource.type}
          </p>
          <h3 className="mt-2 text-xl font-bold leading-7 text-[#173d2d]">{resource.title}</h3>
          <p className="mt-3 text-base leading-7 text-[#526257]">{resource.summary}</p>
          <p className="mt-4 text-sm font-semibold text-[#526257]">마지막 확인일: {resource.updatedAt}</p>
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex rounded-lg border border-[#2b6f87] px-4 py-2.5 text-sm font-bold text-[#2b6f87] transition hover:bg-[#edf8fb]"
          >
            원문 링크
          </a>
        </article>
      ))}
    </div>
  );
}
