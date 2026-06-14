export default function ExperienceDisclaimer({ compact = false }: { compact?: boolean }) {
  const content = (
    <div className="rounded-lg border border-[#d9d1aa] bg-[#fffdf7] p-5 shadow-sm sm:p-6">
      <p className="text-sm font-extrabold text-[#7a6230]">개인 경험담 안내</p>
      <p className="mt-3 text-sm leading-7 text-[#5b6146] sm:text-base">
        개인 경험담은 작성자의 주관적 경험이며, 모든 사람에게 동일하게 적용되지 않을 수 있습니다.
      </p>
    </div>
  );

  if (compact) return content;

  return <section className="mx-auto max-w-[1440px] px-5 pb-12 sm:px-8 lg:px-12">{content}</section>;
}
