---
name: nueva-feature
description: Pasos para agregar una feature o sección nueva a este monorepo (core, contrato, ruta de React Router, formulario con Conform + Zod, i18n, pruebas unit/integration/browser y escenario BDD de Playwright). Úsala al empezar cualquier feature, pantalla, formulario o caso de uso nuevo.
---

# Nueva feature

Las reglas viven en `AGENTS.md`; esta es la lista para no saltarse ninguna. Ve en orden y marca
cada paso. Ejemplo completo en el repo: el espacio de trabajo (`createWorkspaceSchema`,
`core/src/workspaces.ts`, `routes/app/onboarding.tsx`, `apps/e2e/tests/workspace.spec.ts`).

## 0. Antes de escribir

- Lee la skill `react-router` (`.agents/skills/react-router`) y los docs de
  `apps/web/node_modules/react-router/docs` para lo que vas a usar.
- Decide qué ve la persona en el celular (360 px): una tarea, una acción principal abajo.
- Lo que tenga CLI se hace con su CLI (migraciones, tablas de auth, componentes de shadcn).

## 1. Datos (si hacen falta)

1. Tabla en `packages/db/src/schema/<tema>.ts`, con `organizationId` si es de un espacio, y
   exportada en `schema/index.ts`.
2. `pnpm db:generate` (le pone nombre: `pnpm --filter @starter/db generate --name <qué>`) y
   `pnpm db:migrate`. Nunca escribas la migración a mano.

## 2. Contrato

Esquema `zod/mini` en `packages/contracts/src/<tema>.ts` (exportado en `index.ts`), con errores
como claves: `message("forms.<clave>")`. Prueba unitaria `<tema>.test.ts` con lo válido y lo que
se rechaza.

## 3. Caso de uso (TDD)

1. Primero `packages/core/src/<tema>.integration.test.ts`: cada prueba crea su espacio con
   `createTestTenant`. Incluye que **otro espacio no ve ni toca** estos datos.
2. Luego `packages/core/src/<tema>.ts`: cada función recibe `TenantContext` y filtra por
   `ctx.organizationId`. Errores para el desarrollador con `DomainError`/`NotFoundError` (en
   inglés). Exporta desde `core/src/index.ts`.
3. Lógica pura aparte, con su `*.test.ts`.

## 4. Textos

`packages/i18n/src/messages/es/<sección>.ts` (fuente, de tú) y `en/<sección>.ts`
(`satisfies Translation<typeof es>["<sección>"]`); regístralos en `messages/index.ts` de cada
idioma. Errores de formulario en `forms`. Nada escrito en el componente.

## 5. Ruta

1. Regístrala en `apps/web/app/routes.ts` (bajo `:workspace` si es del espacio) y corre
   `pnpm --filter @starter/web typecheck` para tener `./+types/<ruta>`.
2. `loader`: lee con el caso de uso usando `context.get(tenantContext)`; devuelve
   `i18n: translations(context, "<sección>", "forms")`.
3. `action`: `parseWithZod(await request.formData(), { schema })`; si falla,
   `data({ result: submission.reply() }, { status: 400 })`; si sale bien, el caso de uso y
   `redirect(href(...))` o `data(...)`. Un correo a una dirección escrita lleva su límite
   (`withinRateLimits`).
4. Componente: `useForm` de Conform con `onValidate` y el mismo esquema, `TextField` para cada
   campo, `<Form>` si navega o `useFetcher` si se queda. `useT()` para los textos, `href()` para
   las URLs, `PageHeader` con la única `h1`. Nada de `useEffect` para datos.
5. Si es una sección del espacio, su item en `components/app-shell.tsx`.
6. Colores solo con tokens; un token nuevo va a `lib/brand.test.ts`.

## 6. Pruebas de la interfaz

- Componente con lógica propia: `*.browser.test.tsx` con `vitest-browser-react`.
- Flujo: `apps/e2e/tests/<feature>.spec.ts` con `test.describe("Feature: …")`, escenarios
  `ownerTest("Scenario: <comportamiento y resultado>")` y pasos `test.step("Given/When/Then …")`.
  Then verifica el texto exacto. Prepara datos con `workspace.tenant` y `core`, nunca SQL.
- La página nueva en `apps/e2e/tests/accessibility.spec.ts`.

## 7. Cerrar

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm test
pnpm test:e2e            # o pnpm e2e:remote <rama>, en desktop y mobile
```

Revisa la página en español y en inglés (Ajustes → Idioma) y en claro y oscuro. Si la feature
agrega una regla que otros deben seguir (una entrada sin tenant, una variable, un límite),
escríbela en `AGENTS.md`.
