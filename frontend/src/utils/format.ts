export function formatQuantity(value: string) {
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

export function formatSignedQuantity(value: string) {
  const quantity = Number(value);
  const prefix = quantity > 0 ? "+" : "";
  return `${prefix}${formatQuantity(value)}`;
}

export function formatCurrency(value: string | number) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}
