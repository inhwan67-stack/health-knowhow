import Link from "next/link";
import type { ReactNode } from "react";

const adminMenuItems = [
  { label: "대시보드", href: "/admin" },
  { label: "경험담 검수", href: "/admin/experiences" },
  { label: "질병 데이터", href: "/admin/diseases" },
  { label: "증상 키워드", href: "/admin#symptoms" },
  { label: "영상자료", href: "/admin#videos" },
  { label: "외부 참고자료", href: "/admin#articles" },
  { label: "운동요법", href: "/admin#exercises" },
  { label: "식이요법", href: "/admin#diet-guides" },
  { label: "제휴 상품", href: "/admin#affiliate-products" },
  { label: "병원/진료과", href: "/admin#clinics" },
  { label: "주의 표현 점검", href: "/admin#phrase-checker" },
  { label: "CSV 관리 안내", href: "/admin/csv" },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12">
          <Link href="/" className="text-sm font-bold text-[#2f6c48] hover:text-[#173d2d]">
            Health Knowhow
          </Link>
          <p className="mt-5 w-fit rounded-full border border-[#d9d1aa] bg-[#fffdf7] px-3 py-1.5 text-sm font-bold text-[#7a6230]">
            관리자 mock
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl">
            관리자 대시보드
          </h1>
          <p className="mt-4 max-w-5xl text-lg leading-8 text-[#355845]">
            이 페이지는 Health Knowhow 콘텐츠 검수와 데이터 관리를 위한 관리자 mock 화면입니다. 현재는 실제 인증이나 서버 저장 없이 프론트엔드 mock 구조로 작동합니다.
          </p>
          <div className="mt-6 rounded-lg border border-[#d9d1aa] bg-[#fffdf7] p-5 text-base font-semibold leading-7 text-[#5b6146] shadow-sm">
            현재 관리자 페이지는 개발용 mock 화면입니다. 실제 서비스에서는 로그인, 권한관리, 서버 DB, 관리자 승인 이력이 필요합니다.
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-12">
        <aside className="self-start rounded-lg border border-[#dde6d7] bg-white p-4 shadow-sm lg:sticky lg:top-24">
          <p className="px-2 text-sm font-extrabold text-[#2f6c48]">관리자 메뉴</p>
          <nav className="mt-4 grid gap-2" aria-label="관리자 메뉴">
            {adminMenuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2.5 text-sm font-bold text-[#405347] transition hover:bg-[#eef6e9] hover:text-[#174330]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="mt-5 rounded-lg bg-[#f5f0e4] p-3 text-xs font-semibold leading-5 text-[#7a6230]">
            현재 관리자 기능은 mock 상태입니다. 실제 서비스 운영 전에는 로그인, 권한관리, 서버 DB, 변경 이력 저장, 개인정보 보호 기능이 필요합니다.
          </p>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
