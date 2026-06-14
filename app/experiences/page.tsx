import type { Metadata } from "next";
import Link from "next/link";
import ExperienceDisclaimer from "../components/ExperienceDisclaimer";
import MedicalDisclaimer from "../components/MedicalDisclaimer";
import ExperiencesClient from "./ExperiencesClient";
import { getApprovedExperiences } from "@/data/experiences";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "건강관리 경험담 | Health Knowhow",
  description: "질병과 증상별 개인 건강관리 경험담을 확인하세요. 경험담은 의학적 진단이나 치료법이 아닌 참고자료입니다.",
};

export default function ExperiencesPage() {
  const experiences = getApprovedExperiences();

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
          <Link href="/" className="text-sm font-bold text-[#2f6c48] hover:text-[#173d2d]">
            Health Knowhow
          </Link>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl">
            건강관리 경험담
          </h1>
          <p className="mt-4 max-w-4xl text-lg leading-8 text-[#355845]">
            개인 경험담은 작성자의 주관적 경험이며, 의학적 진단이나 치료법이 아닙니다. 비슷한 증상을 겪은 사람들의
            생활관리 경험을 참고자료로 확인해 보세요.
          </p>
          <Link
            href="/submit"
            className="mt-7 inline-flex min-h-12 items-center rounded-lg bg-[#174330] px-5 py-3 text-base font-bold text-white shadow-sm transition hover:bg-[#255f42]"
          >
            경험담 공유하기
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12">
        <ExperiencesClient experiences={experiences} />
      </section>

      <ExperienceDisclaimer />
      <MedicalDisclaimer />
    </main>
  );
}
