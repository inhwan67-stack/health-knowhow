import type { Metadata } from "next";
import Link from "next/link";
import SymptomRecordForm from "./SymptomRecordForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "내 증상 기록하기 | Health Knowhow",
  description: "증상 사진, 발생일, 복용약, 병원 방문 기록을 날짜별로 남기는 개인 건강기록 mock 작성 페이지입니다.",
};

export default function NewSymptomRecordPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
          <Link href="/" className="text-sm font-bold text-[#2f6c48] hover:text-[#173d2d]">
            Health Knowhow
          </Link>
          <p className="mt-6 w-fit rounded-full border border-[#b7d0ac] bg-white px-3 py-1.5 text-sm font-extrabold text-[#2f6c48]">
            기본 비공개 mock 기록
          </p>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl">
            내 증상 기록하기
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-[#355845]">
            증상 사진, 발생일, 복용약, 병원 방문 기록을 날짜별로 남겨두면 다음 진료 때 더 정확하게 설명할 수 있습니다.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 lg:px-12">
        <SymptomRecordForm />
        <section className="mt-8 rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-extrabold text-[#2f6c48]">월간 리포트</p>
          <h2 className="mt-2 text-2xl font-extrabold text-[#173d2d]">이번 달 기록을 리포트로 정리해보세요</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#526257]">
            저장된 증상, 사진, 병원 방문, 복용약 기록은 추후 월간 건강 리포트에서 요약할 수 있습니다.
          </p>
          <Link href="/monthly-report" className="mt-5 inline-flex rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-bold text-[#174330]">
            월간 리포트 보기
          </Link>
        </section>
      </section>
    </main>
  );
}
