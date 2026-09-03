import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import TextField from '@mui/material/TextField'
import {
  AlertTriangle,
  Banknote,
  CircleDollarSign,
  CreditCard,
  Download,
  FileText,
  PackageSearch,
  PackagePlus,
  Send,
  ShoppingCart,
  Truck,
} from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import type {
  CashReport,
  InventoryReport,
  PurchaseReport,
  ReportsOverview,
  SalesReport,
  StockReport,
  UserPerformanceReport,
} from '../../api'
import { PageHeader, PagePanel, ResponsiveTable } from '../../components/layout'
import { StatusChip, type StatusTone } from '../../components/ui'
import { frontendPalette } from '../../theme'
import {
  formatCurrency,
  formatDateTime,
  formatQuantity,
} from '../../utils/format'

export function ReportsPage({
  cashReport,
  inventoryReport,
  onLoadCashReport,
  onLoadInventoryReport,
  onLoadSalesReport,
  onLoadPurchaseReport,
  onLoadStockReport,
  onLoadUserPerformanceReport,
  overview,
  purchaseReport,
  salesReport,
  stockReport,
  userPerformanceReport,
}: {
  cashReport: CashReport | null
  inventoryReport: InventoryReport | null
  onLoadCashReport: (filters?: SalesReportFilters) => Promise<boolean>
  onLoadInventoryReport: (filters?: InventoryReportFilters) => Promise<boolean>
  onLoadSalesReport: (filters?: SalesReportFilters) => Promise<boolean>
  onLoadPurchaseReport: (filters?: SalesReportFilters) => Promise<boolean>
  onLoadStockReport: (filters?: SalesReportFilters) => Promise<boolean>
  onLoadUserPerformanceReport: (
    filters?: SalesReportFilters,
  ) => Promise<boolean>
  overview: ReportsOverview | null
  purchaseReport: PurchaseReport | null
  salesReport: SalesReport | null
  stockReport: StockReport | null
  userPerformanceReport: UserPerformanceReport | null
}) {
  const contentByState = {
    loading: <ReportsLoading />,
    ready:
      overview && salesReport && stockReport && purchaseReport && cashReport ? (
        <ReportsOverviewContent
          cashReport={cashReport}
          inventoryReport={inventoryReport}
          overview={overview}
          onLoadCashReport={onLoadCashReport}
          onLoadInventoryReport={onLoadInventoryReport}
          onLoadPurchaseReport={onLoadPurchaseReport}
          onLoadSalesReport={onLoadSalesReport}
          onLoadStockReport={onLoadStockReport}
          onLoadUserPerformanceReport={onLoadUserPerformanceReport}
          purchaseReport={purchaseReport}
          salesReport={salesReport}
          stockReport={stockReport}
          userPerformanceReport={userPerformanceReport}
        />
      ) : null,
  }
  const state =
    overview && salesReport && stockReport && purchaseReport && cashReport
      ? 'ready'
      : 'loading'

  return contentByState[state]
}

function ReportsLoading() {
  return (
    <PagePanel wide>
      <PageHeader
        description='Carregando indicadores operacionais...'
        title='Resumo gerencial'
      />
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton height={110} key={index} variant='rounded' />
        ))}
      </div>
    </PagePanel>
  )
}

function ReportsOverviewContent({
  cashReport,
  inventoryReport,
  onLoadCashReport,
  onLoadInventoryReport,
  onLoadPurchaseReport,
  onLoadSalesReport,
  onLoadStockReport,
  onLoadUserPerformanceReport,
  overview,
  purchaseReport,
  salesReport,
  stockReport,
  userPerformanceReport,
}: {
  cashReport: CashReport
  inventoryReport: InventoryReport | null
  onLoadCashReport: (filters?: SalesReportFilters) => Promise<boolean>
  onLoadInventoryReport: (filters?: InventoryReportFilters) => Promise<boolean>
  onLoadPurchaseReport: (filters?: SalesReportFilters) => Promise<boolean>
  onLoadSalesReport: (filters?: SalesReportFilters) => Promise<boolean>
  onLoadStockReport: (filters?: SalesReportFilters) => Promise<boolean>
  onLoadUserPerformanceReport: (
    filters?: SalesReportFilters,
  ) => Promise<boolean>
  overview: ReportsOverview
  purchaseReport: PurchaseReport
  salesReport: SalesReport
  stockReport: StockReport
  userPerformanceReport: UserPerformanceReport | null
}) {
  return (
    <section className='grid gap-4'>
      <section className='grid gap-4 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.4fr)]'>
        <PagePanel className='content-start'>
          <PageHeader
            description='Status operacional do caixa.'
            icon={<Banknote size={18} />}
            title='Caixa atual'
          />
          {overview.openCashRegister ? (
            <div className='grid gap-3'>
              <ReportDetail label='Status' value='Aberto' />
              <ReportDetail
                label='Operador'
                value={overview.openCashRegister.openedByUserName}
              />
              <ReportDetail
                label='Abertura'
                value={formatDateTime(overview.openCashRegister.openedAt)}
              />
            </div>
          ) : (
            <Alert severity='warning' variant='outlined'>
              Nenhum caixa aberto no momento.
            </Alert>
          )}
        </PagePanel>

        <PagePanel wide>
          <PageHeader
            actions={<StatusChip label='Atualizado' tone='success' />}
            description='Primeiros indicadores operacionais da filial.'
            title='Resumo gerencial'
          />
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
            <ReportMetric
              icon={<ShoppingCart size={18} />}
              label='Vendas concluidas'
              value={String(overview.salesCount)}
            />
            <ReportMetric
              icon={<Banknote size={18} />}
              label='Total vendido'
              value={formatCurrency(overview.salesTotalAmount)}
            />
            <ReportMetric
              icon={<AlertTriangle size={18} />}
              label='Produtos em reposicao'
              value={String(overview.lowStockProductsCount)}
            />
            <ReportMetric
              icon={<Send size={18} />}
              label='Vendas em aberto'
              value={String(overview.openShippingOrdersCount)}
            />
            <ReportMetric
              icon={<PackagePlus size={18} />}
              label='Reservas para retirada em aberto'
              value={String(overview.openPickupReservationsCount)}
            />
          </div>
        </PagePanel>
      </section>

      <SalesReportSection
        salesReport={salesReport}
        onLoadSalesReport={onLoadSalesReport}
      />
      {userPerformanceReport ? (
        <UserPerformanceReportSection
          report={userPerformanceReport}
          onLoadUserPerformanceReport={onLoadUserPerformanceReport}
        />
      ) : null}
      <PurchaseReportSection
        purchaseReport={purchaseReport}
        onLoadPurchaseReport={onLoadPurchaseReport}
      />
      <CashReportSection
        cashReport={cashReport}
        onLoadCashReport={onLoadCashReport}
      />
      <StockReportSection
        stockReport={stockReport}
        onLoadStockReport={onLoadStockReport}
      />
      {inventoryReport ? (
        <InventoryReportSection
          report={inventoryReport}
          onLoadInventoryReport={onLoadInventoryReport}
        />
      ) : null}
    </section>
  )
}

