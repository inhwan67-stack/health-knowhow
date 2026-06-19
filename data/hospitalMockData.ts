export type MedicalSpecialty = {
  id: string;
  name: string;
  description: string;
  relatedSymptoms: string[];
};

export type SymptomSpecialtyMapping = {
  id: string;
  symptomKeyword: string;
  bodyPart: string;
  specialtyId: string;
  cautionLevel: "normal" | "caution" | "urgent";
  guideText: string;
  visitPreparation: string[];
  warningNote: string;
};

export type SampleHospital = {
  id: string;
  name: string;
  specialty: string;
  address: string;
  distance: string;
  phone: string;
  notice: string;
};

export type HospitalVisitChecklistItem = {
  id: string;
  label: string;
};

export type EmergencyWarningItem = {
  id: string;
  label: string;
};

export const medicalSpecialties: MedicalSpecialty[] = [
  {
    id: "specialty-dermatology",
    name: "피부과",
    description: "피부 상처, 발진, 가려움, 진물 등 피부 증상을 참고할 수 있습니다.",
    relatedSymptoms: ["피부 상처", "발진", "가려움", "진물"],
  },
  {
    id: "specialty-internal-family",
    name: "내과 / 가정의학과",
    description: "당뇨, 혈당 문제, 만성질환, 전신 증상을 참고할 수 있습니다.",
    relatedSymptoms: ["당뇨", "혈당", "만성 상처", "전신증상"],
  },
  {
    id: "specialty-orthopedics",
    name: "정형외과",
    description: "관절, 허리, 발목 통증과 움직임 제한을 참고할 수 있습니다.",
    relatedSymptoms: ["관절", "허리", "발목 통증", "움직임 제한"],
  },
  {
    id: "specialty-urology",
    name: "비뇨의학과",
    description: "배뇨통, 혈뇨, 전립선 관련 증상을 참고할 수 있습니다.",
    relatedSymptoms: ["배뇨통", "혈뇨", "전립선"],
  },
  {
    id: "specialty-obgyn",
    name: "산부인과",
    description: "생리, 임신, 여성 생식기 관련 증상을 참고할 수 있습니다.",
    relatedSymptoms: ["생리", "임신", "여성 생식기 증상"],
  },
  {
    id: "specialty-emergency",
    name: "응급실 / 119",
    description: "심한 출혈, 호흡곤란, 가슴통증, 의식저하 등 응급 증상은 즉시 대응이 필요할 수 있습니다.",
    relatedSymptoms: ["심한 출혈", "호흡곤란", "가슴통증", "의식저하"],
  },
];

