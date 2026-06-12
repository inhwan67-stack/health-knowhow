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
  keywords: string[];
};

export type VideoResource = {
  id: string;
  diseaseId: string;
  diseaseSlug: string;
  title: string;
  channel: string;
  summary: string;
  url: string;
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
};

export type FoodGuide = {
  diseaseSlug: string;
  helpful: string[];
  avoid: string[];
  note: string;
};

export type Experience = {
  id: string;
  diseaseId?: string;
  diseaseSlug?: string;
  diseaseOrSymptom: string;
  nickname: string;
  title: string;
  summary: string;
  content: string;
  symptomDescription: string;
  helpfulFoods: string;
  helpfulHabits: string;
  helpfulLifestyle: string;
  resourceLink: string;
  caution: string;
};
