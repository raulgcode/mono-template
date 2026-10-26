import { describe, expect, it } from "vitest";
import { projectNames, renameText } from "./rename";

describe("projectNames", () => {
  it("arma el slug, el nombre para Postgres y el dominio a partir del nombre", () => {
    expect(projectNames("  Mi   Café App ")).toEqual({
      slug: "mi-cafe-app",
      ident: "mi_cafe_app",
      display: "Mi Café App",
      domain: "mi-cafe-app.com",
    });
  });

  it("usa el dominio que le pasan", () => {
    expect(projectNames("Luna", "Luna.CR").domain).toBe("luna.cr");
  });

  it.each(["", "1app", "x", "starter"])("rechaza %j", (name) => {
    expect(() => projectNames(name)).toThrow();
  });

  it("rechaza un dominio que no lo es", () => {
    expect(() => projectNames("Luna", "luna")).toThrow(/dominio/);
  });
});

describe("renameText", () => {
  const names = projectNames("Mi App");

  it("cambia el scope de los paquetes y el nombre visible", () => {
    expect(renameText('import { auth } from "@starter/auth";', names)).toBe(
      'import { auth } from "@mi-app/auth";',
    );
    expect(renameText('appName: "Starter",', names)).toBe('appName: "Mi App",');
  });

  it("cambia el dominio antes que el slug", () => {
    expect(renameText('APP_URL = "https://app.starter.example"', names)).toBe(
      'APP_URL = "https://app.mi-app.com"',
    );
  });

  it("en Postgres usa guion bajo, que es lo que acepta", () => {
    expect(
      renameText("DATABASE_URL=postgres://starter:starter@localhost:5432/starter_test", names),
    ).toBe("DATABASE_URL=postgres://mi_app:mi_app@localhost:5432/mi_app_test");
    expect(renameText("CREATE DATABASE starter_test OWNER starter;", names)).toBe(
      "CREATE DATABASE mi_app_test OWNER mi_app;",
    );
  });

  it("en lo demás usa el slug", () => {
    expect(renameText('app = "starter-web"', names)).toBe('app = "mi-app-web"');
  });
});
