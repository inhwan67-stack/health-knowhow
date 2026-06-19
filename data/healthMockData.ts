export type HealthCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  topics: string[];
};

export type HealthArticle = {
  id: string;
  title: string;
  slug: string;
  category?: string;
  categoryId: string;
  summary: string;
  content?: string;
  status: "draft" | "review" | "published" | "archived";
  adEnabled: boolean;
  seoTitle: string;
  seoDescription: string;
  tags?: string[];
  readTime?: string;
  publishedAt?: string;
  tableOfContents?: string[];
  sections?: { heading: string; body: string[] }[];
  sources?: ArticleSource[];
  relatedCases?: RelatedCase[];
  relatedSpecialties?: RelatedSpecialty[];
};

export type ArticleSource = {
  id: string;
  articleId: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceType: "public" | "medical" | "blog" | "youtube" | "other";
  summary: string;
};

export type RelatedCase = {
  id: string;
  title: string;
  summary: string;
  privacyNote: string;
};

export type RelatedSpecialty = {
  id: string;
  name: string;
  description: string;
};

export type CasePhoto = {
  id: string;
  caseId: string;
  photoUrl: string;
  photoType: "symptom" | "prescription" | "medicine_bag" | "medicine";
  takenAt: string;
  memo: string;
  isPrivate: boolean;
};

export type CaseMedicalVisit = {
  id: string;
  caseId: string;
  hospitalName: string;
  specialty: string;
  visitDate: string;
  doctorNote: string;
  diagnosisText: string;
  treatmentSummary: string;
};

export type CaseMedicine = {
  id: string;
  caseId: string;
  medicineName: string;
  medicineType: "tablet" | "capsule" | "ointment" | "liquid" | "external" | "other";
  dose: string;
  frequency: string;
  timing: string;
  startDate: string;
  endDate: string;
  memo: string;
  sourceDocumentId?: string;
};

export type CaseReference = {
  id: string;
  caseId?: string;
  title: string;
  url: string;
  sourceType: "public" | "medical" | "korean_medicine" | "home_remedy" | "user_experience" | "youtube" | "blog";
  summary: string;
  userMemo?: string;
  reliabilityLevel: "official" | "user_experience" | "needs_verification";
  warningNote: string;
};

export type HealthCase = {
  id: string;
  userId: string;
  title: string;
  bodyPart: string;
  symptomType: string;
  description: string;
  startedAt: string;
  durationText: string;
  underlyingConditions: string[];
  privacyStatus: "private" | "shared_anonymous" | "public";
  shareStatus: "none" | "requested" | "approved" | "rejected" | "needs_revision";
  photos: CasePhoto[];
  medicalVisits: CaseMedicalVisit[];
  medicines: CaseMedicine[];
  references: CaseReference[];
};

export type MedicalSpecialty = {
  id: string;
  name: string;
  description: string;
  relatedSymptoms: string[];
};

export type SpecialtyMapping = {
  id: string;
  symptomKeyword: string;
  bodyPart: string;
  specialtyId: string;
  cautionLevel: "normal" | "caution" | "urgent";
  guideText: string;
};

export type MonthlyReport = {
  id: string;
  userId: string;
  reportMonth: string;
  summary: string;
  symptomChanges: string[];
  medicalVisitsSummary: string;
  medicineSummary: string;
  suggestedQuestions: string[];
  relatedArticles: string[];
};

