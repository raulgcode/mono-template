import { createWorkspace, expect, ownerTest, test } from "../support/fixtures";
import { openSection } from "../support/navigation";

test.describe("Feature: el espacio de trabajo", () => {
  test("Scenario: quien entra por primera vez crea su espacio y llega a su inicio", async ({
    page,
    signIn,
  }) => {
    await test.step("Given someone who just signed in", async () => {
      await signIn(page);
    });

    await test.step("When they name their workspace", async () => {
      await createWorkspace(page, "Café Luna");
    });

    await test.step("Then its home greets them in that workspace", async () => {
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Hola, /);
      await expect(page.getByText("Este es el inicio de Café Luna.")).toBeVisible();
    });
  });

  test("Scenario: un nombre de una letra no crea el espacio y dice por qué", async ({
    page,
    signIn,
  }) => {
    await signIn(page);
    await page.getByLabel("Nombre del espacio").fill("A");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("El nombre debe tener al menos 2 caracteres")).toBeVisible();
    await expect(page).toHaveURL(/\/app\/onboarding$/);
  });

  ownerTest("Scenario: /app abre el espacio que usó la última vez", async ({ page, workspace }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(new RegExp(`/app/${workspace.slug}$`));
  });

  ownerTest(
    "Scenario: el espacio de otra persona responde que no existe",
    async ({ page, newVisitor, signInWithWorkspace }) => {
      const other = await test.step("Given someone else's workspace", async () => {
        const visitor = await newVisitor();
        await signInWithWorkspace(visitor, "Ajeno");
        return visitor.url();
      });

      await test.step("When the owner opens its address", async () => {
        const response = await page.goto(other);
        expect(response?.status()).toBe(404);
      });

      await test.step("Then the page says it was not found", async () => {
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          "No encontramos esta página",
        );
      });
    },
  );

  // Its own account: the language is saved on the account too, and the worker's owner is shared.
  test("Scenario: cambia el idioma a inglés en Ajustes", async ({ page, signInWithWorkspace }) => {
    await test.step("Given an owner on their settings", async () => {
      await signInWithWorkspace(page);
      await openSection(page, "Ajustes");
    });

    await test.step("When they pick English", async () => {
      await page.getByRole("radio", { name: "English" }).check();
    });

    await test.step("Then the app answers in English", async () => {
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Settings");
    });
  });

  // Its own account: signing out ends the session that the worker's `ownerTest`s share.
  test("Scenario: cierra sesión y /app vuelve a pedir entrar", async ({
    page,
    signInWithWorkspace,
  }) => {
    await signInWithWorkspace(page);
    await openSection(page, "Ajustes");
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fapp$/);
  });
});