export const symptomSpecialtyMappings: SymptomSpecialtyMapping[] = [
  {
    id: "map-skin",
    symptomKeyword: "피부 상처, 발진, 가려움",
    bodyPart: "피부",
    specialtyId: "specialty-dermatology",
    cautionLevel: "normal",
    guideText: "피부과 상담을 참고할 수 있습니다.",
    visitPreparation: ["증상 시작일", "날짜별 사진", "사용한 연고/소독약", "진물 또는 열감 여부"],
    warningNote: "상처가 커지거나 진물이 지속되면 의료진 상담이 필요할 수 있습니다.",
  },
  {
    id: "map-diabetes",
    symptomKeyword: "당뇨, 혈당, 만성 상처",
    bodyPart: "전신증상",
    specialtyId: "specialty-internal-family",
    cautionLevel: "caution",
    guideText: "내과 또는 가정의학과 상담을 참고할 수 있습니다.",
    visitPreparation: ["최근 혈당 기록", "복용 중인 약", "상처 사진", "기저질환 기록"],
    warningNote: "당뇨가 있고 상처가 빠르게 악화되면 지체하지 말고 의료기관에 문의하세요.",
  },
  {
    id: "map-joint",
    symptomKeyword: "관절, 허리, 발목 통증",
    bodyPart: "관절/허리",
    specialtyId: "specialty-orthopedics",
    cautionLevel: "normal",
    guideText: "정형외과 상담을 참고할 수 있습니다.",
    visitPreparation: ["통증 시작일", "움직임 제한 여부", "부기 또는 멍 사진", "최근 운동/사고 기록"],
    warningNote: "갑작스러운 마비나 감각 저하가 있으면 응급 진료가 필요할 수 있습니다.",
  },
  {
    id: "map-urology",
    symptomKeyword: "배뇨통, 혈뇨, 전립선",
    bodyPart: "비뇨기",
    specialtyId: "specialty-urology",
    cautionLevel: "caution",
    guideText: "비뇨의학과 상담을 참고할 수 있습니다.",
    visitPreparation: ["증상 시작일", "소변 색 변화", "통증 위치", "복용약 기록"],
    warningNote: "혈뇨가 반복되거나 통증이 심하면 의료진과 상담하세요.",
  },
  {
    id: "map-obgyn",
    symptomKeyword: "생리, 임신, 여성 생식기 증상",
    bodyPart: "여성질환",
    specialtyId: "specialty-obgyn",
    cautionLevel: "caution",
    guideText: "산부인과 상담을 참고할 수 있습니다.",
    visitPreparation: ["마지막 생리일", "통증 또는 출혈 기록", "임신 가능성", "최근 복용약"],
    warningNote: "심한 통증이나 출혈이 있으면 빠른 진료가 필요할 수 있습니다.",
  },
  {
    id: "map-emergency",
    symptomKeyword: "심한 출혈, 호흡곤란, 가슴통증, 의식저하",
    bodyPart: "전신증상",
    specialtyId: "specialty-emergency",
    cautionLevel: "urgent",
    guideText: "병원 검색보다 119 또는 응급실 이용을 우선 고려하세요.",
    visitPreparation: ["발생 시각", "동반 증상", "기저질환", "복용 중인 약"],
    warningNote: "응급 증상은 즉시 119 또는 응급실을 이용하세요.",
  },
];

export const sampleHospitals: SampleHospital[] = [
  {
    id: "hospital-dermatology-mock",
    name: "가까운 피부과 mock",
    specialty: "피부과",
    address: "서울 은평구 mock로 12",
    distance: "1.2km",
    phone: "02-0000-0000",
    notice: "진료 시간, 예약 가능 여부, 실제 위치는 방문 전 직접 확인이 필요합니다.",
  },
  {
    id: "hospital-internal-mock",
    name: "가까운 내과 mock",
    specialty: "내과 / 가정의학과",
    address: "서울 은평구 mock길 34",
    distance: "2.4km",
    phone: "02-1111-1111",
    notice: "혈당, 만성질환 상담 가능 여부는 병원에 직접 문의하세요.",
  },
  {
    id: "hospital-orthopedics-mock",
    name: "가까운 정형외과 mock",
    specialty: "정형외과",
    address: "서울 은평구 mock대로 56",
    distance: "3.1km",
    phone: "02-2222-2222",
    notice: "검사 장비와 야간 진료 여부는 방문 전 확인이 필요합니다.",
  },
];

export const hospitalVisitChecklist: HospitalVisitChecklistItem[] = [
  { id: "check-start-date", label: "증상 시작일" },
  { id: "check-photos", label: "날짜별 증상 사진" },
  { id: "check-medicines", label: "복용 중인 약" },
  { id: "check-ointments", label: "사용한 연고/소독약" },
  { id: "check-conditions", label: "기존 질환" },
  { id: "check-previous-visits", label: "최근 병원 방문 기록" },
  { id: "check-prescriptions", label: "처방전/약 봉투 사진" },
  { id: "check-questions", label: "궁금한 질문 목록" },
];

export const emergencyWarningItems: EmergencyWarningItem[] = [
  { id: "emergency-breath", label: "호흡곤란" },
  { id: "emergency-chest", label: "가슴 통증" },
  { id: "emergency-consciousness", label: "의식 저하" },
  { id: "emergency-bleeding", label: "심한 출혈" },
  { id: "emergency-paralysis", label: "급격한 마비 증상" },
  { id: "emergency-fever-pain", label: "고열과 심한 통증" },
  { id: "emergency-diabetes-wound", label: "당뇨 환자의 상처가 빠르게 악화되는 경우" },
];
