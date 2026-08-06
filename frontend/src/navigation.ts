import type { AuthUser, EmployeePermission } from "./api";

export type LoadState = "idle" | "loading" | "ready" | "error";

export type View =
  | "products"
  | "new-product"
  | "edit-product"
  | "commercial-settings"
  | "stock-entries"
  | "purchase-invoices"
  | "stock-adjustments"
  | "stock-movements"
  | "low-stock"
  | "payment-methods"
  | "fiscal-settings"
  | "fiscal-documents"
  | "cash-register"
  | "reports"
  | "quotes"
  | "sales"
  | "sales-history"
  | "shipping-orders"
  | "pickup-reservations"
  | "brands"
  | "clients"
  | "suppliers"
  | "branches"
  | "employees";

export type NavSectionKey =
  | "products"
  | "catalog"
  | "stock"
  | "suppliers"
  | "finance"
  | "cash"
  | "reports"
  | "sales"
  | "administration";

export const navSectionViews: Record<NavSectionKey, View[]> = {
  products: ["products", "new-product", "edit-product", "commercial-settings"],
  catalog: ["brands", "clients"],
  stock: [
    "stock-entries",
    "purchase-invoices",
    "stock-adjustments",
    "stock-movements",
    "low-stock",
  ],
  suppliers: ["suppliers"],
  finance: ["payment-methods", "fiscal-settings", "fiscal-documents"],
  cash: ["cash-register"],
  reports: ["reports"],
  sales: [
    "quotes",
    "sales",
    "sales-history",
    "shipping-orders",
    "pickup-reservations",
  ],
  administration: ["branches", "employees"],
};

const initialOpenNavSections: Record<NavSectionKey, boolean> = {
  products: false,
  catalog: false,
  stock: false,
  suppliers: false,
  finance: false,
  cash: false,
  reports: false,
  sales: false,
  administration: false,
};

export const navSectionsStorageKey = "loja-filtros.nav-sections.v2";
export const activeViewStorageKey = "loja-filtros.active-view.v1";

const viewValues: View[] = [
  "products",
  "new-product",
  "edit-product",
  "commercial-settings",
  "stock-entries",
  "purchase-invoices",
  "stock-adjustments",
  "stock-movements",
  "low-stock",
  "payment-methods",
  "fiscal-settings",
  "fiscal-documents",
  "cash-register",
  "reports",
  "quotes",
  "sales",
  "sales-history",
  "shipping-orders",
  "pickup-reservations",
  "brands",
  "clients",
  "suppliers",
  "branches",
  "employees",
];

export const viewPermissionRequirements: Partial<
  Record<View, EmployeePermission>
> = {
  "commercial-settings": "MANAGE_COMMERCIAL_SETTINGS",
  "purchase-invoices": "IMPORT_PURCHASE_INVOICES",
  "stock-adjustments": "MANAGE_STOCK_ADJUSTMENTS",
  "payment-methods": "MANAGE_PAYMENT_METHODS",
  "fiscal-settings": "MANAGE_FISCAL_SETTINGS",
  "fiscal-documents": "MANAGE_FISCAL_DOCUMENTS",
  "cash-register": "MANAGE_CASH_REGISTER",
  reports: "VIEW_REPORTS",
};

export function canAccessView(user: AuthUser, view: View) {
  const requiredPermission = viewPermissionRequirements[view];

  return (
    user.role === "ADMIN" ||
    !requiredPermission ||
    user.permissions.includes(requiredPermission)
  );
}

export function isView(value: string | null): value is View {
  return viewValues.includes(value as View);
}

export function findActiveNavSection(view: View) {
  return (Object.keys(navSectionViews) as NavSectionKey[]).find((section) =>
    navSectionViews[section].includes(view),
  );
}

