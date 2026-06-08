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
  Send,
  ShoppingCart,
  SlidersHorizontal,
  Tags,
  Truck,
  UserRound,
} from "lucide-react";
import { navSectionViews, type NavSectionKey, type View } from "../navigation";
import { NavButton, NavSection } from "./shell";

export function AppSidebar({
  openSections,
  view,
  onNewProduct,
  onSelectView,
  onToggleSection,
}: {
  openSections: Record<NavSectionKey, boolean>;
  view: View;
  onNewProduct: () => void;
  onSelectView: (view: View) => void;
  onToggleSection: (section: NavSectionKey) => void;
}) {
  function isSectionActive(section: NavSectionKey) {
    return navSectionViews[section].includes(view);
  }

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <Filter size={28} />
        <div>
          <strong>Filtros MG</strong>
          <span>Operacao da filial</span>
        </div>
      </div>

      <nav className="nav-list" aria-label="Navegacao principal">
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
          <NavButton
            active={view === "stock-adjustments"}
            icon={<SlidersHorizontal size={18} />}
            onClick={() => onSelectView("stock-adjustments")}
          >
            Ajuste manual
          </NavButton>
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

        <NavSection
          active={isSectionActive("finance")}
          icon={<CreditCard size={17} />}
          open={openSections.finance}
          title="Financeiro"
          onToggle={() => onToggleSection("finance")}
        >
          <NavButton
            active={view === "payment-methods"}
            icon={<CreditCard size={18} />}
            onClick={() => onSelectView("payment-methods")}
          >
            Formas de pagamento
          </NavButton>
          <NavButton
            active={view === "fiscal-documents"}
            icon={<FileText size={18} />}
            onClick={() => onSelectView("fiscal-documents")}
          >
            Notas fiscais
          </NavButton>
        </NavSection>

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
      </nav>
    </aside>
  );
}
