import type { Knex } from "knex";
import { db } from "../../database/knex.js";

export type SaleInput = {
  paymentMethodId?: string;
  payments?: SalePaymentInput[];
  paymentInstallments?: SalePaymentInstallmentInput[];
  clientId?: string | null;
  billingIssueDate?: string | null;
  billingDueDate?: string | null;
  discountAmount: number;
  allowInsufficientStock?: boolean;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
};

export type SalePaymentInput = {
  paymentMethodId: string;
  amount: number;
};

export type SalePaymentInstallmentInput = {
  dueDate: string;
  amount: number;
  position: number;
};

export type Sale = {
  id: string;
  saleNumber: number;
  branchId: string | null;
  branchName: string | null;
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  subtotalAmount: string;
  discountAmount: string;
  totalAmount: string;
  billingIssueDate: string | null;
  billingDueDate: string | null;
  items: SaleItem[];
  clientId: string | null;
  clientPersonType: "PF" | "PJ" | "ES" | null;
  clientName: string | null;
  clientDocument: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientStateRegistration: string | null;
  clientStateRegistrationIndicator: "1" | "2" | "9" | null;
  clientAddressStreet: string | null;
  clientAddressNumber: string | null;
  clientAddressComplement: string | null;
  clientAddressDistrict: string | null;
  clientAddressCity: string | null;
  clientAddressState: string | null;
  clientAddressZipCode: string | null;
  paymentMethodCode: string;
  paymentMethodName: string;
  payments: SalePayment[];
  paymentInstallments: SalePaymentInstallment[];
  createdByUserName: string;
  createdAt: Date;
  cancelledByUserName: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  status: "OPEN" | "COMPLETED" | "CANCELLED";
};

export type SalePayment = {
  id: string;
  paymentMethodId: string;
  paymentMethodCode: string;
  paymentMethodName: string;
  amount: string;
};

export type SalePaymentInstallment = {
  id: string;
  saleId: string;
  position: number;
  dueDate: string;
  amount: string;
};

export type SaleItem = {
  id: string;
  productId: string;
  productInternalCode: string | null;
  productName: string;
  productCfop: string | null;
  productIcmsCst: string | null;
  productNcm: string | null;
  productPisCst: string | null;
  productCofinsCst: string | null;
  productOrigin: string | null;
  productUnit: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  totalAmount: string;
  returnedQuantity: string;
  returnableQuantity: string;
  returns: SaleItemReturn[];
  position: number;
};

export type SaleItemReturn = {
  id: string;
  quantity: string;
  reason: string;
  refundAmount: string;
  refundPaymentMethodId: string;
  refundPaymentMethodName: string;
  refundedAt: Date;
  refundReference: string | null;
  createdByUserName: string;
  createdAt: Date;
};

export type SaleItemForReturn = {
  id: string;
  saleId: string;
  productId: string;
  quantity: string;
  totalAmount: string;
};

export type SaleReturnRefundInput = {
  refundAmount: number;
  refundPaymentMethodId: string;
  refundedAt: string;
  refundReference?: string | null;
};

export type SaleCommercialDetailsInput = {
  billingIssueDate?: string | null;
  billingDueDate?: string | null;
  payments?: SalePaymentInput[];
};

export type SaleProduct = {
  id: string;
  name: string;
  salePrice: string;
  currentStock: string;
  reservedStock: string;
  active: boolean;
};

const saleColumns = [
  "sales.id",
  "sales.sale_number as saleNumber",
  "sales.branch_id as branchId",
  "branches.name as branchName",
  "sales.subtotal_amount as subtotalAmount",
  "sales.discount_amount as discountAmount",
  "sales.total_amount as totalAmount",
  "sales.billing_issue_date as billingIssueDate",
  "sales.billing_due_date as billingDueDate",
  "sales.client_id as clientId",
  "clients.person_type as clientPersonType",
  "clients.name as clientName",
  "clients.document as clientDocument",
  "clients.email as clientEmail",
  "clients.phone as clientPhone",
  "clients.state_registration as clientStateRegistration",
  "clients.state_registration_indicator as clientStateRegistrationIndicator",
  "clients.address_street as clientAddressStreet",
  "clients.address_number as clientAddressNumber",
  "clients.address_complement as clientAddressComplement",
  "clients.address_district as clientAddressDistrict",
  "clients.address_city as clientAddressCity",
  "clients.address_state as clientAddressState",
  "clients.address_zip_code as clientAddressZipCode",
  "users.name as createdByUserName",
  "sales.created_at as createdAt",
  "cancelled_users.name as cancelledByUserName",
  "sales.cancelled_at as cancelledAt",
  "sales.cancellation_reason as cancellationReason",
  "sales.status",
];

