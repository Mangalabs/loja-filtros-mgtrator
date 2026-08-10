import type { Knex } from "knex";
import { db } from "../../database/knex.js";

export type PurchaseInvoiceInput = {
  accessKey: string;
  branchId: string;
  installments?: PurchaseInvoiceInstallmentPreview[];
  issueDate?: string | null;
  items: PurchaseInvoiceItemInput[];
  number?: string | null;
  series?: string | null;
  supplierDocument?: string | null;
  supplierId?: string | null;
  supplierName: string;
  totalAmount: number;
  transporterDocument?: string | null;
  transporterName?: string | null;
  xmlContent?: string | null;
};

export type PurchaseInvoiceInstallmentPreview = {
  dueDate?: string | null;
  number?: string | null;
  value: number;
};

export type PurchaseInvoiceDraftInput = Omit<PurchaseInvoiceInput, "branchId">;

export type PurchaseInvoiceUpdateInput = Omit<
  PurchaseInvoiceDraftInput,
  "accessKey" | "xmlContent"
>;

export type PurchaseInvoiceItemInput = {
  cest?: string | null;
  cfop?: string | null;
  description: string;
  ncm?: string | null;
  position: number;
  productId?: string | null;
  quantity: number;
  supplierProductCode?: string | null;
  totalAmount: number;
  unit?: string | null;
  unitCost: number;
};

export type PurchaseInvoice = {
  id: string;
  branchId: string | null;
  branchName: string | null;
  supplierId: string | null;
  supplierName: string;
  supplierDocument: string | null;
  transporterName: string | null;
  transporterDocument: string | null;
  createdByUserName: string;
  accessKey: string;
  number: string | null;
  series: string | null;
  issueDate: string | null;
  totalAmount: string;
  status: "IMPORTED" | "POSTED" | "CANCELLED";
  installments: PurchaseInvoiceInstallment[];
  items: PurchaseInvoiceItem[];
  createdAt: Date;
  updatedAt: Date;
};

export type PurchaseInvoiceInstallment = {
  id: string;
  position: number;
  number: string | null;
  dueDate: string | null;
  value: string;
};

export type PurchaseInvoiceItem = {
  id: string;
  productId: string | null;
  productName: string | null;
  position: number;
  supplierProductCode: string | null;
  description: string;
  cest: string | null;
  ncm: string | null;
  cfop: string | null;
  unit: string | null;
  quantity: string;
  unitCost: string;
  totalAmount: string;
};

type PurchaseInvoiceRow = Omit<PurchaseInvoice, "installments" | "items">;

type PurchaseInvoiceItemRow = PurchaseInvoiceItem & {
  purchaseInvoiceId: string;
};

type PurchaseInvoiceInstallmentRow = PurchaseInvoiceInstallment & {
  purchaseInvoiceId: string;
};

const purchaseInvoiceColumns = [
  "purchase_invoices.id",
  "purchase_invoices.branch_id as branchId",
  "branches.name as branchName",
  "purchase_invoices.supplier_id as supplierId",
  "purchase_invoices.supplier_name as supplierName",
  "purchase_invoices.supplier_document as supplierDocument",
  "purchase_invoices.transporter_name as transporterName",
  "purchase_invoices.transporter_document as transporterDocument",
  "users.name as createdByUserName",
  "purchase_invoices.access_key as accessKey",
  "purchase_invoices.number",
  "purchase_invoices.series",
  "purchase_invoices.issue_date as issueDate",
  "purchase_invoices.total_amount as totalAmount",
  "purchase_invoices.status",
  "purchase_invoices.created_at as createdAt",
  "purchase_invoices.updated_at as updatedAt",
];

export async function listPurchaseInvoices(filters: {
  branchId: string;
}): Promise<PurchaseInvoice[]> {
  const invoices = await db("purchase_invoices")
    .leftJoin("branches", "branches.id", "purchase_invoices.branch_id")
    .join("users", "users.id", "purchase_invoices.created_by_user_id")
    .select<PurchaseInvoiceRow[]>(purchaseInvoiceColumns)
    .where("purchase_invoices.branch_id", filters.branchId)
    .orderBy("purchase_invoices.created_at", "desc")
    .orderBy("purchase_invoices.id", "desc");

  return withPurchaseInvoiceDetails(db, invoices);
}

export async function supplierExists(
  transaction: Knex.Transaction,
  supplierId: string,
  branchId: string,
): Promise<boolean> {
  const supplier = await transaction("suppliers")
    .select("id")
    .where("id", supplierId)
    .andWhere("branch_id", branchId)
    .first();

  return Boolean(supplier);
}

