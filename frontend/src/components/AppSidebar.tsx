import {
  ArrowDownToLine,
  AlertTriangle,
  ArrowLeftRight,
  Banknote,
  CreditCard,
  FileText,
  List as ListIcon,
  PackagePlus,
  Percent,
  ShoppingCart,
  SlidersHorizontal,
  Tags,
  Truck,
  Building2,
  Users,
  UserRound,
} from 'lucide-react'
import type { AuthUser } from '../api'
import brandLogoUrl from '../assets/logo_mgtratorpecas_png_branco.png'
import {
  canAccessView,
  navSectionViews,
  type NavSectionKey,
  type View,
} from '../navigation'
import { frontendPalette } from '../theme'
import { NavButton, NavSection } from './shell'

export function AppSidebar({
  openSections,
  user,
  view,
  onNewProduct,
  onSelectView,
  onToggleSection,
}: {
  openSections: Record<NavSectionKey, boolean>
  user: AuthUser
  view: View
  onNewProduct: () => void
  onSelectView: (view: View) => void
  onToggleSection: (section: NavSectionKey) => void
}) {
  function isSectionActive(section: NavSectionKey) {
    return navSectionViews[section].includes(view)
  }

  function canAccess(targetView: View) {
    return canAccessView(user, targetView)
  }

  return (
    <aside
      className='flex min-h-0 min-w-0 flex-col overflow-hidden text-white lg:sticky lg:top-0 lg:h-screen lg:rounded-r-3xl'
      style={{
        background: `linear-gradient(180deg, ${frontendPalette.primaryNavy} 0%, #17264d 100%)`,
      }}>
      <div className='app-sidebar-scrollbar flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 py-5'>
        <div className='mb-7 px-1'>
          <img
            alt='MG Trator Peças'
            className='block h-auto w-full object-contain'
            fetchPriority='high'
            height={200}
            src={brandLogoUrl}
            width={367}
          />
        </div>

        <nav
          className='grid min-w-0 max-w-full gap-2 overflow-x-hidden'
          aria-label='Navegacao principal'>
        <NavSection
          active={isSectionActive('products')}
          icon={<PackagePlus size={17} />}
          open={openSections.products}
          title='Produtos'
          onToggle={() => onToggleSection('products')}>
          <NavButton
            active={view === 'products'}
            icon={<ListIcon size={18} />}
            onClick={() => onSelectView('products')}>
            Lista de produtos
          </NavButton>
          <NavButton
            active={view === 'new-product'}
            icon={<PackagePlus size={18} />}
            onClick={onNewProduct}>
            Novo produto
          </NavButton>
          {canAccess('commercial-settings') ? (
            <NavButton
              active={view === 'commercial-settings'}
              icon={<Percent size={18} />}
              onClick={() => onSelectView('commercial-settings')}>
              Configuração comercial
            </NavButton>
          ) : null}
        </NavSection>

        <NavSection
          active={isSectionActive('stock')}
          icon={<ArrowLeftRight size={17} />}
          open={openSections.stock}
          title='Estoque'
          onToggle={() => onToggleSection('stock')}>
          <NavButton
            active={view === 'stock-entries'}
            icon={<ArrowDownToLine size={18} />}
            onClick={() => onSelectView('stock-entries')}>
            Entrada manual
          </NavButton>
          {canAccess('purchase-invoices') ? (
            <NavButton
              active={view === 'purchase-invoices'}
              icon={<FileText size={18} />}
              onClick={() => onSelectView('purchase-invoices')}>
              Importar XML
            </NavButton>
          ) : null}
          {canAccess('stock-adjustments') ? (
            <NavButton
              active={view === 'stock-adjustments'}
              icon={<SlidersHorizontal size={18} />}
              onClick={() => onSelectView('stock-adjustments')}>
              Ajuste manual
            </NavButton>
          ) : null}
          <NavButton
            active={view === 'low-stock'}
            icon={<AlertTriangle size={18} />}
            onClick={() => onSelectView('low-stock')}>
            Reposição
          </NavButton>
          <NavButton
            active={view === 'stock-movements'}
            icon={<ArrowLeftRight size={18} />}
            onClick={() => onSelectView('stock-movements')}>
            Histórico
          </NavButton>
        </NavSection>

        <NavSection
          active={isSectionActive('quotes')}
          icon={<FileText size={17} />}
          open={openSections.quotes}
          title='Orçamentos'
          onToggle={() => onToggleSection('quotes')}>
          <NavButton
            active={view === 'new-quote'}
            icon={<FileText size={18} />}
            onClick={() => onSelectView('new-quote')}>
            Novo orçamento
          </NavButton>
          <NavButton
            active={view === 'quotes'}
            icon={<ListIcon size={18} />}
            onClick={() => onSelectView('quotes')}>
            Fila de orçamentos
          </NavButton>
        </NavSection>

        <NavSection
          active={isSectionActive('sales')}
          icon={<ShoppingCart size={17} />}
          open={openSections.sales}
          title='Vendas'
          onToggle={() => onToggleSection('sales')}>
          <NavButton
            active={view === 'sales-operations'}
            icon={<ShoppingCart size={18} />}
            onClick={() => onSelectView('sales-operations')}>
            Vendas
          </NavButton>
          <NavButton
            active={view === 'sales-history'}
            icon={<ListIcon size={18} />}
            onClick={() => onSelectView('sales-history')}>
            Histórico de vendas
          </NavButton>
        </NavSection>

        {[
          'payment-methods',
          'fiscal-settings',
          'fiscal-operations',
          'fiscal-documents',
          'fiscal-issued-documents',
          'manual-fiscal-document',
        ].some((targetView) => canAccess(targetView as View)) ? (
          <NavSection
            active={isSectionActive('finance')}
            icon={<CreditCard size={17} />}
            open={openSections.finance}
            title='Financeiro'
            onToggle={() => onToggleSection('finance')}>
            {canAccess('payment-methods') ? (
              <NavButton
                active={view === 'payment-methods'}
                icon={<CreditCard size={18} />}
                onClick={() => onSelectView('payment-methods')}>
                Formas de pagamento
              </NavButton>
            ) : null}
            {canAccess('fiscal-settings') ? (
              <NavButton
                active={view === 'fiscal-settings'}
                icon={<SlidersHorizontal size={18} />}
                onClick={() => onSelectView('fiscal-settings')}>
                Configuração fiscal
              </NavButton>
            ) : null}
            {canAccess('fiscal-documents') ? (
              <NavButton
                active={view === 'fiscal-documents'}
                icon={<FileText size={18} />}
                onClick={() => onSelectView('fiscal-documents')}>
                Fila de emissão
              </NavButton>
            ) : null}
            {canAccess('fiscal-issued-documents') ? (
              <NavButton
                active={view === 'fiscal-issued-documents'}
                icon={<ListIcon size={18} />}
                onClick={() => onSelectView('fiscal-issued-documents')}>
                Histórico de notas emitidas
              </NavButton>
            ) : null}
            {canAccess('manual-fiscal-document') ? (
              <NavButton
                active={view === 'manual-fiscal-document'}
                icon={<FileText size={18} />}
                onClick={() => onSelectView('manual-fiscal-document')}>
                NF-e avulsa
              </NavButton>
            ) : null}
          </NavSection>
        ) : null}

        <NavSection
          active={isSectionActive('catalog')}
          icon={<Tags size={17} />}
          open={openSections.catalog}
          title='Cadastros'
          onToggle={() => onToggleSection('catalog')}>
          <NavButton
            active={view === 'brands'}
            icon={<Tags size={18} />}
            onClick={() => onSelectView('brands')}>
            Fabricantes
          </NavButton>
          <NavButton
            active={view === 'clients'}
            icon={<UserRound size={18} />}
            onClick={() => onSelectView('clients')}>
            Clientes
          </NavButton>
          <NavButton
            active={view === 'suppliers'}
            icon={<Truck size={18} />}
            onClick={() => onSelectView('suppliers')}>
            Fornecedores
          </NavButton>
        </NavSection>

        {canAccess('cash-register') ? (
          <NavSection
            active={isSectionActive('cash')}
            icon={<Banknote size={17} />}
            open={openSections.cash}
            title='Caixa'
            onToggle={() => onToggleSection('cash')}>
            <NavButton
              active={view === 'cash-register'}
              icon={<Banknote size={18} />}
              onClick={() => onSelectView('cash-register')}>
              Abertura
            </NavButton>
          </NavSection>
        ) : null}

        {canAccess('reports') ? (
          <NavSection
            active={isSectionActive('reports')}
            icon={<SlidersHorizontal size={17} />}
            open={openSections.reports}
            title='Relatórios'
            onToggle={() => onToggleSection('reports')}>
            <NavButton
              active={view === 'reports'}
              icon={<SlidersHorizontal size={18} />}
              onClick={() => onSelectView('reports')}>
              Gerencial
            </NavButton>
          </NavSection>
        ) : null}

        {user.role === 'ADMIN' ? (
          <NavSection
            active={isSectionActive('administration')}
            icon={<Users size={17} />}
            open={openSections.administration}
            title='Administração'
            onToggle={() => onToggleSection('administration')}>
            <NavButton
              active={view === 'branches'}
              icon={<Building2 size={18} />}
              onClick={() => onSelectView('branches')}>
              Filiais
            </NavButton>
            <NavButton
              active={view === 'employees'}
              icon={<Users size={18} />}
              onClick={() => onSelectView('employees')}>
              Funcionários
            </NavButton>
          </NavSection>
        ) : null}
        </nav>
      </div>
    </aside>
  )
}
