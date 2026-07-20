import { useCallback, useState } from "react";
import type { AuthUser, Client, Product } from "../api";
import { useCatalogData } from "../hooks/useCatalogData";
import { useConfirmation } from "../hooks/useConfirmation";
import { useNavigationState } from "../hooks/useNavigationState";
import {
  activeViewStorageKey,
  canAccessView,
  isView,
  viewTitles,
  type View,
} from "../navigation";
import { useCatalogActions } from "../views/catalog/useCatalogActions";
import { useFinanceActions } from "../views/finance/useFinanceActions";
import { useQuoteActions } from "../views/quotes/useQuoteActions";
import { useSalesActions } from "../views/sales/useSalesActions";
import { useStockActions } from "../views/stock/useStockActions";
import { AppSidebar } from "./AppSidebar";
import { AppViewRenderer } from "./AppViewRenderer";
import { AppWorkspaceHeader } from "./AppWorkspaceHeader";
import { AppMessage, ConfirmationDialog } from "./shell";
import type { FiscalPendencyTarget } from "../views/finance/FiscalDocumentsPage";

export function AuthenticatedApp({
  user,
  onChangePassword,
  onLogout,
}: {
  user: AuthUser;
  onChangePassword: (input: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
  onLogout: () => void;
}) {
  const [view, setViewState] = useState<View>(() => readInitialView(user));
  const [selectedProduct, setSelectedProduct] = useState<Product>();
  const [selectedClient, setSelectedClient] = useState<Client>();
  const { closeConfirmation, confirmation, requestConfirmation } =
    useConfirmation();
  const {
    brands,
    cashRegister,
    cashReport,
    clients,
    commercialSettings,
    filteredProducts,
    fiscalDocuments,
    fiscalSettings,
    loadCatalog,
    loadCashReport,
    loadPurchaseReport,
    loadSalesReport,
    loadStockReport,
    lowStockProducts,
    message,
    paymentMethods,
    pickupReservations,
    products,
    purchaseInvoices,
    purchaseReport,
    quotes,
    reportsOverview,
    runAction,
    sales,
    salesReport,
    search,
    setMessage,
    setSearch,
    shippingOrders,
    state,
    stockAdjustments,
    stockEntries,
    stockMovements,
    stockReport,
    suppliers,
  } = useCatalogData(user);
  const { openNavSections, toggleNavSection } = useNavigationState();
  const setView = useCallback((nextView: View) => {
    setViewState(nextView);
    storeActiveView(nextView);
  }, []);

  const catalogActions = useCatalogActions({
    loadCatalog,
    requestConfirmation,
    runAction,
    selectedClient,
    selectedProduct,
    setSelectedClient,
    setSelectedProduct,
    showEditProduct: () => setView("edit-product"),
    showProducts: () => setView("products"),
  });

  const stockActions = useStockActions({
    loadCatalog,
    requestConfirmation,
    runAction,
  });

  const financeActions = useFinanceActions({
    loadCatalog,
    requestConfirmation,
    runAction,
  });

  const quoteActions = useQuoteActions({
    loadCatalog,
    requestConfirmation,
    runAction,
    showShippingOrders: () => setView("shipping-orders"),
  });

  const salesActions = useSalesActions({
    loadCatalog,
    products,
    requestConfirmation,
    runAction,
  });

  const activeTitle = viewTitles[view];

  function resolveFiscalPendency(target: FiscalPendencyTarget) {
    if (target.view === "clients" && target.clientId) {
      setSelectedClient(
        clients.find((client) => client.id === target.clientId),
      );
      setView("clients");
      return;
    }

    if (target.view === "edit-product" && target.productId) {
      const product = products.find(
        (currentProduct) => currentProduct.id === target.productId,
      );

      if (product) {
        setSelectedProduct(product);
        setView("edit-product");
        return;
      }
    }

    setView(target.view === "edit-product" ? "products" : target.view);
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#f7f7f4] lg:grid-cols-[minmax(220px,256px)_minmax(0,1fr)]">
      <AppSidebar
        openSections={openNavSections}
        user={user}
        view={view}
        onNewProduct={() => {
          setSelectedProduct(undefined);
          setView("new-product");
        }}
        onSelectView={setView}
        onToggleSection={toggleNavSection}
      />

      <section className="min-w-0 px-4 py-5 sm:px-6 lg:px-7">
        <AppWorkspaceHeader
          activeDescription={activeTitle.description}
          activeTitle={activeTitle.title}
          brandCount={brands.length}
          cashRegister={cashRegister}
          lowStockCount={lowStockProducts.length}
          productCount={products.length}
          supplierCount={suppliers.length}
          user={user}
          view={view}
          onChangePassword={onChangePassword}
          onLogout={onLogout}
          onRefresh={() => void loadCatalog()}
          onSelectView={setView}
        />

        {message ? (
          <AppMessage
            kind={state === "error" ? "error" : "success"}
            message={message}
            onClose={() => setMessage("")}
          />
        ) : null}

        <ConfirmationDialog
          confirmLabel={confirmation?.confirmLabel ?? "Confirmar"}
          message={confirmation?.message ?? ""}
          open={Boolean(confirmation)}
          title={confirmation?.title ?? "Confirmar acao"}
          onCancel={() => closeConfirmation(false)}
          onConfirm={() => closeConfirmation(true)}
        />

        <AppViewRenderer
          brands={brands}
          cashRegister={cashRegister}
          cashReport={cashReport}
          catalogActions={catalogActions}
          clients={clients}
          commercialSettings={commercialSettings}
          financeActions={financeActions}
          filteredProducts={filteredProducts}
          fiscalDocuments={fiscalDocuments}
          fiscalSettings={fiscalSettings}
          lowStockProducts={lowStockProducts}
          paymentMethods={paymentMethods}
          pickupReservations={pickupReservations}
          products={products}
          purchaseInvoices={purchaseInvoices}
          purchaseReport={purchaseReport}
          quoteActions={quoteActions}
          quotes={quotes}
          reportsOverview={reportsOverview}
          sales={sales}
          salesReport={salesReport}
          onLoadCashReport={loadCashReport}
          onLoadPurchaseReport={loadPurchaseReport}
          onLoadSalesReport={loadSalesReport}
          onLoadStockReport={loadStockReport}
          salesActions={salesActions}
          search={search}
          selectedClient={selectedClient}
          selectedProduct={selectedProduct}
          shippingOrders={shippingOrders}
          state={state}
          stockActions={stockActions}
          stockAdjustments={stockAdjustments}
          stockEntries={stockEntries}
          stockMovements={stockMovements}
          stockReport={stockReport}
          suppliers={suppliers}
          user={user}
          view={view}
          onCancelClient={() => setSelectedClient(undefined)}
          onCancelProductEdit={() => setView("products")}
          onOpenQuotes={() => setView("quotes")}
          onResolveFiscalPendency={resolveFiscalPendency}
          onSelectView={setView}
          onSearchChange={setSearch}
          onSelectClient={setSelectedClient}
          requestConfirmation={requestConfirmation}
        />
      </section>
    </main>
  );
}

function readInitialView(user: AuthUser): View {
  if (typeof window === "undefined") {
    return "products";
  }

  const storedView = window.localStorage.getItem(activeViewStorageKey);

  if (!isView(storedView) || storedView === "edit-product") {
    return "products";
  }

  return canAccessView(user, storedView) ? storedView : "products";
}

function storeActiveView(view: View) {
  if (typeof window === "undefined" || view === "edit-product") {
    return;
  }

  window.localStorage.setItem(activeViewStorageKey, view);
}
