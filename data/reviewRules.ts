export const riskyMedicalPhrases = [
  "완치",
  "치료됐다",
  "무조건 낫는다",
  "병원 안 가도 된다",
  "약 없이 해결",
  "효과 보장",
  "100% 효과",
  "이 음식만 먹으면",
  "이 운동만 하면",
  "의사 필요 없음",
  "처방 대신",
  "암이 낫는다",
  "당뇨가 사라진다",
  "고혈압이 완전히 해결",
];

export const cautionMedicalPhrases = [
  "도움이 된 것 같았다",
  "개인적인 경험",
  "사람마다 다를 수 있다",
  "참고자료",
  "의료기관 상담 권장",
  "진단이나 치료를 대신하지 않음",
];

export type ReviewPhraseCheck = {
  riskyMatches: string[];
  cautionMatches: string[];
  recommendation: string;
};

export function checkMedicalReviewPhrases(text: string): ReviewPhraseCheck {
  const normalizedText = text.toLowerCase();
  const riskyMatches = riskyMedicalPhrases.filter((phrase) => normalizedText.includes(phrase.toLowerCase()));
  const cautionMatches = cautionMedicalPhrases.filter((phrase) => normalizedText.includes(phrase.toLowerCase()));

  return {
    riskyMatches,
    cautionMatches,
    recommendation:
      riskyMatches.length > 0
        ? "불편감 관리에 도움이 된 것 같았습니다. 개인에 따라 다를 수 있으며, 증상이 있으면 의료기관 상담을 권장합니다."
        : "의료 효과를 단정하지 않고 개인 경험과 참고자료임을 함께 표시하면 더 안전합니다.",
  };
}

export function buildExperienceReviewText(fields: string[]) {
  return fields.filter(Boolean).join("\n");
}
