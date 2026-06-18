import type {
  Client,
  FiscalDocument,
  FiscalSettings,
  PickupReservation,
  Product,
  Sale,
  ShippingOrder,
} from '../../api'
import { findClient, fiscalReadinessIssues } from './fiscalReadiness'

export type FiscalRequest = {
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
  fiscalSettings: FiscalSettings | null
  pickupReservations: PickupReservation[]
  products: Product[]
  sales: Sale[]
  shippingOrders: ShippingOrder[]
}

export type FiscalRequestActionHandlers = {
  onIssuePickupReservationFiscalDocument: (
    reservation: PickupReservation,
  ) => void
  onIssueSaleFiscalDocument: (sale: Sale) => void
  onIssueShippingOrderFiscalDocument: (order: ShippingOrder) => void
}

export function buildFiscalRequests(input: FiscalRequestFactoryInput) {
  return fiscalRequestFactories
    .flatMap((factory) => factory(input))
    .sort(fiscalRequestSort)
}

export function fiscalRequestAction(
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

export function fiscalRequestActionLabel(
  request: FiscalRequest,
  hasAction: boolean,
) {
  const labels: Record<string, string> = {
    documented: 'Documento registrado',
    future: 'Emissao futura',
    pending: 'Corrija pendencias',
  }
  const labelState = [
    {
      active:
        request.document?.status === 'REJECTED' &&
        request.readinessIssues.length > 0,
      key: 'pending',
    },
    {
      active:
        Boolean(request.document) && request.document?.status !== 'REJECTED',
      key: 'documented',
    },
    {
      active: hasAction && request.readinessIssues.length > 0,
      key: 'pending',
    },
  ].find((state) => state.active)

  return labels[labelState?.key ?? 'future']
}

export function fiscalRequestActionText(request: FiscalRequest) {
  return request.document?.status === 'REJECTED'
    ? 'Reemitir NF-e'
    : 'Emitir NF-e'
}

export function canIssueFiscalRequest(request: FiscalRequest) {
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
    blocked: 2,
    documented: 4,
    processing: 3,
    ready: 1,
    reissue: 0,
  }

  return priorityByState[fiscalRequestState(request)]
}

function fiscalRequestState(request: FiscalRequest) {
  const states = [
    {
      active:
        request.document?.status === 'REJECTED' &&
        request.readinessIssues.length === 0,
      key: 'reissue',
    },
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
  (input) => {
    const linkedSaleIds = linkedFiscalSaleIds(input)

    return input.sales
      .filter(
        (sale) =>
          sale.status === 'COMPLETED' && !linkedSaleIds.has(sale.id),
      )
      .map((sale) => ({
        sourceType: 'SALE',
        sourceId: sale.id,
        sourceLabel: 'Balcao',
        pendingLabel: 'Pendente',
        clientName: sale.clientName ?? 'Nao identificado',
        totalAmount: sale.totalAmount,
        operatorName: sale.createdByUserName,
        readinessIssues: sourceFiscalReadinessIssues({
          client: findClient(input.clients, sale.clientId),
          fiscalSettings: input.fiscalSettings,
          items: sale.items,
          products: input.products,
        }),
        sale,
        document: findFiscalDocument(input.fiscalDocuments, 'SALE', sale.id),
      }))
  },
  ({ clients, fiscalDocuments, fiscalSettings, products, shippingOrders }) =>
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
        readinessIssues: sourceFiscalReadinessIssues({
          client: findClient(clients, order.clientId),
          fiscalSettings,
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
  ({
    clients,
    fiscalDocuments,
    fiscalSettings,
    pickupReservations,
    products,
  }) =>
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
        readinessIssues: sourceFiscalReadinessIssues({
          client: findClient(clients, reservation.clientId),
          fiscalSettings,
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

function sourceFiscalReadinessIssues({
  client,
  fiscalSettings,
  items,
  products,
}: {
  client?: Client
  fiscalSettings: FiscalSettings | null
  items: Array<{ productId: string; productName: string }>
  products: Product[]
}) {
  const readinessByProvider: Record<string, string[]> = {
    FOCUS: fiscalReadinessIssues({
      client,
      items,
      products,
    }),
    MOCK: [],
  }

  return [
    ...fiscalSettingsReadinessIssues(fiscalSettings),
    ...(readinessByProvider[fiscalSettings?.provider ?? ''] ?? []),
  ]
}

function linkedFiscalSaleIds({
  pickupReservations,
  shippingOrders,
}: {
  pickupReservations: PickupReservation[]
  shippingOrders: ShippingOrder[]
}) {
  return new Set([
    ...shippingOrders
      .filter((order) => order.status === 'COMPLETED')
      .flatMap((order) => (order.saleId ? [order.saleId] : [])),
    ...pickupReservations
      .filter((reservation) => reservation.status === 'COMPLETED')
      .flatMap((reservation) =>
        reservation.saleId ? [reservation.saleId] : [],
      ),
  ])
}

function fiscalSettingsReadinessIssues(settings: FiscalSettings | null) {
  const issues = [
    !settings ? 'Configuracao fiscal ainda nao foi carregada.' : null,
    settings?.provider === 'FOCUS' && !validFiscalCompanyCnpj(settings)
      ? 'CNPJ fiscal da loja deve ter 14 digitos para usar Focus NFe.'
      : null,
    settings?.environment === 'PRODUCTION' && !settings.allowProduction
      ? 'Emissao em producao bloqueada pela configuracao fiscal.'
      : null,
  ]

  return issues.filter((issue): issue is string => Boolean(issue))
}

function validFiscalCompanyCnpj(settings: FiscalSettings) {
  return fiscalDigits(settings.companyCnpj).length === 14
}

function fiscalDigits(value?: string | null) {
  return value?.replace(/\D/g, '') ?? ''
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
