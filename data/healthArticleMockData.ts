import type { ArticleSource, HealthArticle, HealthCategory, RelatedCase, RelatedSpecialty } from "./healthMockData";

export const healthArticleCategories: HealthCategory[] = [
  { id: "blog-cat-diabetes", name: "당뇨", slug: "diabetes", description: "혈당, 식사, 상처 관리 참고 콘텐츠", topics: ["당뇨 초기증상", "혈당스파이크", "당뇨 식이요법", "당뇨와 상처 관리"] },
  { id: "blog-cat-hypertension", name: "고혈압", slug: "hypertension", description: "혈압 관리와 생활습관 참고 콘텐츠", topics: ["고혈압 생활습관", "저염 식단", "혈압 기록", "두통과 혈압"] },
  { id: "blog-cat-skin", name: "피부질환", slug: "skin", description: "상처, 발진, 가려움 참고 콘텐츠", topics: ["피부 상처", "발진", "가려움", "연고 기록"] },
  { id: "blog-cat-joint-back", name: "관절/허리", slug: "joint-back", description: "관절, 허리, 무릎 통증 참고 콘텐츠", topics: ["무릎 통증", "허리 통증", "발목 통증", "진료과 선택"] },
  { id: "blog-cat-digestive", name: "위장질환", slug: "digestive", description: "속쓰림, 소화불량, 복통 참고 콘텐츠", topics: ["속쓰림", "소화불량", "식사 기록", "반복 증상"] },
  { id: "blog-cat-women", name: "여성질환", slug: "women", description: "여성 건강과 산부인과 상담 참고 콘텐츠", topics: ["생리", "질염", "임신", "산부인과"] },
  { id: "blog-cat-men", name: "남성질환", slug: "men", description: "남성 건강과 비뇨의학과 상담 참고 콘텐츠", topics: ["전립선", "배뇨", "혈뇨", "비뇨의학과"] },
  { id: "blog-cat-diet", name: "식이요법", slug: "diet", description: "식단과 식습관 참고 콘텐츠", topics: ["혈당 식단", "저염 식단", "위장 식단", "회복기 식사"] },
  { id: "blog-cat-exercise", name: "운동요법", slug: "exercise", description: "운동과 생활관리 참고 콘텐츠", topics: ["걷기", "스트레칭", "통증 주의", "운동 기록"] },
  { id: "blog-cat-specialty", name: "병원 진료과", slug: "medical-specialty", description: "증상별 진료과 참고 콘텐츠", topics: ["피부과", "내과", "정형외과", "가정의학과"] },
];

type ArticleSection = NonNullable<HealthArticle["sections"]>[number];

const diabetesWoundSections: ArticleSection[] = [
  {
    heading: "당뇨와 상처 관리가 중요한 이유",
    body: [
      "당뇨가 있는 경우 혈당 상태, 혈액순환, 감각 변화 등 여러 요인이 상처 관찰에 영향을 줄 수 있습니다.",
      "작은 상처라도 오래 지속되거나 붉은기, 진물, 통증 변화가 있으면 경과를 기록하고 의료진과 상담하는 것이 도움이 될 수 있습니다.",
    ],
  },
  {
    heading: "상처가 오래 지속될 때 주의할 점",
    body: [
      "상처가 며칠 이상 계속되거나 크기, 색, 분비물, 통증이 변한다면 단순히 기다리기보다 전문가 상담을 고려해야 합니다.",
      "자가 판단으로 약을 바꾸거나 민간요법만 시도하는 것은 적절하지 않을 수 있습니다.",
    ],
  },
  {
    heading: "발과 다리 상처를 관찰하는 방법",
    body: [
      "발등, 발가락 사이, 발바닥, 발목 주변은 매일 같은 조명에서 확인하면 변화 비교에 도움이 됩니다.",
      "사진을 남길 때는 날짜, 통증 정도, 붓기나 진물 여부, 사용한 연고나 약을 함께 기록하는 것이 좋습니다.",
    ],
  },
  {
    heading: "병원 진료가 필요한 경우",
    body: [
      "붓기, 열감, 심한 통증, 고름처럼 보이는 분비물, 상처 확대, 발열이 있거나 당뇨 등 기저질환이 있다면 의료기관 상담이 필요할 수 있습니다.",
      "응급으로 보이는 증상은 119 또는 응급실 이용을 우선해야 합니다.",
    ],
  },
  {
    heading: "내 증상 기록을 남기는 이유",
    body: [
      "진료실에서는 언제부터 증상이 시작됐는지, 어떤 변화가 있었는지 정확히 설명하기 어려울 수 있습니다.",
      "사진, 발생일, 복용약, 병원 방문 기록을 날짜별로 남겨두면 다음 진료 때 상황을 더 구체적으로 전달할 수 있습니다.",
    ],
  },
];

