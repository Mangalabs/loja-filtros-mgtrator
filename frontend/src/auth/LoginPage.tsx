import TextField from "@mui/material/TextField";
import { Filter, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AppMessage } from "../components/shell";
import { PrimaryButton } from "../components/ui";

export function LoginPage({
  requiresSetup,
  onLogin,
  onSetup,
}: {
  requiresSetup: boolean;
  onLogin: (credentials: { email: string; password: string }) => Promise<void>;
  onSetup: (input: {
    name: string;
    email: string;
    phone?: string | null;
    password: string;
  }) => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const credentials = {
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    };

    setSubmitting(true);
    setMessage("");

    try {
      if (requiresSetup) {
        await onSetup({
          ...credentials,
          name: String(form.get("name") ?? "").trim(),
          phone: nullableFormValue(form, "phone"),
        });
      } else {
        await onLogin(credentials);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f4] px-4 py-8">
      <section className="w-full max-w-[420px] rounded-xl border border-[#dfe5e1] bg-white p-7">
        <div className="mb-7 flex items-center gap-3 text-[#203466]">
          <Filter size={32} />
          <div>
            <strong className="block">Filtros MG</strong>
            <span className="block text-sm text-[#5f665f]">
              Operacao da filial
            </span>
          </div>
        </div>
        <h1 className="m-0 mb-2 text-2xl font-bold text-[#2c281e]">
          {requiresSetup ? "Primeiro acesso" : "Entrar"}
        </h1>
        <p className="m-0 mb-5 text-sm text-[#5f665f]">
          {requiresSetup
            ? "Crie o administrador inicial para proteger a operacao."
            : "Informe seus dados para acessar o sistema."}
        </p>
        {message ? (
          <AppMessage
            kind="error"
            message={message}
            onClose={() => setMessage("")}
          />
        ) : null}
        <form className="mt-5 grid gap-3" onSubmit={submit}>
          {requiresSetup ? (
            <TextField name="name" label="Nome do administrador" required />
          ) : null}
          {requiresSetup ? (
            <TextField name="phone" label="Telefone/WhatsApp comercial" />
          ) : null}
          <TextField name="email" type="email" label="Email" required />
          <TextField
            name="password"
            type="password"
            label="Senha"
            slotProps={{ htmlInput: { minLength: 12 } }}
            required
          />
          <PrimaryButton
            icon={<ShieldCheck size={17} />}
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? "Aguarde..."
              : requiresSetup
                ? "Criar administrador"
                : "Entrar"}
          </PrimaryButton>
        </form>
        {requiresSetup ? (
          <small className="mt-3 block text-xs text-[#5f665f]">
            A senha deve conter pelo menos 12 caracteres.
          </small>
        ) : null}
      </section>
    </main>
  );
}

function nullableFormValue(form: FormData, key: string): string | null {
  const value = String(form.get(key) ?? "").trim();
  return value ? value : null;
}
