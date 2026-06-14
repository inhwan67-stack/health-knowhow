import AdminShell from "../AdminShell";
import DiseaseAdminClient from "./DiseaseAdminClient";
import { getArticles } from "@/data/articles";
import { getDetailedDietGuides } from "@/data/dietGuides";
import { getDiseases } from "@/data/diseases";
import { getExerciseGuides } from "@/data/exercises";

export const dynamic = "force-dynamic";

export default function AdminDiseasesPage() {
  const exercises = getExerciseGuides();
  const dietGuides = getDetailedDietGuides();
  const articles = getArticles();
  const rows = getDiseases().map((disease) => ({
    disease,
    hasExerciseGuide: exercises.some((guide) => guide.diseaseId === disease.id || guide.diseaseId === disease.slug),
    hasDietGuide: dietGuides.some((guide) => guide.diseaseId === disease.id || guide.diseaseId === disease.slug),
    hasExternalResource: articles.some((article) => article.diseaseId === disease.id || article.diseaseSlug === disease.slug),
  }));

  return (
    <AdminShell>
      <div className="grid gap-6">
        <section className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
          <p className="text-sm font-extrabold text-[#2f6c48]">질병 데이터 관리 mock</p>
          <h2 className="mt-2 text-3xl font-bold text-[#173d2d]">질병 목록과 연결 데이터 확인</h2>
          <p className="mt-3 text-base leading-7 text-[#526257]">
            현재 수정/삭제는 제공하지 않고 CSV 기반 데이터의 연결 상태를 확인하는 mock 화면입니다.
          </p>
        </section>
        <DiseaseAdminClient rows={rows} />
      </div>
    </AdminShell>
  );
}