function SalesReportSection({
  onLoadSalesReport,
  salesReport,
}: {
  onLoadSalesReport: (filters?: SalesReportFilters) => Promise<boolean>
  salesReport: SalesReport
}) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)

  async function filterSalesReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    await onLoadSalesReport({ dateFrom, dateTo })
    setLoading(false)
  }

  async function clearSalesReportFilters() {
    setDateFrom('')
    setDateTo('')
    setLoading(true)

    await onLoadSalesReport()
    setLoading(false)
  }

  return (
    <PagePanel wide>
      <PageHeader
        actions={
          <form
            className='grid w-full gap-3 sm:grid-cols-[repeat(2,minmax(160px,1fr))_auto_auto_auto] lg:w-auto'
            onSubmit={filterSalesReport}>
            <TextField
              label='De'
              size='small'
              type='date'
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label='Ate'
              size='small'
              type='date'
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button disabled={loading} type='submit' variant='contained'>
              Filtrar
            </Button>
            <Button
              disabled={loading || (!dateFrom && !dateTo)}
              type='button'
              variant='outlined'
              onClick={() => void clearSalesReportFilters()}>
              Limpar
            </Button>
            <Button
              startIcon={<Download size={16} />}
              type='button'
              variant='outlined'
              onClick={() => exportSalesReportCsv(salesReport)}>
              CSV
            </Button>
          </form>
        }
        description='Vendas concluidas agrupadas por produto, cliente e forma de pagamento.'
        icon={<CircleDollarSign size={18} />}
        title='Relatorio comercial'
      />
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-6'>
        <ReportMetric
          icon={<ShoppingCart size={18} />}
          label='Vendas'
          value={String(salesReport.summary.salesCount)}
        />
        <ReportMetric
          icon={<PackagePlus size={18} />}
          label='Itens vendidos'
          value={formatQuantity(salesReport.summary.itemsQuantity)}
        />
        <ReportMetric
          icon={<Banknote size={18} />}
          label='Bruto'
          value={formatCurrency(salesReport.summary.grossAmount)}
        />
        <ReportMetric
          icon={<PackageSearch size={18} />}
          label='Custo'
          value={formatCurrency(salesReport.summary.costAmount)}
        />
        <ReportMetric
          icon={<CircleDollarSign size={18} />}
          label='Lucro'
          value={formatCurrency(salesReport.summary.grossProfitAmount)}
        />
        <ReportMetric
          icon={<CircleDollarSign size={18} />}
          label='Liquido'
          value={formatCurrency(salesReport.summary.netAmount)}
        />
      </div>
      <span className='text-sm text-[#5f665f]'>
        Margem geral: {salesReport.summary.grossMarginPercentage}%
      </span>

      <div className='mt-5 grid gap-4 xl:grid-cols-3'>
        <ResponsiveTable
          columns={[
            {
              header: 'Produto',
              render: (item) => item.productName,
            },
            {
              align: 'right',
              header: 'Qtde',
              render: (item) => formatQuantity(item.quantity),
            },
            {
              align: 'right',
              header: 'Total',
              render: (item) => formatCurrency(item.totalAmount),
            },
            {
              align: 'right',
              header: 'Custo',
              render: (item) => formatCurrency(item.costAmount),
            },
            {
              align: 'right',
              header: 'Lucro',
              render: (item) => formatCurrency(item.grossProfitAmount),
            },
            {
              align: 'right',
              header: 'Margem',
              render: (item) => `${item.grossMarginPercentage}%`,
            },
          ]}
          emptyMessage='Nenhuma venda por produto.'
          getRowId={(item) => item.productId}
          items={salesReport.byProduct ?? []}
        />

        <ResponsiveTable
          columns={[
            {
              header: 'Cliente',
              render: (item) => item.clientName,
            },
            {
              align: 'right',
              header: 'Vendas',
              render: (item) => item.salesCount,
            },
            {
              align: 'right',
              header: 'Total',
              render: (item) => formatCurrency(item.totalAmount),
            },
          ]}
          emptyMessage='Nenhuma venda por cliente.'
          getRowId={(item) => item.clientId ?? item.clientName}
          items={salesReport.byClient ?? []}
        />

        <ResponsiveTable
          columns={[
            {
              header: 'Pagamento',
              render: (item) => (
                <span className='inline-flex items-center gap-2'>
                  <CreditCard size={15} />
                  {item.paymentMethodName}
                </span>
              ),
            },
            {
              align: 'right',
              header: 'Total',
              render: (item) => formatCurrency(item.totalAmount),
            },
          ]}
          emptyMessage='Nenhuma venda por pagamento.'
          getRowId={(item) => item.paymentMethodId}
          items={salesReport.byPaymentMethod ?? []}
        />
      </div>

      <div className='mt-5'>
        <ResponsiveTable
          columns={[
            {
              header: 'Produto',
              render: (item) => item.productName,
            },
            {
              align: 'right',
              header: 'Faturamento',
              render: (item) => formatCurrency(item.totalAmount),
            },
            {
              align: 'right',
              header: 'Part.',
              render: (item) => `${item.revenueSharePercentage}%`,
            },
            {
              align: 'right',
              header: 'Acumulado',
              render: (item) => `${item.cumulativeRevenuePercentage}%`,
            },
            {
              header: 'Classe',
              render: (item) => (
                <StatusChip
                  label={item.abcClass}
                  tone={abcTone(item.abcClass)}
                />
              ),
            },
          ]}
          emptyMessage='Nenhum produto para curva ABC.'
          getRowId={(item) => item.productId}
          items={salesReport.abcProducts ?? []}
        />
      </div>
    </PagePanel>
  )
}

