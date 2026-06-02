import { db } from "../../database/knex.js";
import {
  activePaymentMethodExists,
  findOpenCashRegister,
  insertSale,
} from "../../models/sales/sales.model.js";
import {
  activePickupClientExists,
  cancelPickupReservation,
  completePickupReservation,
  insertPickupReservation,
  listPickupReservations,
  lockPickupProduct,
  lockPickupReservation,
  releasePickupReservationStock,
  type PickupReservationInput,
} from "../../models/pickup-reservations/pickup-reservations.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function indexPickupReservations() {
  return {
    code: 200,
    status: "success",
    data: await listPickupReservations(),
  };
}

export async function storePickupReservation(input: PickupReservationInput, createdByUserId: string) {
  const reservation = await db.transaction(async (transaction) => {
    if (!(await activePickupClientExists(transaction, input.clientId))) {
      throw new AppError("Cliente informado nao disponivel.", 422);
    }

    const product = await lockPickupProduct(transaction, input.productId);

    if (!product || !product.active) {
      throw new AppError("Produto informado nao disponivel para reserva.", 422);
    }

    if (Number(product.currentStock) - Number(product.reservedStock) < input.quantity) {
      throw new AppError("Quantidade indisponivel para esta reserva.", 422);
    }

    const unitPrice = Number(product.salePrice);
    const totalAmount = Number((unitPrice * input.quantity).toFixed(2));

    return insertPickupReservation(transaction, input, createdByUserId, unitPrice, totalAmount);
  });

  return {
    code: 201,
    status: "success",
    data: reservation,
  };
}

export async function cancelOpenPickupReservation(id: string, reason: string, cancelledByUserId: string) {
  const reservation = await db.transaction(async (transaction) => {
    const currentReservation = await lockPickupReservation(transaction, id);

    if (!currentReservation) {
      throw new AppError("Reserva para retirada nao encontrada.", 404);
    }

    if (currentReservation.status === "CANCELLED") {
      throw new AppError("Esta reserva para retirada ja foi cancelada.", 409);
    }

    if (currentReservation.status === "COMPLETED") {
      throw new AppError("Reserva concluida nao pode ser cancelada por este fluxo.", 409);
    }

    const product = await lockPickupProduct(transaction, currentReservation.productId);
    const quantity = Number(currentReservation.quantity);

    if (!product || Number(product.reservedStock) < quantity) {
      throw new AppError("Reserva insuficiente para cancelar esta retirada.", 422);
    }

    return cancelPickupReservation(
      transaction,
      id,
      currentReservation.productId,
      quantity,
      cancelledByUserId,
      reason,
    );
  });

  return {
    code: 200,
    status: "success",
    data: reservation,
  };
}

export async function completeReservedPickup(
  id: string,
  paymentMethodId: string,
  completedByUserId: string,
) {
  const reservation = await db.transaction(async (transaction) => {
    const currentReservation = await lockPickupReservation(transaction, id);

    if (!currentReservation) {
      throw new AppError("Reserva para retirada nao encontrada.", 404);
    }

    if (currentReservation.status === "CANCELLED") {
      throw new AppError("Reserva cancelada nao pode ser concluida como venda.", 409);
    }

    if (currentReservation.status === "COMPLETED") {
      throw new AppError("Esta reserva ja foi concluida como venda.", 409);
    }

    const cashRegister = await findOpenCashRegister(transaction);

    if (!cashRegister) {
      throw new AppError("Abra o caixa antes de concluir a reserva para retirada.", 422);
    }

    if (!(await activePaymentMethodExists(transaction, paymentMethodId))) {
      throw new AppError("Forma de pagamento informada nao disponivel.", 422);
    }

    const product = await lockPickupProduct(transaction, currentReservation.productId);
    const quantity = Number(currentReservation.quantity);

    if (!product || Number(product.reservedStock) < quantity || Number(product.currentStock) < quantity) {
      throw new AppError("Reserva insuficiente para concluir esta venda.", 422);
    }

    await releasePickupReservationStock(transaction, product.id, quantity);

    const sale = await insertSale(
      transaction,
      {
        clientId: currentReservation.clientId,
        paymentMethodId,
        items: [
          {
            productId: currentReservation.productId,
            quantity,
          },
        ],
      },
      cashRegister.id,
      completedByUserId,
      [
        {
          productId: currentReservation.productId,
          quantity,
          unitPrice: Number(currentReservation.unitPrice),
          totalAmount: Number(currentReservation.totalAmount),
          position: 1,
        },
      ],
      Number(currentReservation.totalAmount),
    );

    return completePickupReservation(transaction, id, sale.id, completedByUserId);
  });

  return {
    code: 200,
    status: "success",
    data: reservation,
  };
}
