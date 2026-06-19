"use client";

import Link from "next/link";

export default function ReportActionButtons() {
  function handlePdfMock() {
    // TODO: Connect PDF export after report rendering is finalized.
    alert("PDF로 저장 mock 기능입니다. 실제 PDF 생성은 아직 연결하지 않았습니다.");
  }

  function handleEmailMock() {
    // TODO: Connect email delivery after notification consent and delivery logs are implemented.
    alert("이메일로 받기 mock 기능입니다. 실제 이메일 발송은 아직 연결하지 않았습니다.");
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <button type="button" onClick={handlePdfMock} className="rounded-lg bg-[#174330] px-5 py-3.5 text-center text-base font-bold text-white">
        PDF로 저장 mock
      </button>
      <button
        type="button"
        onClick={handleEmailMock}
        className="rounded-lg border border-[#174330] bg-white px-5 py-3.5 text-center text-base font-bold text-[#174330]"
      >
        이메일로 받기 mock
      </button>
      <Link href="/my-records/new" className="rounded-lg border border-[#bcd2b2] bg-[#fffdf7] px-5 py-3.5 text-center text-base font-bold text-[#174330]">
        내 증상 기록으로 이동
      </Link>
      <Link href="/find-hospital" className="rounded-lg border border-[#bcd2b2] bg-[#fffdf7] px-5 py-3.5 text-center text-base font-bold text-[#174330]">
        병원 찾기
      </Link>
    </div>
  );
}
