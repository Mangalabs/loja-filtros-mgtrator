import { db } from "../../database/knex.js";
import { generateSaleReceiptPdf } from "../../integrations/pdf/sale-receipt-pdf.js";
import { findBranchById } from "../../models/branches/branches.model.js";
import {
  activeClientExists,
  activePaymentMethodExists,
  cancelSale,
  findOpenCashRegister,
  insertSale,
  getSaleById,
  listSaleItemsForStockCorrection,
  listSales,
  lockSaleItemForReturn,
  lockSaleProduct,
  lockSaleForCancellation,
  returnSaleItem,
  returnedSaleItemQuantity,
  salePaymentMethodId,
  saleHasBlockingFiscalDocument,
  saleHasLinkedOperation,
  updateSaleCommercialDetails,
  updateSaleStatus,
  type SaleCommercialDetailsInput,
  type SaleInput,
  type SaleUpdateInput,
  updateOpenSaleDetails,
} from "../../models/sales/sales.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function indexSales(filters: { branchId: string }) {
  return {
    code: 200,
    status: "success",
    data: await listSales(filters),
  };
}

export async function showSaleReceiptPdf(id: string, branchId: string) {
  const sale = await getSaleById(id, db, { branchId });

  if (!sale) {
    throw new AppError("Venda nao encontrada.", 404);
  }

  if (sale.status !== "COMPLETED") {
    throw new AppError(
      "Comprovante disponivel apenas para vendas concluidas.",
      409,
    );
  }

  return {
    filename: `comprovante-venda-${sale.id}.pdf`,
    pdf: await generateSaleReceiptPdf(sale, await pdfStoreProfile(sale.branchId)),
  };
}

async function pdfStoreProfile(branchId: string | null) {
  return branchId ? findBranchById(branchId) : null;
}

export async function storeSale(
  input: SaleInput,
  createdByUserId: string,
  branchId: string,
) {
  const sale = await db.transaction(async (transaction) => {
    const cashRegister = await findOpenCashRegister(transaction, branchId);

    if (!cashRegister) {
      throw new AppError("Abra o caixa antes de registrar uma venda.", 422);
    }

    const saleItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      totalAmount: number;
      position: number;
      availableStock: number;
    }> = [];

    for (const [index, item] of input.items.entries()) {
      const product = await lockSaleProduct(
        transaction,
        item.productId,
        branchId,
      );

      if (!product || !product.active) {
        throw new AppError("Produto informado nao disponivel para venda.", 422);
      }

      saleItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(product.salePrice),
        totalAmount: Number(
          (Number(product.salePrice) * item.quantity).toFixed(2),
        ),
        position: index + 1,
        availableStock:
          Number(product.currentStock) - Number(product.reservedStock),
      });
    }

    for (const item of aggregateSaleItemsWithStock(saleItems)) {
      if (
        item.availableStock < item.quantity &&
        !input.allowInsufficientStock
      ) {
        throw new AppError("Estoque insuficiente para concluir a venda.", 422);
      }
    }

    if (
      input.clientId &&
      !(await activeClientExists(transaction, input.clientId, branchId))
    ) {
      throw new AppError("Cliente informado nao disponivel.", 422);
    }

    const subtotalAmount = Number(
      saleItems.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(2),
    );
    const discountAmount = Number(input.discountAmount.toFixed(2));

    if (discountAmount > subtotalAmount) {
      throw new AppError(
        "Desconto nao pode ser maior que o subtotal da venda.",
        422,
      );
    }

    const totalAmount = Number((subtotalAmount - discountAmount).toFixed(2));
    const payments = normalizeSalePayments(input, totalAmount);

    for (const payment of payments) {
      if (
        !(await activePaymentMethodExists(
          transaction,
          payment.paymentMethodId,
        ))
      ) {
        throw new AppError("Forma de pagamento informada nao disponivel.", 422);
      }
    }

    return insertSale(
      transaction,
      { ...input, payments },
      cashRegister.id,
      createdByUserId,
      branchId,
      saleItems,
      subtotalAmount,
      totalAmount,
    );
  });

  return {
    code: 201,
    status: "success",
    data: sale,
  };
}

