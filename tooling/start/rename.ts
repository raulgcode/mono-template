/**
 * Turns the template ("Starter", `@starter/*`, starter.example) into a project. Pure, so it is
 * tested on its own; index.ts walks the files and runs it on each one.
 */

/** What the template calls itself, and so what `pnpm start project` looks for. */
export const template = { slug: "starter", display: "Starter", domain: "starter.example" };

export interface ProjectNames {
  /** Package scope, Fly apps, cookies: `mi-app`. */
  slug: string;
  /** Postgres user and databases, which take no hyphens: `mi_app`. */
  ident: string;
  /** What people read: `Mi App`. */
  display: string;
  /** Where it runs in production: `mi-app.com` (app. and api. hang from it). */
  domain: string;
}

/** `Mi App` → slug `mi-app`, ident `mi_app`, display as typed, domain `mi-app.com`. */
export function projectNames(name: string, domain?: string): ProjectNames {
  const display = name.trim().replace(/\s+/g, " ");
  const slug = display
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!/^[a-z][a-z0-9-]{1,38}$/.test(slug)) {
    throw new Error(
      `"${name}" no sirve como nombre: usa de 2 a 39 letras o números y empieza con una letra.`,
    );
  }
  if (slug === template.slug) throw new Error(`El proyecto no puede llamarse "${template.slug}".`);
  const host = (domain ?? `${slug}.com`).trim().toLowerCase();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) {
    throw new Error(`"${domain}" no es un dominio (por ejemplo mi-app.com).`);
  }
  return { slug, ident: slug.replace(/-/g, "_"), display, domain: host };
}

// Lines about Postgres name its user and databases, where a hyphen isn't allowed.
const databaseLine = /postgres|pg_isready|psql|create database|_test\b/i;

/** Renames one file's text. Order matters: the most specific names go first. */
export function renameText(text: string, names: ProjectNames): string {
  return text
    .split("\n")
    .map((line) => {
      const renamed = line
        .replaceAll(template.domain, names.domain)
        .replaceAll(`@${template.slug}/`, `@${names.slug}/`)
        .replaceAll(template.display, names.display)
        .replaceAll(template.slug.toUpperCase(), names.ident.toUpperCase());
      return renamed.replaceAll(template.slug, databaseLine.test(line) ? names.ident : names.slug);
    })
    .join("\n");
}
