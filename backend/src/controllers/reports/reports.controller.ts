import {
  getCashReport,
  getInventoryReport,
  getReportsOverview,
  getPurchaseReport,
  getSalesReport,
  getStockReport,
  getUserPerformanceReport,
  type CashReport,
  type CashReportFilters,
  type InventoryReport,
  type InventoryReportColumnKey,
  type InventoryReportFilters,
  type PurchaseReport,
  type PurchaseReportFilters,
  type SalesReport,
  type SalesReportFilters,
  type StockReport,
  type StockReportFilters,
  type UserPerformanceReport,
  type UserPerformanceReportFilters,
} from "../../models/reports/reports.model.js";
import { generateReportPdf } from "../../integrations/pdf/report-pdf.js";
import type { ReportPdfDocument } from "../../integrations/pdf/templates/report-pdf-template.js";

export async function showReportsOverview(filters: { branchId: string }) {
  return {
    code: 200,
    status: "success",
    data: await getReportsOverview(filters),
  };
}

export async function showSalesReport(filters: SalesReportFilters) {
  return {
    code: 200,
    status: "success",
    data: await getSalesReport(filters),
  };
}

export async function showStockReport(filters: StockReportFilters) {
  return {
    code: 200,
    status: "success",
    data: await getStockReport(filters),
  };
}

export async function showInventoryReport(filters: InventoryReportFilters) {
  return {
    code: 200,
    status: "success",
    data: await getInventoryReport(filters),
  };
}

export async function showPurchaseReport(filters: PurchaseReportFilters) {
  return {
    code: 200,
    status: "success",
    data: await getPurchaseReport(filters),
  };
}

export async function showCashReport(filters: CashReportFilters) {
  return {
    code: 200,
    status: "success",
    data: await getCashReport(filters),
  };
}

export async function showUserPerformanceReport(
  filters: UserPerformanceReportFilters,
) {
  return {
    code: 200,
    status: "success",
    data: await getUserPerformanceReport(filters),
  };
}

export async function generateSalesReportPdf(filters: SalesReportFilters) {
  return generateReportPdf(salesReportDocument(await getSalesReport(filters), filters));
}

export async function generateStockReportPdf(filters: StockReportFilters) {
  return generateReportPdf(stockReportDocument(await getStockReport(filters), filters));
}

export async function generateInventoryReportPdf(
  filters: InventoryReportFilters,
) {
  return generateReportPdf(
    inventoryReportDocument(await getInventoryReport(filters), filters),
  );
}

export async function generatePurchaseReportPdf(
  filters: PurchaseReportFilters,
) {
  return generateReportPdf(
    purchaseReportDocument(await getPurchaseReport(filters), filters),
  );
}

export async function generateCashReportPdf(filters: CashReportFilters) {
  return generateReportPdf(cashReportDocument(await getCashReport(filters), filters));
}

export async function generateUserPerformanceReportPdf(
  filters: UserPerformanceReportFilters,
) {
  return generateReportPdf(
    userPerformanceReportDocument(await getUserPerformanceReport(filters), filters),
  );
}

