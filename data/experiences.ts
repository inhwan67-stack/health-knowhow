import { readCsvRows, splitList } from "./csv";
import { getDiseaseBySlug } from "./diseases";
import type { Experience } from "./types";

export function getExperiences(): Experience[] {
  return readCsvRows("experiences.csv").map((row) => {
    const disease = getDiseaseBySlug(row.diseaseId);
    const helpfulFoods = splitList(row.helpfulFoods).join(", ");
    const helpfulHabits = splitList(row.helpfulHabits).join(", ");

    return {
      id: row.id,
      diseaseId: row.diseaseId,
      diseaseSlug: row.diseaseId,
      diseaseOrSymptom: disease?.name ?? row.diseaseId,
      nickname: row.nickname,
      title: row.title,
      summary: row.summary,
      content: row.content,
      symptomDescription: row.summary,
      helpfulFoods,
      helpfulHabits,
      helpfulLifestyle: helpfulHabits,
      resourceLink: "",
      caution: row.caution,
    };
  });
}

export function getExperiencesByDisease(diseaseId: string) {
  return getExperiences().filter((experience) => experience.diseaseId === diseaseId);
}
