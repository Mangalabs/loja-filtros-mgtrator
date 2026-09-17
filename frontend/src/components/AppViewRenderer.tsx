import Alert from "@mui/material/Alert";
import type {
  CashRegisterSession,
  CashReport,
  CestOption,
  Client,
  CommercialSettings,
  AuthUser,
  NamedEntity,
  FiscalDocument,
  ManualFiscalDocumentDraft,
  FiscalSettings,
  InventoryReport,
  PaymentMethod,
  PickupReservation,
  Product,
  NcmOption,
  ProductPage,
  PurchaseInvoice,
  PurchaseReport,
  Quote,
  QuoteFormDraft,
  ReportsOverview,
  Sale,
  SalesReport,
  ShippingOrder,
  StockAdjustment,
  StockEntry,
  StockMovement,
  StockReport,
  Supplier,
  UserPerformanceReport,
} from "../api";
import type { ReactNode } from "react";
import { canAccessView, type LoadState, type View } from "../navigation";
import { PageHeader, PagePanel } from "./layout";
import type { useCatalogActions } from "../views/catalog/useCatalogActions";
import type {
  ProductStatusFilter,
  ProductStockStatusFilter,
} from "../hooks/useCatalogData";
import {
  BranchesPage,
  EmployeesPage,
  type RequestConfirmation,
} from "../views/administration/AdministrationPages";
import {
  ClientsPage,
  NamedEntityPage,
  ProductForm,
  ProductsPage,
  SuppliersPage,
} from "../views/catalog/CatalogPages";
import { CommercialSettingsPage } from "../views/catalog/CommercialSettingsPage";
import { CashRegisterPage } from "../views/finance/CashRegisterPage";
import {
  ManualFiscalDocumentPage,
  type FiscalPendencyTarget,
} from "../views/finance/FiscalDocumentsPage";
import {
  FiscalOperationsPage,
  type FiscalOperationsTab,
} from "../views/finance/FiscalOperationsPage";
import { FiscalSettingsPage } from "../views/finance/FiscalSettingsPage";
import { PaymentMethodsPage } from "../views/finance/PaymentMethodsPage";
import type { useFinanceActions } from "../views/finance/useFinanceActions";
import { QuoteEditPage, QuotesPage } from "../views/quotes/QuotesPage";
import type { useQuoteActions } from "../views/quotes/useQuoteActions";
import { ReportsPage } from "../views/reports/ReportsPage";
import { SaleEditPage } from "../views/sales/SaleEditPage";
import { SalesHistoryPage } from "../views/sales/SalesHistoryPage";
import {
  SalesOperationsPage,
  type SalesOperationsTab,
} from "../views/sales/SalesOperationsPage";
import type { useSalesActions } from "../views/sales/useSalesActions";
import {
  LowStockPage,
  StockAdjustmentsPage,
  StockEntriesPage,
  StockMovementsPage,
} from "../views/stock/StockPages";
import { PurchaseInvoicesPage } from "../views/stock/PurchaseInvoicesPage";
import type { useStockActions } from "../views/stock/useStockActions";

