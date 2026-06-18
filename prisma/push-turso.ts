/**
 * Push the Prisma schema to Turso (libSQL).
 *
 * Prisma 6's CLI can't `db push` directly to a libsql:// URL, so we:
 *   1. Generate the CREATE TABLE DDL from the schema (offline, no DB needed).
 *   2. Execute it against Turso via @libsql/client.
 *
 * Re-running is safe: statements that fail with "already exists" are skipped.
 * Usage: npm run db:push:turso
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { createClient } from "@libsql/client";

async function main() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (!url || !authToken) {
    throw new Error(
      "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in .env to push to Turso.",
    );
  }

  console.log("Generating DDL from prisma/schema.prisma ...");
  const ddl = execSync(
    "npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script",
    { encoding: "utf8" },
  );

  const statements = ddl
    .split("\n")
    .filter((line) => !line.trim().startsWith("--")) // drop "-- CreateTable" comments
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const client = createClient({ url, authToken });

  console.log(`Applying ${statements.length} statements to Turso ...`);
  let created = 0;
  let skipped = 0;
  for (const stmt of statements) {
    try {
      await client.execute(stmt);
      created++;
    } catch (err) {
      const msg = String(err);
      if (/already exists/i.test(msg)) {
        skipped++;
        continue;
      }
      console.error("Failed statement:\n", stmt);
      throw err;
    }
  }

  console.log(`Done. ${created} applied, ${skipped} skipped (already existed).`);
  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
