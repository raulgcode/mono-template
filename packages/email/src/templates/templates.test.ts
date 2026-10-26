import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { emailPalette } from "../brand";
import { renderEmail } from "../render";
import { AccountEmail, accountEmailSubject } from "./account";
import { MagicLinkEmail, magicLinkSubject } from "./magic-link";

const url = "https://app.starter.example/api/auth/verify?token=abc&x=1";

describe("marca en todos los correos", () => {
  it.each([
    createElement(MagicLinkEmail, { url }),
    createElement(AccountEmail, { kind: "verify", name: "Ana", url }),
    createElement(AccountEmail, { kind: "reset", name: "Ana", url }),
  ])("$type.name lleva el color de la marca, modo oscuro y el enlace escrito", async (email) => {
    const { html, text } = await renderEmail(email);
    expect(html).toContain(`background-color:${emailPalette.primary.light}`);
    expect(html).toContain("@media (prefers-color-scheme: dark)");
    expect(html).toContain('<meta name="color-scheme" content="light dark">');
    // The button and the link spelled out below it, with the & escaped in the HTML.
    expect(html).toContain('href="https://app.starter.example/api/auth/verify?token=abc&amp;x=1"');
    expect(text).toContain(url);
  });
});

describe("correos en el idioma de quien los recibe", () => {
  it("el enlace para entrar sale en español por defecto", async () => {
    const { html, text } = await renderEmail(createElement(MagicLinkEmail, { url }));
    expect(magicLinkSubject("es")).toBe("Tu enlace para entrar");
    expect(html).toContain('lang="es"');
    expect(text).toContain("Entra con un toque");
  });

  it("y en inglés cuando lo pidieron desde una página en inglés", async () => {
    const element = createElement(MagicLinkEmail, { url, locale: "en" });
    const { html, text } = await renderEmail(element);
    expect(magicLinkSubject("en")).toBe("Your sign-in link");
    expect(html).toContain('lang="en"');
    expect(text).toContain("Sign in with one tap");
  });

  it("confirmar el correo saluda por nombre", async () => {
    const element = createElement(AccountEmail, { kind: "verify", name: "Ana", url });
    const { text } = await renderEmail(element);
    expect(accountEmailSubject("verify", "es")).toBe("Confirma tu correo");
    expect(text).toContain("Hola, Ana");
    expect(text).toContain("Confirmar correo");
  });

  it("elegir una contraseña nueva, en inglés", async () => {
    const element = createElement(AccountEmail, { kind: "reset", name: "Ana", url, locale: "en" });
    const { text } = await renderEmail(element);
    expect(accountEmailSubject("reset", "en")).toBe("Choose a new password");
    expect(text).toContain("Choose password");
  });
});