const saleItemColumns = [
  "sale_items.id",
  "sale_items.sale_id as saleId",
  "sale_items.product_id as productId",
  "products.internal_code as productInternalCode",
  "products.name as productName",
  "products.cfop as productCfop",
  "products.icms_cst as productIcmsCst",
  "products.ncm as productNcm",
  "products.pis_cst as productPisCst",
  "products.cofins_cst as productCofinsCst",
  "products.origin as productOrigin",
  "products.unit as productUnit",
  "sale_items.quantity",
  "sale_items.unit_price as unitPrice",
  "sale_items.discount_amount as discountAmount",
  "sale_items.total_amount as totalAmount",
  "sale_items.position",
];

type SaleRow = Omit<
  Sale,
  | "items"
  | "payments"
  | "paymentInstallments"
  | "paymentMethodCode"
  | "paymentMethodName"
  | "productId"
  | "productName"
  | "quantity"
  | "unitPrice"
>;
type SaleItemRow = Omit<SaleItem, "returnableQuantity" | "returns"> & {
  saleId: string;
};
type SalePaymentRow = SalePayment & {
  saleId: string;
};
type SalePaymentInstallmentRow = SalePaymentInstallment;
type SaleItemReturnRow = SaleItemReturn & {
  saleItemId: string;
};

export async function listSales(filters: { branchId: string }): Promise<Sale[]> {
  const sales = await saleQuery(db)
    .where("sales.branch_id", filters.branchId)
    .orderBy("sales.created_at", "desc");
  return withSaleItems(db, sales);
}

export async function getSaleById(
  id: string,
  database: Knex | Knex.Transaction = db,
  filters?: { branchId?: string | null },
): Promise<Sale | undefined> {
  const sale = await saleQuery(database)
    .where("sales.id", id)
    .modify((query) => {
      if (filters?.branchId) {
        query.where("sales.branch_id", filters.branchId);
      }
    })
    .first();

  if (!sale) {
    return undefined;
  }

  const [withItems] = await withSaleItems(database, [sale]);
  return withItems;
}

export async function findOpenCashRegister(
  transaction: Knex.Transaction,
  branchId: string,
): Promise<{ id: string } | undefined> {
  return transaction("cash_register_sessions")
    .select("id")
    .where("branch_id", branchId)
    .where("status", "OPEN")
    .forUpdate()
    .first();
}

export async function lockSaleForCancellation(
  transaction: Knex.Transaction,
  id: string,
  branchId: string,
): Promise<
  { id: string; status: Sale["status"]; totalAmount: string } | undefined
> {
  return transaction("sales")
    .select(["id", "status", "total_amount as totalAmount"])
    .where({ id, branch_id: branchId })
    .forUpdate()
    .first();
}

export async function saleHasLinkedOperation(
  transaction: Knex.Transaction,
  saleId: string,
): Promise<boolean> {
  const linkedShippingOrder = await transaction("shipping_orders")
    .select("id")
    .where("sale_id", saleId)
    .first();

  if (linkedShippingOrder) {
    return true;
  }

  const linkedPickupReservation = await transaction("pickup_reservations")
    .select("id")
    .where("sale_id", saleId)
    .first();

  return Boolean(linkedPickupReservation);
}

