"use client";

import type { AffiliateProduct } from "@/data/affiliateProducts";

export default function AffiliateProductCards({ products }: { products: AffiliateProduct[] }) {
  const openProduct = (product: AffiliateProduct) => {
    if (!product.url) {
      window.alert("제휴 상품 연결은 준비 중입니다.");
      return;
    }

    window.open(product.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <article key={product.id} className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#eef6e9] px-3 py-1.5 text-xs font-bold text-[#2f6c48]">
              {product.category}
            </span>
            {product.isAffiliate ? (
              <span className="rounded-full bg-[#f5f0e4] px-3 py-1.5 text-xs font-bold text-[#7a6230]">
                광고/제휴 가능
              </span>
            ) : null}
          </div>
          <h3 className="mt-5 text-xl font-bold leading-7 text-[#1b4631]">{product.name}</h3>
          <p className="mt-3 text-base leading-7 text-[#526257]">{product.description}</p>
          <div className="mt-5 rounded-lg bg-[#fffdf7] p-4 text-sm leading-6 text-[#526257]">
            <p>
              <strong className="text-[#1b4631]">참고 상황:</strong> {product.recommendedFor}
            </p>
            <p className="mt-2">
              <strong className="text-[#1b4631]">주의사항:</strong> {product.caution}
            </p>
          </div>
          <button
            type="button"
            onClick={() => openProduct(product)}
            className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-[#174330] px-4 py-2.5 text-sm font-bold text-[#174330] transition hover:bg-[#eef6e9]"
          >
            자세히 보기
          </button>
        </article>
      ))}
    </div>
  );
}