function UserPerformanceReportSection({
  onLoadUserPerformanceReport,
  report,
}: {
  onLoadUserPerformanceReport: (
    filters?: SalesReportFilters,
  ) => Promise<boolean>
  report: UserPerformanceReport
}) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)

  async function filterUserPerformanceReport(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setLoading(true)

    await onLoadUserPerformanceReport({ dateFrom, dateTo })
    setLoading(false)
  }

  async function clearUserPerformanceReportFilters() {
    setDateFrom('')
    setDateTo('')
    setLoading(true)

    await onLoadUserPerformanceReport()
    setLoading(false)
  }

  return (
    <PagePanel wide>
      <PageHeader
        actions={
          <form
            className='grid w-full gap-3 sm:grid-cols-[repeat(2,minmax(160px,1fr))_auto_auto_auto] lg:w-auto'
            onSubmit={filterUserPerformanceReport}>
            <TextField
              label='De'
              size='small'
              type='date'
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label='Ate'
              size='small'
              type='date'
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button disabled={loading} type='submit' variant='contained'>
              Filtrar usuarios
            </Button>
            <Button
              disabled={loading || (!dateFrom && !dateTo)}
              type='button'
              variant='outlined'
              onClick={() => void clearUserPerformanceReportFilters()}>
              Limpar
            </Button>
            <Button
              startIcon={<Download size={16} />}
              type='button'
              variant='outlined'
              onClick={() => exportUserPerformanceReportCsv(report)}>
              CSV
            </Button>
          </form>
        }
        description='Vendas, comissoes conferiveis e acoes operacionais por usuario.'
        icon={<CircleDollarSign size={18} />}
        title='Desempenho por usuario'
      />
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-6'>
        <ReportMetric
          icon={<CircleDollarSign size={18} />}
          label='Usuarios'
          value={String(report.summary.usersCount)}
        />
        <ReportMetric
          icon={<ShoppingCart size={18} />}
          label='Vendas'
          value={String(report.summary.salesCount)}
        />
        <ReportMetric
          icon={<Banknote size={18} />}
          label='Liquido'
          value={formatCurrency(report.summary.netAmount)}
        />
        <ReportMetric
          icon={<Send size={18} />}
          label='Orcamentos'
          value={String(report.summary.quotesCreatedCount)}
        />
        <ReportMetric
          icon={<PackageSearch size={18} />}
          label='Mov. estoque'
          value={String(report.summary.stockMovementsCount)}
        />
        <ReportMetric
          icon={<FileText size={18} />}
          label='NF-e emitidas'
          value={String(report.summary.fiscalDocumentsIssuedCount)}
        />
      </div>

      <div className='mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]'>
        <ResponsiveTable
          columns={[
            {
              header: 'Usuario',
              render: (item) => item.userName,
            },
            {
              align: 'right',
              header: 'Vendas',
              render: (item) => item.salesCount,
            },
            {
              align: 'right',
              header: 'Liquido',
              render: (item) => formatCurrency(item.netAmount),
            },
            {
              align: 'right',
              header: 'Orc.',
              render: (item) => item.quotesCreatedCount,
            },
            {
              align: 'right',
              header: 'Estoque',
              render: (item) => item.stockMovementsCount,
            },
            {
              align: 'right',
              header: 'NF-e',
              render: (item) => item.fiscalDocumentsIssuedCount,
            },
          ]}
          emptyMessage='Nenhum usuario com acao no periodo.'
          getRowId={(item) => item.userId}
          items={report.users}
        />

        <ResponsiveTable
          columns={[
            {
              header: 'Venda',
              render: (item) => (
                <div className='grid gap-1'>
                  <strong>Venda #{item.saleNumber}</strong>
                  <span className='text-xs text-[#5f665f]'>
                    {formatDateTime(item.createdAt)}
                  </span>
                </div>
              ),
            },
            {
              header: 'Usuario',
              render: (item) => item.userName,
            },
            {
              header: 'Cliente',
              render: (item) => item.clientName,
            },
            {
              header: 'Status',
              render: (item) => saleStatusLabel(item.status),
            },
            {
              align: 'right',
              header: 'Liquido',
              render: (item) => formatCurrency(item.netAmount),
            },
          ]}
          emptyMessage='Nenhuma venda no periodo.'
          getRowId={(item) => item.saleId}
          items={report.sales}
        />
      </div>
    </PagePanel>
  )
}

