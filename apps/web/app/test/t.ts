// For unit tests only: `t` with every text of a language, like the server's `serverT`.
import { createTranslator, type Locale } from "@starter/i18n";
import { dictionaries, type Messages } from "@starter/i18n/messages";
import type { T } from "../lib/i18n";

export const testT = (locale: Locale = "es"): T =>
  createTranslator<Messages>(locale, dictionaries[locale]);
