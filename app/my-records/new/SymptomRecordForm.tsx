"use client";

import { FormEvent, useState } from "react";

type ShareSetting = "private" | "anonymous_review" | "not_shared";

type RecordFormState = {
  title: string;
  bodyPart: string;
  symptomType: string;
  startedAt: string;
  description: string;
  underlyingConditions: string;
  painLevel: number;
  hasItch: boolean;
  hasSwelling: boolean;
  hasDischarge: boolean;
  hospitalName: string;
  specialty: string;
  visitDate: string;
  doctorNote: string;
  treatmentSummary: string;
  nextVisitDate: string;
  medicineName: string;
  medicineType: string;
  medicineFrequency: string;
  medicineTiming: string;
  medicinePeriod: string;
  medicineMemo: string;
  referenceTitle: string;
  referenceUrl: string;
  referenceType: string;
  referenceMemo: string;
  reliabilityLevel: string;
  shareSetting: ShareSetting;
};

const initialForm: RecordFormState = {
  title: "",
  bodyPart: "",
  symptomType: "",
  startedAt: "",
  description: "",
  underlyingConditions: "",
  painLevel: 5,
  hasItch: false,
  hasSwelling: false,
  hasDischarge: false,
  hospitalName: "",
  specialty: "",
  visitDate: "",
  doctorNote: "",
  treatmentSummary: "",
  nextVisitDate: "",
  medicineName: "",
  medicineType: "먹는 약",
  medicineFrequency: "",
  medicineTiming: "",
  medicinePeriod: "",
  medicineMemo: "",
  referenceTitle: "",
  referenceUrl: "",
  referenceType: "공공기관",
  referenceMemo: "",
  reliabilityLevel: "공식자료",
  shareSetting: "private",
};

export default function SymptomRecordForm() {
  const [form, setForm] = useState<RecordFormState>(initialForm);

  function update<K extends keyof RecordFormState>(key: K, value: RecordFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO: Replace this mock handler with a POST request or Server Action when PostgreSQL is connected.
    console.log("Symptom record mock submit", form);
    alert("기록 저장 mock 처리되었습니다. 실제 DB 저장은 아직 연결하지 않았습니다.");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8">
      <MedicalNoticeBox />
      <SymptomBasicInfoForm form={form} update={update} />
      <SymptomPhotoUploadMock />
      <MedicalVisitForm form={form} update={update} />
      <PrescriptionUploadMock />
      <MedicineRecordForm form={form} update={update} />
      <ReferenceAttachForm form={form} update={update} />
      <PrivacySettingBox value={form.shareSetting} onChange={(value) => update("shareSetting", value)} />
      <div className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
        <button
          type="submit"
          className="min-h-12 w-full rounded-lg bg-[#174330] px-5 py-3 text-base font-extrabold text-white shadow-sm transition hover:bg-[#255f42]"
        >
          기록 저장하기
        </button>
      </div>
    </form>
  );
}

function MedicalNoticeBox() {
  return (
    <section className="rounded-lg border border-[#efb8a5] bg-[#fff7f3] p-5 shadow-sm sm:p-6">
      <p className="text-sm font-extrabold text-[#9a3f25]">의료 고지</p>
      <p className="mt-3 text-base font-semibold leading-7 text-[#714533]">
        이 기록은 의료 진단이 아니라 개인 건강기록입니다. 증상이 심하거나 오래 지속되거나 당뇨 등 기저질환이 있는 경우 의료진과 상담하세요.
      </p>
    </section>
  );
}

export function SymptomBasicInfoForm({
  form,
  update,
}: {
  form: RecordFormState;
  update: <K extends keyof RecordFormState>(key: K, value: RecordFormState[K]) => void;
}) {
  return (
    <SectionCard eyebrow="기본 정보" title="증상의 시작과 현재 상태를 정리합니다">
      <div className="grid gap-5 md:grid-cols-2">
        <TextInput label="기록 제목" value={form.title} onChange={(value) => update("title", value)} required />
        <TextInput label="증상 부위" value={form.bodyPart} onChange={(value) => update("bodyPart", value)} placeholder="예: 발등, 손목, 허리" />
        <TextInput label="증상 종류" value={form.symptomType} onChange={(value) => update("symptomType", value)} placeholder="예: 통증, 가려움, 발진, 상처" />
        <DateInput label="발생일" value={form.startedAt} onChange={(value) => update("startedAt", value)} />
      </div>
      <Textarea label="증상 설명" value={form.description} onChange={(value) => update("description", value)} />
      <TextInput label="기저질환 여부" value={form.underlyingConditions} onChange={(value) => update("underlyingConditions", value)} placeholder="예: 당뇨, 고혈압, 없음" />
      <div className="rounded-lg border border-[#dde6d7] bg-[#fffdf7] p-4">
        <label htmlFor="painLevel" className="text-sm font-extrabold text-[#173d2d]">통증 정도: {form.painLevel}</label>
        <input
          id="painLevel"
          type="range"
          min="0"
          max="10"
          value={form.painLevel}
          onChange={(event) => update("painLevel", Number(event.target.value))}
          className="mt-4 h-3 w-full accent-[#2f6c48]"
        />
        <div className="mt-2 flex justify-between text-xs font-bold text-[#6a776e]">
          <span>0</span>
          <span>10</span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Checkbox label="가려움 여부" checked={form.hasItch} onChange={(value) => update("hasItch", value)} />
        <Checkbox label="붓기 여부" checked={form.hasSwelling} onChange={(value) => update("hasSwelling", value)} />
        <Checkbox label="진물 여부" checked={form.hasDischarge} onChange={(value) => update("hasDischarge", value)} />
      </div>
    </SectionCard>
  );
}

