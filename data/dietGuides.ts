import { readCsvRows, splitList } from "./csv";
import type { DietGuide } from "./types";

export function getDetailedDietGuides(): DietGuide[] {
  return readCsvRows("dietGuides.csv").map((row) => ({
    id: row.id,
    diseaseId: row.diseaseId,
    symptomKeywords: splitList(row.symptomKeywords),
    title: row.title,
    description: row.description,
    recommendedIngredients: splitList(row.recommendedIngredients),
    cautionIngredients: splitList(row.cautionIngredients),
    mealTips: splitList(row.mealTips),
    avoidPatterns: splitList(row.avoidPatterns),
    suitableFor: row.suitableFor,
    warning: row.warning,
    videoSearchUrl: row.videoSearchUrl,
  }));
}

export function getDetailedDietGuidesByDisease(diseaseId: string) {
  return getDetailedDietGuides().filter((guide) => guide.diseaseId === diseaseId);
}
