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
  findClient,
  fiscalReadinessIssues,
  type FiscalReadinessClient,
  type FiscalReadinessItem,
} from './fiscalReadiness'

export type FiscalRequest = {
  sourceType: FiscalDocument['sourceType']
  sourceId: string
  sourceNumber: number | null
  sourceLabel: string
  pendingLabel: string
  clientId: string | null
  clientName: string
  createdAt: string
  totalAmount: string
  operatorName: string
  productIds: string[]
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
    additionalInformation?: string,
  ) => void
  onIssueSaleFiscalDocument: (sale: Sale, additionalInformation?: string) => void
  onIssueShippingOrderFiscalDocument: (
    order: ShippingOrder,
    additionalInformation?: string,
  ) => void
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
    Record<FiscalDocument['sourceType'], ((additionalInformation?: string) => void) | undefined>
  > = {
    PICKUP_RESERVATION:
      request.pickupReservation && canIssueFiscalRequest(request)
        ? (additionalInformation) =>
            handlers.onIssuePickupReservationFiscalDocument(
              request.pickupReservation as PickupReservation,
              additionalInformation,
            )
        : undefined,
    SALE:
      request.sale && canIssueFiscalRequest(request)
        ? (additionalInformation) =>
            handlers.onIssueSaleFiscalDocument(
              request.sale as Sale,
              additionalInformation,
            )
        : undefined,
    SHIPPING_ORDER:
      request.shippingOrder && canIssueFiscalRequest(request)
        ? (additionalInformation) =>
            handlers.onIssueShippingOrderFiscalDocument(
              request.shippingOrder as ShippingOrder,
              additionalInformation,
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
        (sale) => sale.status === 'COMPLETED' && !linkedSaleIds.has(sale.id),
      )
      .map((sale) => ({
        sourceType: 'SALE',
        sourceId: sale.id,
        sourceNumber: sale.saleNumber,
        sourceLabel: 'Venda direta',
        pendingLabel: 'Pendente',
        clientId: sale.clientId,
        clientName: sale.clientName ?? 'Nao identificado',
        createdAt: sale.createdAt,
        totalAmount: sale.totalAmount,
        operatorName: sale.createdByUserName,
        productIds: sale.items.map((item) => item.productId),
        readinessIssues: sourceFiscalReadinessIssues({
          client: saleFiscalClient(sale),
          fiscalSettings: input.fiscalSettings,
          items: sale.items,
          products: input.products,
          sale,
        }),
        sale,
        document: findFiscalDocument(input.fiscalDocuments, 'SALE', sale.id),
      }))
  },
  (input) => {
    const salesById = fiscalSalesById(input.sales)

    return input.shippingOrders
      .filter(
        (order) =>
          order.status === 'COMPLETED' &&
          salesById.get(order.saleId ?? '')?.status === 'COMPLETED',
      )
      .map((order) => ({
        sourceType: 'SHIPPING_ORDER',
        sourceId: order.id,
        sourceNumber: salesById.get(order.saleId ?? '')?.saleNumber ?? null,
        sourceLabel: '',
        pendingLabel: 'Pendente',
        clientId: order.clientId,
        clientName: order.clientName,
        createdAt: order.completedAt ?? order.createdAt,
        totalAmount: order.totalAmount,
        operatorName: order.completedByUserName ?? order.createdByUserName,
        productIds: order.items.map((item) => item.productId),
        readinessIssues: sourceFiscalReadinessIssues({
          client: fiscalOperationClient(
            findClient(input.clients, order.clientId),
            order.saleId,
            salesById,
          ),
          fiscalSettings: input.fiscalSettings,
          items: fiscalOperationItems(order.items, order.saleId, salesById),
          products: input.products,
          sale: salesById.get(order.saleId ?? ''),
        }),
        shippingOrder: order,
        document: findFiscalDocument(
          input.fiscalDocuments,
          'SHIPPING_ORDER',
          order.id,
        ),
      }))
  },
  (input) => {
    const salesById = fiscalSalesById(input.sales)

    return input.pickupReservations
      .filter(
        (reservation) =>
          reservation.status === 'COMPLETED' &&
          salesById.get(reservation.saleId ?? '')?.status === 'COMPLETED',
      )
      .map((reservation) => ({
        sourceType: 'PICKUP_RESERVATION',
        sourceId: reservation.id,
        sourceNumber:
          salesById.get(reservation.saleId ?? '')?.saleNumber ?? null,
        sourceLabel: 'Retirada',
        pendingLabel: 'Pendente',
        clientId: reservation.clientId,
        clientName: reservation.clientName,
        createdAt: reservation.completedAt ?? reservation.createdAt,
        totalAmount: reservation.totalAmount,
        operatorName:
          reservation.completedByUserName ?? reservation.createdByUserName,
        productIds: reservation.items.map((item) => item.productId),
        readinessIssues: sourceFiscalReadinessIssues({
          client: fiscalOperationClient(
            findClient(input.clients, reservation.clientId),
            reservation.saleId,
            salesById,
          ),
          fiscalSettings: input.fiscalSettings,
          items: fiscalOperationItems(
            reservation.items,
            reservation.saleId,
            salesById,
          ),
          products: input.products,
          sale: salesById.get(reservation.saleId ?? ''),
        }),
        pickupReservation: reservation,
        document: findFiscalDocument(
          input.fiscalDocuments,
          'PICKUP_RESERVATION',
          reservation.id,
        ),
      }))
  },
]

