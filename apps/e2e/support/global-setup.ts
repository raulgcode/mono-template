import { runMigrations } from "@starter/db/migrate";
import { loadDotEnv } from "@starter/env";

export default async function globalSetup() {
  loadDotEnv();
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set");
  await runMigrations(url);
}
