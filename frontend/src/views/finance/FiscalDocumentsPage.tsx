import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { ChevronDown, FileText } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type {
  Client,
  FiscalDocument,
  FiscalSettings,
  PickupReservation,
  Product,
  Sale,
  ShippingOrder,
} from '../../api'
import { downloadApiFile } from '../../api'
import {
  InlineNote,
  PageHeader,
  PagePanel,
  ResponsiveTable,
} from '../../components/layout'
import {
  StatusChip,
  TableActionButton,
  TableActionsMenu,
  type TableActionsMenuAction,
} from '../../components/ui'
import { usePaginatedRows } from '../../hooks/usePaginatedRows'
import { formatCurrency, formatDateTime } from '../../utils/format'
import {
  fiscalDocumentAuditDetail,
  fiscalDocumentEnvironmentLabel,
  fiscalDocumentStatusDetail,
  fiscalDocumentStatusLabel,
  fiscalDocumentStatusTone,
  fiscalReadinessIssueLabel,
} from './fiscalPresentation'
import {
  buildFiscalRequests,
  canIssueFiscalRequest,
  fiscalRequestAction,
  fiscalRequestActionLabel,
  fiscalRequestActionText,
  type FiscalRequest,
} from './fiscalRequests'

export function FiscalDocumentsPage({
  clients,
  fiscalDocuments,
  fiscalSettings,
  pickupReservations,
  products,
  sales,
  shippingOrders,
  onIssuePickupReservationFiscalDocument,
  onIssueSaleFiscalDocument,
  onIssueShippingOrderFiscalDocument,
  onPreviewPickupReservationFiscalDocument,
  onPreviewSaleFiscalDocument,
  onPreviewShippingOrderFiscalDocument,
  onResolveFiscalPendency,
  onCancelFiscalDocument,
  onSyncFiscalDocument,
}: {
  clients: Client[]
  fiscalDocuments: FiscalDocument[]
  fiscalSettings: FiscalSettings | null
  pickupReservations: PickupReservation[]
  products: Product[]
  sales: Sale[]
  shippingOrders: ShippingOrder[]
  onIssuePickupReservationFiscalDocument: (
    reservation: PickupReservation,
  ) => void
  onIssueSaleFiscalDocument: (sale: Sale) => void
  onIssueShippingOrderFiscalDocument: (order: ShippingOrder) => void
  onPreviewPickupReservationFiscalDocument: (
    reservation: PickupReservation,
  ) => void
  onPreviewSaleFiscalDocument: (sale: Sale) => void
  onPreviewShippingOrderFiscalDocument: (order: ShippingOrder) => void
  onResolveFiscalPendency: (target: FiscalPendencyTarget) => void
  onCancelFiscalDocument: (
    event: FormEvent<HTMLFormElement>,
    fiscalDocument: FiscalDocument,
  ) => void
  onSyncFiscalDocument: (fiscalDocument: FiscalDocument) => void
}) {
  const fiscalRequests = buildFiscalRequests({
    clients,
    fiscalDocuments,
    fiscalSettings,
    pickupReservations,
    products,
    sales,
    shippingOrders,
  })
  const fiscalSummary = fiscalDocumentSummary(fiscalRequests, fiscalDocuments)
  const fiscalDocumentSourceNumbers = buildFiscalDocumentSourceNumbers({
    pickupReservations,
    sales,
    shippingOrders,
  })
  const { pagination: requestPagination, visibleItems: visibleFiscalRequests } =
    usePaginatedRows<FiscalRequest>(fiscalRequests)
  const {
    pagination: documentPagination,
    visibleItems: visibleFiscalDocuments,
  } = usePaginatedRows<FiscalDocument>(fiscalDocuments)

  return (
    <section className='grid min-w-0 gap-4'>
      <FiscalDocumentsOverview
        fiscalSettings={fiscalSettings}
        summary={fiscalSummary}
      />

      <PagePanel className='min-w-0'>
        <PageHeader
          description='Centralize a emissão fiscal de vendas diretas, com envio e retirada.'
          icon={<FileText size={18} />}
          title='Fila de emissão'
        />
        <ResponsiveTable
          columns={[
            {
              header: 'Nº',
              render: (request) => (
                <>
                  <strong>
                    {request.sourceNumber
                      ? String(request.sourceNumber)
                      : shortFiscalSourceId(request.sourceId)}
                  </strong>
                  <InlineNote>{request.sourceLabel}</InlineNote>
                </>
              ),
            },
            {
              header: 'Cliente',
              render: (request) => request.clientName,
            },
            {
              align: 'right',
              header: 'Total',
              render: (request) => formatCurrency(request.totalAmount),
            },
            {
              header: 'Status fiscal',
              render: (request) =>
                request.document ? (
                  <FiscalDocumentStatus document={request.document} />
                ) : (
                  <StatusChip label={request.pendingLabel} tone='warning' />
                ),
            },
            {
              header: 'Prontidao',
              render: (request) => (
                <FiscalReadinessStatus
                  request={request}
                  onResolveFiscalPendency={onResolveFiscalPendency}
                />
              ),
            },
            {
              header: 'Operador',
              render: (request) => request.operatorName,
            },
            {
              align: 'right',
              header: 'Ações',
              render: (request) => (
                <div className='flex flex-wrap justify-end gap-2'>
                  <FiscalRequestAction
                    request={request}
                    onIssuePickupReservationFiscalDocument={
                      onIssuePickupReservationFiscalDocument
                    }
                    onIssueSaleFiscalDocument={onIssueSaleFiscalDocument}
                    onIssueShippingOrderFiscalDocument={
                      onIssueShippingOrderFiscalDocument
                    }
                    onPreviewPickupReservationFiscalDocument={
                      onPreviewPickupReservationFiscalDocument
                    }
                    onPreviewSaleFiscalDocument={onPreviewSaleFiscalDocument}
                    onPreviewShippingOrderFiscalDocument={
                      onPreviewShippingOrderFiscalDocument
                    }
                    onResolveFiscalPendency={onResolveFiscalPendency}
                  />
                </div>
              ),
            },
          ]}
          emptyMessage='Nenhuma venda disponível para emissão.'
          getRowId={(request) => `${request.sourceType}-${request.sourceId}`}
          items={visibleFiscalRequests}
          pagination={requestPagination}
        />
      </PagePanel>

      <PagePanel className='min-w-0'>
        <PageHeader
          description='Acompanhe o retorno do provedor fiscal e os documentos gerados.'
          icon={<FileText size={18} />}
          title='Notas emitidas'
        />
        <ResponsiveTable
          columns={[
            {
              header: 'Documento',
              render: (document) => (
                <>
                  <strong>{document.documentType}</strong>
                  <InlineNote>
                    {document.number ? `#${document.number}` : 'Sem numero'}
                    {document.series ? ` serie ${document.series}` : ''}
                  </InlineNote>
                </>
              ),
            },
            {
              header: 'Nº',
              render: (document) => (
                <>
                  <strong>
                    {fiscalDocumentSourceNumbers.get(
                      `${document.sourceType}-${document.sourceId}`,
                    ) ?? shortFiscalSourceId(document.sourceId)}
                  </strong>
                  <InlineNote>
                    {fiscalSourceTypeLabel(document.sourceType)}
                  </InlineNote>
                </>
              ),
            },
            {
              header: 'Status',
              render: (document) => (
                <div className='min-w-[220px]'>
                  <StatusChip
                    label={fiscalDocumentStatusLabel(document.status)}
                    tone={fiscalDocumentStatusTone(document.status)}
                  />
                  <FiscalDocumentStatusDetail document={document} />
                </div>
              ),
            },
            {
              header: 'Ambiente',
              render: (document) => (
                <>
                  <strong>{document.provider}</strong>
                  <InlineNote>
                    {fiscalDocumentEnvironmentLabel(document.environment)}
                  </InlineNote>
                </>
              ),
            },
            {
              header: 'Emissão',
              render: (document) => (
                <>
                  <strong>
                    {formatDateTime(document.issuedAt ?? document.createdAt)}
                  </strong>
                  <InlineNote>{document.issuedByUserName}</InlineNote>
                  {fiscalDocumentAuditDetail(document) ? (
                    <InlineNote>
                      {fiscalDocumentAuditDetail(document)}
                    </InlineNote>
                  ) : null}
                </>
              ),
            },
            {
              header: 'Referencias',
              render: (document) => (
                <>
                  <strong>
                    {document.providerReference ?? 'Sem referencia'}
                  </strong>
                  <InlineNote>
                    {document.accessKey ?? 'Sem chave de acesso'}
                  </InlineNote>
                </>
              ),
            },
            {
              align: 'right',
              header: 'Arquivos',
              render: (document) => <FiscalDocumentLinks document={document} />,
            },
            {
              align: 'right',
              header: 'Ações',
              render: (document) => (
                <FiscalDocumentActions
                  document={document}
                  onCancelFiscalDocument={onCancelFiscalDocument}
                  onSyncFiscalDocument={onSyncFiscalDocument}
                />
              ),
            },
          ]}
          emptyMessage='Nenhuma nota fiscal emitida.'
          getRowId={(document) => document.id}
          items={visibleFiscalDocuments}
          pagination={documentPagination}
        />
      </PagePanel>
    </section>
  )
}

