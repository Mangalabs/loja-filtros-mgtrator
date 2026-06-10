import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import {
  Banknote,
  CreditCard,
  FileText,
  Plus,
  Power,
  PowerOff,
} from 'lucide-react'
import type { FormEvent } from 'react'
import type {
  AuthUser,
  CashRegisterSession,
  Client,
  FiscalDocument,
  PaymentMethod,
  PickupReservation,
  Product,
  Sale,
  ShippingOrder,
} from '../../api'
import {
  PrimaryButton,
  StatusChip,
  TableActionButton,
  type StatusTone,
} from '../../components/ui'
import { formatCurrency, formatDateTime } from '../../utils/format'

export function PaymentMethodsPage({
  paymentMethods,
  onChangeStatus,
}: {
  paymentMethods: PaymentMethod[]
  onChangeStatus: (paymentMethod: PaymentMethod) => void
}) {
  return (
    <div className='panel wide'>
      <div className='panel-header compact'>
        <div>
          <h2>Formas configuradas</h2>
          <span>
            Credito sera incluido somente depois que suas regras forem
            definidas.
          </span>
        </div>
        <CreditCard size={18} />
      </div>
      <div className='table-shell'>
        <table className='responsive-card-table'>
          <thead>
            <tr>
              <th>Forma de pagamento</th>
              <th>Codigo</th>
              <th>Status</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {paymentMethods.map((paymentMethod) => (
              <tr key={paymentMethod.id}>
                <td data-label='Forma de pagamento'>{paymentMethod.name}</td>
                <td data-label='Codigo'>{paymentMethod.code}</td>
                <td data-label='Status'>
                  <StatusChip
                    label={paymentMethod.active ? 'Ativa' : 'Inativa'}
                    tone={paymentMethod.active ? 'success' : 'neutral'}
                  />
                </td>
                <td data-label='Acoes'>
                  <div className='table-actions'>
                    <TableActionButton
                      icon={
                        paymentMethod.active ? (
                          <PowerOff size={14} />
                        ) : (
                          <Power size={14} />
                        )
                      }
                      type='button'
                      onClick={() => onChangeStatus(paymentMethod)}>
                      {paymentMethod.active ? 'Inativar' : 'Ativar'}
                    </TableActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function FiscalDocumentsPage({
  clients,
  fiscalDocuments,
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
  const fiscalRequests = fiscalRequestFactories.flatMap((factory) =>
    factory({
      clients,
      fiscalDocuments,
      pickupReservations,
      products,
      sales,
      shippingOrders,
    }),
  ).sort(fiscalRequestSort)
  const fiscalSummary = fiscalDocumentSummary(fiscalRequests, fiscalDocuments)

  return (
    <section className='layout-grid stock-entry-layout'>
      <FiscalDocumentsOverview summary={fiscalSummary} />

      <div className='panel wide'>
        <div className='panel-header compact'>
          <div>
            <h2>Fila de emissao</h2>
            <span>
              Centralize a emissao fiscal de balcao, envio e retirada.
            </span>
          </div>
          <FileText size={18} />
        </div>
        <div className='table-shell'>
          <table className='responsive-card-table'>
            <thead>
              <tr>
                <th>Origem</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Status fiscal</th>
                <th>Prontidao</th>
                <th>Operador</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {fiscalRequests.map((request) => (
                <tr key={`${request.sourceType}-${request.sourceId}`}>
                  <td data-label='Origem'>
                    <strong>{request.sourceLabel}</strong>
                    <span className='table-note'>{request.sourceId}</span>
                  </td>
                  <td data-label='Cliente'>{request.clientName}</td>
                  <td data-label='Total'>
                    {formatCurrency(request.totalAmount)}
                  </td>
                  <td data-label='Status fiscal'>
                    {request.document ? (
                      <FiscalDocumentStatus document={request.document} />
                    ) : (
                      <StatusChip label={request.pendingLabel} tone='warning' />
                    )}
                  </td>
                  <td data-label='Prontidao'>
                    <FiscalReadinessStatus request={request} />
                  </td>
                  <td data-label='Operador'>{request.operatorName}</td>
                  <td data-label='Acoes'>
                    <div className='table-actions'>
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
                  </td>
                </tr>
              ))}
              {fiscalRequests.length === 0 ? (
                <tr>
                  <td colSpan={7}>Nenhuma venda disponivel para emissao.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className='panel wide'>
        <div className='panel-header compact'>
          <div>
            <h2>Notas emitidas</h2>
            <span>
              Acompanhe o retorno do provedor fiscal e os documentos gerados.
            </span>
          </div>
          <FileText size={18} />
        </div>
        <div className='table-shell'>
          <table className='responsive-card-table'>
            <thead>
              <tr>
                <th>Documento</th>
                <th>Origem</th>
                <th>Status</th>
                <th>Ambiente</th>
                <th>Emissao</th>
                <th>Referencias</th>
                <th>Arquivos</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {fiscalDocuments.map((document) => (
                <tr key={document.id}>
                  <td data-label='Documento'>
                    <strong>{document.documentType}</strong>
                    <span className='table-note'>
                      {document.number ? `#${document.number}` : 'Sem numero'}
                      {document.series ? ` serie ${document.series}` : ''}
                    </span>
                  </td>
                  <td data-label='Origem'>
                    <strong>
                      {fiscalDocumentSourceLabel(document.sourceType)}
                    </strong>
                    <span className='table-note'>{document.sourceId}</span>
                  </td>
                  <td data-label='Status'>
                    <StatusChip
                      label={fiscalDocumentStatusLabel(document.status)}
                      tone={fiscalDocumentStatusTone(document.status)}
                    />
                    {fiscalDocumentStatusDetail(document) ? (
                      <span className='table-note'>
                        {fiscalDocumentStatusDetail(document)}
                      </span>
                    ) : null}
                  </td>
                  <td data-label='Ambiente'>
                    <strong>{document.provider}</strong>
                    <span className='table-note'>
                      {fiscalDocumentEnvironmentLabel(document.environment)}
                    </span>
                  </td>
                  <td data-label='Emissao'>
                    <strong>
                      {formatDateTime(document.issuedAt ?? document.createdAt)}
                    </strong>
                    <span className='table-note'>
                      {document.issuedByUserName}
                    </span>
                    {fiscalDocumentAuditDetail(document) ? (
                      <span className='table-note'>
                        {fiscalDocumentAuditDetail(document)}
                      </span>
                    ) : null}
                  </td>
                  <td data-label='Referencias'>
                    <strong>
                      {document.providerReference ?? 'Sem referencia'}
                    </strong>
                    <span className='table-note'>
                      {document.accessKey ?? 'Sem chave de acesso'}
                    </span>
                  </td>
                  <td data-label='Arquivos'>
                    <FiscalDocumentLinks document={document} />
                  </td>
                  <td data-label='Acoes'>
                    <FiscalDocumentActions
                      document={document}
                      onCancelFiscalDocument={onCancelFiscalDocument}
                      onSyncFiscalDocument={onSyncFiscalDocument}
                    />
                  </td>
                </tr>
              ))}
              {fiscalDocuments.length === 0 ? (
                <tr>
                  <td colSpan={8}>Nenhuma nota fiscal emitida.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

type FiscalRequest = {
  sourceType: FiscalDocument['sourceType']
  sourceId: string
  sourceLabel: string
  pendingLabel: string
  clientName: string
  totalAmount: string
  operatorName: string
  readinessIssues: string[]
  sale?: Sale
  shippingOrder?: ShippingOrder
  pickupReservation?: PickupReservation
  document?: FiscalDocument
}

type FiscalRequestFactoryInput = {
  clients: Client[]
  fiscalDocuments: FiscalDocument[]
  pickupReservations: PickupReservation[]
  products: Product[]
  sales: Sale[]
  shippingOrders: ShippingOrder[]
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
    <span className='table-note'>
      {fiscalRequestActionLabel(request, Boolean(action))}
    </span>
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
      <span className='table-note'>{issueSummary}</span>
      <Tooltip title={request.readinessIssues.join('\n')} placement='top'>
        <span className='table-note'>
          {visibleIssues.join(' ')}
          {hiddenIssuesCount > 0 ? ` +${hiddenIssuesCount}` : ''}
        </span>
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
    { client: 0, product: 0 },
  )

  return [
    issueCounts.client > 0 ? `Cliente: ${issueCounts.client}` : null,
    issueCounts.product > 0 ? `Produtos: ${issueCounts.product}` : null,
  ]
    .filter(Boolean)
    .join(' | ')
}

function fiscalReadinessIssueCategory(issue: string) {
  return issue.includes('cliente') || issue.includes('Cliente')
    ? 'client'
    : 'product'
}

function fiscalRequestActionLabel(request: FiscalRequest, hasAction: boolean) {
  const labels: Record<string, string> = {
    documented: 'Documento registrado',
    future: 'Emissao futura',
    pending: 'Corrija pendencias',
  }
  const labelKey = request.document
    ? 'documented'
    : hasAction && request.readinessIssues.length > 0
      ? 'pending'
      : 'future'

  return labels[labelKey]
}

function fiscalRequestActionText(request: FiscalRequest) {
  return request.document?.status === 'REJECTED'
    ? 'Reemitir NF-e'
    : 'Emitir NF-e'
}

type FiscalRequestActionHandlers = {
  onIssuePickupReservationFiscalDocument: (
    reservation: PickupReservation,
  ) => void
  onIssueSaleFiscalDocument: (sale: Sale) => void
  onIssueShippingOrderFiscalDocument: (order: ShippingOrder) => void
}

function fiscalRequestAction(
  request: FiscalRequest,
  handlers: FiscalRequestActionHandlers,
) {
  const actions: Partial<
    Record<FiscalDocument['sourceType'], (() => void) | undefined>
  > = {
    PICKUP_RESERVATION:
      request.pickupReservation && canIssueFiscalRequest(request)
        ? () =>
            handlers.onIssuePickupReservationFiscalDocument(
              request.pickupReservation as PickupReservation,
            )
        : undefined,
    SALE:
      request.sale && canIssueFiscalRequest(request)
        ? () => handlers.onIssueSaleFiscalDocument(request.sale as Sale)
        : undefined,
    SHIPPING_ORDER:
      request.shippingOrder && canIssueFiscalRequest(request)
        ? () =>
            handlers.onIssueShippingOrderFiscalDocument(
              request.shippingOrder as ShippingOrder,
            )
        : undefined,
  }

  return actions[request.sourceType]
}

function canIssueFiscalRequest(request: FiscalRequest) {
  return !request.document || request.document.status === 'REJECTED'
}

function fiscalRequestSort(current: FiscalRequest, next: FiscalRequest) {
  return (
    fiscalRequestPriority(current) - fiscalRequestPriority(next) ||
    current.sourceLabel.localeCompare(next.sourceLabel) ||
    current.clientName.localeCompare(next.clientName)
  )
}

function fiscalRequestPriority(request: FiscalRequest) {
  const priorityByState: Record<string, number> = {
    blocked: 0,
    documented: 3,
    processing: 2,
    ready: 1,
  }

  return priorityByState[fiscalRequestState(request)]
}

function fiscalRequestState(request: FiscalRequest) {
  const states = [
    {
      active:
        canIssueFiscalRequest(request) && request.readinessIssues.length > 0,
      key: 'blocked',
    },
    {
      active:
        canIssueFiscalRequest(request) && request.readinessIssues.length === 0,
      key: 'ready',
    },
    {
      active:
        request.document?.status === 'PENDING' ||
        request.document?.status === 'PROCESSING',
      key: 'processing',
    },
  ]

  return states.find((state) => state.active)?.key ?? 'documented'
}

const fiscalRequestFactories: Array<
  (input: FiscalRequestFactoryInput) => FiscalRequest[]
> = [
  ({ clients, fiscalDocuments, products, sales }) =>
    sales
      .filter((sale) => sale.status === 'COMPLETED')
      .map((sale) => ({
        sourceType: 'SALE',
        sourceId: sale.id,
        sourceLabel: 'Balcao',
        pendingLabel: 'Pendente',
        clientName: sale.clientName ?? 'Nao identificado',
        totalAmount: sale.totalAmount,
        operatorName: sale.createdByUserName,
        readinessIssues: fiscalReadinessIssues({
          client: findClient(clients, sale.clientId),
          items: sale.items,
          products,
        }),
        sale,
        document: findFiscalDocument(fiscalDocuments, 'SALE', sale.id),
      })),
  ({ clients, fiscalDocuments, products, shippingOrders }) =>
    shippingOrders
      .filter((order) => order.status === 'COMPLETED')
      .map((order) => ({
        sourceType: 'SHIPPING_ORDER',
        sourceId: order.id,
        sourceLabel: 'Envio',
        pendingLabel: 'Pendente',
        clientName: order.clientName,
        totalAmount: order.totalAmount,
        operatorName: order.completedByUserName ?? order.createdByUserName,
        readinessIssues: fiscalReadinessIssues({
          client: findClient(clients, order.clientId),
          items: order.items,
          products,
        }),
        shippingOrder: order,
        document: findFiscalDocument(
          fiscalDocuments,
          'SHIPPING_ORDER',
          order.id,
        ),
      })),
  ({ clients, fiscalDocuments, pickupReservations, products }) =>
    pickupReservations
      .filter((reservation) => reservation.status === 'COMPLETED')
      .map((reservation) => ({
        sourceType: 'PICKUP_RESERVATION',
        sourceId: reservation.id,
        sourceLabel: 'Retirada',
        pendingLabel: 'Pendente',
        clientName: reservation.clientName,
        totalAmount: reservation.totalAmount,
        operatorName:
          reservation.completedByUserName ?? reservation.createdByUserName,
        readinessIssues: fiscalReadinessIssues({
          client: findClient(clients, reservation.clientId),
          items: reservation.items,
          products,
        }),
        pickupReservation: reservation,
        document: findFiscalDocument(
          fiscalDocuments,
          'PICKUP_RESERVATION',
          reservation.id,
        ),
      })),
]

type FiscalReadinessInput = {
  client?: Client
  items: Array<{ productId: string; productName: string }>
  products: Product[]
}

function fiscalReadinessIssues({
  client,
  items,
  products,
}: FiscalReadinessInput) {
  return [
    ...clientReadinessIssues(client),
    ...items.flatMap((item) =>
      productReadinessIssues(findProduct(products, item.productId), item),
    ),
  ]
}

function clientReadinessIssues(client?: Client) {
  const documentRequired = client?.personType !== 'ES'
  const fieldChecks: Array<[unknown, string]> = [
    [client, 'Cliente deve estar cadastrado.'],
    [client?.name, 'Nome do cliente pendente.'],
    [
      documentRequired ? client?.document : true,
      'CPF/CNPJ do cliente pendente.',
    ],
    [client?.addressStreet, 'Logradouro do cliente pendente.'],
    [client?.addressNumber, 'Numero do cliente pendente.'],
    [client?.addressDistrict, 'Bairro do cliente pendente.'],
    [client?.addressCity, 'Cidade do cliente pendente.'],
    [client?.addressState, 'UF do cliente pendente.'],
    [client?.addressZipCode, 'CEP do cliente pendente.'],
  ]

  return missingMessages(fieldChecks)
}

function productReadinessIssues(
  product: Product | undefined,
  item: { productName: string },
) {
  const label = item.productName
  const fieldChecks: Array<[unknown, string]> = [
    [product, `Produto ${label} deve estar cadastrado.`],
    [product?.ncm, `NCM pendente em ${label}.`],
    [product?.cfop, `CFOP pendente em ${label}.`],
    [product?.origin, `Origem fiscal pendente em ${label}.`],
    [product?.icmsCst, `CST ICMS pendente em ${label}.`],
    [product?.pisCst, `CST PIS pendente em ${label}.`],
    [product?.cofinsCst, `CST COFINS pendente em ${label}.`],
  ]

  return missingMessages(fieldChecks)
}

function missingMessages(fieldChecks: Array<[unknown, string]>) {
  return fieldChecks
    .filter(([value]) => !value)
    .map(([_value, message]) => message)
}

function findClient(clients: Client[], clientId: string | null) {
  return clients.find((client) => client.id === clientId)
}

function findProduct(products: Product[], productId: string) {
  return products.find((product) => product.id === productId)
}

function findFiscalDocument(
  fiscalDocuments: FiscalDocument[],
  sourceType: FiscalDocument['sourceType'],
  sourceId: string,
) {
  return fiscalDocuments.find(
    (document) =>
      document.sourceType === sourceType && document.sourceId === sourceId,
  )
}

function FiscalDocumentStatus({ document }: { document: FiscalDocument }) {
  return (
    <Stack spacing={0.75}>
      <StatusChip
        label={fiscalDocumentStatusLabel(document.status)}
        tone={fiscalDocumentStatusTone(document.status)}
      />
      <span className='table-note'>
        {document.documentType} {document.number ? `#${document.number}` : ''}
      </span>
    </Stack>
  )
}

function FiscalDocumentLinks({ document }: { document: FiscalDocument }) {
  const links = [
    { label: 'DANFE', url: document.pdfUrl },
    { label: 'XML', url: document.xmlUrl },
  ].filter((link): link is { label: string; url: string } => Boolean(link.url))

  return links.length > 0 ? (
    <div className='table-actions'>
      {links.map((link) => (
        <Link href={link.url} key={link.label} target='_blank' rel='noreferrer'>
          {link.label}
        </Link>
      ))}
    </div>
  ) : (
    <span className='empty-text'>Sem arquivos</span>
  )
}

type FiscalDocumentSummary = {
  frequentReadinessIssues: Array<{ count: number; label: string }>
  readyRequests: number
  pendingRequests: number
  rejectedDocuments: number
  processingDocuments: number
}

function FiscalDocumentsOverview({
  summary,
}: {
  summary: FiscalDocumentSummary
}) {
  const alerts = fiscalDocumentSummaryAlerts(summary)

  return (
    <div className='panel wide'>
      <div className='panel-header compact'>
        <div>
          <h2>Controle fiscal</h2>
          <span>
            Visao rapida da fila antes de emitir, sincronizar ou cancelar NF-e.
          </span>
        </div>
        <FileText size={18} />
      </div>
      <div className='metrics-grid'>
        <div className='metric-card'>
          <span>Prontas para emitir/reemitir</span>
          <strong>{summary.readyRequests}</strong>
        </div>
        <div className='metric-card'>
          <span>Com pendencias</span>
          <strong>{summary.pendingRequests}</strong>
        </div>
        <div className='metric-card'>
          <span>Processando</span>
          <strong>{summary.processingDocuments}</strong>
        </div>
        <div className='metric-card'>
          <span>Rejeitadas</span>
          <strong>{summary.rejectedDocuments}</strong>
        </div>
      </div>
      <FiscalReadinessIssueHighlights
        issues={summary.frequentReadinessIssues}
      />
      {alerts.length > 0 ? (
        <Stack spacing={1}>
          {alerts.map((alert) => (
            <Alert key={alert.message} severity={alert.severity}>
              {alert.message}
            </Alert>
          ))}
        </Stack>
      ) : null}
    </div>
  )
}

function FiscalReadinessIssueHighlights({
  issues,
}: {
  issues: FiscalDocumentSummary['frequentReadinessIssues']
}) {
  return issues.length > 0 ? (
    <Stack spacing={1}>
      <span className='table-note'>Pendencias mais frequentes</span>
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
    processingDocuments: fiscalDocuments.filter((document) =>
      ['PENDING', 'PROCESSING'].includes(document.status),
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

function fiscalReadinessIssueLabel(issue: string) {
  return (
    fiscalReadinessIssueLabelPatterns.find(({ pattern }) =>
      pattern.test(issue),
    )?.label ?? issue
  )
}

const fiscalReadinessIssueLabelPatterns = [
  { label: 'Cliente cadastrado', pattern: /cliente deve estar cadastrado/i },
  { label: 'Nome cliente', pattern: /nome do cliente/i },
  { label: 'CPF\/CNPJ cliente', pattern: /cpf\/cnpj/i },
  { label: 'Logradouro cliente', pattern: /logradouro/i },
  { label: 'Numero cliente', pattern: /numero do cliente/i },
  { label: 'Bairro cliente', pattern: /bairro/i },
  { label: 'Cidade cliente', pattern: /cidade/i },
  { label: 'UF cliente', pattern: /uf do cliente/i },
  { label: 'CEP cliente', pattern: /cep do cliente/i },
  { label: 'Produto cadastrado', pattern: /produto .+ deve estar cadastrado/i },
  { label: 'NCM produto', pattern: /ncm pendente/i },
  { label: 'CFOP produto', pattern: /cfop pendente/i },
  { label: 'Origem fiscal produto', pattern: /origem fiscal pendente/i },
  { label: 'CST ICMS produto', pattern: /cst icms pendente/i },
  { label: 'CST PIS produto', pattern: /cst pis pendente/i },
  { label: 'CST COFINS produto', pattern: /cst cofins pendente/i },
]

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
    return <span className='table-note'>Documento cancelado</span>
  }

  if (document.status === 'REJECTED') {
    return (
      <span className='table-note'>
        Corrija os dados fiscais e reemita pela fila.
      </span>
    )
  }

  return (
    <div className='shipping-order-actions'>
      <TableActionButton
        type='button'
        onClick={() => onSyncFiscalDocument(document)}>
        Atualizar
      </TableActionButton>

      {document.status === 'AUTHORIZED' ? (
        <form
          className='cancel-order-form'
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

function fiscalDocumentSourceLabel(sourceType: FiscalDocument['sourceType']) {
  return fiscalDocumentSourceLabels[sourceType]
}

function fiscalDocumentEnvironmentLabel(
  environment: FiscalDocument['environment'],
) {
  return fiscalDocumentEnvironmentLabels[environment]
}

function fiscalDocumentStatusLabel(status: FiscalDocument['status']) {
  return fiscalDocumentStatusPresentations[status].label
}

function fiscalDocumentStatusTone(
  status: FiscalDocument['status'],
): StatusTone {
  return fiscalDocumentStatusPresentations[status].tone
}

function fiscalDocumentStatusDetail(document: FiscalDocument) {
  const detailByStatus: Partial<Record<FiscalDocument['status'], string | null>> =
    {
      CANCELLED: document.cancellationReason,
      REJECTED: document.rejectionReason,
    }

  return detailByStatus[document.status] ?? null
}

function fiscalDocumentAuditDetail(document: FiscalDocument) {
  const detailByStatus: Partial<Record<FiscalDocument['status'], string | null>> =
    {
      CANCELLED:
        document.cancelledByUserName && document.cancelledAt
          ? `Cancelada por ${document.cancelledByUserName} em ${formatDateTime(document.cancelledAt)}`
          : null,
    }

  return detailByStatus[document.status] ?? null
}

const fiscalDocumentSourceLabels: Record<FiscalDocument['sourceType'], string> =
  {
    PICKUP_RESERVATION: 'Reserva',
    SALE: 'Venda',
    SHIPPING_ORDER: 'Envio',
  }

const fiscalDocumentEnvironmentLabels: Record<
  FiscalDocument['environment'],
  string
> = {
  HOMOLOGATION: 'Homologacao',
  PRODUCTION: 'Producao',
}

const fiscalDocumentStatusPresentations: Record<
  FiscalDocument['status'],
  { label: string; tone: StatusTone }
> = {
  AUTHORIZED: { label: 'Autorizada', tone: 'success' },
  CANCELLED: { label: 'Cancelada', tone: 'neutral' },
  PENDING: { label: 'Pendente', tone: 'warning' },
  PROCESSING: { label: 'Processando', tone: 'warning' },
  REJECTED: { label: 'Rejeitada', tone: 'error' },
}

export function CashRegisterPage({
  session,
  user,
  onOpen,
  onClose,
}: {
  session: CashRegisterSession | null
  user: AuthUser
  onOpen: (event: FormEvent<HTMLFormElement>) => void
  onClose: (event: FormEvent<HTMLFormElement>) => void
}) {
  if (session) {
    return (
      <section className='layout-grid stock-entry-layout'>
        <div className='panel'>
          <div className='panel-header compact'>
            <div>
              <h2>Caixa aberto</h2>
              <span>Confira os recebimentos antes de fechar o caixa.</span>
            </div>
            <StatusChip label='Aberto' tone='success' />
          </div>
          <div className='cash-register-details'>
            <div>
              <span>Aberto por</span>
              <strong>{session.openedByUserName}</strong>
            </div>
            <div>
              <span>Data de abertura</span>
              <strong>{formatDateTime(session.openedAt)}</strong>
            </div>
            <div>
              <span>Saldo inicial</span>
              <strong>{formatCurrency(session.openingBalance)}</strong>
            </div>
            <div>
              <span>Vendas</span>
              <strong>{formatCurrency(session.salesTotal)}</strong>
            </div>
            <div>
              <span>Esperado</span>
              <strong>{formatCurrency(session.expectedClosingBalance)}</strong>
            </div>
          </div>
        </div>

        <form className='panel form-panel' onSubmit={onClose}>
          <div className='panel-header compact'>
            <div>
              <h2>Fechamento</h2>
              <span>Informe o total conferido no caixa.</span>
            </div>
            <Banknote size={18} />
          </div>
          <div className='entity-list'>
            {session.paymentSummary.map((payment) => (
              <div className='entity-row' key={payment.paymentMethodId}>
                <strong>{payment.paymentMethodName}</strong>
                <span>{formatCurrency(payment.amount)}</span>
              </div>
            ))}
            {session.paymentSummary.length === 0 ? (
              <span className='empty-text'>Nenhuma venda registrada.</span>
            ) : null}
          </div>
          <label className='field-label'>
            Saldo esperado
            <input
              value={formatCurrency(session.expectedClosingBalance)}
              disabled
            />
          </label>
          <label className='field-label'>
            Valor conferido
            <input
              name='closingBalance'
              type='number'
              min='0'
              step='0.01'
              defaultValue={session.expectedClosingBalance}
              required
            />
          </label>
          <PrimaryButton icon={<Plus size={17} />} type='submit'>
            Fechar caixa
          </PrimaryButton>
        </form>
      </section>
    )
  }

  return (
    <form className='panel form-panel single-column' onSubmit={onOpen}>
      <div className='panel-header compact'>
        <div>
          <h2>Abrir caixa</h2>
          <span>A abertura ficara registrada no usuario autenticado.</span>
        </div>
        <Banknote size={18} />
      </div>
      <label className='field-label'>
        Responsavel
        <input value={user.name} disabled />
      </label>
      <label className='field-label'>
        Saldo inicial
        <input
          name='openingBalance'
          type='number'
          min='0'
          step='0.01'
          defaultValue='0.00'
          required
        />
      </label>
      <PrimaryButton icon={<Plus size={17} />} type='submit'>
        Abrir caixa
      </PrimaryButton>
    </form>
  )
}