export async function cancelCounterSale(
  id: string,
  reason: string,
  cancelledByUserId: string,
  branchId: string,
) {
  const sale = await db.transaction(async (transaction) => {
    const lockedSale = await lockSaleForCancellation(
      transaction,
      id,
      branchId,
    );

    if (!lockedSale) {
      throw new AppError("Venda nao encontrada.", 404);
    }

    if (lockedSale.status === "CANCELLED") {
      throw new AppError("Esta venda ja foi cancelada.", 409);
    }

    if (await saleHasLinkedOperation(transaction, id)) {
      throw new AppError(
        "Venda gerada por envio ou retirada nao pode ser cancelada por este fluxo.",
        409,
      );
    }

    if (await saleHasBlockingFiscalDocument(transaction, id)) {
      throw new AppError(
        "Cancele a NF-e antes de cancelar esta venda.",
        409,
      );
    }

    return cancelSale(transaction, id, cancelledByUserId, reason);
  });

  return {
    code: 200,
    status: "success",
    data: sale,
  };
}

export async function updateCompletedSaleCommercialDetails(
  id: string,
  input: SaleCommercialDetailsInput,
  branchId: string,
) {
  const sale = await db.transaction(async (transaction) => {
    const lockedSale = await lockSaleForCancellation(
      transaction,
      id,
      branchId,
    );

    if (!lockedSale) {
      throw new AppError("Venda nao encontrada.", 404);
    }

    if (lockedSale.status === "CANCELLED") {
      throw new AppError("Venda cancelada nao pode ser editada.", 409);
    }

    if (await saleHasBlockingFiscalDocument(transaction, id)) {
      throw new AppError(
        "Cancele a NF-e antes de editar os dados comerciais desta venda.",
        409,
      );
    }

    const payments = input.payments
      ? normalizeCommercialSalePayments(input.payments, lockedSale.totalAmount)
      : undefined;

    for (const payment of payments ?? []) {
      if (
        !(await activePaymentMethodExists(
          transaction,
          payment.paymentMethodId,
        ))
      ) {
        throw new AppError("Forma de pagamento informada nao disponivel.", 422);
      }
    }

    return updateSaleCommercialDetails(transaction, id, input);
  });

  return {
    code: 200,
    status: "success",
    data: sale,
  };
}

export async function updateOpenSale(
  id: string,
  input: SaleUpdateInput,
  updatedByUserId: string,
  branchId: string,
) {
  const sale = await db.transaction(async (transaction) => {
    const lockedSale = await lockSaleForCancellation(
      transaction,
      id,
      branchId,
    );

    if (!lockedSale) {
      throw new AppError("Venda nao encontrada.", 404);
    }

    if (lockedSale.status === "CANCELLED") {
      throw new AppError("Venda cancelada nao pode ser editada.", 409);
    }

    if (lockedSale.status !== "OPEN") {
      throw new AppError(
        "Reabra a venda antes de editar itens, cliente ou valores.",
        409,
      );
    }

    if (await saleHasBlockingFiscalDocument(transaction, id)) {
      throw new AppError(
        "Cancele a NF-e antes de editar esta venda.",
        409,
      );
    }

    if (
      input.clientId &&
      !(await activeClientExists(transaction, input.clientId, branchId))
    ) {
      throw new AppError("Cliente informado nao disponivel.", 422);
    }

    const saleItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      totalAmount: number;
      position: number;
      availableStock: number;
    }> = [];

    for (const [index, item] of input.items.entries()) {
      const product = await lockSaleProduct(
        transaction,
        item.productId,
        branchId,
      );

      if (!product || !product.active) {
        throw new AppError("Produto informado nao disponivel para venda.", 422);
      }

      saleItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(product.salePrice),
        totalAmount: Number(
          (Number(product.salePrice) * item.quantity).toFixed(2),
        ),
        position: index + 1,
        availableStock:
          Number(product.currentStock) - Number(product.reservedStock),
      });
    }

    const currentItems = await listSaleItemsForStockCorrection(transaction, id);
    const stockChanges = saleStockCorrectionChanges(currentItems, saleItems);

    for (const item of aggregateSaleItemsWithStock(saleItems)) {
      const correction = stockChanges.find(
        (change) => change.productId === item.productId,
      );

      if (
        correction &&
        correction.quantity < 0 &&
        item.availableStock < Math.abs(correction.quantity) &&
        !input.allowInsufficientStock
      ) {
        throw new AppError("Estoque insuficiente para atualizar a venda.", 422);
      }
    }

    const subtotalAmount = Number(
      saleItems.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(2),
    );
    const discountAmount = Number(input.discountAmount.toFixed(2));

    if (discountAmount > subtotalAmount) {
      throw new AppError(
        "Desconto nao pode ser maior que o subtotal da venda.",
        422,
      );
    }

    const totalAmount = Number((subtotalAmount - discountAmount).toFixed(2));
    const payments = normalizeSalePayments(input, totalAmount);

    for (const payment of payments) {
      if (
        !(await activePaymentMethodExists(
          transaction,
          payment.paymentMethodId,
        ))
      ) {
        throw new AppError("Forma de pagamento informada nao disponivel.", 422);
      }
    }

    return updateOpenSaleDetails(
      transaction,
      id,
      { ...input, payments },
      updatedByUserId,
      saleItems,
      subtotalAmount,
      totalAmount,
      stockChanges,
    );
  });

  return {
    code: 200,
    status: "success",
    data: sale,
  };
}