function buildFiscalDocumentSourceNumbers({
  pickupReservations,
  sales,
  shippingOrders,
}: {
  pickupReservations: PickupReservation[]
  sales: Sale[]
  shippingOrders: ShippingOrder[]
}) {
  const saleNumbersById = new Map(
    sales.map((sale) => [sale.id, sale.saleNumber]),
  )
  const sourceNumbers = new Map<string, string>()

  sales.forEach((sale) => {
    sourceNumbers.set(`SALE-${sale.id}`, String(sale.saleNumber))
  })
  shippingOrders.forEach((order) => {
    const saleNumber = saleNumbersById.get(order.saleId ?? '')

    if (saleNumber) {
      sourceNumbers.set(`SHIPPING_ORDER-${order.id}`, String(saleNumber))
    }
  })
  pickupReservations.forEach((reservation) => {
    const saleNumber = saleNumbersById.get(reservation.saleId ?? '')

    if (saleNumber) {
      sourceNumbers.set(
        `PICKUP_RESERVATION-${reservation.id}`,
        String(saleNumber),
      )
    }
  })

  return sourceNumbers
}

function shortFiscalSourceId(sourceId: string) {
  return sourceId.slice(0, 8)
}

function fiscalSourceTypeLabel(sourceType: FiscalDocument['sourceType']) {
  const labels: Record<FiscalDocument['sourceType'], string> = {
    PICKUP_RESERVATION: 'Retirada',
    SALE: 'Venda direta',
    SHIPPING_ORDER: 'Envio',
  }

  return labels[sourceType]
}