function PurchaseReportSection({
  onLoadPurchaseReport,
  purchaseReport,
}: {
  onLoadPurchaseReport: (filters?: SalesReportFilters) => Promise<boolean>
  purchaseReport: PurchaseReport
}) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)

  async function filterPurchaseReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    await onLoadPurchaseReport({ dateFrom, dateTo })
    setLoading(false)
  }

  async function clearPurchaseReportFilters() {
    setDateFrom('')
    setDateTo('')
    setLoading(true)

    await onLoadPurchaseReport()
    setLoading(false)
  }

  return (
    <PagePanel wide>
      <PageHeader
        actions={
          <form
            className='grid w-full gap-3 sm:grid-cols-[repeat(2,minmax(160px,1fr))_auto_auto_auto] lg:w-auto'
            onSubmit={filterPurchaseReport}>
            <TextField
              label='De'
              size='small'
              type='date'
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label='Ate'
              size='small'
              type='date'
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button disabled={loading} type='submit' variant='contained'>
              Filtrar compras
            </Button>
            <Button
              disabled={loading || (!dateFrom && !dateTo)}
              type='button'
              variant='outlined'
              onClick={() => void clearPurchaseReportFilters()}>
              Limpar
            </Button>
            <Button
              startIcon={<Download size={16} />}
              type='button'
              variant='outlined'
              onClick={() => exportPurchaseReportCsv(purchaseReport)}>
              CSV
            </Button>
          </form>
        }
        description='Gastos com entradas manuais e compras importadas por XML.'
        icon={<Truck size={18} />}
        title='Gastos com compras'
      />
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
        <ReportMetric
          icon={<Truck size={18} />}
          label='Entradas'
          value={String(purchaseReport.summary.entriesCount)}
        />
        <ReportMetric
          icon={<PackagePlus size={18} />}
          label='Qtde comprada'
          value={formatQuantity(purchaseReport.summary.totalQuantity)}
        />
        <ReportMetric
          icon={<Banknote size={18} />}
          label='Total comprado'
          value={formatCurrency(purchaseReport.summary.totalAmount)}
        />
        <ReportMetric
          icon={<PackageSearch size={18} />}
          label='Entrada manual'
          value={formatCurrency(purchaseReport.summary.manualAmount)}
        />
        <ReportMetric
          icon={<CreditCard size={18} />}
          label='XML NF-e'
          value={formatCurrency(purchaseReport.summary.xmlAmount)}
        />
      </div>

      <div className='mt-5 grid gap-4 xl:grid-cols-3'>
        <ResponsiveTable
          columns={[
            {
              header: 'Origem',
              render: (item) =>
                item.source === 'XML' ? 'XML de compra' : 'Entrada manual',
            },
            {
              align: 'right',
              header: 'Entradas',
              render: (item) => item.entriesCount,
            },
            {
              align: 'right',
              header: 'Total',
              render: (item) => formatCurrency(item.totalAmount),
            },
          ]}
          emptyMessage='Nenhuma compra por origem.'
          getRowId={(item) => item.source}
          items={purchaseReport.bySource ?? []}
        />

        <ResponsiveTable
          columns={[
            {
              header: 'Fornecedor',
              render: (item) => item.supplierName,
            },
            {
              align: 'right',
              header: 'Entradas',
              render: (item) => item.entriesCount,
            },
            {
              align: 'right',
              header: 'Total',
              render: (item) => formatCurrency(item.totalAmount),
            },
          ]}
          emptyMessage='Nenhuma compra por fornecedor.'
          getRowId={(item) => item.supplierId}
          items={purchaseReport.bySupplier ?? []}
        />

        <ResponsiveTable
          columns={[
            {
              header: 'Produto',
              render: (item) => item.productName,
            },
            {
              align: 'right',
              header: 'Qtde',
              render: (item) => formatQuantity(item.quantity),
            },
            {
              align: 'right',
              header: 'Total',
              render: (item) => formatCurrency(item.totalAmount),
            },
          ]}
          emptyMessage='Nenhuma compra por produto.'
          getRowId={(item) => item.productId}
          items={purchaseReport.byProduct ?? []}
        />
      </div>
    </PagePanel>
  )
}

function CashReportSection({
  cashReport,
  onLoadCashReport,
}: {
  cashReport: CashReport
  onLoadCashReport: (filters?: SalesReportFilters) => Promise<boolean>
}) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)

  async function filterCashReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    await onLoadCashReport({ dateFrom, dateTo })
    setLoading(false)
  }

  async function clearCashReportFilters() {
    setDateFrom('')
    setDateTo('')
    setLoading(true)

    await onLoadCashReport()
    setLoading(false)
  }

  return (
    <PagePanel wide>
      <PageHeader
        actions={
          <form
            className='grid w-full gap-3 sm:grid-cols-[repeat(2,minmax(160px,1fr))_auto_auto_auto] lg:w-auto'
            onSubmit={filterCashReport}>
            <TextField
              label='De'
              size='small'
              type='date'
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label='Ate'
              size='small'
              type='date'
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button disabled={loading} type='submit' variant='contained'>
              Filtrar caixa
            </Button>
            <Button
              disabled={loading || (!dateFrom && !dateTo)}
              type='button'
              variant='outlined'
              onClick={() => void clearCashReportFilters()}>
              Limpar
            </Button>
            <Button
              startIcon={<Download size={16} />}
              type='button'
              variant='outlined'
              onClick={() => exportCashReportCsv(cashReport)}>
              CSV
            </Button>
          </form>
        }
        description='Conferencia de vendas, entradas, sangrias e fechamento por caixa aberto no periodo.'
        icon={<Banknote size={18} />}
        title='Relatorio financeiro de caixa'
      />
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-6'>
        <ReportMetric
          icon={<Banknote size={18} />}
          label='Caixas'
          value={String(cashReport.summary.sessionsCount)}
        />
        <ReportMetric
          icon={<ShoppingCart size={18} />}
          label='Vendas liquidas'
          value={formatCurrency(cashReport.summary.netSalesAmount)}
        />
        <ReportMetric
          icon={<CircleDollarSign size={18} />}
          label='Suprimentos'
          value={formatCurrency(cashReport.summary.supplyAmount)}
        />
        <ReportMetric
          icon={<CreditCard size={18} />}
          label='Sangrias'
          value={formatCurrency(cashReport.summary.withdrawalAmount)}
        />
        <ReportMetric
          icon={<Banknote size={18} />}
          label='Fechamento esperado'
          value={formatCurrency(cashReport.summary.expectedClosingAmount)}
        />
        <ReportMetric
          icon={<AlertTriangle size={18} />}
          label='Divergencia fechada'
          value={formatCurrency(cashReport.summary.closedDifferenceAmount)}
        />
      </div>

      <div className='mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]'>
        <ResponsiveTable
          columns={[
            {
              header: 'Pagamento',
              render: (item) => item.paymentMethodName,
            },
            {
              align: 'right',
              header: 'Bruto',
              render: (item) => formatCurrency(item.grossAmount),
            },
            {
              align: 'right',
              header: 'Devol.',
              render: (item) => formatCurrency(item.refundAmount),
            },
            {
              align: 'right',
              header: 'Liquido',
              render: (item) => formatCurrency(item.netAmount),
            },
          ]}
          emptyMessage='Nenhum pagamento registrado no periodo.'
          getRowId={(item) => item.paymentMethodId}
          items={cashReport.byPaymentMethod ?? []}
        />

        <ResponsiveTable
          columns={[
            {
              header: 'Caixa',
              render: (item) => (
                <div className='grid gap-1'>
                  <strong>{item.openedByUserName}</strong>
                  <span className='text-xs text-[#5f665f]'>
                    {formatDateTime(item.openedAt)}
                  </span>
                </div>
              ),
            },
            {
              header: 'Status',
              render: (item) =>
                item.status === 'OPEN' ? (
                  <StatusChip label='Aberto' tone='warning' />
                ) : (
                  <StatusChip label='Fechado' tone='success' />
                ),
            },
            {
              align: 'right',
              header: 'Vendas',
              render: (item) => formatCurrency(item.salesAmount),
            },
            {
              align: 'right',
              header: 'Esperado',
              render: (item) => formatCurrency(item.expectedClosingBalance),
            },
            {
              align: 'right',
              header: 'Diverg.',
              render: (item) =>
                item.difference ? formatCurrency(item.difference) : '-',
            },
          ]}
          emptyMessage='Nenhum caixa no periodo.'
          getRowId={(item) => item.id}
          items={cashReport.sessions ?? []}
        />
      </div>
    </PagePanel>
  )
}