export async function saleHasBlockingFiscalDocument(
  transaction: Knex.Transaction,
  saleId: string,
): Promise<boolean> {
  const sourceRefs = await saleFiscalDocumentSourceRefs(transaction, saleId);
  const fiscalDocument = await transaction("fiscal_documents")
    .select("id")
    .where((builder) => {
      for (const sourceRef of sourceRefs) {
        builder.orWhere({
          source_type: sourceRef.sourceType,
          source_id: sourceRef.sourceId,
        });
      }
    })
    .whereIn("status", ["PENDING", "PROCESSING", "AUTHORIZED"])
    .first();

  return Boolean(fiscalDocument);
}

async function saleFiscalDocumentSourceRefs(
  transaction: Knex.Transaction,
  saleId: string,
) {
  const linkedShippingOrders = await transaction("shipping_orders")
    .select<{ id: string }[]>(["id"])
    .where("sale_id", saleId);
  const linkedPickupReservations = await transaction("pickup_reservations")
    .select<{ id: string }[]>(["id"])
    .where("sale_id", saleId);

  return [
    { sourceType: "SALE", sourceId: saleId },
    ...linkedShippingOrders.map((order) => ({
      sourceType: "SHIPPING_ORDER",
      sourceId: order.id,
    })),
    ...linkedPickupReservations.map((reservation) => ({
      sourceType: "PICKUP_RESERVATION",
      sourceId: reservation.id,
    })),
  ];
}

export async function lockSaleItemForReturn(
  transaction: Knex.Transaction,
  saleId: string,
  saleItemId: string,
): Promise<SaleItemForReturn | undefined> {
  return transaction("sale_items")
    .select([
      "id",
      "sale_id as saleId",
      "product_id as productId",
      "quantity",
      "total_amount as totalAmount",
    ])
    .where({ id: saleItemId, sale_id: saleId })
    .forUpdate()
    .first();
}

export async function salePaymentMethodId(
  transaction: Knex.Transaction,
  saleId: string,
): Promise<string | undefined> {
  const payment = await transaction("sale_payments")
    .select("payment_method_id as paymentMethodId")
    .where("sale_id", saleId)
    .first<{ paymentMethodId: string }>();

  return payment?.paymentMethodId;
}

export async function returnedSaleItemQuantity(
  transaction: Knex.Transaction,
  saleItemId: string,
): Promise<number> {
  const result = await transaction("sale_item_returns")
    .where("sale_item_id", saleItemId)
    .sum<{ total: string | null }>("quantity as total")
    .first();

  return Number(result?.total ?? 0);
}

export async function lockSaleProduct(
  transaction: Knex.Transaction,
  productId: string,
  branchId: string,
): Promise<SaleProduct | undefined> {
  return transaction("products")
    .select([
      "id",
      "name",
      "sale_price as salePrice",
      "current_stock as currentStock",
      "reserved_stock as reservedStock",
      "active",
    ])
    .where({ id: productId, branch_id: branchId })
    .forUpdate()
    .first();
}

export async function activePaymentMethodExists(
  transaction: Knex.Transaction,
  paymentMethodId: string,
): Promise<boolean> {
  const paymentMethod = await transaction("payment_methods")
    .select("id")
    .where({ id: paymentMethodId, active: true })
    .first();

  return Boolean(paymentMethod);
}

export async function activeClientExists(
  transaction: Knex.Transaction,
  clientId: string,
  branchId: string,
): Promise<boolean> {
  const client = await transaction("clients")
    .select("id")
    .where({ id: clientId, branch_id: branchId, active: true })
    .first();

  return Boolean(client);
}

export async function cancelSale(
  transaction: Knex.Transaction,
  id: string,
  cancelledByUserId: string,
  reason: string,
): Promise<Sale> {
  const saleItems = await transaction("sale_items")
    .select<Array<{ productId: string; quantity: string }>>([
      "product_id as productId",
      "quantity",
    ])
    .where("sale_id", id);

  await transaction("sales").where("id", id).update({
    status: "CANCELLED",
    cancelled_by_user_id: cancelledByUserId,
    cancelled_at: transaction.fn.now(),
    cancellation_reason: reason,
  });

  await transaction("stock_movements").insert(
    saleItems.map((item) => ({
      product_id: item.productId,
      sale_id: id,
      created_by_user_id: cancelledByUserId,
      type: "SALE_CANCEL",
      quantity: Number(item.quantity),
      notes: reason,
    })),
  );

  for (const item of aggregateSaleItems(
    saleItems.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
    })),
  )) {
    await transaction("products")
      .where("id", item.productId)
      .update({
        current_stock: transaction.raw("current_stock + ?", [item.quantity]),
        updated_at: transaction.fn.now(),
      });
  }

  const sale = await getSaleById(id, transaction);

  if (!sale) {
    throw new Error("Sale was not found after cancellation");
  }

  return sale;
}

