/**
 * Sends the production variables to both Fly apps:
 * `pnpm fly:secrets [.env.production] [--check]`.
 *
 * The file stays on this machine (`.env.*` is in .gitignore) and the values go straight to
 * Fly with `fly secrets set --stage`: they take effect with the next deploy (`pnpm release`).
 * First it checks the file and stops on anything that would break production (localhost,
 * Mailpit, the development BETTER_AUTH_SECRET); `--check` stops there.
 * Needs flyctl with a session (`fly auth login`).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { parseArgs, parseEnv } from "node:util";
import { planSecrets } from "./secrets";

const APPS = ["starter-api", "starter-web"];

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function readEnv(path: string): Record<string, string> {
  return parseEnv(readFileSync(path, "utf8")) as Record<string, string>;
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    check: { type: "boolean", default: false },
    yes: { type: "boolean", short: "y", default: false },
  },
});

const file = positionals[0] ?? ".env.production";
if (!existsSync(file)) {
  fail(`No existe ${file}: cópialo de tu .env (cp .env ${file}) y cambia lo de producción`);
}
const local = existsSync(".env") && file !== ".env" ? readEnv(".env") : {};
const plan = planSecrets(readEnv(file), { localAuthSecret: local.BETTER_AUTH_SECRET });

console.log(`Secretos de ${file} para ${APPS.join(" y ")}:`);
for (const key of Object.keys(plan.secrets)) console.log(`  ✓ ${key}`);
for (const { key, reason } of plan.skipped) console.log(`  · ${key}: no se manda (${reason})`);
if (plan.problems.length > 0) {
  console.error("\nAntes de mandarlos, arregla esto:");
  for (const problem of plan.problems) console.error(`  ✗ ${problem}`);
  process.exit(1);
}
if (values.check) {
  console.log("\n✓ Listo para producción");
  process.exit(0);
}

if (spawnSync("fly", ["auth", "whoami"], { stdio: "ignore" }).status !== 0) {
  fail("Necesitas flyctl con sesión: brew install flyctl && fly auth login");
}
if (!values.yes) {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await prompt.question("\n¿Los mando a Fly? (s/N) ");
  prompt.close();
  if (!/^(s|si|sí|y|yes)$/i.test(answer.trim())) fail("No mandé nada");
}

// As arguments, never through a shell: no value is quoted, expanded or printed.
const pairs = Object.entries(plan.secrets).map(([key, value]) => `${key}=${value}`);
for (const app of APPS) {
  const result = spawnSync("fly", ["secrets", "set", "--stage", "--app", app, ...pairs], {
    stdio: ["ignore", "ignore", "inherit"],
  });
  if (result.status !== 0) fail(`Fly no aceptó los secretos de ${app}`);
  console.log(`✓ ${app}: ${pairs.length} secretos (entran con el próximo despliegue)`);
}
