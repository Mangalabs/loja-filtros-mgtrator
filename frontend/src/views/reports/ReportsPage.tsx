import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import TextField from '@mui/material/TextField'
import {
  ArrowLeft,
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
  SlidersHorizontal,
  Truck,
  X,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import type {
  CashReport,
  InventoryReport,
  PurchaseReport,
  ReportsOverview,
  SalesReport,
  StockReport,
  UserPerformanceReport,
} from '../../api'
import { apiGet, downloadApiFile, type ApiResult } from '../../api'
import {
  PageHeader,
  PagePanel,
  ResponsiveTable as BaseResponsiveTable,
  type ResponsiveTableColumn,
} from '../../components/layout'
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
  const [activeReport, setActiveReport] = useState<ReportHubView>('hub')
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
          activeReport={activeReport}
          onSelectReport={setActiveReport}
        />
      ) : null,
  }
  const state =
    overview && salesReport && stockReport && purchaseReport && cashReport
      ? 'ready'
      : 'loading'

  return contentByState[state]
}

type ReportHubView =
  | 'hub'
  | 'sales'
  | 'users'
  | 'purchases'
  | 'cash'
  | 'stock'
  | 'inventory'

function ReportsLoading() {
  return (
    <PagePanel wide>
      <PageHeader
        description='Carregando indicadores operacionais…'
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

function useReportAction() {
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)

  async function run(action: () => Promise<boolean>) {
    if (loadingRef.current) {
      return false
    }

    loadingRef.current = true
    setLoading(true)

    try {
      return await action()
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }

  return { loading, run }
}

const defaultReportRowsPerPage = 10
const reportRowsPerPageOptions = [10, 25, 50]

function ResponsiveTable<T>({
  columns,
  emptyMessage,
  getRowId,
  items,
  loading,
}: {
  columns: Array<ResponsiveTableColumn<T>>
  emptyMessage: ReactNode
  getRowId: (item: T) => string
  items: T[]
  loading?: boolean
}) {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(defaultReportRowsPerPage)

  useEffect(() => {
    setPage(0)
  }, [items])

  const lastPage = Math.max(0, Math.ceil(items.length / rowsPerPage) - 1)
  const visiblePage = Math.min(page, lastPage)
  const firstVisibleItem = visiblePage * rowsPerPage
  const visibleItems = items.slice(
    firstVisibleItem,
    firstVisibleItem + rowsPerPage,
  )

  return (
    <BaseResponsiveTable
      columns={columns}
      emptyMessage={emptyMessage}
      getRowId={getRowId}
      items={visibleItems}
      loading={loading}
      pagination={
        items.length > defaultReportRowsPerPage
          ? {
              count: items.length,
              page: visiblePage,
              rowsPerPage,
              rowsPerPageOptions: reportRowsPerPageOptions,
              onPageChange: setPage,
              onRowsPerPageChange: (nextRowsPerPage) => {
                setRowsPerPage(nextRowsPerPage)
                setPage(0)
              },
            }
          : undefined
      }
    />
  )
}

function ReportPdfButton({
  filename,
  filters,
  path,
}: {
  filename: string
  filters: ReportDownloadFilters | InventoryReportFilters
  path: string
}) {
  const [downloading, setDownloading] = useState(false)
  const downloadingRef = useRef(false)

  async function download() {
    if (downloadingRef.current) {
      return
    }

    downloadingRef.current = true
    setDownloading(true)

    try {
      await downloadReportPdf(path, filters, filename)
    } finally {
      downloadingRef.current = false
      setDownloading(false)
    }
  }

  return (
    <Button
      disabled={downloading}
      loading={downloading}
      startIcon={<FileText size={16} />}
      type='button'
      variant='outlined'
      onClick={() => void download()}>
      {downloading ? 'Gerando…' : 'PDF'}
    </Button>
  )
}

type ReportExportColumnOption<Key extends string> = {
  csvHeaders?: readonly string[]
  key: Key
  label: string
}

function ReportColumnsDrawer<Key extends string>({
  columns,
  defaultColumns,
  open,
  selectedColumns,
  onChange,
  onClose,
}: {
  columns: ReadonlyArray<ReportExportColumnOption<Key>>
  defaultColumns: readonly Key[]
  open: boolean
  selectedColumns: Key[]
  onChange: (columns: Key[]) => void
  onClose: () => void
}) {
  function toggleColumn(column: Key) {
    if (selectedColumns.includes(column)) {
      if (selectedColumns.length === 1) {
        return
      }

      onChange(
        selectedColumns.filter((selectedColumn) => selectedColumn !== column),
      )
      return
    }

    onChange([...selectedColumns, column])
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      slotProps={{
        paper: {
          sx: {
            maxWidth: '100vw',
            overflowX: 'hidden',
          },
        },
      }}
      onClose={onClose}>
      <div className='flex h-full min-h-0 w-[min(92vw,400px)] max-w-full flex-col overflow-hidden bg-white overscroll-contain'>
        <div className='flex shrink-0 items-start justify-between gap-4 border-b border-[#dfe5e1] p-5'>
          <div className='min-w-0'>
            <h2 className='m-0 break-words text-xl font-bold text-[#2c281e]'>
              Campos do arquivo
            </h2>
            <p className='mb-0 mt-1 break-words text-sm text-[#5f665f]'>
              A seleção será aplicada aos arquivos PDF e CSV.
            </p>
          </div>
          <IconButton aria-label='Fechar seleção de campos' onClick={onClose}>
            <X aria-hidden='true' size={20} />
          </IconButton>
        </div>

        <FormGroup
          className='min-h-0 min-w-0 flex-1 gap-1 overflow-x-hidden overflow-y-auto p-4 sm:p-5'
          sx={{
            flexWrap: 'nowrap',
            scrollbarGutter: 'stable',
          }}>
          {columns.map((column) => {
            const checked = selectedColumns.includes(column.key)

            return (
              <FormControlLabel
                className='min-w-0 rounded-lg px-1 py-0.5 hover:bg-[#f7f7f4] sm:px-2'
                control={
                  <Checkbox
                    checked={checked}
                    disabled={checked && selectedColumns.length === 1}
                    size='small'
                    sx={{ flexShrink: 0 }}
                    onChange={() => toggleColumn(column.key)}
                  />
                }
                key={column.key}
                label={column.label}
                sx={{
                  alignItems: 'flex-start',
                  display: 'flex',
                  margin: 0,
                  width: '100%',
                  '& .MuiFormControlLabel-label': {
                    flex: 1,
                    lineHeight: 1.35,
                    minWidth: 0,
                    overflowWrap: 'break-word',
                    paddingTop: '8px',
                    whiteSpace: 'normal',
                  },
                }}
              />
            )
          })}
        </FormGroup>

        <div className='flex min-w-0 shrink-0 flex-wrap justify-end gap-2 border-t border-[#dfe5e1] p-4 sm:p-5'>
          <Button
            type='button'
            variant='outlined'
            onClick={() => onChange([...defaultColumns])}>
            Restaurar padrão
          </Button>
          <Button type='button' variant='contained' onClick={onClose}>
            Concluir
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

const salesReportExportColumns = [
  { key: 'code', label: 'Código do produto', csvHeaders: ['Codigo'] },
  { key: 'product', label: 'Produto', csvHeaders: ['Produto'] },
  { key: 'quantity', label: 'Quantidade', csvHeaders: ['Quantidade'] },
  { key: 'total', label: 'Total / faturamento', csvHeaders: ['Total', 'Faturamento'] },
  { key: 'cost', label: 'Custo', csvHeaders: ['Custo'] },
  { key: 'profit', label: 'Lucro', csvHeaders: ['Lucro'] },
  { key: 'margin', label: 'Margem', csvHeaders: ['Margem'] },
  { key: 'client', label: 'Cliente', csvHeaders: ['Cliente'] },
  { key: 'sales', label: 'Quantidade de vendas', csvHeaders: ['Vendas'] },
  {
    key: 'paymentMethod',
    label: 'Forma de pagamento',
    csvHeaders: ['Forma de pagamento'],
  },
  { key: 'participation', label: 'Participação', csvHeaders: ['Participacao'] },
  { key: 'cumulative', label: 'Participação acumulada', csvHeaders: ['Acumulado'] },
  { key: 'class', label: 'Classe ABC', csvHeaders: ['Classe'] },
] as const

type SalesReportExportColumnKey =
  (typeof salesReportExportColumns)[number]['key']

const defaultSalesReportExportColumns = salesReportExportColumns.map(
  (column) => column.key,
)

const userReportExportColumns = [
  { key: 'user', label: 'Usuário', csvHeaders: ['Usuario'] },
  { key: 'completedSales', label: 'Vendas concluídas', csvHeaders: ['Vendas concluidas'] },
  { key: 'cancelledSales', label: 'Vendas canceladas', csvHeaders: ['Vendas canceladas'] },
  { key: 'openSales', label: 'Vendas em aberto', csvHeaders: ['Vendas em aberto'] },
  { key: 'gross', label: 'Valor bruto', csvHeaders: ['Bruto'] },
  { key: 'refunds', label: 'Devoluções', csvHeaders: ['Devolucoes'] },
  { key: 'net', label: 'Valor líquido', csvHeaders: ['Liquido'] },
  { key: 'quotes', label: 'Orçamentos', csvHeaders: ['Orcamentos'] },
  {
    key: 'stockMovements',
    label: 'Movimentações de estoque',
    csvHeaders: ['Movimentacoes estoque'],
  },
  { key: 'fiscalDocuments', label: 'NF-e emitidas', csvHeaders: ['NF-e emitidas'] },
  { key: 'saleNumber', label: 'Número da venda', csvHeaders: ['Numero da venda'] },
  { key: 'date', label: 'Data', csvHeaders: ['Data'] },
  { key: 'client', label: 'Cliente', csvHeaders: ['Cliente'] },
  { key: 'status', label: 'Status', csvHeaders: ['Status'] },
  { key: 'total', label: 'Total', csvHeaders: ['Total'] },
] as const

type UserReportExportColumnKey =
  (typeof userReportExportColumns)[number]['key']

const defaultUserReportExportColumns = userReportExportColumns.map(
  (column) => column.key,
)

const purchaseReportExportColumns = [
  { key: 'source', label: 'Origem', csvHeaders: ['Origem'] },
  { key: 'entries', label: 'Entradas', csvHeaders: ['Entradas'] },
  { key: 'quantity', label: 'Quantidade', csvHeaders: ['Quantidade'] },
  { key: 'total', label: 'Total', csvHeaders: ['Total'] },
  { key: 'supplier', label: 'Fornecedor', csvHeaders: ['Fornecedor'] },
  { key: 'product', label: 'Produto', csvHeaders: ['Produto'] },
] as const

type PurchaseReportExportColumnKey =
  (typeof purchaseReportExportColumns)[number]['key']

const defaultPurchaseReportExportColumns = purchaseReportExportColumns.map(
  (column) => column.key,
)

const cashReportExportColumns = [
  {
    key: 'paymentMethod',
    label: 'Forma de pagamento',
    csvHeaders: ['Forma de pagamento'],
  },
  { key: 'gross', label: 'Valor bruto', csvHeaders: ['Bruto'] },
  { key: 'refunds', label: 'Devoluções', csvHeaders: ['Devolucoes'] },
  { key: 'net', label: 'Valor líquido', csvHeaders: ['Liquido'] },
  { key: 'openedBy', label: 'Operador de abertura', csvHeaders: ['Operador abertura'] },
  { key: 'closedBy', label: 'Operador de fechamento', csvHeaders: ['Operador fechamento'] },
  { key: 'status', label: 'Status', csvHeaders: ['Status'] },
  { key: 'openedAt', label: 'Abertura', csvHeaders: ['Abertura'] },
  { key: 'closedAt', label: 'Fechamento', csvHeaders: ['Fechamento'] },
  { key: 'openingBalance', label: 'Saldo inicial', csvHeaders: ['Saldo inicial'] },
  { key: 'sales', label: 'Vendas', csvHeaders: ['Vendas'] },
  { key: 'supplies', label: 'Suprimentos', csvHeaders: ['Suprimentos'] },
  { key: 'withdrawals', label: 'Sangrias', csvHeaders: ['Sangrias'] },
  { key: 'expected', label: 'Fechamento esperado', csvHeaders: ['Esperado'] },
  { key: 'reported', label: 'Fechamento informado', csvHeaders: ['Informado'] },
  { key: 'difference', label: 'Divergência', csvHeaders: ['Divergencia'] },
] as const

type CashReportExportColumnKey =
  (typeof cashReportExportColumns)[number]['key']

const defaultCashReportExportColumns = cashReportExportColumns.map(
  (column) => column.key,
)

const stockReportExportColumns = [
  { key: 'code', label: 'Código do produto', csvHeaders: ['Código'] },
  { key: 'product', label: 'Produto', csvHeaders: ['Produto'] },
  { key: 'location', label: 'Locação', csvHeaders: ['Locação'] },
  { key: 'movements', label: 'Movimentações', csvHeaders: ['Movimentacoes'] },
  { key: 'entryQuantity', label: 'Quantidade de entrada', csvHeaders: ['Quantidade entrada'] },
  { key: 'entryAmount', label: 'Valor de entrada', csvHeaders: ['Valor entrada'] },
  { key: 'exitQuantity', label: 'Quantidade de saída', csvHeaders: ['Quantidade saida'] },
  { key: 'exitCost', label: 'Custo de saída', csvHeaders: ['Custo saida'] },
  {
    key: 'adjustmentQuantity',
    label: 'Quantidade de ajustes',
    csvHeaders: ['Quantidade ajustes/recomposicoes'],
  },
  {
    key: 'adjustmentCost',
    label: 'Valor de ajustes',
    csvHeaders: ['Valor ajustes/recomposicoes'],
  },
  { key: 'balance', label: 'Saldo em quantidade', csvHeaders: ['Saldo quantidade'] },
  { key: 'lastMovement', label: 'Última movimentação', csvHeaders: ['Ultima movimentacao'] },
  { key: 'movementType', label: 'Tipo de movimentação', csvHeaders: ['Tipo'] },
  { key: 'movementQuantity', label: 'Quantidade movimentada', csvHeaders: ['Quantidade'] },
  { key: 'value', label: 'Valor base', csvHeaders: ['Valor'] },
  { key: 'currentStock', label: 'Estoque físico', csvHeaders: ['Fisico'] },
  { key: 'reservedStock', label: 'Estoque reservado', csvHeaders: ['Reservado'] },
  { key: 'availableStock', label: 'Estoque disponível', csvHeaders: ['Disponivel'] },
  { key: 'minimumStock', label: 'Estoque mínimo', csvHeaders: ['Minimo'] },
  { key: 'soldQuantity', label: 'Quantidade vendida', csvHeaders: ['Quantidade vendida'] },
  { key: 'lastSale', label: 'Última venda', csvHeaders: ['Ultima venda'] },
] as const

type StockReportExportColumnKey =
  (typeof stockReportExportColumns)[number]['key']

const defaultStockReportExportColumns = stockReportExportColumns.map(
  (column) => column.key,
)

function ReportsOverviewContent({
  activeReport,
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
  onSelectReport,
}: {
  activeReport: ReportHubView
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
  onSelectReport: (report: ReportHubView) => void
}) {
  if (activeReport !== 'hub') {
    return (
      <section className='grid gap-4'>
        <div>
          <Button
            startIcon={<ArrowLeft size={16} />}
            type='button'
            variant='outlined'
            onClick={() => onSelectReport('hub')}>
            Voltar aos relatórios
          </Button>
        </div>
        {activeReport === 'sales' ? (
          <SalesReportSection
            salesReport={salesReport}
            onLoadSalesReport={onLoadSalesReport}
          />
        ) : null}
        {activeReport === 'users' && userPerformanceReport ? (
          <UserPerformanceReportSection
            report={userPerformanceReport}
            onLoadUserPerformanceReport={onLoadUserPerformanceReport}
          />
        ) : null}
        {activeReport === 'purchases' ? (
          <PurchaseReportSection
            purchaseReport={purchaseReport}
            onLoadPurchaseReport={onLoadPurchaseReport}
          />
        ) : null}
        {activeReport === 'cash' ? (
          <CashReportSection
            cashReport={cashReport}
            onLoadCashReport={onLoadCashReport}
          />
        ) : null}
        {activeReport === 'stock' ? (
          <StockReportSection
            stockReport={stockReport}
            onLoadStockReport={onLoadStockReport}
          />
        ) : null}
        {activeReport === 'inventory' && inventoryReport ? (
          <InventoryReportSection
            report={inventoryReport}
            onLoadInventoryReport={onLoadInventoryReport}
          />
        ) : null}
      </section>
    )
  }

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

      <PagePanel wide>
        <PageHeader
          description='Escolha uma área para consultar os dados detalhados.'
          icon={<SlidersHorizontal size={18} />}
          title='Hub de relatórios'
        />
        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
          <ReportHubCard
            description='Período, produtos, clientes e formas de pagamento.'
            icon={<ShoppingCart size={20} />}
            title='Vendas'
            onClick={() => onSelectReport('sales')}
          />
          {userPerformanceReport ? (
            <ReportHubCard
              description='Vendas e ações operacionais por usuário.'
              icon={<CircleDollarSign size={20} />}
              title='Usuários'
              onClick={() => onSelectReport('users')}
            />
          ) : null}
          <ReportHubCard
            description='Compras manuais e XMLs lançados no estoque.'
            icon={<Truck size={20} />}
            title='Compras'
            onClick={() => onSelectReport('purchases')}
          />
          <ReportHubCard
            description='Movimentações, fechamento e diferenças por forma.'
            icon={<Banknote size={20} />}
            title='Caixa'
            onClick={() => onSelectReport('cash')}
          />
          <ReportHubCard
            description='Entradas, saídas, giro e produtos sem movimento.'
            icon={<PackageSearch size={20} />}
            title='Estoque'
            onClick={() => onSelectReport('stock')}
          />
          {inventoryReport ? (
            <ReportHubCard
              description='Saldo físico, valor em estoque e filtros de inventário.'
              icon={<PackagePlus size={20} />}
              title='Inventário'
              onClick={() => onSelectReport('inventory')}
            />
          ) : null}
        </div>
      </PagePanel>
    </section>
  )
}

function ReportHubCard({
  description,
  icon,
  title,
  onClick,
}: {
  description: string
  icon: ReactNode
  title: string
  onClick: () => void
}) {
  return (
    <button
      className='grid min-h-[132px] gap-3 rounded-lg border border-[#dfe5df] bg-white p-4 text-left shadow-sm transition hover:border-[#b7c4b8] hover:bg-[#fbfcfb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#203466]'
      type='button'
      onClick={onClick}>
      <span className='flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef2f6] text-[#203466]'>
        {icon}
      </span>
      <span className='grid gap-1'>
        <strong className='text-base text-[#2c281e]'>{title}</strong>
        <span className='text-sm leading-5 text-[#5f665f]'>{description}</span>
      </span>
    </button>
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
  const [columnsDrawerOpen, setColumnsDrawerOpen] = useState(false)
  const [selectedColumns, setSelectedColumns] = useState<
    SalesReportExportColumnKey[]
  >([...defaultSalesReportExportColumns])
  const { loading, run } = useReportAction()

  async function filterSalesReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await run(() => onLoadSalesReport({ dateFrom, dateTo }))
  }

  async function clearSalesReportFilters() {
    setDateFrom('')
    setDateTo('')
    await run(() => onLoadSalesReport())
  }

  return (
    <PagePanel wide>
      <PageHeader
        actions={
          <form
            className='grid w-full gap-3 sm:grid-cols-[repeat(2,minmax(160px,1fr))_auto_auto_auto_auto_auto] lg:w-auto'
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
            <Button loading={loading} type='submit' variant='contained'>
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
              startIcon={<SlidersHorizontal size={16} />}
              type='button'
              variant='outlined'
              onClick={() => setColumnsDrawerOpen(true)}>
              Campos ({selectedColumns.length})
            </Button>
            <Button
              startIcon={<Download size={16} />}
              type='button'
              variant='outlined'
              onClick={() => exportSalesReportCsv(salesReport, selectedColumns)}>
              CSV
            </Button>
            <ReportPdfButton
              filename='relatorio-vendas'
              filters={{ columns: selectedColumns, dateFrom, dateTo }}
              path='/reports/sales/pdf'
            />
          </form>
        }
        description='Vendas concluidas agrupadas por produto, cliente e forma de pagamento.'
        icon={<CircleDollarSign size={18} />}
        title='Relatorio comercial'
      />
      <ReportColumnsDrawer
        columns={salesReportExportColumns}
        defaultColumns={defaultSalesReportExportColumns}
        open={columnsDrawerOpen}
        selectedColumns={selectedColumns}
        onChange={setSelectedColumns}
        onClose={() => setColumnsDrawerOpen(false)}
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

      <div className='mt-5 grid gap-4'>
        <ResponsiveTable
          columns={[
            {
              header: 'Produto',
              render: (item) => <ReportProductName item={item} />,
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
          loading={loading}
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
          loading={loading}
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
          loading={loading}
        />
      </div>

      <div className='mt-5'>
        <ResponsiveTable
          columns={[
            {
              header: 'Produto',
              render: (item) => <ReportProductName item={item} />,
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
          loading={loading}
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
  const [columnsDrawerOpen, setColumnsDrawerOpen] = useState(false)
  const [selectedColumns, setSelectedColumns] = useState<
    UserReportExportColumnKey[]
  >([...defaultUserReportExportColumns])
  const { loading, run } = useReportAction()

  async function filterUserPerformanceReport(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    await run(() => onLoadUserPerformanceReport({ dateFrom, dateTo }))
  }

  async function clearUserPerformanceReportFilters() {
    setDateFrom('')
    setDateTo('')
    await run(() => onLoadUserPerformanceReport())
  }

  return (
    <PagePanel wide>
      <PageHeader
        actions={
          <form
            className='grid w-full gap-3 sm:grid-cols-[repeat(2,minmax(160px,1fr))_auto_auto_auto_auto_auto] lg:w-auto'
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
            <Button loading={loading} type='submit' variant='contained'>
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
              startIcon={<SlidersHorizontal size={16} />}
              type='button'
              variant='outlined'
              onClick={() => setColumnsDrawerOpen(true)}>
              Campos ({selectedColumns.length})
            </Button>
            <Button
              startIcon={<Download size={16} />}
              type='button'
              variant='outlined'
              onClick={() =>
                exportUserPerformanceReportCsv(report, selectedColumns)
              }>
              CSV
            </Button>
            <ReportPdfButton
              filename='relatorio-usuarios'
              filters={{ columns: selectedColumns, dateFrom, dateTo }}
              path='/reports/users/pdf'
            />
          </form>
        }
        description='Vendas, comissoes conferiveis e acoes operacionais por usuario.'
        icon={<CircleDollarSign size={18} />}
        title='Desempenho por usuario'
      />
      <ReportColumnsDrawer
        columns={userReportExportColumns}
        defaultColumns={defaultUserReportExportColumns}
        open={columnsDrawerOpen}
        selectedColumns={selectedColumns}
        onChange={setSelectedColumns}
        onClose={() => setColumnsDrawerOpen(false)}
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

      <div className='mt-5 grid gap-4'>
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
          loading={loading}
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
          loading={loading}
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
  const [columnsDrawerOpen, setColumnsDrawerOpen] = useState(false)
  const [selectedColumns, setSelectedColumns] = useState<
    PurchaseReportExportColumnKey[]
  >([...defaultPurchaseReportExportColumns])
  const { loading, run } = useReportAction()

  async function filterPurchaseReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await run(() => onLoadPurchaseReport({ dateFrom, dateTo }))
  }

  async function clearPurchaseReportFilters() {
    setDateFrom('')
    setDateTo('')
    await run(() => onLoadPurchaseReport())
  }

  return (
    <PagePanel wide>
      <PageHeader
        actions={
          <form
            className='grid w-full gap-3 sm:grid-cols-[repeat(2,minmax(160px,1fr))_auto_auto_auto_auto_auto] lg:w-auto'
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
            <Button loading={loading} type='submit' variant='contained'>
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
              startIcon={<SlidersHorizontal size={16} />}
              type='button'
              variant='outlined'
              onClick={() => setColumnsDrawerOpen(true)}>
              Campos ({selectedColumns.length})
            </Button>
            <Button
              startIcon={<Download size={16} />}
              type='button'
              variant='outlined'
              onClick={() =>
                exportPurchaseReportCsv(purchaseReport, selectedColumns)
              }>
              CSV
            </Button>
            <ReportPdfButton
              filename='relatorio-compras'
              filters={{ columns: selectedColumns, dateFrom, dateTo }}
              path='/reports/purchases/pdf'
            />
          </form>
        }
        description='Gastos com entradas manuais e compras importadas por XML.'
        icon={<Truck size={18} />}
        title='Gastos com compras'
      />
      <ReportColumnsDrawer
        columns={purchaseReportExportColumns}
        defaultColumns={defaultPurchaseReportExportColumns}
        open={columnsDrawerOpen}
        selectedColumns={selectedColumns}
        onChange={setSelectedColumns}
        onClose={() => setColumnsDrawerOpen(false)}
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

      <div className='mt-5 grid gap-4'>
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
          loading={loading}
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
          loading={loading}
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
          loading={loading}
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
  const [columnsDrawerOpen, setColumnsDrawerOpen] = useState(false)
  const [selectedColumns, setSelectedColumns] = useState<
    CashReportExportColumnKey[]
  >([...defaultCashReportExportColumns])
  const { loading, run } = useReportAction()

  async function filterCashReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await run(() => onLoadCashReport({ dateFrom, dateTo }))
  }

  async function clearCashReportFilters() {
    setDateFrom('')
    setDateTo('')
    await run(() => onLoadCashReport())
  }

  return (
    <PagePanel wide>
      <PageHeader
        actions={
          <form
            className='grid w-full gap-3 sm:grid-cols-[repeat(2,minmax(160px,1fr))_auto_auto_auto_auto_auto] lg:w-auto'
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
            <Button loading={loading} type='submit' variant='contained'>
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
              startIcon={<SlidersHorizontal size={16} />}
              type='button'
              variant='outlined'
              onClick={() => setColumnsDrawerOpen(true)}>
              Campos ({selectedColumns.length})
            </Button>
            <Button
              startIcon={<Download size={16} />}
              type='button'
              variant='outlined'
              onClick={() => exportCashReportCsv(cashReport, selectedColumns)}>
              CSV
            </Button>
            <ReportPdfButton
              filename='relatorio-caixa'
              filters={{ columns: selectedColumns, dateFrom, dateTo }}
              path='/reports/cash/pdf'
            />
          </form>
        }
        description='Conferencia de vendas, entradas, sangrias e fechamento por caixa aberto no periodo.'
        icon={<Banknote size={18} />}
        title='Relatorio financeiro de caixa'
      />
      <ReportColumnsDrawer
        columns={cashReportExportColumns}
        defaultColumns={defaultCashReportExportColumns}
        open={columnsDrawerOpen}
        selectedColumns={selectedColumns}
        onChange={setSelectedColumns}
        onClose={() => setColumnsDrawerOpen(false)}
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

      <div className='mt-5 grid gap-4'>
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
          loading={loading}
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
          loading={loading}
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
  const [columnsDrawerOpen, setColumnsDrawerOpen] = useState(false)
  const [selectedColumns, setSelectedColumns] = useState<
    StockReportExportColumnKey[]
  >([...defaultStockReportExportColumns])
  const { loading, run } = useReportAction()

  async function filterStockReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await run(() => onLoadStockReport({ dateFrom, dateTo }))
  }

  async function clearStockReportFilters() {
    setDateFrom('')
    setDateTo('')
    await run(() => onLoadStockReport())
  }

  return (
    <PagePanel wide>
      <PageHeader
        actions={
          <form
            className='grid w-full gap-3 sm:grid-cols-[repeat(2,minmax(160px,1fr))_auto_auto_auto_auto_auto] lg:w-auto'
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
            <Button loading={loading} type='submit' variant='contained'>
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
              startIcon={<SlidersHorizontal size={16} />}
              type='button'
              variant='outlined'
              onClick={() => setColumnsDrawerOpen(true)}>
              Campos ({selectedColumns.length})
            </Button>
            <Button
              startIcon={<Download size={16} />}
              type='button'
              variant='outlined'
              onClick={() => exportStockReportCsv(stockReport, selectedColumns)}>
              CSV
            </Button>
            <ReportPdfButton
              filename='relatorio-estoque'
              filters={{ columns: selectedColumns, dateFrom, dateTo }}
              path='/reports/stock/pdf'
            />
          </form>
        }
        description='Estoque baixo, produtos sem movimentacao, giro e valores movimentados.'
        icon={<PackageSearch size={18} />}
        title='Relatorio de estoque'
      />
      <ReportColumnsDrawer
        columns={stockReportExportColumns}
        defaultColumns={defaultStockReportExportColumns}
        open={columnsDrawerOpen}
        selectedColumns={selectedColumns}
        onChange={setSelectedColumns}
        onClose={() => setColumnsDrawerOpen(false)}
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
        <ReportMetric
          icon={<Truck size={18} />}
          label='Entradas'
          value={formatCurrency(stockReport.summary.entryAmount)}
        />
        <ReportMetric
          icon={<Send size={18} />}
          label='Saidas por custo'
          value={formatCurrency(stockReport.summary.exitCostAmount)}
        />
        <ReportMetric
          icon={<SlidersHorizontal size={18} />}
          label='Ajustes/recomposicoes'
          value={formatCurrency(stockReport.summary.adjustmentCostAmount)}
        />
        <ReportMetric
          icon={<PackagePlus size={18} />}
          label='Saldo mov.'
          value={formatQuantity(stockReport.summary.netQuantity)}
        />
      </div>

      <div className='mt-5 grid gap-4'>
        <ResponsiveTable
          columns={[
            {
              header: 'Produto movimentado',
              render: (item) => (
                <div className='grid gap-1'>
                  <strong>{item.productName}</strong>
                  <span className='text-xs text-[#5f665f]'>
                    {item.internalCode ?? 'Sem codigo'} ·{' '}
                    {item.movementsCount} mov. ·{' '}
                    {item.lastMovementAt
                      ? formatDateTime(item.lastMovementAt)
                      : 'Sem data'}
                  </span>
                </div>
              ),
            },
            {
              align: 'right',
              header: 'Entrada',
              render: (item) => formatCurrency(item.entryAmount),
            },
            {
              align: 'right',
              header: 'Saida custo',
              render: (item) => formatCurrency(item.exitCostAmount),
            },
            {
              align: 'right',
              header: 'Saldo qtde',
              render: (item) => formatQuantity(item.netQuantity),
            },
          ]}
          emptyMessage='Nenhum produto movimentado no periodo.'
          getRowId={(item) => item.productId}
          items={stockReport.movedProducts ?? []}
          loading={loading}
        />

        <ResponsiveTable
          columns={[
            {
              header: 'Tipo',
              render: (item) => stockMovementTypeLabel(item.type),
            },
            {
              align: 'right',
              header: 'Mov.',
              render: (item) => item.movementsCount,
            },
            {
              align: 'right',
              header: 'Qtde',
              render: (item) => formatQuantity(item.quantity),
            },
            {
              align: 'right',
              header: 'Valor',
              render: (item) => formatCurrency(item.costAmount),
            },
          ]}
          emptyMessage='Nenhuma movimentacao no periodo.'
          getRowId={(item) => item.type}
          items={stockReport.byMovementType ?? []}
          loading={loading}
        />
      </div>

      <div className='mt-5 grid gap-4'>
        <ResponsiveTable
          columns={[
            {
              header: 'Estoque baixo',
              render: (item) => (
                <ReportProductName
                  item={{
                    internalCode: item.internalCode,
                    productName: item.productName,
                  }}
                />
              ),
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
          loading={loading}
        />

        <ResponsiveTable
          columns={[
            {
              header: 'Sem movimentacao',
              render: (item) => (
                <ReportProductName
                  item={{
                    internalCode: item.internalCode,
                    productName: item.productName,
                  }}
                />
              ),
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
          loading={loading}
        />

        <ResponsiveTable
          columns={[
            {
              header: 'Giro por venda',
              render: (item) => (
                <ReportProductName
                  item={{
                    internalCode: item.internalCode,
                    productName: item.productName,
                  }}
                />
              ),
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
          loading={loading}
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
  const [locations, setLocations] = useState<string[]>([])
  const [selectedColumns, setSelectedColumns] = useState<
    InventoryReportColumnKey[]
  >(defaultInventoryReportColumnKeys)
  const [columnsDrawerOpen, setColumnsDrawerOpen] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState<InventoryReportFilters>({
    active: true,
  })
  const { loading, run } = useReportAction()
  const locationOptions = inventoryLocationOptions(report)

  async function filterInventoryReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const filters = inventoryReportFiltersFromControls({
      activeFilter,
      locations,
      search,
      stockStatus,
    })

    const loaded = await run(() => onLoadInventoryReport(filters))

    if (loaded) {
      setAppliedFilters(filters)
    }

  }

  async function clearInventoryReportFilters() {
    setSearch('')
    setStockStatus('ALL')
    setActiveFilter('ACTIVE')
    setLocations([])
    const loaded = await run(() => onLoadInventoryReport({ active: true }))

    if (loaded) {
      setAppliedFilters({ active: true })
    }

  }

  function toggleInventoryLocation(location: string) {
    setLocations((currentLocations) =>
      currentLocations.includes(location)
        ? currentLocations.filter((currentLocation) => currentLocation !== location)
        : [...currentLocations, location],
    )
  }

  const selectedExportColumns = selectedColumns

  return (
    <PagePanel wide>
      <PageHeader
        actions={
          <form
            className='grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-[minmax(220px,1fr)_170px_170px_auto] 2xl:grid-cols-[minmax(220px,1fr)_170px_170px_auto_auto_auto_auto_auto]'
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
            <Button loading={loading} type='submit' variant='contained'>
              Filtrar
            </Button>
            <Button
              disabled={
                loading ||
                (!search &&
                  stockStatus === 'ALL' &&
                  activeFilter === 'ACTIVE' &&
                  locations.length === 0)
              }
              type='button'
              variant='outlined'
              onClick={() => void clearInventoryReportFilters()}>
              Limpar
            </Button>
            <Button
              startIcon={<SlidersHorizontal size={16} />}
              type='button'
              variant='outlined'
              onClick={() => setColumnsDrawerOpen(true)}>
              Campos ({selectedExportColumns.length})
            </Button>
            <Button
              startIcon={<Download size={16} />}
              type='button'
              variant='outlined'
              onClick={() =>
                void exportInventoryReportCsv(
                  appliedFilters,
                  selectedExportColumns,
                )
              }>
              CSV
            </Button>
            <ReportPdfButton
              filename='relatorio-inventario'
              filters={{
                ...appliedFilters,
                columns: selectedExportColumns,
                limit: 0,
              }}
              path='/reports/inventory/pdf'
            />
          </form>
        }
        description='Snapshot de saldo fisico, reservado, disponivel e valores de estoque.'
        icon={<PackageSearch size={18} />}
        title='Inventario'
      />
      <ReportColumnsDrawer
        columns={inventoryReportColumns}
        defaultColumns={defaultInventoryReportColumnKeys}
        open={columnsDrawerOpen}
        selectedColumns={selectedColumns}
        onChange={setSelectedColumns}
        onClose={() => setColumnsDrawerOpen(false)}
      />
      <div className='grid gap-2 rounded-lg border border-[#e4e9e5] bg-[#fbfcfb] p-4'>
          <strong className='text-sm text-[#2c281e]'>
            Locações para filtrar
          </strong>
          <FormGroup className='max-h-36 overflow-auto rounded-md border border-[#e4e9e5] bg-white p-2 sm:grid sm:grid-cols-2 lg:grid-cols-4'>
            {locationOptions.length ? (
              locationOptions.map((location) => (
                <FormControlLabel
                  key={location}
                  control={
                    <Checkbox
                      checked={locations.includes(location)}
                      size='small'
                      onChange={() => toggleInventoryLocation(location)}
                    />
                  }
                  label={location}
                />
              ))
            ) : (
              <span className='px-1 py-2 text-sm text-[#5f665f]'>
                Nenhuma locação encontrada.
              </span>
            )}
          </FormGroup>
      </div>
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
          loading={loading}
        />
      </div>
    </PagePanel>
  )
}

type SalesReportFilters = {
  dateFrom?: string
  dateTo?: string
}

type ReportDownloadFilters = SalesReportFilters & {
  columns?: readonly string[]
}

type InventoryReportFilters = {
  active?: boolean
  columns?: InventoryReportColumnKey[]
  limit?: number
  locations?: string[]
  search?: string
  stockStatus?: 'ALL' | 'LOW' | 'NEGATIVE' | 'AVAILABLE' | 'OUT_OF_STOCK'
}

function inventoryReportFiltersFromControls({
  activeFilter,
  locations,
  search,
  stockStatus,
}: {
  activeFilter: 'ALL' | 'ACTIVE' | 'INACTIVE'
  locations: string[]
  search: string
  stockStatus: InventoryReportFilters['stockStatus']
}): InventoryReportFilters {
  return {
    active: activeFilter === 'ALL' ? undefined : activeFilter === 'ACTIVE',
    locations,
    search,
    stockStatus,
  }
}

type InventoryReportColumnKey =
  | 'internalCode'
  | 'productName'
  | 'unit'
  | 'currentStock'
  | 'location'
  | 'ncm'
  | 'previousStock'
  | 'entryQuantity'
  | 'exitQuantity'
  | 'availableStock'
  | 'costPrice'

type InventoryReportColumn = {
  key: InventoryReportColumnKey
  label: string
  value: (item: InventoryReport['items'][number]) => string
}

const inventoryReportColumns: InventoryReportColumn[] = [
  {
    key: 'internalCode',
    label: 'Código',
    value: (item) => item.internalCode ?? '',
  },
  { key: 'productName', label: 'Nome', value: (item) => item.productName },
  { key: 'unit', label: 'Unidade', value: (item) => item.unit },
  {
    key: 'currentStock',
    label: 'Estoque atual',
    value: (item) => item.currentStock,
  },
  { key: 'location', label: 'Locação', value: (item) => item.location ?? '' },
  { key: 'ncm', label: 'NCM', value: (item) => item.ncm ?? '' },
  {
    key: 'previousStock',
    label: 'Estado anterior',
    value: (item) => item.previousStock,
  },
  {
    key: 'entryQuantity',
    label: 'Entrada',
    value: (item) => item.entryQuantity,
  },
  {
    key: 'exitQuantity',
    label: 'Saída',
    value: (item) => item.exitQuantity,
  },
  {
    key: 'availableStock',
    label: 'Disponível',
    value: (item) => item.availableStock,
  },
  {
    key: 'costPrice',
    label: 'Custo médio',
    value: (item) => item.costPrice,
  },
]

const defaultInventoryReportColumnKeys: InventoryReportColumnKey[] = [
  'internalCode',
  'productName',
  'unit',
  'currentStock',
  'location',
]

function inventoryReportColumnsByKeys(keys: InventoryReportColumnKey[]) {
  return keys
    .map((key) => inventoryReportColumns.find((column) => column.key === key))
    .filter((column): column is InventoryReportColumn => Boolean(column))
}

function inventoryLocationOptions(report: InventoryReport) {
  if (report.locationOptions?.length) {
    return report.locationOptions
  }

  return Array.from(
    new Set(
      report.items
        .map((item) => item.location?.trim())
        .filter((location): location is string => Boolean(location)),
    ),
  ).sort((current, next) => current.localeCompare(next, 'pt-BR'))
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

function stockMovementTypeLabel(type: StockReport['byMovementType'][number]['type']) {
  const labels = {
    ENTRY: 'Entrada',
    ADJUSTMENT: 'Ajuste manual',
    SALE: 'Venda',
    SALE_CANCEL: 'Cancelamento de venda',
    SALE_RETURN: 'Devolucao de venda',
    SALE_CORRECTION: 'Correcao de venda',
  }

  return labels[type] ?? type
}

function downloadReportPdf(
  path: string,
  filters: ReportDownloadFilters | InventoryReportFilters,
  filename: string,
) {
  return downloadApiFile(
    reportDownloadPath(path, filters),
    `${filename}-${new Date().toISOString().slice(0, 10)}.pdf`,
  )
}

function reportDownloadPath(
  path: string,
  filters: ReportDownloadFilters | InventoryReportFilters,
) {
  const query = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          query.append(key, String(item))
        }
      })
      return
    }

    query.set(key, String(value))
  })

  return query.size > 0 ? `${path}?${query.toString()}` : path
}

function exportSalesReportCsv(
  report: SalesReport,
  selectedColumns: SalesReportExportColumnKey[],
) {
  downloadCsv('relatorio-vendas', filterReportCsvRows([
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
      'Codigo',
      'Produto',
      'Quantidade',
      'Total',
      'Custo',
      'Lucro',
      'Margem',
    ],
    ...report.byProduct.map((item) => [
      'Vendas por produto',
      item.internalCode ?? '',
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
      'Codigo',
      'Produto',
      'Faturamento',
      'Participacao',
      'Acumulado',
      'Classe',
    ],
    ...report.abcProducts.map((item) => [
      'Curva ABC',
      item.internalCode ?? '',
      item.productName,
      item.totalAmount,
      `${item.revenueSharePercentage}%`,
      `${item.cumulativeRevenuePercentage}%`,
      item.abcClass,
    ]),
  ], salesReportExportColumns, selectedColumns))
}

function exportUserPerformanceReportCsv(
  report: UserPerformanceReport,
  selectedColumns: UserReportExportColumnKey[],
) {
  downloadCsv('relatorio-usuarios', filterReportCsvRows([
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
  ], userReportExportColumns, selectedColumns))
}

async function exportInventoryReportCsv(
  filters: InventoryReportFilters,
  columnKeys: InventoryReportColumnKey[],
) {
  const result = await apiGet<ApiResult<InventoryReport>>(
    reportDownloadPath('/reports/inventory', {
      ...filters,
      limit: 0,
    }),
  )
  const generatedAt = formatDateTime(new Date().toISOString())
  const columns = inventoryReportColumnsByKeys(columnKeys)

  downloadCsv('relatorio-inventario', [
    ['Gerado em', generatedAt],
    [],
    columns.map((column) => column.label),
    ...result.data.items.map((item) =>
      columns.map((column) => column.value(item)),
    ),
  ])
}

function exportPurchaseReportCsv(
  report: PurchaseReport,
  selectedColumns: PurchaseReportExportColumnKey[],
) {
  downloadCsv('relatorio-compras', filterReportCsvRows([
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
  ], purchaseReportExportColumns, selectedColumns))
}

function exportCashReportCsv(
  report: CashReport,
  selectedColumns: CashReportExportColumnKey[],
) {
  downloadCsv('relatorio-caixa', filterReportCsvRows([
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
  ], cashReportExportColumns, selectedColumns))
}

function exportStockReportCsv(
  report: StockReport,
  selectedColumns: StockReportExportColumnKey[],
) {
  downloadCsv('relatorio-estoque', filterReportCsvRows([
    ['Secao', 'Indicador', 'Valor'],
    ['Resumo', 'Produtos ativos', report.summary.activeProductsCount],
    ['Resumo', 'Estoque baixo', report.summary.lowStockProductsCount],
    ['Resumo', 'Sem movimentacao', report.summary.productsWithoutMovementCount],
    ['Resumo', 'Quantidade vendida', report.summary.soldQuantity],
    ['Resumo', 'Movimentacoes', report.summary.movementsCount],
    ['Resumo', 'Quantidade entrada', report.summary.entryQuantity],
    ['Resumo', 'Valor de entradas', report.summary.entryAmount],
    ['Resumo', 'Quantidade saida', report.summary.exitQuantity],
    ['Resumo', 'Custo de saidas', report.summary.exitCostAmount],
    ['Resumo', 'Quantidade ajustes/recomposicoes', report.summary.adjustmentQuantity],
    ['Resumo', 'Valor ajustes/recomposicoes', report.summary.adjustmentCostAmount],
    ['Resumo', 'Saldo movimentado', report.summary.netQuantity],
    [],
    [
      'Produtos movimentados',
      'Código',
      'Produto',
      'Locação',
      'Movimentacoes',
      'Quantidade entrada',
      'Valor entrada',
      'Quantidade saida',
      'Custo saida',
      'Quantidade ajustes/recomposicoes',
      'Valor ajustes/recomposicoes',
      'Saldo quantidade',
      'Ultima movimentacao',
    ],
    ...report.movedProducts.map((item) => [
      'Produtos movimentados',
      item.internalCode ?? '',
      item.productName,
      item.location ?? '',
      item.movementsCount,
      item.entryQuantity,
      item.entryAmount,
      item.exitQuantity,
      item.exitCostAmount,
      item.adjustmentQuantity,
      item.adjustmentCostAmount,
      item.netQuantity,
      item.lastMovementAt ? formatDateTime(item.lastMovementAt) : '',
    ]),
    [],
    ['Movimentacoes por tipo', 'Tipo', 'Movimentacoes', 'Quantidade', 'Valor'],
    ...report.byMovementType.map((item) => [
      'Movimentacoes por tipo',
      stockMovementTypeLabel(item.type),
      item.movementsCount,
      item.quantity,
      item.costAmount,
    ]),
    [],
    [
      'Estoque baixo',
      'Código',
      'Produto',
      'Locação',
      'Fisico',
      'Reservado',
      'Disponivel',
      'Minimo',
    ],
    ...report.lowStockProducts.map((item) => [
      'Estoque baixo',
      item.internalCode ?? '',
      item.productName,
      item.location ?? '',
      item.currentStock,
      item.reservedStock,
      item.availableStock,
      item.minimumStock,
    ]),
    [],
    ['Sem movimentacao', 'Código', 'Produto', 'Locação', 'Fisico', 'Minimo'],
    ...report.productsWithoutMovement.map((item) => [
      'Sem movimentacao',
      item.internalCode ?? '',
      item.productName,
      item.location ?? '',
      item.currentStock,
      item.minimumStock,
    ]),
    [],
    [
      'Giro por venda',
      'Código',
      'Produto',
      'Locação',
      'Quantidade vendida',
      'Ultima venda',
    ],
    ...report.turnoverProducts.map((item) => [
      'Giro por venda',
      item.internalCode ?? '',
      item.productName,
      item.location ?? '',
      item.soldQuantity,
      item.lastSaleAt ? formatDateTime(item.lastSaleAt) : '',
    ]),
  ], stockReportExportColumns, selectedColumns))
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

function filterReportCsvRows<Key extends string>(
  rows: CsvRow[],
  columns: ReadonlyArray<ReportExportColumnOption<Key>>,
  selectedColumns: Key[],
) {
  const firstSectionIndex = rows.findIndex((row) => row.length === 0)

  if (firstSectionIndex < 0) {
    return rows
  }

  const selectedHeaders = new Set(
    columns
      .filter((column) => selectedColumns.includes(column.key))
      .flatMap((column) => column.csvHeaders ?? []),
  )
  const filteredRows = rows.slice(0, firstSectionIndex)
  let sectionStart = firstSectionIndex + 1

  while (sectionStart < rows.length) {
    const nextSeparatorIndex = rows.findIndex(
      (row, index) => index >= sectionStart && row.length === 0,
    )
    const sectionEnd = nextSeparatorIndex < 0 ? rows.length : nextSeparatorIndex
    const sectionRows = rows.slice(sectionStart, sectionEnd)

    if (sectionRows.length > 0) {
      const header = sectionRows[0]
      const selectedIndexes = header
        .map((value, index) => ({ index, value: String(value ?? '') }))
        .filter(({ index, value }) => index === 0 || selectedHeaders.has(value))
        .map(({ index }) => index)

      if (selectedIndexes.length > 1) {
        filteredRows.push(
          [],
          ...sectionRows.map((row) =>
            selectedIndexes.map((index) => row[index]),
          ),
        )
      }
    }

    if (nextSeparatorIndex < 0) {
      break
    }

    sectionStart = nextSeparatorIndex + 1
  }

  return filteredRows
}

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

function ReportProductName({
  item,
}: {
  item: { internalCode?: string | null; productName: string }
}) {
  return (
    <span className='grid gap-1'>
      <strong>{item.productName}</strong>
      <span className='text-xs text-[#5f665f]'>
        {item.internalCode ?? 'Sem codigo'}
      </span>
    </span>
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
