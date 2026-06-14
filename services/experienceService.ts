import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getApprovedExperiences as getStaticApprovedExperiences,
  getExperienceBySlug as getStaticExperienceBySlug,
  getExperiences,
  getExperiencesByDisease as getStaticExperiencesByDisease,
} from "@/data/experiences";
import type { Experience } from "@/data/types";
import { isSupabaseConfigured } from "./dataSource";

const EXPERIENCE_DRAFTS_KEY = "healthKnowhowExperienceDrafts";
const ADMIN_REVIEWS_KEY = "healthKnowhowAdminReviews";

export type ExperienceStatus = Experience["status"] | "needs_revision";
export type ExperienceDraftInput = Partial<Experience> & {
  title: string;
  diseaseOrSymptom: string;
  agreeToPublic: boolean;
  agreeMedicalDisclaimer: boolean;
};

export async function getApprovedExperiences() {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("experiences")
        .select("*")
        .eq("status", "approved")
        .eq("agree_to_public", true)
        .order("created_at", { ascending: false });

      if (!error && data) return data.map(mapSupabaseExperience);
    }
  }

  return getStaticApprovedExperiences();
}

export async function getExperienceBySlug(slug: string) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { data, error } = await supabase.from("experiences").select("*").eq("slug", slug).maybeSingle();
      if (!error && data) return mapSupabaseExperience(data);
    }
  }

  return getStaticExperienceBySlug(slug);
}

export async function createExperienceDraft(input: ExperienceDraftInput) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { data, error } = await supabase.from("experiences").insert(toSupabaseExperienceInput(input)).select().maybeSingle();
      if (!error && data) return mapSupabaseExperience(data);
    }
  }

  const now = new Date().toISOString();
  const id = input.id ?? `draft-${Date.now()}`;
  const draft: Experience = {
    id,
    slug: input.slug ?? id,
    diseaseId: input.diseaseId,
    diseaseSlug: input.diseaseSlug,
    diseaseName: input.diseaseName ?? input.diseaseOrSymptom,
    diseaseOrSymptom: input.diseaseOrSymptom,
    category: input.category ?? "생활습관",
    nickname: input.nickname ?? "익명",
    title: input.title,
    summary: input.summary ?? input.symptomDescription ?? "",
    content: input.content ?? input.symptomDescription ?? "",
    hospitalVisited: input.hospitalVisited ?? "진료받지 않음",
    symptomDescription: input.symptomDescription ?? input.summary ?? "",
    helpfulFoods: input.helpfulFoods ?? "",
    cautionFoods: input.cautionFoods ?? "",
    helpfulExercises: input.helpfulExercises ?? "",
    helpfulHabits: input.helpfulHabits ?? "",
    helpfulLifestyle: input.helpfulLifestyle ?? input.helpfulHabits ?? "",
    helpfulVideos: input.helpfulVideos ?? input.resourceLink ?? "",
    resourceLink: input.resourceLink ?? input.helpfulVideos ?? "",
    caution: input.caution ?? "",
    relatedTags: input.relatedTags ?? [],
    status: "pending",
    createdAt: now,
    updatedAt: now,
    symptom: input.symptom ?? input.diseaseOrSymptom,
    isPersonalExperience: true,
    agreeToPublic: input.agreeToPublic,
    agreeMedicalDisclaimer: input.agreeMedicalDisclaimer,
  };

  saveLocalExperienceDraft(draft);
  return draft;
}

export async function updateExperienceStatus(id: string, status: ExperienceStatus, adminNote: string) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { error } = await supabase
        .from("experiences")
        .update({
          status,
          admin_note: adminNote,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (!error) return { id, status, adminNote };
    }
  }

  const reviews = loadLocalReviewMap();
  reviews[id] = { status, reviewNote: adminNote, updatedAt: new Date().toISOString() };
  saveLocalReviewMap(reviews);
  return { id, status, adminNote };
}

export async function getPendingExperiences() {
  const experiences = await getAllExperienceFallback();
  return experiences.filter((experience) => experience.status === "pending");
}

export async function getExperiencesByDiseaseId(diseaseId: string) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("experiences")
        .select("*")
        .eq("disease_id", diseaseId)
        .eq("status", "approved");
      if (!error && data) return data.map(mapSupabaseExperience);
    }
  }

  return getStaticExperiencesByDisease(diseaseId);
}