export async function productsExist(
  transaction: Knex.Transaction,
  productIds: string[],
  branchId: string,
): Promise<boolean> {
  if (productIds.length === 0) {
    return true;
  }

  const products = await transaction("products")
    .select("id")
    .where("branch_id", branchId)
    .whereIn("id", productIds);

  return products.length === new Set(productIds).size;
}

export async function insertPurchaseInvoice(
  transaction: Knex.Transaction,
  input: PurchaseInvoiceInput,
  createdByUserId: string,
): Promise<PurchaseInvoice> {
  const [created] = await transaction("purchase_invoices")
    .insert({
      access_key: input.accessKey,
      branch_id: input.branchId,
      created_by_user_id: createdByUserId,
      issue_date: input.issueDate,
      number: input.number,
      series: input.series,
      supplier_document: input.supplierDocument,
      supplier_id: input.supplierId,
      supplier_name: input.supplierName,
      total_amount: input.totalAmount,
      transporter_document: input.transporterDocument,
      transporter_name: input.transporterName,
      xml_content: input.xmlContent,
    })
    .returning("id");

  await transaction("purchase_invoice_items").insert(
    input.items.map((item) => ({
      cfop: item.cfop,
      cest: item.cest,
      description: item.description,
      ncm: item.ncm,
      position: item.position,
      product_id: item.productId,
      purchase_invoice_id: created.id,
      quantity: item.quantity,
      supplier_product_code: item.supplierProductCode,
      total_amount: item.totalAmount,
      unit: item.unit,
      unit_cost: item.unitCost,
    })),
  );
  await replacePurchaseInvoiceInstallments(transaction, created.id, input);

  const invoice = await findPurchaseInvoiceById(
    transaction,
    created.id,
    input.branchId,
  );

  if (!invoice) {
    throw new Error("Purchase invoice was not found after creation");
  }

  return invoice;
}

export async function findPurchaseInvoiceStatus(
  transaction: Knex.Transaction,
  id: string,
  branchId: string,
): Promise<PurchaseInvoice["status"] | undefined> {
  const invoice = await transaction("purchase_invoices")
    .select<{ status: PurchaseInvoice["status"] }>("status")
    .where("id", id)
    .andWhere("branch_id", branchId)
    .forUpdate()
    .first();

  return invoice?.status;
}

export async function findPurchaseInvoiceForPosting(
  transaction: Knex.Transaction,
  id: string,
  branchId: string,
): Promise<PurchaseInvoice | undefined> {
  const invoice = await transaction("purchase_invoices")
    .join("branches", "branches.id", "purchase_invoices.branch_id")
    .join("users", "users.id", "purchase_invoices.created_by_user_id")
    .select<PurchaseInvoiceRow[]>(purchaseInvoiceColumns)
    .where("purchase_invoices.id", id)
    .andWhere("purchase_invoices.branch_id", branchId)
    .forUpdate()
    .first();

  if (!invoice) {
    return undefined;
  }

  const [withDetails] = await withPurchaseInvoiceDetails(transaction, [invoice]);
  return withDetails;
}

export async function markPurchaseInvoiceAsPosted(
  transaction: Knex.Transaction,
  id: string,
  branchId: string,
): Promise<PurchaseInvoice> {
  await transaction("purchase_invoices")
    .where({ id, branch_id: branchId })
    .update({
      status: "POSTED",
      updated_at: transaction.fn.now(),
    });

  const invoice = await findPurchaseInvoiceById(transaction, id, branchId);

  if (!invoice) {
    throw new Error("Purchase invoice was not found after posting");
  }

  return invoice;
}

export async function updatePurchaseInvoiceReview(
  transaction: Knex.Transaction,
  id: string,
  branchId: string,
  input: PurchaseInvoiceUpdateInput,
): Promise<PurchaseInvoice> {
  await transaction("purchase_invoices")
    .where({ id, branch_id: branchId })
    .update({
      issue_date: input.issueDate,
      number: input.number,
      series: input.series,
      supplier_document: input.supplierDocument,
      supplier_id: input.supplierId,
      supplier_name: input.supplierName,
      total_amount: input.totalAmount,
      transporter_document: input.transporterDocument,
      transporter_name: input.transporterName,
      updated_at: transaction.fn.now(),
    });

  await transaction("purchase_invoice_items")
    .where("purchase_invoice_id", id)
    .del();
  await transaction("purchase_invoice_items").insert(
    input.items.map((item) => ({
      cfop: item.cfop,
      cest: item.cest,
      description: item.description,
      ncm: item.ncm,
      position: item.position,
      product_id: item.productId,
      purchase_invoice_id: id,
      quantity: item.quantity,
      supplier_product_code: item.supplierProductCode,
      total_amount: item.totalAmount,
      unit: item.unit,
      unit_cost: item.unitCost,
    })),
  );
  await replacePurchaseInvoiceInstallments(transaction, id, input);

  const invoice = await findPurchaseInvoiceById(transaction, id, branchId);

  if (!invoice) {
    throw new Error("Purchase invoice was not found after review update");
  }

  return invoice;
}

