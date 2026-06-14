import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AffiliateDisclaimer from "@/app/components/AffiliateDisclaimer";
import MedicalDisclaimer from "@/app/components/MedicalDisclaimer";
import { ArticleCards, VideoCards } from "@/app/components/ResourceCards";
import AffiliateProductCards from "@/app/premium/AffiliateProductCards";
import { getAffiliateProductsByDisease } from "@/data/affiliateProducts";
import { getArticlesByDisease } from "@/data/articles";
import { getClinicsByDisease } from "@/data/clinics";
import { getDetailedDietGuidesByDisease } from "@/data/dietGuides";
import { getDiseaseBySlug } from "@/data/diseases";
import { getExerciseGuidesByDisease } from "@/data/exercises";
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
  const exerciseGuides = getExerciseGuidesByDisease(disease.id);
  const detailedDietGuides = getDetailedDietGuidesByDisease(disease.id);
  const videos = getVideosByDisease(disease.slug);
  const articles = getArticlesByDisease(disease.slug);
  const relatedExperiences = getExperiencesByDisease(disease.slug);
  const clinicGuides = getClinicsByDisease(disease.id);
  const affiliateProducts = getAffiliateProductsByDisease(disease.id);
  const externalMedicalResources = await searchExternalMedicalSources(`${disease.name} ${disease.slug}`);
  const medicalVideos = videos.filter((video) => getVideoGroup(video.category) === "medical");
  const dietVideos = videos.filter((video) => getVideoGroup(video.category) === "diet");
  const exerciseVideos = videos.filter((video) => getVideoGroup(video.category) === "exercise");
  const lifestyleVideos = videos.filter((video) => getVideoGroup(video.category) === "lifestyle");

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
            <p className="mt-3 text-sm leading-6 text-[#526257]">
              아래 정보는 진료과 선택에 도움을 주기 위한 참고 정보이며, 특정 병원이나 의료행위를 추천하는 것이 아닙니다.
            </p>
            {clinicGuides.length > 0 ? (
              <div className="mt-5 grid gap-4">
                {clinicGuides.map((clinic) => (
                  <article key={clinic.id} className="rounded-lg border border-[#dde6d7] bg-[#fffdf7] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#eef6e9] px-3 py-1.5 text-xs font-bold text-[#2f6c48]">
                        {clinic.department}
                      </span>
                      {clinic.isAd ? (
                        <span className="rounded-full bg-[#f5f0e4] px-3 py-1.5 text-xs font-bold text-[#7a6230]">
                          광고
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm font-bold text-[#1b4631]">
                      {clinic.clinicName} · {clinic.region}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#526257]">{clinic.description}</p>
                    {clinic.homepageUrl ? (
                      <a
                        href={clinic.homepageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-bold text-[#174330] transition hover:bg-[#eef6e9]"
                      >
                        병원 홈페이지 보기
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="mt-4 inline-flex cursor-not-allowed rounded-lg border border-[#bcd2b2] bg-[#f4faf0] px-4 py-2.5 text-sm font-bold text-[#6a776e]"
                      >
                        병원 홈페이지 보기 준비 중
                      </button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {disease.department.map((department) => (
                  <span key={department} className="rounded-full bg-[#eef6e9] px-3 py-1.5 text-sm font-bold text-[#2f6c48]">
                    {department}
                  </span>
                ))}
              </div>
            )}
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
          <p className="text-sm font-bold text-[#2f6c48]">운동요법 참고자료</p>
          <h2 className="mt-2 text-3xl font-bold text-[#173d2d]">생활관리 참고 운동</h2>
          <p className="mt-3 max-w-4xl text-base leading-7 text-[#526257]">
            운동요법은 개인의 질환 상태, 체력, 통증 정도에 따라 적합성이 달라질 수 있습니다. 통증이 심하거나 증상이 악화되는 경우 운동을 중단하고 의료기관 상담을 권장합니다.
          </p>
        </div>
        {exerciseGuides.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {exerciseGuides.map((guide) => (
              <article key={guide.id} className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm">
                <p className="text-sm font-bold text-[#2f6c48]">{guide.category} · 강도 {guide.intensity}</p>
                <h3 className="mt-2 text-xl font-bold text-[#1b4631]">{guide.title}</h3>
                <p className="mt-3 text-base leading-7 text-[#526257]">{guide.description}</p>
                <TagList title="참고할 수 있는 운동" items={guide.recommendedExercises} color="green" />
                <TagList title="주의가 필요한 운동" items={guide.cautionExercises} color="red" />
                <p className="mt-4 text-sm font-semibold text-[#526257]">빈도: {guide.frequency} · 시간: {guide.duration}</p>
                <p className="mt-4 rounded-lg bg-[#fffdf7] p-4 text-sm leading-6 text-[#5b6146]">{guide.warning}</p>
                <a href={guide.videoSearchUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-bold text-[#174330] transition hover:bg-[#eef6e9]">
                  관련 운동 영상 보기
                </a>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-[#dde6d7] bg-white p-6 text-base text-[#526257] shadow-sm">
            연결된 운동요법 참고자료가 아직 없습니다.
          </div>
        )}
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-12 sm:px-8 lg:px-12">
        <div className="mb-5">
          <p className="text-sm font-bold text-[#2f6c48]">식이요법 참고자료</p>
          <h2 className="mt-2 text-3xl font-bold text-[#173d2d]">식습관과 식재료 참고</h2>
          <p className="mt-3 max-w-4xl text-base leading-7 text-[#526257]">
            식이요법은 개인의 건강상태, 복용 중인 약, 기저질환에 따라 다르게 적용될 수 있습니다. 특정 음식이나 식단이 치료를 보장하지 않습니다.
          </p>
        </div>
        {detailedDietGuides.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {detailedDietGuides.map((guide) => (
              <article key={guide.id} className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm">
                <p className="text-sm font-bold text-[#2f6c48]">식습관 참고자료</p>
                <h3 className="mt-2 text-xl font-bold text-[#1b4631]">{guide.title}</h3>
                <p className="mt-3 text-base leading-7 text-[#526257]">{guide.description}</p>
                <TagList title="참고할 수 있는 식재료" items={guide.recommendedIngredients} color="green" />
                <TagList title="주의가 필요한 음식" items={guide.cautionIngredients} color="red" />
                <TagList title="식사 습관 팁" items={guide.mealTips} color="green" />
                <TagList title="피하면 좋은 식습관" items={guide.avoidPatterns} color="red" />
                <p className="mt-4 rounded-lg bg-[#fffdf7] p-4 text-sm leading-6 text-[#5b6146]">{guide.warning}</p>
                <a href={guide.videoSearchUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-bold text-[#174330] transition hover:bg-[#eef6e9]">
                  관련 식이요법 영상 보기
                </a>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-[#dde6d7] bg-white p-6 text-base text-[#526257] shadow-sm">
            연결된 식이요법 상세 참고자료가 아직 없습니다.
          </div>
        )}
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-12 sm:px-8 lg:px-12">
        <div className="mb-5">
          <p className="text-sm font-bold text-[#2f6c48]">관련 영상자료</p>
          <h2 className="mt-2 text-3xl font-bold text-[#173d2d]">영상으로 참고하기</h2>
        </div>
        <div className="grid gap-8">
          <VideoGroup title="의학정보 영상" videos={medicalVideos} />
          <VideoGroup title="식이요법 영상" videos={dietVideos} />
          <VideoGroup title="운동요법 영상" videos={exerciseVideos} />
          <VideoGroup title="생활관리 영상" videos={lifestyleVideos} />
        </div>
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
                  href={`/experiences/${experience.slug}`}
                  className="mt-5 inline-flex rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-bold text-[#174330] transition hover:bg-[#eef6e9]"
                >
                  경험담 읽기
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-[#dde6d7] bg-white p-6 text-base leading-7 text-[#526257] shadow-sm">
            아직 등록된 관련 경험담이 없습니다.
          </div>
        )}
        <Link
          href={`/submit?disease=${encodeURIComponent(disease.slug)}`}
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[#174330] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#255f42]"
        >
          이 질병에 대한 경험담 공유하기
        </Link>
      </section>

      {affiliateProducts.length > 0 ? (
        <section className="mx-auto max-w-[1440px] px-5 pb-12 sm:px-8 lg:px-12">
          <div className="mb-5">
            <p className="text-sm font-bold text-[#7a6230]">건강관리 도구 안내</p>
            <h2 className="mt-2 text-3xl font-bold text-[#173d2d]">기록과 상담 준비에 참고할 수 있는 도구</h2>
            <p className="mt-3 max-w-4xl text-base leading-7 text-[#526257]">
              아래 항목은 증상 기록과 생활관리 정리에 참고할 수 있는 도구 예시입니다. 특정 제품 구매나 치료 효과를 보장하지 않습니다.
            </p>
          </div>
          <AffiliateProductCards products={affiliateProducts} />
          <div className="mt-5">
            <AffiliateDisclaimer compact />
          </div>
        </section>
      ) : null}

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

function TagList({ title, items, color }: { title: string; items: string[]; color: "green" | "red" }) {
  const className =
    color === "green"
      ? "rounded-full bg-[#eef6e9] px-3 py-1.5 text-sm font-bold text-[#2f6c48]"
      : "rounded-full bg-[#fff0ea] px-3 py-1.5 text-sm font-bold text-[#9a4d3c]";

  return (
    <div className="mt-5">
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

function VideoGroup({ title, videos }: { title: string; videos: ReturnType<typeof getVideosByDisease> }) {
  if (videos.length === 0) return null;

  return (
    <div>
      <h3 className="mb-4 text-2xl font-bold text-[#1b4631]">{title}</h3>
      <VideoCards videos={videos} />
    </div>
  );
}

function getVideoGroup(category: string): "medical" | "diet" | "exercise" | "lifestyle" {
  const normalized = category.toLowerCase();
  if (normalized === "diet" || category.includes("식이") || category.includes("식습관")) return "diet";
  if (normalized === "exercise" || category.includes("운동")) return "exercise";
  if (normalized === "medical" || category.includes("의학") || category.includes("응급") || category.includes("주의")) return "medical";
  return "lifestyle";
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
