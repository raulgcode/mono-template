import { getFormProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { magicLinkSchema } from "@starter/contracts";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { renderTranslated } from "~/test/i18n";
import { TextField } from "./text-field";

function SignInForm() {
  const [form, fields] = useForm({
    shouldValidate: "onBlur",
    onValidate: ({ formData }) => parseWithZod(formData, { schema: magicLinkSchema }),
  });
  return (
    <form {...getFormProps(form)}>
      <TextField
        field={fields.email}
        label="Correo"
        type="email"
        description="Te enviaremos un enlace"
      />
      <button type="submit">Enviar</button>
    </form>
  );
}

describe("TextField", () => {
  it("links the label and the description to the input", async () => {
    const screen = await renderTranslated(<SignInForm />, { namespaces: ["forms"] });
    const input = screen.getByRole("textbox", { name: "Correo" });

    await expect.element(input).toHaveAccessibleDescription("Te enviaremos un enlace");
    await expect.element(input).not.toHaveAttribute("aria-invalid");
  });

  it("shows the Zod message and marks the input invalid on blur", async () => {
    const screen = await renderTranslated(<SignInForm />, { namespaces: ["forms"] });
    const input = screen.getByRole("textbox", { name: "Correo" });

    await userEvent.fill(input, "no-es-correo");
    await userEvent.tab();

    await expect.element(page.getByText("Escribe un correo válido")).toBeVisible();
    await expect.element(input).toHaveAttribute("aria-invalid", "true");
    await expect.element(input).toHaveAccessibleDescription(/Escribe un correo válido/);
  });

  it("shows the error in the page's language", async () => {
    const screen = await renderTranslated(<SignInForm />, { locale: "en", namespaces: ["forms"] });
    const input = screen.getByRole("textbox", { name: "Correo" });

    await userEvent.fill(input, "not-an-email");
    await userEvent.tab();

    await expect.element(input).toHaveAccessibleDescription(/Enter a valid email/);
  });
});
