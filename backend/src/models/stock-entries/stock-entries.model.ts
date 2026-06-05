import type { Knex } from 'knex'
import { db } from '../../database/knex.js'

export type StockEntryInput = {
  productId: string
  supplierId: string
  quantity: number
  unitCost: number
  notes?: string | null
}

export type StockEntry = {
  id: string
  productId: string
  productName: string
  supplierId: string
  supplierName: string
  createdByUserName: string | null
  quantity: string
  unitCost: string
  notes: string | null
  createdAt: Date
}

export async function listStockEntries(): Promise<StockEntry[]> {
  return db('stock_movements')
    .join('products', 'products.id', 'stock_movements.product_id')
    .join('suppliers', 'suppliers.id', 'stock_movements.supplier_id')
    .leftJoin('users', 'users.id', 'stock_movements.created_by_user_id')
    .where('stock_movements.type', 'ENTRY')
    .select([
      'stock_movements.id',
      'stock_movements.product_id as productId',
      'products.name as productName',
      'stock_movements.supplier_id as supplierId',
      'suppliers.name as supplierName',
      'users.name as createdByUserName',
      'stock_movements.quantity',
      'stock_movements.unit_cost as unitCost',
      'stock_movements.notes',
      'stock_movements.created_at as createdAt',
    ])
    .orderBy('stock_movements.created_at', 'desc')
}

export async function lockProduct(
  transaction: Knex.Transaction,
  productId: string,
): Promise<boolean> {
  const product = await transaction('products')
    .select('id')
    .where('id', productId)
    .forUpdate()
    .first()

  return Boolean(product)
}

export async function supplierExists(
  transaction: Knex.Transaction,
  supplierId: string,
): Promise<boolean> {
  const supplier = await transaction('suppliers')
    .select('id')
    .where('id', supplierId)
    .first()

  return Boolean(supplier)
}

export async function insertStockEntry(
  transaction: Knex.Transaction,
  input: StockEntryInput,
  createdByUserId: string,
): Promise<StockEntry> {
  const [created] = await transaction('stock_movements')
    .insert({
      product_id: input.productId,
      supplier_id: input.supplierId,
      created_by_user_id: createdByUserId,
      type: 'ENTRY',
      quantity: input.quantity,
      unit_cost: input.unitCost,
      notes: input.notes,
    })
    .returning('id')

  const entry = await findStockEntryById(transaction, created.id)

  if (!entry) {
    throw new Error('Stock entry was not found after creation')
  }

  return entry
}

export async function applyStockEntryToProduct(
  transaction: Knex.Transaction,
  input: StockEntryInput,
): Promise<void> {
  await transaction('products')
    .where('id', input.productId)
    .update({
      current_stock: transaction.raw('current_stock + ?', [input.quantity]),
      cost_price: input.unitCost,
      updated_at: transaction.fn.now(),
    })
}

export async function saveLastSupplierCost(
  transaction: Knex.Transaction,
  input: StockEntryInput,
): Promise<void> {
  await transaction('product_suppliers')
    .insert({
      product_id: input.productId,
      supplier_id: input.supplierId,
      last_cost_price: input.unitCost,
    })
    .onConflict(['product_id', 'supplier_id'])
    .merge({
      last_cost_price: input.unitCost,
      updated_at: transaction.fn.now(),
    })
}

async function findStockEntryById(
  transaction: Knex.Transaction,
  id: string,
): Promise<StockEntry | undefined> {
  return transaction('stock_movements')
    .join('products', 'products.id', 'stock_movements.product_id')
    .join('suppliers', 'suppliers.id', 'stock_movements.supplier_id')
    .leftJoin('users', 'users.id', 'stock_movements.created_by_user_id')
    .select([
      'stock_movements.id',
      'stock_movements.product_id as productId',
      'products.name as productName',
      'stock_movements.supplier_id as supplierId',
      'suppliers.name as supplierName',
      'users.name as createdByUserName',
      'stock_movements.quantity',
      'stock_movements.unit_cost as unitCost',
      'stock_movements.notes',
      'stock_movements.created_at as createdAt',
    ])
    .where('stock_movements.id', id)
    .first()
}
