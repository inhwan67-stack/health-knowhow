export type AffiliateProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  recommendedFor: string;
  caution: string;
  url: string | null;
  isAffiliate: boolean;
  relatedDiseaseIds: string[];
  searchKeywords: string[];
};

export const affiliateProducts: AffiliateProduct[] = [
  {
    id: "blood-pressure-monitor",
    name: "가정용 혈압계 안내",
    category: "혈압계",
    description: "가정에서 혈압 변화를 기록할 때 참고할 수 있는 건강관리 도구입니다.",
    recommendedFor: "혈압 수치를 정기적으로 기록해 진료 상담 전 자료로 정리하고 싶은 경우",
    caution: "측정값만으로 질환 여부를 판단하지 말고 반복적으로 이상 수치가 나오면 의료기관과 상담하세요.",
    url: null,
    isAffiliate: true,
    relatedDiseaseIds: ["hypertension"],
    searchKeywords: ["혈압", "고혈압", "심혈관", "순환기"],
  },
  {
    id: "blood-glucose-meter",
    name: "혈당측정기 선택 가이드",
    category: "혈당측정기",
    description: "혈당 기록 습관을 만들 때 확인할 수 있는 측정 도구 안내입니다.",
    recommendedFor: "혈당 변화를 기록하고 의료진 상담 시 참고자료로 정리하고 싶은 경우",
    caution: "측정 방식과 소모품 사용법을 확인하고, 수치 해석은 의료진과 상의하세요.",
    url: null,
    isAffiliate: true,
    relatedDiseaseIds: ["diabetes"],
    searchKeywords: ["혈당", "당뇨", "대사", "내분비"],
  },
  {
    id: "health-book",
    name: "건강 기록 입문 도서",
    category: "건강도서",
    description: "증상, 식습관, 생활습관을 체계적으로 기록하는 방법을 익히는 데 참고할 수 있습니다.",
    recommendedFor: "건강정보를 스스로 정리하는 습관을 만들고 싶은 경우",
    caution: "도서 내용은 일반 정보이며 개인의 증상 판단이나 치료 결정을 대신하지 않습니다.",
    url: null,
    isAffiliate: true,
    relatedDiseaseIds: ["gastritis", "reflux", "diabetes", "hypertension", "arthritis", "insomnia"],
    searchKeywords: ["기록", "건강정보", "생활습관", "증상"],
  },
  {
    id: "sleep-care-tool",
    name: "수면 환경 관리 도구",
    category: "수면용품",
    description: "수면 시간, 빛, 소음 등 생활환경을 점검할 때 참고할 수 있는 도구입니다.",
    recommendedFor: "수면 습관과 환경 변화를 기록하며 상담 전 자료를 준비하고 싶은 경우",
    caution: "수면장애가 지속되거나 일상생활에 영향을 주면 전문 의료기관과 상담하세요.",
    url: null,
    isAffiliate: true,
    relatedDiseaseIds: ["insomnia"],
    searchKeywords: ["수면", "불면", "스트레스", "환경"],
  },
  {
    id: "exercise-band",
    name: "가벼운 운동 기록 도구",
    category: "운동용품",
    description: "운동량과 활동 변화를 기록할 때 함께 참고할 수 있는 관리 도구입니다.",
    recommendedFor: "걷기, 스트레칭 등 생활 활동량을 기록하고 싶은 경우",
    caution: "통증이 있거나 기저질환이 있는 경우 운동 전 의료진과 상담하세요.",
    url: null,
    isAffiliate: true,
    relatedDiseaseIds: ["arthritis", "hypertension", "diabetes"],
    searchKeywords: ["운동", "활동량", "스트레칭", "관절", "걷기"],
  },
  {
    id: "meal-planner",
    name: "식단관리 기록 도구",
    category: "식단관리 도구",
    description: "식사 시간, 음식 종류, 증상 변화를 함께 기록하는 데 참고할 수 있습니다.",
    recommendedFor: "특정 음식과 불편감의 관련성을 진료 상담 전 정리하고 싶은 경우",
    caution: "특정 식단이 질환 개선을 보장하지 않으며, 식이 제한은 개인 상태에 맞게 판단해야 합니다.",
    url: null,
    isAffiliate: true,
    relatedDiseaseIds: ["gastritis", "reflux", "diabetes", "hypertension"],
    searchKeywords: ["식단", "음식", "식습관", "영양", "혈당"],
  },
];

export function getAffiliateProductsByDisease(diseaseId: string) {
  return affiliateProducts.filter((product) => product.relatedDiseaseIds.includes(diseaseId));
}

export function searchAffiliateProducts(query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  return affiliateProducts.filter((product) =>
    [
      product.name,
      product.category,
      product.description,
      product.recommendedFor,
      product.caution,
      ...product.relatedDiseaseIds,
      ...product.searchKeywords,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}
