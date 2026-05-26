import { db } from "../../database/knex.js";
import {
  activeShippingClientExists,
  approveShippingOrder,
  cancelShippingOrder,
  insertShippingOrder,
  listShippingOrders,
  lockShippingOrder,
  lockReservableProduct,
  type ShippingOrderInput,
} from "../../models/shipping-orders/shipping-orders.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function indexShippingOrders() {
  return {
    code: 200,
    status: "success",
    data: await listShippingOrders(),
  };
}

export async function storeShippingOrder(input: ShippingOrderInput, createdByUserId: string) {
  const order = await db.transaction(async (transaction) => {
    if (!(await activeShippingClientExists(transaction, input.clientId))) {
      throw new AppError("Cliente informado nao disponivel.", 422);
    }

    const product = await lockReservableProduct(transaction, input.productId);

    if (!product || !product.active) {
      throw new AppError("Produto informado nao disponivel para orcamento.", 422);
    }

    if (Number(product.currentStock) - Number(product.reservedStock) < input.quantity) {
      throw new AppError("Quantidade indisponivel para este orcamento.", 422);
    }

    const unitPrice = Number(product.salePrice);
    const totalAmount = Number((unitPrice * input.quantity).toFixed(2));

    return insertShippingOrder(transaction, input, createdByUserId, unitPrice, totalAmount);
  });

  return {
    code: 201,
    status: "success",
    data: order,
  };
}

export async function approveQuotedShippingOrder(id: string, approvedByUserId: string) {
  const order = await db.transaction(async (transaction) => {
    const quotedOrder = await lockShippingOrder(transaction, id);

    if (!quotedOrder) {
      throw new AppError("Orcamento para envio nao encontrado.", 404);
    }

    if (quotedOrder.status === "CANCELLED") {
      throw new AppError("Pedido cancelado nao pode ser aprovado para separacao.", 409);
    }

    if (quotedOrder.status === "APPROVED") {
      throw new AppError("Este orcamento ja foi aprovado para separacao.", 409);
    }

    const product = await lockReservableProduct(transaction, quotedOrder.productId);

    if (!product || !product.active) {
      throw new AppError("Produto informado nao disponivel para separacao.", 422);
    }

    const quantity = Number(quotedOrder.quantity);

    if (Number(product.currentStock) - Number(product.reservedStock) < quantity) {
      throw new AppError("Estoque insuficiente para separar este pedido.", 422);
    }

    return approveShippingOrder(transaction, id, product.id, quantity, approvedByUserId);
  });

  return {
    code: 200,
    status: "success",
    data: order,
  };
}

export async function cancelOpenShippingOrder(id: string, reason: string, cancelledByUserId: string) {
  const order = await db.transaction(async (transaction) => {
    const currentOrder = await lockShippingOrder(transaction, id);

    if (!currentOrder) {
      throw new AppError("Pedido para envio nao encontrado.", 404);
    }

    if (currentOrder.status === "CANCELLED") {
      throw new AppError("Este pedido para envio ja foi cancelado.", 409);
    }

    if (currentOrder.status === "APPROVED") {
      await lockReservableProduct(transaction, currentOrder.productId);
    }

    return cancelShippingOrder(
      transaction,
      id,
      currentOrder.productId,
      Number(currentOrder.quantity),
      currentOrder.status === "APPROVED",
      cancelledByUserId,
      reason,
    );
  });

  return {
    code: 200,
    status: "success",
    data: order,
  };
}