export const healthCategories: HealthCategory[] = [
  { id: "cat-diabetes", name: "당뇨", slug: "diabetes", description: "혈당, 식사, 상처 관리 참고자료", topics: ["당뇨 초기증상", "혈당스파이크", "당뇨 식이요법", "당뇨와 상처 관리"] },
  { id: "cat-hypertension", name: "고혈압", slug: "hypertension", description: "혈압 기록과 생활관리 참고자료", topics: ["혈압이 오르는 습관", "가정 혈압 기록법", "저염 식단", "두통과 혈압"] },
  { id: "cat-skin", name: "피부질환", slug: "skin", description: "상처, 발진, 가려움 기록 참고자료", topics: ["피부 상처 관리", "발진과 가려움", "연고 사용 기록", "진물과 감염 신호"] },
  { id: "cat-joint-back", name: "관절/허리", slug: "joint-back", description: "통증 경과와 운동 주의 참고자료", topics: ["허리 통증 기록", "무릎 통증 관리", "발목 염좌", "운동 전 주의사항"] },
  { id: "cat-digestive", name: "위장질환", slug: "digestive", description: "복통, 속쓰림, 식사 기록 참고자료", topics: ["속쓰림과 식사", "복통 기록법", "장염 후 식단", "소화불량 체크"] },
  { id: "cat-women", name: "여성질환", slug: "women", description: "산부인과 상담 전 기록 참고자료", topics: ["생리통 기록", "질염 의심 증상", "임신 관련 상담", "산부인과 방문 전 체크"] },
  { id: "cat-men", name: "남성질환", slug: "men", description: "비뇨의학과 상담 전 기록 참고자료", topics: ["전립선 증상", "배뇨 변화", "혈뇨 기록", "비뇨의학과 상담 준비"] },
  { id: "cat-diet", name: "식이요법", slug: "diet", description: "질환별 식사 참고자료", topics: ["염분 줄이기", "혈당 관리 식단", "위장에 부담 적은 식사", "회복기 식사"] },
  { id: "cat-exercise", name: "운동요법", slug: "exercise", description: "통증과 회복기 운동 참고자료", topics: ["걷기 루틴", "허리 부담 줄이기", "관절 통증 운동 주의", "회복기 스트레칭"] },
];

export const sampleArticles: HealthArticle[] = [
  {
    id: "article-diabetes-wound",
    title: "당뇨가 있을 때 작은 상처를 기록해야 하는 이유",
    slug: "diabetes-wound-tracking",
    category: "당뇨",
    categoryId: "cat-diabetes",
    summary: "상처 사진, 통증, 진물 여부를 날짜별로 정리하는 방법을 설명합니다.",
    content:
      "당뇨가 있는 경우 작은 상처라도 경과를 관찰하고 기록하는 것이 도움이 될 수 있습니다. 상처의 위치, 발생일, 붓기, 진물, 통증 변화, 사용한 연고나 약을 함께 남기면 의료진 상담 때 상황을 더 구체적으로 설명할 수 있습니다. 이 내용은 일반 건강정보이며 진단이나 치료를 대체하지 않습니다.",
    tags: ["당뇨", "상처", "피부", "증상기록"],
    sources: [
      {
        id: "source-diabetes-wound-public",
        articleId: "article-diabetes-wound",
        sourceTitle: "공공 건강정보 자료",
        sourceUrl: "/search?q=당뇨 상처 관리",
        sourceType: "public",
        summary: "당뇨와 상처 관리 관련 공공기관 자료를 연결하기 위한 mock 출처입니다.",
      },
    ],
    status: "published",
    adEnabled: true,
    seoTitle: "당뇨 상처 관리 기록 방법",
    seoDescription: "당뇨가 있는 사용자가 상처 경과를 기록할 때 참고할 수 있는 항목을 정리합니다.",
  },
  {
    id: "article-skin-rash",
    title: "발진과 가려움이 있을 때 남겨두면 좋은 기록",
    slug: "skin-rash-record",
    category: "피부질환",
    categoryId: "cat-skin",
    summary: "부위, 발생일, 사진, 연고 사용 여부를 정리하는 체크리스트입니다.",
    content:
      "발진이나 가려움은 원인이 다양할 수 있으므로 증상만으로 판단하기 어렵습니다. 발생 부위, 시작일, 가려움 정도, 붓기 여부, 사용한 연고, 사진 기록을 남기면 의료기관 상담 전 정리에 도움이 될 수 있습니다. 증상이 심하거나 오래 지속되면 의료진과 상담하세요.",
    tags: ["피부질환", "발진", "가려움", "사진기록"],
    sources: [
      {
        id: "source-skin-rash-medical",
        articleId: "article-skin-rash",
        sourceTitle: "의료기관 피부 증상 안내",
        sourceUrl: "/search?q=피부 발진 가려움",
        sourceType: "medical",
        summary: "피부 발진과 가려움 증상 관련 의료기관 자료를 연결하기 위한 mock 출처입니다.",
      },
    ],
    status: "published",
    adEnabled: true,
    seoTitle: "발진 가려움 기록 체크리스트",
    seoDescription: "피부 발진과 가려움 경과 기록에 필요한 항목을 안내합니다.",
  },
];

