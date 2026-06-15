export type HospitalVisitStatus = "아직 방문하지 않음" | "방문 예정" | "이미 방문함";

export type SymptomRecord = {
  id: string;
  symptomName: string;
  startDate: string;
  severity: number;
  worseTime: string;
  relatedFoods: string;
  medicines: string;
  lifestyleChanges: string;
  hospitalVisitStatus: HospitalVisitStatus;
  memo: string;
  agreeToShare: boolean;
  createdAt: string;
};

export type Guide = {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  intro: string;
  symptomsToCheck: string[];
  relatedHealthInfo: string[];
  warningSigns: string[];
  lifestyleTips: string[];
  dietTips: string[];
  exerciseTips: string[];
  cautionExerciseTips?: string[];
  hospitalChecklist: string[];
  doctorQuestions: string[];
  relatedVideoIds: string[];
  relatedArticleIds: string[];
  relatedExperienceIds: string[];
  seoTitle: string;
  seoDescription: string;
  createdAt: string;
  updatedAt: string;
};

export type {
  ArticleResource,
  DietGuide,
  Disease,
  ExerciseGuide,
  Experience,
  Symptom,
  VideoResource,
} from "@/data/types";
export type { AffiliateProduct } from "@/data/affiliateProducts";
export type { ClinicGuide as ClinicInfo } from "@/data/clinics";
