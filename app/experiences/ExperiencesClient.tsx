"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Experience } from "@/data/types";

const categories = ["전체", "식이요법", "운동요법", "생활습관", "병원진료", "증상기록", "기타"];

export default function ExperiencesClient({ experiences }: { experiences: Experience[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [diseaseOrSymptom, setDiseaseOrSymptom] = useState("전체");

  const diseaseOptions = useMemo(
    () => ["전체", ...Array.from(new Set(experiences.map((experience) => experience.diseaseName || experience.symptom).filter(Boolean)))],
    [experiences],
  );

  const filteredExperiences = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return experiences
      .filter((experience) => (category === "전체" ? true : experience.category === category))
      .filter((experience) =>
        diseaseOrSymptom === "전체"
          ? true
          : experience.diseaseName === diseaseOrSymptom || experience.symptom === diseaseOrSymptom,
      )
      .filter((experience) => {
        if (!normalizedQuery) return true;
        return [
          experience.title,
          experience.diseaseName,
          experience.symptom,
          experience.category,
          experience.summary,
          experience.content,
          ...experience.relatedTags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [category, diseaseOrSymptom, experiences, query]);

  return (
    <div className="grid gap-8">
      <section className="rounded-lg border border-[#c6d9bd] bg-white p-4 shadow-[0_12px_34px_rgba(31,75,54,0.08)] sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_260px]">
          <label className="grid gap-2 text-sm font-bold text-[#1b4631]">
            경험담 검색
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="예: 속쓰림, 혈당, 치질, 걷기"
              className={inputClassName}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-[#1b4631]">
            카테고리
            <select value={category} onChange={(event) => setCategory(event.target.value)} className={inputClassName}>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-[#1b4631]">
            질병/증상
            <select value={diseaseOrSymptom} onChange={(event) => setDiseaseOrSymptom(event.target.value)} className={inputClassName}>
              {diseaseOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-2xl font-bold text-[#173d2d]">승인된 경험담</h2>
        <p className="text-base font-semibold text-[#526257]">{filteredExperiences.length}개 항목</p>
      </div>

      {filteredExperiences.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredExperiences.map((experience) => (
            <article key={experience.id} className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#f5f0e4] px-3 py-1.5 text-xs font-bold text-[#596344]">
                  개인 경험담
                </span>
                <span className="rounded-full bg-[#eef6e9] px-3 py-1.5 text-xs font-bold text-[#2f6c48]">
                  {experience.category}
                </span>
              </div>
              <p className="mt-5 text-sm font-bold text-[#2f6c48]">
                {experience.diseaseName || experience.symptom} · {experience.nickname}
              </p>
              <h3 className="mt-2 text-xl font-bold leading-7 text-[#1b4631]">{experience.title}</h3>
              <p className="mt-3 text-base leading-7 text-[#526257]">{experience.summary}</p>
              <div className="mt-4 rounded-lg bg-[#fffdf7] p-4 text-sm leading-6 text-[#526257]">
                <p>
                  <strong className="text-[#1b4631]">음식:</strong> {experience.helpfulFoods || "미입력"}
                </p>
                <p className="mt-2">
                  <strong className="text-[#1b4631]">운동/생활습관:</strong>{" "}
                  {[experience.helpfulExercises, experience.helpfulHabits].filter(Boolean).join(", ") || "미입력"}
                </p>
                <p className="mt-2">
                  <strong className="text-[#1b4631]">주의:</strong> {experience.caution || "개인에 따라 다를 수 있습니다."}
                </p>
              </div>
              <p className="mt-4 text-sm text-[#6a776e]">작성일: {formatDate(experience.createdAt)}</p>
              <Link
                href={`/experiences/${experience.slug}`}
                className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-bold text-[#174330] transition hover:bg-[#eef6e9]"
              >
                경험담 읽기
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-[#dde6d7] bg-white p-6 text-base text-[#526257] shadow-sm">
          검색어와 연결된 개인 경험담이 아직 없습니다.
        </div>
      )}
    </div>
  );
}

function formatDate(value: string) {
  return value.slice(0, 10);
}

const inputClassName =
  "min-h-12 rounded-lg border border-[#c9d9c2] bg-[#fffdf7] px-4 py-3 text-base font-normal text-[#405347] outline-none transition focus:border-[#2f6c48] focus:ring-4 focus:ring-[#d9ead2]";