function StockReportSection({
  onLoadStockReport,
  stockReport,
}: {
  onLoadStockReport: (filters?: SalesReportFilters) => Promise<boolean>
  stockReport: StockReport
}) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)

  async function filterStockReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    await onLoadStockReport({ dateFrom, dateTo })
    setLoading(false)
  }

  async function clearStockReportFilters() {
    setDateFrom('')
    setDateTo('')
    setLoading(true)

    await onLoadStockReport()
    setLoading(false)
  }

  return (
    <PagePanel wide>
      <PageHeader
        actions={
          <form
            className='grid w-full gap-3 sm:grid-cols-[repeat(2,minmax(160px,1fr))_auto_auto_auto] lg:w-auto'
            onSubmit={filterStockReport}>
            <TextField
              label='De'
              size='small'
              type='date'
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label='Ate'
              size='small'
              type='date'
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button disabled={loading} type='submit' variant='contained'>
              Filtrar giro
            </Button>
            <Button
              disabled={loading || (!dateFrom && !dateTo)}
              type='button'
              variant='outlined'
              onClick={() => void clearStockReportFilters()}>
              Limpar
            </Button>
            <Button
              startIcon={<Download size={16} />}
              type='button'
              variant='outlined'
              onClick={() => exportStockReportCsv(stockReport)}>
              CSV
            </Button>
          </form>
        }
        description='Estoque baixo, produtos sem movimentacao e giro por vendas.'
        icon={<PackageSearch size={18} />}
        title='Relatorio de estoque'
      />
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <ReportMetric
          icon={<PackageSearch size={18} />}
          label='Produtos ativos'
          value={String(stockReport.summary.activeProductsCount)}
        />
        <ReportMetric
          icon={<AlertTriangle size={18} />}
          label='Estoque baixo'
          value={String(stockReport.summary.lowStockProductsCount)}
        />
        <ReportMetric
          icon={<PackagePlus size={18} />}
          label='Sem movimentacao'
          value={String(stockReport.summary.productsWithoutMovementCount)}
        />
        <ReportMetric
          icon={<ShoppingCart size={18} />}
          label='Qtde vendida'
          value={formatQuantity(stockReport.summary.soldQuantity)}
        />
      </div>

      <div className='mt-5 grid gap-4 xl:grid-cols-3'>
        <ResponsiveTable
          columns={[
            {
              header: 'Estoque baixo',
              render: (item) => item.productName,
            },
            {
              align: 'right',
              header: 'Disp.',
              render: (item) => formatQuantity(item.availableStock),
            },
            {
              align: 'right',
              header: 'Min.',
              render: (item) => formatQuantity(item.minimumStock),
            },
          ]}
          emptyMessage='Nenhum produto em estoque baixo.'
          getRowId={(item) => item.productId}
          items={stockReport.lowStockProducts ?? []}
        />

        <ResponsiveTable
          columns={[
            {
              header: 'Sem movimentacao',
              render: (item) => item.productName,
            },
            {
              align: 'right',
              header: 'Estoque',
              render: (item) => formatQuantity(item.currentStock),
            },
            {
              align: 'right',
              header: 'Min.',
              render: (item) => formatQuantity(item.minimumStock),
            },
          ]}
          emptyMessage='Nenhum produto sem movimentacao.'
          getRowId={(item) => item.productId}
          items={stockReport.productsWithoutMovement ?? []}
        />

        <ResponsiveTable
          columns={[
            {
              header: 'Giro por venda',
              render: (item) => item.productName,
            },
            {
              align: 'right',
              header: 'Qtde',
              render: (item) => formatQuantity(item.soldQuantity),
            },
            {
              header: 'Ultima venda',
              render: (item) =>
                item.lastSaleAt ? formatDateTime(item.lastSaleAt) : '-',
            },
          ]}
          emptyMessage='Nenhum giro de vendas no periodo.'
          getRowId={(item) => item.productId}
          items={stockReport.turnoverProducts ?? []}
        />
      </div>
    </PagePanel>
  )
}

