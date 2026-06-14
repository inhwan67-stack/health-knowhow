export type DataSource = "static" | "localStorage" | "supabase";

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getCurrentDataSource(): DataSource {
  return isSupabaseConfigured() ? "supabase" : "static";
}

export function getDataSourceStatus() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const supabaseReady = hasUrl && hasAnonKey;

  return {
    hasUrl,
    hasAnonKey,
    supabaseReady,
    currentDataSource: supabaseReady ? "supabase 준비됨" : "static + localStorage",
    supabaseConnectionLabel: supabaseReady ? "설정됨" : "미설정",
    experienceStorage: supabaseReady ? "Supabase 전환 준비됨, 현재 fallback 유지" : "CSV mock + localStorage draft",
    recordStorage: supabaseReady ? "Supabase 전환 준비됨, 현재 localStorage 유지" : "localStorage",
    adminReviewStorage: supabaseReady ? "Supabase admin_reviews 전환 준비됨, 현재 localStorage 유지" : "localStorage mock",
    fallbackDescription:
      "Supabase 환경변수가 없으면 CSV/TypeScript static 데이터와 브라우저 localStorage를 사용합니다. 환경변수가 있으면 Supabase 사용 가능 상태로 인식하지만, 화면 전체를 강제 전환하지는 않습니다.",
  };
}
