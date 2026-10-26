/**
 * Starts a project from this template: `pnpm start project "Mi App" [--domain mi-app.com]`.
 *
 * Renames everything that says "Starter" (packages `@starter/*`, the app's name, the database,
 * the Fly apps, the domain), installs with pnpm and runs `pnpm run setup`. Runs once: it removes
 * itself when it's done, so the project keeps no trace of the template.
 */
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { projectNames, renameText, template } from "./rename";

const root = join(import.meta.dirname, "../..");

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) fail(`Falló: ${command} ${args.join(" ")}`);
}

/** Files in git and new ones it doesn't ignore; `.env` too, so a local setup keeps working. */
function projectFiles(): string[] {
  const list = (args: string[]) =>
    spawnSync("git", ["ls-files", "-z", ...args], { cwd: root, encoding: "utf8" })
      .stdout.split("\0")
      .filter(Boolean);
  const files = new Set([...list([]), ...list(["--others", "--exclude-standard"])]);
  if (existsSync(join(root, ".env"))) files.add(".env");
  // Only regular files: the skills' symlinks point at files that are already in the list.
  return [...files].filter(
    (file) =>
      !file.startsWith("tooling/start/") &&
      existsSync(join(root, file)) &&
      lstatSync(join(root, file)).isFile(),
  );
}

// Between these markers the README explains the template itself: the project doesn't need it.
const templateSection = /<!-- template:start -->[\s\S]*?<!-- template:end -->\n*/;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { domain: { type: "string" } },
});
const [command, ...nameParts] = positionals;
if (command !== "project" || nameParts.length === 0) {
  fail('Uso: pnpm start project "Nombre del proyecto" [--domain mi-proyecto.com]');
}

const rootPackage = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  name: string;
  scripts: Record<string, string>;
};
if (rootPackage.name !== template.slug) {
  fail(`Este proyecto ya se llama "${rootPackage.name}": pnpm start project solo corre una vez.`);
}

let names: ReturnType<typeof projectNames>;
try {
  names = projectNames(nameParts.join(" "), values.domain);
} catch (error) {
  fail((error as Error).message);
}

console.log(`\n▸ ${names.display}`);
console.log(
  `  paquetes @${names.slug}/* · base de datos ${names.ident} · https://app.${names.domain}`,
);

let changed = 0;
for (const file of projectFiles()) {
  const path = join(root, file);
  const buffer = readFileSync(path);
  // Images, fonts and other binaries have no names to change.
  if (buffer.includes(0)) continue;
  const text = buffer.toString("utf8");
  let renamed = renameText(text, names);
  if (file === "README.md") renamed = renamed.replace(templateSection, "");
  if (renamed !== text) {
    writeFileSync(path, renamed);
    changed++;
  }
}
console.log(`  ✓ ${changed} archivos renombrados`);

// The template's own tool goes away with the template.
const renamedPackage = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  scripts: Record<string, string>;
};
delete renamedPackage.scripts.start;
writeFileSync(join(root, "package.json"), `${JSON.stringify(renamedPackage, null, 2)}\n`);
rmSync(join(import.meta.dirname), { recursive: true, force: true });

console.log("\n▸ pnpm install");
run("pnpm", ["install"]);
// The new scope sorts imports differently: Biome puts them back in order.
run("pnpm", ["exec", "biome", "check", "--write", "."]);

run("pnpm", ["run", "setup"]);

console.log(`
✓ ${names.display} está listo. Lo que sigue:
  git add -A && git commit -m "Start ${names.display}"
  Cambia los colores de la marca en apps/web/app/app.css (brand.test.ts revisa el contraste)
  y escribe tu primera feature siguiendo AGENTS.md.
`);
