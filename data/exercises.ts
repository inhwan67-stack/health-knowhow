import { readCsvRows, splitList } from "./csv";
import type { ExerciseGuide } from "./types";

export function getExerciseGuides(): ExerciseGuide[] {
  return readCsvRows("exercises.csv").map((row) => ({
    id: row.id,
    diseaseId: row.diseaseId,
    symptomKeywords: splitList(row.symptomKeywords),
    title: row.title,
    category: row.category,
    description: row.description,
    recommendedExercises: splitList(row.recommendedExercises),
    cautionExercises: splitList(row.cautionExercises),
    suitableFor: row.suitableFor,
    notSuitableFor: row.notSuitableFor,
    intensity: row.intensity,
    frequency: row.frequency,
    duration: row.duration,
    warning: row.warning,
    videoSearchUrl: row.videoSearchUrl,
  }));
}

export function getExerciseGuidesByDisease(diseaseId: string) {
  return getExerciseGuides().filter((guide) => guide.diseaseId === diseaseId);
}