function FiscalRequestAction({
  request,
  onIssuePickupReservationFiscalDocument,
  onIssueSaleFiscalDocument,
  onIssueShippingOrderFiscalDocument,
  onPreviewPickupReservationFiscalDocument,
  onPreviewSaleFiscalDocument,
  onPreviewShippingOrderFiscalDocument,
  onResolveFiscalPendency,
}: {
  request: FiscalRequest
  onIssuePickupReservationFiscalDocument: (
    reservation: PickupReservation,
  ) => void
  onIssueSaleFiscalDocument: (sale: Sale) => void
  onIssueShippingOrderFiscalDocument: (order: ShippingOrder) => void
  onPreviewPickupReservationFiscalDocument: (
    reservation: PickupReservation,
  ) => void
  onPreviewSaleFiscalDocument: (sale: Sale) => void
  onPreviewShippingOrderFiscalDocument: (order: ShippingOrder) => void
  onResolveFiscalPendency: (target: FiscalPendencyTarget) => void
}) {
  const action = fiscalRequestAction(request, {
    onIssuePickupReservationFiscalDocument,
    onIssueSaleFiscalDocument,
    onIssueShippingOrderFiscalDocument,
  })
  const previewAction = fiscalRequestAction(request, {
    onIssuePickupReservationFiscalDocument:
      onPreviewPickupReservationFiscalDocument,
    onIssueSaleFiscalDocument: onPreviewSaleFiscalDocument,
    onIssueShippingOrderFiscalDocument: onPreviewShippingOrderFiscalDocument,
  })

  if (action && request.readinessIssues.length === 0) {
    return (
      <div className='flex flex-wrap justify-end gap-2'>
        {previewAction ? (
          <TableActionButton type='button' onClick={previewAction}>
            Pré-visualizar
          </TableActionButton>
        ) : null}
        <TableActionButton type='button' onClick={action}>
          {fiscalRequestActionText(request)}
        </TableActionButton>
      </div>
    )
  }

  if (canIssueFiscalRequest(request) && request.readinessIssues.length > 0) {
    return (
      <TableActionButton
        type='button'
        onClick={() => onResolveFiscalPendency(fiscalPendencyTarget(request))}>
        {fiscalRequestActionLabel(request, Boolean(action))}
      </TableActionButton>
    )
  }

  return (
    <InlineNote>
      {fiscalRequestActionLabel(request, Boolean(action))}
    </InlineNote>
  )
}

