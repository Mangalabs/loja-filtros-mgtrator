export type LoadState = "idle" | "loading" | "ready" | "error";

export type View =
  | "products"
  | "new-product"
  | "edit-product"
  | "stock-entries"
  | "stock-adjustments"
  | "stock-movements"
  | "low-stock"
  | "payment-methods"
  | "fiscal-documents"
  | "cash-register"
  | "reports"
  | "quotes"
  | "sales"
  | "shipping-orders"
  | "pickup-reservations"
  | "brands"
  | "clients"
  | "suppliers";

export type NavSectionKey =
  | "products"
  | "catalog"
  | "stock"
  | "suppliers"
  | "finance"
  | "cash"
  | "reports"
  | "sales";

export const navSectionViews: Record<NavSectionKey, View[]> = {
  products: ["products", "new-product", "edit-product"],
  catalog: ["brands", "clients"],
  stock: ["stock-entries", "stock-adjustments", "stock-movements", "low-stock"],
  suppliers: ["suppliers"],
  finance: ["payment-methods", "fiscal-documents"],
  cash: ["cash-register"],
  reports: ["reports"],
  sales: ["quotes", "sales", "shipping-orders", "pickup-reservations"],
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
};

export const navSectionsStorageKey = "loja-filtros.nav-sections.v2";

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
        "Cadastre filtros com codigos, fabricante, locacao e dados fiscais.",
    },
    "edit-product": {
      title: "Editar produto",
      description: "Atualize os dados cadastrais do produto selecionado.",
    },
    "stock-entries": {
      title: "Entrada de mercadoria",
      description:
        "Registre produtos recebidos e atualize o estoque da filial.",
    },
    "stock-adjustments": {
      title: "Ajuste de estoque",
      description: "Corrija divergencias de saldo com motivo registrado.",
    },
    "stock-movements": {
      title: "Historico de estoque",
      description:
        "Acompanhe entradas e ajustes que alteraram o saldo da filial.",
    },
    "low-stock": {
      title: "Reposicao",
      description: "Consulte produtos ativos que atingiram o estoque minimo.",
    },
    "payment-methods": {
      title: "Formas de pagamento",
      description:
        "Configure as formas disponiveis para o futuro fechamento de vendas.",
    },
    "fiscal-documents": {
      title: "Notas fiscais",
      description:
        "Acompanhe emissao, status e referencias fiscais das vendas.",
    },
    "cash-register": {
      title: "Caixa",
      description:
        "Abra o caixa da filial antes de iniciar operacoes de venda.",
    },
    reports: {
      title: "Relatorios",
      description: "Acompanhe indicadores operacionais e pendencias da filial.",
    },
    quotes: {
      title: "Orcamentos",
      description:
        "Monte orcamentos com cliente, multiplos produtos e valores personalizados.",
    },
    sales: {
      title: "Venda de balcao",
      description:
        "Registre a venda imediata de um produto com baixa de estoque.",
    },
    "shipping-orders": {
      title: "Pedidos para envio",
      description:
        "Registre orcamentos aprovados pelo cliente e separe os produtos para envio.",
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
  };
