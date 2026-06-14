export default function AffiliateDisclaimer({ compact = false }: { compact?: boolean }) {
  const content = (
    <div className="rounded-lg border border-[#d9d1aa] bg-[#fffdf7] p-5 shadow-sm sm:p-6">
      <p className="text-sm font-extrabold text-[#7a6230]">광고 및 제휴 안내</p>
      <p className="mt-3 text-sm leading-7 text-[#5b6146] sm:text-base">
        일부 링크에는 광고 또는 제휴 링크가 포함될 수 있습니다. 제품 선택은 개인의 상황에 따라
        신중히 판단하시기 바랍니다.
      </p>
    </div>
  );

  if (compact) return content;

  return <section className="mx-auto max-w-[1440px] px-5 pb-12 sm:px-8 lg:px-12">{content}</section>;
}
