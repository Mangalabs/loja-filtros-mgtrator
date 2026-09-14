import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiGet,
  type ApiResult,
  type AuthUser,
  type Client,
  type FiscalDocument,
  type ManualFiscalDocumentDraft,
  type Product,
  type Quote,
  type Sale,
} from "../api";
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
  const [activeBranchId, setActiveBranchId] = useState<string>(() =>
    readInitialBranchId(user),
  );
  const [selectedProduct, setSelectedProduct] = useState<Product>();
  const [selectedClient, setSelectedClient] = useState<Client>();
  const [selectedManualFiscalDocument, setSelectedManualFiscalDocument] =
    useState<FiscalDocument>();
  const [selectedManualFiscalDocumentDraft, setSelectedManualFiscalDocumentDraft] =
    useState<ManualFiscalDocumentDraft>();
  const [fiscalQueueSearch, setFiscalQueueSearch] = useState("");
  const [fiscalPendencyReturnView, setFiscalPendencyReturnView] =
    useState<View>();
  const [selectedQuote, setSelectedQuote] = useState<Quote>();
  const [selectedSale, setSelectedSale] = useState<Sale>();
  const { closeConfirmation, confirmation, requestConfirmation } =
    useConfirmation();
  const {
    brands,
    branches,
    cashRegister,
    cashReport,
    cestOptions,
    clients,
    commercialSettings,
    fiscalDocuments,
    fiscalSettings,
    inventoryReport,
    loadCatalog,
    loadCashReport,
    loadInventoryReport,
    loadUserPerformanceReport,
    loadPurchaseReport,
    loadSalesReport,
    loadStockReport,
    lowStockProducts,
    manualFiscalDocumentDrafts,
    message,
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
    quotes,
    refreshCatalogFlow,
    refreshCashFlow,
    refreshFiscalFlow,
    refreshPaymentMethods,
    refreshQuoteFlow,
    refreshReplenishmentFlow,
    refreshSalesFlow,
    refreshStockFlow,
    reportsOverview,
    runAction,
    sales,
    salesReport,
    searchProducts,
    search,
    setProductPage,
    setProductFilters,
    setMessage,
    setSearch,
    shippingOrders,
    state,
    stockAdjustments,
    stockEntries,
    stockMovements,
    stockReport,
    suppliers,
    userPerformanceReport,
  } = useCatalogData(user, activeBranchId);
  const { openNavSections, toggleNavSection } = useNavigationState();
  const activeBranch = useMemo(() => {
    return branches.find((branch) => branch.id === activeBranchId) ?? null;
  }, [activeBranchId, branches]);
  const fallbackBranchId = branches[0]?.id;

  useEffect(() => {
    const branchSelectionIsValid =
      branches.length === 0 ||
      branches.some((branch) => branch.id === activeBranchId);

    if (branchSelectionIsValid) {
      return;
    }

    const nextBranchId = fallbackBranchId ?? "";
    storeActiveBranchId(nextBranchId);
    setActiveBranchId(nextBranchId);
  }, [activeBranchId, branches, fallbackBranchId, user.role]);

  const setView = useCallback((nextView: View) => {
    setViewState(nextView);
    storeActiveView(nextView);
  }, []);

  const selectView = useCallback(
    (nextView: View) => {
      setFiscalPendencyReturnView(undefined);

      if (nextView === "manual-fiscal-document") {
        setSelectedManualFiscalDocument(undefined);
        setSelectedManualFiscalDocumentDraft(undefined);
      }

      setView(nextView);
    },
    [setView],
  );

  const openFiscalDocumentSource = useCallback(
    (fiscalDocument: FiscalDocument) => {
      if (fiscalDocument.sourceType === "MANUAL_NFE") {
        setSelectedManualFiscalDocument(fiscalDocument);
        setSelectedManualFiscalDocumentDraft(undefined);
      }

      setView(fiscalDocumentSourceView(fiscalDocument));
    },
    [setView],
  );

  const completeFiscalPendencyCorrection = useCallback(
    async (fallbackView: View) => {
      const returnView = fiscalPendencyReturnView;

      if (!returnView) {
        setView(fallbackView);
        return;
      }

      setFiscalPendencyReturnView(undefined);
      await refreshFiscalFlow();
      setView(returnView);
    },
    [fiscalPendencyReturnView, refreshFiscalFlow, setView],
  );

  const catalogActions = useCatalogActions({
    refreshCatalogFlow,
    requestConfirmation,
    runAction,
    selectedClient,
    selectedProduct,
    setSelectedClient,
    setSelectedProduct,
    afterClientSave: () => completeFiscalPendencyCorrection("clients"),
    afterCommercialSettingsSave: () =>
      completeFiscalPendencyCorrection("fiscal-settings"),
    afterProductSave: () => completeFiscalPendencyCorrection("products"),
    showEditProduct: () => setView("edit-product"),
    showNewProduct: () => setView("new-product"),
    showProducts: () => setView("products"),
  });

  const stockActions = useStockActions({
    commercialSettings,
    refreshReplenishmentFlow,
    refreshStockFlow,
    requestConfirmation,
    runAction,
  });

  const financeActions = useFinanceActions({
    refreshCashFlow,
    refreshFiscalFlow,
    refreshPaymentMethods,
    requestConfirmation,
    runAction,
    showFiscalDocuments: () => setView("fiscal-issued-documents"),
  });

  const quoteActions = useQuoteActions({
    refreshQuoteFlow,
    requestConfirmation,
    runAction,
    showShippingOrders: () => setView("shipping-orders"),
  });

  const salesActions = useSalesActions({
    products,
    refreshSalesFlow,
    requestConfirmation,
    runAction,
    showFiscalDocuments: () => setView("fiscal-issued-documents"),
    showSalesHistory: () => setView("sales-history"),
  });

  const activeTitle = viewTitles[view];

  async function openSaleEditor(sale: Sale) {
    if (sale.status === "COMPLETED") {
      const reopened = await salesActions.reopenSale(sale);

      if (!reopened) {
        return false;
      }
    }

    setSelectedSale({ ...sale, status: "OPEN" });
    setView("edit-sale");
    return true;
  }

  function resolveFiscalPendency(target: FiscalPendencyTarget) {
    setFiscalPendencyReturnView(
      view === "fiscal-issued-documents" ? view : "fiscal-documents",
    );

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

      void runAction(async () => {
        const result = await apiGet<ApiResult<Product>>(
          `/products/${target.productId}`,
        );

        setSelectedProduct(result.data);
        setView("edit-product");
      });
      return;
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
        onSelectView={selectView}
        onToggleSection={toggleNavSection}
      />

      <section className="min-w-0 px-4 py-5 sm:px-6 lg:px-7">
        <AppWorkspaceHeader
          activeDescription={activeTitle.description}
          activeTitle={activeTitle.title}
          activeBranchId={activeBranchId}
          activeBranchName={activeBranch?.name ?? null}
          branches={branches}
          cashRegister={cashRegister}
          user={user}
          onChangePassword={onChangePassword}
          onLogout={onLogout}
          onRefresh={() => void loadCatalog()}
          onSelectBranch={(branchId) => {
            storeActiveBranchId(branchId);
            setActiveBranchId(branchId);
          }}
          onSelectView={selectView}
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

        <section className="mt-5 sm:mt-6">
          <AppViewRenderer
            brands={brands}
            cashRegister={cashRegister}
            cashReport={cashReport}
            catalogActions={catalogActions}
            cestOptions={cestOptions}
            clients={clients}
            commercialSettings={commercialSettings}
            financeActions={financeActions}
            fiscalDocuments={fiscalDocuments}
            fiscalSettings={fiscalSettings}
            fiscalQueueSearch={fiscalQueueSearch}
            inventoryReport={inventoryReport}
            lowStockProducts={lowStockProducts}
            manualFiscalDocumentDrafts={manualFiscalDocumentDrafts}
            ncmOptions={ncmOptions}
            paymentMethods={paymentMethods}
            pickupReservations={pickupReservations}
            productPage={productPage}
            productPageIndex={productPageIndex}
            productRowsPerPage={productRowsPerPage}
            productStatusFilter={productStatusFilter}
            productStockStatusFilter={productStockStatusFilter}
            products={products}
            purchaseInvoices={purchaseInvoices}
            purchaseReport={purchaseReport}
            quoteFormDrafts={quoteFormDrafts}
            quoteActions={quoteActions}
            quotes={quotes}
            reportsOverview={reportsOverview}
            sales={sales}
            salesReport={salesReport}
            onLoadCashReport={loadCashReport}
            onLoadInventoryReport={loadInventoryReport}
            onLoadPurchaseReport={loadPurchaseReport}
            onLoadSalesReport={loadSalesReport}
            onLoadStockReport={loadStockReport}
            onLoadUserPerformanceReport={loadUserPerformanceReport}
            salesActions={salesActions}
            search={search}
            selectedClient={selectedClient}
            selectedManualFiscalDocument={selectedManualFiscalDocument}
            selectedManualFiscalDocumentDraft={selectedManualFiscalDocumentDraft}
            selectedProduct={selectedProduct}
            selectedQuote={selectedQuote}
            selectedSale={selectedSale}
            shippingOrders={shippingOrders}
            state={state}
            stockActions={stockActions}
            stockAdjustments={stockAdjustments}
            stockEntries={stockEntries}
            stockMovements={stockMovements}
            stockReport={stockReport}
            suppliers={suppliers}
            userPerformanceReport={userPerformanceReport}
            user={user}
            view={view}
            onCancelClient={() => {
              setSelectedClient(undefined);
              setFiscalPendencyReturnView(undefined);
            }}
            onCancelProductEdit={() => {
              setFiscalPendencyReturnView(undefined);
              setView("products");
            }}
            onCancelQuoteEdit={() => {
              setSelectedQuote(undefined);
              setView("quotes");
            }}
            onCancelSaleEdit={() => {
              setSelectedSale(undefined);
              setView("sales-history");
            }}
            onOpenQuotes={() => setView("quotes")}
            onResolveFiscalPendency={resolveFiscalPendency}
            onProductPageChange={setProductPage}
            onProductFiltersChange={setProductFilters}
            onSearchProducts={searchProducts}
            onOpenFiscalDocumentSource={openFiscalDocumentSource}
            onOpenSaleFiscalQueue={(sale) => {
              setFiscalQueueSearch(String(sale.saleNumber));
              setView("fiscal-documents");
            }}
            onOpenManualFiscalDocumentDraft={(draft) => {
              setSelectedManualFiscalDocument(undefined);
              setSelectedManualFiscalDocumentDraft(draft);
              setView("manual-fiscal-document");
            }}
            onSelectView={selectView}
            onSearchChange={setSearch}
            onSelectClient={setSelectedClient}
            onSelectQuote={(quote) => {
              setSelectedQuote(quote);
              setView("edit-quote");
            }}
            onSelectSale={openSaleEditor}
            requestConfirmation={requestConfirmation}
          />
        </section>
      </section>
    </main>
  );
}

