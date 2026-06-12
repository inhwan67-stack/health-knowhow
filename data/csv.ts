import { readFileSync } from "fs";
import path from "path";

export type CsvRow = Record<string, string>;

export function readCsvRows(fileName: string): CsvRow[] {
  const filePath = path.join(process.cwd(), "public", "data", fileName);
  const content = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return parseCsv(content);
}

export function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCsv(content: string): CsvRow[] {
  const rows = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);

  const [headers, ...records] = rows;
  if (!headers) return [];

  return records.map((record) =>
    headers.reduce<CsvRow>((row, header, index) => {
      row[header] = record[index] ?? "";
      return row;
    }, {}),
  );
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}
