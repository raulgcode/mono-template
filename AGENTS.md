# Starter · guía para agentes y personas

Starter sale de la plantilla `mono-template`: un monorepo con lo de siempre ya resuelto (entrar
con Google, contraseña o enlace por correo, espacios de trabajo multi-tenant, idiomas, tema claro
y oscuro, correos, seguridad, pruebas y despliegue). Lo propio del proyecto se escribe encima,
siguiendo estas reglas. Si una regla no aplica, se cambia aquí primero y luego el código.

## Mapa del monorepo

| Ruta                 | Qué es                                                                  |
| -------------------- | ----------------------------------------------------------------------- |
| `apps/web`           | React Router 8 (framework mode): páginas, login, el espacio de trabajo  |
| `apps/api`           | Fastify + Zod: API pública, webhooks y tareas programadas               |
| `apps/e2e`           | Playwright: escenarios BDD en celular y escritorio, accesibilidad (axe) |
| `packages/core`      | Casos de uso multi-tenant. Toda la lógica de negocio vive aquí          |
| `packages/contracts` | Esquemas `zod/mini` compartidos por formularios, actions, API y core    |
| `packages/db`        | Drizzle: esquema, migraciones, cliente, utilidades de prueba            |
| `packages/auth`      | Better Auth: enlace por correo, contraseña, Google y organizaciones     |
| `packages/email`     | Nodemailer + MJML: correos con la marca, en claro y oscuro              |
| `packages/i18n`      | Idiomas (es, en): diccionarios tipados, `t()`, elección de idioma       |
| `packages/env`       | Validación de variables de entorno con Zod                              |
| `tooling/*`          | Scripts del repo: setup, release, secretos de Fly, e2e remoto           |

## Reglas

### Herramientas: siempre su CLI

**Si una herramienta tiene CLI, se usa su CLI.** Nada de crear a mano lo que el CLI genera, ni de
copiar una salida de memoria: el CLI sabe la versión exacta del repo.
- Rutas y archivos de React Router: `npx react-router reveal entry.server|entry.client`,
  `react-router typegen` (corre solo en `pnpm typecheck`). Proyectos nuevos: `create-react-router`.
- Base de datos: `pnpm db:generate` (drizzle-kit) para cada migración, `pnpm db:migrate`,
  `pnpm db:studio`. Nunca escribas una migración ni un `meta/` a mano.
- Tablas de Better Auth: `pnpm auth:generate` (CLI de Better Auth), nunca a mano.
- Componentes de UI: `pnpm dlx shadcn@latest add <componente>` desde `apps/web`
  (`components.json`), luego se ajustan a los tokens de la marca.
- Dependencias: `pnpm add <pkg> --filter <paquete>` (sin `@catalog:`, que corrompe el catálogo) y
  luego mueve la versión al `catalog` de `pnpm-workspace.yaml`; el `package.json` queda con
  `"catalog:"`. `pnpm-lock.yaml` lo escribe solo pnpm.
- Formato y lint: `pnpm format` y `pnpm lint` (Biome), nunca a mano.
- Playwright: `npx playwright cli …` (skill `playwright-cli`), `npx playwright init-agents`.
- Skills: `npx skills add <repo> --skill <nombre>`.

### React Router 8: la skill oficial manda

**Antes de escribir o revisar cualquier ruta, lee la skill `.agents/skills/react-router`**
(también en `.claude/skills`) y la documentación instalada en
`apps/web/node_modules/react-router/docs`, que es la de la versión exacta del repo. Si la skill
no está, instálala antes de seguir: `npx skills add https://github.com/remix-run/react-router
--skill react-router`; si faltan los docs, corre `pnpm install`. No agregues antipatrones que la
skill descarta.
- **Nunca uses `useEffect` para traer datos del servidor.** Lecturas con `loader`, escrituras con
  `action` (o `useFetcher`); la revalidación la hace React Router. `useEffect` queda solo para
  efectos del navegador, como mover el foco.
