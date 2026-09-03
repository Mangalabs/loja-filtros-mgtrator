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
  FiscalDocumentsPage,
  type FiscalPendencyTarget,
} from "../views/finance/FiscalDocumentsPage";
import { FiscalSettingsPage } from "../views/finance/FiscalSettingsPage";
import { PaymentMethodsPage } from "../views/finance/PaymentMethodsPage";
import type { useFinanceActions } from "../views/finance/useFinanceActions";
import { QuoteEditPage, QuotesPage } from "../views/quotes/QuotesPage";
import type { useQuoteActions } from "../views/quotes/useQuoteActions";
import { ReportsPage } from "../views/reports/ReportsPage";
import { SaleEditPage } from "../views/sales/SaleEditPage";
import {
  PickupReservationsPage,
  SalesPage,
  ShippingOrdersPage,
} from "../views/sales/SalesPages";
import { SalesHistoryPage } from "../views/sales/SalesHistoryPage";
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
  fiscalSettings: FiscalSettings | null;
  inventoryReport: InventoryReport | null;
  lowStockProducts: Product[];
  ncmOptions: NcmOption[];
  paymentMethods: PaymentMethod[];
  pickupReservations: PickupReservation[];
  productPage: ProductPage;
  productPageIndex: number;
  productRowsPerPage: number;
  products: Product[];
  purchaseInvoices: PurchaseInvoice[];
  purchaseReport: PurchaseReport | null;
  quoteActions: ReturnType<typeof useQuoteActions>;
  quotes: Quote[];
  reportsOverview: ReportsOverview | null;
  sales: Sale[];
  salesReport: SalesReport | null;
  salesActions: ReturnType<typeof useSalesActions>;
  search: string;
  selectedClient?: Client;
  selectedProduct?: Product;
  selectedQuote?: Quote;
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
  onProductPageChange: (pageIndex: number, rowsPerPage?: number) => void;
  onResolveFiscalPendency: (target: FiscalPendencyTarget) => void;
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
  onSelectSale: (sale: Sale) => void;
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
  fiscalSettings,
  inventoryReport,
  lowStockProducts,
  ncmOptions,
  paymentMethods,
  pickupReservations,
  productPage,
  productPageIndex,
  productRowsPerPage,
  products,
  purchaseInvoices,
  purchaseReport,
  quoteActions,
  quotes,
  reportsOverview,
  sales,
  salesReport,
  salesActions,
  search,
  selectedClient,
  selectedProduct,
  selectedQuote,
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
  onProductPageChange,
  onResolveFiscalPendency,
  onSearchProducts,
  onSelectView,
  onSearchChange,
  onSelectClient,
  onSelectQuote,
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

  const viewRenderers: Record<View, ReactNode> = {
    products: (
        <ProductsPage
          pageIndex={productPageIndex}
          products={productPage.items}
          rowsPerPage={productRowsPerPage}
          search={search}
          state={state}
          totalProducts={productPage.total}
          onPageChange={onProductPageChange}
          onSearchChange={onSearchChange}
          onEdit={catalogActions.editProduct}
          onChangeStatus={(product) =>
            void catalogActions.changeProductStatus(product)
          }
        />
      ),
    "new-product": (
        <ProductForm
          brands={brands}
          cestOptions={cestOptions}
          commercialSettings={commercialSettings}
          ncmOptions={ncmOptions}
          onSubmit={catalogActions.createProduct}
          submitLabel="Cadastrar produto"
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
    "fiscal-documents": (
        <FiscalDocumentsPage
          clients={clients}
          fiscalDocuments={fiscalDocuments}
          fiscalSettings={fiscalSettings}
          pickupReservations={pickupReservations}
          products={products}
          sales={sales}
          shippingOrders={shippingOrders}
          onIssueSaleFiscalDocument={(sale, additionalInformation) =>
            void salesActions.issueSaleFiscalDocument(
              sale,
              additionalInformation,
            )
          }
          onPreviewSaleFiscalDocument={(sale, additionalInformation) =>
            void salesActions.previewSaleFiscalDocument(
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
          onPreviewShippingOrderFiscalDocument={(order, additionalInformation) =>
            void salesActions.previewShippingOrderFiscalDocument(
              order,
              additionalInformation,
            )
          }
          onIssuePickupReservationFiscalDocument={(
            reservation,
            additionalInformation,
          ) =>
            void salesActions.issuePickupReservationFiscalDocument(
              reservation,
              additionalInformation,
            )
          }
          onPreviewPickupReservationFiscalDocument={(
            reservation,
            additionalInformation,
          ) =>
            void salesActions.previewPickupReservationFiscalDocument(
              reservation,
              additionalInformation,
            )
          }
          onResolveFiscalPendency={onResolveFiscalPendency}
          onSyncFiscalDocument={(fiscalDocument) =>
            void financeActions.syncFiscalDocument(fiscalDocument)
          }
          onCancelFiscalDocument={(event, fiscalDocument) =>
            void financeActions.cancelFiscalDocument(event, fiscalDocument)
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
    quotes: (
        <QuotesPage
          clients={clients}
          commercialSettings={commercialSettings}
          paymentMethods={paymentMethods}
          products={products}
          quotes={quotes}
          onSubmit={quoteActions.createQuote}
          onEditQuote={onSelectQuote}
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
    sales: (
        <SalesPage
          cashRegister={cashRegister}
          clients={clients}
          paymentMethods={paymentMethods}
          products={products}
          sales={sales}
          onOpenSalesHistory={() => onSelectView("sales-history")}
          onSubmit={salesActions.createSale}
        />
      ),
    "edit-sale": selectedSale ? (
      <SaleEditPage
        clients={clients}
        paymentMethods={paymentMethods}
        products={products}
        sale={selectedSale}
        onCancel={onCancelSaleEdit}
        onSubmit={salesActions.updateOpenSale}
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
          onUpdateSaleCommercialDetails={(event, sale) =>
            void salesActions.updateSaleCommercialDetails(event, sale)
          }
          onCompleteReopenedSale={(sale) =>
            void salesActions.completeReopenedSale(sale)
          }
          onReopenSale={(sale) => void salesActions.reopenSale(sale)}
          onEditSale={onSelectSale}
          onReturnItem={(event, sale) =>
            void salesActions.returnSaleItem(event, sale)
          }
        />
      ),
    "shipping-orders": (
        <ShippingOrdersPage
          cashRegister={cashRegister}
          paymentMethods={paymentMethods}
          orders={shippingOrders}
          onOpenQuotes={onOpenQuotes}
          onApprove={(order) => void salesActions.approveShippingOrder(order)}
          onSeparate={(order) => void salesActions.separateShippingOrder(order)}
          onComplete={(event, order) =>
            void salesActions.completeShippingOrder(event, order)
          }
          onCancel={(event, order) =>
            void salesActions.cancelShippingOrder(event, order)
          }
        />
      ),
    "pickup-reservations": (
        <PickupReservationsPage
          cashRegister={cashRegister}
          clients={clients}
          paymentMethods={paymentMethods}
          products={products}
          reservations={pickupReservations}
          onSubmit={salesActions.createPickupReservation}
          onComplete={(event, reservation) =>
            void salesActions.completePickupReservation(event, reservation)
          }
          onCancel={(event, reservation) =>
            void salesActions.cancelPickupReservation(event, reservation)
          }
        />
      ),
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