const diabetesWoundSources: ArticleSource[] = [
  {
    id: "src-diabetes-wound-001",
    articleId: "blog-003",
    sourceTitle: "공공 건강정보 자료",
    sourceUrl: "/search?q=당뇨 상처 관리",
    sourceType: "public",
    summary: "당뇨와 발 관리, 상처 관찰에 관한 공공기관 자료 연결을 위한 mock 출처입니다.",
  },
  {
    id: "src-diabetes-wound-002",
    articleId: "blog-003",
    sourceTitle: "의료기관 안내 자료",
    sourceUrl: "/search?q=피부 상처 진료",
    sourceType: "medical",
    summary: "피부 상처와 병원 상담이 필요한 경우를 안내하는 mock 출처입니다.",
  },
];

const relatedDiabetesWoundCases: RelatedCase[] = [
  { id: "rel-case-001", title: "발목 주변 상처 경과 기록", summary: "날짜별 사진과 진물 여부를 함께 남긴 mock 사례입니다.", privacyNote: "개인 경험이며 의료 조언이 아닙니다." },
  { id: "rel-case-002", title: "혈당 관리 중 피부 트러블 경험", summary: "혈당 관리 중 피부 변화를 기록한 mock 사례입니다.", privacyNote: "개인 경험이며 의료 조언이 아닙니다." },
  { id: "rel-case-003", title: "연고 사용 후 병원 방문 기록", summary: "연고 사용 후 변화와 병원 방문 메모를 남긴 mock 사례입니다.", privacyNote: "개인 경험이며 의료 조언이 아닙니다." },
];

const relatedDiabetesWoundSpecialties: RelatedSpecialty[] = [
  { id: "rel-sp-derm", name: "피부과", description: "상처, 발진, 가려움 등 피부 증상 상담" },
  { id: "rel-sp-internal", name: "내과/가정의학과", description: "당뇨, 혈당, 만성질환 관련 상담" },
  { id: "rel-sp-ortho", name: "정형외과", description: "발, 다리, 관절 주변 통증이나 손상 상담" },
];

