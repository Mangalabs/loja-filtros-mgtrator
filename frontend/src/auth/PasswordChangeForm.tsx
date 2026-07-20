import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import { KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PrimaryButton, SecondaryButton } from "../components/ui";

export function PasswordChangeForm({
  cancelLabel = "Cancelar",
  submitLabel = "Trocar senha",
  successMessage,
  onCancel,
  onChangePassword,
}: {
  cancelLabel?: string;
  submitLabel?: string;
  successMessage?: string;
  onCancel?: () => void;
  onChangePassword: (input: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"error" | "success">("error");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    if (newPassword !== confirmation) {
      setMessageKind("error");
      setMessage("A confirmacao da senha nao confere.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      await onChangePassword({ currentPassword, newPassword });
      event.currentTarget.reset();
      setMessageKind("success");
      setMessage(successMessage ?? "Senha alterada com sucesso.");
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {message ? (
        <Alert
          severity={messageKind}
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
            disabled={submitting}
            icon={<KeyRound size={17} />}
            type="submit"
          >
            {submitting ? "Atualizando..." : submitLabel}
          </PrimaryButton>
          {onCancel ? (
            <SecondaryButton type="button" onClick={onCancel}>
              {cancelLabel}
            </SecondaryButton>
          ) : null}
        </div>
      </form>
    </>
  );
}