function salesReportDocument(
  report: SalesReport,
  filters: SalesReportFilters,
): ReportPdfDocument {
  return {
    title: "Relatorio comercial",
    subtitle: "Vendas concluidas por produto, cliente, pagamento e curva ABC.",
    generatedAt: new Date(),
    periodLabel: periodLabel(filters),
    metrics: [
      { label: "Vendas", value: report.summary.salesCount },
      { label: "Itens vendidos", value: formatQuantity(report.summary.itemsQuantity) },
      { label: "Bruto", value: formatCurrency(report.summary.grossAmount) },
      { label: "Descontos", value: formatCurrency(report.summary.discountAmount) },
      { label: "Custo", value: formatCurrency(report.summary.costAmount) },
      { label: "Lucro", value: formatCurrency(report.summary.grossProfitAmount) },
      { label: "Liquido", value: formatCurrency(report.summary.netAmount) },
      { label: "Margem", value: `${report.summary.grossMarginPercentage}%` },
    ],
    sections: [
      {
        title: "Vendas por produto",
        emptyMessage: "Nenhuma venda por produto.",
        columns: [
          { label: "Codigo" },
          { label: "Produto" },
          { label: "Qtde", align: "right" },
          { label: "Total", align: "right" },
          { label: "Custo", align: "right" },
          { label: "Lucro", align: "right" },
          { label: "Margem", align: "right" },
        ],
        rows: report.byProduct.map((item) => [
          item.internalCode ?? "",
          item.productName,
          formatQuantity(item.quantity),
          formatCurrency(item.totalAmount),
          formatCurrency(item.costAmount),
          formatCurrency(item.grossProfitAmount),
          `${item.grossMarginPercentage}%`,
        ]),
      },
      {
        title: "Vendas por cliente",
        emptyMessage: "Nenhuma venda por cliente.",
        columns: [
          { label: "Cliente" },
          { label: "Vendas", align: "right" },
          { label: "Total", align: "right" },
        ],
        rows: report.byClient.map((item) => [
          item.clientName,
          item.salesCount,
          formatCurrency(item.totalAmount),
        ]),
      },
      {
        title: "Vendas por pagamento",
        emptyMessage: "Nenhuma venda por pagamento.",
        columns: [
          { label: "Forma de pagamento" },
          { label: "Total", align: "right" },
        ],
        rows: report.byPaymentMethod.map((item) => [
          item.paymentMethodName,
          formatCurrency(item.totalAmount),
        ]),
      },
      {
        title: "Curva ABC",
        emptyMessage: "Nenhum produto para curva ABC.",
        columns: [
          { label: "Produto" },
          { label: "Faturamento", align: "right" },
          { label: "Part.", align: "right" },
          { label: "Acum.", align: "right" },
          { label: "Classe", align: "center" },
        ],
        rows: report.abcProducts.map((item) => [
          item.productName,
          formatCurrency(item.totalAmount),
          `${item.revenueSharePercentage}%`,
          `${item.cumulativeRevenuePercentage}%`,
          item.abcClass,
        ]),
      },
    ],
  };
}

function stockReportDocument(
  report: StockReport,
  filters: StockReportFilters,
): ReportPdfDocument {
  return {
    title: "Relatorio de estoque",
    subtitle:
      "Movimentacoes, custos operacionais, estoque baixo e produtos sem movimentacao.",
    generatedAt: new Date(),
    periodLabel: periodLabel(filters),
    metrics: [
      { label: "Produtos ativos", value: report.summary.activeProductsCount },
      { label: "Movimentacoes", value: report.summary.movementsCount },
      { label: "Entradas", value: formatCurrency(report.summary.entryAmount) },
      { label: "Saidas por custo", value: formatCurrency(report.summary.exitCostAmount) },
      { label: "Qtde entrada", value: formatQuantity(report.summary.entryQuantity) },
      { label: "Qtde saida", value: formatQuantity(report.summary.exitQuantity) },
      { label: "Estoque baixo", value: report.summary.lowStockProductsCount },
      { label: "Sem movimento", value: report.summary.productsWithoutMovementCount },
    ],
    sections: [
      {
        title: "Produtos movimentados",
        emptyMessage: "Nenhum produto movimentado no periodo.",
        columns: [
          { label: "Codigo" },
          { label: "Produto" },
          { label: "Locacao" },
          { label: "Mov.", align: "right" },
          { label: "Entrada", align: "right" },
          { label: "Valor entrada", align: "right" },
          { label: "Saida", align: "right" },
          { label: "Custo saida", align: "right" },
          { label: "Saldo", align: "right" },
          { label: "Ult. mov." },
        ],
        rows: report.movedProducts.map((item) => [
          item.internalCode ?? "",
          item.productName,
          item.location ?? "",
          item.movementsCount,
          formatQuantity(item.entryQuantity),
          formatCurrency(item.entryAmount),
          formatQuantity(item.exitQuantity),
          formatCurrency(item.exitCostAmount),
          formatQuantity(item.netQuantity),
          item.lastMovementAt ? formatDateTime(item.lastMovementAt) : "",
        ]),
      },
      {
        title: "Movimentacoes por tipo",
        emptyMessage: "Nenhuma movimentacao no periodo.",
        columns: [
          { label: "Tipo" },
          { label: "Mov.", align: "right" },
          { label: "Quantidade", align: "right" },
          { label: "Valor base", align: "right" },
        ],
        rows: report.byMovementType.map((item) => [
          stockMovementTypeLabel(item.type),
          item.movementsCount,
          formatQuantity(item.quantity),
          formatCurrency(item.costAmount),
        ]),
      },
      {
        title: "Estoque baixo",
        emptyMessage: "Nenhum produto em estoque baixo.",
        columns: [
          { label: "Codigo" },
          { label: "Produto" },
          { label: "Locacao" },
          { label: "Fisico", align: "right" },
          { label: "Reservado", align: "right" },
          { label: "Disponivel", align: "right" },
          { label: "Minimo", align: "right" },
        ],
        rows: report.lowStockProducts.map((item) => [
          item.internalCode ?? "",
          item.productName,
          item.location ?? "",
          formatQuantity(item.currentStock),
          formatQuantity(item.reservedStock),
          formatQuantity(item.availableStock),
          formatQuantity(item.minimumStock),
        ]),
      },
      {
        title: "Produtos sem movimentacao",
        emptyMessage: "Nenhum produto sem movimentacao.",
        columns: [
          { label: "Codigo" },
          { label: "Produto" },
          { label: "Locacao" },
          { label: "Fisico", align: "right" },
          { label: "Minimo", align: "right" },
        ],
        rows: report.productsWithoutMovement.map((item) => [
          item.internalCode ?? "",
          item.productName,
          item.location ?? "",
          formatQuantity(item.currentStock),
          formatQuantity(item.minimumStock),
        ]),
      },
    ],
  };
}