export async function reopenCompletedSale(id: string, branchId: string) {
  const sale = await db.transaction(async (transaction) => {
    const lockedSale = await lockSaleForCancellation(
      transaction,
      id,
      branchId,
    );

    if (!lockedSale) {
      throw new AppError("Venda nao encontrada.", 404);
    }

    if (lockedSale.status === "CANCELLED") {
      throw new AppError("Venda cancelada nao pode ser reaberta.", 409);
    }

    if (lockedSale.status === "OPEN") {
      throw new AppError("Esta venda ja esta aberta para correcao.", 409);
    }

    if (await saleHasBlockingFiscalDocument(transaction, id)) {
      throw new AppError(
        "Cancele a NF-e antes de reabrir esta venda.",
        409,
      );
    }

    return updateSaleStatus(transaction, id, "OPEN");
  });

  return {
    code: 200,
    status: "success",
    data: sale,
  };
}

export async function completeReopenedSale(id: string, branchId: string) {
  const sale = await db.transaction(async (transaction) => {
    const lockedSale = await lockSaleForCancellation(
      transaction,
      id,
      branchId,
    );

    if (!lockedSale) {
      throw new AppError("Venda nao encontrada.", 404);
    }

    if (lockedSale.status === "CANCELLED") {
      throw new AppError("Venda cancelada nao pode ser concluida.", 409);
    }

    if (lockedSale.status === "COMPLETED") {
      throw new AppError("Esta venda ja esta concluida.", 409);
    }

    return updateSaleStatus(transaction, id, "COMPLETED");
  });

  return {
    code: 200,
    status: "success",
    data: sale,
  };
}

export async function returnCounterSaleItem(
  id: string,
  saleItemId: string,
  quantity: number,
  reason: string,
  createdByUserId: string,
  branchId: string,
  refundInput: {
    refundAmount?: number;
    refundPaymentMethodId?: string;
    refundedAt?: string | null;
    refundReference?: string | null;
  } = {},
) {
  const sale = await db.transaction(async (transaction) => {
    const lockedSale = await lockSaleForCancellation(
      transaction,
      id,
      branchId,
    );

    if (!lockedSale) {
      throw new AppError("Venda nao encontrada.", 404);
    }

    if (lockedSale.status === "CANCELLED") {
      throw new AppError("Venda cancelada nao pode receber devolucao.", 409);
    }

    if (lockedSale.status === "OPEN") {
      throw new AppError("Conclua a venda antes de registrar devolucao.", 409);
    }

    if (await saleHasBlockingFiscalDocument(transaction, id)) {
      throw new AppError(
        "Cancele a NF-e antes de devolver itens desta venda.",
        409,
      );
    }

    const saleItem = await lockSaleItemForReturn(transaction, id, saleItemId);

    if (!saleItem) {
      throw new AppError("Item da venda nao encontrado.", 404);
    }

    const returnedQuantity = await returnedSaleItemQuantity(
      transaction,
      saleItemId,
    );
    const availableQuantity = Number(saleItem.quantity) - returnedQuantity;

    if (quantity > availableQuantity) {
      throw new AppError(
        "Quantidade de devolucao maior que quantidade disponivel do item.",
        422,
      );
    }

    const refundPaymentMethodId =
      refundInput.refundPaymentMethodId ??
      (await salePaymentMethodId(transaction, id));

    if (!refundPaymentMethodId) {
      throw new AppError(
        "Forma de estorno nao encontrada para esta venda.",
        422,
      );
    }

    if (
      !(await activePaymentMethodExists(transaction, refundPaymentMethodId))
    ) {
      throw new AppError("Forma de estorno informada nao disponivel.", 422);
    }

    return returnSaleItem(
      transaction,
      id,
      saleItem,
      quantity,
      createdByUserId,
      reason,
      {
        refundAmount:
          refundInput.refundAmount ?? saleItemRefundAmount(saleItem, quantity),
        refundPaymentMethodId,
        refundedAt: refundInput.refundedAt ?? new Date().toISOString(),
        refundReference: refundInput.refundReference,
      },
    );
  });

  return {
    code: 200,
    status: "success",
    data: sale,
  };
}

