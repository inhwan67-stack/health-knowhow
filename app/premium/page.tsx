import type { Metadata } from "next";
import Link from "next/link";
import AffiliateDisclaimer from "../components/AffiliateDisclaimer";
import MedicalDisclaimer from "../components/MedicalDisclaimer";
import AffiliateProductCards from "./AffiliateProductCards";
import { affiliateProducts } from "@/data/affiliateProducts";

export const metadata: Metadata = {
  title: "Health Knowhow 프리미엄 기능 안내 | 증상 기록과 병원 방문 준비 도구",
  description:
    "Health Knowhow 프리미엄 기능은 증상 기록, 병원 방문 전 체크리스트, PDF 리포트, 식단 기록표 등 건강정보 정리 기능을 준비 중입니다.",
};

const plans = [
  {
    name: "무료",
    price: "0원",
    badge: "현재 제공",
    features: [
      "질병 및 증상 검색",
      "내부 건강정보 보기",
      "외부 의학 참고자료 보기",
      "개인 경험담 보기",
      "기본 증상 기록 3개까지 저장",
    ],
    buttonLabel: "현재 이용 중",
    current: true,
  },
  {
    name: "베이직",
    price: "월 3,900원",
    badge: "준비 중",
    features: [
      "증상 기록 무제한 저장 예정",
      "병원 방문 전 체크리스트 저장 예정",
      "진료과 안내 저장 예정",
      "개인 건강 메모 관리 예정",
      "가족 건강 기록 1명 추가 예정",
    ],
    buttonLabel: "준비 중",
    current: false,
  },
  {
    name: "프리미엄",
    price: "월 9,900원",
    badge: "준비 중",
    features: [
      "PDF 건강 리포트 생성 예정",
      "병원 상담 질문지 자동 생성 예정",
      "식단 기록표 관리 예정",
      "증상 변화 그래프 보기 예정",
      "가족 건강 기록 관리 예정",
      "개인 맞춤 건강자료 모음 예정",
    ],
    buttonLabel: "준비 중",
    current: false,
  },
];

const premiumFeatures = [
  {
    title: "증상 기록 저장",
    description:
      "증상명, 시작일, 불편감 정도, 관련 음식, 생활습관 변화를 기록해 병원 상담 전 참고자료로 활용할 수 있습니다.",
  },
  {
    title: "병원 방문 질문지",
    description: "기록한 증상을 바탕으로 의사에게 물어볼 질문을 정리할 수 있도록 돕는 기능입니다.",
  },
  {
    title: "PDF 건강 리포트",
    description:
      "내 증상 기록과 생활습관 정보를 PDF 형태로 정리해 보관하거나 병원 상담 시 참고할 수 있도록 준비 중입니다.",
  },
  {
    title: "식단 기록표",
    description: "질병별로 주의가 필요한 음식과 도움이 될 수 있는 식습관을 기록할 수 있도록 준비 중입니다.",
  },
  {
    title: "증상 변화 그래프",
    description: "불편감 정도와 증상 변화를 시간 흐름에 따라 확인할 수 있도록 준비 중입니다.",
  },
  {
    title: "가족 건강 기록",
    description: "부모님, 배우자, 자녀 등 가족의 건강 기록을 함께 관리할 수 있도록 준비 중입니다.",
  },
];

export default function PremiumPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
          <Link href="/" className="text-sm font-bold text-[#2f6c48] hover:text-[#173d2d]">
            Health Knowhow
          </Link>
          <p className="mt-6 w-fit rounded-full border border-[#b7d0ac] bg-white px-3 py-1.5 text-sm font-bold text-[#2f6c48]">
            준비 중인 프리미엄 기능
          </p>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl">
            Health Knowhow 프리미엄
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-[#355845]">
            증상 기록, 병원 방문 전 질문지, 식단 기록, 건강 리포트 기능을 통해 병원 상담 전 자신의
            상태를 더 체계적으로 정리할 수 있도록 돕는 기능입니다.
          </p>
          <p className="mt-6 rounded-lg border border-[#b7d0ac] bg-white/85 p-5 text-base font-bold leading-7 text-[#2f6c48]">
            프리미엄 기능은 의학적 판단을 대신하지 않습니다. 증상이 있거나 치료가 필요한 경우 반드시
            의료기관과 상담하시기 바랍니다.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12">
        <div className="mb-6">
          <p className="text-sm font-bold text-[#2f6c48]">요금제 구조</p>
          <h2 className="mt-2 text-3xl font-bold text-[#173d2d] sm:text-4xl">무료와 준비 중인 유료 기능</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#526257]">
            현재 실제 결제 기능은 제공하지 않으며, 유료 플랜은 향후 제공을 위한 안내 상태입니다.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-lg border bg-white p-6 shadow-sm ${
                plan.current ? "border-[#2f6c48]" : "border-[#dde6d7]"
              }`}
            >
              <span className="rounded-full bg-[#eef6e9] px-3 py-1.5 text-xs font-bold text-[#2f6c48]">
                {plan.badge}
              </span>
              <h3 className="mt-5 text-2xl font-bold text-[#1b4631]">{plan.name}</h3>
              <p className="mt-3 text-3xl font-extrabold text-[#174330]">{plan.price}</p>
              <ul className="mt-6 grid gap-3 text-sm leading-6 text-[#526257]">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#2f6c48]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={!plan.current}
                className={`mt-6 min-h-11 w-full rounded-lg px-4 py-2.5 text-sm font-bold ${
                  plan.current
                    ? "bg-[#174330] text-white"
                    : "cursor-not-allowed border border-[#bcd2b2] bg-[#f4faf0] text-[#6a776e]"
                }`}
              >
                {plan.buttonLabel}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-12 sm:px-8 lg:px-12">
        <div className="mb-6">
          <p className="text-sm font-bold text-[#2f6c48]">기능 소개</p>
          <h2 className="mt-2 text-3xl font-bold text-[#173d2d] sm:text-4xl">건강정보 정리 도구</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {premiumFeatures.map((feature) => (
            <article key={feature.title} className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm">
              <span className="rounded-full bg-[#f5f0e4] px-3 py-1.5 text-xs font-bold text-[#7a6230]">
                추후 제공 예정
              </span>
              <h3 className="mt-5 text-xl font-bold text-[#1b4631]">{feature.title}</h3>
              <p className="mt-3 text-base leading-7 text-[#526257]">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="affiliate-products" className="mx-auto max-w-[1440px] scroll-mt-28 px-5 pb-12 sm:px-8 lg:px-12">
        <div className="mb-6">
          <p className="text-sm font-bold text-[#2f6c48]">제휴 상품 mock 영역</p>
          <h2 className="mt-2 text-3xl font-bold text-[#173d2d] sm:text-4xl">건강관리 도구 안내</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#526257]">
            아래 항목은 건강정보 기록과 생활관리 정리에 참고할 수 있는 도구 예시입니다. 의료 효과를 보장하거나
            특정 제품 구매를 권장하지 않습니다.
          </p>
        </div>
        <AffiliateProductCards products={affiliateProducts} />
      </section>

      <AffiliateDisclaimer />
      <MedicalDisclaimer />
    </main>
  );
}
