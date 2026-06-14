import AdminShell from "../AdminShell";

const csvFiles = [
  {
    fileName: "public/data/diseases.csv",
    purpose: "질병명, 증상, 원인, 생활관리, 식이요법, 진료과, 병원 방문 전 질문 관리",
    columns: "id, slug, name, category, symptoms, causes, lifestyle, diet, recommendedFoods, avoidFoods, warningSigns",
  },
  {
    fileName: "public/data/symptoms.csv",
    purpose: "증상 검색 키워드, 관련 질병 연결, 응급 수준 안내 관리",
    columns: "id, name, relatedDiseaseIds, category, description, emergencyLevel, recommendedAction, searchAliases",
  },
  {
    fileName: "public/data/videos.csv",
    purpose: "질병별 영상자료와 식이/운동/의학정보 영상 링크 관리",
    columns: "id, diseaseId, title, channel, summary, url, category",
  },
  {
    fileName: "public/data/articles.csv",
    purpose: "외부 의학 참고자료 링크와 요약 정보 관리",
    columns: "id, diseaseId, title, source, type, summary, url, lastReviewed",
  },
  {
    fileName: "public/data/experiences.csv",
    purpose: "경험담 mock 데이터와 approved / pending / rejected 상태 관리",
    columns: "id, slug, diseaseId, category, nickname, title, summary, content, status, agreeToPublic",
  },
  {
    fileName: "public/data/exercises.csv",
    purpose: "질병/증상별 운동요법 참고자료 관리",
    columns: "id, diseaseId, symptomKeywords, title, recommendedExercises, cautionExercises, intensity, warning",
  },
  {
    fileName: "public/data/dietGuides.csv",
    purpose: "질병/증상별 식이요법 상세 가이드 관리",
    columns: "id, diseaseId, symptomKeywords, title, recommendedIngredients, cautionIngredients, mealTips, avoidPatterns",
  },
];

export default function AdminCsvPage() {
  return (
    <AdminShell>
      <div className="grid gap-6">
        <section className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
          <p className="text-sm font-extrabold text-[#2f6c48]">CSV 관리 안내</p>
          <h2 className="mt-2 text-3xl font-bold text-[#173d2d]">TypeScript 파일과 public/data CSV 관리 구조</h2>
          <p className="mt-3 text-base leading-7 text-[#526257]">
            현재 데이터는 TypeScript 파일과 public/data CSV 파일로 관리됩니다. 향후 관리자 페이지와 DB가 연결되면 웹 화면에서 직접 수정할 수 있습니다.
          </p>
          <p className="mt-4 rounded-lg border border-[#d9d1aa] bg-[#fffdf7] p-4 text-sm font-bold leading-6 text-[#7a6230]">
            CSV 수정 후에는 GitHub에 push하고 Vercel 배포가 완료되어야 실제 사이트에 반영됩니다.
          </p>
        </section>

        <section className="grid gap-5">
          {csvFiles.map((file) => (
            <article key={file.fileName} className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-extrabold text-[#2f6c48]">{file.fileName}</p>
                  <h3 className="mt-2 text-xl font-bold text-[#173d2d]">{file.purpose}</h3>
                </div>
                <span className="w-fit rounded-full bg-[#f5f0e4] px-3 py-1.5 text-xs font-bold text-[#7a6230]">
                  CSV mock
                </span>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <InfoBlock title="주요 컬럼" text={file.columns} />
                <InfoBlock
                  title="엑셀 수정 시 주의사항"
                  text="UTF-8 CSV 형식을 유지하고, 쉼표가 들어가는 문장은 따옴표로 감싸 주세요. 여러 항목은 세미콜론(;)으로 구분합니다."
                />
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-lg border border-[#c6d9bd] bg-white p-5 shadow-sm">
          <p className="text-sm font-extrabold text-[#2f6c48]">CSV에서 DB로 전환하는 순서</p>
          <h2 className="mt-2 text-2xl font-bold text-[#173d2d]">Supabase 전환 준비 절차</h2>
          <ol className="mt-5 grid gap-3 text-sm leading-6 text-[#526257]">
            {[
              "CSV 데이터 정리",
              "Supabase schema.sql 실행",
              "CSV 데이터를 Supabase 테이블로 import",
              "화면 데이터 소스를 Supabase로 전환",
              "관리자 페이지에서 직접 수정 기능 추가",
              "GitHub/Vercel 배포",
            ].map((item, index) => (
              <li key={item} className="flex gap-3 rounded-lg bg-[#fffdf7] p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#174330] text-xs font-bold text-white">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
          <p className="mt-5 rounded-lg border border-[#d9d1aa] bg-[#fffdf7] p-4 text-sm font-bold leading-6 text-[#7a6230]">
            현재는 CSV와 TypeScript data 파일이 기준이며, Supabase 연결 후에도 초기에는 데이터 검증이 필요합니다.
          </p>
        </section>
      </div>
    </AdminShell>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg bg-[#fffdf7] p-4">
      <p className="text-sm font-extrabold text-[#1b4631]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#526257]">{text}</p>
    </div>
  );
}