function saleItemRefundAmount(
  saleItem: { quantity: string; totalAmount: string },
  returnQuantity: number,
) {
  const amount =
    (returnQuantity / Number(saleItem.quantity)) * Number(saleItem.totalAmount);

  return Number(amount.toFixed(2));
}

function normalizeSalePayments(input: SaleInput, totalAmount: number) {
  const payments = input.payments ?? [
    {
      paymentMethodId: input.paymentMethodId as string,
      amount: totalAmount,
    },
  ];
  const totalPaymentsAmount = Number(
    payments.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2),
  );

  if (payments.some((payment) => payment.amount <= 0)) {
    throw new AppError("Valor de pagamento deve ser maior que zero.", 422);
  }

  if (totalPaymentsAmount !== totalAmount) {
    throw new AppError(
      "Total dos pagamentos deve ser igual ao total da venda.",
      422,
    );
  }

  return payments;
}

function normalizeCommercialSalePayments(
  payments: SaleCommercialDetailsInput["payments"],
  totalAmount: string,
) {
  if (!payments) {
    return undefined;
  }

  const normalizedTotalAmount = Number(Number(totalAmount).toFixed(2));
  const totalPaymentsAmount = Number(
    payments.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2),
  );

  if (payments.some((payment) => payment.amount <= 0)) {
    throw new AppError("Valor de pagamento deve ser maior que zero.", 422);
  }

  if (totalPaymentsAmount !== normalizedTotalAmount) {
    throw new AppError(
      "Total dos pagamentos deve ser igual ao total da venda.",
      422,
    );
  }

  return payments;
}

function aggregateSaleItems(
  items: Array<{ productId: string; quantity: number }>,
) {
  return items.reduce<Array<{ productId: string; quantity: number }>>(
    (aggregatedItems, item) => {
      const existing = aggregatedItems.find(
        (currentItem) => currentItem.productId === item.productId,
      );

      if (existing) {
        existing.quantity += item.quantity;
        return aggregatedItems;
      }

      aggregatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
      });

      return aggregatedItems;
    },
    [],
  );
}

function aggregateSaleItemsWithStock(
  items: Array<{ productId: string; quantity: number; availableStock: number }>,
) {
  return items.reduce<
    Array<{ productId: string; quantity: number; availableStock: number }>
  >((aggregatedItems, item) => {
    const existing = aggregatedItems.find(
      (currentItem) => currentItem.productId === item.productId,
    );

    if (existing) {
      existing.quantity += item.quantity;
      return aggregatedItems;
    }

    aggregatedItems.push({
      productId: item.productId,
      quantity: item.quantity,
      availableStock: item.availableStock,
    });

    return aggregatedItems;
  }, []);
}

function saleStockCorrectionChanges(
  currentItems: Array<{ productId: string; quantity: string }>,
  nextItems: Array<{ productId: string; quantity: number }>,
) {
  const productIds = new Set([
    ...currentItems.map((item) => item.productId),
    ...nextItems.map((item) => item.productId),
  ]);
  const currentTotals = aggregateSaleItems(
    currentItems.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
    })),
  );
  const nextTotals = aggregateSaleItems(nextItems);

  return [...productIds].map((productId) => {
    const currentQuantity =
      currentTotals.find((item) => item.productId === productId)?.quantity ?? 0;
    const nextQuantity =
      nextTotals.find((item) => item.productId === productId)?.quantity ?? 0;
    const soldQuantityDifference = Number(
      (nextQuantity - currentQuantity).toFixed(3),
    );

    return {
      productId,
      quantity: Number((-soldQuantityDifference).toFixed(3)),
    };
  });
}