export function SymptomPhotoUploadMock() {
  return (
    <SectionCard eyebrow="증상 사진" title="사진 경과를 날짜별로 남길 수 있도록 준비합니다">
      <div className="grid gap-4 md:grid-cols-3">
        {["처음 사진", "경과 사진", "치료 후 사진"].map((label) => (
          <UploadMockCard key={label} title={label} description="실제 이미지 업로드는 아직 연결하지 않았습니다." />
        ))}
      </div>
      <p className="rounded-lg bg-[#f5f0e4] p-4 text-sm font-semibold leading-6 text-[#596344]">
        증상 사진은 기본적으로 비공개 저장됩니다. 얼굴, 주민등록번호, 병원번호 등 식별정보가 포함되지 않도록 주의하세요.
      </p>
    </SectionCard>
  );
}

export function MedicalVisitForm({
  form,
  update,
}: {
  form: RecordFormState;
  update: <K extends keyof RecordFormState>(key: K, value: RecordFormState[K]) => void;
}) {
  return (
    <SectionCard eyebrow="병원 방문 기록" title="진료 때 들은 설명과 다음 방문 일정을 정리합니다">
      <div className="grid gap-5 md:grid-cols-3">
        <TextInput label="병원명" value={form.hospitalName} onChange={(value) => update("hospitalName", value)} />
        <TextInput label="진료과" value={form.specialty} onChange={(value) => update("specialty", value)} placeholder="예: 피부과, 내과" />
        <DateInput label="방문일" value={form.visitDate} onChange={(value) => update("visitDate", value)} />
      </div>
      <Textarea label="의사에게 들은 설명" value={form.doctorNote} onChange={(value) => update("doctorNote", value)} />
      <Textarea label="받은 치료 또는 시술" value={form.treatmentSummary} onChange={(value) => update("treatmentSummary", value)} />
      <DateInput label="다음 방문 예정일" value={form.nextVisitDate} onChange={(value) => update("nextVisitDate", value)} />
    </SectionCard>
  );
}

export function PrescriptionUploadMock() {
  return (
    <SectionCard eyebrow="처방전/약 봉투" title="문서와 약 사진을 증상 기록에 연결할 수 있게 준비합니다">
      <div className="grid gap-4 md:grid-cols-3">
        <UploadMockCard title="처방전 사진 업로드 mock" description="OCR 추출은 추후 연결 예정" />
        <UploadMockCard title="약 봉투 사진 업로드 mock" description="개인정보 마스킹 필요" />
        <UploadMockCard title="약 사진 업로드 mock" description="약 이름 확인용 mock" />
      </div>
      <p className="rounded-lg bg-[#fff7f3] p-4 text-sm font-semibold leading-6 text-[#714533]">
        처방전과 약 봉투에는 개인정보가 포함될 수 있으므로 공개 전 개인정보 마스킹과 관리자 검토가 필요합니다.
      </p>
    </SectionCard>
  );
}

export function MedicineRecordForm({
  form,
  update,
}: {
  form: RecordFormState;
  update: <K extends keyof RecordFormState>(key: K, value: RecordFormState[K]) => void;
}) {
  return (
    <SectionCard eyebrow="복용약/연고 기록" title="복용 중인 약과 외용제를 함께 기록합니다">
      <div className="grid gap-5 md:grid-cols-2">
        <TextInput label="약 이름" value={form.medicineName} onChange={(value) => update("medicineName", value)} />
        <SelectInput label="약 종류" value={form.medicineType} onChange={(value) => update("medicineType", value)} options={["먹는 약", "연고", "소독약", "기타"]} />
        <TextInput label="복용 횟수" value={form.medicineFrequency} onChange={(value) => update("medicineFrequency", value)} placeholder="예: 하루 2회" />
        <TextInput label="복용 시간" value={form.medicineTiming} onChange={(value) => update("medicineTiming", value)} placeholder="예: 아침/저녁, 식후" />
        <TextInput label="복용 기간" value={form.medicinePeriod} onChange={(value) => update("medicinePeriod", value)} placeholder="예: 7일" />
      </div>
      <Textarea label="메모" value={form.medicineMemo} onChange={(value) => update("medicineMemo", value)} />
    </SectionCard>
  );
}