async function findPurchaseInvoiceById(
  transaction: Knex.Transaction,
  id: string,
  branchId: string,
): Promise<PurchaseInvoice | undefined> {
  const invoice = await transaction("purchase_invoices")
    .leftJoin("branches", "branches.id", "purchase_invoices.branch_id")
    .join("users", "users.id", "purchase_invoices.created_by_user_id")
    .select<PurchaseInvoiceRow[]>(purchaseInvoiceColumns)
    .where("purchase_invoices.id", id)
    .andWhere("purchase_invoices.branch_id", branchId)
    .first();

  if (!invoice) {
    return undefined;
  }

  const [withDetails] = await withPurchaseInvoiceDetails(transaction, [invoice]);
  return withDetails;
}

async function withPurchaseInvoiceDetails(
  database: Knex | Knex.Transaction,
  invoices: PurchaseInvoiceRow[],
): Promise<PurchaseInvoice[]> {
  const invoiceIds = invoices.map((invoice) => invoice.id);
  const installments =
    invoiceIds.length > 0
      ? await database("purchase_invoice_installments")
          .select<PurchaseInvoiceInstallmentRow[]>([
            "id",
            "purchase_invoice_id as purchaseInvoiceId",
            "position",
            "number",
            database.raw("purchase_invoice_installments.due_date::text as ??", [
              "dueDate",
            ]),
            "value",
          ])
          .whereIn("purchase_invoice_id", invoiceIds)
          .orderBy("position", "asc")
      : [];
  const items =
    invoiceIds.length > 0
      ? await database("purchase_invoice_items")
          .leftJoin("products", "products.id", "purchase_invoice_items.product_id")
          .select<PurchaseInvoiceItemRow[]>([
            "purchase_invoice_items.id",
            "purchase_invoice_items.purchase_invoice_id as purchaseInvoiceId",
            "purchase_invoice_items.product_id as productId",
            "products.name as productName",
            "purchase_invoice_items.position",
            "purchase_invoice_items.supplier_product_code as supplierProductCode",
            "purchase_invoice_items.description",
            "purchase_invoice_items.cest",
            "purchase_invoice_items.ncm",
            "purchase_invoice_items.cfop",
            "purchase_invoice_items.unit",
            "purchase_invoice_items.quantity",
            "purchase_invoice_items.unit_cost as unitCost",
            "purchase_invoice_items.total_amount as totalAmount",
          ])
          .whereIn("purchase_invoice_items.purchase_invoice_id", invoiceIds)
          .orderBy("purchase_invoice_items.position", "asc")
      : [];

  return invoices.map((invoice) => ({
    ...invoice,
    installments: installments
      .filter((installment) => installment.purchaseInvoiceId === invoice.id)
      .map(
        ({
          purchaseInvoiceId: _purchaseInvoiceId,
          ...installment
        }) => installment,
      ),
    items: items
      .filter((item) => item.purchaseInvoiceId === invoice.id)
      .map(({ purchaseInvoiceId: _purchaseInvoiceId, ...item }) => item),
  }));
}

async function replacePurchaseInvoiceInstallments(
  transaction: Knex.Transaction,
  purchaseInvoiceId: string,
  input: PurchaseInvoiceInput | PurchaseInvoiceUpdateInput,
) {
  await transaction("purchase_invoice_installments")
    .where("purchase_invoice_id", purchaseInvoiceId)
    .del();

  if (!input.installments || input.installments.length === 0) {
    return;
  }

  await transaction("purchase_invoice_installments").insert(
    input.installments.map((installment, index) => ({
      due_date: installment.dueDate ?? null,
      number: installment.number ?? null,
      position: index + 1,
      purchase_invoice_id: purchaseInvoiceId,
      value: installment.value,
    })),
  );
}