export type FiscalPendencyTarget = {
  clientId?: string | null
  productId?: string
  view:
    | 'clients'
    | 'edit-product'
    | 'fiscal-settings'
    | 'products'
    | 'sales-history'
}
type FiscalPendencyCategory = 'client' | 'configuration' | 'product' | 'sale'
type FiscalPendencyItem = {
  productId: string
  productName: string
}

function fiscalPendencyTarget(request: FiscalRequest): FiscalPendencyTarget {
  const priorityIssue =
    request.readinessIssues.find(
      (issue) => fiscalReadinessIssueCategory(issue) === 'configuration',
    ) ??
    request.readinessIssues.find(
      (issue) => fiscalReadinessIssueCategory(issue) === 'client',
    ) ??
    request.readinessIssues[0]

  return priorityIssue
    ? fiscalPendencyTargetForIssue(request, priorityIssue)
    : { view: 'fiscal-settings' }
}

function fiscalPendencyTargetForIssue(
  request: FiscalRequest,
  issue: string,
): FiscalPendencyTarget {
  const targetByCategory: Record<
    FiscalPendencyCategory,
    () => FiscalPendencyTarget
  > = {
    client: () => ({
      clientId: request.clientId,
      view: 'clients',
    }),
    configuration: () => ({ view: 'fiscal-settings' }),
    product: () => ({
      productId: fiscalIssueProductId(request, issue),
      view: fiscalIssueProductId(request, issue) ? 'edit-product' : 'products',
    }),
    sale: () => ({ view: 'sales-history' }),
  }
  const category = fiscalReadinessIssueCategory(issue)

  return targetByCategory[category]()
}

function FiscalReadinessStatus({
  request,
  onResolveFiscalPendency,
}: {
  request: FiscalRequest
  onResolveFiscalPendency: (target: FiscalPendencyTarget) => void
}) {
  const issueSummary = fiscalReadinessIssueSummary(request.readinessIssues)

  return request.readinessIssues.length === 0 ? (
    <StatusChip label='Pronta' tone='success' />
  ) : (
    <Accordion
      disableGutters
      elevation={0}
      className='max-w-md rounded-xl border border-[#e4e9e5] bg-white before:hidden'>
      <AccordionSummary
        expandIcon={<ChevronDown size={16} />}
        className='min-h-0 px-3 py-2'>
        <Stack spacing={0.75}>
          <StatusChip
            label={`${request.readinessIssues.length} pendencia(s)`}
            tone='warning'
          />
          <InlineNote>{issueSummary}</InlineNote>
          <InlineNote>Ver detalhes e corrigir</InlineNote>
        </Stack>
      </AccordionSummary>
      <AccordionDetails className='grid gap-2 px-3 pt-0 pb-3'>
        {request.readinessIssues.map((issue, index) => (
          <FiscalReadinessIssueAction
            issue={issue}
            key={`${issue}-${index}`}
            request={request}
            onResolveFiscalPendency={onResolveFiscalPendency}
          />
        ))}
      </AccordionDetails>
    </Accordion>
  )
}

function FiscalReadinessIssueAction({
  issue,
  request,
  onResolveFiscalPendency,
}: {
  issue: string
  request: FiscalRequest
  onResolveFiscalPendency: (target: FiscalPendencyTarget) => void
}) {
  const category = fiscalReadinessIssueCategory(issue)

  return (
    <div className='grid gap-2 rounded-lg border border-[#e4e9e5] bg-[#f9faf8] p-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'>
      <span className='text-sm text-[#2c281e]'>{issue}</span>
      <Button
        size='small'
        variant='outlined'
        onClick={() =>
          onResolveFiscalPendency(fiscalPendencyTargetForIssue(request, issue))
        }>
        {fiscalPendencyActionLabel(category)}
      </Button>
    </div>
  )
}

