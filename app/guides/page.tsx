import type { Metadata } from "next";
import Link from "next/link";
import MedicalDisclaimer from "../components/MedicalDisclaimer";
import GuidesClient from "./GuidesClient";
import { getGuideCategories, getGuides } from "@/data/guides";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "건강관리 가이드 | Health Knowhow",
  description: "증상과 질병별로 생활관리, 식이요법, 운동요법, 병원 방문 전 체크리스트를 정리한 참고자료입니다.",
};

export default function GuidesPage() {
  const guides = getGuides();
  const categories = getGuideCategories();

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
          <Link href="/" className="text-sm font-bold text-[#2f6c48] hover:text-[#173d2d]">
            Health Knowhow
          </Link>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl">
            건강관리 가이드
          </h1>
          <p className="mt-4 max-w-4xl text-lg leading-8 text-[#355845]">
            증상과 질병별로 생활관리, 식이요법, 운동요법, 병원 방문 전 체크리스트를 정리한 참고자료입니다.
          </p>
          <p className="mt-5 max-w-4xl rounded-lg border border-[#b7d0ac] bg-white/85 p-4 text-sm font-semibold leading-6 text-[#526257]">
            가이드는 의학적 진단, 치료, 처방을 대신하지 않습니다. 증상이 심하거나 지속되는 경우 의료기관 상담을 권장합니다.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12">
        <GuidesClient guides={guides} categories={categories} />
      </section>

      <MedicalDisclaimer />
    </main>
  );
}
