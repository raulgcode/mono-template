import { describe, expect, it } from "vitest";
import { locales } from "../locale";
import type { Message } from "../translate";
import { dictionaries } from ".";

const placeholders = (message: Message) => {
  const texts = typeof message === "string" ? [message] : Object.values(message);
  return [...new Set(texts.flatMap((text) => text?.match(/\{\w+\}/g) ?? []))].sort();
};
const tags = (message: Message) => {
  const texts = typeof message === "string" ? [message] : Object.values(message);
  return [...new Set(texts.flatMap((text) => text?.match(/<\/?\w+>/g) ?? []))].sort();
};

const source = dictionaries.es;
const others = locales.filter((locale) => locale !== "es");

describe.each(others)("diccionario %s", (locale) => {
  const dictionary = dictionaries[locale];

  it("tiene las mismas secciones y claves que el español", () => {
    expect(Object.keys(dictionary).sort()).toEqual(Object.keys(source).sort());
    for (const [namespace, messages] of Object.entries(source)) {
      const translated = dictionary[namespace as keyof typeof dictionary];
      expect(Object.keys(translated).sort(), namespace).toEqual(Object.keys(messages).sort());
    }
  });

  it("usa los mismos placeholders y etiquetas en cada texto", () => {
    for (const [namespace, messages] of Object.entries(source)) {
      const translated: Record<string, Message> = dictionary[namespace as keyof typeof dictionary];
      for (const [key, message] of Object.entries(messages as Record<string, Message>)) {
        const other = translated[key];
        if (!other) continue;
        expect(placeholders(other), `${namespace}.${key}`).toEqual(placeholders(message));
        expect(tags(other), `${namespace}.${key}`).toEqual(tags(message));
        expect(typeof other, `${namespace}.${key}`).toBe(typeof message);
      }
    }
  });

  it("no deja textos vacíos", () => {
    for (const [namespace, messages] of Object.entries(dictionary)) {
      for (const [key, message] of Object.entries(messages as Record<string, Message>)) {
        const texts = typeof message === "string" ? [message] : Object.values(message);
        for (const text of texts) expect(text?.trim(), `${namespace}.${key}`).not.toBe("");
      }
    }
  });
});
