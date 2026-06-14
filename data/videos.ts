import { readCsvRows } from "./csv";
import type { VideoResource } from "./types";

export function getVideos(): VideoResource[] {
  return readCsvRows("videos.csv").map((row) => ({
    id: row.id,
    diseaseId: row.diseaseId,
    diseaseSlug: row.diseaseId,
    title: row.title,
    channel: row.channel,
    summary: row.summary,
    url: row.url || "https://www.youtube.com/results?search_query=건강정보",
    category: row.category,
  }));
}

export function getVideosByDisease(diseaseId: string) {
  return getVideos().filter((video) => video.diseaseId === diseaseId);
}
