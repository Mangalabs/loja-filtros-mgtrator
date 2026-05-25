import {
  listPaymentMethods,
  updatePaymentMethodStatus,
  type PaymentMethodListFilters,
} from "../../models/payment-methods/payment-methods.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function indexPaymentMethods(filters: PaymentMethodListFilters) {
  const paymentMethods = await listPaymentMethods(filters);

  return {
    code: 200,
    status: "success",
    data: paymentMethods,
  };
}

export async function changePaymentMethodStatus(id: string, active: boolean) {
  const paymentMethod = await updatePaymentMethodStatus(id, active);

  if (!paymentMethod) {
    throw new AppError("Payment method not found", 404);
  }

  return {
    code: 200,
    status: "success",
    data: paymentMethod,
  };
}
