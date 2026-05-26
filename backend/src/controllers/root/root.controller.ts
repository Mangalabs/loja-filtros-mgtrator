export function showApiInfo() {
  return {
    code: 200,
    status: "success",
    data: {
      service: "loja-filtros-backend",
      version: "0.1.0",
      endpoints: [
        "/health",
        "/health/database",
        "/products",
        "/products/low-stock",
        "/payment-methods",
        "/clients",
        "/stock-adjustments",
        "/stock-entries",
        "/brands",
        "/product-groups",
        "/suppliers",
      ],
    },
  };
}
