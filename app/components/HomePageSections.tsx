import Image from "next/image";
import Link from "next/link";
import HomeAiQuestionForm from "./HomeAiQuestionForm";

const recommendedQuestions = [
  "두통이 3일째 지속돼요",
  "마른기침이 멈추지 않아요",
  "피로감이 심해요",
  "소화가 잘 안돼요",
];

const heroFeatures = [
  {
    title: "AI 증상 분석",
    description: "정확한 원인 파악",
    icon: "✦",
  },
  {
    title: "맞춤 건강정보",
    description: "검증된 의학 정보",
    icon: "♧",
  },
  {
    title: "병원 추천",
    description: "내게 맞는 병원 찾기",
    icon: "⌂",
  },
  {
    title: "건강 관리 기록",
    description: "나의 건강 히스토리",
    icon: "▤",
  },
];

const healthTopics = [
  {
    title: "두통",
    image: "/images/home/topic-headache.webp",
    href: "/health-articles",
  },
  {
    title: "기침",
    image: "/images/home/topic-cough.webp",
    href: "/health-articles",
  },
  {
    title: "소화불량",
    image: "/images/home/topic-indigestion.webp",
    href: "/health-articles",
  },
  {
    title: "건강 식단",
    image: "/images/home/topic-healthy-food.webp",
    href: "/foods",
  },
  {
    title: "운동",
    image: "/images/home/topic-exercise.webp",
    href: "/guides",
  },
  {
    title: "수면",
    image: "/images/home/topic-sleep.webp",
    href: "/health-articles",
  },
];

export function HomeHero() {
  return (
    <section className="relative min-h-[600px] overflow-hidden bg-[#F8F7F4] lg:min-h-[610px] xl:min-h-[620px]">
      <Image
        src="/images/home/hero-health-ai.webp"
        alt="AI 건강 분석 카드와 건강 팁이 함께 보이는 따뜻한 헬스케어 메인 이미지"
        fill
        priority
        sizes="100vw"
        className="hidden object-cover object-[52%_center] md:block"
      />
      <Image
        src="/images/home/hero-health-ai-mobile.webp"
        alt="모바일 화면에 맞춘 AI 건강 관리 메인 이미지"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[62%_center] md:hidden"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#F8F7F4]/96 via-[#F8F7F4]/75 to-[#F8F7F4]/0 md:hidden" />

      <div className="relative z-10 mx-auto flex min-h-[600px] max-w-[1440px] items-center px-7 py-12 sm:px-10 lg:min-h-[610px] lg:px-[74px] xl:min-h-[620px]">
        <div className="w-full max-w-[548px] -translate-y-1">
          <p className="text-[16px] font-medium tracking-[-0.03em] text-[#0E2038]/82 sm:text-[17px]">
            AI가 이해하는 건강, 더 나은 삶의 시작{" "}
            <span className="font-bold text-[#63C8B8]" aria-hidden="true">
              ♧
            </span>
          </p>

          <h1 className="mt-6 max-w-[548px] text-[40px] font-black leading-[1.14] tracking-[-0.06em] text-[#0E2038] min-[420px]:text-[44px] sm:text-[54px] md:text-[58px] lg:text-[60px] xl:text-[64px]">
            <span className="block sm:whitespace-nowrap">건강은 검색이 아니라</span>
            <span className="block sm:whitespace-nowrap">
              <span className="text-[#63C8B8]">이해</span>에서 시작됩니다
            </span>
          </h1>

          <p className="mt-6 text-[17px] font-medium leading-[1.68] tracking-[-0.035em] text-[#0E2038]/78 sm:text-[18px]">
            AI가 증상을 이해하고, 원인을 분석하며,
            <br />
            당신에게 꼭 맞는 정보와 병원을 안내합니다.
          </p>

          <HomeAiQuestionForm recommendedQuestions={recommendedQuestions} />

          <div className="mt-8 grid max-w-[480px] grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
            {heroFeatures.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="mx-auto flex h-[36px] w-[36px] items-center justify-center rounded-full border-2 border-[#63C8B8] bg-white/55 text-[17px] font-black text-[#63C8B8]">
                  {feature.icon}
                </div>
                <p className="mt-2.5 text-[12px] font-black tracking-[-0.035em] text-[#0E2038]">
                  {feature.title}
                </p>
                <p className="mt-1 text-[10.5px] font-semibold tracking-[-0.03em] text-[#0E2038]/58">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function PopularHealthTopics() {
  return (
    <section className="bg-white px-7 pb-12 pt-8 sm:px-10 lg:px-[74px]">
      <div className="mx-auto max-w-[1288px]">
        <h2 className="text-[20px] font-black tracking-[-0.055em] text-[#0E2038] sm:text-[21px]">
          지금 많이 찾는 건강 주제
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {healthTopics.map((topic) => (
            <TopicCard key={topic.title} {...topic} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TopicCard({
  title,
  image,
  href,
}: {
  title: string;
  image: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="relative block aspect-[1.03] min-h-[176px] overflow-hidden rounded-[13px] bg-[#C6F2E8] shadow-[0_14px_30px_rgba(14,32,56,0.09)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-[#C6F2E8] sm:min-h-[184px] xl:min-h-[176px]"
      aria-label={`${title} 건강 주제 보기`}
    >
      <Image
        src={image}
        alt={`${title} 건강 주제 카드`}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 16vw"
        className="object-cover"
      />
    </Link>
  );
}
