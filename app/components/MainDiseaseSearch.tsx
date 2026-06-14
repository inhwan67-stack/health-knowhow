"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import type { Disease, Symptom } from "@/data/types";

const exampleQueries = ["속쓰림", "혈당", "두근거림", "콧물", "기침", "손저림"];

export default function MainDiseaseSearch({ diseases, symptoms }: { diseases: Disease[]; symptoms: Symptom[] }) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  const filteredDiseases = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return diseases.slice(0, 6);

    const symptomDiseaseIds = new Set(
      symptoms
        .filter((symptom) =>
          [symptom.name, symptom.description, ...symptom.searchAliases].join(" ").toLowerCase().includes(normalizedQuery),
        )
        .flatMap((symptom) => symptom.relatedDiseaseIds),
    );

    return diseases.filter((disease) => {
      const diseaseText = [
        disease.name,
        disease.category,
        disease.summary,
        disease.description,
        ...disease.relatedSymptoms,
        ...disease.symptoms,
        ...disease.lifestyle,
        ...disease.causes,
        ...disease.diet,
        ...disease.searchKeywords,
        ...disease.keywords,
      ]
        .join(" ")
        .toLowerCase();

      return diseaseText.includes(normalizedQuery) || symptomDiseaseIds.has(disease.id) || symptomDiseaseIds.has(disease.slug);
    });
  }, [diseases, query, symptoms]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(input.trim());
  }

  function handleInputChange(value: string) {
    setInput(value);
    if (!value.trim()) setQuery("");
  }

  function applyExample(example: string) {
    setInput(example);
    setQuery(example);
  }

  const hasQuery = query.trim().length > 0;

  return (
    <section id="disease-search" className="mx-auto max-w-[1440px] scroll-mt-28 px-5 py-14 sm:px-8 lg:px-12">
      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_480px] lg:items-end">
        <div>
          <p className="text-sm font-bold text-[#2f6c48]">질병 카드 검색</p>
          <h2 className="mt-2 text-3xl font-bold tracking-normal text-[#173d2d] sm:text-4xl">
            자주 찾는 질병과 증상을 바로 확인하세요
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#526257]">
            아래 정보는 일반 건강정보 참고용이며 의학적 진단이나 치료를 대신하지 않습니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-[#c6d9bd] bg-white p-4 shadow-[0_12px_34px_rgba(31,75,54,0.08)]">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="main-disease-filter" className="sr-only">
              질병 카드 검색
            </label>
            <input
              id="main-disease-filter"
              value={input}
              onChange={(event) => handleInputChange(event.target.value)}
              placeholder="예: 속쓰림, 혈당, 불면증"
              className="min-h-12 flex-1 rounded-lg border border-[#c9d9c2] bg-[#fffdf7] px-4 text-base text-[#173d2d] outline-none transition placeholder:text-[#7a8a7f] focus:border-[#2f6c48] focus:ring-4 focus:ring-[#d9ead2]"
            />
            <button
              type="submit"
              className="min-h-12 rounded-lg bg-[#174330] px-6 text-base font-bold text-white transition hover:bg-[#255f42]"
            >
              검색
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {exampleQueries.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => applyExample(example)}
                className="rounded-full bg-[#eef6e9] px-3 py-1.5 text-sm font-bold text-[#2f6c48]"
              >
                {example}
              </button>
            ))}
          </div>
        </form>
      </div>

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h3 className="text-2xl font-bold text-[#173d2d]">
          {hasQuery ? `${query} 검색 결과` : "기본 질병 목록"}
        </h3>
        <p className="text-base font-semibold text-[#526257]">{filteredDiseases.length}개 항목</p>
      </div>

      {filteredDiseases.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredDiseases.map((disease) => (
            <article key={disease.slug} className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="rounded-full bg-[#eef6e9] px-3 py-1 text-xs font-bold text-[#2f6c48]">
                {disease.category}
              </span>
              <h4 className="mt-5 text-2xl font-bold text-[#1b4631]">{disease.name}</h4>
              <p className="mt-4 text-base leading-7 text-[#526257]">
                <strong className="text-[#1b4631]">주요 증상:</strong> {disease.symptoms.slice(0, 3).join(", ")}
              </p>
              <p className="mt-3 text-base leading-7 text-[#526257]">
                <strong className="text-[#1b4631]">생활관리:</strong> {disease.lifestyle[0]}
              </p>
              <Link
                href={`/diseases/${disease.slug}`}
                className="mt-6 inline-flex rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-bold text-[#174330] transition hover:bg-[#eef6e9]"
              >
                상세 정보 보기
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-[#d9e6d2] bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-bold text-[#173d2d]">
            관련 정보를 찾지 못했습니다. 다른 증상명이나 질병명을 입력해 주세요. 증상이 심하거나 지속되는 경우 의료기관 상담을 권장합니다.
          </p>
          <p className="mt-2 text-base leading-7 text-[#526257]">
            예: 속쓰림, 혈당, 수면, 관절 통증처럼 증상 단어로도 검색할 수 있습니다.
          </p>
        </div>
      )}
    </section>
  );
}
