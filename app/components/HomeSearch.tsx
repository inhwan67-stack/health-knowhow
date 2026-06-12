"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const examples = ["당뇨", "고혈압", "위염", "관절염", "불면증", "역류성 식도염"];

export default function HomeSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submitSearch(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitSearch(query);
  }

  return (
    <div className="rounded-lg border border-[#c6d9bd] bg-white p-4 shadow-[0_16px_60px_rgba(31,75,54,0.12)] sm:p-5">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="home-health-search">
          질병명 또는 증상 검색
        </label>
        <input
          id="home-health-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="질병명 또는 증상을 입력하세요"
          className="min-h-12 flex-1 rounded-lg border border-[#c9d9c2] bg-[#fffdf7] px-4 text-base text-[#173d2d] outline-none transition placeholder:text-[#7a8a7f] focus:border-[#2f6c48] focus:ring-4 focus:ring-[#d9ead2]"
        />
        <button
          type="submit"
          className="min-h-12 rounded-lg bg-[#174330] px-6 text-base font-bold text-white transition hover:bg-[#255f42] focus:outline-none focus:ring-4 focus:ring-[#b9d8ab]"
        >
          검색
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-[#526257]">검색 예시</span>
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => submitSearch(example)}
            className="rounded-full border border-[#d5dfcd] bg-[#f5f9f1] px-3 py-1.5 text-sm font-semibold text-[#2f6c48] transition hover:border-[#8fb57c] hover:bg-[#eef6e9]"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