function fiscalPendencyActionLabel(category: FiscalPendencyCategory) {
  const labels: Record<FiscalPendencyCategory, string> = {
    client: 'Corrigir cliente',
    configuration: 'Corrigir configuração',
    product: 'Corrigir produto',
    sale: 'Corrigir venda',
  }

  return labels[category]
}

function fiscalReadinessIssueSummary(issues: string[]) {
  const issueCounts = issues.reduce(
    (counts, issue) => {
      const category = fiscalReadinessIssueCategory(issue)
      return { ...counts, [category]: counts[category] + 1 }
    },
    { client: 0, configuration: 0, product: 0, sale: 0 },
  )

  return [
    issueCounts.configuration > 0
      ? `Configuração: ${issueCounts.configuration}`
      : null,
    issueCounts.client > 0 ? `Cliente: ${issueCounts.client}` : null,
    issueCounts.product > 0 ? `Produtos: ${issueCounts.product}` : null,
    issueCounts.sale > 0 ? `Venda: ${issueCounts.sale}` : null,
  ]
    .filter(Boolean)
    .join(' | ')
}

function fiscalReadinessIssueCategory(issue: string) {
  const categoryByPattern = [
    {
      category: 'configuration',
      pattern:
        /configura[cç][aã]o|produção|producao|natureza da opera[cç][aã]o|cfop padr[aã]o|cst\/csosn icms padr[aã]o|cst pis padr[aã]o|cst cofins padr[aã]o|cnpj fiscal da loja/i,
    },
    { category: 'client', pattern: /cliente/i },
    { category: 'sale', pattern: /vencimento do boleto\/fatura/i },
  ] as const

  return (
    categoryByPattern.find(({ pattern }) => pattern.test(issue))?.category ??
    'product'
  )
}

function fiscalIssueProductId(request: FiscalRequest, issue: string) {
  const normalizedIssue = normalizeFiscalIssueText(issue)
  const matchedItem = fiscalRequestItems(request).find((item) =>
    normalizedIssue.includes(normalizeFiscalIssueText(item.productName)),
  )

  return matchedItem?.productId ?? request.productIds[0]
}

function fiscalRequestItems(request: FiscalRequest): FiscalPendencyItem[] {
  return (
    request.sale?.items ??
    request.shippingOrder?.items ??
    request.pickupReservation?.items ??
    []
  )
}

function normalizeFiscalIssueText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

function FiscalDocumentStatus({ document }: { document: FiscalDocument }) {
  return (
    <Stack spacing={0.75}>
      <StatusChip
        label={fiscalDocumentStatusLabel(document.status)}
        tone={fiscalDocumentStatusTone(document.status)}
      />
      <InlineNote>
        {document.documentType} {document.number ? `#${document.number}` : ''}
      </InlineNote>
    </Stack>
  )
}

function FiscalDocumentStatusDetail({
  document,
}: {
  document: FiscalDocument
}) {
  const detail = fiscalDocumentStatusDetail(document)

  if (!detail) {
    return null
  }

  return (
    <Alert
      className='mt-2 max-w-sm'
      severity={fiscalDocumentDetailSeverity(document)}
      variant='outlined'>
      {fiscalDocumentDetailLabel(document)}: {detail}
    </Alert>
  )
}

function fiscalDocumentDetailSeverity(document: FiscalDocument) {
  const severityByStatus = {
    AUTHORIZED: 'warning',
    CANCELLED: 'info',
    PENDING: 'info',
    PROCESSING: 'info',
    REJECTED: 'error',
  } as const

  return severityByStatus[document.status]
}

function fiscalDocumentDetailLabel(document: FiscalDocument) {
  const labelByStatus = {
    AUTHORIZED: 'Cancelamento rejeitado',
    CANCELLED: 'Motivo do cancelamento',
    PENDING: 'Detalhe',
    PROCESSING: 'Cancelamento em processamento',
    REJECTED: 'Motivo da rejeicao',
  }

  return labelByStatus[document.status]
}

