import type { Metadata } from "next";
import InfoPage from "../components/InfoPage";

export const metadata: Metadata = {
  title: "Health Knowhow 소개 | Health Knowhow",
  description: "Health Knowhow는 증상과 질병별 건강정보, 식이요법, 운동요법, 영상자료, 경험담을 구분해 정리하는 건강정보 탐색 플랫폼입니다.",
};

export default function AboutPage() {
  return (
    <InfoPage
      title="Health Knowhow 소개"
      description="Health Knowhow는 증상과 질병별 건강정보를 정리하는 건강정보 탐색 플랫폼입니다."
      sections={[
        {
          title: "사이트의 목적",
          body: [
            "Health Knowhow는 질병명이나 증상을 기준으로 생활관리 참고자료, 식이요법, 운동요법, 영상자료, 외부 참고자료, 개인 경험담을 한곳에서 탐색할 수 있도록 구성한 사이트입니다.",
            "사용자가 병원 상담 전 자신의 증상과 생활패턴을 정리하고, 어떤 질문을 준비하면 좋을지 확인하는 데 도움을 주는 것을 목표로 합니다.",
          ],
        },
        {
          title: "콘텐츠 구분 원칙",
          body: [
            "의학 참고자료, 식이요법, 운동요법, 영상자료, 개인 경험담은 서로 다른 성격의 정보로 구분해 제공합니다.",
            "개인 경험담은 작성자의 주관적 경험이며, 의학적 진단이나 치료법이 아닙니다. 영상과 외부 자료도 건강정보 참고용으로만 제공됩니다.",
          ],
        },
        {
          title: "의료정보 이용 안내",
          body: [
            "이 사이트는 의학적 진단, 치료, 처방을 제공하지 않습니다.",
            "증상이 있거나 치료가 필요한 경우 의사 또는 전문 의료기관과 상담하시기 바랍니다. 응급 증상이 의심되는 경우 119 또는 가까운 응급실 이용을 권장합니다.",
          ],
        },
      ]}
    />
  );
}
