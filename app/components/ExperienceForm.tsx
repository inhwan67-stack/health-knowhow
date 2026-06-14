"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Disease, Experience } from "@/data/types";
import { buildExperienceReviewText, checkMedicalReviewPhrases } from "@/data/reviewRules";

const STORAGE_KEY = "healthKnowhowExperienceDrafts";

const categories = ["식이요법", "운동요법", "생활습관", "병원진료", "증상기록", "기타"];
const hospitalOptions = ["진료받지 않음", "진료 예정", "진료받음", "정기적으로 관리 중"];

const emptyForm = {
  diseaseId: "",
  diseaseOrSymptom: "",
  category: "생활습관",
  title: "",
  symptomDescription: "",
  hospitalVisited: "진료받지 않음",
  helpfulFoods: "",
  cautionFoods: "",
  helpfulExercises: "",
  helpfulLifestyle: "",
  resourceLink: "",
  caution: "",
  nickname: "",
  agreeToPublic: false,
  agreeMedicalDisclaimer: false,
};

type DraftForm = typeof emptyForm;
type DraftExperience = Experience & { draftId: string };

export default function ExperienceForm({
  diseases,
  initialDiseaseSlug = "",
}: {
  diseases: Disease[];
  initialDiseaseSlug?: string;
}) {
  const initialDisease = diseases.find((disease) => disease.slug === initialDiseaseSlug);
  const [form, setForm] = useState<DraftForm>({
    ...emptyForm,
    diseaseId: initialDisease?.id ?? "",
    diseaseOrSymptom: initialDisease?.name ?? "",
  });
  const [drafts, setDrafts] = useState<DraftExperience[]>([]);
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState("");

  const selectedDisease = useMemo(
    () => diseases.find((disease) => disease.id === form.diseaseId),
    [diseases, form.diseaseId],
  );
  const phraseCheck = useMemo(
    () =>
      checkMedicalReviewPhrases(
        buildExperienceReviewText([
          form.title,
          form.symptomDescription,
          form.helpfulFoods,
          form.cautionFoods,
          form.helpfulExercises,
          form.helpfulLifestyle,
          form.caution,
        ]),
      ),
    [form.caution, form.cautionFoods, form.helpfulExercises, form.helpfulFoods, form.helpfulLifestyle, form.symptomDescription, form.title],
  );

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
      setDrafts(loadDrafts());
    });
  }, []);

  function updateField<K extends keyof DraftForm>(name: K, value: DraftForm[K]) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateDisease(value: string) {
    const disease = diseases.find((item) => item.id === value);
    setForm((current) => ({
      ...current,
      diseaseId: value,
      diseaseOrSymptom: disease?.name ?? current.diseaseOrSymptom,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.diseaseOrSymptom.trim() || !form.title.trim() || !form.agreeToPublic || !form.agreeMedicalDisclaimer) {
      return;
    }

    const now = new Date().toISOString();
    const draftId = `draft-${Date.now()}`;
    const nextItem: DraftExperience = {
      draftId,
      id: draftId,
      slug: draftId,
      diseaseId: form.diseaseId || undefined,
      diseaseSlug: selectedDisease?.slug,
      diseaseName: selectedDisease?.name ?? form.diseaseOrSymptom,
      diseaseOrSymptom: selectedDisease?.name ?? form.diseaseOrSymptom,
      category: form.category,
      nickname: form.nickname || "익명",
      title: form.title.trim(),
      summary: form.symptomDescription.trim(),
      content: form.symptomDescription.trim(),
      hospitalVisited: form.hospitalVisited,
      symptomDescription: form.symptomDescription.trim(),
      helpfulFoods: form.helpfulFoods.trim(),
      cautionFoods: form.cautionFoods.trim(),
      helpfulExercises: form.helpfulExercises.trim(),
      helpfulHabits: form.helpfulLifestyle.trim(),
      helpfulLifestyle: form.helpfulLifestyle.trim(),
      helpfulVideos: form.resourceLink.trim(),
      resourceLink: form.resourceLink.trim(),
      caution: form.caution.trim(),
      symptom: form.diseaseOrSymptom.trim(),
      relatedTags: [form.diseaseOrSymptom, form.category, selectedDisease?.category ?? ""].filter(Boolean),
      status: "pending",
      createdAt: now,
      updatedAt: now,
      isPersonalExperience: true,
      agreeToPublic: form.agreeToPublic,
      agreeMedicalDisclaimer: form.agreeMedicalDisclaimer,
    };

    const nextDrafts = [nextItem, ...drafts];
    saveDrafts(nextDrafts);
    setDrafts(nextDrafts);
    setForm(emptyForm);
    setExpandedDraftId(nextItem.draftId);
    setMessage("경험담이 임시 저장되었습니다. 실제 서비스에서는 관리자 검토 후 공개될 예정입니다.");
  }

  function deleteDraft(draftId: string) {
    if (!window.confirm("이 임시 경험담을 삭제하시겠습니까?")) return;
    const nextDrafts = drafts.filter((draft) => draft.draftId !== draftId);
    saveDrafts(nextDrafts);
    setDrafts(nextDrafts);
    if (expandedDraftId === draftId) setExpandedDraftId(null);
  }

  const canSubmit = Boolean(
    form.agreeToPublic && form.agreeMedicalDisclaimer && form.diseaseOrSymptom.trim() && form.title.trim(),
  );

  return (
    <div className="grid gap-8">
      <section className="rounded-lg border border-[#d9d1aa] bg-[#fffdf7] p-5 shadow-sm sm:p-7">
        <h2 className="text-2xl font-bold text-[#173d2d]">작성 전 꼭 확인해 주세요</h2>
        <ul className="mt-4 grid gap-2 text-sm leading-6 text-[#5b6146] sm:text-base">
          {[
            "이 글은 개인 경험담으로만 공유됩니다.",
            "의학적 진단이나 치료법처럼 작성하지 마세요.",
            "실명, 연락처, 주소, 주민등록번호, 병원 진료기록 등 민감한 개인정보는 입력하지 마세요.",
            "특정 병원, 의사, 제품을 과장되게 홍보하지 마세요.",
            "완치, 치료 보장, 무조건 효과 같은 표현은 사용하지 마세요.",
            "증상이 있거나 치료가 필요한 경우 반드시 의료기관 상담을 권장합니다.",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#7a6230]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={handleSubmit} className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm sm:p-7">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-[#1b4631]">
            질병 데이터에서 선택
            <select
              value={form.diseaseId}
              onChange={(event) => updateDisease(event.target.value)}
              className={inputClassName}
            >
              <option value="">직접 입력</option>
              {diseases.map((disease) => (
                <option key={disease.id} value={disease.id}>
                  {disease.name}
                </option>
              ))}
            </select>
          </label>
          <Input label="질병명 또는 증상" value={form.diseaseOrSymptom} onChange={(value) => updateField("diseaseOrSymptom", value)} required />
          <label className="grid gap-2 text-sm font-bold text-[#1b4631]">
            경험 카테고리
            <select value={form.category} onChange={(event) => updateField("category", event.target.value)} className={inputClassName}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-[#1b4631]">
            병원 진료 여부
            <select value={form.hospitalVisited} onChange={(event) => updateField("hospitalVisited", event.target.value)} className={inputClassName}>
              {hospitalOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <Input label="경험 제목" value={form.title} onChange={(value) => updateField("title", value)} required />
          <Input label="작성자 닉네임" value={form.nickname} onChange={(value) => updateField("nickname", value)} />
        </div>

        <div className="mt-5 grid gap-5">
          <Textarea label="증상 설명" value={form.symptomDescription} onChange={(value) => updateField("symptomDescription", value)} />
          <Textarea label="도움이 되었던 음식" value={form.helpfulFoods} onChange={(value) => updateField("helpfulFoods", value)} />
          <Textarea label="주의했던 음식" value={form.cautionFoods} onChange={(value) => updateField("cautionFoods", value)} />
          <Textarea label="도움이 되었던 운동 또는 활동" value={form.helpfulExercises} onChange={(value) => updateField("helpfulExercises", value)} />
          <Textarea label="도움이 되었던 생활습관" value={form.helpfulLifestyle} onChange={(value) => updateField("helpfulLifestyle", value)} />
          <Input label="참고했던 영상 또는 자료 링크" value={form.resourceLink} onChange={(value) => updateField("resourceLink", value)} />
          <Textarea label="주의할 점" value={form.caution} onChange={(value) => updateField("caution", value)} />
        </div>

        <div className="mt-6 grid gap-3">
          <Checkbox
            checked={form.agreeToPublic}
            onChange={(value) => updateField("agreeToPublic", value)}
            label="이 경험담을 다른 사용자에게 공개하는 것에 동의합니다."
          />
          <Checkbox
            checked={form.agreeMedicalDisclaimer}
            onChange={(value) => updateField("agreeMedicalDisclaimer", value)}
            label="이 글은 개인 경험담이며 의학적 진단, 치료, 처방이 아님을 확인합니다."
          />
        </div>

        <p className="mt-5 rounded-lg bg-[#f5f0e4] p-4 text-sm font-semibold leading-6 text-[#596344]">
          실명, 전화번호, 주소, 주민등록번호, 병원 진료기록 등 민감한 개인정보는 입력하지 마세요.
        </p>

        {phraseCheck.riskyMatches.length > 0 ? (
          <div className="mt-5 rounded-lg border border-[#efb8a5] bg-[#fff7f3] p-4 text-sm leading-6 text-[#714533]">
            <p className="font-extrabold text-[#9a3f25]">
              의료 효과를 단정하는 표현이 포함되어 있을 수 있습니다.
            </p>
            <p className="mt-2">
              개인 경험담은 치료법처럼 보이지 않도록 표현해 주세요. 수정 후 제출을 권장하지만, 제출 자체를 막지는 않습니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {phraseCheck.riskyMatches.map((phrase) => (
                <span key={phrase} className="rounded-full bg-[#fff0ea] px-3 py-1.5 text-xs font-bold text-[#9a4d3c]">
                  {phrase}
                </span>
              ))}
            </div>
            <p className="mt-3 rounded-lg bg-white p-3 font-semibold text-[#526257]">
              권장 표현: {phraseCheck.recommendation}
            </p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-6 w-full rounded-lg bg-[#174330] px-5 py-3 text-base font-bold text-white transition hover:bg-[#255f42] disabled:cursor-not-allowed disabled:bg-[#9eaa9d]"
        >
          경험담 임시 저장하기
        </button>
        {message ? <p className="mt-4 rounded-lg bg-[#eef6e9] p-4 text-sm font-bold text-[#2f6c48]">{message}</p> : null}
      </form>

      <section className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-2xl font-bold text-[#173d2d]">내가 작성한 임시 경험담</h2>
        <p className="mt-3 text-base leading-7 text-[#526257]">
          pending 경험담은 현재 이 브라우저의 임시 저장 목록에서만 확인됩니다.
        </p>
        {!mounted ? (
          <div className="mt-5 rounded-lg border border-[#dde6d7] bg-[#fffdf7] p-5 text-base text-[#526257]">
            임시 저장 목록을 확인 중입니다.
          </div>
        ) : drafts.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {drafts.map((draft) => (
              <article key={draft.draftId} className="rounded-lg border border-[#dde6d7] bg-[#fffdf7] p-5">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#f5f0e4] px-3 py-1.5 text-xs font-bold text-[#7a6230]">검토 대기</span>
                  <span className="rounded-full bg-[#eef6e9] px-3 py-1.5 text-xs font-bold text-[#2f6c48]">{draft.category}</span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-[#1b4631]">{draft.title}</h3>
                <p className="mt-2 text-sm font-bold text-[#2f6c48]">{draft.diseaseOrSymptom} · {draft.nickname}</p>
                <p className="mt-2 text-sm text-[#526257]">작성일: {formatDate(draft.createdAt)}</p>
                <p className="mt-2 text-sm text-[#526257]">공개 동의: {draft.agreeToPublic ? "동의" : "미동의"}</p>
                {expandedDraftId === draft.draftId ? (
                  <p className="mt-4 whitespace-pre-wrap rounded-lg bg-white p-4 text-sm leading-6 text-[#526257]">{draft.content || "작성된 상세 내용이 없습니다."}</p>
                ) : null}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => setExpandedDraftId(expandedDraftId === draft.draftId ? null : draft.draftId)} className="min-h-11 flex-1 rounded-lg border border-[#174330] px-4 py-2 text-sm font-bold text-[#174330]">
                    내용 확인
                  </button>
                  <button type="button" onClick={() => deleteDraft(draft.draftId)} className="min-h-11 flex-1 rounded-lg border border-[#b75f4b] px-4 py-2 text-sm font-bold text-[#9a4d3c]">
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-[#dde6d7] bg-[#fffdf7] p-5 text-base text-[#526257]">
            아직 임시 저장된 경험담이 없습니다.
          </div>
        )}
      </section>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#1b4631]">
      {label}
      <input required={required} value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName} />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#1b4631]">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClassName} min-h-28 resize-y leading-7`} />
    </label>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="flex gap-3 rounded-lg border border-[#dde6d7] bg-[#fffdf7] p-4 text-sm font-semibold leading-6 text-[#405347]">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 accent-[#2f6c48]" />
      <span>{label}</span>
    </label>
  );
}

function loadDrafts(): DraftExperience[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as DraftExperience[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDrafts(drafts: DraftExperience[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

function formatDate(value: string) {
  return value.replace("T", " ").slice(0, 16);
}

const inputClassName =
  "min-h-12 rounded-lg border border-[#c9d9c2] bg-[#fffdf7] px-4 py-3 text-base font-normal text-[#405347] outline-none transition focus:border-[#2f6c48] focus:ring-4 focus:ring-[#d9ead2]";
