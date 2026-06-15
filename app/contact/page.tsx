import type { Metadata } from "next";
import InfoPage from "../components/InfoPage";

export const metadata: Metadata = {
  title: "문의하기 | Health Knowhow",
  description: "Health Knowhow 사이트 오류 제보, 콘텐츠 수정 요청, 광고 및 제휴, 개인정보 관련 문의 안내 페이지입니다.",
};

export default function ContactPage() {
  return (
    <InfoPage
      title="문의하기"
      description="사이트 이용 중 발견한 오류, 콘텐츠 수정 요청, 광고와 제휴, 개인정보 관련 문의를 안내합니다."
      sections={[
        {
          title: "문의 가능한 내용",
          body: [
            "사이트 오류 제보, 링크 오류, 오탈자, 콘텐츠 수정 요청, 광고 및 제휴 문의, 개인정보 관련 문의를 접수할 수 있습니다.",
            "건강정보의 정확성 보완이 필요한 부분을 발견하신 경우 페이지 주소와 수정이 필요한 내용을 함께 알려 주세요.",
          ],
        },
        {
          title: "문의 방법",
          body: [
            "현재 별도 문의 양식은 제공하지 않으며, 임시 문의 이메일을 통해 접수하는 방식으로 운영할 예정입니다.",
            "문의 이메일: contact@health-knowhow.example",
            "실제 운영 전에는 도메인 이메일, 문의 폼, 스팸 방지, 개인정보 처리 절차를 보완할 예정입니다.",
          ],
        },
        {
          title: "의료 상담 관련 안내",
          body: [
            "이 사이트는 개별 증상에 대한 진단, 치료, 처방 상담을 제공하지 않습니다.",
            "증상이 있거나 치료가 필요한 경우 의료기관에 문의하시기 바랍니다. 응급 상황에서는 119 또는 가까운 응급실 이용을 권장합니다.",
          ],
        },
      ]}
    />
  );
}
