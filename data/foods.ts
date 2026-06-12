import { getDiseases } from "./diseases";
import type { FoodGuide } from "./types";

export function getFoodGuides(): FoodGuide[] {
  return getDiseases().map((disease) => ({
    diseaseSlug: disease.slug,
    helpful: disease.recommendedFoods,
    avoid: disease.avoidFoods,
    note: disease.diet.join(" "),
  }));
}

export function getFoodGuideByDisease(slug: string) {
  return getFoodGuides().find((guide) => guide.diseaseSlug === slug);
}
