import { expect, test } from "../support/fixtures";
import { getLinkFromEmail, uniqueEmail } from "../support/mailpit";

test.describe("Feature: entrar con un enlace por correo", () => {
  test("Scenario: alguien nuevo pide el enlace, lo abre y llega a crear su espacio", async ({
    page,
    baseURL,
  }) => {
    const email = uniqueEmail("link");

    await test.step("Given a visitor on the login page, choosing the link", async () => {
      await page.goto("/login");
      await page.getByRole("link", { name: "Mejor mándame un enlace, sin contraseña" }).click();
    });

    await test.step("When they ask for the link with their email", async () => {
      await page.getByLabel("Correo electrónico").fill(email);
      await page.getByRole("button", { name: "Enviarme el enlace" }).click();
    });

    await test.step("Then the page says where it went", async () => {
      await expect(page.getByRole("main").getByRole("status")).toHaveText(
        `Te mandamos un enlace a ${email}. Ábrelo en este dispositivo para entrar.`,
      );
    });

    await test.step("And opening it signs them in, on the onboarding", async () => {
      await page.goto(await getLinkFromEmail(email, baseURL, "Tu enlace para entrar"));
      await expect(page).toHaveURL(/\/app\/onboarding$/);
      await expect(
        page.getByRole("heading", { level: 1, name: "Crea tu espacio de trabajo" }),
      ).toBeVisible();
    });
  });

  test("Scenario: un correo mal escrito no manda nada y dice por qué", async ({ page }) => {
    await page.goto("/login?with=link");
    await page.getByLabel("Correo electrónico").fill("no-es-correo");
    await page.getByRole("button", { name: "Enviarme el enlace" }).click();
    await expect(page.getByText("Escribe un correo válido")).toBeVisible();
    await expect(page.getByRole("main").getByRole("status")).toHaveCount(0);
  });
});

