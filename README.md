# Starter

<!-- template:start -->
## mono-template

A monorepo template to start projects with the usual things already solved, extracted from
Repitoo without its business logic:

- **Web**: React Router 8 (framework mode) with Tailwind 4, light/dark theme without flicker,
  a Lighthouse budget, mobile first, English and Spanish.
- **Sign-in**: email link, email and password (with confirmation and recovery) and Google, with
  Better Auth. You pick which ones during setup.
- **Multi-tenant workspaces** (`/app/:workspace`) with onboarding and settings.
- **API**: Fastify + Zod with OpenAPI, helmet and scheduled jobs.
- **Data**: Postgres with Drizzle ORM; MJML emails (Mailpit locally).
- **Security**: CSP with a nonce, rate limits in Postgres, safe redirects, derived secrets.
- **Tests**: Vitest (unit, integration and Browser Mode) and Playwright (BDD on phone and
  desktop, axe), with the Planner, Generator and Healer agents.
- **For agents**: `AGENTS.md` with every rule, React Router's official skill, Playwright's and
  `new-feature`.
- **Production**: Docker + Fly.io, CI on GitHub Actions, `pnpm release`.

### Start a project

You need Node 22, pnpm (`corepack enable`) and Docker.

```bash
gh repo create my-app --private --template raulgcode/mono-template --clone
cd my-app
pnpm install
pnpm start project "My App"            # or: pnpm start project "My App" --domain myapp.com
```

`pnpm start project` replaces "Starter" with your name across the repo (packages `@my-app/*`,
database, Fly apps, domain, texts), installs and runs `pnpm run setup`, which only asks how
people sign in (link, password, Google) and, with Google, its OAuth client. Everything else is
automatic: `.env` with its secrets, Postgres and Mailpit in Docker, migrations, git hooks and
Chromium. This README section deletes itself.

Without the GitHub CLI: on GitHub, "Use this template" → "Create a new repository", clone it and
continue from `pnpm install`.
<!-- template:end -->

## Getting started

```bash
corepack enable && pnpm install
pnpm run setup     # .env, secrets, sign-in methods, Docker, migrations, hooks, Chromium
pnpm dev           # web http://localhost:5173 · api http://localhost:3001
```

- Sign in as any user at http://localhost:5173/dev/sign-in (only in `pnpm dev`).
- Emails (sign-in links, confirmations) land in Mailpit: http://localhost:8025.
- Change how people sign in: `pnpm run setup --auth magic-link,password,google`.

## How we work here

Everything is in [AGENTS.md](AGENTS.md): the monorepo map, the rules (CLI first, React Router
with its skill, forms with Conform + Zod, mobile first, tests, languages, security) and the
commands. For a new feature, the [new-feature](.agents/skills/new-feature/SKILL.md) skill.
Production: [docs/deploy.md](docs/deploy.md).
