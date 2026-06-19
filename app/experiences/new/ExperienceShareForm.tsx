"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { experienceCategories } from "@/data/healthMockData";

const referenceTypes = ["공공기관", "의료기관", "한방", "민간요법", "유튜브", "블로그", "사용자 경험"];
const reliabilityOptions = ["공식자료", "사용자 경험", "검증 필요"];

export default function ExperienceShareForm() {
  const [privacyStatus, setPrivacyStatus] = useState("비공개");
  const [consents, setConsents] = useState({
    noPersonalInfo: false,
    understandsReferenceOnly: false,
    understandsReview: false,
  });

  function handleMockSubmit(form: HTMLFormElement, mode: "draft" | "review") {
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    // TODO: Replace this mock handler with an authenticated API route that stores a review request in PostgreSQL.
    console.log("experience share mock submit", {
      mode,
      payload,
      privacyStatus,
      consents,
    });

    alert(mode === "draft" ? "임시 저장 mock 처리되었습니다." : "익명 공개 요청 mock 처리되었습니다.");
  }

  return (
    <form className="grid gap-6">
      <FormSection title="기본 정보" description="경험의 주제와 배경을 간단히 정리합니다.">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="title" label="제목" placeholder="예: 당뇨 관리 중 발목 상처로 병원을 방문한 경험" required />
          <SelectField name="category" label="경험 카테고리" options={experienceCategories} />
          <TextField name="relatedSymptoms" label="관련 증상" placeholder="예: 상처, 가려움, 혈당관리" />
          <TextField name="period" label="경험 기간" placeholder="예: 약 3주" />
          <TextField name="underlyingCondition" label="기저질환 여부" placeholder="예: 당뇨, 고혈압, 없음" />
          <TextField name="summary" label="요약" placeholder="경험을 한 문장으로 요약해주세요." />
        </div>
      </FormSection>

      <FormSection title="경험 내용" description="권유나 단정 표현보다 내가 겪은 과정과 느낀 점 중심으로 작성합니다.">
        <div className="grid gap-4">
          <TextareaField name="firstSymptoms" label="처음 증상" placeholder="처음 어떤 증상이 있었는지 적어주세요." />
          <TextareaField name="careMethods" label="시도해 본 관리 방법" placeholder="생활관리, 식이요법, 운동, 연고 사용 등을 적어주세요." />
          <TextareaField name="hospitalVisit" label="병원 방문 여부" placeholder="어떤 진료과를 방문했는지, 어떤 설명을 들었는지 적어주세요." />
          <TextareaField name="prescribedMedicines" label="처방받은 약/연고" placeholder="약 이름을 모르면 형태나 복용 방법만 적어도 됩니다." />
          <TextareaField name="helpfulPoints" label="도움이 됐다고 느낀 점" placeholder="개인적으로 도움이 됐다고 느낀 점을 적어주세요." />
          <TextareaField name="cautionPoints" label="주의해야 한다고 느낀 점" placeholder="다른 사람이 무리하게 따라 하지 않았으면 하는 점을 적어주세요." />
          <TextareaField name="messageToOthers" label="다른 사람에게 남기고 싶은 말" placeholder="비슷한 상황의 사람에게 참고가 될 만한 말을 적어주세요." />
        </div>
      </FormSection>

      <FormSection title="참고자료 첨부 mock" description="링크만 입력하는 mock UI입니다. 실제 파일 업로드와 검증은 추후 연결합니다.">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="referenceTitle" label="참고자료 제목" placeholder="예: 공공기관 상처 관리 안내" />
          <TextField name="referenceUrl" label="URL" placeholder="https://example.com" />
          <SelectField name="referenceType" label="자료 유형" options={referenceTypes} />
          <SelectField name="reliability" label="신뢰도 표시" options={reliabilityOptions} />
          <div className="md:col-span-2">
            <TextareaField name="referenceMemo" label="자료에 대한 내 메모" placeholder="왜 참고했는지, 어떤 점을 주의해야 하는지 적어주세요." />
          </div>
        </div>
      </FormSection>

      <PrivacySettingBox privacyStatus={privacyStatus} onChange={setPrivacyStatus} />

      <FormSection title="개인정보 확인" description="익명 공개 요청 전 개인정보와 의료 표현을 다시 확인합니다.">
        <div className="grid gap-3">
          <CheckboxField
            name="noPersonalInfo"
            label="이름, 전화번호, 주민번호, 병원 접수번호 등 개인정보를 포함하지 않았습니다."
            checked={consents.noPersonalInfo}
            onChange={(checked) => setConsents((current) => ({ ...current, noPersonalInfo: checked }))}
          />
          <CheckboxField
            name="understandsReferenceOnly"
            label="이 글은 의료 조언이 아니라 개인 경험임을 이해했습니다."
            checked={consents.understandsReferenceOnly}
            onChange={(checked) => setConsents((current) => ({ ...current, understandsReferenceOnly: checked }))}
          />
          <CheckboxField
            name="understandsReview"
            label="익명 공개 시 관리자 검토가 필요하다는 점을 이해했습니다."
            checked={consents.understandsReview}
            onChange={(checked) => setConsents((current) => ({ ...current, understandsReview: checked }))}
          />
        </div>
      </FormSection>

      <div className="flex flex-col gap-3 rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={(event) => {
            if (event.currentTarget.form) handleMockSubmit(event.currentTarget.form, "draft");
          }}
          className="min-h-12 rounded-lg border border-[#174330] bg-white px-6 text-base font-bold text-[#174330] transition hover:bg-[#eef6e9]"
        >
          임시 저장 mock
        </button>
        <button
          type="button"
          onClick={(event) => {
            if (event.currentTarget.form) handleMockSubmit(event.currentTarget.form, "review");
          }}
          className="min-h-12 rounded-lg bg-[#174330] px-6 text-base font-bold text-white transition hover:bg-[#255f42]"
        >
          익명 공개 요청 mock
        </button>
      </div>
    </form>
  );
}

function FormSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-2xl font-extrabold text-[#173d2d]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#526257]">{description}</p>
      </div>
      {children}
    </section>
  );
}

function TextField({ name, label, placeholder, required = false }: { name: string; label: string; placeholder: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#173d2d]">
      {label}
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="min-h-12 rounded-lg border border-[#c9d9c2] bg-[#fffdf7] px-4 text-base font-medium text-[#173d2d] outline-none transition placeholder:text-[#7a8a7f] focus:border-[#2f6c48] focus:ring-4 focus:ring-[#d9ead2]"
      />
    </label>
  );
}

function SelectField({ name, label, options }: { name: string; label: string; options: readonly string[] }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#173d2d]">
      {label}
      <select
        name={name}
        className="min-h-12 rounded-lg border border-[#c9d9c2] bg-[#fffdf7] px-4 text-base font-medium text-[#173d2d] outline-none transition focus:border-[#2f6c48] focus:ring-4 focus:ring-[#d9ead2]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextareaField({ name, label, placeholder }: { name: string; label: string; placeholder: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#173d2d]">
      {label}
      <textarea
        name={name}
        placeholder={placeholder}
        rows={4}
        className="resize-y rounded-lg border border-[#c9d9c2] bg-[#fffdf7] px-4 py-3 text-base font-medium leading-7 text-[#173d2d] outline-none transition placeholder:text-[#7a8a7f] focus:border-[#2f6c48] focus:ring-4 focus:ring-[#d9ead2]"
      />
    </label>
  );
}

function PrivacySettingBox({ privacyStatus, onChange }: { privacyStatus: string; onChange: (value: string) => void }) {
  const options = ["비공개", "익명 공개 요청", "공개하지 않음"];

  return (
    <section className="rounded-lg border border-[#d9d1aa] bg-[#fffdf7] p-5 shadow-sm sm:p-6">
      <h2 className="text-2xl font-extrabold text-[#173d2d]">공개 설정</h2>
      <p className="mt-2 text-sm leading-6 text-[#6a5530]">
        기본값은 비공개입니다. 공개 요청된 글은 개인정보와 단정적 의료 표현을 검토한 뒤 공개될 수 있습니다.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {options.map((option) => (
          <label
            key={option}
            className={`flex min-h-12 cursor-pointer items-center justify-center rounded-lg border px-4 text-sm font-extrabold transition ${
              privacyStatus === option
                ? "border-[#174330] bg-[#174330] text-white"
                : "border-[#c9d9c2] bg-white text-[#174330] hover:bg-[#eef6e9]"
            }`}
          >
            <input
              type="radio"
              name="privacyStatus"
              value={option}
              checked={privacyStatus === option}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {option}
          </label>
        ))}
      </div>
      {privacyStatus === "익명 공개 요청" ? (
        <p className="mt-4 rounded-lg bg-white p-4 text-sm font-semibold leading-7 text-[#714533]">
          익명 공개 요청된 글은 개인정보 포함 여부와 의료 표현을 검토한 뒤 공개될 수 있습니다.
        </p>
      ) : null}
    </section>
  );
}

function CheckboxField({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-[#e3dcc0] bg-[#fffdf7] p-4 text-sm font-bold leading-6 text-[#173d2d]">
      <input
        name={name}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-[#9db896] accent-[#174330]"
      />
      <span>{label}</span>
    </label>
  );
}
