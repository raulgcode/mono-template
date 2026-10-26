import type { AuthSession } from "@starter/auth";
import type { TenantContext } from "@starter/core";
import { defaultLocale, type Locale } from "@starter/i18n";
import { createContext } from "react-router";

/** Set by `requireSession` for every route under /app. */
export const sessionContext = createContext<AuthSession>();

/** Set by `requireTenant`: the workspace in the URL, ready to pass to @starter/core. */
export const tenantContext = createContext<TenantContext>();

/** Set by `localeMiddleware` in root.tsx (and by `requireSession` from the account): the page's language. */
export const localeContext = createContext<Locale>(defaultLocale);

/** Set by `securityMiddleware`: the nonce of this page's inline scripts (see entry.server.tsx). */
export const nonceContext = createContext<string>("");