function fiscalDocumentSourceView(
  fiscalDocument: FiscalDocument,
): View {
  const views: Record<FiscalDocument["sourceType"], View> = {
    MANUAL_NFE: "manual-fiscal-document",
    PICKUP_RESERVATION: "pickup-reservations",
    SALE: "sales-history",
    SHIPPING_ORDER: "shipping-orders",
  };

  return views[fiscalDocument.sourceType];
}

function readInitialView(user: AuthUser): View {
  if (typeof window === "undefined") {
    return "products";
  }

  const storedView = window.localStorage.getItem(activeViewStorageKey);

  if (
    !isView(storedView) ||
    storedView === "edit-product" ||
    storedView === "edit-quote" ||
    storedView === "edit-sale"
  ) {
    return "products";
  }

  return canAccessView(user, storedView) ? storedView : "products";
}

function readInitialBranchId(user: AuthUser) {
  if (typeof window === "undefined") {
    return user.branchId ?? "";
  }

  const storedBranchId = window.localStorage.getItem(activeBranchStorageKey);

  if (
    user.role === "EMPLOYEE" &&
    storedBranchId &&
    user.branches.some((branch) => branch.id === storedBranchId)
  ) {
    return storedBranchId;
  }

  if (user.role === "EMPLOYEE") {
    return user.branchId ?? user.branches[0]?.id ?? "";
  }

  return storedBranchId ?? "";
}

function storeActiveView(view: View) {
  if (typeof window === "undefined" || view === "edit-product") {
    return;
  }

  window.localStorage.setItem(activeViewStorageKey, view);
}

const activeBranchStorageKey = "loja-filtros:active-branch";

function storeActiveBranchId(branchId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const actions = {
    clear: () => window.localStorage.removeItem(activeBranchStorageKey),
    save: () => window.localStorage.setItem(activeBranchStorageKey, branchId),
  };

  const action = branchId ? actions.save : actions.clear;
  action();
}
