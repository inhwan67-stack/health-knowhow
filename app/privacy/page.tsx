import type { Metadata } from "next";
import InfoPage from "../components/InfoPage";

export const metadata: Metadata = {
  title: "개인정보처리방침 | Health Knowhow",
  description: "Health Knowhow의 개인정보 처리 기준, localStorage 기반 기록, 향후 회원가입과 광고 도구 도입 시 업데이트 안내입니다.",
};

export default function PrivacyPage() {
  return (
    <InfoPage
      title="개인정보처리방침"
      description="이 개인정보처리방침은 Health Knowhow의 현재 개인정보 처리 방식과 향후 변경 가능성을 설명하는 일반적인 초안입니다."
      sections={[
        {
          title: "방침의 성격",
          body: [
            "본 문서는 일반적인 안내 초안이며 법률 자문이 아닙니다. 실제 서비스 운영 전에는 관련 법령과 운영 방식에 맞춘 법률 검토가 필요합니다.",
            "Health Knowhow는 건강정보 사이트 특성상 민감한 의료정보, 실명, 연락처, 주소, 주민등록번호, 병원 진료기록 등의 입력을 권장하지 않습니다.",
          ],
        },
        {
          title: "현재 수집할 수 있는 정보",
          body: [
            "현재 사이트는 회원가입이나 서버 데이터베이스 저장 기능을 기본으로 제공하지 않습니다.",
            "사용자가 증상 기록 또는 경험담 작성 기능을 이용할 때 입력한 내용이 브라우저 localStorage에 저장될 수 있습니다. 이 정보는 사용자의 브라우저에 저장되며, 현재 구조에서는 서버로 전송되는 기능을 전제로 하지 않습니다.",
          ],
        },
        {
          title: "localStorage 기록 안내",
          body: [
            "localStorage에 저장된 증상 기록과 임시 경험담은 같은 브라우저에서 다시 확인하기 위한 용도로 사용됩니다.",
            "공용 PC나 타인과 함께 사용하는 기기에서는 민감한 건강정보를 입력하지 않는 것이 좋습니다. 브라우저 데이터 삭제 시 저장된 기록도 삭제될 수 있습니다.",
          ],
        },
        {
          title: "향후 변경 가능성",
          body: [
            "향후 회원가입, Supabase 등 데이터베이스, 광고, 분석 도구, 문의 폼이 도입되면 수집 항목과 처리 방식이 변경될 수 있습니다.",
            "Google AdSense, 방문 분석 도구, 로그인 기능 또는 서버 저장 기능을 도입하는 경우 쿠키, 광고 식별자, 접속 기록, 계정 정보 처리에 대한 별도 안내와 방침 업데이트가 필요합니다.",
          ],
        },
        {
          title: "개인정보 문의",
          body: [
            "개인정보 관련 문의는 문의 페이지의 안내 이메일을 통해 접수할 수 있습니다.",
            "현재 문의 이메일: contact@health-knowhow.example",
          ],
        },
      ]}
    />
  );
}
