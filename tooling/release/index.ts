/**
 * Publishes a version to production: `pnpm release [patch|minor|major|1.2.3] [--yes] [--no-watch]`.
 *
 * It tags the latest commit of main (vX.Y.Z, annotated) and pushes the tag; the Deploy workflow
 * (.github/workflows/deploy.yml) sees the tag, waits for that commit's CI and deploys the API
 * (with the migrations) and the web to Fly.io. Without an argument it is a patch. The same
 * script runs in GitHub Actions when the release is started from the Actions tab or the API
 * ("Run workflow" in Deploy), so anyone with access to the repo can release without a terminal.
 *
 * Main must be clean and equal to origin/main: what goes out is exactly what is on GitHub. With
 * the GitHub CLI (`gh auth login`) it then follows the deploy until it ends.
 */
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { nextVersion } from "./version";

const WORKFLOW = "deploy.yml";

function run(command: string, args: string[]): number {
  return spawnSync(command, args, { stdio: "inherit" }).status ?? 1;
}

/** Runs a command quietly and returns its trimmed stdout, or undefined when it fails. */
function capture(command: string, args: string[]): string | undefined {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    yes: { type: "boolean", short: "y", default: false },
    "no-watch": { type: "boolean", default: false },
  },
});

if (run("git", ["fetch", "--quiet", "--tags", "origin", "main"]) !== 0) {
  fail("No pude traer main y los tags de GitHub");
}
if (capture("git", ["status", "--porcelain"])) {
  fail("Hay cambios sin commit: súbelos a main o guárdalos antes de publicar");
}
const head = capture("git", ["rev-parse", "HEAD"]);
const main = capture("git", ["rev-parse", "origin/main"]);
if (!head || head !== main) {
  fail("Estás fuera de origin/main: haz git checkout main && git pull, y vuelve a correrlo");
}
if (capture("git", ["tag", "--points-at", head])?.match(/^v\d/m)) {
  fail("Este commit ya tiene una versión: no hay nada nuevo que publicar");
}

const tags = (capture("git", ["tag", "--list", "v*"]) ?? "").split("\n").filter(Boolean);
let tag: string;
try {
  tag = nextVersion(tags, positionals[0] ?? "patch");
} catch (error) {
  fail((error as Error).message);
}

const subject = capture("git", ["log", "-1", "--format=%h %s", head]);
console.log(`Publicar ${tag} con ${subject}`);
if (!values.yes) {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await prompt.question("¿Sale a producción? (s/N) ");
  prompt.close();
  if (!/^(s|si|sí|y|yes)$/i.test(answer.trim())) fail("No publiqué nada");
}

if (run("git", ["tag", "--annotate", tag, "--message", `${tag}`, head]) !== 0) {
  fail(`No pude crear el tag ${tag}`);
}
if (run("git", ["push", "origin", `refs/tags/${tag}`]) !== 0) {
  run("git", ["tag", "--delete", tag]);
  fail(`GitHub no aceptó el tag ${tag}`);
}
console.log(`✓ ${tag} está en GitHub: el despliegue arranca en Actions`);

// In Actions the same workflow deploys right after this step: there is nothing to follow.
if (values["no-watch"] || process.env.GITHUB_ACTIONS) process.exit(0);
if (!capture("gh", ["auth", "status"])) {
  console.log("  Síguelo en la pestaña Actions de GitHub (o instala gh para verlo aquí).");
  process.exit(0);
}

// The push doesn't return the run: look for it among the newest of this tag.
let runId: string | undefined;
for (let attempt = 0; attempt < 15 && !runId; attempt++) {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  runId = capture("gh", [
    "run",
    "list",
    "--workflow",
    WORKFLOW,
    "--branch",
    tag,
    "--limit",
    "1",
    "--json",
    "databaseId",
    "--jq",
    ".[0].databaseId // empty",
  ]);
}
if (!runId) {
  console.log("  No encontré la corrida todavía: búscala en la pestaña Actions de GitHub.");
  process.exit(0);
}
process.exit(run("gh", ["run", "watch", runId, "--exit-status"]) === 0 ? 0 : 1);
