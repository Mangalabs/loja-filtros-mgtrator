import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { useMemo, useState } from "react";
import type { Product } from "../api";
import { formatQuantity } from "../utils/format";
import { productDisplayName } from "../utils/productDisplay";

type ProductSearchFieldProps = {
  disabled?: boolean;
  helperText?: string;
  label: string;
  name: string;
  onChange?: (productId: string) => void;
  products: Product[];
  required?: boolean;
  size?: "medium" | "small";
  stockLabel?: "available" | "current" | "physical-reserved";
  value?: string;
};

export function ProductSearchField({
  disabled,
  helperText = "Pesquise por nome, codigo, codigo de barras, fabricante ou locacao.",
  label,
  name,
  onChange,
  products,
  required,
  size = "medium",
  stockLabel,
  value,
}: ProductSearchFieldProps) {
  const [internalProductId, setInternalProductId] = useState("");
  const sortedProducts = useMemo(
    () =>
      [...products].sort((current, next) =>
        productDisplayName(current).localeCompare(productDisplayName(next)),
      ),
    [products],
  );
  const selectedProductId = value ?? internalProductId;
  const selectedProduct =
    sortedProducts.find((product) => product.id === selectedProductId) ?? null;

  function selectProduct(product: Product | null) {
    const productId = product?.id ?? "";

    setInternalProductId(productId);
    onChange?.(productId);
  }

  return (
    <>
      <input name={name} type="hidden" value={selectedProduct?.id ?? ""} />
      <Autocomplete
        disabled={disabled}
        getOptionLabel={productSearchLabel}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        noOptionsText="Nenhum produto encontrado"
        options={sortedProducts}
        value={selectedProduct}
        filterOptions={(options, state) =>
          filterProducts(options, state.inputValue)
        }
        onChange={(_event, product) => selectProduct(product)}
        renderInput={(params) => (
          <TextField
            {...params}
            helperText={helperText}
            label={label}
            required={required}
            size={size}
          />
        )}
        renderOption={(props, product) => (
          <Box component="li" {...props} key={product.id}>
            <div className="grid gap-0.5">
              <strong>{productDisplayName(product)}</strong>
              <span className="text-xs text-[#5f665f]">
                {productSearchDetails(product, stockLabel)}
              </span>
            </div>
          </Box>
        )}
      />
    </>
  );
}

function filterProducts(products: Product[], inputValue: string) {
  const term = inputValue.trim().toLowerCase();

  return term
    ? products
        .filter((product) => productSearchText(product).includes(term))
        .slice(0, 50)
    : products.slice(0, 50);
}

function productSearchLabel(product: Product) {
  return [
    productDisplayName(product),
    product.internalCode,
    product.barcode,
    product.location,
  ]
    .filter(Boolean)
    .join(" | ");
}

function productSearchText(product: Product) {
  return [
    product.name,
    product.internalCode,
    product.barcode,
    product.brandName,
    product.location,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function productSearchDetails(
  product: Product,
  stockLabel: ProductSearchFieldProps["stockLabel"],
) {
  const details = [
    product.internalCode ? `Codigo ${product.internalCode}` : null,
    product.barcode ? `Barras ${product.barcode}` : null,
    product.location ? `Locacao ${product.location}` : null,
    stockDetail(product, stockLabel),
    product.active ? null : "Inativo",
  ];

  return details.filter(Boolean).join(" - ");
}

function stockDetail(
  product: Product,
  stockLabel: ProductSearchFieldProps["stockLabel"],
) {
  const stockDetails = {
    available: `Disponivel ${formatQuantity(product.availableStock)}`,
    current: `Estoque ${formatQuantity(product.currentStock)}`,
    "physical-reserved": `Fisico ${formatQuantity(product.currentStock)} - reservado ${formatQuantity(product.reservedStock)}`,
  };

  return stockLabel ? stockDetails[stockLabel] : null;
}