- Auth y tenant con `middleware` + `context` (`app/middleware/auth.server.ts`, `app/context.ts`).
- Tipos de `./+types/<ruta>`; URLs con `href()` tipado, nunca strings sueltos.
- `<Form>` cuando la mutación navega; `useFetcher` cuando la persona se queda en la página.
- Código de servidor en módulos `*.server.ts`; una ruta nueva se registra en `app/routes.ts`.

### Formularios: Conform + Zod, siempre

Todo formulario usa **Conform** (`@conform-to/react`, `@conform-to/zod/v4`) con un esquema de
`@starter/contracts`. El mismo esquema valida en el navegador (`onValidate` con `parseWithZod`) y
en la `action` (`parseWithZod`); los errores vuelven con `data({ result: submission.reply() },
{ status: 400 })`. Los inputs van con `TextField` (conecta label, descripción y errores con
`aria-*`). Los errores del esquema son claves de i18n (`message("forms.emailInvalid")`) que
`FieldErrors` traduce; la ruta carga `forms`. Nada de `useState` por campo ni validación a mano.
Ejemplos: `routes/sign-up.tsx`, `routes/app/onboarding.tsx`.

### Intuitiva y mobile first

Quien usa la app la usa desde el celular. Toda pantalla se diseña primero para el celular; el
escritorio es la versión ampliada, nunca al revés.
1. **Primero el celular.** Cada pantalla funciona desde 360 px de ancho, y cada escenario BDD
   corre en el proyecto `mobile` de Playwright, no solo en `desktop`.
2. **Una tarea, una pantalla, una acción principal.** El botón principal queda al alcance del
   pulgar y todo lo que se toca mide al menos 44 × 44 px. En el espacio, las secciones son la barra
   de abajo en el celular y el menú lateral desde 768 px (`AppShell`, una sección nueva es un item
   más).
3. **Nada depende de hover, teclado físico ni tablas anchas.** Lo que se desplaza de lado va en
   `<ScrollShadow>`; en el celular las tablas se vuelven listas.
4. **Hablar como habla la persona.** Palabras que diría en voz alta, nada de jerga técnica
   ("tenant", "organización") en la interfaz: en la app es "espacio".
5. **Valores por defecto que ya funcionan.** Una pantalla nueva arranca llena con lo habitual.
6. **Cada pantalla se entiende sola.** Si necesita un tutorial para usarse, se rediseña.

### Pruebas: toda feature entra con sus pruebas

Un cambio que agrega o cambia comportamiento sin pruebas no está terminado.
- **TDD** para lógica pura y servicios de `core`: escribe la prueba que falla, luego el código.
- **BDD** para flujos de usuario: un escenario `Feature / Scenario` con pasos `Given / When /
  Then` (`test.step`) en `apps/e2e/tests`. Sin Cucumber.
- UI exploratoria que todavía cambia mucho se prueba cuando se estabiliza, no antes.

| Proyecto      | Archivos                             | Para                                                        |
| ------------- | ------------------------------------ | ----------------------------------------------------------- |
| `unit`        | `*.test.ts`                          | Funciones puras, sin I/O                                    |
| `integration` | `*.integration.test.ts`              | Servicios contra Postgres y Mailpit reales                  |
| `browser`     | `apps/web/app/**/*.browser.test.tsx` | Componentes React en Chromium (Vitest Browser Mode)         |
| Playwright    | `apps/e2e/tests/*.spec.ts`           | Flujos completos, accesibilidad con axe, móvil y escritorio |

**No uses Jest ni jsdom.** Los componentes se prueban en un navegador real con
`vitest-browser-react`. Cada prueba de integración crea su propio espacio con
`createTestTenant` (`@starter/db/testing`); nunca compartas filas entre pruebas ni limpies tablas.

En Playwright (`apps/e2e/support/fixtures.ts`):
- `ownerTest` empieza con la sesión compartida del worker (un dueño con el espacio "Mi empresa")
  y su `workspace`; `test` + `signIn`/`signInWithWorkspace` es para login, onboarding o lo que
  cambie la cuenta (idioma, cerrar sesión), porque la sesión del worker es compartida.
