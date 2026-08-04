import Link from "next/link";

const policyLinks = [
  { label: "소개", href: "/about" },
  { label: "문의", href: "/contact" },
  { label: "개인정보처리방침", href: "/privacy" },
  { label: "이용약관", href: "/terms" },
  { label: "의료정보 면책 고지", href: "/disclaimer" },
];

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[rgba(14,32,56,0.10)] bg-[#F8F7F4] text-[#0E2038]">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-10">
        <div>
          <p className="text-xl font-black tracking-[-0.03em] text-[#0E2038]">Health Knowhow</p>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#0E2038]/58">
            증상과 질병별 건강정보를 이해하기 쉽게 정리하는 참고자료 서비스입니다. 이 사이트의 정보는 의학적 진단, 치료, 처방을 대체하지 않습니다.
          </p>
        </div>
        <nav
          aria-label="정책 및 안내"
          className="flex flex-wrap items-center gap-2 lg:max-w-xl lg:justify-end"
        >
          {policyLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full border border-[rgba(14,32,56,0.10)] bg-white px-4 py-0 text-center text-[13px] font-bold leading-none tracking-[-0.02em] text-[#0E2038]/68 transition hover:border-[#63C8B8] hover:text-[#0E2038] sm:text-sm"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
