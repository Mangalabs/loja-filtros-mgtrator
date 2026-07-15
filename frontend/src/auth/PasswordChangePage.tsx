import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import { KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PrimaryButton, SecondaryButton } from "../components/ui";

export function PasswordChangePage({
  onChangePassword,
  onLogout,
}: {
  onChangePassword: (input: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
  onLogout: () => void;
}) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    if (newPassword !== confirmation) {
      setMessage("A confirmacao da senha nao confere.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      await onChangePassword({ currentPassword, newPassword });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f4] px-4 py-8">
      <section className="w-full max-w-[460px] rounded-xl border border-[#dfe5e1] bg-white p-7">
        <div className="mb-6 flex items-center gap-3 text-[#203466]">
          <KeyRound size={30} />
          <div>
            <strong className="block">Troca de senha obrigatoria</strong>
            <span className="block text-sm text-[#5f665f]">
              Atualize sua senha antes de acessar o sistema.
            </span>
          </div>
        </div>
        {message ? (
          <Alert
            severity="error"
            variant="outlined"
            onClose={() => setMessage("")}
          >
            {message}
          </Alert>
        ) : null}
        <form className="mt-5 grid gap-4" onSubmit={submit}>
          <TextField
            label="Senha atual"
            name="currentPassword"
            required
            slotProps={{ htmlInput: { minLength: 12 } }}
            type="password"
          />
          <TextField
            helperText="Use pelo menos 12 caracteres."
            label="Nova senha"
            name="newPassword"
            required
            slotProps={{ htmlInput: { minLength: 12 } }}
            type="password"
          />
          <TextField
            label="Confirmar nova senha"
            name="confirmation"
            required
            slotProps={{ htmlInput: { minLength: 12 } }}
            type="password"
          />
          <div className="flex flex-wrap gap-3">
            <PrimaryButton
              icon={<KeyRound size={17} />}
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Atualizando..." : "Trocar senha"}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={onLogout}>
              Sair
            </SecondaryButton>
          </div>
        </form>
      </section>
    </main>
  );
}
