import { eq, schema } from "@starter/db";
import { createTestDatabase, createTestTenant, createTestUser } from "@starter/db/testing";
import type { SendEmailInput } from "@starter/email";
import type { AuthMethod } from "@starter/env";
import { afterAll, describe, expect, it } from "vitest";
import { createAuth } from "./auth";

const connection = createTestDatabase();
afterAll(() => connection.close());

const baseURL = "http://localhost:5173";
const google = { clientId: "client-id", clientSecret: "client-secret" };

function authWith(methods: AuthMethod[] = ["magic-link"], sent: SendEmailInput[] = []) {
  return createAuth({
    db: connection.db,
    mailer: { send: async (email) => void sent.push(email) },
    baseURL,
    secret: "x".repeat(32),
    methods,
    google: methods.includes("google") ? google : undefined,
    rateLimit: false,
  });
}

const uniqueEmail = () => `user-${crypto.randomUUID().slice(0, 8)}@test.starter.example`;

describe("Google", () => {
  it("manda a Google con nuestro callback y guarda el state", async () => {
    const auth = authWith(["google"]);

    const { headers, response } = await auth.api.signInSocial({
      body: { provider: "google", callbackURL: "/app", disableRedirect: true },
      returnHeaders: true,
    });

    const url = new URL(response.url ?? "");
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(`${baseURL}/api/auth/callback/google`);
    expect(url.searchParams.get("prompt")).toBe("select_account");
    expect(headers.get("set-cookie")).toContain("state");
  });

  it("no se ofrece si no está entre los métodos", async () => {
    await expect(
      authWith(["magic-link"]).api.signInSocial({
        body: { provider: "google", callbackURL: "/app" },
      }),
    ).rejects.toThrow();
  });

  it("sin credenciales no arranca", () => {
    expect(() =>
      createAuth({
        db: connection.db,
        mailer: { send: async () => {} },
        baseURL,
        secret: "x".repeat(32),
        methods: ["google"],
      }),
    ).toThrow(/GOOGLE_CLIENT_ID/);
  });
});

describe("usuario y contraseña", () => {
  it("al crear la cuenta manda el correo de confirmación y no abre sesión", async () => {
    const sent: SendEmailInput[] = [];
    const auth = authWith(["password"], sent);
    const email = uniqueEmail();

    const result = await auth.api.signUpEmail({
      body: { name: "Ana", email, password: "una-clave-larga", locale: "en" },
    });

    expect(result.token).toBeNull();
    expect(sent.map((message) => [message.to, message.subject])).toEqual([
      [email, "Confirm your email"],
    ]);
  });

  it("no deja entrar con la contraseña antes de confirmar el correo", async () => {
    const auth = authWith(["password"]);
    const email = uniqueEmail();
    await auth.api.signUpEmail({ body: { name: "Ana", email, password: "una-clave-larga" } });

    await expect(
      auth.api.signInEmail({ body: { email, password: "una-clave-larga" } }),
    ).rejects.toMatchObject({ status: "FORBIDDEN" });
  });

  it("apagada, no se puede crear cuenta con contraseña", async () => {
    await expect(
      authWith(["magic-link"]).api.signUpEmail({
        body: { name: "Ana", email: uniqueEmail(), password: "una-clave-larga" },
      }),
    ).rejects.toThrow();
  });
});

describe("enlace mágico", () => {
  it("manda el enlace en el idioma de la página", async () => {
    const sent: SendEmailInput[] = [];
    const email = uniqueEmail();

    await authWith(["magic-link"], sent).api.signInMagicLink({
      body: { email, metadata: { locale: "en" } },
      headers: new Headers(),
    });

    expect(sent.map((message) => [message.to, message.subject])).toEqual([
      [email, "Your sign-in link"],
    ]);
  });
});

async function activeOrganizationOf(sessionId: string) {
  const [row] = await connection.db
    .select({ id: schema.session.activeOrganizationId })
    .from(schema.session)
    .where(eq(schema.session.id, sessionId));
  return row?.id;
}

describe("espacio activo al entrar", () => {
  it("abre el espacio de la persona en cada sesión nueva", async () => {
    const tenant = await createTestTenant(connection.db);

    const internal = (await authWith().$context).internalAdapter;
    const session = await internal.createSession(tenant.userId);

    expect(await activeOrganizationOf(session.id)).toBe(tenant.organizationId);
  });

  it("deja la sesión sin espacio si todavía no creó uno", async () => {
    const userId = await createTestUser(connection.db);

    const session = await (await authWith().$context).internalAdapter.createSession(userId);

    expect(await activeOrganizationOf(session.id)).toBeNull();
  });

  it("con varios espacios, abre el que usó en su última sesión", async () => {
    const first = await createTestTenant(connection.db);
    const second = await createTestTenant(connection.db, { userId: first.userId });
    const internal = (await authWith().$context).internalAdapter;
    const previous = await internal.createSession(first.userId);
    await connection.db
      .update(schema.session)
      .set({ activeOrganizationId: second.organizationId })
      .where(eq(schema.session.id, previous.id));

    const session = await internal.createSession(first.userId);

    expect(await activeOrganizationOf(session.id)).toBe(second.organizationId);
  });
});

describe("entrar como cualquiera (solo /dev/sign-in en pnpm dev)", () => {
  const devAuth = () =>
    createAuth({
      db: connection.db,
      mailer: { send: async () => {} },
      baseURL,
      secret: "x".repeat(32),
      methods: ["magic-link"],
      rateLimit: false,
      devSignIn: true,
    });

  it("entra y deja la cookie de sesión", async () => {
    const tenant = await createTestTenant(connection.db);

    const { headers } = await devAuth().api.devSignIn({
      body: { userId: tenant.userId },
      returnHeaders: true,
    });

    const cookie = headers.get("set-cookie") ?? "";
    const session = await devAuth().api.getSession({
      headers: new Headers({ cookie: cookie.split(";")[0] ?? "" }),
    });
    expect(session?.user.id).toBe(tenant.userId);
  });

  it("apagado (como en producción) no deja entrar a nadie", async () => {
    const tenant = await createTestTenant(connection.db);

    await expect(authWith().api.devSignIn({ body: { userId: tenant.userId } })).rejects.toThrow();
  });

  it("no existe por HTTP aunque esté encendido", async () => {
    const tenant = await createTestTenant(connection.db);

    const response = await devAuth().handler(
      new Request(`${baseURL}/api/auth/dev-sign-in`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: baseURL },
        body: JSON.stringify({ userId: tenant.userId }),
      }),
    );

    expect(response.status).toBe(404);
  });
});

describe("los endpoints de miembros y espacios no existen por HTTP", () => {
  it.each(["invite-member", "update-member-role", "remove-member", "create"])(
    "/organization/%s responde 404",
    async (path) => {
      const response = await authWith().handler(
        new Request(`${baseURL}/api/auth/organization/${path}`, {
          method: "POST",
          headers: { "content-type": "application/json", origin: baseURL },
          body: JSON.stringify({ email: "x@test.starter.example", role: "owner", name: "x" }),
        }),
      );

      expect(response.status).toBe(404);
    },
  );
});
