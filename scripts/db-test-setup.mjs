// Creates a throwaway test database on plain Postgres, installs the
// Supabase stub and applies every migration in order.
// Usage: TEST_DATABASE_URL=postgres://postgres@localhost:5432/fresh_test node scripts/db-test-setup.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is required");
const target = new URL(url);
const dbName = target.pathname.slice(1);
if (!/^[a-z0-9_]*test[a-z0-9_]*$/.test(dbName)) {
  throw new Error(`Refusing to reset "${dbName}": test database names must contain "test".`);
}

export async function setupTestDatabase() {
  const admin = new URL(url);
  admin.pathname = "/postgres";
  const root = new pg.Client({ connectionString: admin.toString() });
  await root.connect();
  await root.query(`drop database if exists ${dbName} with (force)`);
  await root.query(`create database ${dbName}`);
  await root.end();

  const db = new pg.Client({ connectionString: url });
  await db.connect();
  const dir = join(process.cwd(), "supabase");
  await db.query(readFileSync(join(dir, "tests", "supabase_stub.sql"), "utf8"));
  const files = readdirSync(join(dir, "migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of files) {
    try {
      await db.query(readFileSync(join(dir, "migrations", f), "utf8"));
    } catch (err) {
      throw new Error(`Migration ${f} failed: ${err.message}`);
    }
  }
  await db.end();
  return files;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  setupTestDatabase().then((files) => console.log(`Applied ${files.length} migrations to ${dbName}`));
}
