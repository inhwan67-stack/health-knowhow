import AdminShell from "../AdminShell";
import ExperienceReviewClient from "./ExperienceReviewClient";
import { getExperiences } from "@/data/experiences";

export const dynamic = "force-dynamic";

export default function AdminExperiencesPage() {
  return (
    <AdminShell>
      <div className="grid gap-6">
        <section className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
          <p className="text-sm font-extrabold text-[#2f6c48]">경험담 검수</p>
          <h2 className="mt-2 text-3xl font-bold text-[#173d2d]">pending / approved / rejected 콘텐츠 확인</h2>
          <p className="mt-3 text-base leading-7 text-[#526257]">
            CSV mock 경험담과 이 브라우저에 임시 저장된 사용자 draft를 함께 표시합니다. 버튼 처리는 실제 서버가 아니라 localStorage의 mock 승인 이력에 저장됩니다.
          </p>
        </section>
        <ExperienceReviewClient initialExperiences={getExperiences()} />
      </div>
    </AdminShell>
  );
}
