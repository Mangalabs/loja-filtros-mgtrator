import { useState } from "react";
import type { AuthUser, Client, Product } from "../api";
import { useCatalogData } from "../hooks/useCatalogData";
import { useConfirmation } from "../hooks/useConfirmation";
import { useNavigationState } from "../hooks/useNavigationState";
import { viewTitles, type View } from "../navigation";
import { useCatalogActions } from "../views/catalog/useCatalogActions";
import { useFinanceActions } from "../views/finance/useFinanceActions";
import { useQuoteActions } from "../views/quotes/useQuoteActions";
import { useSalesActions } from "../views/sales/useSalesActions";
import { useStockActions } from "../views/stock/useStockActions";
import { AppSidebar } from "./AppSidebar";
import { AppViewRenderer } from "./AppViewRenderer";
import { AppWorkspaceHeader } from "./AppWorkspaceHeader";
import { AppMessage, ConfirmationDialog } from "./shell";

export function AuthenticatedApp({
  user,
  onLogout,
}: {
  user: AuthUser;
  onLogout: () => void;
}) {
  const [view, setView] = useState<View>("products");
  const [selectedProduct, setSelectedProduct] = useState<Product>();
  const [selectedClient, setSelectedClient] = useState<Client>();
  const { closeConfirmation, confirmation, requestConfirmation } =
    useConfirmation();
  const {
    brands,
    cashRegister,
    clients,
    filteredProducts,
    loadCatalog,
    lowStockProducts,
    message,
    paymentMethods,
    pickupReservations,
    products,
    quotes,
    reportsOverview,
    runAction,
    sales,
    search,
    setMessage,
    setSearch,
    shippingOrders,
    state,
    stockAdjustments,
    stockEntries,
    stockMovements,
    suppliers,
  } = useCatalogData();
  const { openNavSections, toggleNavSection } = useNavigationState(view);

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

  const stockActions = useStockActions({ loadCatalog, runAction });

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
    requestConfirmation,
    runAction,
  });

  const activeTitle = viewTitles[view];

  return (
    <main className="app-shell">
      <AppSidebar
        openSections={openNavSections}
        view={view}
        onNewProduct={() => {
          setSelectedProduct(undefined);
          setView("new-product");
        }}
        onSelectView={setView}
        onToggleSection={toggleNavSection}
      />

      <section className="workspace">
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
          catalogActions={catalogActions}
          clients={clients}
          financeActions={financeActions}
          filteredProducts={filteredProducts}
          lowStockProducts={lowStockProducts}
          paymentMethods={paymentMethods}
          pickupReservations={pickupReservations}
          products={products}
          quoteActions={quoteActions}
          quotes={quotes}
          reportsOverview={reportsOverview}
          sales={sales}
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
          suppliers={suppliers}
          user={user}
          view={view}
          onCancelClient={() => setSelectedClient(undefined)}
          onCancelProductEdit={() => setView("products")}
          onOpenQuotes={() => setView("quotes")}
          onSearchChange={setSearch}
          onSelectClient={setSelectedClient}
        />
      </section>
    </main>
  );
}
