import Link from "next/link";

const diseaseCards = [
  { title: "위염", description: "식사 시간, 자극적인 음식, 스트레스 상황에 따른 개인 경험을 살펴봅니다.", caution: "통증이 심하거나 반복되면 진료가 필요할 수 있습니다." },
  { title: "역류성식도염", description: "식후 자세, 야식, 커피 섭취 등 생활습관과 관련된 경험을 모읍니다.", caution: "가슴 통증이나 삼킴 곤란은 전문가 상담이 필요합니다." },
  { title: "기침", description: "수분 섭취, 실내 습도, 휴식 방법 등 일상 관리 경험을 참고합니다.", caution: "호흡곤란이나 고열이 있으면 즉시 진료를 고려해야 합니다." },
  { title: "비염", description: "계절, 청소 습관, 수면 환경에 따라 달라진 경험을 정리합니다.", caution: "약물 사용은 개인 판단만으로 늘리지 않는 것이 좋습니다." },
  { title: "불면", description: "수면 시간, 카페인, 빛 노출, 긴장 완화 습관에 대한 경험을 나눕니다.", caution: "장기간 지속되는 수면 문제는 전문 상담이 도움이 될 수 있습니다." },
  { title: "무릎통증", description: "걷기, 계단, 스트레칭, 체중 부담과 관련된 생활 경험을 살펴봅니다.", caution: "붓기나 외상 후 통증은 검사가 필요할 수 있습니다." },
];

export default function DiseasesPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-12">
          <Link href="/" className="text-base font-bold text-[#2f6c48] hover:text-[#173d2d]">
            라이프노하우 헬스
          </Link>
          <h1 className="mt-5 text-4xl font-bold leading-tight text-[#123827] sm:text-5xl">
            질병별 생활 노하우
          </h1>
          <p className="mt-4 max-w-3xl text-xl leading-9 text-[#355845]">
            질병 이름별로 생활 속 경험을 찾아보되, 개인차와 주의사항을 함께 확인합니다.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-12">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {diseaseCards.map((card) => (
            <article key={card.title} className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-[#1b4631]">{card.title}</h2>
              <p className="mt-4 text-lg leading-8 text-[#526257]">{card.description}</p>
              <p className="mt-5 rounded-lg bg-[#f5f0e4] p-4 text-base font-semibold leading-7 text-[#5b6146]">
                주의: {card.caution}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
