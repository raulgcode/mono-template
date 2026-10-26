/**
 * One-shot local setup: `pnpm run setup` (`pnpm start project` runs it at the end).
 * Safe to run again at any time: each step checks its state first and only does what is missing.
 * It never deletes data, containers or values from `.env`.
 *
 * Asks only what is this project's own: how people sign in and, with Google, its OAuth client.
 * Everything else (secrets, Postgres, Mailpit for the emails, hooks, Chromium) is automatic.
 * Without a terminal (CI, an agent) it asks nothing: `--auth magic-link,password` picks the
 * methods and `--google-client-id`/`--google-client-secret` give Google's client.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { type AuthMethod, authMethods, authMethodsSchema } from "@starter/env";
import { chromium } from "playwright";
import { authMethodLabels, parseAuthChoice } from "./auth-choice";
import { buildEnvFile, parseEnvKeys, type SecretGenerators, setEnvValue } from "./env-file";

const root = join(import.meta.dirname, "../..");
const envPath = join(root, ".env");

const { values: flags } = parseArgs({
  options: {
    auth: { type: "string" },
    "google-client-id": { type: "string" },
    "google-client-secret": { type: "string" },
  },
});
const interactive = Boolean(process.stdin.isTTY);

// Local secrets generated on first setup. Add new ones here as features need them.
const generators: SecretGenerators = {
  BETTER_AUTH_SECRET: () => randomBytes(32).toString("base64"),
};

function step(title: string): void {
  console.log(`\n▸ ${title}`);
}

function done(message: string): void {
  console.log(`  ✓ ${message}`);
}

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\n✗ Falló: ${command} ${args.join(" ")}`);
    process.exit(result.status ?? 1);
  }
}

/** Runs a command quietly and returns its trimmed stdout, or undefined when it fails. */
function capture(command: string, args: string[]): string | undefined {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

async function ask(question: string): Promise<string> {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await prompt.question(question)).trim();
  } finally {
    prompt.close();
  }
}

function readEnvFile(): string {
  return readFileSync(envPath, "utf8");
}

function setEnv(key: string, value: string): void {
  writeFileSync(envPath, setEnvValue(readEnvFile(), key, value), { mode: 0o600 });
}

function checkNode(): void {
  step("Node");
  const wanted = readFileSync(join(root, ".nvmrc"), "utf8").trim();
  const major = process.versions.node.split(".")[0];
  if (major !== wanted) {
    console.warn(
      `  ⚠ Usas Node ${process.versions.node}; el proyecto espera Node ${wanted} (.nvmrc).`,
    );
  } else {
    done(`Node ${process.versions.node}`);
  }
}

/** Creates or completes `.env`. True when it didn't exist: the first setup of this copy. */
function writeEnv(): boolean {
  step(".env");
  const current = existsSync(envPath) ? readFileSync(envPath, "utf8") : undefined;
  const example = readFileSync(join(root, ".env.example"), "utf8");
  const { content, added, generated } = buildEnvFile({ example, current, generators });

  if (content !== current) writeFileSync(envPath, content, { mode: 0o600 });
  if (current === undefined) done("Creado desde .env.example");
  else if (added.length > 0) done(`Agregadas: ${added.join(", ")}`);
  else if (generated.length === 0) done("Ya estaba al día");
  if (generated.length > 0) done(`Secretos generados: ${generated.join(", ")}`);
  return current === undefined;
}

function currentMethods(): AuthMethod[] {
  const parsed = authMethodsSchema.safeParse(parseEnvKeys(readEnvFile()).get("AUTH_METHODS"));
  return parsed.success ? parsed.data : ["magic-link"];
}

/** Asks how people sign in: on the first setup, or whenever `--auth` says. */
async function chooseAuthMethods(firstRun: boolean): Promise<AuthMethod[]> {
  step("Cómo entra la gente");
  const current = currentMethods();
  if (flags.auth !== undefined) {
    const methods = parseAuthChoice(flags.auth, current);
    if (!methods) {
      console.error(`  ✗ --auth acepta ${authMethods.join(", ")} separados por comas`);
      process.exit(1);
    }
    return methods;
  }
  if (!firstRun || !interactive) {
    done(
      `${current.join(", ")} (para cambiarlo: pnpm run setup --auth magic-link,password,google)`,
    );
    return current;
  }
  console.log("  Elige uno o varios, separados por comas:");
  authMethods.forEach((method, index) => {
    console.log(`    ${index + 1}. ${authMethodLabels[method]}`);
  });
  while (true) {
    const answer = await ask(
      `  Métodos [${current.map((m) => authMethods.indexOf(m) + 1).join(",")}]: `,
    );
    const methods = parseAuthChoice(answer, current);
    if (methods?.length) return methods;
    console.log(`  Escribe números del 1 al ${authMethods.length}, por ejemplo 1,2`);
  }
}

