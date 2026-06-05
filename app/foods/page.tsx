import Link from "next/link";

const foodCards = [
  "생강",
  "양배추",
  "꿀",
  "도라지",
  "유산균",
  "커피",
  "우유",
  "매운 음식",
];

export default function FoodsPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-12">
          <Link href="/" className="text-base font-bold text-[#2f6c48] hover:text-[#173d2d]">
            라이프노하우 헬스
          </Link>
          <h1 className="mt-5 text-4xl font-bold leading-tight text-[#123827] sm:text-5xl">
            음식과 몸의 궁합
          </h1>
          <p className="mt-4 rounded-lg border border-[#cfdcc7] bg-white/85 p-5 text-lg leading-8 text-[#405347] shadow-sm">
            개인에 따라 다를 수 있습니다.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {foodCards.map((food) => (
            <article key={food} className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm">
              <span className="rounded-full bg-[#eef6e9] px-3 py-1 text-sm font-bold text-[#2f6c48]">
                음식 경험
              </span>
              <h2 className="mt-5 text-2xl font-bold text-[#1b4631]">{food}</h2>
              <p className="mt-4 text-lg leading-8 text-[#526257]">
                섭취량, 시간대, 함께 먹은 음식, 몸의 반응을 구체적으로 비교해볼 수 있는 항목입니다.
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
