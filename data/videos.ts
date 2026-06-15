import { readCsvRows } from "./csv";
import type { VideoResource } from "./types";

const thumbnailByDisease: Record<string, string> = {
  diabetes: "/images/videos/diabetes-meal.svg",
  hypertension: "/images/videos/hypertension-lifestyle.svg",
  "fatty-liver": "/images/videos/fatty-liver-record.svg",
  gastritis: "/images/videos/gastritis-diet.svg",
  arthritis: "/images/videos/exercise-walking.svg",
  insomnia: "/images/videos/sleep-routine.svg",
  hemorrhoids: "/images/videos/hemorrhoids-care.svg",
  "back-pain": "/images/videos/back-pain-exercise.svg",
  "stress-headache": "/images/videos/sleep-stretching.svg",
};

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
    thumbnail: row.thumbnail || thumbnailByDisease[row.diseaseId] || thumbnailByCategory(row.category),
  }));
}

export function getVideosByDisease(diseaseId: string) {
  return getVideos().filter((video) => video.diseaseId === diseaseId);
}

function thumbnailByCategory(category: string) {
  if (category.includes("식이")) return "/images/videos/gastritis-diet.svg";
  if (category.includes("운동")) return "/images/videos/exercise-walking.svg";
  if (category.includes("수면")) return "/images/videos/sleep-routine.svg";
  if (category.includes("생활")) return "/images/videos/hypertension-lifestyle.svg";
  return undefined;
}
