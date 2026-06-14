"use client";

import Link from "next/link";
import { useState } from "react";

const navItems = [
  { label: "홈", href: "/" },
  { label: "질병정보", href: "/diseases" },
  { label: "식이요법", href: "/foods" },
  { label: "영상자료", href: "/videos" },
  { label: "경험담", href: "/experiences" },
  { label: "증상기록", href: "/records" },
  { label: "프리미엄", href: "/premium" },
  { label: "정보 등록", href: "/submit" },
];

export default function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-[#dfe8d8] bg-[#fffffb]/95 shadow-[0_6px_24px_rgba(31,75,54,0.08)] backdrop-blur">
      <div className="mx-auto max-w-[1440px] px-5 py-3 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 text-lg font-extrabold text-[#123827] sm:text-xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#174330] text-sm font-bold text-white shadow-sm">
              HK
            </span>
            Health Knowhow
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            className="rounded-lg border border-[#c9d9c2] bg-white px-3 py-2 text-sm font-bold text-[#174330] shadow-sm lg:hidden"
            aria-expanded={isOpen}
            aria-controls="site-navigation"
          >
            메뉴
          </button>

          <nav id="site-navigation" aria-label="주요 메뉴" className="hidden flex-wrap justify-end gap-1 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2.5 text-sm font-bold text-[#2f6c48] transition hover:bg-[#eef6e9] hover:text-[#174330] focus:outline-none focus:ring-4 focus:ring-[#d9ead2] xl:px-4"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {isOpen && (
          <nav aria-label="모바일 주요 메뉴" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-[#dfe8d8] bg-white px-4 py-3 text-center text-sm font-bold text-[#2f6c48] shadow-sm"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
