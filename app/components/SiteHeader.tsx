"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { label: "AI 건강상담", href: "/#ai-health-question" },
  { label: "건강정보", href: "/health-articles" },
  { label: "병원 찾기", href: "/find-hospital" },
  { label: "건강 가이드", href: "/guides" },
  { label: "나의 건강관리", href: "/my-records/new" },
];

export default function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(14,32,56,0.08)] bg-white/96 backdrop-blur">
      <div className="mx-auto flex h-[78px] max-w-[1536px] items-center justify-between px-8 lg:px-10 xl:px-11">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 text-[#0E2038]"
          aria-label="건강노하우 홈"
        >
          <span className="relative inline-flex h-9 w-9 items-center justify-center text-[#63C8B8]">
            <span className="absolute h-7 w-7 rotate-45 rounded-[8px] border-[3px] border-[#63C8B8] border-l-0 border-t-0" />
            <span className="absolute left-1 top-1.5 h-5 w-5 rounded-full border-[3px] border-[#63C8B8] border-b-0 border-r-0" />
            <span className="absolute right-1 top-1.5 h-5 w-5 rounded-full border-[3px] border-[#63C8B8] border-b-0 border-l-0" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[21px] font-black tracking-[-0.05em]">건강노하우</span>
            <span className="mt-1 text-[12px] font-semibold tracking-[-0.01em] text-[#0E2038]/50">
              Health Knowhow
            </span>
          </span>
        </Link>

        <nav aria-label="주요 메뉴" className="hidden items-center gap-[58px] lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative py-7 text-[16px] font-bold tracking-[-0.03em] transition focus:outline-none focus:ring-4 focus:ring-[#C6F2E8] ${
                pathname === item.href ? "text-[#009E8E]" : "text-[#0E2038] hover:text-[#63C8B8]"
              }`}
            >
              {item.label}
              {pathname === item.href && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-11 -translate-x-1/2 rounded-full bg-[#009E8E]" />
              )}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/search"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-[#0E2038] transition hover:bg-[#F8F7F4] focus:outline-none focus:ring-4 focus:ring-[#C6F2E8]"
            aria-label="검색"
          >
            <span className="h-[18px] w-[18px] rounded-full border-2 border-current" />
            <span className="absolute left-[27px] top-[27px] h-2.5 w-0.5 rotate-[-45deg] rounded-full bg-current" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="inline-flex h-11 items-center justify-center rounded-[12px] border border-[rgba(14,32,56,0.12)] bg-white px-4 text-sm font-black tracking-[-0.02em] text-[#0E2038] lg:hidden"
          aria-expanded={isOpen}
          aria-controls="mobile-site-navigation"
        >
          메뉴
        </button>
      </div>

      {isOpen && (
        <nav
          id="mobile-site-navigation"
          aria-label="모바일 주요 메뉴"
          className="border-t border-[rgba(14,32,56,0.08)] bg-white px-5 py-4 lg:hidden"
        >
          <div className="grid gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="rounded-2xl bg-[#F8F7F4] px-4 py-3 text-center text-sm font-bold tracking-[-0.02em] text-[#0E2038]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
