// Rebuilds the throwaway test database before the DB test suite runs.
export default async function setup() {
  if (!process.env.TEST_DATABASE_URL) return;
  const { setupTestDatabase } = await import("../../scripts/db-test-setup.mjs");
  await setupTestDatabase();
}
