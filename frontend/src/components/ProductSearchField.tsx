import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { useEffect, useMemo, useState } from "react";
import { apiGet, type ApiResult, type Product } from "../api";
import { formatQuantity } from "../utils/format";
import { productDisplayName } from "../utils/productDisplay";

type ProductSearchFieldProps = {
  defaultValue?: string;
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
  defaultValue,
  disabled,
  helperText = "Pesquise por nome, código, código de barras, fabricante ou locação.",
  label,
  name,
  onChange,
  products,
  required,
  size = "medium",
  stockLabel,
  value,
}: ProductSearchFieldProps) {
  const [internalProductId, setInternalProductId] = useState(
    defaultValue ?? "",
  );
  const [remoteProducts, setRemoteProducts] = useState<Product[]>([]);
  const [inputValue, setInputValue] = useState("");
  const productOptions = useMemo(
    () => uniqueProducts([...products, ...remoteProducts]),
    [products, remoteProducts],
  );
  const sortedProducts = useMemo(() => sortProducts(productOptions), [productOptions]);
  const selectedProductId = value ?? internalProductId;
  const selectedProduct =
    sortedProducts.find((product) => product.id === selectedProductId) ?? null;

  useEffect(() => {
    const term = inputValue.trim();

    if (term.length < 2) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void searchProducts(term, setRemoteProducts).catch(() => undefined);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [inputValue]);

  useEffect(() => {
    if (!selectedProductId || selectedProduct) {
      return;
    }

    void fetchSelectedProduct(selectedProductId, setRemoteProducts).catch(
      () => undefined,
    );
  }, [selectedProduct, selectedProductId]);

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
        onInputChange={(_event, nextValue) => setInputValue(nextValue)}
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

function sortProducts(products: Product[]) {
  return [...products].sort((current, next) =>
    productDisplayName(current).localeCompare(productDisplayName(next)),
  );
}

function uniqueProducts(products: Product[]) {
  const productMap = new Map(products.map((product) => [product.id, product]));

  return [...productMap.values()];
}

async function searchProducts(
  term: string,
  setRemoteProducts: (products: Product[]) => void,
) {
  const params = new URLSearchParams({
    limit: "50",
    page: "1",
    search: term,
  });
  const result = await apiGet<ApiResult<Product[]>>(
    `/products?${params.toString()}`,
  );

  setRemoteProducts(result.data);
}

async function fetchSelectedProduct(
  productId: string,
  setRemoteProducts: (products: Product[]) => void,
) {
  const result = await apiGet<ApiResult<Product>>(`/products/${productId}`);

  setRemoteProducts([result.data]);
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