function inventoryReportDocument(
  report: InventoryReport,
  filters: InventoryReportFilters,
): ReportPdfDocument {
  const columns = inventoryReportColumnsByKeys(
    filters.columns?.length ? filters.columns : defaultInventoryReportColumns,
  );

  return {
    title: "Inventario",
    subtitle: "Arquivo para verificacao, contagem periodica e manutencao.",
    generatedAt: new Date(),
    periodLabel: inventoryFilterLabel(filters),
    metrics: [],
    sections: [
      {
        title: "Itens do inventario",
        emptyMessage: "Nenhum produto encontrado no inventario.",
        columns: columns.map((column) => ({
          label: column.label,
          align: column.align,
        })),
        rows: report.items.map((item) =>
          columns.map((column) => column.value(item)),
        ),
      },
    ],
  };
}

type InventoryReportPdfColumn = {
  key: InventoryReportColumnKey;
  label: string;
  align?: "left" | "right" | "center";
  value: (item: InventoryReport["items"][number]) => string;
};

const defaultInventoryReportColumns: InventoryReportColumnKey[] = [
  "internalCode",
  "productName",
  "unit",
  "currentStock",
  "location",
];

const inventoryReportPdfColumns: InventoryReportPdfColumn[] = [
  {
    key: "internalCode",
    label: "Codigo",
    value: (item) => item.internalCode ?? "",
  },
  { key: "productName", label: "Nome", value: (item) => item.productName },
  {
    key: "unit",
    label: "Unidade",
    align: "center",
    value: (item) => item.unit,
  },
  {
    key: "currentStock",
    label: "Estoque atual",
    align: "right",
    value: (item) => formatQuantity(item.currentStock),
  },
  { key: "location", label: "Locacao", value: (item) => item.location ?? "" },
  { key: "ncm", label: "NCM", value: (item) => item.ncm ?? "" },
  {
    key: "previousStock",
    label: "Estado anterior",
    align: "right",
    value: (item) => formatQuantity(item.previousStock),
  },
  {
    key: "entryQuantity",
    label: "Entrada",
    align: "right",
    value: (item) => formatQuantity(item.entryQuantity),
  },
  {
    key: "exitQuantity",
    label: "Saida",
    align: "right",
    value: (item) => formatQuantity(item.exitQuantity),
  },
  {
    key: "availableStock",
    label: "Disponivel",
    align: "right",
    value: (item) => formatQuantity(item.availableStock),
  },
  {
    key: "costPrice",
    label: "Custo medio",
    align: "right",
    value: (item) => formatCurrency(item.costPrice),
  },
];

function inventoryReportColumnsByKeys(keys: InventoryReportColumnKey[]) {
  return keys
    .map((key) => inventoryReportPdfColumns.find((column) => column.key === key))
    .filter((column): column is InventoryReportPdfColumn => Boolean(column));
}

