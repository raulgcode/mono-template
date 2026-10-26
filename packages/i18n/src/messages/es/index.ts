import { auth } from "./auth";
import { common } from "./common";
import { email } from "./email";
import { forms } from "./forms";
import { home } from "./home";
import { settings } from "./settings";
import { workspace } from "./workspace";

/** The source language. A new namespace is added here and in `en/index.ts`. */
export const es = {
  auth,
  common,
  email,
  forms,
  home,
  settings,
  workspace,
} as const;