// Health photos, prescriptions, medicine bags, medical visits, and medicines are sensitive data.
// Keep mock records private by default and require explicit consent plus admin review before any anonymous sharing.
export const sampleCases: HealthCase[] = [
  {
    id: "case-001",
    userId: "mock-user",
    title: "발등 상처 경과 기록",
    bodyPart: "발등",
    symptomType: "상처/진물",
    description: "발등에 작은 상처가 생긴 뒤 붉은기와 진물 여부를 기록합니다.",
    startedAt: "2026-06-01",
    durationText: "약 1주",
    underlyingConditions: ["당뇨"],
    privacyStatus: "private",
    shareStatus: "none",
    photos: [
      { id: "photo-001", caseId: "case-001", photoUrl: "/images/mock/symptom-photo-placeholder.png", photoType: "symptom", takenAt: "2026-06-01", memo: "처음 발견한 날", isPrivate: true },
    ],
    medicalVisits: [
      {
        id: "visit-001",
        caseId: "case-001",
        hospitalName: "비공개",
        specialty: "피부과",
        visitDate: "2026-06-04",
        doctorNote: "사용자 메모 영역",
        diagnosisText: "사용자가 입력한 참고 텍스트",
        treatmentSummary: "연고 처방 및 경과 관찰",
      },
    ],
    medicines: [
      {
        id: "medicine-001",
        caseId: "case-001",
        medicineName: "연고명 비공개",
        medicineType: "ointment",
        dose: "소량",
        frequency: "하루 2회",
        timing: "아침/저녁",
        startDate: "2026-06-04",
        endDate: "2026-06-10",
        memo: "외용제 사용 기록",
      },
    ],
    references: [],
  },
];

export const sampleReferences: CaseReference[] = [
  {
    id: "ref-public-diabetes",
    title: "당뇨병 생활관리 안내",
    url: "/search?q=당뇨",
    sourceType: "public",
    summary: "혈당 기록, 식사 조절, 발 관리 등 기본 생활관리 참고자료입니다.",
    reliabilityLevel: "official",
    warningNote: "개인 상태에 따라 적용 방법이 달라질 수 있습니다.",
  },
  {
    id: "ref-user-skin",
    title: "피부 상처 관리 경험",
    url: "/experiences",
    sourceType: "user_experience",
    summary: "상처 사진을 날짜별로 남기고 병원 방문 시 보여준 사례입니다.",
    reliabilityLevel: "user_experience",
    warningNote: "개인 경험이며 치료법으로 해석하면 안 됩니다.",
  },
  {
    id: "ref-remedy-food",
    title: "민간요법으로 알려진 식재료 정리",
    url: "/search?q=민간요법",
    sourceType: "home_remedy",
    summary: "온라인에서 자주 언급되는 식재료와 주의점을 함께 정리합니다.",
    reliabilityLevel: "needs_verification",
    warningNote: "약 복용 중이거나 기저질환이 있으면 의료진 상담이 필요합니다.",
  },
  {
    id: "ref-youtube-exercise",
    title: "운동 재활 영상 모음",
    url: "/videos",
    sourceType: "youtube",
    summary: "관절과 허리 통증 관련 운동 영상을 출처 중심으로 모아봅니다.",
    reliabilityLevel: "needs_verification",
    warningNote: "통증이 심해지면 즉시 중단하고 의료기관에 상담하세요.",
  },
];

export const medicalSpecialties: MedicalSpecialty[] = [
  { id: "specialty-dermatology", name: "피부과", description: "피부 상처, 발진, 가려움 등", relatedSymptoms: ["피부 상처", "발진", "가려움"] },
  { id: "specialty-internal", name: "내과/가정의학과", description: "혈당, 만성질환, 전신 증상 등", relatedSymptoms: ["당뇨", "혈당", "만성질환"] },
  { id: "specialty-orthopedics", name: "정형외과", description: "관절, 허리, 발목 통증 등", relatedSymptoms: ["관절", "허리", "발목 통증"] },
  { id: "specialty-urology", name: "비뇨의학과", description: "배뇨, 전립선, 혈뇨 등", relatedSymptoms: ["배뇨", "전립선", "혈뇨"] },
  { id: "specialty-obgyn", name: "산부인과", description: "여성질환, 생리, 임신 관련 증상 등", relatedSymptoms: ["여성질환", "생리", "임신"] },
];

