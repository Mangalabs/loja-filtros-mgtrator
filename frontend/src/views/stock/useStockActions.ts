import type { FormEvent } from "react";
import { apiPost } from "../../api";
import { nullableFormValue } from "../../utils/forms";

type StockActionsOptions = {
  loadCatalog: () => Promise<void>;
  runAction: (action: () => Promise<void>) => Promise<boolean>;
};

export function useStockActions({
  loadCatalog,
  runAction,
}: StockActionsOptions) {
  async function createStockEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPost("/stock-entries", {
        productId: String(form.get("entryProductId") ?? ""),
        supplierId: String(form.get("entrySupplierId") ?? ""),
        quantity: Number(form.get("entryQuantity")),
        unitCost: Number(form.get("entryUnitCost")),
        notes: nullableFormValue(form, "entryNotes"),
      });

      formElement.reset();
      await loadCatalog();
    });
  }

  async function createStockAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPost("/stock-adjustments", {
        productId: String(form.get("adjustmentProductId") ?? ""),
        quantity: Number(form.get("adjustmentQuantity")),
        reason: String(form.get("adjustmentReason") ?? "").trim(),
      });

      formElement.reset();
      await loadCatalog();
    });
  }

  return {
    createStockAdjustment,
    createStockEntry,
  };
}
