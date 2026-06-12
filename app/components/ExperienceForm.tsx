"use client";

import { FormEvent, useState } from "react";
import type { Experience } from "@/data/types";

const emptyForm = {
  diseaseOrSymptom: "",
  title: "",
  symptomDescription: "",
  helpfulLifestyle: "",
  helpfulFoods: "",
  resourceLink: "",
  caution: "",
  nickname: "",
};

export default function ExperienceForm({ initialExperiences }: { initialExperiences: Experience[] }) {
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState<Experience[]>(initialExperiences);

  function updateField(name: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.diseaseOrSymptom.trim() || !form.title.trim()) return;

    const nextItem: Experience = {
      id: `local-${Date.now()}`,
      diseaseOrSymptom: form.diseaseOrSymptom,
      title: form.title,
      summary: form.symptomDescription,
      content: form.symptomDescription,
      symptomDescription: form.symptomDescription,
      helpfulLifestyle: form.helpfulLifestyle,
      helpfulHabits: form.helpfulLifestyle,
      helpfulFoods: form.helpfulFoods,
      resourceLink: form.resourceLink,
      caution: form.caution,
      nickname: form.nickname || "익명",
    };

    setItems((current) => [nextItem, ...current]);
    setForm(emptyForm);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <form onSubmit={handleSubmit} className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm sm:p-7">
        <div className="grid gap-4">
          <Input label="질병명 또는 증상" value={form.diseaseOrSymptom} onChange={(value) => updateField("diseaseOrSymptom", value)} required />
          <Input label="경험 제목" value={form.title} onChange={(value) => updateField("title", value)} required />
          <Textarea label="증상 설명" value={form.symptomDescription} onChange={(value) => updateField("symptomDescription", value)} />
          <Textarea label="도움이 되었던 생활습관" value={form.helpfulLifestyle} onChange={(value) => updateField("helpfulLifestyle", value)} />
          <Textarea label="도움이 되었던 음식" value={form.helpfulFoods} onChange={(value) => updateField("helpfulFoods", value)} />
          <Input label="도움이 되었던 영상 또는 자료 링크" value={form.resourceLink} onChange={(value) => updateField("resourceLink", value)} />
          <Textarea label="주의할 점" value={form.caution} onChange={(value) => updateField("caution", value)} />
          <Input label="작성자 닉네임" value={form.nickname} onChange={(value) => updateField("nickname", value)} />
        </div>
        <button
          type="submit"
          className="mt-6 w-full rounded-lg bg-[#174330] px-5 py-3 text-base font-bold text-white transition hover:bg-[#255f42] focus:outline-none focus:ring-4 focus:ring-[#b9d8ab]"
        >
          경험 등록하기
        </button>
      </form>

      <div className="rounded-lg border border-[#dde6d7] bg-[#fffdf7] p-5 shadow-sm sm:p-7">
        <h2 className="text-2xl font-bold text-[#173d2d]">등록된 경험담</h2>
        <div className="mt-5 grid gap-4">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-[#dde6d7] bg-white p-5">
              <p className="text-sm font-bold text-[#2f6c48]">
                {item.diseaseOrSymptom} · {item.nickname}
              </p>
              <h3 className="mt-2 text-lg font-bold text-[#1b4631]">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#526257]">{item.symptomDescription}</p>
              <p className="mt-3 text-sm leading-6 text-[#526257]">
                <strong className="text-[#1b4631]">도움:</strong> {item.helpfulLifestyle}
              </p>
            </article>
          ))}
        </div>
      </div>
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
      <input
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-[#c9d9c2] bg-[#fffdf7] px-4 py-3 text-base font-normal text-[#405347] outline-none transition focus:border-[#2f6c48] focus:ring-4 focus:ring-[#d9ead2]"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#1b4631]">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-24 rounded-lg border border-[#c9d9c2] bg-[#fffdf7] px-4 py-3 text-base font-normal leading-7 text-[#405347] outline-none transition focus:border-[#2f6c48] focus:ring-4 focus:ring-[#d9ead2]"
      />
    </label>
  );
}