- Lo que un escenario prepara en la base va por los casos de uso de `core` con
  `workspace.tenant` o `workspaceOf(page)`, sobre la conexión `db` del worker; nunca una conexión
  propia. Otro navegador (un compañero, otro celular) se abre con `newVisitor()`, sin sesión.
- Lo que se prepara y se limpia solo es un fixture; una pantalla que recorren 3 o más specs, un
  page object en `support/`; el resto, funciones (`navigation.ts` con `openSection`,
  `mailpit.ts` con `getLinkFromEmail`/`uniqueEmail`). El page object hace y el escenario verifica.
- Cada escenario prueba un comportamiento y lo dice en el título con su resultado ("crea su cuenta,
  confirma el correo y entra a crear su espacio", no "registro funciona"), y cada Then verifica el
  texto, número o estado exacto que ve la persona. Localizadores por rol, etiqueta o texto, en
  español. `pnpm lint` rechaza en `tests/` (`apps/e2e/lint/*.grit`) `waitForTimeout`,
  `networkidle`, `.only`, `force: true` y XPath.
- Toda página nueva entra en `tests/accessibility.spec.ts` (claro y oscuro).

Agentes de Playwright (`.claude/agents`, con el servidor MCP `playwright-test` de `.mcp.json`;
necesitan Postgres y Mailpit arriba): **Healer** repara una prueba que falla y nunca la salta ni
la afloja (si la app está mal, lo reporta); **Planner** recorre la app desde `tests/seed.spec.ts`
y escribe un plan en `apps/e2e/specs`; **Generator** convierte un plan en un spec, que se revisa
como cualquier código. La skill `playwright-cli` abre la app, saca snapshots y trazas.

### Rendimiento: presupuesto de Lighthouse

`apps/web/lighthouserc.json` define el presupuesto (score ≥ 0.95, FCP ≤ 2.2 s, LCP ≤ 2.5 s,
JS ≤ 170 KB transferidos por página, sin terceros). Si un cambio se pasa, **primero optimiza**
(dividir código, quitar dependencias, `zod/mini`, carga diferida). Solo sube un límite con una
justificación explícita. `pnpm --filter @starter/web lighthouse` audita claro, oscuro e inglés.

### Accesibilidad

Las páginas no deben tener violaciones de axe (WCAG 2.2 AA). Una sola `h1` por página
(`PageHeader`), formularios con `TextField`, avisos con `role="status"` o `role="alert"`.

### Marca y temas

- Colores solo por tokens (`bg-primary`, `text-muted-foreground`, …) definidos con
  `light-dark()` en `apps/web/app/app.css`. Un token nuevo de texto o fondo se agrega a los pares de
  `app/lib/brand.test.ts`, que verifica contraste AA en claro y oscuro. Para cambiar la marca,
  cambia `app.css` y `lib/brand.ts`; los correos toman los mismos colores (`packages/email/src/brand.ts`,
  y `brand.test.ts` revisa que coincidan).
- El tema (`system`/`light`/`dark`) vive en una cookie que lee el `loader` de `root.tsx`; el
  servidor pinta `data-theme` en `<html>`, así no hay parpadeo.
- Todo lo que se desplaza de lado va dentro de `<ScrollShadow>`. Nunca un `overflow-x-auto` suelto.
- Correos (`@starter/email`): **siempre MJML**, nunca HTML a mano ni otra librería. Cada plantilla
  es MJML (`@faire/mjml-react`) dentro de `<EmailLayout>`, en el idioma de quien lo recibe.

### Idiomas: toda feature entra en todos los idiomas a la vez

Dos idiomas (`locales` en `packages/i18n/src/locale.ts`): `es` (la fuente, de tú) y `en`. Un texto
visible (páginas, botones, `aria-label`, avisos, correos) sin su versión en cada idioma no está
terminado.
1. Cada texto vive en `packages/i18n/src/messages/{es,en}/<sección>.ts`; nada escrito a mano en el
   componente. `en` se declara con `satisfies Translation<typeof es>[…]`: una clave que falta
   rompe `typecheck`, y `messages.test.ts` revisa placeholders y etiquetas.
2. Los diccionarios **nunca llegan al bundle del cliente**: solo se importan desde `*.server.ts`.
   Cada `loader` devuelve sus secciones con `i18n: translations(context, "…")`; la raíz manda
   `common`. En el componente, `const t = useT()`; en `meta`, `metaT(matches)`; lo que arma el
   servidor, `serverT(context)`. Etiquetas con `richText(t, key, { link: (text) => … })`.
3. Los mensajes de `throw data(…)` y de `DomainError` solo los ve el desarrollador: van en inglés,
   sin clave.
4. El idioma lo decide `localeMiddleware`: cookie `lang` > `user.locale` > `Accept-Language` >
   inglés. Se cambia en Ajustes (`<LanguagePicker />`, POST a `/locale`).
5. Las pruebas usan los textos de la fuente (`es`). Rutas, parámetros, archivos y claves en inglés.
6. Otro idioma: agrégalo a `locales`, crea su carpeta en `messages/` y corre `pnpm typecheck`.

### Entrar: los métodos se eligen por proyecto

`AUTH_METHODS` (`.env`, lo pregunta `pnpm run setup`) enciende `magic-link`, `password` y
`google`, en cualquier combinación. `/login` muestra solo los encendidos (`lib/sign-in.server.ts`)
y las rutas de un método apagado responden 404 (`requireMethod`).
- **Enlace por correo**: Better Auth `magicLink`, token guardado con hash, 5 minutos.
- **Contraseña**: `/sign-up` exige confirmar el correo antes de entrar; `/forgot-password` y
  `/reset-password` la cambian y cierran las demás sesiones.
- **Google**: necesita `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (el servidor no arranca con
  `google` sin ellos). Un correo probado por Google, un enlace o una confirmación es la misma
  cuenta.
- Las acciones pasan por la API de servidor de Better Auth (`auth.api.*`) después de nuestros
  propios controles (límites, `safeRedirect`). Los endpoints que no usamos por HTTP van en
  `disabledOrganizationPaths`.
- `/dev/sign-in` entra como cualquier usuario en `pnpm dev`. Tres candados lo dejan fuera de
  producción: `routes.ts` no registra la ruta en el build, `devSignIn` solo se enciende con
  `import.meta.env.DEV` y `requireDevTools` exige localhost.

### Multi-tenant

Todo caso de uso de `core` recibe un `TenantContext` y filtra por `organizationId`.
- El espacio va en la URL (`/app/:workspace/…`) y `requireTenant` lo resuelve con
  `resolveTenant`, que verifica la membresía; nunca tomes el espacio de la sesión ni de un campo
  del formulario. Un espacio ajeno responde 404, igual que uno inexistente.
- La sesión solo recuerda el último espacio usado, para que `/app` y el próximo login lo abran.
- Las únicas entradas sin tenant son las públicas, y cada una se justifica aquí.
- Una sección nueva del espacio: `routes/app/<sección>.tsx` bajo `:workspace` en `routes.ts`, su
  item en `AppShell`, su namespace de i18n, su caso de uso en `core` con prueba de integración
  (incluido que otro espacio no ve sus datos), su escenario BDD y su línea en
  `accessibility.spec.ts`.

### Seguridad

- Límites de intentos con `hitRateLimit` (`core/src/rate-limits.ts`): un upsert en Postgres
  (`rate_limit`), así valen en todas las máquinas. En la web, `withinRateLimits` y las reglas de
  `app/lib/rate-limit.server.ts`; el limitador de Better Auth guarda ahí también. **Toda acción
  que manda un correo a una dirección escrita por alguien lleva su límite.** La IP sale de
  `CLIENT_IP_HEADER`; nunca de `X-Forwarded-For` sin un proxy que lo limpie.
  `AUTH_RATE_LIMIT=off` (solo e2e) los apaga.
- `securityMiddleware` (primero en `root.tsx`) pone CSP con nonce (`entry.server.tsx` lo pasa a
  `ServerRouter`), `X-Frame-Options`, HSTS sobre HTTPS y rechaza cuerpos chunked (411) o de más de
  6 MB (413). Nada de scripts en línea ni de terceros: si algo nuevo necesita otro origen, se
  agrega a la política con su razón.
- Redirects con `safeRedirect` (`app/lib/safe-redirect.ts`), nunca a mano.
- Secretos: cada uso tiene su llave derivada de `BETTER_AUTH_SECRET` con `deriveSecret`
  (`secrets` en `services.server.ts`); fuera de localhost se rechaza el valor de `.env.example`.
- `allowedActionOrigins` (`app/lib/action-origins.ts`) lleva el host de producción, para el
  chequeo de CSRF de React Router detrás del proxy de Fly.
- `pnpm audit --prod --audit-level high` corre en CI; un aviso aceptado va a `auditConfig` de
  `pnpm-workspace.yaml` con su razón.

### Base de datos

Cambia el esquema en `packages/db/src/schema`, luego `pnpm db:generate` y `pnpm db:migrate`.
Nunca `drizzle-kit push` contra producción. Cada migración debe ser compatible con la versión
anterior de la app (los despliegues no deshacen migraciones).

### Variables de entorno

Toda variable nueva va en `.env.example` con un comentario de qué es y en el esquema de
`packages/env`. Si es un secreto local, agrega su generador en `tooling/setup/index.ts` para que
`pnpm run setup` lo cree solo; si solo existe en local, en `localOnly` de
`tooling/fly-secrets/secrets.ts`. Una URL pública nueva va en `[env]` de los dos `fly.*.toml`.

## Flujo de trabajo

- **Toda rama que se va a integrar a `main` tiene antes lo último de `main`**: `git fetch origin
  main` y `git merge origin/main` (resuelve conflictos, regenera con su CLI lo generado, como una
  migración que choca de número), corre lint, typecheck y pruebas, sube y espera el CI en verde.
- CI (`.github/workflows/ci.yml`): cada push corre `pnpm lint`, `pnpm typecheck` y `pnpm test`
  (unit, integration con Postgres y Mailpit, browser).
- Los e2e (`.github/workflows/e2e.yml`) corren a pedido: `pnpm e2e:remote [rama] [--project
  desktop|mobile] [--grep "texto"]` (necesita `gh auth login`), o desde Actions. Córrelos antes de
  integrar un cambio que toca flujos. En local: `pnpm test:e2e`.
- Producción en Fly.io (`docs/deploy.md`): `pnpm release [patch|minor|major|x.y.z]` crea el tag y
  `.github/workflows/deploy.yml` despliega la API (con migraciones) y luego la web. Secretos con
  `pnpm fly:secrets` desde `.env.production` (nunca en git).
- El hook de pre-commit (Lefthook) solo formatea con Biome.
- Una feature nueva sigue la skill `nueva-feature` (`.agents/skills/nueva-feature`).

## Comandos

```bash
corepack enable && pnpm install
pnpm run setup           # .env, secretos, métodos de login, hooks, Chromium, Docker, migraciones
pnpm dev                 # web :5173, api :3001 · /dev/sign-in para entrar como cualquiera
pnpm test                # Vitest: unit + integration + browser
pnpm test:e2e            # Playwright en local
pnpm e2e:remote [rama]   # Playwright en GitHub Actions
pnpm typecheck && pnpm lint
pnpm db:generate && pnpm db:migrate   # después de cambiar el esquema
pnpm release [patch|minor|major|x.y.z]  # publica main en producción (tag → Fly.io)
pnpm fly:secrets [--check]  # manda .env.production a los secretos de Fly
pnpm --filter @starter/web lighthouse
```
