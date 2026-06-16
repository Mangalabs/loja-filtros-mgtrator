import type {
  Client,
  FiscalDocument,
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
  const labelKey = request.document
    ? 'documented'
    : hasAction && request.readinessIssues.length > 0
      ? 'pending'
      : 'future'

  return labels[labelKey]
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
