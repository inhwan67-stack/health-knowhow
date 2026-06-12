export type TrustedMedicalSource = "MedlinePlus" | "NHS" | "CDC" | "WHO";

export type ExternalMedicalResource = {
  id: string;
  title: string;
  source: TrustedMedicalSource;
  type: "의학 백과" | "공공보건 자료" | "질병 정보" | "분류/표준 자료";
  summary: string;
  url: string;
  updatedAt: string;
  keywords: string[];
};

const trustedSources = new Set<TrustedMedicalSource>(["MedlinePlus", "NHS", "CDC", "WHO"]);

const medlinePlusMock: ExternalMedicalResource[] = [
  {
    id: "medline-diabetes",
    title: "Diabetes",
    source: "MedlinePlus",
    type: "의학 백과",
    summary: "당뇨와 혈당 관리의 기본 개념을 확인할 수 있는 관련 참고자료입니다.",
    url: "https://medlineplus.gov/diabetes.html",
    updatedAt: "2026-01-15",
    keywords: ["당뇨", "혈당", "갈증", "소변", "diabetes"],
  },
  {
    id: "medline-gastritis",
    title: "Gastritis",
    source: "MedlinePlus",
    type: "의학 백과",
    summary: "위염, 속쓰림, 위 자극 요인에 대해 참고할 수 있는 의학 자료입니다.",
    url: "https://medlineplus.gov/ency/article/001150.htm",
    updatedAt: "2026-01-15",
    keywords: ["위염", "속쓰림", "복통", "gastritis"],
  },
  {
    id: "medline-insomnia",
    title: "Insomnia",
    source: "MedlinePlus",
    type: "의학 백과",
    summary: "불면과 수면 습관에 대한 기본 정보를 확인할 수 있는 관련 참고자료입니다.",
    url: "https://medlineplus.gov/insomnia.html",
    updatedAt: "2026-01-15",
    keywords: ["불면", "불면증", "수면", "insomnia"],
  },
];

const nhsMock: ExternalMedicalResource[] = [
  {
    id: "nhs-hypertension",
    title: "High blood pressure",
    source: "NHS",
    type: "질병 정보",
    summary: "고혈압의 의미, 생활관리, 진료가 필요한 상황을 참고할 수 있는 자료입니다.",
    url: "https://www.nhs.uk/conditions/high-blood-pressure-hypertension/",
    updatedAt: "2026-01-15",
    keywords: ["고혈압", "혈압", "두통", "hypertension"],
  },
  {
    id: "nhs-reflux",
    title: "Heartburn and acid reflux",
    source: "NHS",
    type: "질병 정보",
    summary: "역류성 식도염, 신물 역류, 식후 속쓰림에 대한 관련 참고자료입니다.",
    url: "https://www.nhs.uk/conditions/heartburn-and-acid-reflux/",
    updatedAt: "2026-01-15",
    keywords: ["역류", "역류성 식도염", "속쓰림", "신물", "reflux"],
  },
];

const cdcMock: ExternalMedicalResource[] = [
  {
    id: "cdc-arthritis",
    title: "Arthritis",
    source: "CDC",
    type: "공공보건 자료",
    summary: "관절염과 관절 통증 관리에 대한 공중보건 관점의 관련 참고자료입니다.",
    url: "https://www.cdc.gov/arthritis/",
    updatedAt: "2026-01-15",
    keywords: ["관절", "관절염", "통증", "arthritis"],
  },
  {
    id: "cdc-breathing",
    title: "Emergency warning signs",
    source: "CDC",
    type: "공공보건 자료",
    summary: "호흡곤란 등 응급 신호를 확인할 때 참고할 수 있는 공공보건 자료입니다.",
    url: "https://www.cdc.gov/",
    updatedAt: "2026-01-15",
    keywords: ["호흡곤란", "응급", "숨참"],
  },
];

const whoMock: ExternalMedicalResource[] = [
  {
    id: "who-icd",
    title: "ICD classification reference",
    source: "WHO",
    type: "분류/표준 자료",
    summary: "질병명 표준화와 분류 체계를 확인할 수 있는 WHO 참고자료입니다.",
    url: "https://icd.who.int/",
    updatedAt: "2026-01-15",
    keywords: ["질병", "분류", "표준", "icd", "who"],
  },
];

export async function searchMedlinePlus(query: string): Promise<ExternalMedicalResource[]> {
  // TODO: Connect MedlinePlus keyword-based Web Service here.
  return filterMockResults(medlinePlusMock, query);
}

export async function searchNhsContent(query: string): Promise<ExternalMedicalResource[]> {
  // TODO: Connect NHS Content API JSON endpoint here.
  return filterMockResults(nhsMock, query);
}

export async function searchCdcContent(query: string): Promise<ExternalMedicalResource[]> {
  // TODO: Connect CDC Content Services API for infectious disease and public health content here.
  return filterMockResults(cdcMock, query);
}

export async function searchWhoIcd(query: string): Promise<ExternalMedicalResource[]> {
  // TODO: Use WHO ICD API for disease name standardization and classification support here.
  return filterMockResults(whoMock, query);
}

export async function searchExternalMedicalSources(query: string): Promise<ExternalMedicalResource[]> {
  if (!query.trim()) return [];

  const results = await Promise.all([
    searchMedlinePlus(query),
    searchNhsContent(query),
    searchCdcContent(query),
    searchWhoIcd(query),
  ]);

  const deduped = new Map<string, ExternalMedicalResource>();
  results
    .flat()
    .filter((resource) => trustedSources.has(resource.source))
    .forEach((resource) => deduped.set(resource.id, resource));

  return Array.from(deduped.values());
}

function filterMockResults(resources: ExternalMedicalResource[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  return resources.filter((resource) =>
    [resource.title, resource.summary, resource.source, resource.type, ...resource.keywords]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}
