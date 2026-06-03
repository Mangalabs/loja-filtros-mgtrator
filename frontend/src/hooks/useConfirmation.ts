import { useState } from "react";

type ConfirmationState = {
  confirmLabel?: string;
  message: string;
  resolve: (confirmed: boolean) => void;
  title: string;
};

export function useConfirmation() {
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);

  function requestConfirmation(message: string, title = "Confirmar acao", confirmLabel = "Confirmar") {
    return new Promise<boolean>((resolve) => {
      setConfirmation({ confirmLabel, message, resolve, title });
    });
  }

  function closeConfirmation(confirmed: boolean) {
    confirmation?.resolve(confirmed);
    setConfirmation(null);
  }

  return {
    closeConfirmation,
    confirmation,
    requestConfirmation,
  };
}
