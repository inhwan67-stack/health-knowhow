"use client";

import { useEffect, useMemo, useState } from "react";
import type { Experience } from "@/data/types";
import { buildExperienceReviewText, checkMedicalReviewPhrases } from "@/data/reviewRules";

const DRAFT_STORAGE_KEY = "healthKnowhowExperienceDrafts";
const REVIEW_STORAGE_KEY = "healthKnowhowAdminReviews";

type ReviewStatus = Experience["status"] | "needs_revision";
type ReviewMap = Record<string, { status: ReviewStatus; reviewNote: string; updatedAt: string }>;
type ReviewExperience = Experience & { draftId?: string; reviewSource: "csv" | "localStorage" };

const statusGroups: { label: string; value: ReviewStatus | "draft" }[] = [
  { label: "검토 대기", value: "pending" },
  { label: "승인됨", value: "approved" },
  { label: "거절됨", value: "rejected" },
  { label: "수정 필요", value: "needs_revision" },
  { label: "임시 draft", value: "draft" },
];

export default function ExperienceReviewClient({ initialExperiences }: { initialExperiences: Experience[] }) {
  const [drafts, setDrafts] = useState<ReviewExperience[]>([]);
  const [reviews, setReviews] = useState<ReviewMap>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const allExperiences = useMemo<ReviewExperience[]>(
    () => [
      ...initialExperiences.map((experience) => ({ ...experience, reviewSource: "csv" as const })),
      ...drafts,
    ],
    [drafts, initialExperiences],
  );

  function effectiveStatus(experience: ReviewExperience): ReviewStatus {
    return reviews[experience.id]?.status ?? experience.status;
  }

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
      setDrafts(loadDrafts());
      setReviews(loadReviews());
    });
  }, []);

  function updateReview(experience: ReviewExperience, status: ReviewStatus, defaultNote: string) {
    const reviewNote = window.prompt("관리자 메모를 입력하세요.", reviews[experience.id]?.reviewNote || defaultNote);
    if (reviewNote === null) return;

    const nextReviews = {
      ...reviews,
      [experience.id]: {
        status,
        reviewNote,
        updatedAt: new Date().toISOString(),
      },
    };
    setReviews(nextReviews);
    saveReviews(nextReviews);
  }

  function refreshDrafts() {
    setDrafts(loadDrafts());
  }

  return (
    <div className="grid gap-8">
      <section className="rounded-lg border border-[#d9d1aa] bg-[#fffdf7] p-5 shadow-sm">
        <p className="text-sm font-extrabold text-[#7a6230]">경험담 검수 mock</p>
        <p className="mt-3 text-sm leading-6 text-[#5b6146]">
          승인/거절/수정 필요 처리는 서버 저장이 아니라 이 브라우저의 localStorage에 저장됩니다. 실제 서비스에서는 관리자 계정, 승인 이력 테이블, 개인정보 보호 처리가 필요합니다.
        </p>
        <button
          type="button"
          onClick={refreshDrafts}
          className="mt-4 min-h-10 rounded-lg border border-[#7a6230] px-4 py-2 text-sm font-bold text-[#7a6230] transition hover:bg-[#f5f0e4]"
        >
          localStorage draft 새로고침 mock
        </button>
      </section>

      {!mounted ? (
        <div className="rounded-lg border border-[#dde6d7] bg-white p-5 text-sm text-[#526257] shadow-sm">
          브라우저 localStorage 기반 검수 데이터를 확인 중입니다.
        </div>
      ) : null}

      {statusGroups.map((group) => {
        const experiences = allExperiences.filter((experience) =>
          group.value === "draft"
            ? experience.reviewSource === "localStorage"
            : effectiveStatus(experience) === group.value,
        );

        return (
          <section key={group.value} className="grid gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[#2f6c48]">콘텐츠 상태</p>
                <h2 className="text-2xl font-bold text-[#173d2d]">{group.label}</h2>
              </div>
              <p className="text-sm font-bold text-[#526257]">{experiences.length}개</p>
            </div>
            {experiences.length > 0 ? (
              <div className="grid gap-5">
                {experiences.map((experience) => (
                  <ExperienceReviewCard
                    key={`${experience.reviewSource}-${experience.id}`}
                    experience={experience}
                    status={effectiveStatus(experience)}
                    reviewNote={reviews[experience.id]?.reviewNote}
                    isExpanded={expandedId === experience.id}
                    onToggle={() => setExpandedId(expandedId === experience.id ? null : experience.id)}
                    onApprove={() => updateReview(experience, "approved", "경험담으로 적절하여 승인 가능")}
                    onReject={() => updateReview(experience, "rejected", "개인정보가 포함되어 있어 비공개 처리 필요")}
                    onNeedsRevision={() => updateReview(experience, "needs_revision", "의료효과를 단정하는 표현이 있어 수정 필요")}
                    onSensitiveCheck={() => updateReview(experience, "needs_revision", "민감정보 또는 개인정보 포함 여부 확인 필요")}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-[#dde6d7] bg-white p-5 text-sm text-[#526257] shadow-sm">
                해당 상태의 경험담이 없습니다.
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ExperienceReviewCard({
  experience,
  status,
  reviewNote,
  isExpanded,
  onToggle,
  onApprove,
  onReject,
  onNeedsRevision,
  onSensitiveCheck,
}: {
  experience: ReviewExperience;
  status: ReviewStatus;
  reviewNote?: string;
  isExpanded: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  onNeedsRevision: () => void;
  onSensitiveCheck: () => void;
}) {
  const reviewText = buildExperienceReviewText([
    experience.title,
    experience.summary,
    experience.content,
    experience.symptomDescription,
    experience.helpfulFoods,
    experience.cautionFoods,
    experience.helpfulExercises,
    experience.helpfulHabits,
    experience.helpfulLifestyle,
    experience.caution,
  ]);
  const phraseCheck = checkMedicalReviewPhrases(reviewText);
  const sensitiveMatches = findSensitiveInfo(reviewText);

  return (
    <article className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={status} />
        <span className="rounded-full bg-[#eef6e9] px-3 py-1.5 text-xs font-bold text-[#2f6c48]">
          {experience.reviewSource === "localStorage" ? "localStorage draft" : "CSV mock"}
        </span>
        {phraseCheck.riskyMatches.length > 0 ? (
          <span className="rounded-full bg-[#fff0ea] px-3 py-1.5 text-xs font-bold text-[#9a4d3c]">
            위험 표현 {phraseCheck.riskyMatches.length}개
          </span>
        ) : null}
        {sensitiveMatches.length > 0 ? (
          <span className="rounded-full bg-[#f5f0e4] px-3 py-1.5 text-xs font-bold text-[#7a6230]">
            민감정보 의심 {sensitiveMatches.length}개
          </span>
        ) : null}
      </div>

      <h3 className="mt-4 text-xl font-bold leading-7 text-[#1b4631]">{experience.title}</h3>
      <p className="mt-2 text-sm font-bold text-[#2f6c48]">
        {experience.diseaseName || experience.symptom || experience.diseaseOrSymptom} · {experience.category} · {experience.nickname}
      </p>
      <p className="mt-3 text-base leading-7 text-[#526257]">{experience.summary}</p>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6a776e]">{experience.content || experience.symptomDescription}</p>

      <div className="mt-4 grid gap-3 rounded-lg bg-[#fffdf7] p-4 text-sm leading-6 text-[#526257] md:grid-cols-2">
        <InfoLine label="병원 진료 여부" value={experience.hospitalVisited} />
        <InfoLine label="도움 음식" value={experience.helpfulFoods || "미입력"} />
        <InfoLine label="주의 음식" value={experience.cautionFoods || "미입력"} />
        <InfoLine label="운동/생활습관" value={[experience.helpfulExercises, experience.helpfulHabits || experience.helpfulLifestyle].filter(Boolean).join(", ") || "미입력"} />
        <InfoLine label="주의할 점" value={experience.caution || "미입력"} />
        <InfoLine label="작성일" value={formatDate(experience.createdAt)} />
        <InfoLine label="공개 동의" value={experience.agreeToPublic ? "동의" : "미동의"} />
        <InfoLine label="의료정보 아님 동의" value={experience.agreeMedicalDisclaimer ? "동의" : "미동의"} />
      </div>

      {reviewNote ? (
        <p className="mt-4 rounded-lg border border-[#d9d1aa] bg-[#fffdf7] p-3 text-sm font-semibold leading-6 text-[#7a6230]">
          관리자 메모: {reviewNote}
        </p>
      ) : null}

      {isExpanded ? (
        <div className="mt-4 grid gap-4 rounded-lg border border-[#dde6d7] bg-[#fbfaf5] p-4">
          <div>
            <p className="text-sm font-extrabold text-[#1b4631]">본문 전체</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#526257]">{experience.content || experience.symptomDescription || "본문이 없습니다."}</p>
          </div>
          <PhraseResult title="위험 표현 점검" items={phraseCheck.riskyMatches} emptyText="위험 표현이 발견되지 않았습니다." tone="risk" />
          <PhraseResult title="주의 표현 점검" items={phraseCheck.cautionMatches} emptyText="주의 표현이 아직 충분하지 않습니다." tone="safe" />
          <PhraseResult title="민감정보 확인" items={sensitiveMatches} emptyText="이메일, 전화번호, 주민등록번호 형식은 발견되지 않았습니다." tone="warning" />
          <p className="rounded-lg bg-white p-3 text-sm leading-6 text-[#526257]">권장 대체 표현: {phraseCheck.recommendation}</p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <ActionButton label="내용 자세히 보기" onClick={onToggle} />
        <ActionButton label="승인 처리 mock" onClick={onApprove} tone="approved" />
        <ActionButton label="거절 처리 mock" onClick={onReject} tone="rejected" />
        <ActionButton label="수정 필요 표시 mock" onClick={onNeedsRevision} tone="pending" />
        <ActionButton label="민감정보 확인 mock" onClick={onSensitiveCheck} tone="warning" />
        <ActionButton label="위험 표현 점검" onClick={onToggle} tone="warning" />
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const classNameByStatus: Record<ReviewStatus, string> = {
    pending: "bg-[#f5f0e4] text-[#7a6230]",
    approved: "bg-[#eef6e9] text-[#2f6c48]",
    rejected: "bg-[#fff0ea] text-[#9a4d3c]",
    needs_revision: "bg-[#fff7df] text-[#9b6a16]",
  };
  const labelByStatus: Record<ReviewStatus, string> = {
    pending: "pending",
    approved: "approved",
    rejected: "rejected",
    needs_revision: "수정 필요",
  };

  return <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${classNameByStatus[status]}`}>{labelByStatus[status]}</span>;
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <strong className="text-[#1b4631]">{label}:</strong> {value}
    </p>
  );
}

function PhraseResult({
  title,
  items,
  emptyText,
  tone,
}: {
  title: string;
  items: string[];
  emptyText: string;
  tone: "risk" | "safe" | "warning";
}) {
  const badgeClassName =
    tone === "risk"
      ? "rounded-full bg-[#fff0ea] px-3 py-1.5 text-xs font-bold text-[#9a4d3c]"
      : tone === "safe"
        ? "rounded-full bg-[#eef6e9] px-3 py-1.5 text-xs font-bold text-[#2f6c48]"
        : "rounded-full bg-[#f5f0e4] px-3 py-1.5 text-xs font-bold text-[#7a6230]";

  return (
    <div>
      <p className="text-sm font-extrabold text-[#1b4631]">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(items.length > 0 ? items : [emptyText]).map((item) => (
          <span key={item} className={items.length > 0 ? badgeClassName : "text-sm font-semibold text-[#6a776e]"}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "approved" | "rejected" | "pending" | "warning";
}) {
  const classNameByTone = {
    default: "border-[#174330] text-[#174330] hover:bg-[#eef6e9]",
    approved: "border-[#2f6c48] text-[#2f6c48] hover:bg-[#eef6e9]",
    rejected: "border-[#b75f4b] text-[#9a4d3c] hover:bg-[#fff0ea]",
    pending: "border-[#d3a12b] text-[#9b6a16] hover:bg-[#fff7df]",
    warning: "border-[#7a6230] text-[#7a6230] hover:bg-[#f5f0e4]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-bold transition ${classNameByTone[tone]}`}
    >
      {label}
    </button>
  );
}

function loadDrafts(): ReviewExperience[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Experience[];
    return Array.isArray(parsed)
      ? parsed.map((draft) => ({ ...draft, reviewSource: "localStorage" as const }))
      : [];
  } catch {
    return [];
  }
}

function loadReviews(): ReviewMap {
  if (typeof window === "undefined") return {};

  try {
    const stored = window.localStorage.getItem(REVIEW_STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as ReviewMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveReviews(reviews: ReviewMap) {
  window.localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviews));
}

function findSensitiveInfo(text: string) {
  const matches = new Set<string>();
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) matches.add("이메일 형식");
  if (/(01[016789])[-.\s]?\d{3,4}[-.\s]?\d{4}/.test(text)) matches.add("휴대전화 번호 형식");
  if (/\d{6}[-\s]?[1-4]\d{6}/.test(text)) matches.add("주민등록번호 형식");
  return Array.from(matches);
}

function formatDate(value: string) {
  return value.replace("T", " ").slice(0, 16);
}
