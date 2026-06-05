import Link from "next/link";

const remedyCards = [
  { title: "찜질", description: "온도, 시간, 적용 부위에 따라 느낀 변화를 기록하는 경험 카드입니다." },
  { title: "온열요법", description: "몸을 따뜻하게 유지했을 때의 편안함과 불편함을 함께 살펴봅니다." },
  { title: "스트레칭", description: "무리하지 않는 범위에서 움직임과 휴식 후 반응을 기록합니다." },
  { title: "수면습관", description: "잠드는 시간, 낮잠, 빛과 소음 환경에 따른 경험을 정리합니다." },
  { title: "가족 전통요법", description: "가족에게 전해진 방법도 직접 경험과 주의점을 구분해 적습니다." },
  { title: "음식 기반 경험", description: "특정 음식을 먹었을 때의 개인 반응과 예외 상황을 함께 봅니다." },
];

export default function RemediesPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-12">
          <Link href="/" className="text-base font-bold text-[#2f6c48] hover:text-[#173d2d]">
            라이프노하우 헬스
          </Link>
          <h1 className="mt-5 text-4xl font-bold leading-tight text-[#123827] sm:text-5xl">
            민간요법 경험 보기
          </h1>
          <p className="mt-4 rounded-lg border border-[#cfdcc7] bg-white/85 p-5 text-lg leading-8 text-[#405347] shadow-sm">
            검증되지 않은 방법일 수 있으므로 전문가 상담이 필요합니다.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-12">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {remedyCards.map((card) => (
            <article key={card.title} className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm">
              <span className="rounded-full bg-[#f0eadb] px-3 py-1 text-sm font-bold text-[#596344]">
                경험담
              </span>
              <h2 className="mt-5 text-2xl font-bold text-[#1b4631]">{card.title}</h2>
              <p className="mt-4 text-lg leading-8 text-[#526257]">{card.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
