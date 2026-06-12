import Link from "next/link";
import MedicalDisclaimer from "../components/MedicalDisclaimer";
import { getExperiences } from "@/data/experiences";

export const dynamic = "force-dynamic";

export default function RemediesPage() {
  const experiences = getExperiences();

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
          <Link href="/" className="text-sm font-bold text-[#2f6c48] hover:text-[#173d2d]">
            Health Knowhow
          </Link>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl">
            생활관리 경험 보기
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#355845]">
            개인 경험은 참고자료로만 확인하고, 증상이 있거나 치료가 필요한 경우 전문 의료기관 상담을 우선하세요.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {experiences.map((experience) => (
            <article id={experience.id} key={experience.id} className="scroll-mt-28 rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm">
              <span className="rounded-full bg-[#f5f0e4] px-3 py-1.5 text-xs font-bold text-[#596344]">
                개인 경험담
              </span>
              <p className="mt-5 text-sm font-bold text-[#2f6c48]">
                {experience.diseaseOrSymptom} · {experience.nickname}
              </p>
              <h2 className="mt-2 text-xl font-bold text-[#1b4631]">{experience.title}</h2>
              <p className="mt-3 text-base leading-7 text-[#526257]">{experience.symptomDescription}</p>
              <div className="mt-4 rounded-lg bg-[#fffdf7] p-4 text-sm leading-6 text-[#526257]">
                <p>
                  <strong className="text-[#1b4631]">생활습관:</strong> {experience.helpfulLifestyle}
                </p>
                <p className="mt-2">
                  <strong className="text-[#1b4631]">음식:</strong> {experience.helpfulFoods}
                </p>
                <p className="mt-2">
                  <strong className="text-[#1b4631]">주의:</strong> {experience.caution}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <MedicalDisclaimer />
    </main>
  );
}