export async function searchExperiences(query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const experiences = await getAllExperienceFallback();
  if (!normalizedQuery) return experiences;

  return experiences.filter((experience) =>
    [
      experience.title,
      experience.summary,
      experience.content,
      experience.diseaseName,
      experience.symptom,
      experience.category,
      ...experience.relatedTags,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

async function getAllExperienceFallback() {
  return [...getExperiences(), ...loadLocalExperienceDrafts()];
}

function loadLocalExperienceDrafts(): Experience[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(EXPERIENCE_DRAFTS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Experience[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalExperienceDraft(draft: Experience) {
  if (typeof window === "undefined") return;
  const drafts = loadLocalExperienceDrafts();
  window.localStorage.setItem(EXPERIENCE_DRAFTS_KEY, JSON.stringify([draft, ...drafts]));
}

function loadLocalReviewMap(): Record<string, { status: ExperienceStatus; reviewNote: string; updatedAt: string }> {
  if (typeof window === "undefined") return {};

  try {
    const stored = window.localStorage.getItem(ADMIN_REVIEWS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveLocalReviewMap(reviews: Record<string, { status: ExperienceStatus; reviewNote: string; updatedAt: string }>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_REVIEWS_KEY, JSON.stringify(reviews));
}

function toSupabaseExperienceInput(input: ExperienceDraftInput) {
  return {
    disease_id: input.diseaseId,
    disease_name: input.diseaseName ?? input.diseaseOrSymptom,
    symptom: input.symptom ?? input.diseaseOrSymptom,
    category: input.category ?? "생활습관",
    nickname: input.nickname ?? "익명",
    title: input.title,
    summary: input.summary ?? input.symptomDescription ?? "",
    content: input.content ?? input.symptomDescription ?? "",
    hospital_visited: input.hospitalVisited ?? "진료받지 않음",
    helpful_foods: toArray(input.helpfulFoods),
    caution_foods: toArray(input.cautionFoods),
    helpful_exercises: toArray(input.helpfulExercises),
    helpful_habits: toArray(input.helpfulHabits ?? input.helpfulLifestyle),
    helpful_videos: toArray(input.helpfulVideos ?? input.resourceLink),
    caution: input.caution ?? "",
    related_tags: input.relatedTags ?? [],
    status: "pending",
    agree_to_public: input.agreeToPublic,
    agree_medical_disclaimer: input.agreeMedicalDisclaimer,
  };
}

function mapSupabaseExperience(row: Record<string, unknown>): Experience {
  return {
    id: String(row.id),
    slug: String(row.slug ?? row.id),
    diseaseId: optionalString(row.disease_id),
    diseaseSlug: optionalString(row.disease_id),
    diseaseName: String(row.disease_name ?? row.symptom ?? ""),
    diseaseOrSymptom: String(row.disease_name ?? row.symptom ?? ""),
    category: String(row.category ?? "생활습관"),
    nickname: String(row.nickname ?? "익명"),
    title: String(row.title ?? ""),
    summary: String(row.summary ?? ""),
    content: String(row.content ?? ""),
    hospitalVisited: String(row.hospital_visited ?? "진료받지 않음"),
    symptomDescription: String(row.symptom ?? row.summary ?? ""),
    helpfulFoods: toText(row.helpful_foods),
    cautionFoods: toText(row.caution_foods),
    helpfulExercises: toText(row.helpful_exercises),
    helpfulHabits: toText(row.helpful_habits),
    helpfulLifestyle: toText(row.helpful_habits),
    helpfulVideos: toText(row.helpful_videos),
    resourceLink: toText(row.helpful_videos),
    caution: String(row.caution ?? ""),
    relatedTags: Array.isArray(row.related_tags) ? row.related_tags.map(String) : [],
    status: toExperienceStatus(row.status),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    symptom: String(row.symptom ?? ""),
    isPersonalExperience: true,
    agreeToPublic: Boolean(row.agree_to_public),
    agreeMedicalDisclaimer: Boolean(row.agree_medical_disclaimer),
  };
}

function toExperienceStatus(value: unknown): Experience["status"] {
  if (value === "approved" || value === "pending" || value === "rejected") return value;
  return "pending";
}

function optionalString(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function toArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.trim()) return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function toText(value: unknown) {
  if (Array.isArray(value)) return value.map(String).join(", ");
  return typeof value === "string" ? value : "";
}
