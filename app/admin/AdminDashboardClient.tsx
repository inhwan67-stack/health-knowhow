"use client";

import { useEffect, useMemo, useState } from "react";
import { checkMedicalReviewPhrases } from "@/data/reviewRules";

const DRAFT_STORAGE_KEY = "healthKnowhowExperienceDrafts";

type AdminMetric = {
  label: string;
  value: number;
  description: string;
  anchor?: string;
};

type DatabaseStatus = {
  hasUrl: boolean;
  hasAnonKey: boolean;
  supabaseReady: boolean;
  currentDataSource: string;
  supabaseConnectionLabel: string;
  experienceStorage: string;
  recordStorage: string;
  adminReviewStorage: string;
  fallbackDescription: string;
};

export default function AdminDashboardClient({
  metrics,
  databaseStatus,
}: {
  metrics: AdminMetric[];
  databaseStatus: DatabaseStatus;
}) {
  const [draftCount, setDraftCount] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState("이 방법으로 치질이 완치됐어요");
  const [checkedText, setCheckedText] = useState(reviewText);

  const phraseCheck = useMemo(() => checkMedicalReviewPhrases(checkedText), [checkedText]);

  useEffect(() => {
    queueMicrotask(() => {
      setDraftCount(getStoredArrayCount(DRAFT_STORAGE_KEY));
    });
  }, []);

  function refreshDraftCount() {
    setDraftCount(getStoredArrayCount(DRAFT_STORAGE_KEY));
  }

  return (
    <div className="grid gap-8">
      <section className="rounded-lg border border-[#c6d9bd] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-[#2f6c48]">데이터베이스 연결 상태</p>
            <h2 className="mt-2 text-2xl font-bold text-[#173d2d]">Supabase 연결 준비</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-[#526257]">{databaseStatus.fallbackDescription}</p>
          </div>
          <span
            className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${
              databaseStatus.supabaseReady ? "bg-[#eef6e9] text-[#2f6c48]" : "bg-[#f5f0e4] text-[#7a6230]"
            }`}
          >
            Supabase {databaseStatus.supabaseConnectionLabel}
          </span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <StatusLine label="Supabase URL 설정 여부" value={databaseStatus.hasUrl ? "설정됨" : "미설정"} />
          <StatusLine label="Supabase anon key 설정 여부" value={databaseStatus.hasAnonKey ? "설정됨" : "미설정"} />
          <StatusLine label="현재 데이터 소스" value={databaseStatus.currentDataSource} />
          <StatusLine label="경험담 저장 방식" value={databaseStatus.experienceStorage} />
          <StatusLine label="증상 기록 저장 방식" value={databaseStatus.recordStorage} />
          <StatusLine label="관리자 승인 저장 방식" value={databaseStatus.adminReviewStorage} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.label} id={metric.anchor} className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-[#2f6c48]">{metric.label}</p>
            <p className="mt-3 text-4xl font-extrabold text-[#174330]">{metric.value}</p>
            <p className="mt-3 text-sm leading-6 text-[#526257]">{metric.description}</p>
          </article>
        ))}
        <article className="rounded-lg border border-[#d9d1aa] bg-[#fffdf7] p-5 shadow-sm">
          <p className="text-sm font-bold text-[#7a6230]">브라우저 임시 경험담 draft</p>
          <p className="mt-3 text-4xl font-extrabold text-[#7a6230]">{draftCount ?? "확인 중"}</p>
          <p className="mt-3 text-sm leading-6 text-[#5b6146]">현재 브라우저 localStorage에 저장된 제출 draft 수입니다.</p>
          <button
            type="button"
            onClick={refreshDraftCount}
            className="mt-4 min-h-10 rounded-lg border border-[#7a6230] px-4 py-2 text-sm font-bold text-[#7a6230] transition hover:bg-[#f5f0e4]"
          >
            draft 수 새로고침 mock
          </button>
        </article>
      </section>

      <section id="phrase-checker" className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-[#7a6230]">주의 표현 점검</p>
            <h2 className="mt-2 text-2xl font-bold text-[#173d2d]">키워드 기반 표현 점검 mock</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-[#526257]">
              실제 AI 검수가 아니라 미리 정의한 위험 표현 목록과 주의 표현 목록을 단순 비교하는 개발용 기능입니다.
            </p>
          </div>
          <span className="w-fit rounded-full bg-[#f5f0e4] px-3 py-1.5 text-xs font-bold text-[#7a6230]">
            AI 아님 / mock
          </span>
        </div>

        <textarea
          value={reviewText}
          onChange={(event) => setReviewText(event.target.value)}
          className="mt-5 min-h-32 w-full rounded-lg border border-[#c9d9c2] bg-[#fffdf7] px-4 py-3 text-base leading-7 text-[#405347] outline-none transition focus:border-[#2f6c48] focus:ring-4 focus:ring-[#d9ead2]"
          placeholder="검토할 문장을 입력하세요"
        />
        <button
          type="button"
          onClick={() => setCheckedText(reviewText)}
          className="mt-4 min-h-11 rounded-lg bg-[#174330] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#255f42]"
        >
          표현 점검하기
        </button>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <ResultPanel
            title="위험 표현"
            emptyText="발견된 위험 표현이 없습니다."
            items={phraseCheck.riskyMatches}
            tone="risk"
          />
          <ResultPanel
            title="주의 표현"
            emptyText="안전성을 보완하는 주의 표현이 아직 없습니다."
            items={phraseCheck.cautionMatches}
            tone="safe"
          />
        </div>
        <div className="mt-5 rounded-lg border border-[#d9d1aa] bg-[#fffdf7] p-4">
          <p className="text-sm font-extrabold text-[#7a6230]">권장 대체 표현</p>
          <p className="mt-2 text-sm leading-6 text-[#5b6146]">{phraseCheck.recommendation}</p>
        </div>
      </section>
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#fffdf7] p-4">
      <p className="text-xs font-extrabold text-[#2f6c48]">{label}</p>
      <p className="mt-2 text-sm font-bold leading-6 text-[#405347]">{value}</p>
    </div>
  );
}

function ResultPanel({
  title,
  emptyText,
  items,
  tone,
}: {
  title: string;
  emptyText: string;
  items: string[];
  tone: "risk" | "safe";
}) {
  const badgeClassName =
    tone === "risk"
      ? "rounded-full bg-[#fff0ea] px-3 py-1.5 text-xs font-bold text-[#9a4d3c]"
      : "rounded-full bg-[#eef6e9] px-3 py-1.5 text-xs font-bold text-[#2f6c48]";

  return (
    <div className="rounded-lg border border-[#dde6d7] bg-[#fbfaf5] p-4">
      <p className="text-sm font-extrabold text-[#1b4631]">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(items.length > 0 ? items : [emptyText]).map((item) => (
          <span key={item} className={items.length > 0 ? badgeClassName : "text-sm font-semibold text-[#6a776e]"}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function getStoredArrayCount(key: string) {
  if (typeof window === "undefined") return 0;

  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return 0;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}