/**
 * Google needs an OAuth client that only Google Cloud can give: asked for here, or Google stays
 * off (the server refuses google without it) until it's in `.env`.
 */
async function configureGoogle(methods: AuthMethod[]): Promise<AuthMethod[]> {
  if (!methods.includes("google")) return methods;
  const keys = parseEnvKeys(readEnvFile());
  let clientId = flags["google-client-id"] ?? keys.get("GOOGLE_CLIENT_ID") ?? "";
  let clientSecret = flags["google-client-secret"] ?? keys.get("GOOGLE_CLIENT_SECRET") ?? "";
  if ((!clientId || !clientSecret) && interactive) {
    console.log(
      "  Google Cloud → APIs y servicios → Credenciales → ID de cliente de OAuth (Aplicación web),\n" +
        "  con el URI de redirección http://localhost:5173/api/auth/callback/google",
    );
    clientId ||= await ask("  GOOGLE_CLIENT_ID (Enter para dejar Google para después): ");
    if (clientId) clientSecret ||= await ask("  GOOGLE_CLIENT_SECRET: ");
  }
  if (!clientId || !clientSecret) {
    console.log(
      "  ↷ Google queda apagado hasta que pongas GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env",
    );
    const rest = methods.filter((method) => method !== "google");
    return rest.length > 0 ? rest : ["magic-link"];
  }
  setEnv("GOOGLE_CLIENT_ID", clientId);
  setEnv("GOOGLE_CLIENT_SECRET", clientSecret);
  return methods;
}

/** Postgres and Mailpit in Docker; without Docker, a Postgres already at DATABASE_URL works too. */
function startServices(): void {
  step("Postgres y Mailpit (Docker)");
  const docker = spawnSync("docker", ["info"], { stdio: "ignore" });
  if (docker.error || docker.status !== 0) {
    console.warn(
      "  ⚠ Docker no está instalado o no está corriendo. Ábrelo y vuelve a correr pnpm run setup,\n" +
        "    o deja un Postgres en DATABASE_URL (con la base _test) y un SMTP en SMTP_HOST.",
    );
    return;
  }
  const services = capture("docker", ["compose", "ps", "--status", "running", "--services"]);
  const running = services?.split("\n") ?? [];
  if (running.includes("postgres") && running.includes("mailpit")) {
    done("Ya están corriendo");
  } else {
    run("pnpm", ["db:up"]);
  }
}

checkNode();
const firstRun = writeEnv();

const methods = await configureGoogle(await chooseAuthMethods(firstRun));
setEnv("AUTH_METHODS", methods.join(","));
done(`AUTH_METHODS=${methods.join(",")}`);

step("Git hooks (Lefthook)");
const preCommit = join(root, ".git/hooks/pre-commit");
if (existsSync(preCommit) && readFileSync(preCommit, "utf8").includes("lefthook")) {
  done("Ya instalados");
} else if (existsSync(join(root, ".git"))) {
  run("pnpm", ["exec", "lefthook", "install"]);
} else {
  console.log(
    "  ↷ Sin repositorio de git todavía: corre pnpm exec lefthook install después de git init",
  );
}

step("Chromium para Playwright y Vitest Browser Mode");
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath();
if (existsSync(chromiumPath)) {
  done("Ya instalado");
} else if (process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD) {
  console.log("  ↷ Omitido: PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD está definido");
} else {
  run("pnpm", ["exec", "playwright", "install", "chromium"]);
}

startServices();

step("Migraciones");
run("pnpm", ["--silent", "db:migrate"]);

console.log(`
✓ Listo. Siguientes pasos:
  pnpm dev        web http://localhost:5173 · api http://localhost:3001
                  entra como cualquiera en http://localhost:5173/dev/sign-in
  pnpm test       Vitest (unit, integration, browser)
  pnpm test:e2e   Playwright
  Correos de desarrollo (enlaces para entrar, confirmaciones) en Mailpit: http://localhost:8025
`);
