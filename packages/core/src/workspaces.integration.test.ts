import { createTestDatabase, createTestTenant } from "@starter/db/testing";
import { afterAll, describe, expect, it } from "vitest";
import { getWorkspace, listMemberships, resolveTenant } from "./workspaces";

const connection = createTestDatabase();
afterAll(() => connection.close());
const db = connection.db;

describe("resolveTenant", () => {
  it("da el espacio a quien es miembro", async () => {
    const tenant = await createTestTenant(db);

    const ctx = await resolveTenant(db, tenant.userId, tenant.slug);

    expect(ctx).toMatchObject({
      organizationId: tenant.organizationId,
      userId: tenant.userId,
      role: "owner",
    });
  });

  it("no da un espacio ajeno: responde igual que uno que no existe", async () => {
    const mine = await createTestTenant(db);
    const theirs = await createTestTenant(db);

    expect(await resolveTenant(db, mine.userId, theirs.slug)).toBeUndefined();
    expect(await resolveTenant(db, mine.userId, "no-existe")).toBeUndefined();
  });
});

describe("listMemberships", () => {
  it("lista los espacios de la persona, el más viejo primero", async () => {
    const first = await createTestTenant(db);
    const second = await createTestTenant(db, { userId: first.userId, role: "member" });

    const memberships = await listMemberships(db, first.userId);

    expect(memberships.map((membership) => [membership.slug, membership.role])).toEqual([
      [first.slug, "owner"],
      [second.slug, "member"],
    ]);
  });
});

describe("getWorkspace", () => {
  it("lee solo el espacio del tenant", async () => {
    const tenant = await createTestTenant(db);
    const ctx = await resolveTenant(db, tenant.userId, tenant.slug);
    if (!ctx) throw new Error("no tenant");

    expect(await getWorkspace(ctx)).toEqual({
      id: tenant.organizationId,
      name: expect.stringMatching(/^Test /),
      slug: tenant.slug,
    });
  });
});
