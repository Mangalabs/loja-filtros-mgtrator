import { KeyRound } from "lucide-react";
import { PasswordChangeForm } from "./PasswordChangeForm";

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
        <PasswordChangeForm
          cancelLabel="Sair"
          onCancel={onLogout}
          onChangePassword={onChangePassword}
        />
      </section>
    </main>
  );
}
