import Link from "next/link";

const actionButtons = [
  { label: "내 경험 공유하기", href: "/submit" },
  { label: "질병별 경험 찾기", href: "/diseases" },
  { label: "음식 궁합 보기", href: "/foods" },
  { label: "민간요법 경험 보기", href: "/remedies" },
];

const featuredSections = [
  {
    title: "많이 찾는 건강 경험",
    description: "생활 속에서 자주 궁금해하는 증상별 경험과 조심할 점을 모아봅니다.",
    label: "인기 경험",
  },
  {
    title: "질병별 생활 노하우",
    description: "진단명보다 일상 관리에 초점을 맞춘 식사, 휴식, 운동 경험을 살펴봅니다.",
    label: "생활 기록",
  },
  {
    title: "음식과 몸의 궁합",
    description: "개인이 느낀 음식 반응과 섭취 전 확인하면 좋은 주의사항을 함께 기록합니다.",
    label: "음식 경험",
  },
  {
    title: "민간요법 경험담",
    description: "전해 들은 방법이 아니라 직접 겪은 과정과 한계를 구분해 공유합니다.",
    label: "주의 필요",
  },
  {
    title: "전문가 검토 콘텐츠",
    description: "개인 경험을 더 안전하게 이해할 수 있도록 검토된 참고 콘텐츠를 제공합니다.",
    label: "검토 자료",
  },
  {
    title: "오늘의 안전 주의 정보",
    description: "증상이 심하거나 오래 지속될 때 전문 진료가 필요한 상황을 먼저 안내합니다.",
    label: "안전 안내",
  },
];

const popularTopics = ["위장 불편", "수면 습관", "혈당 관리", "관절 부담", "감기 회복"];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="relative overflow-hidden border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_54%,#dcebd4_100%)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-8 sm:px-8 lg:grid-cols-[1fr_380px] lg:px-12 lg:py-10">
          <div className="flex flex-col justify-center">
            <p className="mb-5 w-fit rounded-full border border-[#b7d0ac] bg-white/75 px-4 py-2 text-base font-semibold text-[#2f6c48]">
              라이프노하우 헬스
            </p>

            <h1 className="max-w-4xl text-4xl font-bold leading-tight text-[#123827] sm:text-5xl lg:text-6xl">
              당신의 경험이 누군가에게는 소중한 생활지식이 됩니다.
            </h1>

            <p className="mt-6 max-w-3xl text-xl leading-9 text-[#355845] sm:text-2xl">
              몸으로 겪은 음식 궁합, 생활습관, 민간요법, 회복 경험을 안전하게 기록하고
              공유하는 건강 경험 플랫폼입니다.
            </p>

            <div className="mt-8 rounded-lg border border-[#cfdcc7] bg-white/85 p-5 text-lg leading-8 text-[#405347] shadow-sm">
              <strong className="font-bold text-[#1f4b36]">중요 안내</strong>
              <p className="mt-1">
                이 사이트의 정보는 개인 경험을 바탕으로 한 참고 자료이며, 의학적 진단이나
                치료를 대신하지 않습니다.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {actionButtons.map((button, index) => (
                <Link
                  key={button.href}
                  href={button.href}
                  className={`rounded-lg border px-5 py-4 text-center text-lg font-bold transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[#b9d8ab] ${
                    index === 0
                      ? "border-[#174330] bg-[#174330] text-white"
                      : "border-[#bcd2b2] bg-white text-[#174330]"
                  }`}
                >
                  {button.label}
                </Link>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border border-[#c7d9bd] bg-white/90 p-6 shadow-[0_20px_70px_rgba(31,75,54,0.12)]">
            <p className="text-lg font-bold text-[#1d5138]">오늘 많이 찾는 주제</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {popularTopics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border border-[#d5dfcd] bg-[#f5f0e4] px-4 py-2 text-base font-semibold text-[#365744]"
                >
                  {topic}
                </span>
              ))}
            </div>
            <div className="mt-8 rounded-lg bg-[#eef6e9] p-5">
              <p className="text-2xl font-bold leading-9 text-[#174330]">경험은 구체적으로, 판단은 신중하게</p>
              <p className="mt-3 text-lg leading-8 text-[#4b6153]">
                무엇을 먹었는지, 어떤 생활습관을 시도했는지, 몸의 반응은 어땠는지 차분히
                기록하는 공간을 목표로 합니다.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section id="health-sections" className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-lg font-bold text-[#4c7b56]">첫 화면 주요 섹션</p>
            <h2 className="mt-2 text-3xl font-bold text-[#173d2d] sm:text-4xl">
              필요한 경험을 안전하게 찾아볼 수 있도록 정리했습니다.
            </h2>
          </div>
          <p className="max-w-xl text-lg leading-8 text-[#5b6b60]">
            모든 콘텐츠는 개인차가 있음을 전제로 하며, 위급하거나 불확실한 경우 전문적인
            상담을 권장하는 방향으로 안내합니다.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {featuredSections.map((section) => (
            <article
              key={section.title}
              className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#b8d0ad] hover:shadow-lg"
            >
              <span className="rounded-full bg-[#f0eadb] px-3 py-1 text-sm font-bold text-[#596344]">
                {section.label}
              </span>
              <h3 className="mt-5 text-2xl font-bold leading-8 text-[#1b4631]">{section.title}</h3>
              <p className="mt-4 text-lg leading-8 text-[#526257]">{section.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