type AppViewRendererProps = {
  brands: NamedEntity[];
  cashRegister: CashRegisterSession | null;
  cashReport: CashReport | null;
  catalogActions: ReturnType<typeof useCatalogActions>;
  cestOptions: CestOption[];
  clients: Client[];
  commercialSettings: CommercialSettings | null;
  financeActions: ReturnType<typeof useFinanceActions>;
  fiscalDocuments: FiscalDocument[];
  fiscalOperationsInitialTab?: FiscalOperationsTab;
  fiscalQueueSearch: string;
  fiscalSettings: FiscalSettings | null;
  inventoryReport: InventoryReport | null;
  lowStockProducts: Product[];
  manualFiscalDocumentDrafts: ManualFiscalDocumentDraft[];
  ncmOptions: NcmOption[];
  paymentMethods: PaymentMethod[];
  pickupReservations: PickupReservation[];
  productPage: ProductPage;
  productPageIndex: number;
  productRowsPerPage: number;
  productStatusFilter: ProductStatusFilter;
  productStockStatusFilter: ProductStockStatusFilter;
  products: Product[];
  purchaseInvoices: PurchaseInvoice[];
  purchaseReport: PurchaseReport | null;
  quoteFormDrafts: QuoteFormDraft[];
  quoteActions: ReturnType<typeof useQuoteActions>;
  quotes: Quote[];
  reportsOverview: ReportsOverview | null;
  sales: Sale[];
  salesReport: SalesReport | null;
  salesOperationsInitialTab?: SalesOperationsTab;
  saleEditReturnTab?: SalesOperationsTab;
  salesActions: ReturnType<typeof useSalesActions>;
  search: string;
  selectedClient?: Client;
  selectedManualFiscalDocument?: FiscalDocument;
  selectedManualFiscalDocumentDraft?: ManualFiscalDocumentDraft;
  selectedFiscalSale?: Sale;
  selectedProduct?: Product;
  selectedQuote?: Quote;
  reusedQuote?: Quote;
  selectedSale?: Sale;
  shippingOrders: ShippingOrder[];
  state: LoadState;
  stockActions: ReturnType<typeof useStockActions>;
  stockAdjustments: StockAdjustment[];
  stockEntries: StockEntry[];
  stockMovements: StockMovement[];
  stockReport: StockReport | null;
  suppliers: Supplier[];
  userPerformanceReport: UserPerformanceReport | null;
  user: AuthUser;
  view: View;
  onCancelClient: () => void;
  onCancelProductEdit: () => void;
  onCancelQuoteEdit: () => void;
  onCancelSaleEdit: () => void;
  onOpenQuotes: () => void;
  onOpenSaleFiscalQueue: (sale: Sale) => void;
  onProductFiltersChange: (filters: {
    status?: ProductStatusFilter;
    stockStatus?: ProductStockStatusFilter;
  }) => void;
  onProductPageChange: (pageIndex: number, rowsPerPage?: number) => void;
  onResolveFiscalPendency: (target: FiscalPendencyTarget) => void;
  onOpenFiscalDocumentSource: (fiscalDocument: FiscalDocument) => void;
  onOpenManualFiscalDocumentDraft: (
    draft: ManualFiscalDocumentDraft,
  ) => void;
  onOpenSaleFiscalDocumentEditor: (sale: Sale) => void;
  onSearchProducts: (search: string) => Promise<Product[]>;
  onLoadSalesReport: (filters?: {
    dateFrom?: string;
    dateTo?: string;
  }) => Promise<boolean>;
  onLoadCashReport: (filters?: {
    dateFrom?: string;
    dateTo?: string;
  }) => Promise<boolean>;
  onLoadInventoryReport: (filters?: {
    active?: boolean;
    columns?: string[];
    limit?: number;
    locations?: string[];
    search?: string;
    stockStatus?: "ALL" | "LOW" | "NEGATIVE" | "AVAILABLE" | "OUT_OF_STOCK";
  }) => Promise<boolean>;
  onLoadStockReport: (filters?: {
    dateFrom?: string;
    dateTo?: string;
  }) => Promise<boolean>;
  onLoadPurchaseReport: (filters?: {
    dateFrom?: string;
    dateTo?: string;
  }) => Promise<boolean>;
  onLoadUserPerformanceReport: (filters?: {
    dateFrom?: string;
    dateTo?: string;
  }) => Promise<boolean>;
  onSelectView: (view: View) => void;
  onSearchChange: (value: string) => void;
  onSelectClient: (client: Client | undefined) => void;
  onSelectQuote: (quote: Quote) => void;
  onReuseQuote: (quote: Quote) => void;
  onSelectSale: (sale: Sale) => Promise<boolean | void> | boolean | void;
  requestConfirmation: RequestConfirmation;
};

