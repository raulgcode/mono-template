import { RouterContextProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { localeContext } from "../context";
import {
  applyAccountLocale,
  localeCookieHeader,
  localeMiddleware,
  readLocaleCookie,
  translations,
} from "./locale.server";

const cookieOf = async (locale: "es" | "en") =>
  (await localeCookieHeader(locale)).split(";")[0] ?? "";

async function run(headers: HeadersInit = {}) {
  const context = new RouterContextProvider();
  const request = new Request("http://localhost/", { headers });
  const response = await localeMiddleware(
    { request, context, params: {}, pattern: "/" } as unknown as Parameters<
      typeof localeMiddleware
    >[0],
    async () => new Response("ok"),
  );
  return { context, request, response: response as Response };
}

describe("cookie del idioma", () => {
  it("lee el idioma que se guardó y dura un año", async () => {
    const setCookie = await localeCookieHeader("en");
    expect(setCookie).toMatch(/Max-Age=31536000/);
    expect(setCookie).toMatch(/SameSite=Lax/);
    const request = new Request("http://localhost/", { headers: { Cookie: await cookieOf("en") } });
    await expect(readLocaleCookie(request)).resolves.toBe("en");
  });

  it("ignora un valor que no es un idioma", async () => {
    const request = new Request("http://localhost/", { headers: { Cookie: "lang=ImRlIg==" } });
    await expect(readLocaleCookie(request)).resolves.toBeUndefined();
  });
});

describe("localeMiddleware", () => {
  it("usa la cookie antes que el navegador", async () => {
    const { context } = await run({
      Cookie: await cookieOf("es"),
      "Accept-Language": "en-US,en;q=0.9",
    });
    expect(context.get(localeContext)).toBe("es");
  });

  it("sin cookie, el idioma del navegador; si no lo tenemos, inglés", async () => {
    expect((await run({ "Accept-Language": "en-GB" })).context.get(localeContext)).toBe("en");
    expect((await run({ "Accept-Language": "es-MX" })).context.get(localeContext)).toBe("es");
    expect((await run({ "Accept-Language": "de" })).context.get(localeContext)).toBe("en");
  });

  it("avisa a los cachés que la respuesta cambia con el idioma", async () => {
    const { response } = await run();
    expect(response.headers.get("Vary")).toBe("Accept-Language, Cookie");
  });
});

describe("applyAccountLocale", () => {
  it("en un dispositivo sin cookie usa el idioma de la cuenta", async () => {
    const { context, request } = await run({ "Accept-Language": "es" });
    await applyAccountLocale(request, context, { locale: "en" });
    expect(context.get(localeContext)).toBe("en");
  });

  it("la cookie de este dispositivo gana sobre la cuenta", async () => {
    const { context, request } = await run({ Cookie: await cookieOf("es") });
    await applyAccountLocale(request, context, { locale: "en" });
    expect(context.get(localeContext)).toBe("es");
  });

  it("sin idioma en la cuenta no cambia nada", async () => {
    const { context, request } = await run({ "Accept-Language": "en" });
    await applyAccountLocale(request, context, { locale: null });
    expect(context.get(localeContext)).toBe("en");
  });
});

describe("translations", () => {
  it("manda solo las secciones pedidas, en el idioma de la página", async () => {
    const { context } = await run({ "Accept-Language": "en" });
    const sent = translations(context, "common");
    expect(Object.keys(sent)).toEqual(["common"]);
    expect(sent.common.errorTitle).toBe("Oops, something went wrong");
  });
});
