import { readCsvRows, splitList } from "./csv";
import type { Disease, DiseaseCategory } from "./types";

const departmentByCategory: Record<string, string[]> = {
  "소화기 질환": ["소화기내과", "가정의학과"],
  "심혈관 질환": ["심장내과", "가정의학과"],
  "대사 질환": ["내분비내과", "가정의학과", "영양상담"],
  "근골격계 질환": ["정형외과", "류마티스내과", "재활의학과"],
  "호흡기 질환": ["호흡기내과", "알레르기내과"],
  "피부 질환": ["피부과", "알레르기내과"],
  "정신건강 / 수면": ["정신건강의학과", "수면클리닉", "가정의학과"],
};

const warningSignsBySlug: Record<string, string[]> = {
  diabetes: ["심한 갈증", "체중 감소", "시야 흐림", "상처 회복 지연"],
  hypertension: ["가슴통증", "호흡곤란", "심한 두통", "시야 이상"],
  gastritis: ["피를 토함", "검은 변", "체중 감소", "심한 복통"],
  arthritis: ["심한 붓기", "관절 열감", "움직임 제한 악화", "발열 동반 통증"],
  insomnia: ["일상생활이 어려운 피로", "우울감", "불안 악화", "자살 생각"],
  reflux: ["가슴통증", "삼킴 곤란", "체중 감소", "피 섞인 구토"],
};

const doctorQuestionsBySlug: Record<string, string[]> = {
  diabetes: [
    "공복혈당과 식후혈당을 어떻게 관리해야 하나요?",
    "당화혈색소 검사가 필요한가요?",
    "식단과 운동은 어떻게 조절해야 하나요?",
  ],
  hypertension: [
    "가정혈압은 언제, 얼마나 자주 측정해야 하나요?",
    "약 복용이 필요한 혈압 범위인가요?",
    "저염식과 운동은 어떻게 시작하면 좋을까요?",
  ],
  gastritis: [
    "위내시경 검사가 필요한가요?",
    "어떤 음식은 피해야 하나요?",
    "약은 얼마나 복용해야 하나요?",
  ],
  arthritis: [
    "퇴행성 관절염과 염증성 관절염 감별이 필요한가요?",
    "운동은 어느 정도까지 해도 되나요?",
    "통증이 심한 날에는 어떻게 관리해야 하나요?",
  ],
  insomnia: [
    "수면검사나 수면클리닉 상담이 필요한가요?",
    "수면제 없이 시도할 수 있는 방법은 무엇인가요?",
    "카페인과 생활 리듬은 어떻게 조절해야 하나요?",
  ],
  reflux: [
    "위내시경 검사가 필요한 증상인가요?",
    "식후 자세와 식사량은 어떻게 조절해야 하나요?",
    "약 복용 기간과 재발 관리는 어떻게 해야 하나요?",
  ],
};

export function getDiseases(): Disease[] {
  return readCsvRows("diseases.csv").map((row) => {
    const symptoms = splitList(row.symptoms);
    const relatedSymptoms = splitList(row.relatedSymptoms);
    const causes = splitList(row.causes);
    const lifestyle = splitList(row.lifestyle);
    const diet = splitList(row.diet);
    const recommendedFoods = splitList(row.recommendedFoods);
    const avoidFoods = splitList(row.avoidFoods);
    const category = row.category || "기타";
    const departments = splitList(row.department).length > 0 ? splitList(row.department) : departmentByCategory[category] ?? ["가정의학과"];

    return {
      id: row.id,
      slug: row.slug || row.id,
      name: row.name,
      category,
      summary: `${symptoms.slice(0, 2).join(", ")} 등을 중심으로 생활관리와 식이요법을 확인합니다.`,
      description:
        row.description ||
        `${row.name} 관련 주요 증상, 원인, 생활관리, 식이요법과 병원 방문 전 확인할 내용을 정리했습니다.`,
      relatedSymptoms: relatedSymptoms.length > 0 ? relatedSymptoms : symptoms,
      symptoms,
      causes,
      lifestyle,
      diet,
      recommendedFoods,
      avoidFoods,
      warning: row.warning,
      warningSigns: splitList(row.warningSigns).length > 0 ? splitList(row.warningSigns) : warningSignsBySlug[row.id] ?? [row.warning].filter(Boolean),
      department: departments,
      departments,
      doctorQuestions:
        splitList(row.doctorQuestions).length > 0
          ? splitList(row.doctorQuestions)
          : doctorQuestionsBySlug[row.id] ?? [
              "현재 증상에 어떤 검사가 필요한가요?",
              "생활관리에서 가장 먼저 조정할 부분은 무엇인가요?",
              "다시 진료를 받아야 하는 증상은 무엇인가요?",
            ],
      sourceRefs: splitList(row.sourceRefs).length > 0 ? splitList(row.sourceRefs) : ["MedlinePlus", "NHS", "CDC", "WHO ICD"],
      searchKeywords: splitList(row.searchKeywords),
      keywords: [
        row.name,
        row.slug,
        category,
        ...symptoms,
        ...relatedSymptoms,
        ...causes,
        ...recommendedFoods,
        ...avoidFoods,
        ...splitList(row.searchKeywords),
      ].filter(Boolean),
    };
  });
}

export function getDiseaseCategories(): DiseaseCategory[] {
  return Array.from(new Set(getDiseases().map((disease) => disease.category)));
}

export function getDiseaseBySlug(slug: string) {
  return getDiseases().find((disease) => disease.slug === slug);
}