export const specialtyMappings: SpecialtyMapping[] = [
  { id: "map-skin", symptomKeyword: "피부 상처, 발진, 가려움", bodyPart: "피부", specialtyId: "specialty-dermatology", cautionLevel: "normal", guideText: "피부과 상담을 참고할 수 있습니다." },
  { id: "map-diabetes", symptomKeyword: "당뇨, 혈당, 만성질환", bodyPart: "전신", specialtyId: "specialty-internal", cautionLevel: "caution", guideText: "내과 또는 가정의학과 상담을 참고할 수 있습니다." },
  { id: "map-joint", symptomKeyword: "관절, 허리, 발목 통증", bodyPart: "관절/허리", specialtyId: "specialty-orthopedics", cautionLevel: "normal", guideText: "정형외과 상담을 참고할 수 있습니다." },
  { id: "map-urology", symptomKeyword: "배뇨, 전립선, 혈뇨", bodyPart: "비뇨기", specialtyId: "specialty-urology", cautionLevel: "caution", guideText: "비뇨의학과 상담을 참고할 수 있습니다." },
  { id: "map-obgyn", symptomKeyword: "여성질환, 생리, 임신 관련 증상", bodyPart: "여성건강", specialtyId: "specialty-obgyn", cautionLevel: "caution", guideText: "산부인과 상담을 참고할 수 있습니다." },
];

export const sampleMonthlyReport: MonthlyReport = {
  id: "report-2026-06",
  userId: "mock-user",
  reportMonth: "2026-06",
  summary: "이번 달에는 피부 상처 경과, 외용제 사용, 병원 방문 기록이 있습니다.",
  symptomChanges: ["초기 붉은기 기록", "4일차 진물 감소 여부 확인", "7일차 병원 방문 메모 추가"],
  medicalVisitsSummary: "피부과 방문 1회, 처방 외용제 사용 기록 1건",
  medicineSummary: "연고 하루 2회 사용 기록",
  suggestedQuestions: ["상처 회복이 느린 이유가 있는지", "당뇨가 상처 회복에 영향을 줄 수 있는지", "다음 방문 시 확인할 신호는 무엇인지"],
  relatedArticles: ["article-diabetes-wound", "article-skin-rash"],
};

export const medicationMockItems = [
  "처방전 사진 업로드",
  "약 봉투 사진 업로드",
  "약 이름 직접 입력",
  "복용 횟수",
  "복용 시간",
  "복용 기간",
  "연고/외용제 기록",
  "OCR 추출 예정 안내",
];

export const experienceShareItems = ["치료 경험", "생활관리 노하우", "병원 방문 경험", "실패/성공 사례", "익명 공개 선택", "관리자 검토 후 공개"];

export const referenceFilters = ["공공기관 자료", "의료기관 자료", "한방 자료", "민간요법", "사용자 경험", "유튜브", "블로그/카페"];

export const monthlyReportPreviewItems = [
  "이번 달 기록 요약",
  "증상 변화 흐름",
  "병원 방문 및 처방 기록",
  "다음 진료 때 물어볼 질문",
  "관련 건강정보 추천",
];

export const pwaFeatureItems = ["증상 사진 촬영", "날짜별 경과 기록", "약 복용 기록", "병원 방문 기록", "경과 알림", "병원 찾기", "월간 리포트 확인"];
export type ExperienceCategory =
  | "당뇨"
  | "피부질환"
  | "상처/염증"
  | "식이요법"
  | "운동요법"
  | "한방"
  | "민간요법"
  | "병원 방문"
  | "복용약/연고";

export type ExperienceReference = {
  id: string;
  title: string;
  url: string;
  sourceType: "공공기관" | "의료기관" | "한방" | "민간요법" | "유튜브" | "블로그" | "사용자 경험";
  memo: string;
  reliabilityLevel: "공식자료" | "사용자 경험" | "검증 필요";
};

