import AdminDashboardClient from "./AdminDashboardClient";
import AdminShell from "./AdminShell";
import { affiliateProducts } from "@/data/affiliateProducts";
import { getArticles } from "@/data/articles";
import { clinics } from "@/data/clinics";
import { getDetailedDietGuides } from "@/data/dietGuides";
import { getDiseases } from "@/data/diseases";
import { getExerciseGuides } from "@/data/exercises";
import { getExperiences } from "@/data/experiences";
import { getSymptoms } from "@/data/symptoms";
import { getVideos } from "@/data/videos";
import { getDataSourceStatus } from "@/services/dataSource";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const diseases = getDiseases();
  const symptoms = getSymptoms();
  const experiences = getExperiences();
  const videos = getVideos();
  const articles = getArticles();
  const exercises = getExerciseGuides();
  const dietGuides = getDetailedDietGuides();
  const databaseStatus = getDataSourceStatus();

  const metrics = [
    { label: "전체 질병 데이터 수", value: diseases.length, description: "CSV 기반 질병 데이터 개수입니다." },
    { label: "전체 증상 키워드 수", value: symptoms.length, description: "증상 검색과 응급 안내에 쓰는 키워드 수입니다.", anchor: "symptoms" },
    { label: "전체 경험담 수", value: experiences.length, description: "approved, pending, rejected를 모두 포함한 경험담 수입니다." },
    {
      label: "승인된 경험담 수",
      value: experiences.filter((experience) => experience.status === "approved").length,
      description: "사이트에 노출 가능한 승인 경험담 수입니다.",
    },
    {
      label: "검토 대기 경험담 수",
      value: experiences.filter((experience) => experience.status === "pending").length,
      description: "관리자 검토가 필요한 pending 경험담 수입니다.",
    },
    {
      label: "거절된 경험담 수",
      value: experiences.filter((experience) => experience.status === "rejected").length,
      description: "공개하지 않는 rejected 경험담 수입니다.",
    },
    { label: "영상자료 수", value: videos.length, description: "질병 상세와 검색에 연결되는 영상자료 수입니다.", anchor: "videos" },
    { label: "외부 참고자료 수", value: articles.length, description: "외부 의학 참고자료 mock 데이터 수입니다.", anchor: "articles" },
    { label: "운동요법 데이터 수", value: exercises.length, description: "운동요법 CSV 가이드 수입니다.", anchor: "exercises" },
    { label: "식이요법 데이터 수", value: dietGuides.length, description: "상세 식이요법 CSV 가이드 수입니다.", anchor: "diet-guides" },
    { label: "제휴 상품 수", value: affiliateProducts.length, description: "제휴 상품 mock 데이터 수입니다.", anchor: "affiliate-products" },
    { label: "병원/진료과 수", value: clinics.length, description: "진료과 안내 mock 데이터 수입니다.", anchor: "clinics" },
  ];

  return (
    <AdminShell>
      <div className="grid gap-8">
        <section className="rounded-lg border border-[#d9d1aa] bg-[#fffdf7] p-5 shadow-sm">
          <p className="text-sm font-extrabold text-[#7a6230]">운영 전 필수 연결 예정</p>
          {/* Future Supabase work: Auth for admin login, Database for content records,
             Row Level Security for user/admin permissions, Storage for attachments,
             and an Admin Review Table for approval history. */}
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#5b6146] sm:grid-cols-2">
            {[
              "Supabase Auth: 관리자 로그인",
              "Supabase Database: 경험담, 질병, 증상, 기록 저장",
              "Row Level Security: 사용자/관리자 권한 분리",
              "Storage: 이미지 또는 첨부파일 저장",
              "Admin Review Table: 경험담 승인 이력 저장",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#7a6230]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
        <AdminDashboardClient metrics={metrics} databaseStatus={databaseStatus} />
      </div>
    </AdminShell>
  );
}
