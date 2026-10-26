/**
 * Which variables of a production .env become Fly secrets, and what would break production.
 * The URLs, the IP header and NODE_ENV live in fly.*.toml; the rest are local tools.
 */
export const setInFlyToml = ["NODE_ENV", "PORT", "APP_URL", "API_URL", "CLIENT_IP_HEADER"];

const localOnly = ["TEST_DATABASE_URL", "MAILPIT_URL"];

export interface SecretsPlan {
  /** What goes to `fly secrets set`, the same on the web and the API. */
  secrets: Record<string, string>;
  /** Variables left out on purpose, with the reason. */
  skipped: { key: string; reason: string }[];
  /** Mistakes that would break production: nothing is sent while there is one. */
  problems: string[];
}

function isLocalHost(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname);
  } catch {
    return false;
  }
}

export function planSecrets(
  env: Record<string, string>,
  options: { localAuthSecret?: string } = {},
): SecretsPlan {
  const secrets: Record<string, string> = {};
  const skipped: SecretsPlan["skipped"] = [];
  const problems: string[] = [];

  for (const [key, raw] of Object.entries(env)) {
    const value = raw.trim();
    if (setInFlyToml.includes(key))
      skipped.push({ key, reason: "va en fly.web.toml y fly.api.toml" });
    else if (localOnly.includes(key)) skipped.push({ key, reason: "solo en tu máquina" });
    else if (value === "") skipped.push({ key, reason: "vacía" });
    else secrets[key] = value;
  }

  const database = secrets.DATABASE_URL;
  if (!database) problems.push("Falta DATABASE_URL: la URL directa de Fly Managed Postgres");
  else if (isLocalHost(database)) {
    problems.push("DATABASE_URL apunta a tu máquina: pon la URL directa de Fly Managed Postgres");
  }

  const authSecret = secrets.BETTER_AUTH_SECRET ?? "";
  if (authSecret.length < 32 || authSecret.startsWith("change-me")) {
    problems.push("BETTER_AUTH_SECRET falta o es corto: genera uno con openssl rand -base64 32");
  } else if (authSecret === options.localAuthSecret) {
    problems.push("BETTER_AUTH_SECRET es el mismo de tu .env de desarrollo: genera uno nuevo");
  }

  const smtp = secrets.SMTP_HOST;
  if (!smtp || smtp === "localhost" || smtp === "127.0.0.1" || secrets.SMTP_PORT === "1025") {
    problems.push("SMTP_* es el Mailpit local: pon el servidor de correo de producción");
  }
  if (!secrets.EMAIL_FROM)
    problems.push("Falta EMAIL_FROM (por ejemplo Starter <support@starter.example>)");

  if (secrets.AUTH_RATE_LIMIT === "off") {
    problems.push("AUTH_RATE_LIMIT=off es solo para los e2e: quítalo");
  }

  return { secrets, skipped, problems };
}