function sourceFiscalReadinessIssues({
  client,
  fiscalSettings,
  items,
  products,
  sale,
}: {
  client?: FiscalReadinessClient
  fiscalSettings: FiscalSettings | null
  items: FiscalReadinessItem[]
  products: Product[]
  sale?: Sale
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
    ...fiscalBillingReadinessIssues(sale),
    ...(readinessByProvider[fiscalSettings?.provider ?? ''] ?? []),
  ]
}

function fiscalBillingReadinessIssues(sale?: Sale) {
  const firstBillingDueDate = sale ? saleFirstBillingDueDate(sale) : null

  if (!sale || !hasBillingPayment(sale) || !firstBillingDueDate) {
    return []
  }

  if (firstBillingDueDate > fiscalToday()) {
    return []
  }

  return [
    'Vencimento do boleto/fatura deve ser posterior a data de emissao da NF-e.',
  ]
}

function hasBillingPayment(sale: Sale) {
  const payments = sale.payments.length
    ? sale.payments
    : [{ paymentMethodCode: sale.paymentMethodCode }]

  return payments.some(
    (payment) => paymentFiscalCode(payment.paymentMethodCode) === '15',
  )
}

function saleFirstBillingDueDate(sale: Sale) {
  return (
    sale.paymentInstallments
      .map((installment) => fiscalDateOnly(installment.dueDate))
      .filter((date): date is string => Boolean(date))
      .sort()[0] ??
    fiscalDateOnly(sale.billingDueDate) ??
    fiscalDateOnly(sale.billingIssueDate)
  )
}

function paymentFiscalCode(paymentMethodCode: string) {
  const paymentCodes: Record<string, string> = {
    BOLETO: '15',
    CREDIT: '03',
    DEBIT: '04',
    PIX: '20',
  }

  return paymentCodes[paymentMethodCode] ?? '99'
}

function fiscalDateOnly(value?: string | null) {
  return value?.slice(0, 10) || null
}

function fiscalToday(date = new Date()) {
  const brazilOffsetHours = 3

  return new Date(date.getTime() - brazilOffsetHours * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
}

function fiscalSalesById(sales: Sale[]) {
  return new Map(sales.map((sale) => [sale.id, sale]))
}

function fiscalOperationItems(
  items: FiscalReadinessItem[],
  saleId: string | null,
  salesById: Map<string, Sale>,
) {
  return saleId ? (salesById.get(saleId)?.items ?? items) : items
}

function fiscalOperationClient(
  client: FiscalReadinessClient | undefined,
  saleId: string | null,
  salesById: Map<string, Sale>,
) {
  return saleId ? (saleFiscalClient(salesById.get(saleId)) ?? client) : client
}

function saleFiscalClient(sale?: Sale): FiscalReadinessClient | undefined {
  if (!sale?.clientId) {
    return undefined
  }

  return {
    name: sale.clientName,
    personType: sale.clientPersonType,
    document: sale.clientDocument,
    stateRegistration: sale.clientStateRegistration,
    stateRegistrationIndicator: sale.clientStateRegistrationIndicator,
    addressStreet: sale.clientAddressStreet,
    addressNumber: sale.clientAddressNumber,
    addressDistrict: sale.clientAddressDistrict,
    addressCity: sale.clientAddressCity,
    addressState: sale.clientAddressState,
    addressZipCode: sale.clientAddressZipCode,
  }
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
    settings?.provider === 'FOCUS' && !settings.defaultNatureOperation
      ? 'Natureza da operacao padrao pendente na configuracao fiscal.'
      : null,
    settings?.provider === 'FOCUS' && !settings.defaultSaleCfop
      ? 'CFOP padrao de venda pendente na configuracao fiscal.'
      : null,
    settings?.provider === 'FOCUS' && !settings.defaultIcmsCst
      ? 'CST/CSOSN ICMS padrao pendente na configuracao fiscal.'
      : null,
    settings?.provider === 'FOCUS' && !settings.defaultPisCst
      ? 'CST PIS padrao pendente na configuracao fiscal.'
      : null,
    settings?.provider === 'FOCUS' && !settings.defaultCofinsCst
      ? 'CST COFINS padrao pendente na configuracao fiscal.'
      : null,
    settings?.provider === 'FOCUS' &&
    Boolean(settings.defaultSaleCfop) &&
    !validCfop(settings.defaultSaleCfop)
      ? 'CFOP padrao de venda deve conter 4 digitos na configuracao fiscal.'
      : null,
    settings?.provider === 'FOCUS' &&
    Boolean(settings.defaultIcmsCst) &&
    !validIcmsCst(settings.defaultIcmsCst)
      ? 'CST/CSOSN ICMS padrao deve conter 2 ou 3 digitos na configuracao fiscal.'
      : null,
    settings?.provider === 'FOCUS' &&
    Boolean(settings.defaultPisCst) &&
    !validTaxCst(settings.defaultPisCst)
      ? 'CST PIS padrao deve conter 2 digitos na configuracao fiscal.'
      : null,
    settings?.provider === 'FOCUS' &&
    Boolean(settings.defaultCofinsCst) &&
    !validTaxCst(settings.defaultCofinsCst)
      ? 'CST COFINS padrao deve conter 2 digitos na configuracao fiscal.'
      : null,
  ]

  return issues.filter((issue): issue is string => Boolean(issue))
}

function validFiscalCompanyCnpj(settings: FiscalSettings) {
  return fiscalDigits(settings.companyCnpj).length === 14
}

function validCfop(value?: string | null) {
  return /^\d{4}$/.test(fiscalDigits(value))
}

function validIcmsCst(value?: string | null) {
  return /^\d{2,3}$/.test(fiscalDigits(value))
}

function validTaxCst(value?: string | null) {
  return /^\d{2}$/.test(fiscalDigits(value))
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
