import { describe, expect, it } from "vitest";
import { parseAuthChoice } from "./auth-choice";

describe("parseAuthChoice", () => {
  it("acepta los números de la lista", () => {
    expect(parseAuthChoice("3, 1", ["magic-link"])).toEqual(["magic-link", "google"]);
  });

  it("acepta los nombres", () => {
    expect(parseAuthChoice("google password", ["magic-link"])).toEqual(["password", "google"]);
  });

  it("con Enter deja lo que había", () => {
    expect(parseAuthChoice("  ", ["password"])).toEqual(["password"]);
  });

  it("no repite un método escrito dos veces", () => {
    expect(parseAuthChoice("1,1,magic-link", [])).toEqual(["magic-link"]);
  });

  it.each(["4", "0", "facebook", "1,x"])("rechaza %j", (answer) => {
    expect(parseAuthChoice(answer, ["magic-link"])).toBeUndefined();
  });
});
