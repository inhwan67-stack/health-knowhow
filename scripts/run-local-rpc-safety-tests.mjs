import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptDir, "..");
const sqlPath = join(rootDir, "supabase", "local-tests", "content-platform-rpc-smoke.sql");

function printHelp() {
  console.log(`Runs local Supabase RPC safety integration tests.

Requirements:
  - Docker Desktop is running
  - Local Supabase is already started for this project
  - A database container named like supabase_db_* is running

Usage:
  npm run test:rpc:local

Optional:
  SUPABASE_DB_CONTAINER=supabase_db_health-knowhow npm run test:rpc:local
`);
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  printHelp();
  process.exit(0);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
    ...options,
  });
}

function findDatabaseContainer() {
  if (process.env.SUPABASE_DB_CONTAINER) {
    return process.env.SUPABASE_DB_CONTAINER;
  }

  const result = run("docker", ["ps", "--format", "{{.Names}}"]);
  if (result.error) {
    throw new Error(
      `Docker command failed: ${result.error.message}\n` +
        "Make sure Docker Desktop is running and run this command in normal Windows PowerShell.",
    );
  }
  if (result.status !== 0) {
    throw new Error(`docker ps failed with exit code ${result.status}\n${result.stderr || result.stdout}`);
  }

  const candidates = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((name) => name.startsWith("supabase_db_"));

  if (candidates.length === 0) {
    throw new Error(
      "No local Supabase database container was found.\n" +
        "Start local Supabase first, then rerun: npx.cmd --yes supabase start",
    );
  }
  if (candidates.length > 1) {
    throw new Error(
      `Multiple Supabase database containers found: ${candidates.join(", ")}\n` +
        "Set SUPABASE_DB_CONTAINER to the intended container name.",
    );
  }
  return candidates[0];
}

function main() {
  const sql = readFileSync(sqlPath, "utf8");
  const dbContainer = findDatabaseContainer();

  console.log(`Running local RPC safety tests against ${dbContainer}`);
  console.log(`SQL: ${sqlPath}`);

  const result = run(
    "docker",
    [
      "exec",
      "-i",
      dbContainer,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-P",
      "pager=off",
      "-f",
      "-",
    ],
    { input: sql },
  );

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.error) {
    throw new Error(`docker exec failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const summaryMatch = result.stdout.match(/RPC_SAFETY_SUMMARY:(\{.*\})/);
  if (!summaryMatch) {
    throw new Error("RPC safety summary was not found in psql output.");
  }

  const summary = JSON.parse(summaryMatch[1]);
  const passedCount = Number(summary.passedCount);
  const failedCount = Number(summary.failedCount);
  const totalCount = Number(summary.totalCount);

  console.log(`Local RPC safety summary: ${passedCount}/${totalCount} passed, ${failedCount} failed.`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