export function ReferenceAttachForm({
  form,
  update,
}: {
  form: RecordFormState;
  update: <K extends keyof RecordFormState>(key: K, value: RecordFormState[K]) => void;
}) {
  return (
    <SectionCard eyebrow="참고자료 첨부" title="찾아본 자료를 출처와 신뢰도 기준으로 구분합니다">
      <div className="grid gap-5 md:grid-cols-2">
        <TextInput label="참고자료 제목" value={form.referenceTitle} onChange={(value) => update("referenceTitle", value)} />
        <TextInput label="URL" value={form.referenceUrl} onChange={(value) => update("referenceUrl", value)} placeholder="https://..." />
        <SelectInput
          label="자료 유형"
          value={form.referenceType}
          onChange={(value) => update("referenceType", value)}
          options={["공공기관", "의료기관", "한방", "민간요법", "유튜브", "블로그", "사용자 경험"]}
        />
        <SelectInput
          label="신뢰도 표시"
          value={form.reliabilityLevel}
          onChange={(value) => update("reliabilityLevel", value)}
          options={["공식자료", "사용자 경험", "검증 필요"]}
        />
      </div>
      <Textarea label="메모" value={form.referenceMemo} onChange={(value) => update("referenceMemo", value)} />
    </SectionCard>
  );
}

export function PrivacySettingBox({ value, onChange }: { value: ShareSetting; onChange: (value: ShareSetting) => void }) {
  const options: { value: ShareSetting; label: string; description: string }[] = [
    { value: "private", label: "비공개", description: "나만 볼 수 있는 개인 기록입니다. 기본값입니다." },
    { value: "anonymous_review", label: "익명 공개 요청", description: "관리자 검토 후 개인 식별정보 없이 공개될 수 있습니다." },
    { value: "not_shared", label: "공개하지 않음", description: "공유 요청 대상에서 제외합니다." },
  ];

  return (
    <SectionCard eyebrow="공개 설정" title="개인 기록은 기본적으로 비공개입니다">
      <div className="grid gap-3 md:grid-cols-3">
        {options.map((option) => (
          <label
            key={option.value}
            className={`rounded-lg border p-4 ${
              value === option.value ? "border-[#174330] bg-[#eef6e9]" : "border-[#dde6d7] bg-white"
            }`}
          >
            <input
              type="radio"
              name="shareSetting"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="h-4 w-4 accent-[#2f6c48]"
            />
            <span className="ml-2 text-sm font-extrabold text-[#173d2d]">{option.label}</span>
            <p className="mt-3 text-sm leading-6 text-[#526257]">{option.description}</p>
          </label>
        ))}
      </div>
    </SectionCard>
  );
}

function SectionCard({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-6">
        <p className="text-sm font-extrabold text-[#2f6c48]">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-extrabold leading-8 text-[#173d2d]">{title}</h2>
      </div>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-extrabold text-[#173d2d]">
      {label}
      <input required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={inputClassName} />
    </label>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-extrabold text-[#173d2d]">
      {label}
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName} />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-extrabold text-[#173d2d]">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className={`${inputClassName} min-h-28 resize-y leading-7`} />
    </label>
  );
}

function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="grid gap-2 text-sm font-extrabold text-[#173d2d]">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-[#dde6d7] bg-[#fffdf7] p-4 text-sm font-semibold leading-6 text-[#405347]">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 accent-[#2f6c48]" />
      <span>{label}</span>
    </label>
  );
}

function UploadMockCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#bcd2b2] bg-[#fffdf7] p-5 text-center">
      <p className="text-base font-extrabold text-[#173d2d]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#6a776e]">{description}</p>
      <button type="button" className="mt-4 rounded-lg border border-[#bcd2b2] bg-white px-4 py-2 text-sm font-bold text-[#174330]">
        업로드 mock
      </button>
    </div>
  );
}

const inputClassName =
  "min-h-12 w-full rounded-lg border border-[#c9d9c2] bg-[#fffdf7] px-4 py-3 text-base font-normal text-[#173d2d] outline-none transition placeholder:text-[#7a8a7f] focus:border-[#2f6c48] focus:ring-4 focus:ring-[#d9ead2]";
