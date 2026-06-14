import { getExperiences } from "@/data/experiences";
import { checkMedicalReviewPhrases } from "@/data/reviewRules";
import type { Experience } from "@/data/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "./dataSource";
import { updateExperienceStatus, type ExperienceStatus } from "./experienceService";

const ADMIN_REVIEWS_KEY = "healthKnowhowAdminReviews";

export type AdminReviewAction = {
  id: string;
  status: ExperienceStatus;
  adminNote: string;
  updatedAt: string;
};

export async function getAdminReviewStats() {
  const experiences = getExperiences();
  return {
    total: experiences.length,
    pending: experiences.filter((experience) => experience.status === "pending").length,
    approved: experiences.filter((experience) => experience.status === "approved").length,
    rejected: experiences.filter((experience) => experience.status === "rejected").length,
    localReviewActions: Object.keys(loadLocalReviewMap()).length,
  };
}

export async function getPendingReviewItems() {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { data, error } = await supabase.from("experiences").select("*").eq("status", "pending");
      if (!error && data) return data as unknown[];
    }
  }

  return getExperiences().filter((experience) => experience.status === "pending");
}

export function approveExperience(id: string, adminNote: string) {
  return saveReviewAction(id, "approved", adminNote);
}

export function rejectExperience(id: string, adminNote: string) {
  return saveReviewAction(id, "rejected", adminNote);
}

export function markNeedsRevision(id: string, adminNote: string) {
  return saveReviewAction(id, "needs_revision", adminNote);
}

export function scanRiskyExpressions(text: string) {
  return checkMedicalReviewPhrases(text);
}

async function saveReviewAction(id: string, status: ExperienceStatus, adminNote: string) {
  if (isSupabaseConfigured()) {
    return updateExperienceStatus(id, status, adminNote);
  }

  const reviews = loadLocalReviewMap();
  const action: AdminReviewAction = {
    id,
    status,
    adminNote,
    updatedAt: new Date().toISOString(),
  };
  reviews[id] = action;
  saveLocalReviewMap(reviews);
  return action;
}

function loadLocalReviewMap(): Record<string, AdminReviewAction> {
  if (typeof window === "undefined") return {};

  try {
    const stored = window.localStorage.getItem(ADMIN_REVIEWS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveLocalReviewMap(reviews: Record<string, AdminReviewAction>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_REVIEWS_KEY, JSON.stringify(reviews));
}

export function buildReviewText(experience: Experience) {
  return [
    experience.title,
    experience.summary,
    experience.content,
    experience.symptomDescription,
    experience.helpfulFoods,
    experience.cautionFoods,
    experience.helpfulExercises,
    experience.helpfulHabits,
    experience.helpfulLifestyle,
    experience.caution,
  ]
    .filter(Boolean)
    .join("\n");
}

// Future Supabase work: persist every review action to admin_reviews with reviewer_id,
// previous_status, new_status, and admin_note after admin authentication is introduced.
