import { runMigrations } from "@starter/db/migrate";
import { loadDotEnv } from "@starter/env";

// Runs once before the integration project: brings the test database schema up to date.
export default async function setup() {
  loadDotEnv();
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set (see .env.example)");
  await runMigrations(url);
}
