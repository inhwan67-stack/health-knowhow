import { readCsvRows } from "./csv";
import type { ArticleResource } from "./types";

export function getArticles(): ArticleResource[] {
  return readCsvRows("articles.csv").map((row) => ({
    id: row.id,
    diseaseId: row.diseaseId,
    diseaseSlug: row.diseaseId,
    title: row.title,
    source: row.source,
    type: row.type,
    summary: row.summary,
    url: row.url || "https://health.kdca.go.kr/",
    lastReviewed: row.lastReviewed,
  }));
}

export function getArticlesByDisease(diseaseId: string) {
  return getArticles().filter((article) => article.diseaseId === diseaseId);
}
