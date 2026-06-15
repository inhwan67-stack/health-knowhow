import Link from "next/link";
import MedicalDisclaimer from "../components/MedicalDisclaimer";
import { VideoCards } from "../components/ResourceCards";
import { getVideos } from "@/data/videos";

export const dynamic = "force-dynamic";

export default function VideosPage() {
  const videos = getVideos();

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
          <Link href="/" className="text-sm font-bold text-[#2f6c48] hover:text-[#173d2d]">
            Health Knowhow
          </Link>
          <h1 className="mt-5 text-3xl font-bold leading-tight text-[#123827] sm:text-5xl">
            영상자료
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#355845]">
            질병별로 참고할 수 있는 건강관리 영상자료를 모았습니다. 영상은 외부 링크로 이동하며,
            임베드가 불가능한 영상도 연결할 수 있도록 버튼 방식으로 구성했습니다.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
        <div className="mb-5 rounded-lg border border-[#ead0c6] bg-[#fff7f3] p-5 text-base leading-7 text-[#714533]">
          영상자료는 일반 건강정보 참고용이며 의학적 진단, 치료, 처방을 대신하지 않습니다.
        </div>
        <VideoCards videos={videos} />
      </section>

      <MedicalDisclaimer />
    </main>
  );
}
