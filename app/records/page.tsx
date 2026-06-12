import type { Metadata } from "next";
import Link from "next/link";
import MedicalDisclaimer from "../components/MedicalDisclaimer";
import RecordsClient from "./RecordsClient";
import { getDiseaseBySlug } from "@/data/diseases";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "내 증상 기록 | Health Knowhow",
  description: "병원 방문 전 증상과 생활습관을 정리하는 참고용 기록 도구입니다.",
};

export default async function RecordsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const initialSymptomName = getInitialSymptomName(params);

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
          <Link href="/" className="text-sm font-bold text-[#2f6c48] hover:text-[#173d2d]">
            Health Knowhow
          </Link>
          <p className="mt-6 w-fit rounded-full border border-[#b7d0ac] bg-white px-3 py-1.5 text-sm font-bold text-[#2f6c48]">
            병원 방문 전 증상 정리
          </p>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl">
            내 증상 기록
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-[#355845]">
            병원 방문 전 증상과 생활습관을 정리해 두면 진료 상담에 도움이 될 수 있습니다. 이 기능은
            진단이나 치료를 대신하지 않습니다.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12">
        <RecordsClient initialSymptomName={initialSymptomName} />
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-12 sm:px-8 lg:px-12">
        <div className="rounded-lg border border-[#b7d0ac] bg-[#f4faf0] p-6 shadow-[0_12px_34px_rgba(31,75,54,0.08)] sm:p-7">
          <p className="text-sm font-extrabold text-[#2f6c48]">의료 정보 이용 안내</p>
          <p className="mt-3 text-base leading-8 text-[#405347] sm:text-lg">
            이 증상 기록 기능은 사용자가 자신의 증상과 생활습관을 정리하기 위한 도구입니다. 의학적 진단,
            치료, 처방을 대신하지 않으며, 증상이 있거나 치료가 필요한 경우 반드시 의사 또는 전문
            의료기관과 상담하시기 바랍니다.
          </p>
        </div>
      </section>

      <MedicalDisclaimer />
    </main>
  );
}

function getInitialSymptomName(params: Record<string, string | string[] | undefined>) {
  const symptom = firstParam(params.symptom);
  if (symptom) return symptom;

  const diseaseSlug = firstParam(params.disease);
  if (!diseaseSlug) return "";

  const disease = getDiseaseBySlug(diseaseSlug);
  return disease ? `${disease.name} 관련 증상` : "";
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
