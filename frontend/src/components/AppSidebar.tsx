import {
  ArrowDownToLine,
  AlertTriangle,
  ArrowLeftRight,
  Banknote,
  CreditCard,
  FileText,
  Filter,
  List as ListIcon,
  PackagePlus,
  Percent,
  Send,
  ShoppingCart,
  ReceiptText,
  SlidersHorizontal,
  Tags,
  Truck,
  Building2,
  Users,
  UserRound,
} from "lucide-react";
import type { AuthUser } from "../api";
import {
  canAccessView,
  navSectionViews,
  type NavSectionKey,
  type View,
} from "../navigation";
import { frontendPalette } from "../theme";
import { NavButton, NavSection } from "./shell";

export function AppSidebar({
  openSections,
  user,
  view,
  onNewProduct,
  onSelectView,
  onToggleSection,
}: {
  openSections: Record<NavSectionKey, boolean>;
  user: AuthUser;
  view: View;
  onNewProduct: () => void;
  onSelectView: (view: View) => void;
  onToggleSection: (section: NavSectionKey) => void;
}) {
  function isSectionActive(section: NavSectionKey) {
    return navSectionViews[section].includes(view);
  }

  function canAccess(targetView: View) {
    return canAccessView(user, targetView);
  }

  return (
    <aside
      className="app-sidebar-scrollbar sticky top-0 flex h-screen min-h-0 min-w-0 flex-col overflow-y-auto overflow-x-hidden px-4 py-5 text-white lg:rounded-r-3xl"
      style={{
        background: `linear-gradient(180deg, ${frontendPalette.primaryNavy} 0%, #17264d 100%)`,
      }}
    >
      <div className="mb-7 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#d8b769] text-[#203466]">
          <Filter size={25} />
        </div>
        <div className="min-w-0">
          <strong className="block truncate text-base">Filtros MG</strong>
          <span className="mt-0.5 block truncate text-xs text-white/70">
            Operacao da filial
          </span>
        </div>
      </div>

      <nav
        className="grid min-w-0 max-w-full gap-2 overflow-x-hidden"
        aria-label="Navegacao principal"
      >
        <NavSection
          active={isSectionActive("products")}
          icon={<PackagePlus size={17} />}
          open={openSections.products}
          title="Produtos"
          onToggle={() => onToggleSection("products")}
        >
          <NavButton
            active={view === "products"}
            icon={<ListIcon size={18} />}
            onClick={() => onSelectView("products")}
          >
            Lista de produtos
          </NavButton>
          <NavButton
            active={view === "new-product"}
            icon={<PackagePlus size={18} />}
            onClick={onNewProduct}
          >
            Novo produto
          </NavButton>
          {canAccess("commercial-settings") ? (
            <NavButton
              active={view === "commercial-settings"}
              icon={<Percent size={18} />}
              onClick={() => onSelectView("commercial-settings")}
            >
              Configuracao comercial
            </NavButton>
          ) : null}
        </NavSection>

        <NavSection
          active={isSectionActive("catalog")}
          icon={<Tags size={17} />}
          open={openSections.catalog}
          title="Cadastros"
          onToggle={() => onToggleSection("catalog")}
        >
          <NavButton
            active={view === "brands"}
            icon={<Tags size={18} />}
            onClick={() => onSelectView("brands")}
          >
            Fabricantes
          </NavButton>
          <NavButton
            active={view === "clients"}
            icon={<UserRound size={18} />}
            onClick={() => onSelectView("clients")}
          >
            Clientes
          </NavButton>
        </NavSection>

        <NavSection
          active={isSectionActive("stock")}
          icon={<ArrowLeftRight size={17} />}
          open={openSections.stock}
          title="Estoque"
          onToggle={() => onToggleSection("stock")}
        >
          <NavButton
            active={view === "stock-entries"}
            icon={<ArrowDownToLine size={18} />}
            onClick={() => onSelectView("stock-entries")}
          >
            Entrada manual
          </NavButton>
          {canAccess("purchase-invoices") ? (
            <NavButton
              active={view === "purchase-invoices"}
              icon={<FileText size={18} />}
              onClick={() => onSelectView("purchase-invoices")}
            >
              Importar XML
            </NavButton>
          ) : null}
          {canAccess("stock-adjustments") ? (
            <NavButton
              active={view === "stock-adjustments"}
              icon={<SlidersHorizontal size={18} />}
              onClick={() => onSelectView("stock-adjustments")}
            >
              Ajuste manual
            </NavButton>
          ) : null}
          <NavButton
            active={view === "low-stock"}
            icon={<AlertTriangle size={18} />}
            onClick={() => onSelectView("low-stock")}
          >
            Reposicao
          </NavButton>
          <NavButton
            active={view === "stock-movements"}
            icon={<ArrowLeftRight size={18} />}
            onClick={() => onSelectView("stock-movements")}
          >
            Historico
          </NavButton>
        </NavSection>

        <NavSection
          active={isSectionActive("suppliers")}
          icon={<Truck size={17} />}
          open={openSections.suppliers}
          title="Fornecedores"
          onToggle={() => onToggleSection("suppliers")}
        >
          <NavButton
            active={view === "suppliers"}
            icon={<Truck size={18} />}
            onClick={() => onSelectView("suppliers")}
          >
            Cadastro
          </NavButton>
        </NavSection>

        {["payment-methods", "fiscal-settings", "fiscal-documents"].some(
          (targetView) => canAccess(targetView as View),
        ) ? (
          <NavSection
            active={isSectionActive("finance")}
            icon={<CreditCard size={17} />}
            open={openSections.finance}
            title="Financeiro"
            onToggle={() => onToggleSection("finance")}
          >
            {canAccess("payment-methods") ? (
              <NavButton
                active={view === "payment-methods"}
                icon={<CreditCard size={18} />}
                onClick={() => onSelectView("payment-methods")}
              >
                Formas de pagamento
              </NavButton>
            ) : null}
            {canAccess("fiscal-settings") ? (
              <NavButton
                active={view === "fiscal-settings"}
                icon={<SlidersHorizontal size={18} />}
                onClick={() => onSelectView("fiscal-settings")}
              >
                Configuracao fiscal
              </NavButton>
            ) : null}
            {canAccess("fiscal-documents") ? (
              <NavButton
                active={view === "fiscal-documents"}
                icon={<FileText size={18} />}
                onClick={() => onSelectView("fiscal-documents")}
              >
                Notas fiscais
              </NavButton>
            ) : null}
          </NavSection>
        ) : null}

        {canAccess("cash-register") ? (
          <NavSection
            active={isSectionActive("cash")}
            icon={<Banknote size={17} />}
            open={openSections.cash}
            title="Caixa"
            onToggle={() => onToggleSection("cash")}
          >
            <NavButton
              active={view === "cash-register"}
              icon={<Banknote size={18} />}
              onClick={() => onSelectView("cash-register")}
            >
              Abertura
            </NavButton>
          </NavSection>
        ) : null}

        {canAccess("reports") ? (
          <NavSection
            active={isSectionActive("reports")}
            icon={<SlidersHorizontal size={17} />}
            open={openSections.reports}
            title="Relatorios"
            onToggle={() => onToggleSection("reports")}
          >
            <NavButton
              active={view === "reports"}
              icon={<SlidersHorizontal size={18} />}
              onClick={() => onSelectView("reports")}
            >
              Gerencial
            </NavButton>
          </NavSection>
        ) : null}

        <NavSection
          active={isSectionActive("sales")}
          icon={<ShoppingCart size={17} />}
          open={openSections.sales}
          title="Vendas"
          onToggle={() => onToggleSection("sales")}
        >
          <NavButton
            active={view === "quotes"}
            icon={<ListIcon size={18} />}
            onClick={() => onSelectView("quotes")}
          >
            Orcamentos
          </NavButton>
          <NavButton
            active={view === "sales"}
            icon={<ShoppingCart size={18} />}
            onClick={() => onSelectView("sales")}
          >
            Balcao
          </NavButton>
          <NavButton
            active={view === "sales-history"}
            icon={<ReceiptText size={18} />}
            onClick={() => onSelectView("sales-history")}
          >
            Historico
          </NavButton>
          <NavButton
            active={view === "shipping-orders"}
            icon={<Send size={18} />}
            onClick={() => onSelectView("shipping-orders")}
          >
            Para envio
          </NavButton>
          <NavButton
            active={view === "pickup-reservations"}
            icon={<PackagePlus size={18} />}
            onClick={() => onSelectView("pickup-reservations")}
          >
            Retirada
          </NavButton>
        </NavSection>

        {user.role === "ADMIN" ? (
          <NavSection
            active={isSectionActive("administration")}
            icon={<Users size={17} />}
            open={openSections.administration}
            title="Administracao"
            onToggle={() => onToggleSection("administration")}
          >
            <NavButton
              active={view === "branches"}
              icon={<Building2 size={18} />}
              onClick={() => onSelectView("branches")}
            >
              Filiais
            </NavButton>
            <NavButton
              active={view === "employees"}
              icon={<Users size={18} />}
              onClick={() => onSelectView("employees")}
            >
              Funcionarios
            </NavButton>
          </NavSection>
        ) : null}
      </nav>
    </aside>
  );
}