export async function updateSaleStatus(
  transaction: Knex.Transaction,
  id: string,
  status: Extract<Sale["status"], "OPEN" | "COMPLETED">,
): Promise<Sale> {
  await transaction("sales").where("id", id).update({
    status,
  });

  const sale = await getSaleById(id, transaction);

  if (!sale) {
    throw new Error("Sale was not found after status update");
  }

  return sale;
}

export async function returnSaleItem(
  transaction: Knex.Transaction,
  saleId: string,
  saleItem: SaleItemForReturn,
  quantity: number,
  createdByUserId: string,
  reason: string,
  refund: SaleReturnRefundInput,
): Promise<Sale> {
  await transaction("sale_item_returns").insert({
    sale_id: saleId,
    sale_item_id: saleItem.id,
    product_id: saleItem.productId,
    created_by_user_id: createdByUserId,
    quantity,
    reason,
    refund_amount: refund.refundAmount,
    refund_payment_method_id: refund.refundPaymentMethodId,
    refunded_at: refund.refundedAt,
    refund_reference: refund.refundReference,
  });

  await transaction("stock_movements").insert({
    product_id: saleItem.productId,
    sale_id: saleId,
    created_by_user_id: createdByUserId,
    type: "SALE_RETURN",
    quantity,
    notes: reason,
  });

  await transaction("products")
    .where("id", saleItem.productId)
    .update({
      current_stock: transaction.raw("current_stock + ?", [quantity]),
      updated_at: transaction.fn.now(),
    });

  const sale = await getSaleById(saleId, transaction);

  if (!sale) {
    throw new Error("Sale was not found after item return");
  }

  return sale;
}

export async function updateSaleCommercialDetails(
  transaction: Knex.Transaction,
  saleId: string,
  input: SaleCommercialDetailsInput,
): Promise<Sale> {
  await transaction("sales").where("id", saleId).update({
    billing_issue_date: input.billingIssueDate,
    billing_due_date: input.billingDueDate,
  });

  if (input.payments) {
    await transaction("sale_payments").where("sale_id", saleId).delete();
    await transaction("sale_payments").insert(
      input.payments.map((payment) => ({
        sale_id: saleId,
        payment_method_id: payment.paymentMethodId,
        amount: payment.amount,
      })),
    );
  }

  await transaction("sale_payment_installments")
    .where("sale_id", saleId)
    .delete();

  if (input.billingDueDate) {
    const payments = await transaction("sale_payments")
      .select("payment_method_id as paymentMethodId", "amount")
      .where("sale_id", saleId)
      .orderBy("id", "asc");

    await transaction("sale_payment_installments").insert(
      payments.map((payment, index) => ({
        sale_id: saleId,
        position: index + 1,
        due_date: input.billingDueDate,
        amount: payment.amount,
      })),
    );
  }

  const sale = await getSaleById(saleId, transaction);

  if (!sale) {
    throw new Error("Sale was not found after commercial details update");
  }

  return sale;
}

