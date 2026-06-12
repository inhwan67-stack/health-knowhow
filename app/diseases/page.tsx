import Link from "next/link";
import DiseaseCategoryExplorer from "../components/DiseaseCategoryExplorer";
import MedicalDisclaimer from "../components/MedicalDisclaimer";
import { getDiseases } from "@/data/diseases";

export const dynamic = "force-dynamic";

export default function DiseasesPage() {
  const diseases = getDiseases();

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
          <Link href="/" className="text-sm font-bold text-[#2f6c48] hover:text-[#173d2d]">
            Health Knowhow
          </Link>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl">
            질병별 건강정보
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#355845]">
            질병 카테고리를 선택하고 관련 질병의 증상, 원인, 생활관리, 식이요법, 참고 자료를 확인하세요.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {diseases.map((disease) => (
            <Link key={disease.slug} href={`/diseases/${disease.slug}`} className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="rounded-full bg-[#eef6e9] px-3 py-1 text-xs font-bold text-[#2f6c48]">
                {disease.category}
              </span>
              <h2 className="mt-4 text-2xl font-bold text-[#1b4631]">{disease.name}</h2>
              <p className="mt-3 text-base leading-7 text-[#526257]">{disease.summary}</p>
              <p className="mt-4 text-sm font-bold text-[#2f6c48]">상세 정보 보기</p>
            </Link>
          ))}
        </div>
      </section>

      <DiseaseCategoryExplorer />
      <MedicalDisclaimer />
    </main>
  );
}
