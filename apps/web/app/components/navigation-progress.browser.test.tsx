import { createRoutesStub, Link, Outlet } from "react-router";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { NavigationProgress } from "./navigation-progress";

function renderWithSlowPage() {
  let finish = () => {};
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <>
          <NavigationProgress />
          <Link to="/lenta">Ir</Link>
          <Outlet />
        </>
      ),
      children: [
        {
          path: "lenta",
          loader: () =>
            new Promise<null>((resolve) => {
              finish = () => resolve(null);
            }),
          Component: () => <h1>Página lenta</h1>,
        },
      ],
    },
  ]);
  return { screen: render(<Stub />), finish: () => finish() };
}

describe("NavigationProgress", () => {
  it("en reposo no muestra barra ni anuncia nada", async () => {
    const screen = await renderWithSlowPage().screen;
    await expect.element(screen.getByRole("status")).toHaveTextContent("");
    expect(document.querySelector(".navigation-progress-bar")).toBeNull();
  });

  it("mientras carga la página muestra la barra y anuncia 'Cargando…'", async () => {
    const { screen, finish } = renderWithSlowPage();
    const view = await screen;
    await view.getByRole("link", { name: "Ir" }).click();

    await expect.element(view.getByRole("status")).toHaveTextContent("Cargando…");
    expect(document.querySelector('[data-navigation-progress="loading"]')).not.toBeNull();

    finish();
    await expect.element(view.getByRole("heading", { name: "Página lenta" })).toBeVisible();
    await expect.element(view.getByRole("status")).toHaveTextContent("");
    expect(document.querySelector(".navigation-progress-bar")).toBeNull();
  });
});
