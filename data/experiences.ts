import { readCsvRows, splitList } from "./csv";
import { getDiseaseBySlug } from "./diseases";
import type { Experience } from "./types";

export function getExperiences(): Experience[] {
  return readCsvRows("experiences.csv").map((row) => {
    const disease = getDiseaseBySlug(row.diseaseId);
    const helpfulFoods = splitList(row.helpfulFoods).join(", ");
    const helpfulHabits = splitList(row.helpfulHabits).join(", ");
    const helpfulExercises = splitList(row.helpfulExercises).join(", ");
    const diseaseName = row.diseaseName || disease?.name || row.diseaseId;

    return {
      id: row.id,
      slug: row.slug || row.id,
      diseaseId: row.diseaseId,
      diseaseSlug: row.diseaseId,
      diseaseName,
      diseaseOrSymptom: diseaseName || row.symptom || row.diseaseId,
      category: row.category || "생활습관",
      nickname: row.nickname,
      title: row.title,
      summary: row.summary,
      content: row.content,
      hospitalVisited: row.hospitalVisited || "진료받지 않음",
      symptomDescription: row.symptom || row.summary,
      helpfulFoods,
      cautionFoods: splitList(row.cautionFoods).join(", "),
      helpfulExercises,
      helpfulHabits,
      helpfulLifestyle: helpfulHabits,
      helpfulVideos: row.helpfulVideos,
      resourceLink: row.helpfulVideos,
      caution: row.caution,
      relatedTags: splitList(row.relatedTags),
      status: toExperienceStatus(row.status),
      createdAt: row.createdAt || "2026-06-14",
      updatedAt: row.updatedAt || row.createdAt || "2026-06-14",
      symptom: row.symptom,
      isPersonalExperience: row.isPersonalExperience !== "false",
      agreeToPublic: row.agreeToPublic !== "false",
      agreeMedicalDisclaimer: row.agreeMedicalDisclaimer !== "false",
    };
  });
}

export function getApprovedExperiences() {
  // Future admin flow can use the same CSV fields to review pending items,
  // approve/reject submissions, remove sensitive data, and check unsafe medical claims.
  return getExperiences().filter((experience) => experience.status === "approved" && experience.agreeToPublic);
}

export function getExperiencesByDisease(diseaseId: string) {
  return getApprovedExperiences().filter((experience) => experience.diseaseId === diseaseId);
}

export function getExperienceBySlug(slug: string) {
  return getApprovedExperiences().find((experience) => experience.slug === slug);
}

function toExperienceStatus(value: string): Experience["status"] {
  if (value === "pending" || value === "approved" || value === "rejected") return value;
  return "approved";
}
