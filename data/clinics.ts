export type ClinicGuide = {
  id: string;
  department: string;
  region: string;
  clinicName: string;
  description: string;
  homepageUrl: string | null;
  isAd: boolean;
  relatedDiseaseIds: string[];
};

export const clinics: ClinicGuide[] = [
  {
    id: "gastroenterology-sample",
    department: "소화기내과",
    region: "전국",
    clinicName: "소화기내과 진료과 안내 샘플",
    description: "속쓰림, 복통, 소화불량 등이 지속될 때 상담할 수 있는 진료과입니다.",
    homepageUrl: null,
    isAd: false,
    relatedDiseaseIds: ["gastritis", "reflux"],
  },
  {
    id: "endocrinology-sample",
    department: "내분비내과",
    region: "전국",
    clinicName: "내분비내과 진료과 안내 샘플",
    description: "혈당, 당뇨, 대사질환 관련 상담을 받을 수 있는 진료과입니다.",
    homepageUrl: null,
    isAd: false,
    relatedDiseaseIds: ["diabetes"],
  },
  {
    id: "cardiology-sample",
    department: "심장내과 / 순환기내과",
    region: "전국",
    clinicName: "순환기 진료과 안내 샘플",
    description: "혈압, 심혈관 질환 관련 상담을 받을 수 있는 진료과입니다.",
    homepageUrl: null,
    isAd: false,
    relatedDiseaseIds: ["hypertension"],
  },
  {
    id: "orthopedics-rheumatology-sample",
    department: "정형외과 / 류마티스내과",
    region: "전국",
    clinicName: "관절 진료과 안내 샘플",
    description: "관절 통증, 염증, 움직임 제한 등을 상담할 수 있는 진료과입니다.",
    homepageUrl: null,
    isAd: false,
    relatedDiseaseIds: ["arthritis"],
  },
  {
    id: "sleep-mental-health-sample",
    department: "정신건강의학과 / 수면클리닉",
    region: "전국",
    clinicName: "수면 상담 진료과 안내 샘플",
    description: "수면장애, 스트레스, 불안 등을 상담할 수 있는 진료과입니다.",
    homepageUrl: null,
    isAd: false,
    relatedDiseaseIds: ["insomnia"],
  },
];

export function getClinicsByDisease(diseaseId: string) {
  return clinics.filter((clinic) => clinic.relatedDiseaseIds.includes(diseaseId));
}
