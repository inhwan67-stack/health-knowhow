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
    <footer className="mt-auto border-t border-[#dfe8d8] bg-[#fffffb] text-[#173d2d]">
      <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-12">
        <div>
          <p className="text-lg font-extrabold text-[#123827]">Health Knowhow</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#526257]">
            증상과 질병별 건강정보를 정리하는 참고자료 플랫폼입니다. 이 사이트의 정보는 의학적 진단, 치료, 처방을 대신하지 않습니다.
          </p>
        </div>
        <nav aria-label="정책 및 안내" className="flex flex-wrap gap-2 lg:justify-end">
          {policyLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-[#dfe8d8] bg-white px-3 py-2 text-sm font-bold text-[#2f6c48] transition hover:bg-[#eef6e9] hover:text-[#174330]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
