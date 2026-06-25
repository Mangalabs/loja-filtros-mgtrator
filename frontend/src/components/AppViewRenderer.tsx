import type {
  CashRegisterSession,
  Client,
  AuthUser,
  NamedEntity,
  FiscalDocument,
  FiscalSettings,
  PaymentMethod,
  PickupReservation,
  Product,
  Quote,
  ReportsOverview,
  Sale,
  ShippingOrder,
  StockAdjustment,
  StockEntry,
  StockMovement,
  Supplier,
} from "../api";
import type { ReactNode } from "react";
import type { LoadState, View } from "../navigation";
import type { useCatalogActions } from "../views/catalog/useCatalogActions";
import {
  ClientsPage,
  NamedEntityPage,
  ProductForm,
  ProductsPage,
  SuppliersPage,
} from "../views/catalog/CatalogPages";
import { CashRegisterPage } from "../views/finance/CashRegisterPage";
import { FiscalDocumentsPage } from "../views/finance/FiscalDocumentsPage";
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
import type { useSalesActions } from "../views/sales/useSalesActions";
import {
  LowStockPage,
  StockAdjustmentsPage,
  StockEntriesPage,
  StockMovementsPage,
} from "../views/stock/StockPages";
import type { useStockActions } from "../views/stock/useStockActions";

type AppViewRendererProps = {
  brands: NamedEntity[];
  cashRegister: CashRegisterSession | null;
  catalogActions: ReturnType<typeof useCatalogActions>;
  clients: Client[];
  financeActions: ReturnType<typeof useFinanceActions>;
  filteredProducts: Product[];
  fiscalDocuments: FiscalDocument[];
  fiscalSettings: FiscalSettings | null;
  lowStockProducts: Product[];
  paymentMethods: PaymentMethod[];
  pickupReservations: PickupReservation[];
  products: Product[];
  quoteActions: ReturnType<typeof useQuoteActions>;
  quotes: Quote[];
  reportsOverview: ReportsOverview | null;
  sales: Sale[];
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
  suppliers: Supplier[];
  user: AuthUser;
  view: View;
  onCancelClient: () => void;
  onCancelProductEdit: () => void;
  onOpenQuotes: () => void;
  onSearchChange: (value: string) => void;
  onSelectClient: (client: Client | undefined) => void;
};

export function AppViewRenderer({
  brands,
  cashRegister,
  catalogActions,
  clients,
  financeActions,
  filteredProducts,
  fiscalDocuments,
  fiscalSettings,
  lowStockProducts,
  paymentMethods,
  pickupReservations,
  products,
  quoteActions,
  quotes,
  reportsOverview,
  sales,
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
  suppliers,
  user,
  view,
  onCancelClient,
  onCancelProductEdit,
  onOpenQuotes,
  onSearchChange,
  onSelectClient,
}: AppViewRendererProps) {
  const viewRenderers: Record<View, ReactNode> = {
    products: (
        <ProductsPage
          products={filteredProducts}
          search={search}
          state={state}
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
          onSubmit={catalogActions.createProduct}
          submitLabel="Cadastrar produto"
        />
      ),
    "edit-product": selectedProduct ? (
        <ProductForm
          key={selectedProduct.id}
          brands={brands}
          product={selectedProduct}
          onSubmit={catalogActions.updateProduct}
          onCancel={onCancelProductEdit}
          submitLabel="Salvar alteracoes"
        />
      ) : null,
    "stock-entries": (
        <StockEntriesPage
          entries={stockEntries}
          products={products}
          suppliers={suppliers}
          onSubmit={stockActions.createStockEntry}
        />
      ),
    "stock-adjustments": (
        <StockAdjustmentsPage
          adjustments={stockAdjustments}
          products={products}
          onSubmit={stockActions.createStockAdjustment}
        />
      ),
    "low-stock": <LowStockPage products={lowStockProducts} />,
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
    reports: <ReportsPage overview={reportsOverview} />,
    quotes: (
        <QuotesPage
          clients={clients}
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
          paymentMethods={paymentMethods}
          products={products}
          sales={sales}
          onSubmit={salesActions.createSale}
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
  };

  return <>{viewRenderers[view]}</>;
}
