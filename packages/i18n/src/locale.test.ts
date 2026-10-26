import { describe, expect, it } from "vitest";
import { negotiateLocale, parseLocale, resolveLocale } from "./locale";

describe("parseLocale", () => {
  it.each([
    ["es", "es"],
    ["en", "en"],
    ["es_cr", "es"],
    ["es-MX", "es"],
    ["es-419", "es"],
    ["EN_us", "en"],
    [" en-GB ", "en"],
  ])("lee %s como %s", (value, locale) => {
    expect(parseLocale(value)).toBe(locale);
  });

  it.each([["de"], [""], [undefined], [42], ["español"]])("rechaza %s", (value) => {
    expect(parseLocale(value)).toBeUndefined();
  });
});

describe("negotiateLocale", () => {
  it("elige el idioma soportado con más peso", () => {
    expect(negotiateLocale("de-DE,de;q=0.9,en;q=0.8,es;q=0.7")).toBe("en");
    expect(negotiateLocale("en;q=0.5, es;q=0.6")).toBe("es");
  });

  it("con el mismo peso gana el que va primero", () => {
    expect(negotiateLocale("en-US, es")).toBe("en");
  });

  it("ignora q=0 y no inventa un idioma", () => {
    expect(negotiateLocale("en;q=0, es")).toBe("es");
    expect(negotiateLocale("en;q=0, de")).toBeUndefined();
    expect(negotiateLocale("")).toBeUndefined();
    expect(negotiateLocale(null)).toBeUndefined();
  });
});

describe("resolveLocale", () => {
  it("la cookie gana sobre la cuenta y el navegador", () => {
    expect(resolveLocale({ cookie: "en", user: "es", acceptLanguage: "es" })).toBe("en");
  });

  it("sin cookie usa la cuenta, y sin cuenta el navegador", () => {
    expect(resolveLocale({ user: "en", acceptLanguage: "es" })).toBe("en");
    expect(resolveLocale({ cookie: "xx", acceptLanguage: "en-US" })).toBe("en");
    expect(resolveLocale({ acceptLanguage: "es-MX" })).toBe("es");
  });

  it("un navegador en un idioma que no tenemos, o sin idioma, recibe inglés", () => {
    expect(resolveLocale({})).toBe("en");
    expect(resolveLocale({ acceptLanguage: "pt-BR,pt;q=0.9" })).toBe("en");
  });
});
