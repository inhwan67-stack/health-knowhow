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