function InventoryReportSection({
  onLoadInventoryReport,
  report,
}: {
  onLoadInventoryReport: (filters?: InventoryReportFilters) => Promise<boolean>
  report: InventoryReport
}) {
  const [search, setSearch] = useState('')
  const [stockStatus, setStockStatus] =
    useState<InventoryReportFilters['stockStatus']>('ALL')
  const [activeFilter, setActiveFilter] = useState<
    'ALL' | 'ACTIVE' | 'INACTIVE'
  >('ACTIVE')
  const [loading, setLoading] = useState(false)

  async function filterInventoryReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    await onLoadInventoryReport({
      active: activeFilter === 'ALL' ? undefined : activeFilter === 'ACTIVE',
      search,
      stockStatus,
    })
    setLoading(false)
  }

  async function clearInventoryReportFilters() {
    setSearch('')
    setStockStatus('ALL')
    setActiveFilter('ACTIVE')
    setLoading(true)

    await onLoadInventoryReport({ active: true })
    setLoading(false)
  }

  return (
    <PagePanel wide>
      <PageHeader
        actions={
          <form
            className='grid w-full gap-3 md:grid-cols-[minmax(220px,1fr)_170px_170px_auto_auto_auto] lg:w-auto'
            onSubmit={filterInventoryReport}>
            <TextField
              label='Buscar'
              placeholder='Produto, código, fabricante ou locação'
              size='small'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <TextField
              label='Estoque'
              select
              size='small'
              value={stockStatus}
              onChange={(event) =>
                setStockStatus(
                  event.target.value as InventoryReportFilters['stockStatus'],
                )
              }>
              <MenuItem value='ALL'>Todos</MenuItem>
              <MenuItem value='AVAILABLE'>Disponivel</MenuItem>
              <MenuItem value='LOW'>Baixo</MenuItem>
              <MenuItem value='NEGATIVE'>Negativo</MenuItem>
              <MenuItem value='OUT_OF_STOCK'>Sem saldo</MenuItem>
            </TextField>
            <TextField
              label='Status'
              select
              size='small'
              value={activeFilter}
              onChange={(event) =>
                setActiveFilter(
                  event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE',
                )
              }>
              <MenuItem value='ACTIVE'>Ativos</MenuItem>
              <MenuItem value='ALL'>Todos</MenuItem>
              <MenuItem value='INACTIVE'>Inativos</MenuItem>
            </TextField>
            <Button disabled={loading} type='submit' variant='contained'>
              Filtrar
            </Button>
            <Button
              disabled={
                loading ||
                (!search && stockStatus === 'ALL' && activeFilter === 'ACTIVE')
              }
              type='button'
              variant='outlined'
              onClick={() => void clearInventoryReportFilters()}>
              Limpar
            </Button>
            <Button
              startIcon={<Download size={16} />}
              type='button'
              variant='outlined'
              onClick={() => exportInventoryReportCsv(report)}>
              CSV
            </Button>
          </form>
        }
        description='Snapshot de saldo fisico, reservado, disponivel e valores de estoque.'
        icon={<PackageSearch size={18} />}
        title='Inventario'
      />
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-6'>
        <ReportMetric
          icon={<PackageSearch size={18} />}
          label='Produtos'
          value={String(report.summary.productsCount)}
        />
        <ReportMetric
          icon={<PackagePlus size={18} />}
          label='Fisico'
          value={formatQuantity(report.summary.totalCurrentStock)}
        />
        <ReportMetric
          icon={<Send size={18} />}
          label='Reservado'
          value={formatQuantity(report.summary.totalReservedStock)}
        />
        <ReportMetric
          icon={<ShoppingCart size={18} />}
          label='Disponivel'
          value={formatQuantity(report.summary.totalAvailableStock)}
        />
        <ReportMetric
          icon={<Banknote size={18} />}
          label='Custo total'
          value={formatCurrency(report.summary.totalCostAmount)}
        />
        <ReportMetric
          icon={<CircleDollarSign size={18} />}
          label='Venda total'
          value={formatCurrency(report.summary.totalSaleAmount)}
        />
      </div>
      <span className='text-sm text-[#5f665f]'>
        Baixo estoque: {report.summary.lowStockProductsCount} · Estoque
        negativo: {report.summary.negativeStockProductsCount} · Exibindo{' '}
        {report.summary.returnedProductsCount} de {report.summary.productsCount}
      </span>

      <div className='mt-5'>
        <ResponsiveTable
          columns={[
            {
              header: 'Produto',
              render: (item) => (
                <div className='grid gap-1'>
                  <strong>{item.productName}</strong>
                  <span className='text-xs text-[#5f665f]'>
                    {item.internalCode ?? item.barcode ?? 'Sem codigo'} ·{' '}
                    {item.brandName ?? 'Sem fabricante'}
                  </span>
                </div>
              ),
            },
            {
              header: 'Locação',
              render: (item) => item.location ?? '-',
            },
            {
              align: 'right',
              header: 'Fisico',
              render: (item) => formatQuantity(item.currentStock),
            },
            {
              align: 'right',
              header: 'Reservado',
              render: (item) => formatQuantity(item.reservedStock),
            },
            {
              align: 'right',
              header: 'Disponivel',
              render: (item) => formatQuantity(item.availableStock),
            },
            {
              align: 'right',
              header: 'Custo total',
              render: (item) => formatCurrency(item.totalCostAmount),
            },
            {
              align: 'right',
              header: 'Venda total',
              render: (item) => formatCurrency(item.totalSaleAmount),
            },
            {
              header: 'Situacao',
              render: (item) => (
                <StatusChip
                  label={inventoryStockStatusLabel(item.stockStatus)}
                  tone={inventoryStockStatusTone(item.stockStatus)}
                />
              ),
            },
          ]}
          emptyMessage='Nenhum produto encontrado no inventario.'
          getRowId={(item) => item.productId}
          items={report.items}
        />
      </div>
    </PagePanel>
  )
}

type SalesReportFilters = {
  dateFrom?: string
  dateTo?: string
}

type InventoryReportFilters = {
  active?: boolean
  search?: string
  stockStatus?: 'ALL' | 'LOW' | 'NEGATIVE' | 'AVAILABLE' | 'OUT_OF_STOCK'
}

function abcTone(abcClass: 'A' | 'B' | 'C'): StatusTone {
  if (abcClass === 'A') {
    return 'success'
  }

  if (abcClass === 'B') {
    return 'warning'
  }

  return 'neutral'
}

function saleStatusLabel(
  status: UserPerformanceReport['sales'][number]['status'],
) {
  const labels = {
    OPEN: 'Em aberto',
    COMPLETED: 'Concluida',
    CANCELLED: 'Cancelada',
  }

  return labels[status] ?? status
}

function inventoryStockStatusLabel(
  status: InventoryReport['items'][number]['stockStatus'],
) {
  const labels = {
    AVAILABLE: 'Disponivel',
    LOW: 'Baixo',
    NEGATIVE: 'Negativo',
    OUT_OF_STOCK: 'Sem saldo',
  }

  return labels[status]
}

function inventoryStockStatusTone(
  status: InventoryReport['items'][number]['stockStatus'],
): StatusTone {
  if (status === 'AVAILABLE') {
    return 'success'
  }

  if (status === 'LOW') {
    return 'warning'
  }

  return 'error'
}

