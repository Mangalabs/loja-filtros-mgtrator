import { db } from "../../database/knex.js";
import { generateQuotePdf } from "../../integrations/pdf/quote-pdf.js";
import {
  activeQuoteClientExists,
  cancelQuote,
  getQuoteById,
  insertQuote,
  listActiveQuoteProducts,
  listQuotes,
  lockQuoteForCancellation,
  updateQuote,
  type QuoteInput,
} from "../../models/quotes/quotes.model.js";
import {
  findShippingOrderByQuoteId,
  insertShippingOrderFromQuote,
} from "../../models/shipping-orders/shipping-orders.model.js";
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
    const { quoteItems, totalAmount } = await prepareQuoteInput(
      transaction,
      input,
    );

    return insertQuote(
      transaction,
      input,
      createdByUserId,
      quoteItems,
      totalAmount,
    );
  });

  return {
    code: 201,
    status: "success",
    data: quote,
  };
}

export async function updateDraftQuote(id: string, input: QuoteInput) {
  const quote = await db.transaction(async (transaction) => {
    const currentQuote = await getQuoteById(id, transaction);

    if (!currentQuote) {
      throw new AppError("Orcamento nao encontrado.", 404);
    }

    if (currentQuote.status === "CANCELLED") {
      throw new AppError("Orcamento cancelado nao pode ser editado.", 409);
    }

    const existingOrder = await findShippingOrderByQuoteId(transaction, id);

    if (existingOrder) {
      throw new AppError(
        "Orcamento enviado para pedido de envio deve seguir o fluxo do pedido.",
        409,
      );
    }

    const { quoteItems, totalAmount } = await prepareQuoteInput(
      transaction,
      input,
    );

    return updateQuote(transaction, id, input, quoteItems, totalAmount);
  });

  return {
    code: 200,
    status: "success",
    data: quote,
  };
}

export async function createShippingOrderFromQuote(
  id: string,
  createdByUserId: string,
) {
  const order = await db.transaction(async (transaction) => {
    const quote = await getQuoteById(id, transaction);

    if (!quote) {
      throw new AppError("Orcamento nao encontrado.", 404);
    }

    const existingOrder = await findShippingOrderByQuoteId(transaction, id);

    if (existingOrder) {
      throw new AppError(
        "Este orcamento ja foi enviado para pedidos de envio.",
        409,
      );
    }

    if (quote.items.length === 0) {
      throw new AppError(
        "Orcamento sem itens nao pode gerar pedido de envio.",
        422,
      );
    }

    if (quote.status === "CANCELLED") {
      throw new AppError(
        "Orcamento cancelado nao pode gerar pedido de envio.",
        409,
      );
    }

    return insertShippingOrderFromQuote(transaction, quote, createdByUserId);
  });

  return {
    code: 201,
    status: "success",
    data: order,
  };
}

export async function cancelDraftQuote(
  id: string,
  reason: string,
  cancelledByUserId: string,
) {
  const quote = await db.transaction(async (transaction) => {
    const currentQuote = await lockQuoteForCancellation(transaction, id);

    if (!currentQuote) {
      throw new AppError("Orcamento nao encontrado.", 404);
    }

    if (currentQuote.status === "CANCELLED") {
      throw new AppError("Este orcamento ja foi cancelado.", 409);
    }

    const existingOrder = await findShippingOrderByQuoteId(transaction, id);

    if (existingOrder) {
      throw new AppError(
        "Orcamento enviado para pedido de envio deve seguir o fluxo do pedido.",
        409,
      );
    }

    return cancelQuote(transaction, id, cancelledByUserId, reason);
  });

  return {
    code: 200,
    status: "success",
    data: quote,
  };
}

async function prepareQuoteInput(
  transaction: Parameters<typeof activeQuoteClientExists>[0],
  input: QuoteInput,
) {
  if (!(await activeQuoteClientExists(transaction, input.clientId))) {
    throw new AppError("Cliente informado nao disponivel.", 422);
  }

  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const products = await listActiveQuoteProducts(transaction, productIds);

  if (products.length !== productIds.length) {
    throw new AppError(
      "Um ou mais produtos informados nao estao disponiveis para orcamento.",
      422,
    );
  }

  const quoteItems = input.items.map((item, index) => {
    const product = products.find(
      (currentProduct) => currentProduct.id === item.productId,
    );

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

  return { quoteItems, totalAmount };
}
