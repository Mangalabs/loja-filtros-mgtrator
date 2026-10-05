import { db } from '../../database/knex.js'

export type QuoteProductAlias = {
  id: string
  branchId: string
  productId: string
  alias: string
  normalizedAlias: string
  createdByUserId: string
  updatedByUserId: string
  deletedByUserId: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export async function upsertQuoteProductAlias(input: {
  alias: string
  branchId: string
  createdByUserId: string
  normalizedAlias: string
  productId: string
}): Promise<QuoteProductAlias> {
  const [saved] = await db('quote_product_aliases')
    .insert({
      alias: input.alias,
      branch_id: input.branchId,
      created_by_user_id: input.createdByUserId,
      updated_by_user_id: input.createdByUserId,
      normalized_alias: input.normalizedAlias,
      product_id: input.productId,
    })
    .onConflict(['branch_id', 'product_id', 'normalized_alias'])
    .merge({
      alias: input.alias,
      deleted_at: null,
      deleted_by_user_id: null,
      updated_by_user_id: input.createdByUserId,
      updated_at: db.fn.now(),
    })
    .returning(quoteProductAliasColumns)

  return saved
}

export async function deleteQuoteProductAlias(filters: {
  branchId: string
  id: string
  userId: string
}): Promise<boolean> {
  const deleted = await db('quote_product_aliases')
    .where('id', filters.id)
    .where('branch_id', filters.branchId)
    .whereNull('deleted_at')
    .update({
      deleted_at: db.fn.now(),
      deleted_by_user_id: filters.userId,
      updated_at: db.fn.now(),
      updated_by_user_id: filters.userId,
    })

  return deleted > 0
}

const quoteProductAliasColumns = [
  'id',
  'branch_id as branchId',
  'product_id as productId',
  'alias',
  'normalized_alias as normalizedAlias',
  'created_by_user_id as createdByUserId',
  'updated_by_user_id as updatedByUserId',
  'deleted_by_user_id as deletedByUserId',
  'created_at as createdAt',
  'updated_at as updatedAt',
  'deleted_at as deletedAt',
]
