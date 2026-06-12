"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Disease, Experience, FoodGuide, VideoResource } from "@/data/types";
import type { ExternalMedicalResource } from "@/services/medicalSources";

const emergencyKeywords = [
  "가슴통증",
  "호흡곤란",
  "의식저하",
  "마비",
  "심한 두통",
  "심한 복통",
  "피를 토함",
  "자살",
  "극심한 어지러움",
  "한쪽 팔다리 마비",
  "말이 어눌함",
];

export default function SearchResultsTabs({
  query,
  diseases,
  foodGuides,
  videos,
  experiences,
  externalResources,
}: {
  query: string;
  diseases: Disease[];
  foodGuides: FoodGuide[];
  videos: VideoResource[];
  experiences: Experience[];
  externalResources: ExternalMedicalResource[];
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const showEmergencyNotice = emergencyKeywords.some((keyword) => normalizedQuery.includes(keyword));

  const results = useMemo(() => {
    const diseaseMatches = diseases.filter((disease) =>
      [disease.name, disease.category, disease.summary, ...disease.symptoms, ...disease.keywords]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
    const matchedSlugs = new Set(diseaseMatches.map((disease) => disease.slug));

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
        [disease?.name, video.title, video.channel, video.summary].join(" ").toLowerCase().includes(normalizedQuery)
      );
    });

    const experienceMatches = experiences.filter((experience) =>
      Object.values(experience).join(" ").toLowerCase().includes(normalizedQuery),
    );

    return { diseaseMatches, foodMatches, videoMatches, experienceMatches };
  }, [diseases, experiences, foodGuides, normalizedQuery, videos]);

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
          <EmptyState text="내부 건강정보에서 관련 정보를 찾지 못했습니다." />
        )}
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
                <p className="mt-3 text-base leading-7 text-[#526257]">{experience.symptomDescription}</p>
                <Link href={`/remedies#${experience.id}`} className="mt-4 inline-flex rounded-lg border border-[#174330] px-4 py-2 text-sm font-bold text-[#174330]">
                  경험담 읽기
                </Link>
              </article>
            ))}
          </CardGrid>
        ) : (
          <EmptyState text="검색어와 연결된 개인 경험담이 없습니다." />
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
