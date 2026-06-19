import type { Metadata } from "next";
import Link from "next/link";
import ExperienceShareForm from "./ExperienceShareForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "내 경험 공유하기 | Health Knowhow",
  description: "치료 경험, 생활관리 노하우, 병원 방문 경험을 익명 공유 요청 mock UI로 작성합니다.",
};

export default function NewExperiencePage() {
  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
          <Link href="/experiences" className="text-sm font-bold text-[#2f6c48] hover:text-[#173d2d]">
            경험 공유 목록으로 돌아가기
          </Link>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl">내 경험 공유하기</h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-[#355845]">
            내가 겪은 증상, 병원 방문, 생활관리 경험을 익명으로 정리해 비슷한 사람들에게 참고자료로 공유할 수
            있습니다.
          </p>
          <div className="mt-6 rounded-lg border border-[#d9d1aa] bg-[#fffdf7] p-4 text-sm font-semibold leading-7 text-[#6a5530] shadow-sm">
            작성한 내용은 의료 조언이 아니라 개인 경험입니다. 약 복용, 치료 방법, 민간요법을 다른 사람에게
            권유하는 표현은 피해주세요.
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 lg:px-12">
        <ExperienceShareForm />
      </section>
    </main>
  );
}
