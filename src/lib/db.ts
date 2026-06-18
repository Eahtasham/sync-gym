import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

/**
 * Database client backed by the libSQL driver adapter.
 *
 * - If TURSO_DATABASE_URL + TURSO_AUTH_TOKEN are set -> connect to Turso (production).
 * - Otherwise -> connect to the local SQLite file at prisma/dev.db (development).
 *
 * The local file is resolved to an absolute path so it always matches the file
 * the Prisma CLI (`prisma db push`) creates, regardless of the process CWD.
 */
function buildAdapter() {
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
  const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (tursoUrl && tursoToken) {
    return new PrismaLibSQL({ url: tursoUrl, authToken: tursoToken });
  }

  const localFile = path.resolve(process.cwd(), "prisma", "dev.db");
  const url = `file:${localFile.replace(/\\/g, "/")}`;
  return new PrismaLibSQL({ url });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: buildAdapter(),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
