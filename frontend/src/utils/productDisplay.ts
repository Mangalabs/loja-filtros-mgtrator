type ProductDisplayData = {
  name: string
  brandName?: string | null
}

export function productDisplayName(product: ProductDisplayData) {
  return [product.name, product.brandName].filter(Boolean).join(' ')
}