function FiscalDocumentLinks({ document }: { document: FiscalDocument }) {
  const links = [
    { fileType: 'danfe', label: 'DANFE', url: document.pdfUrl },
    { fileType: 'xml', label: 'XML', url: document.xmlUrl },
  ].filter(
    (
      link,
    ): link is {
      fileType: 'danfe' | 'xml'
      label: 'DANFE' | 'XML'
      url: string
    } => Boolean(link.url),
  )

  return links.length > 0 ? (
    <div className='flex flex-wrap justify-end gap-2'>
      {links.map((link) => (
        <TableActionButton
          key={link.label}
          type='button'
          onClick={() =>
            void downloadApiFile(
              `/fiscal-documents/${document.id}/files/${link.fileType}`,
              fiscalDocumentDownloadName(document, link.label),
            )
          }>
          {link.label}
        </TableActionButton>
      ))}
    </div>
  ) : (
    <span className='text-sm text-[#5f665f]'>Sem arquivos</span>
  )
}

function fiscalDocumentDownloadName(
  document: FiscalDocument,
  label: 'DANFE' | 'XML',
) {
  const extensionByLabel = {
    DANFE: 'pdf',
    XML: 'xml',
  }
  const reference = document.providerReference ?? document.id

  return `${reference}.${extensionByLabel[label]}`
}

type FiscalDocumentSummary = {
  cancellationRejections: number
  frequentReadinessIssues: Array<{ count: number; label: string }>
  readyRequests: number
  pendingRequests: number
  rejectedDocuments: number
  processingDocuments: number
  processingCancellations: number
}

function FiscalDocumentsOverview({
  fiscalSettings,
  summary,
}: {
  fiscalSettings: FiscalSettings | null
  summary: FiscalDocumentSummary
}) {
  const alerts = fiscalDocumentSummaryAlerts(summary)

  return (
    <PagePanel className='min-w-0'>
      <PageHeader
        description='Visão rápida da fila antes de emitir, sincronizar ou cancelar NF-e.'
        icon={<FileText size={18} />}
        title='Controle fiscal'
      />
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
        {fiscalDocumentSummaryMetrics(summary).map((metric) => (
          <div
            className='rounded-xl border border-[#e4e9e5] bg-[#f9faf8] p-3'
            key={metric.label}>
            <span className='block text-xs font-semibold uppercase tracking-wide text-[#5f665f]'>
              {metric.label}
            </span>
            <strong className='mt-1 block text-2xl text-[#203466]'>
              {metric.value}
            </strong>
          </div>
        ))}
      </div>
      <FiscalSettingsSummary settings={fiscalSettings} />
      <FiscalReadinessIssueHighlights
        issues={summary.frequentReadinessIssues}
      />
      {alerts.length > 0 ? (
        <Stack className='mt-3' spacing={1}>
          {alerts.map((alert) => (
            <Alert key={alert.message} severity={alert.severity}>
              {alert.message}
            </Alert>
          ))}
        </Stack>
      ) : null}
    </PagePanel>
  )
}

function FiscalSettingsSummary({
  settings,
}: {
  settings: FiscalSettings | null
}) {
  const alerts = fiscalSettingsAlerts(settings)

  return (
    <Stack className='mt-3' spacing={1}>
      <div className='flex flex-wrap gap-2'>
        <StatusChip
          label={`Provedor: ${settings?.provider ?? 'Carregando'}`}
          tone={settings?.provider === 'FOCUS' ? 'success' : 'neutral'}
        />
        <StatusChip
          label={`Ambiente: ${
            settings?.environment
              ? fiscalDocumentEnvironmentLabel(settings.environment)
              : 'Carregando'
          }`}
          tone={settings?.environment === 'PRODUCTION' ? 'warning' : 'success'}
        />
        <StatusChip
          label={
            settings?.allowProduction
              ? 'Producao liberada'
              : 'Producao bloqueada'
          }
          tone={settings?.allowProduction ? 'warning' : 'success'}
        />
      </div>
      {settings ? (
        <div className='flex flex-wrap gap-2'>
          {fiscalSettingsDefaultChips(settings).map((chip) => (
            <Chip
              className='border-[#d8b769] text-[#2c281e]'
              key={chip.label}
              label={`${chip.label}: ${chip.value}`}
              size='small'
              variant='outlined'
            />
          ))}
        </div>
      ) : null}
      {alerts.map((alert) => (
        <Alert key={alert.message} severity={alert.severity}>
          {alert.message}
        </Alert>
      ))}
    </Stack>
  )
}