function exportSalesReportCsv(report: SalesReport) {
  downloadCsv('relatorio-vendas', [
    ['Secao', 'Indicador', 'Valor'],
    ['Resumo', 'Vendas', report.summary.salesCount],
    ['Resumo', 'Itens vendidos', report.summary.itemsQuantity],
    ['Resumo', 'Bruto', report.summary.grossAmount],
    ['Resumo', 'Desconto', report.summary.discountAmount],
    ['Resumo', 'Custo', report.summary.costAmount],
    ['Resumo', 'Lucro', report.summary.grossProfitAmount],
    ['Resumo', 'Margem geral', `${report.summary.grossMarginPercentage}%`],
    ['Resumo', 'Liquido', report.summary.netAmount],
    [],
    [
      'Vendas por produto',
      'Produto',
      'Quantidade',
      'Total',
      'Custo',
      'Lucro',
      'Margem',
    ],
    ...report.byProduct.map((item) => [
      'Vendas por produto',
      item.productName,
      item.quantity,
      item.totalAmount,
      item.costAmount,
      item.grossProfitAmount,
      `${item.grossMarginPercentage}%`,
    ]),
    [],
    ['Vendas por cliente', 'Cliente', 'Vendas', 'Total'],
    ...report.byClient.map((item) => [
      'Vendas por cliente',
      item.clientName,
      item.salesCount,
      item.totalAmount,
    ]),
    [],
    ['Vendas por pagamento', 'Forma de pagamento', 'Total'],
    ...report.byPaymentMethod.map((item) => [
      'Vendas por pagamento',
      item.paymentMethodName,
      item.totalAmount,
    ]),
    [],
    [
      'Curva ABC',
      'Produto',
      'Faturamento',
      'Participacao',
      'Acumulado',
      'Classe',
    ],
    ...report.abcProducts.map((item) => [
      'Curva ABC',
      item.productName,
      item.totalAmount,
      `${item.revenueSharePercentage}%`,
      `${item.cumulativeRevenuePercentage}%`,
      item.abcClass,
    ]),
  ])
}

function exportUserPerformanceReportCsv(report: UserPerformanceReport) {
  downloadCsv('relatorio-usuarios', [
    ['Secao', 'Indicador', 'Valor'],
    ['Resumo', 'Usuarios', report.summary.usersCount],
    ['Resumo', 'Vendas concluidas', report.summary.salesCount],
    ['Resumo', 'Bruto', report.summary.grossAmount],
    ['Resumo', 'Devolucoes', report.summary.refundAmount],
    ['Resumo', 'Liquido', report.summary.netAmount],
    ['Resumo', 'Orcamentos criados', report.summary.quotesCreatedCount],
    ['Resumo', 'Movimentacoes de estoque', report.summary.stockMovementsCount],
    ['Resumo', 'NF-e emitidas', report.summary.fiscalDocumentsIssuedCount],
    [],
    [
      'Resumo por usuario',
      'Usuario',
      'Vendas concluidas',
      'Vendas canceladas',
      'Vendas em aberto',
      'Bruto',
      'Devolucoes',
      'Liquido',
      'Orcamentos',
      'Movimentacoes estoque',
      'NF-e emitidas',
    ],
    ...report.users.map((item) => [
      'Resumo por usuario',
      item.userName,
      item.salesCount,
      item.cancelledSalesCount,
      item.openSalesCount,
      item.grossAmount,
      item.refundAmount,
      item.netAmount,
      item.quotesCreatedCount,
      item.stockMovementsCount,
      item.fiscalDocumentsIssuedCount,
    ]),
    [],
    [
      'Vendas recentes',
      'Numero da venda',
      'Data',
      'Usuario',
      'Cliente',
      'Status',
      'Total',
      'Devolucoes',
      'Liquido',
    ],
    ...report.sales.map((item) => [
      'Vendas recentes',
      item.saleNumber,
      formatDateTime(item.createdAt),
      item.userName,
      item.clientName,
      saleStatusLabel(item.status),
      item.totalAmount,
      item.refundAmount,
      item.netAmount,
    ]),
  ])
}

function exportInventoryReportCsv(report: InventoryReport) {
  downloadCsv('relatorio-inventario', [
    ['Secao', 'Indicador', 'Valor'],
    ['Resumo', 'Produtos filtrados', report.summary.productsCount],
    ['Resumo', 'Produtos exportados', report.summary.returnedProductsCount],
    ['Resumo', 'Estoque fisico', report.summary.totalCurrentStock],
    ['Resumo', 'Estoque reservado', report.summary.totalReservedStock],
    ['Resumo', 'Estoque disponivel', report.summary.totalAvailableStock],
    ['Resumo', 'Valor de custo', report.summary.totalCostAmount],
    ['Resumo', 'Valor de venda', report.summary.totalSaleAmount],
    ['Resumo', 'Lucro potencial', report.summary.potentialProfitAmount],
    [
      'Resumo',
      'Produtos em baixo estoque',
      report.summary.lowStockProductsCount,
    ],
    [
      'Resumo',
      'Produtos com estoque negativo',
      report.summary.negativeStockProductsCount,
    ],
    [],
    [
      'Inventario',
      'Produto',
      'Codigo interno',
      'Codigo de barras',
      'Fabricante',
      'Grupo',
      'Unidade',
      'Locação',
      'Custo unitario',
      'Venda unitaria',
      'Fisico',
      'Reservado',
      'Disponivel',
      'Minimo',
      'Custo total',
      'Venda total',
      'Situacao',
      'Status cadastro',
    ],
    ...report.items.map((item) => [
      'Inventario',
      item.productName,
      item.internalCode ?? '',
      item.barcode ?? '',
      item.brandName ?? '',
      item.groupName ?? '',
      item.unit,
      item.location ?? '',
      item.costPrice,
      item.salePrice,
      item.currentStock,
      item.reservedStock,
      item.availableStock,
      item.minimumStock,
      item.totalCostAmount,
      item.totalSaleAmount,
      inventoryStockStatusLabel(item.stockStatus),
      item.active ? 'Ativo' : 'Inativo',
    ]),
  ])
}

