import type { Page } from "@playwright/test";
import { expect, ownerTest, test } from "../support/fixtures";
import { openSection } from "../support/navigation";

/** CSP violations the browser reports while the page loads and hydrates. */
function cspViolations(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
  });
  return violations;
}

test.describe("Feature: la app se protege en el navegador", () => {
  test("Scenario: la portada y el login llegan con sus cabeceras y sin scripts ajenos", async ({
    page,
  }) => {
    const violations = cspViolations(page);

    for (const path of ["/", "/login"]) {
      await test.step(`When someone opens ${path}`, async () => {
        const response = await page.goto(path);
        const headers = response?.headers() ?? {};

        expect(headers["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+'/);
        expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
        expect(headers["x-frame-options"]).toBe("DENY");
        expect(headers["x-content-type-options"]).toBe("nosniff");
      });
    }

    await test.step("Then the page works (it hydrated) and broke no rule", async () => {
      await page.getByLabel("Correo electrónico").fill("no-es-correo");
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await expect(page.getByText("Escribe un correo válido")).toBeVisible();
      expect(violations).toEqual([]);
    });
  });

  test("Scenario: un redirect que intenta salir del sitio se queda en casa", async ({ page }) => {
    const response = await page.request.post("/theme", {
      form: { theme: "dark", redirectTo: "/\\evil.example" },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(302);
    expect(response.headers().location).toBe("/");
  });

  test("Scenario: /dev/sign-in no existe en el build de producción", async ({ page }) => {
    const response = await page.goto("/dev/sign-in");
    expect(response?.status()).toBe(404);
  });

  ownerTest(
    "Scenario: el espacio se carga sin violar la política de contenido",
    async ({ page, workspace }) => {
      const violations = cspViolations(page);

      await test.step("When the owner opens the workspace and moves around", async () => {
        await page.goto(`/app/${workspace.slug}`);
        await openSection(page, "Ajustes");
      });

      await test.step("Then nothing was blocked", async () => {
        expect(violations).toEqual([]);
      });
    },
  );
});