function fiscalSettingsDefaultChips(settings: FiscalSettings) {
  return [
    {
      label: 'Natureza',
      value: settings.defaultNatureOperation ?? 'Pendente',
    },
    {
      label: 'CFOP',
      value: settings.defaultSaleCfop ?? 'Pendente',
    },
    {
      label: 'ICMS',
      value: settings.defaultIcmsCst ?? 'Pendente',
    },
    {
      label: 'PIS',
      value: settings.defaultPisCst ?? 'Pendente',
    },
    {
      label: 'COFINS',
      value: settings.defaultCofinsCst ?? 'Pendente',
    },
  ]
}

function fiscalSettingsAlerts(settings: FiscalSettings | null) {
  const alertOptions = [
    {
      active: !settings,
      message: 'Configuração fiscal ainda não foi carregada.',
      severity: 'info',
    },
    {
      active: settings?.provider === 'MOCK',
      message:
        'Provedor fiscal em mock interno. As notas geradas não serão enviadas para a Focus.',
      severity: 'warning',
    },
    {
      active:
        settings?.environment === 'PRODUCTION' && !settings.allowProduction,
      message:
        'Ambiente de produção selecionado, mas emissão em produção continua bloqueada.',
      severity: 'warning',
    },
  ] as const

  return alertOptions.filter((alert) => alert.active)
}

function fiscalDocumentSummaryMetrics(summary: FiscalDocumentSummary) {
  return [
    {
      label: 'Prontas',
      value: summary.readyRequests,
    },
    {
      label: 'Com pendencias',
      value: summary.pendingRequests,
    },
    {
      label: 'Processando',
      value: summary.processingDocuments,
    },
    {
      label: 'Cancelamentos',
      value: summary.processingCancellations,
    },
    {
      label: 'Rejeitadas',
      value: summary.rejectedDocuments,
    },
  ]
}

function FiscalReadinessIssueHighlights({
  issues,
}: {
  issues: FiscalDocumentSummary['frequentReadinessIssues']
}) {
  return issues.length > 0 ? (
    <Stack spacing={1}>
      <InlineNote>Pendencias mais frequentes</InlineNote>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {issues.map((issue) => (
          <Chip
            key={issue.label}
            label={`${issue.label}: ${issue.count}`}
            size='small'
            variant='outlined'
          />
        ))}
      </Box>
    </Stack>
  ) : null
}

function fiscalDocumentSummary(
  fiscalRequests: FiscalRequest[],
  fiscalDocuments: FiscalDocument[],
): FiscalDocumentSummary {
  return {
    cancellationRejections: fiscalDocuments.filter(
      fiscalDocumentHasRejectedCancellation,
    ).length,
    frequentReadinessIssues: frequentFiscalReadinessIssues(fiscalRequests),
    pendingRequests: fiscalRequests.filter(
      (request) =>
        canIssueFiscalRequest(request) && request.readinessIssues.length > 0,
    ).length,
    processingDocuments: fiscalDocuments.filter(
      fiscalDocumentHasPendingAuthorization,
    ).length,
    processingCancellations: fiscalDocuments.filter(
      fiscalDocumentHasPendingCancellation,
    ).length,
    readyRequests: fiscalRequests.filter(
      (request) =>
        canIssueFiscalRequest(request) && request.readinessIssues.length === 0,
    ).length,
    rejectedDocuments: fiscalDocuments.filter(
      (document) => document.status === 'REJECTED',
    ).length,
  }
}

function fiscalDocumentHasPendingCancellation(document: FiscalDocument) {
  return (
    document.status === 'PROCESSING' && Boolean(document.cancellationReason)
  )
}

function fiscalDocumentHasPendingAuthorization(document: FiscalDocument) {
  return (
    ['PENDING', 'PROCESSING'].includes(document.status) &&
    !fiscalDocumentHasPendingCancellation(document)
  )
}

