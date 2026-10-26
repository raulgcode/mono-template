# Producción en Fly.io

Starter corre en Fly.io como dos apps hechas de la misma imagen (`Dockerfile`), más la base de
datos:

| Qué                  | Dónde                                                   | Config         |
| -------------------- | ------------------------------------------------------- | -------------- |
| `starter-web`        | `app.starter.example`: páginas, login, el espacio       | `fly.web.toml` |
| `starter-api`        | `api.starter.example`: API pública y tareas programadas | `fly.api.toml` |
| Fly Managed Postgres | `starter-db`, misma región que las apps (`iad`)         | —              |

Las URLs públicas (`APP_URL`, `API_URL`) y `CLIENT_IP_HEADER` están en `[env]` de cada
`fly.*.toml`; todo lo demás va como secreto, igual en las dos apps.

## Una sola vez

### 1. Fly

```bash
brew install flyctl
fly auth login
fly apps create starter-api
fly apps create starter-web
```

Si un nombre ya está tomado, elige otro y cámbialo en `app = "…"` del `fly.*.toml` y en
`APPS` de `tooling/fly-secrets/index.ts`.

### 2. Base de datos

```bash
fly mpg create --name starter-db --region iad --plan basic
```

En el dashboard de Fly → Managed Postgres → `starter-db` → Connection, copia la URL **directa**
(`…@direct.<id>.flympg.net/…`). Si `iad` no está disponible, usa otra región cercana
(`fly platform regions`) y pon la misma en `primary_region` de los dos `fly.*.toml`.

### 3. Secretos

Arma `.env.production` desde tu `.env` (queda fuera de git por `.gitignore`) y cambia lo que es
de desarrollo:

| Variable               | En producción                                                                     |
| ---------------------- | --------------------------------------------------------------------------------- |
| `DATABASE_URL`         | La URL directa del paso 2                                                         |
| `BETTER_AUTH_SECRET`   | Uno nuevo: `openssl rand -base64 32`. Cambiarlo después cierra todas las sesiones |
| `AUTH_METHODS`         | Los mismos de tu `.env` (o los que quieras en producción)                         |
| `SMTP_*`, `EMAIL_FROM` | Tu proveedor de correo (Resend, Postmark, SES…), con el dominio verificado        |
| `GOOGLE_*`             | Solo con `google`: el mismo cliente OAuth que en local                            |

Con Google, agrega al cliente OAuth el redirect URI
`https://app.starter.example/api/auth/callback/google`.

Revisa y manda:

```bash
pnpm fly:secrets --check   # dice qué falta o sigue apuntando a tu máquina
pnpm fly:secrets           # los manda a starter-api y starter-web
```

El script no manda nada mientras haya un problema (localhost, Mailpit, el mismo
`BETTER_AUTH_SECRET` de desarrollo) y deja fuera lo que va en `fly.*.toml` y lo que es solo
local (`TEST_DATABASE_URL`, `MAILPIT_URL`). Los secretos entran con el próximo despliegue.

### 4. GitHub Actions

Un token de despliegue por app, guardado como secreto del repo:

```bash
gh secret set FLY_API_TOKEN_API --body "$(fly tokens create deploy -a starter-api -x 8760h)"
gh secret set FLY_API_TOKEN_WEB --body "$(fly tokens create deploy -a starter-web -x 8760h)"
```

Sin `gh`: GitHub → Settings → Secrets and variables → Actions → New repository secret, con el
texto completo que imprime `fly tokens create deploy …` (empieza con `FlyV1 `). Vencen en un
año: repite estos dos comandos antes.

### 5. Primer despliegue

```bash
git checkout main && git pull
pnpm release 1.0.0
```

Sigue en Actions → Deploy. La primera vez Fly crea las máquinas y les da IPs.

### 6. Dominios

```bash
fly certs add app.starter.example -a starter-web
fly certs add api.starter.example -a starter-api
```

En tu DNS: `CNAME` de `app` → `starter-web.fly.dev` y de `api` → `starter-api.fly.dev`. Si el DNS
está en Cloudflare, déjalos en **DNS only** (nube gris): Fly emite el certificado y
`Fly-Client-IP` sigue siendo la IP real del cliente para los límites de intentos.
`fly certs check <dominio> -a <app>` dice cuándo está listo.

### 7. Revisar

- `curl https://api.starter.example/health` → `{"status":"ok","database":"ok"}`
- `https://app.starter.example/login` muestra los métodos de `AUTH_METHODS` y el correo llega.

## Cada versión

```bash
pnpm release          # 1.4.2 → 1.4.3
pnpm release minor    # 1.4.2 → 1.5.0
pnpm release major    # 1.4.2 → 2.0.0
pnpm release 2.1.0    # una exacta, mayor que la última
```

Exige estar en `main`, sin cambios y al día con GitHub; pregunta antes de publicar (`--yes` lo
salta) y, con `gh`, sigue el despliegue hasta el final. Sin terminal: Actions → Deploy → Run
workflow, con la versión (`patch` por defecto).

Lo que hace `.github/workflows/deploy.yml` con el tag `vX.Y.Z`:
1. Espera el CI de ese commit (lint, typecheck y Vitest) y se detiene si falla.
2. Despliega `starter-api`. Antes de arrancarla, `release_command` corre las migraciones; si
   fallan, no se despliega nada y sigue la versión anterior.
3. Despliega `starter-web`.

## Operar

```bash
fly logs -a starter-api                     # o starter-web
fly status -a starter-web
fly ssh console -a starter-api              # una terminal en la máquina (cd /app)
fly secrets list -a starter-api
fly secrets deploy -a starter-api           # aplica secretos sin esperar a un release
```

- **Volver a una versión**: `fly deploy --config fly.web.toml --image
  registry.fly.io/starter-web:v1.4.2` (igual con la API). Las migraciones no se deshacen: cada
  migración debe ser compatible con la versión anterior.
- **Más máquinas**: la web escala con `fly scale count 2 -a starter-web`. La API se queda en una:
  las tareas programadas corren en su proceso.
