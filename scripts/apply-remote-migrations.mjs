/**
 * Apply selected SQL migrations to the linked Supabase Postgres instance.
 * Requires: SUPABASE_DB_PASSWORD (Project Settings → Database → Database password)
 *
 *   SUPABASE_DB_PASSWORD='your-db-password' npm run db:apply-remote
 *
 * Optional: SUPABASE_PROJECT_REF (default: read from supabase/.temp/project-ref)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function readProjectRef() {
  const refPath = path.join(root, "supabase", ".temp", "project-ref");
  if (fs.existsSync(refPath)) {
    return fs.readFileSync(refPath, "utf8").trim();
  }
  return process.env.SUPABASE_PROJECT_REF || "eveobpkppfdwacysrwor";
}

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error(
    "Missing SUPABASE_DB_PASSWORD. In Supabase: Project Settings → Database → copy the database password, then run:\n" +
      "  SUPABASE_DB_PASSWORD='…' npm run db:apply-remote"
  );
  process.exit(1);
}

const ref = readProjectRef();
const host = process.env.SUPABASE_DB_HOST || "aws-1-eu-north-1.pooler.supabase.com";
const user = process.env.SUPABASE_DB_USER || `postgres.${ref}`;

const files = [
  "20240227_fix_policies.sql",
  "20260408_handle_new_user_invite_metadata.sql",
  "20260409120000_enable_realtime_shifts_time_entries.sql",
  "20260409140000_time_off_requests.sql",
];

const client = new pg.Client({
  host,
  port: Number(process.env.SUPABASE_DB_PORT || 5432),
  user,
  password,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log(`Connected to ${host} as ${user}`);

  for (const name of files) {
    const filePath = path.join(root, "supabase", "migrations", name);
    if (!fs.existsSync(filePath)) {
      console.warn("Skip (file missing):", name);
      continue;
    }
    const sql = fs.readFileSync(filePath, "utf8");
    console.log("Applying:", name);
    await client.query(sql);
    console.log("  done.");
  }

  await client.end();
  console.log("All listed migrations applied successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
