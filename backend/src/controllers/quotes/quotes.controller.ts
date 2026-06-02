import { db } from "../../database/knex.js";
import { generateQuotePdf } from "../../integrations/pdf/quote-pdf.js";
import {
  activeQuoteClientExists,
  getQuoteById,
  insertQuote,
  listActiveQuoteProducts,
  listQuotes,
  type QuoteInput,
} from "../../models/quotes/quotes.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function indexQuotes() {
  return {
    code: 200,
    status: "success",
    data: await listQuotes(),
  };
}

export async function showQuote(id: string) {
  const quote = await getQuoteById(id);

  if (!quote) {
    throw new AppError("Orcamento nao encontrado.", 404);
  }

  return {
    code: 200,
    status: "success",
    data: quote,
  };
}

export async function showQuotePdf(id: string) {
  const quote = await getQuoteById(id);

  if (!quote) {
    throw new AppError("Orcamento nao encontrado.", 404);
  }

  return {
    filename: `orcamento-${quote.id}.pdf`,
    pdf: await generateQuotePdf(quote),
  };
}

export async function storeQuote(input: QuoteInput, createdByUserId: string) {
  const quote = await db.transaction(async (transaction) => {
    if (!(await activeQuoteClientExists(transaction, input.clientId))) {
      throw new AppError("Cliente informado nao disponivel.", 422);
    }

    const productIds = [...new Set(input.items.map((item) => item.productId))];
    const products = await listActiveQuoteProducts(transaction, productIds);

    if (products.length !== productIds.length) {
      throw new AppError("Um ou mais produtos informados nao estao disponiveis para orcamento.", 422);
    }

    const quoteItems = input.items.map((item, index) => {
      const product = products.find((currentProduct) => currentProduct.id === item.productId);

      if (!product) {
        throw new AppError("Produto informado nao disponivel para orcamento.", 422);
      }

      const unitPrice = item.unitPrice ?? Number(product.salePrice);
      const totalAmount = Number((unitPrice * item.quantity).toFixed(2));

      return {
        productId: item.productId,
        description: item.description?.trim() || product.description || product.name,
        quantity: item.quantity,
        unitPrice,
        totalAmount,
        position: index + 1,
      };
    });
    const totalAmount = Number(
      quoteItems.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(2),
    );

    return insertQuote(transaction, input, createdByUserId, quoteItems, totalAmount);
  });

  return {
    code: 201,
    status: "success",
    data: quote,
  };
}
