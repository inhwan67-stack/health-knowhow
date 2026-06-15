import Link from "next/link";
import HomeSearch from "../components/HomeSearch";
import MedicalDisclaimer from "../components/MedicalDisclaimer";
import SearchResultsTabs from "../components/SearchResultsTabs";
import { searchAffiliateProducts } from "@/data/affiliateProducts";
import { getDiseases } from "@/data/diseases";
import { getDetailedDietGuides } from "@/data/dietGuides";
import { getExerciseGuides } from "@/data/exercises";
import { getApprovedExperiences } from "@/data/experiences";
import { getFoodGuides } from "@/data/foods";
import { getSymptoms } from "@/data/symptoms";
import { getVideos } from "@/data/videos";
import { searchExternalMedicalSources } from "@/services/medicalSources";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const diseases = getDiseases();
  const foodGuides = getFoodGuides();
  const detailedDietGuides = getDetailedDietGuides();
  const exerciseGuides = getExerciseGuides();
  const videos = getVideos();
  const experiences = getApprovedExperiences();
  const symptoms = getSymptoms();
  const affiliateProducts = searchAffiliateProducts(q);
  const externalResources = await searchExternalMedicalSources(q);

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
          <Link href="/" className="text-sm font-bold text-[#2f6c48] hover:text-[#173d2d]">
            Health Knowhow
          </Link>
          <h1 className="mt-5 text-3xl font-bold leading-tight text-[#123827] sm:text-5xl">
            건강정보 통합 검색
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#355845]">
            질병명이나 증상을 입력하면 관련 질병정보, 식이요법, 영상자료, 경험담을 등록된 건강정보에서 함께 찾아봅니다.
          </p>
          <div className="mt-6 max-w-4xl">
            <HomeSearch />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
        <SearchResultsTabs
          query={q}
          diseases={diseases}
          foodGuides={foodGuides}
          detailedDietGuides={detailedDietGuides}
          exerciseGuides={exerciseGuides}
          videos={videos}
          experiences={experiences}
          symptoms={symptoms}
          affiliateProducts={affiliateProducts}
          externalResources={externalResources}
        />
      </section>

      <MedicalDisclaimer />
    </main>
  );
}
