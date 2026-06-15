"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { HospitalVisitStatus, SymptomRecord } from "@/types/health";

const STORAGE_KEY = "healthKnowhowRecords";

const hospitalVisitOptions: HospitalVisitStatus[] = ["아직 방문하지 않음", "방문 예정", "이미 방문함"];

const defaultForm = {
  symptomName: "",
  startDate: "",
  severity: 5,
  worseTime: "",
  relatedFoods: "",
  medicines: "",
  lifestyleChanges: "",
  hospitalVisitStatus: "아직 방문하지 않음" as HospitalVisitStatus,
  memo: "",
  agreeToShare: false,
};

type RecordFormState = typeof defaultForm;

export default function RecordsClient({ initialSymptomName = "" }: { initialSymptomName?: string }) {
  const [form, setForm] = useState<RecordFormState>({ ...defaultForm, symptomName: initialSymptomName });
  const [records, setRecords] = useState<SymptomRecord[]>([]);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setRecords(loadStoredRecords());
    });
  }, []);

  const sortedRecords = useMemo(
    () =>
      [...records].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [records],
  );

  const updateRecords = (nextRecords: SymptomRecord[]) => {
    setRecords(nextRecords);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
  };

  const updateForm = <K extends keyof RecordFormState>(key: K, value: RecordFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextRecord: SymptomRecord = {
      ...form,
      id: createRecordId(),
      symptomName: form.symptomName.trim(),
      worseTime: form.worseTime.trim(),
      relatedFoods: form.relatedFoods.trim(),
      medicines: form.medicines.trim(),
      lifestyleChanges: form.lifestyleChanges.trim(),
      memo: form.memo.trim(),
      createdAt: new Date().toISOString(),
    };

    updateRecords([nextRecord, ...records]);
    setForm({ ...defaultForm, symptomName: initialSymptomName });
    setExpandedRecordId(nextRecord.id);
  };

  const deleteRecord = (recordId: string) => {
    if (!window.confirm("이 증상 기록을 삭제하시겠습니까?")) return;
    updateRecords(records.filter((record) => record.id !== recordId));
    if (expandedRecordId === recordId) setExpandedRecordId(null);
  };

  const clearRecords = () => {
    if (!window.confirm("저장된 모든 증상 기록을 삭제하시겠습니까?")) return;
    window.localStorage.removeItem(STORAGE_KEY);
    setRecords([]);
    setExpandedRecordId(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-3 border-b border-[#e7eee2] pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-[#2f6c48]">병원 상담 전 정리 도구</p>
            <h2 className="mt-2 text-2xl font-bold text-[#173d2d]">증상 기록 입력</h2>
          </div>
          <span className="w-fit rounded-full bg-[#eef6e9] px-3 py-1.5 text-xs font-bold text-[#2f6c48]">
            진단 기능 아님
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
          <Field label="증상명" hint="예: 속쓰림, 두통, 불면, 혈당 상승, 관절 통증">
            <input
              required
              value={form.symptomName}
              onChange={(event) => updateForm("symptomName", event.target.value)}
              placeholder="증상명 또는 관련 질병명을 입력하세요"
              className={inputClassName}
            />
          </Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="시작일">
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => updateForm("startDate", event.target.value)}
                className={inputClassName}
              />
            </Field>

            <Field label="병원 방문 여부">
              <select
                value={form.hospitalVisitStatus}
                onChange={(event) => updateForm("hospitalVisitStatus", event.target.value as HospitalVisitStatus)}
                className={inputClassName}
              >
                {hospitalVisitOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label={`불편감 정도: ${form.severity}`} hint="1 = 거의 불편하지 않음, 10 = 매우 심함">
            <input
              type="range"
              min="1"
              max="10"
              value={form.severity}
              onChange={(event) => updateForm("severity", Number(event.target.value))}
              className="h-3 w-full accent-[#2f6c48]"
            />
            <div className="mt-2 flex justify-between text-xs font-bold text-[#6a776e]">
              <span>1</span>
              <span>10</span>
            </div>
          </Field>

          <Field label="증상이 심해지는 시간대" hint="예: 아침, 점심, 저녁, 밤, 식후, 운동 후, 스트레스 받을 때">
            <input
              value={form.worseTime}
              onChange={(event) => updateForm("worseTime", event.target.value)}
              placeholder="증상이 심해지는 시간대나 상황"
              className={inputClassName}
            />
          </Field>

          <Field label="관련 음식" hint="예: 커피, 매운 음식, 밀가루, 단 음식, 술">
            <input
              value={form.relatedFoods}
              onChange={(event) => updateForm("relatedFoods", event.target.value)}
              placeholder="증상과 관련 있어 보였던 음식"
              className={inputClassName}
            />
          </Field>

          <Field label="복용 중인 약 또는 영양제">
            <input
              value={form.medicines}
              onChange={(event) => updateForm("medicines", event.target.value)}
              placeholder="복용 중인 약, 영양제, 복용 시간 등을 적어 주세요"
              className={inputClassName}
            />
          </Field>

          <Field label="생활습관 변화" hint="예: 수면 부족, 운동 부족, 야식, 스트레스, 과식">
            <input
              value={form.lifestyleChanges}
              onChange={(event) => updateForm("lifestyleChanges", event.target.value)}
              placeholder="최근 달라진 생활습관"
              className={inputClassName}
            />
          </Field>

          <Field label="메모">
            <textarea
              value={form.memo}
              onChange={(event) => updateForm("memo", event.target.value)}
              placeholder="의사에게 설명하고 싶은 내용을 자유롭게 적어 주세요"
              rows={5}
              className={`${inputClassName} min-h-32 resize-y`}
            />
          </Field>

          <label className="flex gap-3 rounded-lg border border-[#dde6d7] bg-[#fffdf7] p-4 text-sm font-semibold leading-6 text-[#405347]">
            <input
              type="checkbox"
              checked={form.agreeToShare}
              onChange={(event) => updateForm("agreeToShare", event.target.checked)}
              className="mt-1 h-4 w-4 accent-[#2f6c48]"
            />
            <span>이 기록을 개인 경험담으로 공개하는 것에 동의합니다.</span>
          </label>

          <button
            type="submit"
            className="min-h-12 rounded-lg bg-[#174330] px-5 py-3 text-base font-bold text-white shadow-sm transition hover:bg-[#255f42]"
          >
            증상 기록 저장하기
          </button>
        </form>
      </section>

      <aside className="grid gap-5 self-start">
        <GuideCard />

        <section className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
          <p className="text-sm font-extrabold text-[#2f6c48]">프리미엄 기능 안내</p>
          <h2 className="mt-2 text-xl font-bold text-[#173d2d]">기록을 더 쉽게 정리하기</h2>
          <p className="mt-3 rounded-lg bg-[#f5f0e4] p-4 text-sm font-bold leading-6 text-[#596344]">
            이 기능은 프리미엄 확장 기능으로 제공될 예정입니다.
          </p>
          <div className="mt-5 grid gap-3">
            {["PDF로 정리하기", "병원 상담 질문지 만들기", "증상 변화 그래프 보기"].map((label) => (
              <Link
                key={label}
                href="/premium"
                className="min-h-11 rounded-lg border border-[#bcd2b2] px-4 py-2.5 text-left text-sm font-bold text-[#174330] transition hover:bg-[#eef6e9]"
              >
                {label}
              </Link>
            ))}
          </div>
        </section>
      </aside>

      <section className="lg:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-[#2f6c48]">브라우저에 저장됨</p>
            <h2 className="mt-2 text-3xl font-bold text-[#173d2d]">저장된 증상 기록</h2>
          </div>
          {records.length > 0 ? (
            <button
              type="button"
              onClick={clearRecords}
              className="min-h-11 rounded-lg border border-[#b75f4b] px-4 py-2.5 text-sm font-bold text-[#9a4d3c] transition hover:bg-[#fff0ea]"
            >
              전체 기록 삭제
            </button>
          ) : null}
        </div>

        {sortedRecords.length > 0 ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sortedRecords.map((record) => {
              const isExpanded = expandedRecordId === record.id;

              return (
                <article key={record.id} className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#2f6c48]">{record.hospitalVisitStatus}</p>
                      <h3 className="mt-2 text-xl font-bold text-[#173d2d]">{record.symptomName}</h3>
                    </div>
                    <span className="rounded-full bg-[#eef6e9] px-3 py-1.5 text-xs font-bold text-[#2f6c48]">
                      {record.severity}/10
                    </span>
                  </div>

                  <dl className="mt-5 grid gap-3 text-sm leading-6 text-[#526257]">
                    <RecordRow label="시작일" value={record.startDate || "미입력"} />
                    <RecordRow label="심해지는 때" value={record.worseTime || "미입력"} />
                    <RecordRow label="관련 음식" value={record.relatedFoods || "미입력"} />
                    <RecordRow label="메모" value={summarize(record.memo)} />
                    <RecordRow label="작성일" value={formatDateTime(record.createdAt)} />
                  </dl>

                  {isExpanded ? (
                    <div className="mt-5 rounded-lg bg-[#fffdf7] p-4 text-sm leading-7 text-[#526257]">
                      <p>
                        <strong className="text-[#173d2d]">복용 중인 약 또는 영양제:</strong>{" "}
                        {record.medicines || "미입력"}
                      </p>
                      <p className="mt-2">
                        <strong className="text-[#173d2d]">생활습관 변화:</strong>{" "}
                        {record.lifestyleChanges || "미입력"}
                      </p>
                      <p className="mt-2">
                        <strong className="text-[#173d2d]">공개 동의:</strong>{" "}
                        {record.agreeToShare ? "동의함" : "동의하지 않음"}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap">
                        <strong className="text-[#173d2d]">전체 메모:</strong> {record.memo || "미입력"}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                      className="min-h-11 flex-1 rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-bold text-[#174330] transition hover:bg-[#eef6e9]"
                    >
                      {isExpanded ? "접기" : "자세히 보기"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRecord(record.id)}
                      className="min-h-11 flex-1 rounded-lg border border-[#b75f4b] px-4 py-2.5 text-sm font-bold text-[#9a4d3c] transition hover:bg-[#fff0ea]"
                    >
                      삭제
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-[#dde6d7] bg-white p-6 text-base leading-7 text-[#526257] shadow-sm">
            저장된 증상 기록이 없습니다. 병원 상담 전에 설명할 내용을 짧게라도 기록해 두면 도움이 될 수 있습니다.
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-[#173d2d]">{label}</span>
      {hint ? <span className="mt-1 block text-xs leading-5 text-[#6a776e]">{hint}</span> : null}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function GuideCard() {
  const items = [
    "증상이 언제 시작되었는지",
    "증상이 얼마나 자주 나타나는지",
    "통증이나 불편감 정도",
    "증상을 악화시키는 음식이나 상황",
    "복용 중인 약",
    "과거 병력",
    "가족력",
    "최근 체중 변화",
    "수면 상태",
    "스트레스 정도",
  ];

  return (
    <section className="rounded-lg border border-[#cfe0c7] bg-[#f4faf0] p-5 shadow-sm">
      <p className="text-sm font-extrabold text-[#2f6c48]">진료 전 참고자료</p>
      <h2 className="mt-2 text-xl font-bold text-[#173d2d]">병원 방문 전 이런 내용을 정리해 보세요</h2>
      <ul className="mt-5 grid gap-2 text-sm leading-6 text-[#405347]">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#2f6c48]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 rounded-lg bg-white p-4 text-sm font-semibold leading-6 text-[#526257]">
        정리한 내용은 의사와 상담할 때 참고자료로 활용할 수 있습니다.
      </p>
    </section>
  );
}

function RecordRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[92px_1fr] gap-3">
      <dt className="font-bold text-[#173d2d]">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function createRecordId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function summarize(value: string) {
  if (!value) return "미입력";
  return value.length > 52 ? `${value.slice(0, 52)}...` : value;
}

function formatDateTime(value: string) {
  return value.replace("T", " ").slice(0, 16);
}

const inputClassName =
  "min-h-12 w-full rounded-lg border border-[#cbdac4] bg-white px-4 py-3 text-base text-[#173d2d] outline-none transition placeholder:text-[#8a968d] focus:border-[#2f6c48] focus:ring-4 focus:ring-[#dbeed2]";

function loadStoredRecords() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as SymptomRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