test.describe("Feature: cuenta con correo y contraseña", () => {
  const password = "una-clave-larga";

  test("Scenario: crea su cuenta, confirma el correo y entra a crear su espacio", async ({
    page,
    baseURL,
  }) => {
    const email = uniqueEmail("password");

    await test.step("Given a visitor on the sign-up page", async () => {
      await page.goto("/login");
      await page.getByRole("link", { name: "Créala aquí" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Crea tu cuenta" })).toBeVisible();
    });

    await test.step("When they sign up with name, email and password", async () => {
      await page.getByLabel("Tu nombre").fill("Ana Pérez");
      await page.getByLabel("Correo electrónico").fill(email);
      await page.getByLabel("Contraseña").fill(password);
      await page.getByRole("button", { name: "Crear cuenta" }).click();
    });

    await test.step("Then they are asked to confirm their email", async () => {
      await expect(page.getByRole("main").getByRole("status")).toHaveText(
        `Te mandamos un enlace a ${email} para confirmar tu cuenta. Ábrelo para entrar.`,
      );
    });

    await test.step("And the confirmation link signs them in", async () => {
      await page.goto(await getLinkFromEmail(email, baseURL, "Confirma tu correo"));
      await expect(page).toHaveURL(/\/app\/onboarding$/);
    });
  });

  test("Scenario: una contraseña equivocada no entra y lo dice", async ({ page, baseURL }) => {
    const email = await test.step("Given someone with a confirmed account", async () => {
      const email = uniqueEmail("wrong");
      await page.goto("/sign-up");
      await page.getByLabel("Tu nombre").fill("Luis");
      await page.getByLabel("Correo electrónico").fill(email);
      await page.getByLabel("Contraseña").fill(password);
      await page.getByRole("button", { name: "Crear cuenta" }).click();
      await page.goto(await getLinkFromEmail(email, baseURL, "Confirma tu correo"));
      await page.context().clearCookies();
      return email;
    });

    await test.step("When they sign in with another password", async () => {
      await page.goto("/login");
      await page.getByLabel("Correo electrónico").fill(email);
      await page.getByLabel("Contraseña").fill("otra-clave-larga");
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
    });

    await test.step("Then they stay on the login page with the reason", async () => {
      await expect(page.getByRole("alert")).toHaveText("El correo o la contraseña no coinciden.");
      await expect(page).toHaveURL(/\/login/);
    });

    await test.step("And with the right one they get in", async () => {
      await page.getByLabel("Contraseña").fill(password);
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await expect(page).toHaveURL(/\/app\/onboarding$/);
    });
  });

  test("Scenario: olvidó su contraseña, elige otra con el enlace y entra con ella", async ({
    page,
    baseURL,
  }) => {
    const email = uniqueEmail("reset");

    await test.step("Given someone with a confirmed account", async () => {
      await page.goto("/sign-up");
      await page.getByLabel("Tu nombre").fill("Marta");
      await page.getByLabel("Correo electrónico").fill(email);
      await page.getByLabel("Contraseña").fill(password);
      await page.getByRole("button", { name: "Crear cuenta" }).click();
      await page.goto(await getLinkFromEmail(email, baseURL, "Confirma tu correo"));
      await page.context().clearCookies();
    });

    await test.step("When they ask for a new password", async () => {
      await page.goto("/login");
      await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
      await page.getByLabel("Correo electrónico").fill(email);
      await page.getByRole("button", { name: "Mandarme el enlace" }).click();
      await expect(page.getByRole("main").getByRole("status")).toContainText(email);
    });

    await test.step("And choose one from the email's link", async () => {
      await page.goto(await getLinkFromEmail(email, baseURL, "Elige una nueva contraseña"));
      await page.getByLabel("Nueva contraseña").fill("mi-clave-nueva");
      await page.getByRole("button", { name: "Guardar contraseña" }).click();
      await expect(page.getByRole("main").getByRole("status")).toHaveText(
        "Listo, ya puedes entrar con tu nueva contraseña.",
      );
    });

    await test.step("Then the new password signs them in", async () => {
      await page.getByRole("link", { name: "Volver a entrar" }).click();
      await page.getByLabel("Correo electrónico").fill(email);
      await page.getByLabel("Contraseña").fill("mi-clave-nueva");
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await expect(page).toHaveURL(/\/app\/onboarding$/);
    });
  });
});

test.describe("Feature: entrar con Google", () => {
  test("Scenario: el botón de Google lo lleva a elegir su cuenta", async ({ page, baseURL }) => {
    // Playwright can't stop the redirect itself, so catch the app's 302 and stop there: the
    // test never talks to the real Google.
    let googleUrl: URL | undefined;
    let setCookie = "";
    await page.route(
      (url) => url.pathname === "/login",
      async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        const response = await route.fetch({ maxRedirects: 0 });
        googleUrl = new URL(response.headers().location ?? "", baseURL);
        setCookie = response.headers()["set-cookie"] ?? "";
        await route.fulfill({ contentType: "text/html", body: "<title>Google</title>" });
      },
    );

    await test.step("Given a visitor on the login page", async () => {
      await page.goto("/login");
    });

    await test.step("When they choose to continue with Google", async () => {
      await page.getByRole("button", { name: "Continuar con Google" }).click();
      await expect(page).toHaveTitle("Google");
    });

    await test.step("Then Google is asked to send them back here", async () => {
      expect(googleUrl?.origin).toBe("https://accounts.google.com");
      expect(googleUrl?.searchParams.get("client_id")).toBe("e2e.apps.googleusercontent.com");
      expect(googleUrl?.searchParams.get("redirect_uri")).toBe(
        `${baseURL}/api/auth/callback/google`,
      );
      // The OAuth state cookie must travel with the redirect, or the callback is rejected.
      expect(setCookie).toContain("better-auth.state=");
    });
  });

  test("Scenario: si Google falla vuelve al login con un aviso", async ({ page }) => {
    await page.goto("/login?error=access_denied");
    await expect(page.getByRole("alert")).toHaveText(
      "No pudimos entrar con Google. Vuelve a intentarlo o usa tu correo.",
    );
    await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  });
});
