export type DiseaseCategory =
  | "소화기 질환"
  | "심혈관 질환"
  | "대사 질환"
  | "근골격계 질환"
  | "호흡기 질환"
  | "피부 질환"
  | "정신건강 / 수면"
  | string;

export type Disease = {
  id: string;
  slug: string;
  name: string;
  category: DiseaseCategory;
  summary: string;
  description: string;
  relatedSymptoms: string[];
  symptoms: string[];
  causes: string[];
  lifestyle: string[];
  diet: string[];
  recommendedFoods: string[];
  avoidFoods: string[];
  warning: string;
  warningSigns: string[];
  department: string[];
  departments: string[];
  doctorQuestions: string[];
  sourceRefs: string[];
  searchKeywords: string[];
  keywords: string[];
};

export type Symptom = {
  id: string;
  name: string;
  relatedDiseaseIds: string[];
  category: DiseaseCategory;
  description: string;
  emergencyLevel: "normal" | "caution" | "emergency";
  recommendedAction: string;
  searchAliases: string[];
};

export type VideoResource = {
  id: string;
  diseaseId: string;
  diseaseSlug: string;
  title: string;
  channel: string;
  summary: string;
  url: string;
  category: string;
};

export type ArticleResource = {
  id: string;
  diseaseId: string;
  diseaseSlug: string;
  title: string;
  source: string;
  type: "웹문서" | "블로그" | "카페" | "논문" | "뉴스" | string;
  summary: string;
  url: string;
  lastReviewed: string;
};

export type FoodGuide = {
  diseaseSlug: string;
  helpful: string[];
  avoid: string[];
  note: string;
};

export type ExerciseGuide = {
  id: string;
  diseaseId: string;
  symptomKeywords: string[];
  title: string;
  category: string;
  description: string;
  recommendedExercises: string[];
  cautionExercises: string[];
  suitableFor: string;
  notSuitableFor: string;
  intensity: "낮음" | "보통" | "높음" | string;
  frequency: string;
  duration: string;
  warning: string;
  videoSearchUrl: string;
};

export type DietGuide = {
  id: string;
  diseaseId: string;
  symptomKeywords: string[];
  title: string;
  description: string;
  recommendedIngredients: string[];
  cautionIngredients: string[];
  mealTips: string[];
  avoidPatterns: string[];
  suitableFor: string;
  warning: string;
  videoSearchUrl: string;
};

export type Experience = {
  id: string;
  slug: string;
  diseaseId?: string;
  diseaseSlug?: string;
  diseaseName: string;
  diseaseOrSymptom: string;
  category: "식이요법" | "운동요법" | "생활습관" | "병원진료" | "증상기록" | "기타" | string;
  nickname: string;
  title: string;
  summary: string;
  content: string;
  hospitalVisited: "진료받지 않음" | "진료 예정" | "진료받음" | "정기적으로 관리 중" | string;
  symptomDescription: string;
  helpfulFoods: string;
  cautionFoods: string;
  helpfulExercises: string;
  helpfulHabits: string;
  helpfulLifestyle: string;
  helpfulVideos: string;
  resourceLink: string;
  caution: string;
  relatedTags: string[];
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  symptom: string;
  isPersonalExperience: boolean;
  agreeToPublic: boolean;
  agreeMedicalDisclaimer: boolean;
};