function purchaseReportDocument(
  report: PurchaseReport,
  filters: PurchaseReportFilters,
): ReportPdfDocument {
  return {
    title: "Gastos com compras",
    subtitle: "Entradas manuais e compras importadas por XML.",
    generatedAt: new Date(),
    periodLabel: periodLabel(filters),
    metrics: [
      { label: "Entradas", value: report.summary.entriesCount },
      { label: "Qtde comprada", value: formatQuantity(report.summary.totalQuantity) },
      { label: "Total comprado", value: formatCurrency(report.summary.totalAmount) },
      { label: "Entrada manual", value: formatCurrency(report.summary.manualAmount) },
      { label: "XML NF-e", value: formatCurrency(report.summary.xmlAmount) },
    ],
    sections: [
      {
        title: "Compras por origem",
        emptyMessage: "Nenhuma compra por origem.",
        columns: [
          { label: "Origem" },
          { label: "Entradas", align: "right" },
          { label: "Quantidade", align: "right" },
          { label: "Total", align: "right" },
        ],
        rows: report.bySource.map((item) => [
          item.source === "XML" ? "XML de compra" : "Entrada manual",
          item.entriesCount,
          formatQuantity(item.totalQuantity),
          formatCurrency(item.totalAmount),
        ]),
      },
      {
        title: "Compras por fornecedor",
        emptyMessage: "Nenhuma compra por fornecedor.",
        columns: [
          { label: "Fornecedor" },
          { label: "Entradas", align: "right" },
          { label: "Total", align: "right" },
        ],
        rows: report.bySupplier.map((item) => [
          item.supplierName,
          item.entriesCount,
          formatCurrency(item.totalAmount),
        ]),
      },
      {
        title: "Compras por produto",
        emptyMessage: "Nenhuma compra por produto.",
        columns: [
          { label: "Produto" },
          { label: "Quantidade", align: "right" },
          { label: "Total", align: "right" },
        ],
        rows: report.byProduct.map((item) => [
          item.productName,
          formatQuantity(item.quantity),
          formatCurrency(item.totalAmount),
        ]),
      },
    ],
  };
}

function cashReportDocument(
  report: CashReport,
  filters: CashReportFilters,
): ReportPdfDocument {
  return {
    title: "Relatorio financeiro de caixa",
    subtitle: "Vendas, devolucoes, suprimentos, sangrias e fechamento.",
    generatedAt: new Date(),
    periodLabel: periodLabel(filters),
    metrics: [
      { label: "Caixas", value: report.summary.sessionsCount },
      { label: "Vendas liquidas", value: formatCurrency(report.summary.netSalesAmount) },
      { label: "Suprimentos", value: formatCurrency(report.summary.supplyAmount) },
      { label: "Sangrias", value: formatCurrency(report.summary.withdrawalAmount) },
      { label: "Fechamento esperado", value: formatCurrency(report.summary.expectedClosingAmount) },
      { label: "Divergencia", value: formatCurrency(report.summary.closedDifferenceAmount) },
    ],
    sections: [
      {
        title: "Caixa por pagamento",
        emptyMessage: "Nenhum pagamento registrado no periodo.",
        columns: [
          { label: "Forma de pagamento" },
          { label: "Bruto", align: "right" },
          { label: "Devolucoes", align: "right" },
          { label: "Liquido", align: "right" },
        ],
        rows: report.byPaymentMethod.map((item) => [
          item.paymentMethodName,
          formatCurrency(item.grossAmount),
          formatCurrency(item.refundAmount),
          formatCurrency(item.netAmount),
        ]),
      },
      {
        title: "Caixas",
        emptyMessage: "Nenhum caixa no periodo.",
        columns: [
          { label: "Operador" },
          { label: "Status" },
          { label: "Abertura" },
          { label: "Vendas", align: "right" },
          { label: "Esperado", align: "right" },
          { label: "Diverg.", align: "right" },
        ],
        rows: report.sessions.map((item) => [
          item.openedByUserName,
          item.status === "OPEN" ? "Aberto" : "Fechado",
          formatDateTime(item.openedAt),
          formatCurrency(item.salesAmount),
          formatCurrency(item.expectedClosingBalance),
          item.difference ? formatCurrency(item.difference) : "",
        ]),
      },
    ],
  };
}