export type HealthExperience = {
  id: string;
  title: string;
  slug: string;
  category: ExperienceCategory;
  anonymousAuthor: string;
  summary: string;
  tags: string[];
  recordPeriod: string;
  visibility: "비공개" | "익명 공개" | "검토 대기";
  cautionNote: string;
  references: ExperienceReference[];
};

export const experienceCategories: ExperienceCategory[] = [
  "당뇨",
  "피부질환",
  "상처/염증",
  "식이요법",
  "운동요법",
  "한방",
  "민간요법",
  "병원 방문",
  "복용약/연고",
];

export const sampleExperiences: HealthExperience[] = [
  {
    id: "exp-mock-001",
    title: "당뇨 관리 중 발목 상처가 오래 지속되어 병원을 방문한 경험",
    slug: "diabetes-ankle-wound-visit",
    category: "당뇨",
    anonymousAuthor: "익명 사용자 A",
    summary: "발목 주변 상처가 오래 지속되어 사진을 남기고 피부과와 내과 상담을 준비했던 경험입니다.",
    tags: ["당뇨", "상처", "병원 방문", "사진 기록"],
    recordPeriod: "약 2주",
    visibility: "익명 공개",
    cautionNote: "개인 경험입니다",
    references: [],
  },
  {
    id: "exp-mock-002",
    title: "혈당스파이크를 줄이기 위해 식사 순서를 바꿔본 경험",
    slug: "blood-sugar-spike-meal-order",
    category: "식이요법",
    anonymousAuthor: "익명 사용자 B",
    summary: "식사 전후 컨디션과 혈당 변화를 기록하면서 식사 순서를 조정해본 개인 기록입니다.",
    tags: ["혈당관리", "식이요법", "생활관리"],
    recordPeriod: "약 1개월",
    visibility: "익명 공개",
    cautionNote: "개인 경험입니다",
    references: [],
  },
  {
    id: "exp-mock-003",
    title: "피부 트러블 때문에 연고와 먹는 약을 처방받은 경험",
    slug: "skin-trouble-ointment-medicine",
    category: "복용약/연고",
    anonymousAuthor: "익명 사용자 C",
    summary: "피부 트러블 경과를 사진과 메모로 남기고 처방받은 연고와 먹는 약을 함께 기록했습니다.",
    tags: ["피부질환", "연고", "복용약", "처방"],
    recordPeriod: "10일",
    visibility: "익명 공개",
    cautionNote: "개인 경험입니다",
    references: [],
  },
  {
    id: "exp-mock-004",
    title: "무릎 통증으로 정형외과를 방문한 경험",
    slug: "knee-pain-orthopedics-visit",
    category: "병원 방문",
    anonymousAuthor: "익명 사용자 D",
    summary: "무릎 통증이 반복되어 통증 정도와 활동량을 기록한 뒤 정형외과에 방문했던 경험입니다.",
    tags: ["무릎 통증", "정형외과", "운동요법"],
    recordPeriod: "약 3주",
    visibility: "익명 공개",
    cautionNote: "개인 경험입니다",
    references: [],
  },
  {
    id: "exp-mock-005",
    title: "민간요법을 참고했지만 병원 진료가 더 필요하다고 느낀 경험",
    slug: "home-remedy-needed-medical-visit",
    category: "민간요법",
    anonymousAuthor: "익명 사용자 E",
    summary: "온라인 민간요법을 참고했지만 증상이 오래 지속되어 의료기관 상담이 필요하다고 느낀 사례입니다.",
    tags: ["민간요법", "검증 필요", "병원 방문"],
    recordPeriod: "약 1주",
    visibility: "익명 공개",
    cautionNote: "개인 경험입니다",
    references: [
      {
        id: "exp-ref-001",
        title: "온라인 민간요법 참고 글",
        url: "/search?q=민간요법",
        sourceType: "민간요법",
        memo: "실제 적용 전 검증이 필요하다고 느낀 자료입니다.",
        reliabilityLevel: "검증 필요",
      },
    ],
  },
];
