import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import { FileText } from 'lucide-react'
import type { FormEvent } from 'react'
import type {
  Client,
  FiscalDocument,
  FiscalSettings,
  PickupReservation,
  Product,
  Sale,
  ShippingOrder,
} from '../../api'
import {
  InlineNote,
  PageHeader,
  PagePanel,
  ResponsiveTable,
} from '../../components/layout'
import { StatusChip, TableActionButton } from '../../components/ui'
import { usePaginatedRows } from '../../hooks/usePaginatedRows'
import { formatCurrency, formatDateTime } from '../../utils/format'
import {
  fiscalDocumentAuditDetail,
  fiscalDocumentEnvironmentLabel,
  fiscalDocumentSourceLabel,
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
  const {
    pagination: requestPagination,
    visibleItems: visibleFiscalRequests,
  } = usePaginatedRows<FiscalRequest>(fiscalRequests)
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
          description='Centralize a emissao fiscal de balcao, envio e retirada.'
          icon={<FileText size={18} />}
          title='Fila de emissao'
        />
        <ResponsiveTable
          columns={[
            {
              header: 'Origem',
              render: (request) => (
                <>
                  <strong>{request.sourceLabel}</strong>
                  <InlineNote>{request.sourceId}</InlineNote>
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
              render: (request) => <FiscalReadinessStatus request={request} />,
            },
            {
              header: 'Operador',
              render: (request) => request.operatorName,
            },
            {
              align: 'right',
              header: 'Acoes',
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
                  />
                </div>
              ),
            },
          ]}
          emptyMessage='Nenhuma venda disponivel para emissao.'
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
              header: 'Origem',
              render: (document) => (
                <>
                  <strong>
                    {fiscalDocumentSourceLabel(document.sourceType)}
                  </strong>
                  <InlineNote>{document.sourceId}</InlineNote>
                </>
              ),
            },
            {
              header: 'Status',
              render: (document) => (
                <>
                  <StatusChip
                    label={fiscalDocumentStatusLabel(document.status)}
                    tone={fiscalDocumentStatusTone(document.status)}
                  />
                  {fiscalDocumentStatusDetail(document) ? (
                    <InlineNote>
                      {fiscalDocumentStatusDetail(document)}
                    </InlineNote>
                  ) : null}
                </>
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
              header: 'Emissao',
              render: (document) => (
                <>
                  <strong>
                    {formatDateTime(document.issuedAt ?? document.createdAt)}
                  </strong>
                  <InlineNote>
                    {document.issuedByUserName}
                  </InlineNote>
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
              header: 'Acoes',
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

function FiscalRequestAction({
  request,
  onIssuePickupReservationFiscalDocument,
  onIssueSaleFiscalDocument,
  onIssueShippingOrderFiscalDocument,
}: {
  request: FiscalRequest
  onIssuePickupReservationFiscalDocument: (
    reservation: PickupReservation,
  ) => void
  onIssueSaleFiscalDocument: (sale: Sale) => void
  onIssueShippingOrderFiscalDocument: (order: ShippingOrder) => void
}) {
  const action = fiscalRequestAction(request, {
    onIssuePickupReservationFiscalDocument,
    onIssueSaleFiscalDocument,
    onIssueShippingOrderFiscalDocument,
  })

  return action && request.readinessIssues.length === 0 ? (
    <TableActionButton type='button' onClick={action}>
      {fiscalRequestActionText(request)}
    </TableActionButton>
  ) : (
    <InlineNote>
      {fiscalRequestActionLabel(request, Boolean(action))}
    </InlineNote>
  )
}

function FiscalReadinessStatus({ request }: { request: FiscalRequest }) {
  const visibleIssues = request.readinessIssues.slice(0, 2)
  const hiddenIssuesCount = request.readinessIssues.length - visibleIssues.length
  const issueSummary = fiscalReadinessIssueSummary(request.readinessIssues)

  return request.readinessIssues.length === 0 ? (
    <StatusChip label='Pronta' tone='success' />
  ) : (
    <Stack spacing={0.75}>
      <StatusChip
        label={`${request.readinessIssues.length} pendencia(s)`}
        tone='warning'
      />
      <InlineNote>{issueSummary}</InlineNote>
      <Tooltip title={request.readinessIssues.join('\n')} placement='top'>
        <InlineNote>
          {visibleIssues.join(' ')}
          {hiddenIssuesCount > 0 ? ` +${hiddenIssuesCount}` : ''}
        </InlineNote>
      </Tooltip>
    </Stack>
  )
}

function fiscalReadinessIssueSummary(issues: string[]) {
  const issueCounts = issues.reduce(
    (counts, issue) => {
      const category = fiscalReadinessIssueCategory(issue)
      return { ...counts, [category]: counts[category] + 1 }
    },
    { client: 0, configuration: 0, product: 0 },
  )

  return [
    issueCounts.configuration > 0
      ? `Configuracao: ${issueCounts.configuration}`
      : null,
    issueCounts.client > 0 ? `Cliente: ${issueCounts.client}` : null,
    issueCounts.product > 0 ? `Produtos: ${issueCounts.product}` : null,
  ]
    .filter(Boolean)
    .join(' | ')
}

function fiscalReadinessIssueCategory(issue: string) {
  const categoryByPattern = [
    { category: 'configuration', pattern: /configuracao|produção|producao/i },
    { category: 'client', pattern: /cliente/i },
  ] as const

  return (
    categoryByPattern.find(({ pattern }) => pattern.test(issue))?.category ??
    'product'
  )
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

function FiscalDocumentLinks({ document }: { document: FiscalDocument }) {
  const links = [
    { label: 'DANFE', url: document.pdfUrl },
    { label: 'XML', url: document.xmlUrl },
  ].filter(
    (link): link is { label: 'DANFE' | 'XML'; url: string } =>
      Boolean(link.url),
  )

  return links.length > 0 ? (
    <div className='flex flex-wrap justify-end gap-2'>
      {links.map((link) => (
        <Link
          download={fiscalDocumentDownloadName(document, link.label)}
          href={fiscalDocumentFileHref(link.url)}
          key={link.label}
          target='_blank'
          rel='noreferrer'>
          {link.label}
        </Link>
      ))}
    </div>
  ) : (
    <span className='text-sm text-[#5f665f]'>Sem arquivos</span>
  )
}

function fiscalDocumentFileHref(url: string) {
  return url.startsWith('/') ? `/api${url}` : url
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
        description='Visao rapida da fila antes de emitir, sincronizar ou cancelar NF-e.'
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
      {alerts.map((alert) => (
        <Alert key={alert.message} severity={alert.severity}>
          {alert.message}
        </Alert>
      ))}
    </Stack>
  )
}

function fiscalSettingsAlerts(settings: FiscalSettings | null) {
  const alertOptions = [
    {
      active: !settings,
      message: 'Configuracao fiscal ainda nao foi carregada.',
      severity: 'info',
    },
    {
      active: settings?.provider === 'MOCK',
      message:
        'Provedor fiscal em mock interno. As notas geradas nao serao enviadas para a Focus.',
      severity: 'warning',
    },
    {
      active:
        settings?.environment === 'PRODUCTION' && !settings.allowProduction,
      message:
        'Ambiente de producao selecionado, mas emissao em producao continua bloqueada.',
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
  return document.status === 'PROCESSING' && Boolean(document.cancellationReason)
}

function fiscalDocumentHasPendingAuthorization(document: FiscalDocument) {
  return (
    ['PENDING', 'PROCESSING'].includes(document.status) &&
    !fiscalDocumentHasPendingCancellation(document)
  )
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
      enabled: summary.pendingRequests > 0,
      message:
        'Algumas vendas ainda possuem pendencias fiscais e nao podem ser emitidas.',
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

  return (
    <div className='grid min-w-[220px] gap-2'>
      <TableActionButton
        type='button'
        onClick={() => onSyncFiscalDocument(document)}>
        Atualizar
      </TableActionButton>

      {document.status === 'AUTHORIZED' ? (
        <form
          className='grid gap-2'
          onSubmit={(event) => onCancelFiscalDocument(event, document)}>
          <TextField
            name='fiscalCancellationReason'
            label='Motivo do cancelamento'
            helperText='Informe entre 15 e 255 caracteres.'
            slotProps={{ htmlInput: { maxLength: 255, minLength: 15 } }}
            size='small'
            required
          />
          <TableActionButton type='submit'>Cancelar NF-e</TableActionButton>
        </form>
      ) : null}
    </div>
  )
}