export function readInitialOpenNavSections() {
  if (typeof window === "undefined") {
    return initialOpenNavSections;
  }

  const storedValue = window.localStorage.getItem(navSectionsStorageKey);

  if (!storedValue) {
    return initialOpenNavSections;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as Partial<
      Record<NavSectionKey, boolean>
    >;

    return (Object.keys(initialOpenNavSections) as NavSectionKey[]).reduce(
      (sections, section) => ({
        ...sections,
        [section]:
          typeof parsedValue[section] === "boolean"
            ? parsedValue[section]
            : sections[section],
      }),
      { ...initialOpenNavSections },
    );
  } catch {
    return initialOpenNavSections;
  }
}

export const viewTitles: Record<View, { title: string; description: string }> =
  {
    products: {
      title: "Produtos",
      description: "Consulte e acompanhe o catalogo da filial.",
    },
    "new-product": {
      title: "Novo produto",
      description:
        "Cadastre filtros com códigos, fabricante, locação e dados fiscais.",
    },
    "edit-product": {
      title: "Editar produto",
      description: "Atualize os dados cadastrais do produto selecionado.",
    },
    "commercial-settings": {
      title: "Configuração comercial",
      description:
        "Defina margem, prazos e sugestões de preço de venda.",
    },
    "stock-entries": {
      title: "Entrada de mercadoria",
      description:
        "Registre produtos recebidos e atualize o estoque da filial.",
    },
    "purchase-invoices": {
      title: "Importação XML",
      description:
        "Leia XML de compra, revise os itens e confirme os produtos internos.",
    },
    "stock-adjustments": {
      title: "Ajuste de estoque",
      description: "Corrija divergências de saldo com motivo registrado.",
    },
    "stock-movements": {
      title: "Histórico de estoque",
      description:
        "Acompanhe entradas e ajustes que alteraram o saldo da filial.",
    },
    "low-stock": {
      title: "Reposição",
      description: "Consulte produtos ativos que atingiram o estoque mínimo.",
    },
    "payment-methods": {
      title: "Formas de pagamento",
      description:
        "Configure as formas disponiveis para o futuro fechamento de vendas.",
    },
    "fiscal-settings": {
      title: "Configuração fiscal",
      description:
        "Defina provedor, ambiente e CNPJ usados na emissão de NF-e.",
    },
    "fiscal-documents": {
      title: "Notas fiscais",
      description:
        "Acompanhe emissão, status e referências fiscais das vendas.",
    },
    "cash-register": {
      title: "Caixa",
      description:
        "Abra o caixa da filial antes de iniciar operacoes de venda.",
    },
    reports: {
      title: "Relatórios",
      description: "Acompanhe indicadores operacionais e pendências da filial.",
    },
    quotes: {
      title: "Orçamentos",
      description:
        "Monte orçamentos com cliente, múltiplos produtos e valores personalizados.",
    },
    sales: {
      title: "Venda de balcão",
      description:
        "Registre a venda imediata de um produto com baixa de estoque.",
    },
    "sales-history": {
      title: "Histórico de vendas",
      description:
        "Consulte vendas fechadas, comprovantes e documentos fiscais.",
    },
    "shipping-orders": {
      title: "Pedidos para envio",
      description:
        "Conclua pedidos originados de orçamentos aprovados pelo cliente.",
    },
    "pickup-reservations": {
      title: "Reservas para retirada",
      description:
        "Reserve produtos para clientes retirarem na loja e conclua a venda no caixa.",
    },
    brands: {
      title: "Fabricantes",
      description: "Cadastre os fabricantes usados no catalogo de produtos.",
    },
    clients: {
      title: "Clientes",
      description:
        "Cadastre clientes para reservas e futuros documentos fiscais.",
    },
    suppliers: {
      title: "Fornecedores",
      description: "Mantenha fornecedores disponiveis para compras e produtos.",
    },
    branches: {
      title: "Filiais",
      description: "Cadastre as unidades usadas para organizar os funcionarios.",
    },
    employees: {
      title: "Funcionários",
      description:
        "Crie acessos individuais e vincule cada funcionário a uma filial.",
    },
  };
