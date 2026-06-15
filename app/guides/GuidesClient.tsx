"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Guide } from "@/types/health";

export default function GuidesClient({ guides, categories }: { guides: Guide[]; categories: string[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");

  const filteredGuides = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return guides.filter((guide) => {
      const matchesCategory = category === "전체" || guide.category === category;
      const matchesQuery =
        !normalizedQuery ||
        [
          guide.title,
          guide.category,
          guide.summary,
          guide.intro,
          ...guide.symptomsToCheck,
          ...guide.relatedHealthInfo,
          ...guide.lifestyleTips,
          ...guide.dietTips,
          ...guide.exerciseTips,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [category, guides, query]);

  return (
    <div className="grid gap-7">
      <section className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <label className="block">
            <span className="text-sm font-extrabold text-[#173d2d]">가이드 검색</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="예: 속쓰림, 혈압, 허리통증, 수면"
              className="mt-2 min-h-12 w-full rounded-lg border border-[#cbdac4] bg-white px-4 py-3 text-base text-[#173d2d] outline-none transition placeholder:text-[#8a968d] focus:border-[#2f6c48] focus:ring-4 focus:ring-[#dbeed2]"
            />
          </label>

          <label className="block">
            <span className="text-sm font-extrabold text-[#173d2d]">카테고리</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-lg border border-[#cbdac4] bg-white px-4 py-3 text-base text-[#173d2d] outline-none transition focus:border-[#2f6c48] focus:ring-4 focus:ring-[#dbeed2]"
            >
              <option value="전체">전체</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {filteredGuides.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredGuides.map((guide) => (
            <Link
              key={guide.id}
              href={`/guides/${guide.slug}`}
              className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="rounded-full bg-[#eef6e9] px-3 py-1.5 text-xs font-bold text-[#2f6c48]">
                {guide.category}
              </span>
              <h2 className="mt-5 text-2xl font-bold leading-8 text-[#1b4631]">{guide.title}</h2>
              <p className="mt-3 text-base leading-7 text-[#526257]">{guide.summary}</p>
              <p className="mt-5 text-sm font-bold text-[#174330]">자세히 보기</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-[#dde6d7] bg-white p-6 text-base leading-7 text-[#526257] shadow-sm">
          현재 검색어와 일치하는 가이드가 많지 않습니다. 다른 증상명이나 생활관리 키워드로 다시 확인해 주세요.
        </div>
      )}
    </div>
  );
}
