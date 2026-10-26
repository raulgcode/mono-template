import type { Translation } from "../../translate";
import type { es } from "../es";

export const home = {
  title: "Starter",
  description: "Your new project, ready to grow.",
  heading: "Your project already works",
  intro:
    "Sign-in, languages, light and dark themes, tests and deploys come ready. Start with your first screen.",
  signIn: "Sign in",
  openApp: "Open the app",
} as const satisfies Translation<typeof es>["home"];