function userPerformanceReportDocument(
  report: UserPerformanceReport,
  filters: UserPerformanceReportFilters,
): ReportPdfDocument {
  return {
    title: "Desempenho por usuario",
    subtitle: "Vendas e acoes operacionais por usuario no periodo.",
    generatedAt: new Date(),
    periodLabel: periodLabel(filters),
    metrics: [
      { label: "Usuarios", value: report.summary.usersCount },
      { label: "Vendas", value: report.summary.salesCount },
      { label: "Liquido", value: formatCurrency(report.summary.netAmount) },
      { label: "Orcamentos", value: report.summary.quotesCreatedCount },
      { label: "Mov. estoque", value: report.summary.stockMovementsCount },
      { label: "NF-e emitidas", value: report.summary.fiscalDocumentsIssuedCount },
    ],
    sections: [
      {
        title: "Resumo por usuario",
        emptyMessage: "Nenhum usuario com acao no periodo.",
        columns: [
          { label: "Usuario" },
          { label: "Vendas", align: "right" },
          { label: "Cancel.", align: "right" },
          { label: "Abertas", align: "right" },
          { label: "Liquido", align: "right" },
          { label: "Orc.", align: "right" },
          { label: "Estoque", align: "right" },
          { label: "NF-e", align: "right" },
        ],
        rows: report.users.map((item) => [
          item.userName,
          item.salesCount,
          item.cancelledSalesCount,
          item.openSalesCount,
          formatCurrency(item.netAmount),
          item.quotesCreatedCount,
          item.stockMovementsCount,
          item.fiscalDocumentsIssuedCount,
        ]),
      },
      {
        title: "Vendas recentes",
        emptyMessage: "Nenhuma venda no periodo.",
        columns: [
          { label: "Venda" },
          { label: "Data" },
          { label: "Usuario" },
          { label: "Cliente" },
          { label: "Status" },
          { label: "Liquido", align: "right" },
        ],
        rows: report.sales.map((item) => [
          `#${item.saleNumber}`,
          formatDateTime(item.createdAt),
          item.userName,
          item.clientName,
          saleStatusLabel(item.status),
          formatCurrency(item.netAmount),
        ]),
      },
    ],
  };
}

function periodLabel(filters: {
  dateFrom?: string;
  dateTo?: string;
}) {
  if (filters.dateFrom && filters.dateTo) {
    return `Periodo: ${formatDate(filters.dateFrom)} a ${formatDate(filters.dateTo)}`;
  }

  if (filters.dateFrom) {
    return `A partir de ${formatDate(filters.dateFrom)}`;
  }

  if (filters.dateTo) {
    return `Ate ${formatDate(filters.dateTo)}`;
  }

  return "Periodo completo";
}

function inventoryFilterLabel(filters: InventoryReportFilters) {
  const parts = [
    typeof filters.active === "boolean"
      ? filters.active
        ? "ativos"
        : "inativos"
      : "todos os cadastros",
    filters.stockStatus && filters.stockStatus !== "ALL"
      ? `estoque ${filters.stockStatus.toLowerCase()}`
      : null,
    filters.search ? `busca: ${filters.search}` : null,
    filters.locations?.length ? `locacoes: ${filters.locations.join(", ")}` : null,
  ].filter(Boolean);

  return parts.join(" | ");
}

function saleStatusLabel(status: string) {
  const labels: Record<string, string> = {
    OPEN: "Em aberto",
    COMPLETED: "Concluida",
    CANCELLED: "Cancelada",
  };

  return labels[status] ?? status;
}

function stockMovementTypeLabel(type: string) {
  const labels: Record<string, string> = {
    ENTRY: "Entrada",
    ADJUSTMENT: "Ajuste manual",
    SALE: "Venda",
    SALE_CANCEL: "Cancelamento de venda",
    SALE_RETURN: "Devolucao de venda",
    SALE_CORRECTION: "Correcao de venda",
  };

  return labels[type] ?? type;
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function formatQuantity(value: string | number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(value: string | Date) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");

    return `${day}/${month}/${year}`;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
  }).format(new Date(value));
}

function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(new Date(value));
}
