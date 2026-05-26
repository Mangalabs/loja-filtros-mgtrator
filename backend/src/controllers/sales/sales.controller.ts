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

    const product = await lockSaleProduct(transaction, input.productId);

    if (!product || !product.active) {
      throw new AppError("Produto informado nao disponivel para venda.", 422);
    }

    if (Number(product.currentStock) < input.quantity) {
      throw new AppError("Estoque insuficiente para concluir a venda.", 422);
    }

    if (!(await activePaymentMethodExists(transaction, input.paymentMethodId))) {
      throw new AppError("Forma de pagamento informada nao disponivel.", 422);
    }

    if (input.clientId && !(await activeClientExists(transaction, input.clientId))) {
      throw new AppError("Cliente informado nao disponivel.", 422);
    }

    const unitPrice = Number(product.salePrice);
    const totalAmount = Number((unitPrice * input.quantity).toFixed(2));

    return insertSale(
      transaction,
      input,
      cashRegister.id,
      createdByUserId,
      unitPrice,
      totalAmount,
    );
  });

  return {
    code: 201,
    status: "success",
    data: sale,
  };
}
