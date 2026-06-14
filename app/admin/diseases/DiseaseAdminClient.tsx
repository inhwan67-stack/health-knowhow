"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Disease } from "@/data/types";

type DiseaseAdminRow = {
  disease: Disease;
  hasExerciseGuide: boolean;
  hasDietGuide: boolean;
  hasExternalResource: boolean;
};

export default function DiseaseAdminClient({ rows }: { rows: DiseaseAdminRow[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");

  const categories = useMemo(
    () => ["전체", ...Array.from(new Set(rows.map((row) => row.disease.category)))],
    [rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter(({ disease }) => {
      const matchesCategory = category === "전체" || disease.category === category;
      const matchesQuery =
        !normalizedQuery ||
        [disease.name, disease.slug, disease.category, ...disease.relatedSymptoms, ...disease.keywords]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, query, rows]);

  function showPreparedMessage() {
    window.alert("질병 데이터 수정 기능은 DB 연결 후 제공될 예정입니다.");
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
          <label className="grid gap-2 text-sm font-bold text-[#1b4631]">
            질병 검색
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="질병명, slug, 증상 키워드 검색"
              className={inputClassName}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-[#1b4631]">
            카테고리 필터
            <select value={category} onChange={(event) => setCategory(event.target.value)} className={inputClassName}>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-[#dde6d7] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-left text-sm">
            <thead className="bg-[#eef6e9] text-[#1b4631]">
              <tr>
                {[
                  "질병명",
                  "slug",
                  "카테고리",
                  "관련 증상 수",
                  "추천 음식 수",
                  "주의 음식 수",
                  "운동요법",
                  "식이요법",
                  "외부 자료",
                  "관리",
                ].map((header) => (
                  <th key={header} className="border-b border-[#d6e5cf] px-4 py-3 font-extrabold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(({ disease, hasExerciseGuide, hasDietGuide, hasExternalResource }) => (
                <tr key={disease.id} className="border-b border-[#eef2ea] align-top">
                  <td className="px-4 py-4 font-bold text-[#173d2d]">{disease.name}</td>
                  <td className="px-4 py-4 text-[#526257]">{disease.slug}</td>
                  <td className="px-4 py-4 text-[#526257]">{disease.category}</td>
                  <td className="px-4 py-4 text-[#526257]">{disease.relatedSymptoms.length}</td>
                  <td className="px-4 py-4 text-[#526257]">{disease.recommendedFoods.length}</td>
                  <td className="px-4 py-4 text-[#526257]">{disease.avoidFoods.length}</td>
                  <td className="px-4 py-4"><BooleanBadge enabled={hasExerciseGuide} /></td>
                  <td className="px-4 py-4"><BooleanBadge enabled={hasDietGuide} /></td>
                  <td className="px-4 py-4"><BooleanBadge enabled={hasExternalResource} /></td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/diseases/${disease.slug}`} className="rounded-lg border border-[#174330] px-3 py-2 text-xs font-bold text-[#174330] hover:bg-[#eef6e9]">
                        상세 보기
                      </Link>
                      <button type="button" onClick={showPreparedMessage} className="rounded-lg border border-[#d3a12b] px-3 py-2 text-xs font-bold text-[#9b6a16] hover:bg-[#fff7df]">
                        수정 준비 중
                      </button>
                      <Link href="/admin/csv" className="rounded-lg border border-[#7a6230] px-3 py-2 text-xs font-bold text-[#7a6230] hover:bg-[#f5f0e4]">
                        CSV로 관리 안내
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRows.length === 0 ? (
          <div className="p-5 text-sm text-[#526257]">조건에 맞는 질병 데이터가 없습니다.</div>
        ) : null}
      </section>
    </div>
  );
}

function BooleanBadge({ enabled }: { enabled: boolean }) {
  return (
    <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${enabled ? "bg-[#eef6e9] text-[#2f6c48]" : "bg-[#f5f0e4] text-[#7a6230]"}`}>
      {enabled ? "연결됨" : "없음"}
    </span>
  );
}

const inputClassName =
  "min-h-12 rounded-lg border border-[#c9d9c2] bg-[#fffdf7] px-4 py-3 text-base font-normal text-[#405347] outline-none transition focus:border-[#2f6c48] focus:ring-4 focus:ring-[#d9ead2]";
