"use client";

import { useState } from "react";
import type { ArticleResource, VideoResource } from "@/data/types";

export function VideoCards({ videos }: { videos: VideoResource[] }) {
  if (videos.length === 0) {
    return <p className="text-base text-[#526257]">현재 등록된 관련 영상자료가 많지 않습니다. 관련 콘텐츠를 계속 보강하고 있습니다.</p>;
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}

export function VideoCard({ video, categoryLabel }: { video: VideoResource; categoryLabel?: string }) {
  const hasUrl = Boolean(video.url?.trim());

  return (
    <article className="overflow-hidden rounded-lg border border-[#dde6d7] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {hasUrl ? (
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${video.title} 영상 보기`}
          className="group block cursor-pointer"
        >
          <VideoThumbnail video={video} isClickable />
        </a>
      ) : (
        <VideoThumbnail video={video} />
      )}
      <div className="p-6">
        <p className="text-sm font-bold text-[#2f6c48]">
          {categoryLabel ? `${categoryLabel} · ` : ""}
          {video.channel}
        </p>
        <h3 className="mt-2 text-xl font-bold leading-7 text-[#1b4631]">{video.title}</h3>
        <p className="mt-3 text-base leading-7 text-[#526257]">{video.summary}</p>
        <p className="mt-3 rounded-lg bg-[#fffdf7] p-3 text-sm font-semibold leading-6 text-[#526257]">
          영상자료는 일반 건강정보 참고용이며 의학적 진단, 치료, 처방을 대신하지 않습니다.
        </p>
        {hasUrl ? (
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-bold text-[#174330] transition hover:bg-[#eef6e9]"
          >
            관련 영상 보기
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="mt-5 inline-flex cursor-not-allowed rounded-lg border border-[#bcd2b2] bg-[#f4faf0] px-4 py-2.5 text-sm font-bold text-[#6a776e]"
          >
            영상 링크가 아직 등록되지 않았습니다.
          </button>
        )}
      </div>
    </article>
  );
}

export function VideoThumbnail({ video, isClickable = false }: { video: VideoResource; isClickable?: boolean }) {
  const [hasImageError, setHasImageError] = useState(false);
  const thumbnail = video.thumbnail || getYoutubeThumbnail(video.url);

  return (
    <div className="relative aspect-video overflow-hidden bg-[linear-gradient(135deg,#eef6e9_0%,#dcebd4_100%)]">
      {thumbnail && !hasImageError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt={`${video.title} 썸네일`}
          className={`h-full w-full object-cover transition duration-300 ${isClickable ? "group-hover:scale-[1.02] group-hover:opacity-90" : ""}`}
          onError={() => setHasImageError(true)}
        />
      ) : null}
      <div className={`absolute inset-0 flex items-center justify-center bg-[#123827]/10 transition ${isClickable ? "group-hover:bg-[#123827]/20" : ""}`}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/85 text-2xl font-bold text-[#174330] shadow-sm backdrop-blur-sm transition group-hover:scale-105">
          ▶
        </div>
      </div>
    </div>
  );
}

export function getYoutubeThumbnail(url: string): string | null {
  const videoId = getYoutubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
}

function getYoutubeVideoId(url: string) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes("youtu.be")) {
      return parsedUrl.pathname.replace("/", "") || null;
    }
    if (parsedUrl.hostname.includes("youtube.com")) {
      return parsedUrl.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
}

export function ArticleCards({ articles }: { articles: ArticleResource[] }) {
  if (articles.length === 0) {
    return <p className="text-base text-[#526257]">현재 등록된 관련 자료가 많지 않습니다. 관련 콘텐츠를 계속 보강하고 있습니다.</p>;
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
            rel="noopener noreferrer"
            className="mt-5 inline-flex rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-bold text-[#174330] transition hover:bg-[#eef6e9]"
          >
            자료 확인하기
          </a>
        </article>
      ))}
    </div>
  );
}