export const healthBlogArticles: HealthArticle[] = [
  {
    id: "blog-001",
    title: "당뇨 초기증상은 어떻게 나타날까?",
    slug: "diabetes-early-symptoms",
    categoryId: "blog-cat-diabetes",
    summary: "갈증, 잦은 소변, 피로감처럼 당뇨와 관련해 자주 언급되는 신호를 참고용으로 정리합니다.",
    status: "published",
    adEnabled: true,
    seoTitle: "당뇨 초기증상 참고 정보",
    seoDescription: "당뇨 초기증상으로 자주 언급되는 변화와 의료기관 상담이 필요한 경우를 정리합니다.",
    tags: ["당뇨", "초기증상", "혈당"],
    readTime: "4분",
    publishedAt: "2026-06-01",
  },
  {
    id: "blog-002",
    title: "혈당스파이크를 줄이는 생활습관",
    slug: "blood-sugar-spike-habits",
    categoryId: "blog-cat-diabetes",
    summary: "식사 순서, 기록 습관, 운동 등 혈당 변화와 관련해 참고할 수 있는 생활습관을 정리합니다.",
    status: "published",
    adEnabled: true,
    seoTitle: "혈당스파이크 생활습관 참고",
    seoDescription: "혈당스파이크를 줄이는 데 참고할 수 있는 식사와 생활습관 정보를 안내합니다.",
    tags: ["혈당스파이크", "식습관", "운동"],
    readTime: "5분",
    publishedAt: "2026-06-02",
  },
  {
    id: "blog-003",
    title: "당뇨 환자가 상처를 주의해야 하는 이유",
    slug: "why-diabetes-wounds-need-care",
    categoryId: "blog-cat-diabetes",
    summary: "당뇨가 있는 경우 상처 경과를 관찰하고 기록하는 것이 왜 중요한지 일반 건강정보로 정리합니다.",
    content: "당뇨와 상처 관리는 의료진 상담과 함께 확인해야 하는 주제입니다.",
    status: "published",
    adEnabled: true,
    seoTitle: "당뇨 환자 상처 관리 참고 정보",
    seoDescription: "당뇨 환자가 상처를 주의해야 하는 이유와 병원 상담이 필요한 경우를 정리합니다.",
    tags: ["당뇨", "상처", "피부", "발 관리"],
    readTime: "6분",
    publishedAt: "2026-06-03",
    tableOfContents: diabetesWoundSections.map((section) => section.heading),
    sections: diabetesWoundSections,
    sources: diabetesWoundSources,
    relatedCases: relatedDiabetesWoundCases,
    relatedSpecialties: relatedDiabetesWoundSpecialties,
  },
  {
    id: "blog-004",
    title: "당뇨 식이요법에서 자주 실수하는 것들",
    slug: "diabetes-diet-common-mistakes",
    categoryId: "blog-cat-diet",
    summary: "식단 조절에서 자주 놓치는 부분을 진단이 아닌 생활관리 참고정보로 정리합니다.",
    status: "published",
    adEnabled: true,
    seoTitle: "당뇨 식이요법 자주 하는 실수",
    seoDescription: "당뇨 식이요법에서 참고할 수 있는 생활관리 정보를 정리합니다.",
    tags: ["당뇨", "식이요법", "식단"],
    readTime: "5분",
    publishedAt: "2026-06-04",
  },
  {
    id: "blog-005",
    title: "피부 상처가 오래 낫지 않을 때 확인할 점",
    slug: "skin-wound-long-lasting-checklist",
    categoryId: "blog-cat-skin",
    summary: "상처가 오래 지속될 때 사진, 진물, 붓기, 통증을 기록하는 방법을 안내합니다.",
    status: "published",
    adEnabled: true,
    seoTitle: "피부 상처 오래 지속될 때 확인할 점",
    seoDescription: "피부 상처 경과 기록과 의료기관 상담이 필요한 경우를 정리합니다.",
    tags: ["피부질환", "상처", "경과기록"],
    readTime: "4분",
    publishedAt: "2026-06-05",
  },
  {
    id: "blog-006",
    title: "고혈압 관리에 도움이 되는 생활습관",
    slug: "hypertension-lifestyle-habits",
    categoryId: "blog-cat-hypertension",
    summary: "혈압 기록, 식사, 수면, 운동처럼 고혈압 관리에 참고할 수 있는 생활습관을 정리합니다.",
    status: "published",
    adEnabled: true,
    seoTitle: "고혈압 생활습관 참고 정보",
    seoDescription: "고혈압 관리에 도움이 될 수 있는 일반 생활습관 정보를 안내합니다.",
    tags: ["고혈압", "생활습관", "혈압기록"],
    readTime: "5분",
    publishedAt: "2026-06-06",
  },
  {
    id: "blog-007",
    title: "무릎 통증은 어느 진료과를 가야 할까?",
    slug: "knee-pain-medical-specialty",
    categoryId: "blog-cat-specialty",
    summary: "무릎 통증이 있을 때 참고할 수 있는 진료과와 기록 항목을 정리합니다.",
    status: "published",
    adEnabled: true,
    seoTitle: "무릎 통증 진료과 참고",
    seoDescription: "무릎 통증과 관련해 참고할 수 있는 진료과 정보를 정리합니다.",
    tags: ["무릎통증", "정형외과", "진료과"],
    readTime: "3분",
    publishedAt: "2026-06-07",
  },
  {
    id: "blog-008",
    title: "속쓰림과 소화불량이 반복될 때 참고할 점",
    slug: "heartburn-indigestion-checkpoints",
    categoryId: "blog-cat-digestive",
    summary: "반복되는 속쓰림과 소화불량을 기록할 때 확인하면 좋은 항목을 정리합니다.",
    status: "published",
    adEnabled: true,
    seoTitle: "속쓰림 소화불량 반복 시 참고 정보",
    seoDescription: "속쓰림과 소화불량이 반복될 때 참고할 수 있는 기록 항목을 안내합니다.",
    tags: ["위장질환", "속쓰림", "소화불량"],
    readTime: "4분",
    publishedAt: "2026-06-08",
  },
];

export function getHealthArticleCategory(categoryId: string) {
  return healthArticleCategories.find((category) => category.id === categoryId);
}

export function getHealthArticleBySlug(slug: string) {
  return healthBlogArticles.find((article) => article.slug === slug);
}