export async function insertSale(
  transaction: Knex.Transaction,
  input: SaleInput,
  cashRegisterSessionId: string,
  createdByUserId: string,
  branchId: string,
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    position: number;
  }>,
  subtotalAmount: number,
  totalAmount: number,
): Promise<Sale> {
  const payments = input.payments ?? [
    {
      paymentMethodId: input.paymentMethodId as string,
      amount: totalAmount,
    },
  ];
  const paymentInstallments = salePaymentInstallments(input, payments);
  const [created] = await transaction("sales")
    .insert({
      sale_number: await nextSaleNumber(transaction, branchId),
      cash_register_session_id: cashRegisterSessionId,
      created_by_user_id: createdByUserId,
      branch_id: branchId,
      client_id: input.clientId,
      subtotal_amount: subtotalAmount,
      discount_amount: input.discountAmount,
      total_amount: totalAmount,
      billing_issue_date: input.billingIssueDate,
      billing_due_date: input.billingDueDate,
    })
    .returning("id");

  await transaction("sale_items").insert(
    items.map((item) => ({
      sale_id: created.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      discount_amount: saleItemDiscountAmount(item),
      total_amount: item.totalAmount,
      position: item.position,
    })),
  );

  await transaction("sale_payments").insert(
    payments.map((payment) => ({
      sale_id: created.id,
      payment_method_id: payment.paymentMethodId,
      amount: payment.amount,
    })),
  );

  if (paymentInstallments.length > 0) {
    await transaction("sale_payment_installments").insert(
      paymentInstallments.map((installment) => ({
        sale_id: created.id,
        position: installment.position,
        due_date: installment.dueDate,
        amount: installment.amount,
      })),
    );
  }

  await transaction("stock_movements").insert(
    items.map((item) => ({
      product_id: item.productId,
      sale_id: created.id,
      created_by_user_id: createdByUserId,
      type: "SALE",
      quantity: -item.quantity,
    })),
  );

  for (const item of aggregateSaleItems(items)) {
    await transaction("products")
      .where("id", item.productId)
      .update({
        current_stock: transaction.raw("current_stock - ?", [item.quantity]),
        updated_at: transaction.fn.now(),
      });
  }

  const sale = await saleQuery(transaction)
    .where("sales.id", created.id)
    .first();

  if (!sale) {
    throw new Error("Sale was not found after creation");
  }

  const [withItems] = await withSaleItems(transaction, [sale]);
  return withItems;
}

async function nextSaleNumber(
  transaction: Knex.Transaction,
  branchId: string,
): Promise<number> {
  await transaction.raw("select pg_advisory_xact_lock(hashtext(?))", [
    `sale-number:${branchId}`,
  ]);

  const current = await transaction("sales")
    .where("branch_id", branchId)
    .max<{ max: string | null }>("sale_number as max")
    .first();

  return Number(current?.max ?? 0) + 1;
}

function saleQuery(database: Knex | Knex.Transaction) {
  return database("sales")
    .leftJoin("branches", "branches.id", "sales.branch_id")
    .join("users", "users.id", "sales.created_by_user_id")
    .leftJoin(
      { cancelled_users: "users" },
      "cancelled_users.id",
      "sales.cancelled_by_user_id",
    )
    .leftJoin("clients", "clients.id", "sales.client_id")
    .select<SaleRow[]>(saleColumns);
}

