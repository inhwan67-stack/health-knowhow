import { readCsvRows, splitList } from "./csv";
import type { Symptom } from "./types";

export function getSymptoms(): Symptom[] {
  return readCsvRows("symptoms.csv").map((row) => ({
    id: row.id,
    name: row.name,
    relatedDiseaseIds: splitList(row.relatedDiseaseIds),
    category: row.category,
    description: row.description,
    emergencyLevel: toEmergencyLevel(row.emergencyLevel),
    recommendedAction: row.recommendedAction,
    searchAliases: splitList(row.searchAliases),
  }));
}

function toEmergencyLevel(value: string): Symptom["emergencyLevel"] {
  if (value === "emergency" || value === "caution" || value === "normal") return value;
  return "normal";
}
