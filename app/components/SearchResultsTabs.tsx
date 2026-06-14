"use client";

import { useMemo } from "react";
import Link from "next/link";
import AffiliateProductCards from "@/app/premium/AffiliateProductCards";
import type { AffiliateProduct } from "@/data/affiliateProducts";
import type { DietGuide, Disease, ExerciseGuide, Experience, FoodGuide, Symptom, VideoResource } from "@/data/types";
import type { ExternalMedicalResource } from "@/services/medicalSources";

export default function SearchResultsTabs({
  query,
  diseases,
  foodGuides,
  detailedDietGuides,
  exerciseGuides,
  videos,
  experiences,
  symptoms,
  affiliateProducts,
  externalResources,
}: {
  query: string;
  diseases: Disease[];
  foodGuides: FoodGuide[];
  detailedDietGuides: DietGuide[];
  exerciseGuides: ExerciseGuide[];
  videos: VideoResource[];
  experiences: Experience[];
  symptoms: Symptom[];
  affiliateProducts: AffiliateProduct[];
  externalResources: ExternalMedicalResource[];
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const matchedSymptoms = useMemo(
    () =>
      symptoms.filter((symptom) =>
        [symptom.name, symptom.description, ...symptom.searchAliases].join(" ").toLowerCase().includes(normalizedQuery),
      ),
    [normalizedQuery, symptoms],
  );
  const showEmergencyNotice = matchedSymptoms.some((symptom) => symptom.emergencyLevel === "emergency");

  const results = useMemo(() => {
    const symptomDiseaseIds = new Set(matchedSymptoms.flatMap((symptom) => symptom.relatedDiseaseIds));
    const diseaseMatches = diseases.filter((disease) =>
      [
        disease.name,
        disease.category,
        disease.summary,
        disease.description,
        ...disease.relatedSymptoms,
        ...disease.symptoms,
        ...disease.searchKeywords,
        ...disease.keywords,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery) ||
        symptomDiseaseIds.has(disease.id) ||
        symptomDiseaseIds.has(disease.slug),
    );
    const matchedSlugs = new Set(diseaseMatches.map((disease) => disease.slug));
    const matchesGuide = (guide: { diseaseId: string; symptomKeywords: string[] }) =>
      matchedSlugs.has(guide.diseaseId) ||
      [guide.diseaseId, ...guide.symptomKeywords].join(" ").toLowerCase().includes(normalizedQuery);

    const foodMatches = foodGuides.filter((guide) => {
      const disease = diseases.find((item) => item.slug === guide.diseaseSlug);
      return (
        matchedSlugs.has(guide.diseaseSlug) ||
        [disease?.name, guide.note, ...guide.helpful, ...guide.avoid].join(" ").toLowerCase().includes(normalizedQuery)
      );
    });

    const videoMatches = videos.filter((video) => {
      const disease = diseases.find((item) => item.slug === video.diseaseSlug);
      return (
        matchedSlugs.has(video.diseaseSlug) ||
        [disease?.name, video.title, video.channel, video.summary, video.category].join(" ").toLowerCase().includes(normalizedQuery)
      );
    });

    const exerciseMatches = exerciseGuides.filter(matchesGuide);
    const detailedDietMatches = detailedDietGuides.filter(matchesGuide);
    const dietVideoMatches = videoMatches.filter((video) => isVideoCategory(video.category, "diet"));
    const exerciseVideoMatches = videoMatches.filter((video) => isVideoCategory(video.category, "exercise"));

    const experienceMatches = experiences.filter((experience) =>
      [
        experience.diseaseName,
        experience.symptom,
        experience.title,
        experience.summary,
        experience.content,
        experience.category,
        experience.helpfulFoods,
        experience.helpfulExercises,
        experience.helpfulHabits,
        ...experience.relatedTags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );

    return {
      diseaseMatches,
      foodMatches,
      videoMatches,
      experienceMatches,
      exerciseMatches,
      detailedDietMatches,
      dietVideoMatches,
      exerciseVideoMatches,
    };
  }, [detailedDietGuides, diseases, exerciseGuides, experiences, foodGuides, matchedSymptoms, normalizedQuery, videos]);

  if (!normalizedQuery) {
    return (
      <div className="rounded-lg border border-[#dde6d7] bg-white p-6 text-[#526257]">
        검색어를 입력하면 내부 건강정보와 외부 의학 참고자료를 함께 확인할 수 있습니다.
      </div>
    );
  }

  const internalCount = results.diseaseMatches.length + results.videoMatches.length;

  return (
    <div className="grid gap-8">
      {showEmergencyNotice && (
        <section className="rounded-lg border border-[#efb8a5] bg-[#fff7f3] p-6 shadow-sm">
          <p className="text-lg font-extrabold text-[#9a3f25]">응급 증상 안내</p>
          <p className="mt-2 text-base leading-7 text-[#714533]">
            해당 증상은 응급 상황일 수 있습니다. 즉시 119 또는 가까운 응급실에 연락하시기 바랍니다. 이 사이트의 정보는 응급 진료를 대신할 수 없습니다.
          </p>
        </section>
      )}

      <section>
        <SectionHeader
          eyebrow="내부 건강정보"
          title={`${query}에 대한 내부 자료`}
          description="사이트에 등록된 CSV 데이터에서 관련 질병과 영상자료를 먼저 검색했습니다."
        />
        {internalCount > 0 ? (
          <div className="grid gap-5">
            {results.diseaseMatches.length > 0 && (
              <CardGrid>
                {results.diseaseMatches.map((disease) => (
                  <Link key={disease.slug} href={`/diseases/${disease.slug}`} className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
                    <p className="text-sm font-bold text-[#2f6c48]">{disease.category}</p>
                    <h3 className="mt-2 text-xl font-bold text-[#1b4631]">{disease.name}</h3>
                    <p className="mt-3 text-base leading-7 text-[#526257]">{disease.summary}</p>
                    <p className="mt-4 text-sm font-bold text-[#174330]">상세 정보 보기</p>
                  </Link>
                ))}
              </CardGrid>
            )}

            {results.videoMatches.length > 0 && (
              <CardGrid>
                {results.videoMatches.map((video) => (
                  <article key={video.id} className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
                    <p className="text-sm font-bold text-[#2f6c48]">{video.channel}</p>
                    <h3 className="mt-2 text-xl font-bold text-[#1b4631]">{video.title}</h3>
                    <p className="mt-3 text-base leading-7 text-[#526257]">{video.summary}</p>
                    <a href={video.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-lg border border-[#174330] px-4 py-2 text-sm font-bold text-[#174330]">
                      관련 영상 보기
                    </a>
                  </article>
                ))}
              </CardGrid>
            )}
          </div>
        ) : (
          <EmptyState text="관련 정보를 찾지 못했습니다. 다른 증상명이나 질병명을 입력해 주세요. 증상이 심하거나 지속되는 경우 의료기관 상담을 권장합니다." />
        )}
      </section>

      <section>
        <SectionHeader
          eyebrow="운동요법 참고자료"
          title="생활관리 참고 운동"
          description="운동요법은 개인의 질환 상태, 체력, 통증 정도에 따라 적합성이 달라질 수 있습니다. 통증이 심하거나 증상이 악화되는 경우 운동을 중단하고 의료기관 상담을 권장합니다."
        />
        {results.exerciseMatches.length > 0 ? (
          <CardGrid>
            {results.exerciseMatches.map((guide) => (
              <ExerciseGuideCard key={guide.id} guide={guide} />
            ))}
          </CardGrid>
        ) : (
          <EmptyState text="검색어와 연결된 운동요법 참고자료가 없습니다." />
        )}
      </section>

      <section>
        <SectionHeader
          eyebrow="식이요법 상세 참고자료"
          title="식습관과 식재료 참고"
          description="식이요법은 개인의 건강상태, 복용 중인 약, 기저질환에 따라 다르게 적용될 수 있습니다. 특정 음식이나 식단이 치료를 보장하지 않습니다."
        />
        {results.detailedDietMatches.length > 0 ? (
          <CardGrid>
            {results.detailedDietMatches.map((guide) => (
              <DietGuideCard key={guide.id} guide={guide} />
            ))}
          </CardGrid>
        ) : (
          <EmptyState text="검색어와 연결된 식이요법 상세 참고자료가 없습니다." />
        )}
      </section>

      <section>
        <SectionHeader
          eyebrow="식이요법 영상자료"
          title="식습관 영상으로 참고하기"
          description="영상자료는 제목, 채널명, 짧은 요약과 검색 링크 중심의 mock 자료입니다."
        />
        {results.dietVideoMatches.length > 0 ? <VideoResultGrid videos={results.dietVideoMatches} /> : <EmptyState text="검색어와 연결된 식이요법 영상자료가 없습니다." />}
      </section>

      <section>
        <SectionHeader
          eyebrow="운동요법 영상자료"
          title="운동요법 영상으로 참고하기"
          description="운동요법 영상은 생활관리 참고자료이며 개인 상태에 따라 적합성이 다를 수 있습니다."
        />
        {results.exerciseVideoMatches.length > 0 ? <VideoResultGrid videos={results.exerciseVideoMatches} /> : <EmptyState text="검색어와 연결된 운동요법 영상자료가 없습니다." />}
      </section>

      <section>
        <SectionHeader
          eyebrow="식이요법 / 생활관리"
          title="식이요법과 생활관리 참고정보"
          description="식이요법과 생활관리 정보는 개인 상태에 따라 다르게 적용될 수 있는 참고자료입니다."
        />
        {results.foodMatches.length > 0 ? (
          <CardGrid>
            {results.foodMatches.map((guide) => {
              const disease = diseases.find((item) => item.slug === guide.diseaseSlug);
              return (
                <article key={guide.diseaseSlug} className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold text-[#2f6c48]">식이요법 / 생활관리</p>
                  <h3 className="mt-2 text-xl font-bold text-[#1b4631]">{disease?.name}</h3>
                  <p className="mt-3 text-base leading-7 text-[#526257]">{guide.note}</p>
                  <p className="mt-3 text-sm text-[#2f6c48]">도움이 될 수 있음: {guide.helpful.join(", ")}</p>
                  <p className="mt-2 text-sm text-[#9a4d3c]">주의가 필요함: {guide.avoid.join(", ")}</p>
                </article>
              );
            })}
          </CardGrid>
        ) : (
          <EmptyState text="검색어와 연결된 식이요법 / 생활관리 정보가 없습니다." />
        )}
      </section>

      <section>
        <SectionHeader
          eyebrow="AI 건강정보 정리"
          title="검색어 기반 참고자료 요약"
          description="AI 건강정보 정리는 입력한 증상과 등록된 자료를 바탕으로 관련 정보를 정리한 참고 기능입니다. 의학적 진단, 치료, 처방을 대신하지 않습니다."
        />
        <article className="rounded-lg border border-[#b7d0ac] bg-[#f4faf0] p-6 shadow-sm">
          <p className="text-sm font-extrabold text-[#2f6c48]">입력한 검색어 요약</p>
          <h3 className="mt-2 text-2xl font-bold text-[#173d2d]">{query}</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <AiSummaryBlock title="관련 가능성이 있는 건강정보" items={results.diseaseMatches.map((disease) => disease.name)} emptyText="연결된 질병 정보가 없습니다." />
            <AiSummaryBlock title="참고할 수 있는 식이요법" items={results.detailedDietMatches.flatMap((guide) => guide.mealTips).slice(0, 5)} emptyText="연결된 식이요법이 없습니다." />
            <AiSummaryBlock title="참고할 수 있는 운동요법" items={results.exerciseMatches.flatMap((guide) => guide.recommendedExercises).slice(0, 5)} emptyText="연결된 운동요법이 없습니다." />
            <AiSummaryBlock title="주의가 필요한 신호" items={results.diseaseMatches.flatMap((disease) => disease.warningSigns).slice(0, 5)} emptyText="등록된 주의 신호가 없습니다." />
            <AiSummaryBlock title="병원 방문 전 확인할 내용" items={results.diseaseMatches.flatMap((disease) => disease.doctorQuestions).slice(0, 5)} emptyText="등록된 질문지가 없습니다." />
            <AiSummaryBlock title="관련 외부 의학자료 보기" items={externalResources.map((resource) => resource.title).slice(0, 5)} emptyText="현재 연결된 외부 자료가 없습니다." />
          </div>
          <p className="mt-5 rounded-lg bg-white p-4 text-sm font-semibold leading-6 text-[#526257]">
            이 내용은 진단이 아니라 검색어와 등록된 건강정보를 바탕으로 정리한 참고자료입니다. 정확한 진단과 치료는 의료기관 상담이 필요합니다.
          </p>
        </article>
      </section>

      <section>
        <SectionHeader
          eyebrow="외부 의학 전문자료"
          title="관련 참고자료"
          description="아래 외부 자료는 증상에 대한 참고 정보입니다. 실제 진단이나 치료 결정을 대신하지 않으며, 증상이 지속되거나 심한 경우 반드시 의료기관을 방문하시기 바랍니다."
        />
        {externalResources.length > 0 ? (
          <CardGrid>
            {externalResources.map((resource) => (
              <article key={resource.id} className="rounded-lg border border-[#b8d7e6] bg-[#fbfeff] p-6 shadow-sm">
                <span className="rounded-full border border-[#9cc7d8] bg-white px-3 py-1.5 text-xs font-extrabold text-[#2b6f87]">
                  외부 의학 참고자료
                </span>
                <p className="mt-5 text-sm font-bold text-[#2b6f87]">{resource.source} · {resource.type}</p>
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
          </CardGrid>
        ) : (
          <EmptyState text="현재 연결된 외부 참고자료가 없습니다." />
        )}
      </section>

      <section>
        <SectionHeader
          eyebrow="개인 경험담"
          title="사용자 경험 기록"
          description="개인 경험담은 작성자의 주관적 경험이며, 의학적 진단이나 치료법이 아닙니다."
        />
        {results.experienceMatches.length > 0 ? (
          <CardGrid>
            {results.experienceMatches.map((experience) => (
              <article key={experience.id} className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
                <span className="rounded-full bg-[#f5f0e4] px-3 py-1.5 text-xs font-bold text-[#596344]">
                  개인 경험담
                </span>
                <p className="mt-5 text-sm font-bold text-[#2f6c48]">{experience.diseaseOrSymptom} · {experience.nickname}</p>
                <h3 className="mt-2 text-xl font-bold text-[#1b4631]">{experience.title}</h3>
                <p className="mt-2 text-sm font-bold text-[#596344]">{experience.category}</p>
                <p className="mt-3 text-base leading-7 text-[#526257]">{experience.symptomDescription}</p>
                <Link href={`/experiences/${experience.slug}`} className="mt-4 inline-flex rounded-lg border border-[#174330] px-4 py-2 text-sm font-bold text-[#174330]">
                  경험담 읽기
                </Link>
              </article>
            ))}
          </CardGrid>
        ) : (
          <EmptyState text="검색어와 연결된 개인 경험담이 아직 없습니다." />
        )}
      </section>

      <section>
        <SectionHeader
          eyebrow="건강관리 도구 안내"
          title="기록과 상담 준비에 참고할 수 있는 도구"
          description="아래 항목은 건강정보 정리와 생활관리 기록을 돕는 도구 예시입니다. 특정 제품 구매나 치료 효과를 보장하지 않습니다."
        />
        {affiliateProducts.length > 0 ? (
          <AffiliateProductCards products={affiliateProducts} />
        ) : (
          <EmptyState text="검색어와 연결된 건강관리 도구 안내가 없습니다." />
        )}
      </section>

      <section className="rounded-lg border border-[#b7d0ac] bg-[#f4faf0] p-6 shadow-sm">
        <p className="text-sm font-extrabold text-[#2f6c48]">의료 주의 안내</p>
        <p className="mt-3 text-base leading-7 text-[#405347]">
          검색 결과는 일반 건강정보와 참고자료를 정리한 것입니다. 의학적 진단, 치료, 처방을 대신하지 않으며
          증상이 있거나 치료가 필요한 경우 반드시 의사 또는 전문 의료기관과 상담하시기 바랍니다.
        </p>
      </section>
    </div>
  );
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-5">
      <p className="text-sm font-bold text-[#2f6c48]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold text-[#173d2d] sm:text-3xl">{title}</h2>
      <p className="mt-3 max-w-4xl text-base leading-7 text-[#526257]">{description}</p>
    </div>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-[#dde6d7] bg-white p-6 text-base text-[#526257] shadow-sm">{text}</div>;
}

function ExerciseGuideCard({ guide }: { guide: ExerciseGuide }) {
  return (
    <article className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-[#2f6c48]">{guide.category} · 강도 {guide.intensity}</p>
      <h3 className="mt-2 text-xl font-bold text-[#1b4631]">{guide.title}</h3>
      <p className="mt-3 text-base leading-7 text-[#526257]">{guide.description}</p>
      <ListLine label="참고 운동" items={guide.recommendedExercises} color="green" />
      <ListLine label="주의 운동" items={guide.cautionExercises} color="red" />
      <p className="mt-3 text-sm leading-6 text-[#526257]">빈도: {guide.frequency} · 시간: {guide.duration}</p>
      <p className="mt-3 rounded-lg bg-[#fffdf7] p-3 text-sm leading-6 text-[#5b6146]">{guide.warning}</p>
      <a href={guide.videoSearchUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-[#174330] px-4 py-2 text-sm font-bold text-[#174330]">
        관련 운동 영상 보기
      </a>
    </article>
  );
}

function DietGuideCard({ guide }: { guide: DietGuide }) {
  return (
    <article className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-[#2f6c48]">식습관 참고자료</p>
      <h3 className="mt-2 text-xl font-bold text-[#1b4631]">{guide.title}</h3>
      <p className="mt-3 text-base leading-7 text-[#526257]">{guide.description}</p>
      <ListLine label="참고 식재료" items={guide.recommendedIngredients} color="green" />
      <ListLine label="주의 음식" items={guide.cautionIngredients} color="red" />
      <ListLine label="식사 팁" items={guide.mealTips} color="green" />
      <p className="mt-3 rounded-lg bg-[#fffdf7] p-3 text-sm leading-6 text-[#5b6146]">{guide.warning}</p>
      <a href={guide.videoSearchUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-[#174330] px-4 py-2 text-sm font-bold text-[#174330]">
        관련 식이요법 영상 보기
      </a>
    </article>
  );
}

function VideoResultGrid({ videos }: { videos: VideoResource[] }) {
  return (
    <CardGrid>
      {videos.map((video) => (
        <article key={video.id} className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-[#2f6c48]">{getVideoCategoryLabel(video.category)} · {video.channel}</p>
          <h3 className="mt-2 text-xl font-bold text-[#1b4631]">{video.title}</h3>
          <p className="mt-3 text-base leading-7 text-[#526257]">{video.summary}</p>
          <a href={video.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-[#174330] px-4 py-2 text-sm font-bold text-[#174330]">
            영상 검색 보기
          </a>
        </article>
      ))}
    </CardGrid>
  );
}

function ListLine({ label, items, color }: { label: string; items: string[]; color: "green" | "red" }) {
  const className = color === "green" ? "text-[#2f6c48]" : "text-[#9a4d3c]";
  return (
    <p className={`mt-3 text-sm leading-6 ${className}`}>
      <strong>{label}:</strong> {items.join(", ")}
    </p>
  );
}

function AiSummaryBlock({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  const visibleItems = items.filter(Boolean);
  return (
    <div className="rounded-lg bg-white p-4">
      <p className="text-sm font-extrabold text-[#1b4631]">{title}</p>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#526257]">
        {(visibleItems.length > 0 ? visibleItems : [emptyText]).map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#2f6c48]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function isVideoCategory(value: string, category: "diet" | "exercise") {
  const normalized = value.toLowerCase();
  if (category === "diet") return normalized === "diet" || value.includes("식이") || value.includes("식습관");
  return normalized === "exercise" || value.includes("운동");
}

function getVideoCategoryLabel(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === "diet" || value.includes("식이") || value.includes("식습관")) return "식이요법 영상";
  if (normalized === "exercise" || value.includes("운동")) return "운동요법 영상";
  if (normalized === "medical" || value.includes("의학")) return "의학정보 영상";
  if (normalized === "experience" || value.includes("경험")) return "개인 경험 영상";
  return "생활관리 영상";
}
