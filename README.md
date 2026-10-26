# Starter

<!-- template:start -->
## mono-template

Plantilla de monorepo para empezar proyectos con lo de siempre ya resuelto, sacada de Repitoo y
sin su lógica de negocio:

- **Web**: React Router 8 (framework mode) con Tailwind 4, tema claro/oscuro sin parpadeo, presupuesto de Lighthouse,
  mobile first, español e inglés.
- **Entrar**: enlace por correo, correo y contraseña (con confirmación y recuperación) y Google,
  con Better Auth. Eliges cuáles en el setup.
- **Espacios de trabajo** multi-tenant (`/app/:workspace`) con onboarding y ajustes.
- **API**: Fastify + Zod con OpenAPI, helmet y tareas programadas.
- **Datos**: Postgres con Drizzle ORM; correos con MJML (Mailpit en local).
- **Seguridad**: CSP con nonce, límites de intentos en Postgres, redirects seguros, secretos
  derivados.
- **Pruebas**: Vitest (unit, integration y Browser Mode) y Playwright (BDD en celular y
  escritorio, axe), con los agentes Planner, Generator y Healer.
- **Para agentes**: `AGENTS.md` con todas las reglas, la skill oficial de React Router, la de
  Playwright y `nueva-feature`.
- **Producción**: Docker + Fly.io, CI en GitHub Actions, `pnpm release`.

### Empezar un proyecto

Necesitas Node 22, pnpm (`corepack enable`) y Docker.

```bash
gh repo create mi-app --private --template raulgcode/mono-template --clone
cd mi-app
pnpm install
pnpm start project "Mi App"            # o: pnpm start project "Mi App" --domain miapp.com
```

`pnpm start project` cambia "Starter" por tu nombre en todo el repo (paquetes `@mi-app/*`, base
de datos, apps de Fly, dominio, textos), instala y corre `pnpm run setup`, que solo te pregunta
cómo entra la gente (enlace, contraseña, Google) y, con Google, su cliente OAuth. Lo demás es
automático: `.env` con sus secretos, Postgres y Mailpit en Docker, migraciones, hooks de git y
Chromium. Esta sección del README se borra sola.

Sin GitHub CLI: en GitHub, "Use this template" → "Create a new repository", clónalo y sigue desde
`pnpm install`.
<!-- template:end -->

## Empezar

```bash
corepack enable && pnpm install
pnpm run setup     # .env, secretos, métodos de login, Docker, migraciones, hooks, Chromium
pnpm dev           # web http://localhost:5173 · api http://localhost:3001
```

- Entra como cualquier usuario en http://localhost:5173/dev/sign-in (solo en `pnpm dev`).
- Los correos (enlaces para entrar, confirmaciones) llegan a Mailpit: http://localhost:8025.
- Cambiar cómo se entra: `pnpm run setup --auth magic-link,password,google`.

## Cómo se trabaja aquí

Todo está en [AGENTS.md](AGENTS.md): el mapa del monorepo, las reglas (CLI primero, React Router
con su skill, formularios con Conform + Zod, mobile first, pruebas, idiomas, seguridad) y los
comandos. Para una feature nueva, la skill [nueva-feature](.agents/skills/nueva-feature/SKILL.md).
Producción: [docs/deploy.md](docs/deploy.md).
