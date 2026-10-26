import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { ScrollShadow } from "./scroll-shadow";

function renderScroller(contentWidth: number) {
  return render(
    <ScrollShadow data-testid="wrapper" style={{ width: 200 }}>
      <div style={{ width: contentWidth, height: 20 }}>contenido</div>
    </ScrollShadow>,
  );
}

const scrollerOf = (wrapper: Element) => wrapper.firstElementChild as HTMLElement;

describe("ScrollShadow", () => {
  it("muestra la sombra del final cuando hay más contenido a la derecha", async () => {
    const screen = await renderScroller(600);
    const wrapper = screen.getByTestId("wrapper");
    await expect.element(wrapper).toHaveAttribute("data-start", "false");
    await expect.element(wrapper).toHaveAttribute("data-end", "true");
  });

  it("cambia de lado al desplazarse y la quita al llegar al final", async () => {
    const screen = await renderScroller(600);
    const wrapper = screen.getByTestId("wrapper");
    const scroller = scrollerOf(wrapper.element());

    scroller.scrollLeft = 100;
    scroller.dispatchEvent(new Event("scroll"));
    await expect.element(wrapper).toHaveAttribute("data-start", "true");
    await expect.element(wrapper).toHaveAttribute("data-end", "true");

    scroller.scrollLeft = scroller.scrollWidth;
    scroller.dispatchEvent(new Event("scroll"));
    await expect.element(wrapper).toHaveAttribute("data-start", "true");
    await expect.element(wrapper).toHaveAttribute("data-end", "false");
  });

  it("no muestra sombras cuando todo cabe", async () => {
    const screen = await renderScroller(150);
    const wrapper = screen.getByTestId("wrapper");
    await expect.element(wrapper).toHaveAttribute("data-start", "false");
    await expect.element(wrapper).toHaveAttribute("data-end", "false");
  });
});

describe("ScrollShadow con contenido sin foco (código)", () => {
  it("el teclado puede desplazarlo: es una región con nombre y foco", async () => {
    const screen = await render(
      <ScrollShadow scrollerLabel="Ejemplo de llamada" style={{ width: 200 }}>
        <pre style={{ width: 600 }}>curl …</pre>
      </ScrollShadow>,
    );
    const region = screen.getByRole("region", { name: "Ejemplo de llamada" });
    await expect.element(region).toHaveAttribute("tabindex", "0");
  });

  it("sin nombre no agrega nada al orden del teclado", async () => {
    const screen = await renderScroller(600);
    const scroller = scrollerOf(screen.getByTestId("wrapper").element());
    expect(scroller.hasAttribute("tabindex")).toBe(false);
  });
});
