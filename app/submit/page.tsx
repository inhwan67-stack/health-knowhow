import Link from "next/link";
import ExperienceForm from "../components/ExperienceForm";
import MedicalDisclaimer from "../components/MedicalDisclaimer";
import { getDiseases } from "@/data/diseases";

export const dynamic = "force-dynamic";

export default async function SubmitPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const diseases = getDiseases();
  const initialDiseaseSlug = firstParam(params.disease);

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
          <Link href="/" className="text-sm font-bold text-[#2f6c48] hover:text-[#173d2d]">
            Health Knowhow
          </Link>
          <h1 className="mt-5 text-3xl font-bold leading-tight text-[#123827] sm:text-5xl">
            건강관리 경험 공유하기
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#355845]">
            본인의 건강관리 경험을 공유해 주세요. 공유된 경험담은 다른 사용자에게 참고가 될 수 있지만,
            의학적 진단이나 치료법으로 사용되어서는 안 됩니다.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
        <ExperienceForm diseases={diseases} initialDiseaseSlug={initialDiseaseSlug} />
      </section>

      <MedicalDisclaimer />
    </main>
  );
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
