import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import type { Theme } from "~/lib/theme";
import { translatedRoot } from "~/test/i18n";
import { ThemeToggle } from "./theme-toggle";

function renderToggle(theme: Theme, locale: "es" | "en" = "es") {
  let saved: FormData | undefined;
  const Stub = createRoutesStub([
    {
      id: "root",
      path: "/",
      loader: () => translatedRoot(locale, { theme }),
      HydrateFallback: () => null,
      children: [
        { index: true, Component: () => <ThemeToggle /> },
        {
          path: "theme",
          action: async ({ request }) => {
            saved = await request.formData();
            return null;
          },
        },
      ],
    },
  ]);
  return { screen: render(<Stub />), saved: () => saved };
}

describe("ThemeToggle", () => {
  it.each([
    ["system", "Tema: Sistema. Cambiar a claro"],
    ["light", "Tema: Claro. Cambiar a oscuro"],
    ["dark", "Tema: Oscuro. Cambiar a sistema"],
  ] as const)("con tema %s dice a cuál cambia", async (theme, name) => {
    const { screen } = renderToggle(theme);
    await expect.element((await screen).getByRole("button", { name })).toBeVisible();
  });

  it("se lee en inglés cuando la página está en inglés", async () => {
    const { screen } = renderToggle("dark", "en");
    const name = "Theme: Dark. Switch to system";
    await expect.element((await screen).getByRole("button", { name })).toBeVisible();
  });

  it("envía el siguiente tema y la página actual", async () => {
    const { screen, saved } = renderToggle("light");
    await (await screen).getByRole("button").click();

    await expect.poll(() => saved()?.get("theme")).toBe("dark");
    expect(saved()?.get("redirectTo")).toBe("/");
  });
});
