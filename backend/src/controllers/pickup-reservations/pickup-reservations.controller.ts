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

    const reservationItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      totalAmount: number;
      position: number;
      availableStock: number;
    }> = [];

    for (const [index, item] of input.items.entries()) {
      const product = await lockPickupProduct(transaction, item.productId);

      if (!product || !product.active) {
        throw new AppError("Produto informado nao disponivel para reserva.", 422);
      }

      reservationItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(product.salePrice),
        totalAmount: Number((Number(product.salePrice) * item.quantity).toFixed(2)),
        position: index + 1,
        availableStock: Number(product.currentStock) - Number(product.reservedStock),
      });
    }

    for (const item of aggregatePickupItems(reservationItems)) {
      if (item.availableStock < item.quantity) {
        throw new AppError("Quantidade indisponivel para esta reserva.", 422);
      }
    }

    const totalAmount = Number(
      reservationItems.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(2),
    );

    return insertPickupReservation(transaction, input, createdByUserId, reservationItems, totalAmount);
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

    const reservedItems = aggregatePickupItems(currentReservation.items);

    for (const item of reservedItems) {
      const product = await lockPickupProduct(transaction, item.productId);

      if (!product || Number(product.reservedStock) < item.quantity) {
        throw new AppError("Reserva insuficiente para cancelar esta retirada.", 422);
      }
    }

    return cancelPickupReservation(
      transaction,
      id,
      reservedItems,
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

    const reservedItems = aggregatePickupItems(currentReservation.items);

    for (const item of reservedItems) {
      const product = await lockPickupProduct(transaction, item.productId);

      if (!product || Number(product.reservedStock) < item.quantity || Number(product.currentStock) < item.quantity) {
        throw new AppError("Reserva insuficiente para concluir esta venda.", 422);
      }
    }

    for (const item of reservedItems) {
      await releasePickupReservationStock(transaction, item.productId, item.quantity);
    }

    const sale = await insertSale(
      transaction,
      {
        clientId: currentReservation.clientId,
        paymentMethodId,
        items: currentReservation.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
        })),
      },
      cashRegister.id,
      completedByUserId,
      currentReservation.items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalAmount: Number(item.totalAmount),
        position: item.position,
      })),
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

function aggregatePickupItems(
  items: Array<{ productId: string; quantity: number | string; availableStock?: number }>,
) {
  return items.reduce<Array<{ productId: string; quantity: number; availableStock: number }>>(
    (aggregatedItems, item) => {
      const existing = aggregatedItems.find((currentItem) => currentItem.productId === item.productId);

      if (existing) {
        existing.quantity += Number(item.quantity);
        return aggregatedItems;
      }

      aggregatedItems.push({
        productId: item.productId,
        quantity: Number(item.quantity),
        availableStock: item.availableStock ?? Number.POSITIVE_INFINITY,
      });

      return aggregatedItems;
    },
    [],
  );
}
