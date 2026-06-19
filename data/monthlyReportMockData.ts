export type MonthlyReport = {
  id: string;
  userId: string;
  reportMonth: string;
  periodLabel: string;
  summary: string;
  symptomCount: number;
  photoCount: number;
  medicalVisitCount: number;
  medicineRecordCount: number;
  referenceCount: number;
};

export type MonthlySymptomSummary = {
  id: string;
  mainSymptom: string;
  recordPeriod: string;
  improvedPoint: string;
  observationPoint: string;
  consultationPoint: string;
};

export type MonthlyPhotoTimelineItem = {
  id: string;
  date: string;
  photoType: string;
  memo: string;
  privacyLabel: "비공개";
};

export type MonthlyMedicalVisit = {
  id: string;
  visitDate: string;
  hospitalName: string;
  specialty: string;
  doctorNote: string;
  treatmentSummary: string;
  nextVisitDate: string;
};

export type MonthlyMedicineRecord = {
  id: string;
  medicineName: string;
  medicineType: "먹는 약" | "연고" | "소독약";
  frequency: string;
  timing: string;
  period: string;
  memo: string;
};

export type SuggestedDoctorQuestion = {
  id: string;
  question: string;
};

export const sampleMonthlyReport: MonthlyReport = {
  id: "monthly-report-2026-06",
  userId: "mock-user",
  reportMonth: "2026-06",
  periodLabel: "2026년 6월",
  summary: "피부 상처 경과, 사진 변화, 병원 방문, 연고 사용 기록을 중심으로 정리한 mock 리포트입니다.",
  symptomCount: 3,
  photoCount: 4,
  medicalVisitCount: 1,
  medicineRecordCount: 3,
  referenceCount: 2,
};

export const monthlySymptomSummary: MonthlySymptomSummary[] = [
  {
    id: "symptom-summary-ankle-wound",
    mainSymptom: "발목 주변 상처와 붓기",
    recordPeriod: "2026년 6월 1일 ~ 2026년 6월 20일",
    improvedPoint: "초기 사진과 비교했을 때 붉은 범위가 줄어든 것으로 기록했습니다.",
    observationPoint: "진물 여부, 통증 정도, 붓기 변화를 계속 관찰할 필요가 있습니다.",
    consultationPoint: "당뇨 등 기저질환이 있는 경우 상처 회복 지연 여부를 의료진과 상담할 수 있습니다.",
  },
];

export const monthlyPhotoTimeline: MonthlyPhotoTimelineItem[] = [
  {
    id: "photo-timeline-0601",
    date: "6월 1일",
    photoType: "처음 기록",
    memo: "발목 주변 상처를 처음 사진으로 남겼습니다.",
    privacyLabel: "비공개",
  },
  {
    id: "photo-timeline-0605",
    date: "6월 5일",
    photoType: "경과 사진",
    memo: "붓기와 진물 여부를 비교하기 위해 같은 각도로 기록했습니다.",
    privacyLabel: "비공개",
  },
  {
    id: "photo-timeline-0612",
    date: "6월 12일",
    photoType: "병원 방문 후 기록",
    memo: "병원 방문 후 처방받은 연고 사용을 시작한 시점입니다.",
    privacyLabel: "비공개",
  },
  {
    id: "photo-timeline-0620",
    date: "6월 20일",
    photoType: "치료 후 변화 기록",
    memo: "색 변화와 통증 정도를 다음 진료 때 설명하기 위해 기록했습니다.",
    privacyLabel: "비공개",
  },
];

export const monthlyMedicalVisits: MonthlyMedicalVisit[] = [
  {
    id: "visit-2026-06-12",
    visitDate: "2026-06-12",
    hospitalName: "비공개 병원 mock",
    specialty: "피부과",
    doctorNote: "상처 부위 변화와 감염 의심 여부를 관찰하라는 설명을 들었다고 기록했습니다.",
    treatmentSummary: "외용제 처방 및 상처 부위 관리 안내 mock",
    nextVisitDate: "2026-06-26",
  },
];

export const monthlyMedicineRecords: MonthlyMedicineRecord[] = [
  {
    id: "medicine-ointment-001",
    medicineName: "처방 연고 mock",
    medicineType: "연고",
    frequency: "하루 2회",
    timing: "아침 / 저녁",
    period: "7일",
    memo: "상처 부위에 얇게 바른 것으로 기록했습니다.",
  },
  {
    id: "medicine-oral-001",
    medicineName: "먹는 약 mock",
    medicineType: "먹는 약",
    frequency: "하루 2회",
    timing: "식후",
    period: "5일",
    memo: "복용 시간과 속 불편 여부를 함께 기록했습니다.",
  },
  {
    id: "medicine-disinfectant-001",
    medicineName: "소독약 mock",
    medicineType: "소독약",
    frequency: "필요 시",
    timing: "세척 후",
    period: "증상 관찰 기간",
    memo: "사용 후 따가움 여부를 메모했습니다.",
  },
];

export const suggestedDoctorQuestions: SuggestedDoctorQuestion[] = [
  { id: "question-001", question: "상처가 오래 지속되는 원인을 추가로 확인해야 할까요?" },
  { id: "question-002", question: "현재 사용 중인 연고를 계속 사용해도 될까요?" },
  { id: "question-003", question: "당뇨 관리와 상처 회복이 관련이 있을까요?" },
  { id: "question-004", question: "추가 검사가 필요한 상태일까요?" },
  { id: "question-005", question: "다음 방문 전까지 어떤 변화를 관찰하면 좋을까요?" },
];
