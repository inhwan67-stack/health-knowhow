import Link from "next/link";
import MedicalDisclaimer from "../components/MedicalDisclaimer";
import { getDiseases } from "@/data/diseases";
import { getFoodGuides } from "@/data/foods";

export const dynamic = "force-dynamic";

export default function FoodsPage() {
  const diseases = getDiseases();
  const foodGuides = getFoodGuides();

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
          <Link href="/" className="text-sm font-bold text-[#2f6c48] hover:text-[#173d2d]">
            Health Knowhow
          </Link>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl">
            질병별 식이요법 및 식재료
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#355845]">
            질병별로 도움이 될 수 있는 식재료와 주의가 필요한 음식을 구분했습니다. 의료적 확정 표현이 아니라 참고용 가이드입니다.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {foodGuides.map((guide) => {
            const disease = diseases.find((item) => item.slug === guide.diseaseSlug);

            return (
              <article key={guide.diseaseSlug} className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm">
                <span className="rounded-full bg-[#eef6e9] px-3 py-1 text-xs font-bold text-[#2f6c48]">
                  {disease?.category}
                </span>
                <h2 className="mt-4 text-2xl font-bold text-[#1b4631]">{disease?.name}</h2>
                <p className="mt-3 text-base leading-7 text-[#526257]">{guide.note}</p>

                <div className="mt-5 grid gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#526257]">도움이 될 수 있음</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {guide.helpful.map((item) => (
                        <span key={item} className="rounded-full bg-[#eef6e9] px-3 py-1 text-sm font-bold text-[#2f6c48]">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#526257]">주의가 필요함</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {guide.avoid.map((item) => (
                        <span key={item} className="rounded-full bg-[#fff0ea] px-3 py-1 text-sm font-bold text-[#9a4d3c]">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <MedicalDisclaimer />
    </main>
  );
}
