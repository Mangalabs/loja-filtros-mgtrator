const productFormDraftFields = [
  'productName',
  'internalCode',
  'barcode',
  'brandId',
  'location',
  'unit',
  'costPrice',
  'accessoryExpenses',
  'salePrice',
  'profitMarginPercentage',
  'currentStock',
  'minimumStock',
  'ncm',
  'cest',
  'origin',
  'description',
  'internalNotes',
] as const

export type ProductFormDraftValues = Partial<
  Record<(typeof productFormDraftFields)[number], string>
>

type StoredProductFormDraft = {
  version: 1
  values: ProductFormDraftValues
}

export function productFormDraftStorageKey(scope: string) {
  return `loja-filtros:product-form-draft:v1:${scope}`
}

export function readProductFormDraft(storageKey: string) {
  try {
    const storedValue = window.localStorage.getItem(storageKey)

    if (!storedValue) {
      return null
    }

    const parsed = JSON.parse(storedValue) as unknown

    if (!isStoredProductFormDraft(parsed)) {
      window.localStorage.removeItem(storageKey)
      return null
    }

    return parsed.values
  } catch {
    return null
  }
}

export function writeProductFormDraft(
  storageKey: string,
  form: HTMLFormElement,
) {
  const formData = new FormData(form)
  const values: ProductFormDraftValues = {}

  for (const field of productFormDraftFields) {
    const value = formData.get(field)

    if (typeof value === 'string') {
      values[field] = value
    }
  }

  const draft: StoredProductFormDraft = { version: 1, values }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(draft))
  } catch {
    // The form remains usable when browser storage is unavailable or full.
  }
}

export function clearProductFormDraft(storageKey: string) {
  try {
    window.localStorage.removeItem(storageKey)
  } catch {
    // The product was saved; a storage failure must not affect that result.
  }
}

function isStoredProductFormDraft(
  value: unknown,
): value is StoredProductFormDraft {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>

  if (
    candidate.version !== 1 ||
    !candidate.values ||
    typeof candidate.values !== 'object'
  ) {
    return false
  }

  const values = candidate.values as Record<string, unknown>

  return productFormDraftFields.every(
    (field) => values[field] === undefined || typeof values[field] === 'string',
  )
}
