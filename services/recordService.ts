import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SymptomRecord } from "@/types/health";
import { isSupabaseConfigured } from "./dataSource";

const RECORD_STORAGE_KEY = "healthKnowhowRecords";

export type SymptomRecordInput = Omit<SymptomRecord, "id" | "createdAt">;

export async function getSymptomRecords() {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { data, error } = await supabase.from("symptom_records").select("*").order("created_at", { ascending: false });
      if (!error && data) return data.map(mapSupabaseRecord);
    }
  }

  return loadLocalRecords();
}

export async function createSymptomRecord(input: SymptomRecordInput) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { data, error } = await supabase.from("symptom_records").insert(toSupabaseRecordInput(input)).select().maybeSingle();
      if (!error && data) return mapSupabaseRecord(data);
    }
  }

  const record: SymptomRecord = {
    ...input,
    id: createRecordId(),
    createdAt: new Date().toISOString(),
  };
  saveLocalRecords([record, ...loadLocalRecords()]);
  return record;
}

export async function deleteSymptomRecord(id: string) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { error } = await supabase.from("symptom_records").delete().eq("id", id);
      if (!error) return true;
    }
  }

  saveLocalRecords(loadLocalRecords().filter((record) => record.id !== id));
  return true;
}

export async function clearSymptomRecords() {
  if (typeof window !== "undefined") window.localStorage.removeItem(RECORD_STORAGE_KEY);
  return true;
}

export async function getRecordsByUserId(userId: string) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("symptom_records")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!error && data) return data.map(mapSupabaseRecord);
    }
  }

  return loadLocalRecords();
}

function loadLocalRecords(): SymptomRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(RECORD_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as SymptomRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalRecords(records: SymptomRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RECORD_STORAGE_KEY, JSON.stringify(records));
}

function toSupabaseRecordInput(input: SymptomRecordInput) {
  return {
    symptom_name: input.symptomName,
    start_date: input.startDate || null,
    severity: input.severity,
    worse_time: input.worseTime,
    related_foods: input.relatedFoods,
    medicines: input.medicines,
    lifestyle_changes: input.lifestyleChanges,
    hospital_visit_status: input.hospitalVisitStatus,
    memo: input.memo,
    agree_to_share: input.agreeToShare,
  };
}

function mapSupabaseRecord(row: Record<string, unknown>): SymptomRecord {
  return {
    id: String(row.id),
    symptomName: String(row.symptom_name ?? ""),
    startDate: String(row.start_date ?? ""),
    severity: Number(row.severity ?? 5),
    worseTime: String(row.worse_time ?? ""),
    relatedFoods: String(row.related_foods ?? ""),
    medicines: String(row.medicines ?? ""),
    lifestyleChanges: String(row.lifestyle_changes ?? ""),
    hospitalVisitStatus: String(row.hospital_visit_status ?? "아직 방문하지 않음") as SymptomRecord["hospitalVisitStatus"],
    memo: String(row.memo ?? ""),
    agreeToShare: Boolean(row.agree_to_share),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function createRecordId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