function fiscalDocumentHasRejectedCancellation(document: FiscalDocument) {
  return document.status === 'AUTHORIZED' && Boolean(document.rejectionReason)
}

function frequentFiscalReadinessIssues(fiscalRequests: FiscalRequest[]) {
  const issueCounts = fiscalRequests
    .filter((request) => canIssueFiscalRequest(request))
    .flatMap((request) => request.readinessIssues)
    .reduce<Record<string, number>>((counts, issue) => {
      const label = fiscalReadinessIssueLabel(issue)
      return { ...counts, [label]: (counts[label] ?? 0) + 1 }
    }, {})

  return Object.entries(issueCounts)
    .map(([label, count]) => ({ count, label }))
    .sort(
      (current, next) =>
        next.count - current.count || current.label.localeCompare(next.label),
    )
    .slice(0, 6)
}

function fiscalDocumentSummaryAlerts(summary: FiscalDocumentSummary) {
  return [
    {
      enabled: summary.rejectedDocuments > 0,
      message:
        'Existem NF-e rejeitadas. Confira o motivo na tabela e ajuste os dados antes de tentar novamente.',
      severity: 'error' as const,
    },
    {
      enabled: summary.processingDocuments > 0,
      message:
        'Existem NF-e em processamento. Use Atualizar para sincronizar o retorno da Focus.',
      severity: 'info' as const,
    },
    {
      enabled: summary.processingCancellations > 0,
      message:
        'Existem cancelamentos de NF-e em processamento. Use Atualizar ate a Focus confirmar o cancelamento.',
      severity: 'info' as const,
    },
    {
      enabled: summary.cancellationRejections > 0,
      message:
        'Existem cancelamentos rejeitados. Confira o motivo na nota autorizada antes de tentar novamente.',
      severity: 'warning' as const,
    },
    {
      enabled: summary.pendingRequests > 0,
      message:
        'Algumas vendas ainda possuem pendências fiscais e não podem ser emitidas.',
      severity: 'warning' as const,
    },
  ].filter((alert) => alert.enabled)
}

function FiscalDocumentActions({
  document,
  onCancelFiscalDocument,
  onSyncFiscalDocument,
}: {
  document: FiscalDocument
  onCancelFiscalDocument: (
    event: FormEvent<HTMLFormElement>,
    fiscalDocument: FiscalDocument,
  ) => void
  onSyncFiscalDocument: (fiscalDocument: FiscalDocument) => void
}) {
  const [showCancellationForm, setShowCancellationForm] = useState(false)

  if (document.status === 'CANCELLED') {
    return <span className='text-sm text-[#5f665f]'>Documento cancelado</span>
  }

  if (document.status === 'REJECTED') {
    return (
      <span className='text-sm text-[#5f665f]'>
        Corrija os dados fiscais e reemita pela fila.
      </span>
    )
  }

  const actions: TableActionsMenuAction[] = [
    {
      label: 'Atualizar retorno',
      onSelect: () => onSyncFiscalDocument(document),
    },
  ]

  document.status === 'AUTHORIZED' &&
    actions.push({
      label: 'Cancelar NF-e',
      onSelect: () => setShowCancellationForm(true),
    })

  return (
    <div className='grid min-w-0 gap-2'>
      <div className='flex justify-end'>
        <TableActionsMenu actions={actions} />
      </div>

      {showCancellationForm && document.status === 'AUTHORIZED' ? (
        <form
          className='grid w-full max-w-72 gap-2'
          onSubmit={(event) => onCancelFiscalDocument(event, document)}>
          <TextField
            name='fiscalCancellationReason'
            label='Motivo do cancelamento'
            helperText='Informe entre 15 e 255 caracteres.'
            slotProps={{ htmlInput: { maxLength: 255, minLength: 15 } }}
            size='small'
            required
          />
          <div className='flex flex-wrap gap-2'>
            <TableActionButton type='submit'>Cancelar NF-e</TableActionButton>
            <TableActionButton
              type='button'
              onClick={() => setShowCancellationForm(false)}>
              Fechar
            </TableActionButton>
          </div>
        </form>
      ) : null}
    </div>
  )
}