export function AppViewRenderer({
  brands,
  cashRegister,
  cashReport,
  catalogActions,
  cestOptions,
  clients,
  commercialSettings,
  financeActions,
  fiscalDocuments,
  fiscalOperationsInitialTab,
  fiscalQueueSearch,
  fiscalSettings,
  inventoryReport,
  lowStockProducts,
  manualFiscalDocumentDrafts,
  ncmOptions,
  paymentMethods,
  pickupReservations,
  productPage,
  productPageIndex,
  productRowsPerPage,
  productStatusFilter,
  productStockStatusFilter,
  products,
  purchaseInvoices,
  purchaseReport,
  quoteFormDrafts,
  quoteActions,
  quotes,
  reportsOverview,
  sales,
  salesReport,
  salesOperationsInitialTab,
  saleEditReturnTab,
  salesActions,
  search,
  selectedClient,
  selectedManualFiscalDocument,
  selectedManualFiscalDocumentDraft,
  selectedFiscalSale,
  selectedProduct,
  selectedQuote,
  reusedQuote,
  selectedSale,
  shippingOrders,
  state,
  stockActions,
  stockAdjustments,
  stockEntries,
  stockMovements,
  stockReport,
  suppliers,
  userPerformanceReport,
  user,
  view,
  onCancelClient,
  onCancelProductEdit,
  onCancelQuoteEdit,
  onCancelSaleEdit,
  onLoadSalesReport,
  onLoadCashReport,
  onLoadInventoryReport,
  onLoadPurchaseReport,
  onLoadStockReport,
  onLoadUserPerformanceReport,
  onOpenQuotes,
  onOpenSaleFiscalQueue,
  onOpenFiscalDocumentSource,
  onOpenManualFiscalDocumentDraft,
  onOpenSaleFiscalDocumentEditor,
  onProductFiltersChange,
  onProductPageChange,
  onResolveFiscalPendency,
  onSearchProducts,
  onSelectView,
  onSearchChange,
  onSelectClient,
  onSelectQuote,
  onReuseQuote,
  onSelectSale,
  requestConfirmation,
}: AppViewRendererProps) {
  if (!canAccessView(user, view)) {
    return (
      <PagePanel>
        <PageHeader
          description="Solicite ao administrador a liberação desta permissão para o seu usuário."
          title="Acesso não permitido"
        />
        <Alert severity="warning" variant="outlined">
          Seu usuário não possui permissão para acessar esta tela.
        </Alert>
      </PagePanel>
    );
  }

  function renderFiscalOperations(initialTab = fiscalOperationsInitialTab) {
    return (
      <FiscalOperationsPage
        clients={clients}
        fiscalDocuments={fiscalDocuments}
        fiscalSettings={fiscalSettings}
        initialTab={initialTab}
        initialRequestSearch={fiscalQueueSearch}
        pickupReservations={pickupReservations}
        products={products}
        sales={sales}
        shippingOrders={shippingOrders}
        onCancelFiscalDocument={(event, fiscalDocument) =>
          void financeActions.cancelFiscalDocument(event, fiscalDocument)
        }
        onIssueFiscalDocumentCorrectionLetter={(event, fiscalDocument) =>
          financeActions.issueFiscalDocumentCorrectionLetter(
            event,
            fiscalDocument,
          )
        }
        onEditSaleFiscalDocument={onOpenSaleFiscalDocumentEditor}
        onIssuePickupReservationFiscalDocument={(
          reservation,
          additionalInformation,
        ) =>
          void salesActions.issuePickupReservationFiscalDocument(
            reservation,
            additionalInformation,
          )
        }
        onIssueSaleFiscalDocument={(sale, additionalInformation) =>
          void salesActions.issueSaleFiscalDocument(
            sale,
            additionalInformation,
          )
        }
        onIssueShippingOrderFiscalDocument={(order, additionalInformation) =>
          void salesActions.issueShippingOrderFiscalDocument(
            order,
            additionalInformation,
          )
        }
        onOpenFiscalDocumentSource={onOpenFiscalDocumentSource}
        onPreviewPickupReservationFiscalDocument={(
          reservation,
          additionalInformation,
        ) =>
          void salesActions.previewPickupReservationFiscalDocument(
            reservation,
            additionalInformation,
          )
        }
        onPreviewSaleFiscalDocument={(sale, additionalInformation) =>
          void salesActions.previewSaleFiscalDocument(
            sale,
            additionalInformation,
          )
        }
        onPreviewShippingOrderFiscalDocument={(order, additionalInformation) =>
          void salesActions.previewShippingOrderFiscalDocument(
            order,
            additionalInformation,
          )
        }
        onResolveFiscalPendency={onResolveFiscalPendency}
        onSyncFiscalDocument={(fiscalDocument) =>
          void financeActions.syncFiscalDocument(fiscalDocument)
        }
      />
    );
  }

  function renderSalesOperations(initialTab = salesOperationsInitialTab) {
    return (
      <SalesOperationsPage
        cashRegister={cashRegister}
        clients={clients}
        fiscalDocuments={fiscalDocuments}
        initialTab={initialTab}
        paymentMethods={paymentMethods}
        pickupReservations={pickupReservations}
        products={products}
        sales={sales}
        shippingOrders={shippingOrders}
        onApproveShippingOrder={(order) =>
          void salesActions.approveShippingOrder(order)
        }
        onCancelPickupReservation={(event, reservation) =>
          void salesActions.cancelPickupReservation(event, reservation)
        }
        onCancelShippingOrder={(event, order) =>
          void salesActions.cancelShippingOrder(event, order)
        }
        onCompletePickupReservation={(event, reservation) =>
          void salesActions.completePickupReservation(event, reservation)
        }
        onCompleteReopenedSale={(sale) =>
          void salesActions.completeReopenedSale(sale)
        }
        onCompleteShippingOrder={(event, order) =>
          void salesActions.completeShippingOrder(event, order)
        }
        onCreatePickupReservation={salesActions.createPickupReservation}
        onCreateSale={salesActions.createSale}
        onEditSale={onSelectSale}
        onOpenQuotes={onOpenQuotes}
        onOpenSalesHistory={() => onSelectView("sales-history")}
        onOpenSaleFiscalQueue={onOpenSaleFiscalQueue}
        onReturnItem={(event, sale) =>
          void salesActions.returnSaleItem(event, sale)
        }
        onSeparateShippingOrder={(order) =>
          void salesActions.separateShippingOrder(order)
        }
        onUpdateSaleCommercialDetails={(event, sale) =>
          void salesActions.updateSaleCommercialDetails(event, sale)
        }
      />
    );
  }

  const viewRenderers: Record<View, ReactNode> = {
    products: (
        <ProductsPage
          pageIndex={productPageIndex}
          products={productPage.items}
          rowsPerPage={productRowsPerPage}
          search={search}
          state={state}
          statusFilter={productStatusFilter}
          stockStatusFilter={productStockStatusFilter}
          totalProducts={productPage.total}
          onFiltersChange={onProductFiltersChange}
          onPageChange={onProductPageChange}
          onSearchChange={onSearchChange}
          onEdit={catalogActions.editProduct}
          onClone={catalogActions.cloneProduct}
          onChangeStatus={(product) =>
            void catalogActions.changeProductStatus(product)
          }
          onDelete={(product) => void catalogActions.deleteProduct(product)}
        />
      ),
    "new-product": (
        <ProductForm
          brands={brands}
          cestOptions={cestOptions}
          commercialSettings={commercialSettings}
          ncmOptions={ncmOptions}
          product={selectedProduct}
          mode={selectedProduct ? "clone" : "create"}
          onSubmit={catalogActions.createProduct}
          submitLabel={selectedProduct ? "Cadastrar produto clonado" : "Cadastrar produto"}
        />
      ),
    "edit-product": selectedProduct ? (
        <ProductForm
          key={selectedProduct.id}
          brands={brands}
          cestOptions={cestOptions}
          commercialSettings={commercialSettings}
          ncmOptions={ncmOptions}
          product={selectedProduct}
          mode="edit"
          onSubmit={catalogActions.updateProduct}
          onCancel={onCancelProductEdit}
          submitLabel="Salvar alteracoes"
        />
      ) : null,
    "commercial-settings": (
        <CommercialSettingsPage
          settings={commercialSettings}
          onSubmit={catalogActions.saveCommercialSettings}
        />
      ),
    "stock-entries": (
        <StockEntriesPage
          entries={stockEntries}
          products={products}
          suppliers={suppliers}
          onSubmit={stockActions.createStockEntry}
        />
      ),
    "purchase-invoices": (
        <PurchaseInvoicesPage
          invoices={purchaseInvoices}
          products={products}
          suppliers={suppliers}
          onCancelInvoice={(invoice) =>
            void stockActions.cancelPurchaseInvoice(invoice)
          }
          onCreateProductFromItem={stockActions.createProductFromPurchaseItem}
          onParseXml={stockActions.parsePurchaseInvoiceXml}
          onPostInvoice={(invoice) =>
            void stockActions.postPurchaseInvoice(invoice)
          }
          onSaveReview={stockActions.savePurchaseInvoiceReview}
        />
      ),
    "stock-adjustments": (
        <StockAdjustmentsPage
          adjustments={stockAdjustments}
          products={products}
          onSubmit={stockActions.createStockAdjustment}
        />
      ),
    "low-stock": (
      <LowStockPage
        products={lowStockProducts}
        onSearchProducts={onSearchProducts}
        onToggleReplenishmentMonitor={stockActions.toggleReplenishmentMonitor}
      />
    ),
    "stock-movements": <StockMovementsPage movements={stockMovements} />,
    "payment-methods": (
        <PaymentMethodsPage
          paymentMethods={paymentMethods}
          onChangeStatus={(paymentMethod) =>
            void financeActions.changePaymentMethodStatus(paymentMethod)
          }
        />
      ),
    "fiscal-settings": (
        <FiscalSettingsPage
          settings={fiscalSettings}
          onSubmit={(input) => void financeActions.saveFiscalSettings(input)}
        />
      ),
    "fiscal-operations": renderFiscalOperations(),
    "fiscal-documents": renderFiscalOperations("queue"),
    "fiscal-issued-documents": renderFiscalOperations("issued"),
    "manual-fiscal-document": (
      <ManualFiscalDocumentPage
        key={
          selectedFiscalSale?.id ??
          selectedManualFiscalDocument?.id ??
          selectedManualFiscalDocumentDraft?.id ??
          "new"
        }
        clients={clients}
        commercialSettings={commercialSettings}
        manualFiscalDocumentDrafts={manualFiscalDocumentDrafts}
        paymentMethods={paymentMethods}
        products={products}
        sourceDraft={selectedManualFiscalDocumentDraft}
        sourceFiscalDocument={selectedManualFiscalDocument}
        sourceSale={selectedFiscalSale}
        onDeleteManualFiscalDocumentDraft={(draft) =>
          void financeActions.deleteManualFiscalDocumentDraft(draft)
        }
        onIssueManualFiscalDocument={(input) =>
          void financeActions.issueManualFiscalDocument(
            input,
            selectedManualFiscalDocumentDraft,
          )
        }
        onIssueSaleFiscalDocumentInput={(sale, input) =>
          void salesActions.issueEditedSaleFiscalDocument(sale, input)
        }
        onLookupCompany={catalogActions.lookupClientCompany}
        onOpenManualFiscalDocumentDraft={onOpenManualFiscalDocumentDraft}
        onPreviewManualFiscalDocument={(input) =>
          void financeActions.previewManualFiscalDocument(input)
        }
        onPreviewSaleFiscalDocumentInput={(sale, input) =>
          void salesActions.previewEditedSaleFiscalDocument(sale, input)
        }
        onSaveManualFiscalDocumentDraft={(input, draft) =>
          void financeActions.saveManualFiscalDocumentDraft(input, draft)
        }
      />
    ),
    "cash-register": (
        <CashRegisterPage
          session={cashRegister}
          user={user}
          onOpen={financeActions.openCashRegister}
          onClose={financeActions.closeCashRegister}
          onCreateMovement={financeActions.createCashRegisterMovement}
        />
      ),
    reports: (
      <ReportsPage
        cashReport={cashReport}
        inventoryReport={inventoryReport}
        overview={reportsOverview}
        purchaseReport={purchaseReport}
        salesReport={salesReport}
        onLoadCashReport={onLoadCashReport}
        onLoadInventoryReport={onLoadInventoryReport}
        onLoadSalesReport={onLoadSalesReport}
        onLoadPurchaseReport={onLoadPurchaseReport}
        stockReport={stockReport}
        onLoadStockReport={onLoadStockReport}
        userPerformanceReport={userPerformanceReport}
        onLoadUserPerformanceReport={onLoadUserPerformanceReport}
      />
    ),
    "new-quote": (
        <QuotesPage
          clients={clients}
          commercialSettings={commercialSettings}
          mode="form"
          paymentMethods={paymentMethods}
          products={products}
          quoteFormDrafts={quoteFormDrafts}
          quotes={quotes}
          sourceQuote={reusedQuote}
          onSubmit={quoteActions.createQuote}
          onSaveQuoteFormDraft={quoteActions.saveQuoteFormDraft}
          onDeleteQuoteFormDraft={quoteActions.deleteQuoteFormDraft}
          onDiscardQuoteFormDraft={quoteActions.discardQuoteFormDraft}
          onEditQuote={onSelectQuote}
          onReuseQuote={onReuseQuote}
          onCancelQuote={(event, quote) =>
            void quoteActions.cancelQuote(event, quote)
          }
          onCreateShippingOrder={(quote) =>
            void quoteActions.createShippingOrderFromQuote(quote)
          }
        />
      ),
    quotes: (
        <QuotesPage
          clients={clients}
          commercialSettings={commercialSettings}
          mode="list"
          paymentMethods={paymentMethods}
          products={products}
          quoteFormDrafts={quoteFormDrafts}
          quotes={quotes}
          onSubmit={quoteActions.createQuote}
          onSaveQuoteFormDraft={quoteActions.saveQuoteFormDraft}
          onDeleteQuoteFormDraft={quoteActions.deleteQuoteFormDraft}
          onDiscardQuoteFormDraft={quoteActions.discardQuoteFormDraft}
          onEditQuote={onSelectQuote}
          onReuseQuote={onReuseQuote}
          onCancelQuote={(event, quote) =>
            void quoteActions.cancelQuote(event, quote)
          }
          onCreateShippingOrder={(quote) =>
            void quoteActions.createShippingOrderFromQuote(quote)
          }
        />
      ),
    "edit-quote": selectedQuote ? (
      <QuoteEditPage
        clients={clients}
        commercialSettings={commercialSettings}
        paymentMethods={paymentMethods}
        products={products}
        quote={selectedQuote}
        onCancel={onCancelQuoteEdit}
        onSubmit={(quote, input) => quoteActions.updateQuote(quote.id, input)}
      />
    ) : (
      <PagePanel>
        <PageHeader
          description="Selecione um orçamento em rascunho na lista para editar."
          title="Orçamento não selecionado"
        />
      </PagePanel>
    ),
    "sales-operations": renderSalesOperations(),
    sales: renderSalesOperations("direct"),
    "edit-sale": selectedSale ? (
      <SaleEditPage
        clients={clients}
        paymentMethods={paymentMethods}
        products={products}
        sale={selectedSale}
        onCancel={onCancelSaleEdit}
        onSubmit={(sale, input) =>
          salesActions.updateOpenSale(sale, input, saleEditReturnTab)
        }
      />
    ) : (
      <PagePanel>
        <PageHeader
          description="Selecione uma venda aberta no histórico para editar."
          title="Venda não selecionada"
        />
      </PagePanel>
    ),
    "sales-history": (
      <SalesHistoryPage
        fiscalDocuments={fiscalDocuments}
        paymentMethods={paymentMethods}
        pickupReservations={pickupReservations}
        sales={sales}
        shippingOrders={shippingOrders}
        onCompleteReopenedSale={(sale) =>
          void salesActions.completeReopenedSale(sale)
        }
        onEditSale={onSelectSale}
        onOpenSaleFiscalQueue={onOpenSaleFiscalQueue}
        onReturnItem={(event, sale) =>
          void salesActions.returnSaleItem(event, sale)
        }
        onUpdateSaleCommercialDetails={(event, sale) =>
          void salesActions.updateSaleCommercialDetails(event, sale)
        }
      />
    ),
    "shipping-orders": renderSalesOperations("shipping"),
    "pickup-reservations": renderSalesOperations("pickup"),
    brands: (
        <NamedEntityPage
          title="Fabricantes"
          fieldName="brandName"
          items={brands}
          onSubmit={(event) =>
            void catalogActions.createNamedEntity(event, "/brands", "brandName")
          }
        />
      ),
    clients: (
        <ClientsPage
          clients={clients}
          selectedClient={selectedClient}
          onSubmit={catalogActions.saveClient}
          onLookupCompany={catalogActions.lookupClientCompany}
          onEdit={onSelectClient}
          onCancel={onCancelClient}
          onChangeStatus={(client) =>
            void catalogActions.changeClientStatus(client)
          }
          onDelete={(client) => void catalogActions.deleteClient(client)}
        />
      ),
    suppliers: (
        <SuppliersPage
          suppliers={suppliers}
          onSubmit={catalogActions.createSupplier}
        />
      ),
    branches: <BranchesPage />,
    employees: <EmployeesPage requestConfirmation={requestConfirmation} />,
  };

  return <>{viewRenderers[view]}</>;
}
