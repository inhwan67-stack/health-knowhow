import type { ArticleResource, VideoResource } from "@/data/types";

export function VideoCards({ videos }: { videos: VideoResource[] }) {
  if (videos.length === 0) {
    return <p className="text-base text-[#526257]">등록된 영상 샘플이 아직 없습니다.</p>;
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {videos.map((video) => (
        <article key={video.id} className="overflow-hidden rounded-lg border border-[#dde6d7] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex aspect-video items-center justify-center bg-[linear-gradient(135deg,#eef6e9_0%,#dcebd4_100%)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-2xl font-bold text-[#174330] shadow-sm">
              ▶
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm font-bold text-[#2f6c48]">{video.channel}</p>
            <h3 className="mt-2 text-xl font-bold leading-7 text-[#1b4631]">{video.title}</h3>
            <p className="mt-3 text-base leading-7 text-[#526257]">{video.summary}</p>
            <a
              href={video.url}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-bold text-[#174330] transition hover:bg-[#eef6e9]"
            >
              관련 영상 보기
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ArticleCards({ articles }: { articles: ArticleResource[] }) {
  if (articles.length === 0) {
    return <p className="text-base text-[#526257]">등록된 외부 자료 샘플이 아직 없습니다.</p>;
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {articles.map((article) => (
        <article key={article.id} className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#b7d0ac] bg-[#eef6e9] px-3 py-1.5 text-xs font-extrabold text-[#174330]">
              {article.type}
            </span>
            <span className="text-sm font-bold text-[#526257]">{article.source}</span>
          </div>
          <h3 className="mt-5 text-xl font-bold leading-7 text-[#1b4631]">{article.title}</h3>
          <p className="mt-2 text-sm font-bold text-[#2f6c48]">출처: {article.source}</p>
          <p className="mt-3 text-base leading-7 text-[#526257]">{article.summary}</p>
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-bold text-[#174330] transition hover:bg-[#eef6e9]"
          >
            자료 확인하기
          </a>
        </article>
      ))}
    </div>
  );
}
