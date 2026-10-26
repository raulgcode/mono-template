import type { Locale } from "@starter/i18n";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { translatedRoot } from "~/test/i18n";
import { LanguagePicker } from "./language-picker";

function renderPicker(locale: Locale) {
  let saved: FormData | undefined;
  const Stub = createRoutesStub([
    {
      id: "root",
      path: "/",
      loader: () => translatedRoot(locale),
      HydrateFallback: () => null,
      children: [
        { path: "app/:workspace/settings", Component: () => <LanguagePicker /> },
        {
          path: "locale",
          action: async ({ request }) => {
            saved = await request.formData();
            return null;
          },
        },
      ],
    },
  ]);
  const screen = render(<Stub initialEntries={["/app/acme-x1/settings?tab=1"]} />);
  return { screen, saved: () => saved };
}

describe("LanguagePicker", () => {
  it.each([
    ["es", "Idioma"],
    ["en", "Language"],
  ] as const)(
    "en %s marca el idioma actual y nombra cada uno en sí mismo",
    async (locale, legend) => {
      const screen = await renderPicker(locale).screen;
      const group = screen.getByRole("group", { name: legend });
      await expect
        .element(group.getByRole("radio", { checked: true }))
        .toHaveAttribute("value", locale);
      for (const [name, lang] of [
        ["Español", "es"],
        ["English", "en"],
      ] as const) {
        await expect.element(group.getByText(name, { exact: true })).toHaveAttribute("lang", lang);
      }
    },
  );

  it("guarda el idioma al elegirlo y vuelve a la misma página", async () => {
    const { screen, saved } = renderPicker("es");
    await (await screen).getByRole("radio", { name: "English" }).click();

    await expect.poll(() => saved()?.get("locale")).toBe("en");
    expect(saved()?.get("redirectTo")).toBe("/app/acme-x1/settings?tab=1");
  });
});
