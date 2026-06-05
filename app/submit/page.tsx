import Link from "next/link";

const formFields = [
  { label: "제목", placeholder: "예: 속이 불편할 때 식사 조절 경험", type: "input" },
  { label: "관련 증상/질병", placeholder: "예: 위염, 기침, 불면 등", type: "input" },
  { label: "도움이 되었다고 느낀 음식", placeholder: "직접 느낀 반응을 중심으로 적어주세요.", type: "input" },
  { label: "피해야 한다고 느낀 음식", placeholder: "불편함을 느꼈던 음식이나 상황을 적어주세요.", type: "input" },
  { label: "민간요법 경험", placeholder: "시도한 방법, 기간, 느낀 점과 한계를 함께 적어주세요.", type: "textarea" },
  { label: "주의할 점", placeholder: "다른 사람이 참고할 때 조심해야 할 내용을 적어주세요.", type: "textarea" },
  { label: "본문", placeholder: "경험의 배경, 과정, 몸의 반응을 차분히 기록해주세요.", type: "textarea" },
];

export default function SubmitPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-5xl px-6 py-10 sm:px-8 lg:px-12">
          <Link href="/" className="text-base font-bold text-[#2f6c48] hover:text-[#173d2d]">
            라이프노하우 헬스
          </Link>
          <h1 className="mt-5 text-4xl font-bold leading-tight text-[#123827] sm:text-5xl">
            내 건강 경험 공유하기
          </h1>
          <p className="mt-4 max-w-3xl text-xl leading-9 text-[#355845]">
            본인의 경험을 안전하게 기록하는 공간
          </p>
          <div className="mt-7 rounded-lg border border-[#cfdcc7] bg-white/85 p-5 text-lg leading-8 text-[#405347] shadow-sm">
            의학적 진단이나 치료를 대신하지 않습니다.
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-10 sm:px-8 lg:px-12">
        <form className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-6">
            {formFields.map((field) => (
              <label key={field.label} className="grid gap-2 text-lg font-bold text-[#1b4631]">
                {field.label}
                {field.type === "textarea" ? (
                  <textarea
                    className="min-h-32 rounded-lg border border-[#c9d9c2] bg-[#fffdf7] px-4 py-3 text-lg font-normal leading-8 text-[#405347] outline-none transition focus:border-[#2f6c48] focus:ring-4 focus:ring-[#d9ead2]"
                    placeholder={field.placeholder}
                  />
                ) : (
                  <input
                    className="rounded-lg border border-[#c9d9c2] bg-[#fffdf7] px-4 py-3 text-lg font-normal text-[#405347] outline-none transition focus:border-[#2f6c48] focus:ring-4 focus:ring-[#d9ead2]"
                    placeholder={field.placeholder}
                  />
                )}
              </label>
            ))}

            <label className="grid gap-2 text-lg font-bold text-[#1b4631]">
              병원 치료 병행 여부
              <select className="rounded-lg border border-[#c9d9c2] bg-[#fffdf7] px-4 py-3 text-lg font-normal text-[#405347] outline-none transition focus:border-[#2f6c48] focus:ring-4 focus:ring-[#d9ead2]">
                <option>선택해주세요</option>
                <option>병원 진료와 함께 병행했습니다</option>
                <option>병원 진료 없이 개인 경험만 기록합니다</option>
                <option>기억나지 않거나 답변하기 어렵습니다</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            className="mt-8 w-full rounded-lg border border-[#bcd2b2] bg-[#eef6e9] px-5 py-4 text-lg font-bold text-[#174330]"
          >
            저장 기능은 다음 단계에서 연결 예정입니다
          </button>
        </form>
      </section>
    </main>
  );
}