async function withSaleItems(
  database: Knex | Knex.Transaction,
  sales: SaleRow[],
): Promise<Sale[]> {
  if (sales.length === 0) {
    return [];
  }

  const saleIds = sales.map((sale) => sale.id);
  const payments = await database("sale_payments")
    .join(
      "payment_methods",
      "payment_methods.id",
      "sale_payments.payment_method_id",
    )
    .select<SalePaymentRow[]>([
      "sale_payments.id",
      "sale_payments.sale_id as saleId",
      "sale_payments.payment_method_id as paymentMethodId",
      "payment_methods.code as paymentMethodCode",
      "payment_methods.name as paymentMethodName",
      "sale_payments.amount",
    ])
    .whereIn("sale_payments.sale_id", saleIds)
    .orderBy("payment_methods.name", "asc");
  const paymentInstallments = await database("sale_payment_installments")
    .select<SalePaymentInstallmentRow[]>([
      "sale_payment_installments.id",
      "sale_payment_installments.sale_id as saleId",
      "sale_payment_installments.position",
      database.raw("sale_payment_installments.due_date::text as ??", [
        "dueDate",
      ]),
      "sale_payment_installments.amount",
    ])
    .whereIn("sale_payment_installments.sale_id", saleIds)
    .orderBy("sale_payment_installments.position", "asc");
  const items = await database("sale_items")
    .join("products", "products.id", "sale_items.product_id")
    .select<SaleItemRow[]>([
      ...saleItemColumns,
      database.raw(
        `coalesce(
          (
            select sum(sale_item_returns.quantity)
            from sale_item_returns
            where sale_item_returns.sale_item_id = sale_items.id
          ),
          0
        )::numeric(12, 3) as "returnedQuantity"`,
      ),
    ])
    .whereIn("sale_items.sale_id", saleIds)
    .orderBy("sale_items.position", "asc");
  const itemIds = items.map((item) => item.id);
  const returns = itemIds.length
    ? await database("sale_item_returns")
        .join(
          "payment_methods",
          "payment_methods.id",
          "sale_item_returns.refund_payment_method_id",
        )
        .join("users", "users.id", "sale_item_returns.created_by_user_id")
        .select<SaleItemReturnRow[]>([
          "sale_item_returns.id",
          "sale_item_returns.sale_item_id as saleItemId",
          "sale_item_returns.quantity",
          "sale_item_returns.reason",
          "sale_item_returns.refund_amount as refundAmount",
          "sale_item_returns.refund_payment_method_id as refundPaymentMethodId",
          "payment_methods.name as refundPaymentMethodName",
          "sale_item_returns.refunded_at as refundedAt",
          "sale_item_returns.refund_reference as refundReference",
          "users.name as createdByUserName",
          "sale_item_returns.created_at as createdAt",
        ])
        .whereIn("sale_item_returns.sale_item_id", itemIds)
        .orderBy("sale_item_returns.created_at", "asc")
    : [];

  return sales.map((sale) => {
    const saleItems = items
      .filter((item) => item.saleId === sale.id)
      .map(({ saleId: _saleId, ...item }) => ({
        ...item,
        returnableQuantity: saleItemReturnableQuantity(item),
        returns: saleItemReturns(returns, item.id),
      }));
    const salePayments = payments
      .filter((payment) => payment.saleId === sale.id)
      .map(({ saleId: _saleId, ...payment }) => payment);
    const saleInstallments = paymentInstallments.filter(
      (installment) => installment.saleId === sale.id,
    );
    const firstItem = saleItems[0];
    const firstPayment = salePayments[0];

    return {
      ...sale,
      productId: firstItem?.productId ?? "",
      productName: firstItem?.productName ?? "",
      quantity: firstItem?.quantity ?? "0.000",
      unitPrice: firstItem?.unitPrice ?? "0.00",
      paymentMethodCode:
        salePayments.length > 1
          ? "MULTIPLE"
          : (firstPayment?.paymentMethodCode ?? ""),
      paymentMethodName: salePaymentSummary(salePayments),
      payments: salePayments,
      paymentInstallments: saleInstallments,
      items: saleItems,
    };
  });
}

function salePaymentInstallments(
  input: SaleInput,
  payments: SalePaymentInput[],
): SalePaymentInstallmentInput[] {
  if (input.paymentInstallments?.length) {
    return input.paymentInstallments;
  }

  if (!input.billingDueDate) {
    return [];
  }

  return payments.map((payment, index) => ({
    amount: payment.amount,
    dueDate: input.billingDueDate as string,
    position: index + 1,
  }));
}

function salePaymentSummary(payments: SalePayment[]) {
  if (payments.length === 0) {
    return "Nao informado";
  }

  if (payments.length === 1) {
    return payments[0].paymentMethodName;
  }

  return payments.map((payment) => payment.paymentMethodName).join(" + ");
}

function saleItemReturns(returns: SaleItemReturnRow[], saleItemId: string) {
  return returns
    .filter((itemReturn) => itemReturn.saleItemId === saleItemId)
    .map(({ saleItemId: _saleItemId, ...itemReturn }) => itemReturn);
}

function saleItemReturnableQuantity(item: {
  quantity: string;
  returnedQuantity: string;
}) {
  return Math.max(
    Number(item.quantity) - Number(item.returnedQuantity),
    0,
  ).toFixed(3);
}

function saleItemDiscountAmount(item: {
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}) {
  const fullAmount = Number((item.quantity * item.unitPrice).toFixed(2));
  return Number(Math.max(fullAmount - item.totalAmount, 0).toFixed(2));
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
