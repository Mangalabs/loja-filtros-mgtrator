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
import { QuotesPage } from "../views/quotes/QuotesPage";
import type { useQuoteActions } from "../views/quotes/useQuoteActions";
import { ReportsPage } from "../views/reports/ReportsPage";
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
  shippingOrders: ShippingOrder[];
  state: LoadState;
  stockActions: ReturnType<typeof useStockActions>;
  stockAdjustments: StockAdjustment[];
  stockEntries: StockEntry[];
  stockMovements: StockMovement[];
  stockReport: StockReport | null;
  suppliers: Supplier[];
  user: AuthUser;
  view: View;
  onCancelClient: () => void;
  onCancelProductEdit: () => void;
  onOpenQuotes: () => void;
  onProductPageChange: (pageIndex: number, rowsPerPage?: number) => void;
  onResolveFiscalPendency: (target: FiscalPendencyTarget) => void;
  onLoadSalesReport: (filters?: {
    dateFrom?: string;
    dateTo?: string;
  }) => Promise<boolean>;
  onLoadCashReport: (filters?: {
    dateFrom?: string;
    dateTo?: string;
  }) => Promise<boolean>;
  onLoadStockReport: (filters?: {
    dateFrom?: string;
    dateTo?: string;
  }) => Promise<boolean>;
  onLoadPurchaseReport: (filters?: {
    dateFrom?: string;
    dateTo?: string;
  }) => Promise<boolean>;
  onSelectView: (view: View) => void;
  onSearchChange: (value: string) => void;
  onSelectClient: (client: Client | undefined) => void;
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
  shippingOrders,
  state,
  stockActions,
  stockAdjustments,
  stockEntries,
  stockMovements,
  stockReport,
  suppliers,
  user,
  view,
  onCancelClient,
  onCancelProductEdit,
  onLoadSalesReport,
  onLoadCashReport,
  onLoadPurchaseReport,
  onLoadStockReport,
  onOpenQuotes,
  onProductPageChange,
  onResolveFiscalPendency,
  onSelectView,
  onSearchChange,
  onSelectClient,
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
        catalogProducts={products}
        products={lowStockProducts}
        onToggleReplenishmentMonitor={(product) =>
          void stockActions.toggleReplenishmentMonitor(product)
        }
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
          onIssueSaleFiscalDocument={(sale) =>
            void salesActions.issueSaleFiscalDocument(sale)
          }
          onIssueShippingOrderFiscalDocument={(order) =>
            void salesActions.issueShippingOrderFiscalDocument(order)
          }
          onIssuePickupReservationFiscalDocument={(reservation) =>
            void salesActions.issuePickupReservationFiscalDocument(reservation)
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
        overview={reportsOverview}
        purchaseReport={purchaseReport}
        salesReport={salesReport}
        onLoadCashReport={onLoadCashReport}
        onLoadSalesReport={onLoadSalesReport}
        onLoadPurchaseReport={onLoadPurchaseReport}
        stockReport={stockReport}
        onLoadStockReport={onLoadStockReport}
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
          onUpdate={quoteActions.updateQuote}
          onCancelQuote={(event, quote) =>
            void quoteActions.cancelQuote(event, quote)
          }
          onCreateShippingOrder={(quote) =>
            void quoteActions.createShippingOrderFromQuote(quote)
          }
        />
      ),
    sales: (
        <SalesPage
          cashRegister={cashRegister}
          clients={clients}
          fiscalDocuments={fiscalDocuments}
          paymentMethods={paymentMethods}
          pickupReservations={pickupReservations}
          products={products}
          sales={sales}
          shippingOrders={shippingOrders}
          onReturnItem={(event, sale) =>
            void salesActions.returnSaleItem(event, sale)
          }
          onSubmit={salesActions.createSale}
        />
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
