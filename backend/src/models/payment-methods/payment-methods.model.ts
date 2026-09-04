import { db } from "../../database/knex.js";

export type PaymentMethodListFilters = {
  active?: boolean;
};

export type PaymentMethod = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

export async function listPaymentMethods(
  filters: PaymentMethodListFilters,
): Promise<PaymentMethod[]> {
  return db("payment_methods")
    .select(["id", "code", "name", "active"])
    .modify((query) => {
      if (typeof filters.active === "boolean") {
        query.where("active", filters.active);
      }
    })
    .orderByRaw(
      "case code when 'CASH' then 1 when 'PIX' then 2 when 'DEBIT' then 3 when 'CREDIT' then 4 when 'BOLETO' then 5 when 'TO_AGREE' then 6 else 7 end",
    )
    .orderBy("name", "asc");
}

export async function updatePaymentMethodStatus(
  id: string,
  active: boolean,
): Promise<PaymentMethod | undefined> {
  const [paymentMethod] = await db("payment_methods")
    .where("id", id)
    .update({
      active,
      updated_at: db.fn.now(),
    })
    .returning(["id", "code", "name", "active"]);

  return paymentMethod;
}
