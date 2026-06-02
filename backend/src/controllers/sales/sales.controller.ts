import { db } from "../../database/knex.js";
import {
  activeClientExists,
  activePaymentMethodExists,
  findOpenCashRegister,
  insertSale,
  listSales,
  lockSaleProduct,
  type SaleInput,
} from "../../models/sales/sales.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function indexSales() {
  return {
    code: 200,
    status: "success",
    data: await listSales(),
  };
}

export async function storeSale(input: SaleInput, createdByUserId: string) {
  const sale = await db.transaction(async (transaction) => {
    const cashRegister = await findOpenCashRegister(transaction);

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
      const product = await lockSaleProduct(transaction, item.productId);

      if (!product || !product.active) {
        throw new AppError("Produto informado nao disponivel para venda.", 422);
      }

      saleItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(product.salePrice),
        totalAmount: Number((Number(product.salePrice) * item.quantity).toFixed(2)),
        position: index + 1,
        availableStock: Number(product.currentStock) - Number(product.reservedStock),
      });
    }

    for (const item of aggregateSaleItems(saleItems)) {
      if (item.availableStock < item.quantity) {
        throw new AppError("Estoque insuficiente para concluir a venda.", 422);
      }
    }

    if (!(await activePaymentMethodExists(transaction, input.paymentMethodId))) {
      throw new AppError("Forma de pagamento informada nao disponivel.", 422);
    }

    if (input.clientId && !(await activeClientExists(transaction, input.clientId))) {
      throw new AppError("Cliente informado nao disponivel.", 422);
    }

    const totalAmount = Number(
      saleItems.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(2),
    );

    return insertSale(
      transaction,
      input,
      cashRegister.id,
      createdByUserId,
      saleItems,
      totalAmount,
    );
  });

  return {
    code: 201,
    status: "success",
    data: sale,
  };
}

function aggregateSaleItems(
  items: Array<{ productId: string; quantity: number; availableStock: number }>,
) {
  return items.reduce<Array<{ productId: string; quantity: number; availableStock: number }>>(
    (aggregatedItems, item) => {
      const existing = aggregatedItems.find((currentItem) => currentItem.productId === item.productId);

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
    },
    [],
  );
}
