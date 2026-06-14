This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Supabase DB 연결 준비

현재 Health Knowhow는 mock/static CSV 데이터와 브라우저 localStorage를 기반으로 동작합니다.
9단계에서는 실제 Supabase 프로젝트 키가 없어도 앱이 깨지지 않도록 Supabase 연결 준비 구조만 추가했습니다.

Supabase 패키지가 필요합니다.

```bash
npm install @supabase/supabase-js
```

환경변수는 `.env.example`을 참고해 `.env.local`에 직접 작성합니다. `.env.local`은 GitHub에 올리지 않습니다.

자세한 설정 순서는 [docs/supabase-setup.md](docs/supabase-setup.md)를 확인하세요.

실제 운영 전 필요한 작업:

- Supabase 프로젝트 생성
- Vercel 환경변수 등록
- `supabase/schema.sql` 실행
- RLS 정책 설정 및 검증
- 관리자 인증
- 개인정보 처리방침
- 의료정보 주의 고지

운영 전까지 경험담은 의학적 진단이나 치료법이 아니며, 증상 기록은 개인 참고용 도구입니다. 민감한 개인정보 입력을 금지하고, 진단/치료/처방을 대신하지 않으며, 증상이 있거나 치료가 필요한 경우 의료기관 상담을 권장해야 합니다.
