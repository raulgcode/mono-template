import type { Translation } from "../../translate";
import type { es } from "../es";
import { auth } from "./auth";
import { common } from "./common";
import { email } from "./email";
import { forms } from "./forms";
import { home } from "./home";
import { settings } from "./settings";
import { workspace } from "./workspace";

export const en = {
  auth,
  common,
  email,
  forms,
  home,
  settings,
  workspace,
} as const satisfies Translation<typeof es>;
