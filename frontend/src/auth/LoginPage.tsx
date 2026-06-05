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
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <Filter size={32} />
          <div>
            <strong>Filtros MG</strong>
            <span>Operacao da filial</span>
          </div>
        </div>
        <h1>{requiresSetup ? "Primeiro acesso" : "Entrar"}</h1>
        <p>
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
        <form className="login-form" onSubmit={submit}>
          {requiresSetup ? (
            <input name="name" placeholder="Nome do administrador" required />
          ) : null}
          {requiresSetup ? (
            <input name="phone" placeholder="Telefone/WhatsApp comercial" />
          ) : null}
          <input name="email" type="email" placeholder="Email" required />
          <input
            name="password"
            type="password"
            minLength={12}
            placeholder="Senha"
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
          <small>A senha deve conter pelo menos 12 caracteres.</small>
        ) : null}
      </section>
    </main>
  );
}

function nullableFormValue(form: FormData, key: string): string | null {
  const value = String(form.get(key) ?? "").trim();
  return value ? value : null;
}
