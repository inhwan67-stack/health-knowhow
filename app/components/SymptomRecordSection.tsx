const symptomFields = [
  "증상 부위",
  "발생일",
  "증상 설명",
  "사진 업로드",
  "통증/가려움/진물/붓기 여부",
  "기저질환",
  "복용약",
  "사용한 연고",
  "병원 방문 기록",
  "처방 기록",
  "경과 메모",
];

const timelineItems = [
  { day: "1일차", title: "처음 증상 발견", detail: "가려움과 붉은기 기록, 사진 1장 첨부" },
  { day: "4일차", title: "연고 사용 후 변화", detail: "붓기 감소 여부와 사용한 연고 기록" },
  { day: "7일차", title: "병원 방문 메모", detail: "진료과, 처방 내용, 다음 확인할 질문 정리" },
];

export default function SymptomRecordSection() {
  return (
    <section id="records" className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="text-sm font-extrabold text-[#2f6c48]">내 증상 기록</p>
          <h2 className="mt-2 text-3xl font-extrabold leading-tight text-[#173d2d] sm:text-4xl">
            증상, 사진, 복용약, 병원 방문 기록을 한 흐름으로 정리합니다
          </h2>
          <p className="mt-4 text-base leading-8 text-[#526257] sm:text-lg">
            기록은 기본적으로 비공개입니다. 사용자가 선택한 경우에만 익명 공개 검토 대상으로 전환되는 구조를 전제로 설계합니다.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {symptomFields.map((field) => (
              <SymptomRecordCard key={field} title={field} />
            ))}
          </div>
        </div>

        <div className="grid gap-5">
          <ProgressTimelinePreview />
          <PhotoUploadPreview />
        </div>
      </div>
    </section>
  );
}

export function SymptomRecordCard({ title }: { title: string }) {
  return (
    <article className="rounded-lg border border-[#dde6d7] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#2f6c48]" />
        <h3 className="text-sm font-extrabold text-[#1b4631]">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#526257]">월간 리포트와 진료 전 정리에 활용되는 기록 항목입니다.</p>
    </article>
  );
}

export function ProgressTimelinePreview() {
  return (
    <article className="rounded-lg border border-[#cfe0c7] bg-[#f4faf0] p-5 shadow-sm sm:p-6">
      <p className="text-sm font-extrabold text-[#2f6c48]">경과 타임라인 미리보기</p>
      <div className="mt-5 grid gap-4">
        {timelineItems.map((item) => (
          <div key={item.day} className="grid grid-cols-[70px_1fr] gap-4">
            <span className="rounded-full bg-white px-3 py-2 text-center text-xs font-extrabold text-[#2f6c48] shadow-sm">
              {item.day}
            </span>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <h3 className="text-base font-extrabold text-[#173d2d]">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-[#526257]">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export function PhotoUploadPreview() {
  return (
    <article className="rounded-lg border border-[#dde6d7] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-[#2f6c48]">사진 경과 기록</p>
          <h3 className="mt-2 text-2xl font-extrabold text-[#173d2d]">업로드 UI mock</h3>
        </div>
        <span className="w-fit rounded-full bg-[#f5f0e4] px-3 py-1.5 text-xs font-extrabold text-[#7a6230]">기본 비공개</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {["촬영일", "증상 부위", "변화 메모"].map((label) => (
          <div key={label} className="rounded-lg border border-dashed border-[#bcd2b2] bg-[#fffdf7] p-4 text-center">
            <p className="text-sm font-bold text-[#526257]">{label}</p>
            <p className="mt-2 text-xs leading-5 text-[#7a8a7f]">실제 업로드 연결 전 mock 영역</p>
          </div>
        ))}
      </div>
      <p className="mt-5 rounded-lg bg-[#fff7f3] p-4 text-sm font-semibold leading-6 text-[#714533]">
        얼굴, 주민등록번호, 병원번호, 처방전 식별정보가 포함된 이미지는 공개 전에 마스킹과 관리자 검토가 필요합니다.
      </p>
    </article>
  );
}
