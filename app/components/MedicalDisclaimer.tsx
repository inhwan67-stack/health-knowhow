export default function MedicalDisclaimer() {
  return (
    <section className="mx-auto max-w-[1440px] px-5 pb-12 sm:px-8 lg:px-12">
      <div className="rounded-lg border border-[#b7d0ac] bg-[#f4faf0] p-6 shadow-[0_12px_34px_rgba(31,75,54,0.08)] sm:p-7">
        <p className="text-sm font-extrabold text-[#2f6c48]">의료 정보 이용 안내</p>
        <p className="mt-3 text-base leading-8 text-[#405347] sm:text-lg">
          이 사이트의 정보는 개인 경험과 일반 건강정보를 정리한 참고자료입니다. 의학적 진단,
          치료, 처방을 대신하지 않으며, 증상이 있거나 치료가 필요한 경우 반드시 의사 또는
          전문 의료기관과 상담하시기 바랍니다.
        </p>
      </div>
    </section>
  );
}
