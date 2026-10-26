import { describe, expect, it } from "vitest";
import { projectNames, renameText } from "./rename";

describe("projectNames", () => {
  it("builds the slug, the Postgres name and the domain from the name", () => {
    expect(projectNames("  Mi   Café App ")).toEqual({
      slug: "mi-cafe-app",
      ident: "mi_cafe_app",
      display: "Mi Café App",
      domain: "mi-cafe-app.com",
    });
  });

  it("uses the domain it is given", () => {
    expect(projectNames("Luna", "Luna.CR").domain).toBe("luna.cr");
  });

  it.each(["", "1app", "x", "starter"])("rechaza %j", (name) => {
    expect(() => projectNames(name)).toThrow();
  });

  it("rejects something that isn't a domain", () => {
    expect(() => projectNames("Luna", "luna")).toThrow(/isn't a domain/);
  });
});

describe("renameText", () => {
  const names = projectNames("My App");

  it("changes the package scope and the display name", () => {
    expect(renameText('import { auth } from "@starter/auth";', names)).toBe(
      'import { auth } from "@my-app/auth";',
    );
    expect(renameText('appName: "Starter",', names)).toBe('appName: "My App",');
  });

  it("changes the domain before the slug", () => {
    expect(renameText('APP_URL = "https://app.starter.example"', names)).toBe(
      'APP_URL = "https://app.my-app.com"',
    );
  });

  it("uses an underscore for Postgres, which is what it accepts", () => {
    expect(
      renameText("DATABASE_URL=postgres://starter:starter@localhost:5432/starter_test", names),
    ).toBe("DATABASE_URL=postgres://my_app:my_app@localhost:5432/my_app_test");
    expect(renameText("CREATE DATABASE starter_test OWNER starter;", names)).toBe(
      "CREATE DATABASE my_app_test OWNER my_app;",
    );
  });

  it("uses the slug everywhere else", () => {
    expect(renameText('app = "starter-web"', names)).toBe('app = "my-app-web"');
  });
});
