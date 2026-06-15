import Link from "next/link";
import { getDiseaseCategories, getDiseases } from "@/data/diseases";

export default function DiseaseCategoryExplorer() {
  const diseases = getDiseases();
  const diseaseCategories = getDiseaseCategories();

  return (
    <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
      <div className="mb-8">
        <p className="text-sm font-bold text-[#2f6c48]">질병 카테고리 요약</p>
        <h2 className="mt-2 text-3xl font-bold text-[#173d2d] sm:text-4xl">
          분야별로 어떤 질병 정보가 있는지 확인하세요
        </h2>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[#526257]">
          카드 반복 대신 카테고리별 등록 질병 수와 대표 질병을 요약했습니다.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {diseaseCategories.map((category) => {
          const categoryDiseases = diseases.filter((disease) => disease.category === category);
          const representativeDiseases = categoryDiseases.slice(0, 3);

          return (
            <article key={category} className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-[#2f6c48]">{category}</p>
              <h3 className="mt-3 text-3xl font-bold text-[#174330]">{categoryDiseases.length}개</h3>
              <div className="mt-5 flex flex-wrap gap-2">
                {representativeDiseases.length > 0 ? (
                  representativeDiseases.map((disease) => (
                    <Link
                      key={disease.slug}
                      href={`/diseases/${disease.slug}`}
                      className="rounded-full bg-[#eef6e9] px-3 py-1.5 text-sm font-bold text-[#2f6c48]"
                    >
                      {disease.name}
                    </Link>
                  ))
                ) : (
                  <span className="rounded-full bg-[#f5f0e4] px-3 py-1.5 text-sm font-bold text-[#596344]">
                    콘텐츠 보강 중
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
