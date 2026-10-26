import { expect, ownerTest, test } from "../support/fixtures";

const schemes = ["light", "dark"] as const;
// Public pages, before signing in.
const publicPages = ["/", "/login", "/login?with=link", "/sign-up", "/forgot-password"];
// Sections inside the workspace, after /app/:workspace. A new section goes here.
const workspaceSections = ["", "/settings"];

test.describe("Feature: accesibilidad (axe, WCAG 2.2 AA)", () => {
  for (const colorScheme of schemes) {
    test.describe(`tema ${colorScheme === "light" ? "claro" : "oscuro"}`, () => {
      test.use({ colorScheme });

      for (const path of publicPages) {
        test(`Scenario: ${path} no tiene violaciones`, async ({ page, expectAccessible }) => {
          await page.goto(path);
          await expectAccessible(page);
        });
      }

      ownerTest(
        "Scenario: las secciones del espacio no tienen violaciones",
        async ({ page, workspace, expectAccessible }) => {
          for (const section of workspaceSections) {
            await page.goto(`/app/${workspace.slug}${section}`);
            await expectAccessible(page);
          }
        },
      );
    });
  }

  test("Scenario: los errores de un formulario tampoco tienen violaciones", async ({
    page,
    expectAccessible,
  }) => {
    await page.goto("/sign-up");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByText("Escribe tu nombre")).toBeVisible();
    await expectAccessible(page);
  });
});