function exportPurchaseReportCsv(report: PurchaseReport) {
  downloadCsv('relatorio-compras', [
    ['Secao', 'Indicador', 'Valor'],
    ['Resumo', 'Entradas', report.summary.entriesCount],
    ['Resumo', 'Quantidade comprada', report.summary.totalQuantity],
    ['Resumo', 'Total comprado', report.summary.totalAmount],
    ['Resumo', 'Entrada manual', report.summary.manualAmount],
    ['Resumo', 'XML NF-e', report.summary.xmlAmount],
    [],
    ['Compras por origem', 'Origem', 'Entradas', 'Quantidade', 'Total'],
    ...report.bySource.map((item) => [
      'Compras por origem',
      item.source === 'XML' ? 'XML de compra' : 'Entrada manual',
      item.entriesCount,
      item.totalQuantity,
      item.totalAmount,
    ]),
    [],
    ['Compras por fornecedor', 'Fornecedor', 'Entradas', 'Total'],
    ...report.bySupplier.map((item) => [
      'Compras por fornecedor',
      item.supplierName,
      item.entriesCount,
      item.totalAmount,
    ]),
    [],
    ['Compras por produto', 'Produto', 'Quantidade', 'Total'],
    ...report.byProduct.map((item) => [
      'Compras por produto',
      item.productName,
      item.quantity,
      item.totalAmount,
    ]),
  ])
}

function exportCashReportCsv(report: CashReport) {
  downloadCsv('relatorio-caixa', [
    ['Secao', 'Indicador', 'Valor'],
    ['Resumo', 'Caixas', report.summary.sessionsCount],
    ['Resumo', 'Caixas abertos', report.summary.openSessionsCount],
    ['Resumo', 'Caixas fechados', report.summary.closedSessionsCount],
    ['Resumo', 'Abertura', report.summary.openingAmount],
    ['Resumo', 'Vendas brutas', report.summary.grossSalesAmount],
    ['Resumo', 'Devolucoes', report.summary.refundAmount],
    ['Resumo', 'Vendas liquidas', report.summary.netSalesAmount],
    ['Resumo', 'Suprimentos', report.summary.supplyAmount],
    ['Resumo', 'Sangrias', report.summary.withdrawalAmount],
    ['Resumo', 'Fechamento esperado', report.summary.expectedClosingAmount],
    ['Resumo', 'Fechamento informado', report.summary.closingAmount],
    ['Resumo', 'Divergencia fechada', report.summary.closedDifferenceAmount],
    [],
    [
      'Caixa por pagamento',
      'Forma de pagamento',
      'Bruto',
      'Devolucoes',
      'Liquido',
    ],
    ...report.byPaymentMethod.map((item) => [
      'Caixa por pagamento',
      item.paymentMethodName,
      item.grossAmount,
      item.refundAmount,
      item.netAmount,
    ]),
    [],
    [
      'Caixas',
      'Operador abertura',
      'Operador fechamento',
      'Status',
      'Abertura',
      'Fechamento',
      'Saldo inicial',
      'Vendas',
      'Suprimentos',
      'Sangrias',
      'Esperado',
      'Informado',
      'Divergencia',
    ],
    ...report.sessions.map((item) => [
      'Caixas',
      item.openedByUserName,
      item.closedByUserName ?? '',
      item.status === 'OPEN' ? 'Aberto' : 'Fechado',
      formatDateTime(item.openedAt),
      item.closedAt ? formatDateTime(item.closedAt) : '',
      item.openingBalance,
      item.salesAmount,
      item.supplyAmount,
      item.withdrawalAmount,
      item.expectedClosingBalance,
      item.closingBalance ?? '',
      item.difference ?? '',
    ]),
  ])
}

function exportStockReportCsv(report: StockReport) {
  downloadCsv('relatorio-estoque', [
    ['Secao', 'Indicador', 'Valor'],
    ['Resumo', 'Produtos ativos', report.summary.activeProductsCount],
    ['Resumo', 'Estoque baixo', report.summary.lowStockProductsCount],
    ['Resumo', 'Sem movimentacao', report.summary.productsWithoutMovementCount],
    ['Resumo', 'Quantidade vendida', report.summary.soldQuantity],
    [],
    ['Estoque baixo', 'Produto', 'Fisico', 'Reservado', 'Disponivel', 'Minimo'],
    ...report.lowStockProducts.map((item) => [
      'Estoque baixo',
      item.productName,
      item.currentStock,
      item.reservedStock,
      item.availableStock,
      item.minimumStock,
    ]),
    [],
    ['Sem movimentacao', 'Produto', 'Fisico', 'Minimo'],
    ...report.productsWithoutMovement.map((item) => [
      'Sem movimentacao',
      item.productName,
      item.currentStock,
      item.minimumStock,
    ]),
    [],
    ['Giro por venda', 'Produto', 'Quantidade vendida', 'Ultima venda'],
    ...report.turnoverProducts.map((item) => [
      'Giro por venda',
      item.productName,
      item.soldQuantity,
      item.lastSaleAt ? formatDateTime(item.lastSaleAt) : '',
    ]),
  ])
}

function downloadCsv(filename: string, rows: CsvRow[]) {
  const csv = rows.map(csvLine).join('\n')
  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

type CsvRow = Array<string | number | null | undefined>

function csvLine(row: CsvRow) {
  return row.map(csvCell).join(';')
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? '')

  return `"${text.replace(/"/g, '""')}"`
}

function ReportDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-2xl border border-[#dfe5e1] bg-[#fbfcfb] p-4'>
      <span className='text-sm text-[#5f665f]'>{label}</span>
      <strong className='mt-1 block text-[#2c281e]'>{value}</strong>
    </div>
  )
}

function ReportMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className='grid min-h-28 content-start gap-2 rounded-2xl border border-[#dfe5e1] bg-white p-4 shadow-sm'>
      <span
        className='flex h-9 w-9 items-center justify-center rounded-full'
        style={{
          backgroundColor: 'rgba(32, 52, 102, 0.08)',
          color: frontendPalette.primaryNavy,
        }}>
        {icon}
      </span>
      <span className='text-sm text-[#5f665f]'>{label}</span>
      <strong className='text-2xl text-[#2c281e]'>{value}</strong>
    </div>
  )
}
