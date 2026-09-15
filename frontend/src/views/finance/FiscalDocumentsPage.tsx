import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { ChevronDown, FileText, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type {
  Client,
  ClientCompanyLookup,
  CommercialSettings,
  FiscalDocument,
  FiscalSettings,
  ManualFiscalDocumentDraft,
  ManualFiscalDocumentInput,
  PaymentMethod,
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
import { ProductSearchField } from '../../components/ProductSearchField'
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
  initialRequestSearch = '',
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
  onEditSaleFiscalDocument,
  onResolveFiscalPendency,
}: {
  clients: Client[]
  fiscalDocuments: FiscalDocument[]
  fiscalSettings: FiscalSettings | null
  initialRequestSearch?: string
  pickupReservations: PickupReservation[]
  products: Product[]
  sales: Sale[]
  shippingOrders: ShippingOrder[]
  onIssuePickupReservationFiscalDocument: (
    reservation: PickupReservation,
    additionalInformation?: string,
  ) => void
  onIssueSaleFiscalDocument: (
    sale: Sale,
    additionalInformation?: string,
  ) => void
  onIssueShippingOrderFiscalDocument: (
    order: ShippingOrder,
    additionalInformation?: string,
  ) => void
  onPreviewPickupReservationFiscalDocument: (
    reservation: PickupReservation,
    additionalInformation?: string,
  ) => void
  onPreviewSaleFiscalDocument: (
    sale: Sale,
    additionalInformation?: string,
  ) => void
  onPreviewShippingOrderFiscalDocument: (
    order: ShippingOrder,
    additionalInformation?: string,
  ) => void
  onEditSaleFiscalDocument: (sale: Sale) => void
  onResolveFiscalPendency: (target: FiscalPendencyTarget) => void
}) {
  const [requestSearch, setRequestSearch] = useState('')
  const [requestReadinessFilter, setRequestReadinessFilter] =
    useState<FiscalRequestReadinessFilter>('ALL')

  useEffect(() => {
    setRequestSearch(initialRequestSearch)
  }, [initialRequestSearch])

  const fiscalRequests = buildFiscalRequests({
    clients,
    fiscalDocuments,
    fiscalSettings,
    pickupReservations,
    products,
    sales,
    shippingOrders,
  })
  const filteredFiscalRequests = useMemo(
    () =>
      filterFiscalRequests(fiscalRequests, {
        readiness: requestReadinessFilter,
        search: requestSearch,
      }),
    [fiscalRequests, requestReadinessFilter, requestSearch],
  )
  const { pagination: requestPagination, visibleItems: visibleFiscalRequests } =
    usePaginatedRows<FiscalRequest>(
      filteredFiscalRequests,
      [requestReadinessFilter, requestSearch].join('|'),
    )

  return (
    <section className='grid min-w-0 gap-4'>
      <PagePanel className='min-w-0'>
        <PageHeader
          description={`${filteredFiscalRequests.length} de ${fiscalRequests.length} registro(s) na fila.`}
          icon={<FileText size={18} />}
          title='Fila de emissão'
        />
        <div className='mb-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_220px]'>
          <TextField
            label='Pesquisar na fila'
            placeholder='Cliente, nº da venda, origem, operador...'
            size='medium'
            value={requestSearch}
            onChange={(event) => setRequestSearch(event.target.value)}
          />
          <TextField
            label='Prontidão'
            select
            size='medium'
            value={requestReadinessFilter}
            onChange={(event) =>
              setRequestReadinessFilter(
                event.target.value as FiscalRequestReadinessFilter,
              )
            }>
            {fiscalRequestReadinessFilterOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </div>
        <ResponsiveTable
          columns={[
            {
              header: 'Nº da venda',
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
              header: 'Data/hora',
              render: (request) => formatDateTime(request.createdAt),
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
                    onEditSaleFiscalDocument={onEditSaleFiscalDocument}
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
    </section>
  )
}

export function IssuedFiscalDocumentsPage({
  clients,
  fiscalDocuments,
  pickupReservations,
  sales,
  shippingOrders,
  onCancelFiscalDocument,
  onOpenFiscalDocumentSource,
  onSyncFiscalDocument,
}: {
  clients: Client[]
  fiscalDocuments: FiscalDocument[]
  pickupReservations: PickupReservation[]
  sales: Sale[]
  shippingOrders: ShippingOrder[]
  onCancelFiscalDocument: (
    event: FormEvent<HTMLFormElement>,
    fiscalDocument: FiscalDocument,
  ) => void
  onOpenFiscalDocumentSource: (fiscalDocument: FiscalDocument) => void
  onSyncFiscalDocument: (fiscalDocument: FiscalDocument) => void
}) {
  const [documentSearch, setDocumentSearch] = useState('')
  const [documentStatusFilter, setDocumentStatusFilter] =
    useState<FiscalDocumentStatusFilter>('ALL')
  const fiscalDocumentSourceNumbers = buildFiscalDocumentSourceNumbers({
    pickupReservations,
    sales,
    shippingOrders,
  })
  const fiscalDocumentClients = buildFiscalDocumentClients({
    clients,
    fiscalDocuments,
    pickupReservations,
    sales,
    shippingOrders,
  })
  const filteredFiscalDocuments = useMemo(
    () =>
      filterFiscalDocuments(fiscalDocuments, fiscalDocumentSourceNumbers, {
        clients: fiscalDocumentClients,
        search: documentSearch,
        status: documentStatusFilter,
      }),
    [
      fiscalDocumentClients,
      documentSearch,
      documentStatusFilter,
      fiscalDocumentSourceNumbers,
      fiscalDocuments,
    ],
  )
  const {
    pagination: documentPagination,
    visibleItems: visibleFiscalDocuments,
  } = usePaginatedRows<FiscalDocument>(
    filteredFiscalDocuments,
    [documentSearch, documentStatusFilter].join('|'),
  )

  return (
    <section className='grid min-w-0 gap-4'>
      <PagePanel className='min-w-0'>
        <PageHeader
          description={`${filteredFiscalDocuments.length} de ${fiscalDocuments.length} documento(s) encontrado(s).`}
          icon={<FileText size={18} />}
          title='Notas emitidas'
        />
        <div className='mb-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_200px]'>
          <TextField
            label='Pesquisar NF-e'
            placeholder='Nº, chave, referência, venda, operador...'
            size='medium'
            value={documentSearch}
            onChange={(event) => setDocumentSearch(event.target.value)}
          />
          <TextField
            label='Status'
            select
            size='medium'
            value={documentStatusFilter}
            onChange={(event) =>
              setDocumentStatusFilter(
                event.target.value as FiscalDocumentStatusFilter,
              )
            }>
            {fiscalDocumentStatusFilterOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </div>
        <ResponsiveTable
          columns={[
            {
              header: 'Nº da NF-e',
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
              header: 'Nº da venda',
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
              header: 'Cliente',
              render: (document) => (
                <FiscalDocumentClient
                  client={fiscalDocumentClients.get(
                    `${document.sourceType}-${document.sourceId}`,
                  )}
                />
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
                  onOpenFiscalDocumentSource={onOpenFiscalDocumentSource}
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

type ManualFiscalItemForm = {
  productId: string
  productInternalCode: string
  productName: string
  productNcm: string
  productCfop: string
  productIcmsCst: string
  productPisCst: string
  productCofinsCst: string
  productOrigin: string
  productUnit: string
  quantity: string
  unitPrice: string
  discountAmount: string
}

type ManualFiscalOperationOption = {
  codes: string
  label: string
  value: string
}

type ManualFiscalPaymentForm = {
  paymentMethodCode: string
  paymentMethodName: string
  amount: string
}

type ManualFiscalPaymentInstallmentForm = {
  dueDate: string
  amount: string
}

export function ManualFiscalDocumentPage({
  clients,
  commercialSettings,
  manualFiscalDocumentDrafts,
  paymentMethods,
  products,
  sourceDraft,
  sourceFiscalDocument,
  sourceSale,
  onDeleteManualFiscalDocumentDraft,
  onIssueManualFiscalDocument,
  onIssueSaleFiscalDocumentInput,
  onLookupCompany,
  onOpenManualFiscalDocumentDraft,
  onPreviewManualFiscalDocument,
  onPreviewSaleFiscalDocumentInput,
  onSaveManualFiscalDocumentDraft,
}: {
  clients: Client[]
  commercialSettings: CommercialSettings | null
  manualFiscalDocumentDrafts: ManualFiscalDocumentDraft[]
  paymentMethods: PaymentMethod[]
  products: Product[]
  sourceDraft?: ManualFiscalDocumentDraft
  sourceFiscalDocument?: FiscalDocument
  sourceSale?: Sale
  onDeleteManualFiscalDocumentDraft: (draft: ManualFiscalDocumentDraft) => void
  onIssueManualFiscalDocument: (input: ManualFiscalDocumentInput) => void
  onIssueSaleFiscalDocumentInput?: (
    sale: Sale,
    input: ManualFiscalDocumentInput,
  ) => void
  onLookupCompany: (cnpj: string) => Promise<ClientCompanyLookup>
  onOpenManualFiscalDocumentDraft: (draft: ManualFiscalDocumentDraft) => void
  onPreviewManualFiscalDocument: (input: ManualFiscalDocumentInput) => void
  onPreviewSaleFiscalDocumentInput?: (
    sale: Sale,
    input: ManualFiscalDocumentInput,
  ) => void
  onSaveManualFiscalDocumentDraft: (
    input: ManualFiscalDocumentInput,
    draft?: ManualFiscalDocumentDraft,
  ) => void
}) {
  const sourceValues = sourceSale
    ? manualFiscalDocumentSaleFormValues(sourceSale)
    : sourceDraft
    ? manualFiscalDocumentDraftFormValues(sourceDraft.payload)
    : manualFiscalDocumentFormValues(sourceFiscalDocument)
  const [items, setItems] = useState<ManualFiscalItemForm[]>([
    ...sourceValues.items,
  ])
  const [manualTotalAmount, setManualTotalAmount] = useState(
    sourceValues.totalAmount,
  )
  const [manualTotalEdited, setManualTotalEdited] = useState(false)
  const [manualBillingEnabled, setManualBillingEnabled] = useState(
    sourceValues.billingEnabled,
  )
  const [manualBillingIssueDate, setManualBillingIssueDate] = useState(
    sourceValues.billingIssueDate || todayInputDate(),
  )
  const [manualBillingDueDate, setManualBillingDueDate] = useState(
    sourceValues.billingDueDate ||
      manualFiscalDueDate(
        sourceValues.billingIssueDate || todayInputDate(),
        commercialSettings,
      ),
  )
  const [manualBillingDueDateTouched, setManualBillingDueDateTouched] =
    useState(Boolean(sourceValues.billingDueDate))
  const [manualPayments, setManualPayments] = useState<
    ManualFiscalPaymentForm[]
  >([...sourceValues.payments])
  const [manualPaymentInstallments, setManualPaymentInstallments] = useState<
    ManualFiscalPaymentInstallmentForm[]
  >([...sourceValues.paymentInstallments])
  const [selectedNatureOperation, setSelectedNatureOperation] =
    useState<ManualFiscalOperationOption | null>(
      manualFiscalOperationOptionFromValue(sourceValues.natureOperation),
    )
  const [natureOperation, setNatureOperation] = useState(
    sourceValues.natureOperation,
  )
  const [clientPersonType, setClientPersonType] = useState<
    ManualFiscalDocumentInput['client']['personType']
  >(sourceValues.clientPersonType)
  const [
    clientStateRegistrationIndicator,
    setClientStateRegistrationIndicator,
  ] = useState<
    NonNullable<
      ManualFiscalDocumentInput['client']['stateRegistrationIndicator']
    >
  >(sourceValues.clientStateRegistrationIndicator)
  const [lookupState, setLookupState] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
  const [lookupValues, setLookupValues] = useState<
    Record<string, string | null>
  >(sourceValues.clientValues)
  const activeClients = clients.filter((client) => client.active)
  const activePaymentMethods = paymentMethods.filter(
    (method) => method.active && method.code !== 'TO_AGREE',
  )
  const manualPaymentsTotal = manualFiscalPaymentsTotal(
    manualPayments,
    Number(manualTotalAmount || 0),
  )
  const manualBillablePaymentsTotal = manualFiscalBillablePaymentsTotal(
    manualPayments,
    activePaymentMethods,
    Number(manualTotalAmount || 0),
  )
  const manualInstallmentsTotal = manualFiscalInstallmentsTotal(
    manualPaymentInstallments,
  )
  const manualPaymentDifference = Number(
    (manualPaymentsTotal - Number(manualTotalAmount || 0)).toFixed(2),
  )
  const manualInstallmentDifference = Number(
    (manualInstallmentsTotal - manualBillablePaymentsTotal).toFixed(2),
  )
  const manualAllowsBilling = manualFiscalPaymentsAllowBilling(
    manualPayments,
    activePaymentMethods,
  )
  const selectedRegisteredClient =
    activeClients.find(
      (client) =>
        client.document &&
        onlyDigits(client.document) ===
          onlyDigits(clientFieldValue('manualFiscalClientDocument')),
    ) ?? null

  useEffect(() => {
    if (manualAllowsBilling) {
      if (manualBillingEnabled && manualPaymentInstallments.length === 0) {
        setManualPaymentInstallments([
          defaultManualFiscalInstallment(
            manualBillingDueDate,
            manualBillablePaymentsTotal,
          ),
        ])
      }
      return
    }

    setManualBillingEnabled(false)
    setManualPaymentInstallments([])
  }, [
    manualAllowsBilling,
    manualBillingDueDate,
    manualBillingEnabled,
    manualBillablePaymentsTotal,
    manualPaymentInstallments.length,
  ])

  useEffect(() => {
    if (manualBillingDueDateTouched) {
      return
    }

    setManualBillingDueDate(
      manualFiscalDueDate(manualBillingIssueDate, commercialSettings),
    )
  }, [
    commercialSettings?.defaultQuoteDueDays,
    manualBillingDueDateTouched,
    manualBillingIssueDate,
  ])

  useEffect(() => {
    if (!manualBillingEnabled || manualPaymentInstallments.length === 0) {
      return
    }

    setManualPaymentInstallments((currentInstallments) =>
      currentInstallments.map((installment, index) => {
        if (index > 0 || installment.dueDate || installment.amount) {
          return installment
        }

        return defaultManualFiscalInstallment(
          manualBillingDueDate,
          manualBillablePaymentsTotal,
        )
      }),
    )
  }, [
    manualBillingDueDate,
    manualBillingEnabled,
    manualBillablePaymentsTotal,
    manualPaymentInstallments.length,
  ])

  function updateItem(index: number, input: Partial<ManualFiscalItemForm>) {
    setItems((currentItems) =>
      syncManualFiscalTotalAmount(
        currentItems.map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...input } : item,
        ),
      ),
    )
  }

  function syncManualFiscalTotalAmount(nextItems: ManualFiscalItemForm[]) {
    setManualTotalAmount(manualFiscalItemsTotal(nextItems).toFixed(2))
    return nextItems
  }

  function selectProduct(index: number, product: Product | null) {
    updateItem(index, {
      productId: product?.id ?? '',
      productInternalCode: product?.internalCode ?? '',
      productName: product?.name ?? '',
      productNcm: product?.ncm ?? '',
      productCfop: product?.cfop ?? '',
      productIcmsCst: product?.icmsCst ?? '',
      productPisCst: product?.pisCst ?? '',
      productCofinsCst: product?.cofinsCst ?? '',
      productOrigin: product?.origin ?? '0',
      productUnit: product?.unit ?? 'UN',
      unitPrice: product?.salePrice ?? '',
    })
  }

  async function lookupCompany() {
    const document = clientFieldValue('manualFiscalClientDocument').trim()

    if (!document) {
      setLookupState('error')
      return
    }

    setLookupState('loading')

    try {
      const company = await onLookupCompany(document)

      setLookupValues(manualFiscalClientLookupValues(company))
      setClientPersonType('PJ')
      setClientStateRegistrationIndicator(company.stateRegistrationIndicator)
      setLookupState('success')
    } catch {
      setLookupState('error')
    }
  }

  function clientFieldValue(name: string) {
    return lookupValues[name] ?? ''
  }

  function updateClientField(name: string, value: string) {
    setLookupValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  function selectRegisteredClient(client: Client | null) {
    if (!client) {
      setLookupValues({})
      setClientPersonType('PJ')
      setClientStateRegistrationIndicator('9')
      setLookupState('idle')
      return
    }

    setLookupValues(manualFiscalRegisteredClientValues(client))
    setClientPersonType(client.personType)
    setClientStateRegistrationIndicator(
      client.stateRegistrationIndicator ?? '9',
    )
    setLookupState('success')
  }

  function updateManualPayment(
    index: number,
    changes: Partial<ManualFiscalPaymentForm>,
  ) {
    setManualPayments((currentPayments) =>
      currentPayments.map((payment, paymentIndex) =>
        paymentIndex === index ? { ...payment, ...changes } : payment,
      ),
    )
  }

  function selectManualPaymentMethod(index: number, methodCode: string) {
    const method = activePaymentMethods.find(
      (paymentMethod) => paymentMethod.code === methodCode,
    )

    updateManualPayment(index, {
      paymentMethodCode: method?.code ?? '',
      paymentMethodName: method?.name ?? '',
    })
  }

  function updateManualInstallment(
    index: number,
    changes: Partial<ManualFiscalPaymentInstallmentForm>,
  ) {
    setManualPaymentInstallments((currentInstallments) =>
      currentInstallments.map((installment, installmentIndex) =>
        installmentIndex === index
          ? { ...installment, ...changes }
          : installment,
      ),
    )
  }

  function submitManualFiscalDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const submitter =
      event.nativeEvent instanceof SubmitEvent
        ? event.nativeEvent.submitter
        : null
    const action =
      submitter instanceof HTMLButtonElement ? submitter.value : 'preview'
    const input = manualFiscalDocumentInput(
      form,
      items,
      manualPayments,
      manualPaymentInstallments,
      activePaymentMethods,
      Number(manualTotalAmount || 0),
    )

    if (action === 'draft') {
      if (sourceSale) {
        return
      }

      onSaveManualFiscalDocumentDraft(input, sourceDraft)
      return
    }

    if (action === 'issue') {
      if (sourceSale && onIssueSaleFiscalDocumentInput) {
        onIssueSaleFiscalDocumentInput(sourceSale, input)
        return
      }

      onIssueManualFiscalDocument(input)
      return
    }

    if (sourceSale && onPreviewSaleFiscalDocumentInput) {
      onPreviewSaleFiscalDocumentInput(sourceSale, input)
      return
    }

    onPreviewManualFiscalDocument(input)
  }

  return (
    <section className='grid min-w-0 gap-4'>
      <PagePanel className='min-w-0'>
        <PageHeader
          description={
            sourceSale
              ? 'Revise e ajuste os dados fiscais antes de emitir pela venda.'
              : 'Preenchimento manual sem venda vinculada.'
          }
          icon={<FileText size={18} />}
          title={
            sourceSale
              ? `Editar NF-e da venda Nº ${sourceSale.saleNumber}`
              : 'NF-e avulsa / devolução'
          }
        />
        {!sourceSale ? (
        <div className='grid gap-3 pb-4'>
          <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]'>
            <Autocomplete
              getOptionLabel={(draft) =>
                `${draft.title} - ${formatDateTime(draft.updatedAt)}`
              }
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText='Nenhum rascunho salvo'
              options={manualFiscalDocumentDrafts}
              value={sourceDraft ?? null}
              onChange={(_event, draft) => {
                if (draft) {
                  onOpenManualFiscalDocumentDraft(draft)
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label='Carregar rascunho'
                  size='medium'
                />
              )}
            />
            {sourceDraft ? (
              <Button
                color='error'
                type='button'
                variant='outlined'
                onClick={() => onDeleteManualFiscalDocumentDraft(sourceDraft)}>
                Excluir rascunho
              </Button>
            ) : null}
          </div>
        </div>
        ) : null}
        <form className='grid gap-4' onSubmit={submitManualFiscalDocument}>
          <div className='grid gap-3 md:grid-cols-4'>
            <TextField
              defaultValue={sourceValues.purpose}
              label='Finalidade'
              name='manualFiscalPurpose'
              select
              required>
              <MenuItem value='NORMAL'>NF-e normal</MenuItem>
              <MenuItem value='COMPLEMENTARY'>NF-e complementar</MenuItem>
              <MenuItem value='ADJUSTMENT'>NF-e de ajuste</MenuItem>
              <MenuItem value='RETURN'>Devolução de mercadoria</MenuItem>
              <MenuItem value='CREDIT_NOTE'>Nota de crédito</MenuItem>
              <MenuItem value='DEBIT_NOTE'>Nota de débito</MenuItem>
            </TextField>
            <TextField
              defaultValue={sourceValues.operationType}
              label='Tipo da nota'
              name='manualFiscalOperationType'
              select
              required>
              <MenuItem value='ENTRY'>Entrada</MenuItem>
              <MenuItem value='EXIT'>Saída</MenuItem>
            </TextField>
            <TextField
              defaultValue={sourceValues.destinationOperation}
              label='Destino da operação'
              name='manualFiscalDestinationOperation'
              select
              required>
              <MenuItem value='INTERNAL'>Operação interna</MenuItem>
              <MenuItem value='INTERSTATE'>Operação interestadual</MenuItem>
              <MenuItem value='EXTERIOR'>Operação com exterior</MenuItem>
            </TextField>
            <Autocomplete
              getOptionLabel={(option) => `${option.codes} - ${option.label}`}
              isOptionEqualToValue={(option, value) =>
                option.value === value.value
              }
              noOptionsText='Nenhuma operação encontrada'
              options={manualFiscalOperationOptions}
              value={selectedNatureOperation}
              onChange={(_event, option) => {
                setSelectedNatureOperation(option)
                setNatureOperation(option?.value ?? '')
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label='Natureza da operação'
                  required
                  size='medium'
                />
              )}
            />
          </div>
          <input
            name='manualFiscalNatureOperation'
            type='hidden'
            value={natureOperation}
          />
          <TextField
            helperText='Obrigatória para devolução.'
            label='Chave da NF-e referenciada'
            name='manualFiscalReferencedAccessKey'
            defaultValue={sourceValues.referencedAccessKey}
          />
          <div className='grid gap-3 md:grid-cols-3'>
            <TextField
              defaultValue={sourceValues.transportedVolumesQuantity}
              label='Quantidade de volumes'
              name='manualFiscalTransportedVolumesQuantity'
              required
              type='number'
              slotProps={{ htmlInput: { min: '1', step: '1' } }}
            />
            <TextField
              defaultValue={sourceValues.transportedVolumesGrossWeight}
              label='Peso bruto (kg)'
              name='manualFiscalTransportedVolumesGrossWeight'
              type='number'
              slotProps={{ htmlInput: { min: '0.001', step: '0.001' } }}
            />
          </div>

          <div className='grid gap-3 border-t border-[#e4e9e5] pt-4'>
            <strong className='text-[#2c281e]'>Destinatário / remetente</strong>
            <Autocomplete
              getOptionLabel={(client) =>
                `${client.name}${client.document ? ` - ${client.document}` : ''}`
              }
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText='Nenhum cliente encontrado'
              options={activeClients}
              value={selectedRegisteredClient}
              onChange={(_event, client) => selectRegisteredClient(client)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label='Carregar cliente cadastrado'
                  size='medium'
                />
              )}
            />
            <div className='grid gap-3 md:grid-cols-3'>
              <TextField
                label='Tipo'
                name='manualFiscalClientPersonType'
                select
                value={clientPersonType}
                onChange={(event) =>
                  setClientPersonType(
                    manualFiscalClientPersonTypeValue(event.target.value),
                  )
                }
                required>
                <MenuItem value='PF'>Pessoa física</MenuItem>
                <MenuItem value='PJ'>Pessoa jurídica</MenuItem>
                <MenuItem value='ES'>Estrangeiro</MenuItem>
              </TextField>
              <TextField
                label='Nome'
                name='manualFiscalClientName'
                value={clientFieldValue('manualFiscalClientName')}
                onChange={(event) =>
                  updateClientField(
                    'manualFiscalClientName',
                    event.target.value,
                  )
                }
                required
              />
              <div className='grid gap-2'>
                <TextField
                  label='CPF/CNPJ'
                  name='manualFiscalClientDocument'
                  value={clientFieldValue('manualFiscalClientDocument')}
                  onChange={(event) =>
                    updateClientField(
                      'manualFiscalClientDocument',
                      event.target.value,
                    )
                  }
                />
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <span className='text-sm text-[#5f665f]'>
                    {manualFiscalLookupStatusLabel[lookupState]}
                  </span>
                  <Button
                    disabled={lookupState === 'loading'}
                    type='button'
                    variant='outlined'
                    onClick={() => void lookupCompany()}>
                    Buscar CNPJ
                  </Button>
                </div>
              </div>
              <TextField
                label='Inscrição estadual'
                name='manualFiscalClientStateRegistration'
                value={clientFieldValue('manualFiscalClientStateRegistration')}
                onChange={(event) =>
                  updateClientField(
                    'manualFiscalClientStateRegistration',
                    event.target.value,
                  )
                }
              />
              <TextField
                label='Indicador IE'
                name='manualFiscalClientStateRegistrationIndicator'
                select
                value={clientStateRegistrationIndicator}
                onChange={(event) =>
                  setClientStateRegistrationIndicator(
                    manualFiscalClientStateRegistrationIndicatorValue(
                      event.target.value,
                    ),
                  )
                }>
                <MenuItem value='9'>Não contribuinte</MenuItem>
                <MenuItem value='1'>Contribuinte ICMS</MenuItem>
                <MenuItem value='2'>Contribuinte isento</MenuItem>
              </TextField>
              <TextField
                label='Telefone'
                name='manualFiscalClientPhone'
                value={clientFieldValue('manualFiscalClientPhone')}
                onChange={(event) =>
                  updateClientField(
                    'manualFiscalClientPhone',
                    event.target.value,
                  )
                }
              />
              <TextField
                label='Email'
                name='manualFiscalClientEmail'
                type='email'
                value={clientFieldValue('manualFiscalClientEmail')}
                onChange={(event) =>
                  updateClientField(
                    'manualFiscalClientEmail',
                    event.target.value,
                  )
                }
              />
              <TextField
                label='Logradouro'
                name='manualFiscalClientAddressStreet'
                value={clientFieldValue('manualFiscalClientAddressStreet')}
                onChange={(event) =>
                  updateClientField(
                    'manualFiscalClientAddressStreet',
                    event.target.value,
                  )
                }
                required
              />
              <TextField
                label='Número'
                name='manualFiscalClientAddressNumber'
                value={clientFieldValue('manualFiscalClientAddressNumber')}
                onChange={(event) =>
                  updateClientField(
                    'manualFiscalClientAddressNumber',
                    event.target.value,
                  )
                }
                required
              />
              <TextField
                label='Complemento'
                name='manualFiscalClientAddressComplement'
                value={clientFieldValue('manualFiscalClientAddressComplement')}
                onChange={(event) =>
                  updateClientField(
                    'manualFiscalClientAddressComplement',
                    event.target.value,
                  )
                }
              />
              <TextField
                label='Bairro'
                name='manualFiscalClientAddressDistrict'
                value={clientFieldValue('manualFiscalClientAddressDistrict')}
                onChange={(event) =>
                  updateClientField(
                    'manualFiscalClientAddressDistrict',
                    event.target.value,
                  )
                }
                required
              />
              <TextField
                label='Cidade'
                name='manualFiscalClientAddressCity'
                value={clientFieldValue('manualFiscalClientAddressCity')}
                onChange={(event) =>
                  updateClientField(
                    'manualFiscalClientAddressCity',
                    event.target.value,
                  )
                }
                required
              />
              <TextField
                label='UF'
                name='manualFiscalClientAddressState'
                value={clientFieldValue('manualFiscalClientAddressState')}
                onChange={(event) =>
                  updateClientField(
                    'manualFiscalClientAddressState',
                    event.target.value,
                  )
                }
                required
              />
              <TextField
                label='CEP'
                name='manualFiscalClientAddressZipCode'
                value={clientFieldValue('manualFiscalClientAddressZipCode')}
                onChange={(event) =>
                  updateClientField(
                    'manualFiscalClientAddressZipCode',
                    event.target.value,
                  )
                }
                required
              />
            </div>
          </div>

          <div className='grid gap-3 border-t border-[#e4e9e5] pt-4'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <strong className='text-[#2c281e]'>Itens</strong>
              <Button
                startIcon={<Plus size={16} />}
                type='button'
                variant='outlined'
                onClick={() =>
                  setItems((currentItems) =>
                    syncManualFiscalTotalAmount([
                      ...currentItems,
                      emptyManualFiscalItem(),
                    ]),
                  )
                }>
                Adicionar item
              </Button>
            </div>
            {items.map((item, index) => (
              <div
                className='grid gap-3 rounded-lg border border-[#e4e9e5] bg-[#fbfcfb] p-3'
                key={index}>
                <div className='flex justify-between gap-2'>
                  <strong>Item {index + 1}</strong>
                  <Button
                    disabled={items.length === 1}
                    startIcon={<Trash2 size={15} />}
                    type='button'
                    variant='text'
                    onClick={() =>
                      setItems((currentItems) =>
                        syncManualFiscalTotalAmount(
                          currentItems.filter(
                            (_currentItem, itemIndex) => itemIndex !== index,
                          ),
                        ),
                      )
                    }>
                    Remover
                  </Button>
                </div>
                <div className='grid gap-3 md:grid-cols-3'>
                  <ProductSearchField
                    label='Produto cadastrado'
                    name={`manualFiscalProductId-${index}`}
                    products={products}
                    value={item.productId}
                    onSelect={(product) => selectProduct(index, product)}
                    stockLabel='current'
                  />
                  <TextField
                    label='Descrição'
                    required
                    value={item.productName}
                    onChange={(event) =>
                      updateItem(index, { productName: event.target.value })
                    }
                  />
                  <TextField
                    label='Código'
                    value={item.productInternalCode}
                    onChange={(event) =>
                      updateItem(index, {
                        productInternalCode: event.target.value,
                      })
                    }
                  />
                  <TextField
                    label='NCM'
                    value={item.productNcm}
                    onChange={(event) =>
                      updateItem(index, { productNcm: event.target.value })
                    }
                  />
                  <TextField
                    label='Origem'
                    value={item.productOrigin}
                    onChange={(event) =>
                      updateItem(index, { productOrigin: event.target.value })
                    }
                  />
                  <TextField
                    label='CST ICMS'
                    value={item.productIcmsCst}
                    onChange={(event) =>
                      updateItem(index, { productIcmsCst: event.target.value })
                    }
                  />
                  <TextField
                    label='CST PIS'
                    value={item.productPisCst}
                    onChange={(event) =>
                      updateItem(index, { productPisCst: event.target.value })
                    }
                  />
                  <TextField
                    label='CST COFINS'
                    value={item.productCofinsCst}
                    onChange={(event) =>
                      updateItem(index, {
                        productCofinsCst: event.target.value,
                      })
                    }
                  />
                  <TextField
                    label='Unidade'
                    value={item.productUnit}
                    onChange={(event) =>
                      updateItem(index, { productUnit: event.target.value })
                    }
                  />
                  <TextField
                    label='Quantidade'
                    required
                    type='number'
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(index, { quantity: event.target.value })
                    }
                    slotProps={{ htmlInput: { min: '0.001', step: '0.001' } }}
                  />
                  <TextField
                    label='Valor unitário'
                    required
                    type='number'
                    value={item.unitPrice}
                    onChange={(event) =>
                      updateItem(index, { unitPrice: event.target.value })
                    }
                    slotProps={{ htmlInput: { min: '0', step: '0.01' } }}
                  />
                  <TextField
                    label='Desconto'
                    type='number'
                    value={item.discountAmount}
                    onChange={(event) =>
                      updateItem(index, { discountAmount: event.target.value })
                    }
                    slotProps={{ htmlInput: { min: '0', step: '0.01' } }}
                  />
                </div>
              </div>
            ))}
          </div>

          <TextField
            label='Valor total da nota'
            name='manualFiscalTotalAmount'
            type='number'
            value={manualTotalAmount}
            onChange={(event) => {
              const value = event.target.value

              setManualTotalEdited(true)
              setItems((currentItems) =>
                syncManualFiscalTotalAmount(
                  applyManualFiscalTotalAmount(
                    currentItems,
                    Number(value || 0),
                  ),
                ),
              )
            }}
            slotProps={{ htmlInput: { min: '0', step: '0.01' } }}
          />
          {manualTotalEdited ? (
            <Alert severity='warning' variant='outlined'>
              O valor total da nota foi alterado manualmente. Revise os itens,
              valores unitários e descontos antes de pré-visualizar ou emitir,
              pois a NF-e precisa manter o total igual à soma dos itens.
            </Alert>
          ) : null}

          <div className='grid gap-3 border-t border-[#e4e9e5] pt-4'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <strong className='text-[#2c281e]'>
                Pagamento e faturamento
              </strong>
              <Button
                startIcon={<Plus size={16} />}
                type='button'
                variant='outlined'
                onClick={() =>
                  setManualPayments((currentPayments) => [
                    ...currentPayments,
                    emptyManualFiscalPayment(),
                  ])
                }>
                Adicionar forma
              </Button>
            </div>
            {manualPayments.map((payment, index) => (
              <div
                className='grid gap-3 rounded-lg border border-[#e4e9e5] bg-[#fbfcfb] p-3 md:grid-cols-[minmax(0,1fr)_180px_auto]'
                key={index}>
                <TextField
                  label={`Pagamento ${index + 1}`}
                  select
                  value={payment.paymentMethodCode}
                  onChange={(event) =>
                    selectManualPaymentMethod(index, event.target.value)
                  }
                  required>
                  <MenuItem value='' disabled>
                    Pagamento
                  </MenuItem>
                  {activePaymentMethods.map((method) => (
                    <MenuItem key={method.id} value={method.code}>
                      {method.name}
                    </MenuItem>
                  ))}
                  <MenuItem value='NO_PAYMENT'>Sem pagamento</MenuItem>
                </TextField>
                <TextField
                  helperText={
                    manualPayments.length === 1 && index === 0
                      ? 'Vazio usa o total.'
                      : undefined
                  }
                  label='Valor'
                  type='number'
                  value={payment.amount}
                  onChange={(event) =>
                    updateManualPayment(index, { amount: event.target.value })
                  }
                  slotProps={{ htmlInput: { min: '0', step: '0.01' } }}
                />
                <Button
                  disabled={manualPayments.length === 1}
                  startIcon={<Trash2 size={15} />}
                  type='button'
                  variant='text'
                  onClick={() =>
                    setManualPayments((currentPayments) =>
                      currentPayments.filter(
                        (_currentPayment, paymentIndex) =>
                          paymentIndex !== index,
                      ),
                    )
                  }>
                  Remover
                </Button>
              </div>
            ))}
            <Alert
              severity={
                Math.abs(manualPaymentDifference) < 0.01 ? 'success' : 'info'
              }
              variant='outlined'>
              Total dos pagamentos: {formatCurrency(manualPaymentsTotal)}.
              Diferença: {formatCurrency(Math.abs(manualPaymentDifference))}.
            </Alert>
            <FormControlLabel
              control={
                <Checkbox
                  checked={manualBillingEnabled}
                  disabled={!manualAllowsBilling}
                  name='manualFiscalBillingEnabled'
                  onChange={(event) =>
                    setManualBillingEnabled(event.target.checked)
                  }
                />
              }
              label='Adicionar parcelas ao faturamento'
            />
            {manualBillingEnabled ? (
              <div className='grid gap-3'>
                <div className='grid gap-3 md:grid-cols-2'>
                  <TextField
                    label='Data da fatura'
                    name='manualFiscalBillingIssueDate'
                    type='date'
                    value={manualBillingIssueDate}
                    onChange={(event) =>
                      setManualBillingIssueDate(event.target.value)
                    }
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    label='Vencimento padrão'
                    name='manualFiscalBillingDueDate'
                    type='date'
                    value={manualBillingDueDate}
                    onChange={(event) => {
                      setManualBillingDueDateTouched(true)
                      setManualBillingDueDate(event.target.value)
                    }}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </div>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <strong className='text-sm text-[#2c281e]'>Parcelas</strong>
                  <Button
                    startIcon={<Plus size={16} />}
                    type='button'
                    variant='outlined'
                    onClick={() =>
                      setManualPaymentInstallments((currentInstallments) => [
                        ...currentInstallments,
                        defaultManualFiscalInstallment(
                          manualBillingDueDate,
                          manualFiscalRemainingInstallmentAmount(
                            manualBillablePaymentsTotal,
                            currentInstallments,
                          ),
                        ),
                      ])
                    }>
                    Adicionar parcela
                  </Button>
                </div>
                {manualPaymentInstallments.map((installment, index) => (
                  <div
                    className='grid gap-3 rounded-lg border border-[#e4e9e5] bg-[#fbfcfb] p-3 md:grid-cols-[minmax(0,1fr)_180px_auto]'
                    key={index}>
                    <TextField
                      label={`Vencimento ${index + 1}`}
                      required
                      type='date'
                      value={installment.dueDate}
                      onChange={(event) =>
                        updateManualInstallment(index, {
                          dueDate: event.target.value,
                        })
                      }
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField
                      label='Valor'
                      required
                      type='number'
                      value={installment.amount}
                      onChange={(event) =>
                        updateManualInstallment(index, {
                          amount: event.target.value,
                        })
                      }
                      slotProps={{ htmlInput: { min: '0', step: '0.01' } }}
                    />
                    <Button
                      disabled={manualPaymentInstallments.length === 1}
                      startIcon={<Trash2 size={15} />}
                      type='button'
                      variant='text'
                      onClick={() =>
                        setManualPaymentInstallments((currentInstallments) =>
                          currentInstallments.filter(
                            (_currentInstallment, installmentIndex) =>
                              installmentIndex !== index,
                          ),
                        )
                      }>
                      Remover
                    </Button>
                  </div>
                ))}
                <Alert
                  severity={
                    Math.abs(manualInstallmentDifference) < 0.01
                      ? 'success'
                      : 'info'
                  }
                  variant='outlined'>
                  Total das parcelas: {formatCurrency(manualInstallmentsTotal)}.
                  Diferença:{' '}
                  {formatCurrency(Math.abs(manualInstallmentDifference))}.
                </Alert>
              </div>
            ) : null}
          </div>

          <TextField
            label='Observações no rodapé'
            multiline
            minRows={3}
            name='manualFiscalAdditionalInformation'
            defaultValue={sourceValues.additionalInformation}
          />
          <div className='flex flex-wrap justify-end gap-2'>
            {!sourceSale ? (
              <Button
              formNoValidate
              name='manualFiscalAction'
              type='submit'
              value='draft'
              variant='outlined'>
              {sourceDraft ? 'Atualizar rascunho' : 'Salvar rascunho'}
              </Button>
            ) : null}
            <Button
              name='manualFiscalAction'
              type='submit'
              value='preview'
              variant='outlined'>
              Pré-visualizar DANFE
            </Button>
            <Button
              name='manualFiscalAction'
              type='submit'
              value='issue'
              variant='contained'>
              Emitir NF-e
            </Button>
          </div>
        </form>
      </PagePanel>
    </section>
  )
}

function emptyManualFiscalItem(): ManualFiscalItemForm {
  return {
    productId: '',
    productInternalCode: '',
    productName: '',
    productNcm: '',
    productCfop: '',
    productIcmsCst: '',
    productPisCst: '',
    productCofinsCst: '',
    productOrigin: '0',
    productUnit: 'UN',
    quantity: '1',
    unitPrice: '',
    discountAmount: '0',
  }
}

function emptyManualFiscalPayment(): ManualFiscalPaymentForm {
  return {
    paymentMethodCode: '',
    paymentMethodName: '',
    amount: '',
  }
}

function defaultManualFiscalInstallment(
  dueDate: string,
  amount: number,
): ManualFiscalPaymentInstallmentForm {
  return {
    dueDate,
    amount: amount > 0 ? amount.toFixed(2) : '',
  }
}

function manualFiscalRemainingInstallmentAmount(
  totalAmount: number,
  installments: ManualFiscalPaymentInstallmentForm[],
) {
  return Number(
    (
      totalAmount -
      installments.reduce(
        (sum, installment) => sum + moneyInputValue(installment.amount),
        0,
      )
    ).toFixed(2),
  )
}

const manualFiscalOperationOptions: ManualFiscalOperationOption[] = [
  {
    codes: '5.101 / 6.101',
    label: 'Venda de produção do estabelecimento',
    value: '5.101/6.101 - Venda producao estabelecimento',
  },
  {
    codes: '5.102 / 6.102',
    label: 'Venda fora do estado',
    value: '5.102/6.102 - Venda fora do estado',
  },
  {
    codes: '5.401 / 6.401',
    label: 'Venda de produção do estabelecimento (ST)',
    value: '5.401/6.401 - Venda producao estabelecimento ST',
  },
  {
    codes: '5.403 / 6.403',
    label: 'Venda de mercadoria adquirida de terceiros (ST)',
    value: '5.403/6.403 - Venda mercadoria terceiros ST',
  },
  {
    codes: '5.115 / 6.115',
    label: 'Venda de mercadoria recebida em consignação mercantil',
    value: '5.115/6.115 - Venda mercadoria consignada',
  },
  {
    codes: '5.201 / 6.201',
    label: 'Devolução de compra para industrialização',
    value: '5.201/6.201 - Devolucao compra industrializacao',
  },
  {
    codes: '5.202 / 6.202',
    label: 'Devolução de compra para comercialização',
    value: '5.202/6.202 - Devolucao compra comercializacao',
  },
  {
    codes: '5.411 / 6.411',
    label: 'Devolução de compra para comercialização (ST)',
    value: '5.411/6.411 - Devolucao compra comercializacao ST',
  },
  {
    codes: '5.553 / 6.553',
    label: 'Devolução de compra de bem para o ativo imobilizado',
    value: '5.553/6.553 - Devolucao compra ativo imobilizado',
  },
  {
    codes: '5.910 / 6.910',
    label: 'Remessa em bonificação, doação ou brinde',
    value: '5.910/6.910 - Remessa bonificacao/doacao/brinde',
  },
  {
    codes: '5.911 / 6.911',
    label: 'Remessa de amostra grátis',
    value: '5.911/6.911 - Remessa amostra gratis',
  },
  {
    codes: '5.915 / 6.915',
    label: 'Remessa para conserto ou reparo',
    value: '5.915/6.915 - Remessa conserto ou reparo',
  },
  {
    codes: '5.917 / 6.917',
    label: 'Remessa de mercadoria em consignação mercantil',
    value: '5.917/6.917 - Remessa mercadoria consignacao',
  },
  {
    codes: '5.949 / 6.949',
    label: 'Outra saída de mercadoria ou serviço não especificado',
    value: '5.949/6.949 - Outra saida nao especificada',
  },
  {
    codes: '5.902 / 6.902',
    label: 'Retorno de mercadoria recebida para industrialização',
    value: '5.902/6.902 - Retorno industrializacao encomenda',
  },
  {
    codes: '5.916 / 6.916',
    label: 'Retorno de mercadoria recebida para conserto ou reparo',
    value: '5.916/6.916 - Retorno conserto ou reparo',
  },
  {
    codes: '5.921 / 6.921',
    label: 'Retorno de vasilhame ou embalagem',
    value: '5.921/6.921 - Retorno vasilhame ou embalagem',
  },
  {
    codes: '1.101 / 2.101',
    label: 'Compra para industrialização',
    value: '1.101/2.101 - Compra industrializacao',
  },
  {
    codes: '1.102 / 2.102',
    label: 'Compra para comercialização',
    value: '1.102/2.102 - Compra comercializacao',
  },
  {
    codes: '1.403 / 2.403',
    label: 'Compra para comercialização (ST)',
    value: '1.403/2.403 - Compra comercializacao ST',
  },
  {
    codes: '1.556 / 2.556',
    label: 'Compra de material para uso ou consumo',
    value: '1.556/2.556 - Compra uso ou consumo',
  },
  {
    codes: '1.551 / 2.551',
    label: 'Compra de bem para o ativo imobilizado',
    value: '1.551/2.551 - Compra ativo imobilizado',
  },
  {
    codes: '1.201 / 2.201',
    label: 'Devolução de venda de produção do estabelecimento',
    value: '1.201/2.201 - Devolucao venda producao',
  },
  {
    codes: '1.202 / 2.202',
    label: 'Devolução de venda de mercadoria adquirida de terceiros',
    value: '1.202/2.202 - Devolucao venda mercadoria terceiros',
  },
  {
    codes: '1.411 / 2.411',
    label: 'Devolução de venda de mercadoria (ST)',
    value: '1.411/2.411 - Devolucao venda mercadoria ST',
  },
  {
    codes: '1.910 / 2.910',
    label: 'Entrada de bonificação, doação ou brinde',
    value: '1.910/2.910 - Entrada bonificacao/doacao/brinde',
  },
  {
    codes: '1.915 / 2.915',
    label: 'Entrada de mercadoria recebida para conserto ou reparo',
    value: '1.915/2.915 - Entrada conserto ou reparo',
  },
  {
    codes: '1.917 / 2.917',
    label: 'Entrada de mercadoria recebida em consignação mercantil',
    value: '1.917/2.917 - Entrada mercadoria consignacao',
  },
  {
    codes: '7.101',
    label: 'Venda de produção do estabelecimento para o exterior',
    value: '7.101 - Venda producao para exterior',
  },
  {
    codes: '7.102',
    label: 'Venda de mercadoria adquirida de terceiros para o exterior',
    value: '7.102 - Venda mercadoria terceiros exterior',
  },
  {
    codes: '7.949',
    label:
      'Outra saída de mercadoria ou serviço não especificado para o exterior',
    value: '7.949 - Outra saida exterior',
  },
  {
    codes: '7.551',
    label: 'Venda de bem do ativo imobilizado para o exterior',
    value: '7.551 - Venda ativo imobilizado exterior',
  },
  {
    codes: '7.910',
    label: 'Remessa em bonificação, doação ou brinde para o exterior',
    value: '7.910 - Remessa bonificacao/doacao/brinde exterior',
  },
  {
    codes: '7.911',
    label: 'Remessa de amostra grátis para o exterior',
    value: '7.911 - Remessa amostra gratis exterior',
  },
  {
    codes: '3.101',
    label: 'Compra para industrialização',
    value: '3.101 - Compra industrializacao',
  },
  {
    codes: '3.102',
    label: 'Compra para comercialização',
    value: '3.102 - Compra comercializacao',
  },
  {
    codes: '3.551',
    label: 'Compra de bem para o ativo imobilizado',
    value: '3.551 - Compra ativo imobilizado',
  },
  {
    codes: '3.556',
    label: 'Compra de material para uso ou consumo',
    value: '3.556 - Compra uso ou consumo',
  },
  {
    codes: '3.201',
    label: 'Devolução de venda de produção do estabelecimento',
    value: '3.201 - Devolucao venda producao',
  },
  {
    codes: '3.202',
    label: 'Devolução de venda de mercadoria adquirida de terceiros',
    value: '3.202 - Devolucao venda mercadoria terceiros',
  },
  {
    codes: '3.949',
    label:
      'Outra entrada de mercadoria ou serviço não especificado do exterior',
    value: '3.949 - Outra entrada exterior',
  },
]

function manualFiscalOperationOptionFromValue(value: string) {
  return (
    manualFiscalOperationOptions.find((option) => option.value === value) ??
    manualFiscalOperationOptions.find((option) => option.label === value) ??
    (value
      ? {
          codes: 'Anterior',
          label: value,
          value,
        }
      : null)
  )
}

function manualFiscalDocumentInput(
  form: FormData,
  items: ManualFiscalItemForm[],
  payments: ManualFiscalPaymentForm[],
  paymentInstallments: ManualFiscalPaymentInstallmentForm[],
  paymentMethods: PaymentMethod[],
  totalAmount: number,
): ManualFiscalDocumentInput {
  const referencedAccessKey = onlyDigits(
    formText(form, 'manualFiscalReferencedAccessKey'),
  )
  const transportedVolumesQuantity = Number(
    formText(form, 'manualFiscalTransportedVolumesQuantity') || 0,
  )
  const transportedVolumesGrossWeight = Number(
    formText(form, 'manualFiscalTransportedVolumesGrossWeight') || 0,
  )

  return {
    documentType: 'NFE',
    operationType: formText(form, 'manualFiscalOperationType') as
      | 'ENTRY'
      | 'EXIT',
    destinationOperation: manualFiscalDestinationOperationValue(
      formText(form, 'manualFiscalDestinationOperation'),
    ),
    purpose: manualFiscalPurposeValue(formText(form, 'manualFiscalPurpose')),
    natureOperation: formText(form, 'manualFiscalNatureOperation'),
    referencedAccessKeys: referencedAccessKey ? [referencedAccessKey] : [],
    transportedVolumesQuantity:
      Number.isFinite(transportedVolumesQuantity) &&
      transportedVolumesQuantity > 0
        ? transportedVolumesQuantity
        : null,
    transportedVolumesGrossWeight:
      Number.isFinite(transportedVolumesGrossWeight) &&
      transportedVolumesGrossWeight > 0
        ? transportedVolumesGrossWeight
        : null,
    billingEnabled: form.get('manualFiscalBillingEnabled') === 'on',
    billingIssueDate: nullableFormText(form, 'manualFiscalBillingIssueDate'),
    billingDueDate: nullableFormText(form, 'manualFiscalBillingDueDate'),
    payments: manualFiscalPaymentPayloads(
      payments,
      paymentMethods,
      totalAmount,
    ),
    paymentInstallments: paymentInstallments
      .filter((installment) => installment.dueDate && installment.amount)
      .map((installment, index) => ({
        position: index + 1,
        dueDate: dateInputValue(installment.dueDate) ?? installment.dueDate,
        amount: moneyInputValue(installment.amount),
      })),
    additionalInformation: nullableFormText(
      form,
      'manualFiscalAdditionalInformation',
    ),
    client: {
      personType: formText(form, 'manualFiscalClientPersonType') as
        | 'PF'
        | 'PJ'
        | 'ES',
      name: formText(form, 'manualFiscalClientName'),
      document: nullableFormText(form, 'manualFiscalClientDocument'),
      email: nullableFormText(form, 'manualFiscalClientEmail'),
      phone: nullableFormText(form, 'manualFiscalClientPhone'),
      stateRegistration: nullableFormText(
        form,
        'manualFiscalClientStateRegistration',
      ),
      stateRegistrationIndicator: nullableFormText(
        form,
        'manualFiscalClientStateRegistrationIndicator',
      ) as '1' | '2' | '9' | null,
      addressStreet: formText(form, 'manualFiscalClientAddressStreet'),
      addressNumber: formText(form, 'manualFiscalClientAddressNumber'),
      addressComplement: nullableFormText(
        form,
        'manualFiscalClientAddressComplement',
      ),
      addressDistrict: formText(form, 'manualFiscalClientAddressDistrict'),
      addressCity: formText(form, 'manualFiscalClientAddressCity'),
      addressState: formText(
        form,
        'manualFiscalClientAddressState',
      ).toUpperCase(),
      addressZipCode: formText(form, 'manualFiscalClientAddressZipCode'),
    },
    items: items.map((item) => ({
      productId: item.productId || null,
      productInternalCode: item.productInternalCode.trim() || null,
      productName: item.productName.trim(),
      productNcm: item.productNcm.trim() || null,
      productCfop: item.productCfop.trim() || null,
      productIcmsCst: item.productIcmsCst.trim() || null,
      productPisCst: item.productPisCst.trim() || null,
      productCofinsCst: item.productCofinsCst.trim() || null,
      productOrigin: item.productOrigin.trim() || null,
      productUnit: item.productUnit.trim() || 'UN',
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      discountAmount: Number(item.discountAmount || 0),
    })),
  }
}

function manualFiscalPaymentPayloads(
  payments: ManualFiscalPaymentForm[],
  paymentMethods: PaymentMethod[],
  totalAmount: number,
) {
  const filledPayments = payments.filter((payment) => payment.paymentMethodCode)
  const usesSinglePaymentTotal =
    filledPayments.length === 1 &&
    !filledPayments[0].amount &&
    filledPayments[0].paymentMethodCode !== 'NO_PAYMENT'

  return filledPayments.map((payment) => {
    const method = paymentMethods.find(
      (paymentMethod) => paymentMethod.code === payment.paymentMethodCode,
    )

    return {
      paymentMethodCode: payment.paymentMethodCode,
      paymentMethodName:
        payment.paymentMethodName ||
        method?.name ||
        manualFiscalPaymentName(payment.paymentMethodCode),
      amount:
        payment.paymentMethodCode === 'NO_PAYMENT'
          ? 0
          : usesSinglePaymentTotal
            ? Number(totalAmount.toFixed(2))
            : moneyInputValue(payment.amount),
    }
  })
}

function manualFiscalPaymentsTotal(
  payments: ManualFiscalPaymentForm[],
  totalAmount: number,
) {
  const payloads = manualFiscalPaymentPayloads(payments, [], totalAmount)

  return Number(
    payloads.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2),
  )
}

function manualFiscalBillablePaymentsTotal(
  payments: ManualFiscalPaymentForm[],
  paymentMethods: PaymentMethod[],
  totalAmount: number,
) {
  const payloads = manualFiscalPaymentPayloads(
    payments,
    paymentMethods,
    totalAmount,
  )

  return Number(
    payloads
      .filter((payment) =>
        manualFiscalPaymentCodeAllowsBilling(payment.paymentMethodCode),
      )
      .reduce((sum, payment) => sum + payment.amount, 0)
      .toFixed(2),
  )
}

function manualFiscalInstallmentsTotal(
  installments: ManualFiscalPaymentInstallmentForm[],
) {
  return Number(
    installments
      .reduce(
        (sum, installment) => sum + moneyInputValue(installment.amount),
        0,
      )
      .toFixed(2),
  )
}

function manualFiscalPaymentsAllowBilling(
  payments: ManualFiscalPaymentForm[],
  paymentMethods: PaymentMethod[],
) {
  return payments.some((payment) => {
    const method = paymentMethods.find(
      (paymentMethod) => paymentMethod.code === payment.paymentMethodCode,
    )

    return manualFiscalPaymentCodeAllowsBilling(
      method?.code ?? payment.paymentMethodCode,
    )
  })
}

function manualFiscalPaymentCodeAllowsBilling(code: string) {
  return code === 'BOLETO' || code === 'CREDIT'
}

function manualFiscalPaymentName(code: string) {
  const names: Record<string, string> = {
    BOLETO: 'Fatura / boleto',
    CASH: 'Dinheiro',
    CREDIT: 'Crédito',
    DEBIT: 'Débito',
    NO_PAYMENT: 'Sem pagamento',
    PIX: 'PIX',
  }

  return names[code] ?? code
}

function manualFiscalItemsTotal(items: ManualFiscalItemForm[]) {
  return items.reduce((sum, item) => sum + manualFiscalItemTotal(item), 0)
}

function manualFiscalItemTotal(item: ManualFiscalItemForm) {
  return Math.max(
    0,
    Number(item.quantity || 0) * Number(item.unitPrice || 0) -
      Number(item.discountAmount || 0),
  )
}

function applyManualFiscalSaleTotalAmount(
  items: ManualFiscalItemForm[],
  targetAmount: number,
) {
  if (!Number.isFinite(targetAmount) || targetAmount < 0) {
    return items
  }

  const targetCents = Math.round(targetAmount * 100)
  const grossCents = items.reduce(
    (sum, item) =>
      sum +
      Math.round(Number(item.quantity || 0) * Number(item.unitPrice || 0) * 100),
    0,
  )
  const currentCents = Math.round(manualFiscalItemsTotal(items) * 100)

  if (Math.abs(currentCents - targetCents) <= 1 || grossCents <= targetCents) {
    return items
  }

  const totalDiscountCents = grossCents - targetCents
  const adjustableItems = items.filter(
    (item) => Number(item.quantity || 0) * Number(item.unitPrice || 0) > 0,
  )
  let remainingDiscountCents = totalDiscountCents

  return items.map((item) => {
    const itemGrossCents = Math.round(
      Number(item.quantity || 0) * Number(item.unitPrice || 0) * 100,
    )

    if (itemGrossCents <= 0) {
      return item
    }

    const isLastAdjustableItem =
      item === adjustableItems[adjustableItems.length - 1]
    const itemDiscountCents = isLastAdjustableItem
      ? remainingDiscountCents
      : Math.round((totalDiscountCents * itemGrossCents) / grossCents)
    const cappedDiscountCents = Math.min(itemDiscountCents, itemGrossCents)

    remainingDiscountCents -= cappedDiscountCents

    return {
      ...item,
      discountAmount: (cappedDiscountCents / 100).toFixed(2),
    }
  })
}

function applyManualFiscalTotalAmount(
  items: ManualFiscalItemForm[],
  targetAmount: number,
) {
  if (!Number.isFinite(targetAmount) || targetAmount < 0) {
    return items
  }

  const targetCents = Math.round(targetAmount * 100)
  const adjustableItems = items.filter((item) => Number(item.quantity || 0) > 0)

  if (!adjustableItems.length) {
    return items
  }

  const currentCents = items.reduce(
    (sum, item) => sum + Math.round(manualFiscalItemTotal(item) * 100),
    0,
  )
  let remainingCents = targetCents

  return items.map((item) => {
    const quantity = Number(item.quantity || 0)

    if (quantity <= 0) {
      return item
    }

    const isLastAdjustableItem =
      item === adjustableItems[adjustableItems.length - 1]
    const itemCents = Math.round(manualFiscalItemTotal(item) * 100)
    const nextItemCents = isLastAdjustableItem
      ? remainingCents
      : currentCents > 0
        ? Math.round((targetCents * itemCents) / currentCents)
        : 0
    const discountAmount = Number(item.discountAmount || 0)
    const unitPrice = Math.max(
      0,
      (nextItemCents / 100 + discountAmount) / quantity,
    )

    remainingCents -= nextItemCents

    return {
      ...item,
      unitPrice: unitPrice.toFixed(2),
    }
  })
}

const manualFiscalLookupStatusLabel = {
  idle: 'Digite um CNPJ para buscar os dados.',
  loading: 'Consultando CNPJ...',
  success: 'Dados encontrados. Revise antes de emitir.',
  error: 'Não foi possível buscar este CNPJ.',
}

function manualFiscalDocumentFormValues(document?: FiscalDocument) {
  const payload = document?.requestPayload ?? null
  const sale = manualFiscalPayloadSale(payload)
  const referencedAccessKey = Array.isArray(payload?.referencedAccessKeys)
    ? (stringPayloadValue(payload.referencedAccessKeys[0]) ?? '')
    : ''
  const transportedVolumesQuantity =
    typeof payload?.transportedVolumesQuantity === 'number' &&
    payload.transportedVolumesQuantity > 0
      ? String(payload.transportedVolumesQuantity)
      : '1'
  const transportedVolumesGrossWeight =
    typeof payload?.transportedVolumesGrossWeight === 'number' &&
    payload.transportedVolumesGrossWeight > 0
      ? String(payload.transportedVolumesGrossWeight)
      : ''
  const items = Array.isArray(sale?.items)
    ? sale.items
        .map((item) =>
          typeof item === 'object' && item !== null
            ? manualFiscalItemFromPayload(item as Record<string, unknown>)
            : null,
        )
        .filter((item): item is ManualFiscalItemForm => Boolean(item))
    : []

  const formItems = items.length ? items : [emptyManualFiscalItem()]

  return {
    operationType:
      payload?.operationType === 'EXIT' || payload?.operationType === 'ENTRY'
        ? payload.operationType
        : 'ENTRY',
    destinationOperation: manualFiscalDestinationOperationValue(
      stringPayloadValue(payload?.destinationOperation) ?? 'INTERNAL',
    ),
    purpose: manualFiscalPurposeValue(
      stringPayloadValue(payload?.purpose) ?? 'NORMAL',
    ),
    natureOperation:
      stringPayloadValue(payload?.defaultNatureOperation) ??
      '5.102/6.102 - Venda mercadoria terceiros',
    referencedAccessKey,
    transportedVolumesQuantity,
    transportedVolumesGrossWeight,
    billingEnabled: manualFiscalPayloadHasBilling(sale),
    billingIssueDate: stringPayloadValue(sale?.billingIssueDate) ?? '',
    billingDueDate: stringPayloadValue(sale?.billingDueDate) ?? '',
    payments: manualFiscalPaymentsFromPayload(sale, formItems),
    paymentInstallments: manualFiscalInstallmentsFromPayload(sale),
    additionalInformation:
      stringPayloadValue(payload?.additionalInformation) ?? '',
    clientPersonType: manualFiscalClientPersonTypeValue(
      stringPayloadValue(sale?.clientPersonType) ?? 'PJ',
    ),
    clientStateRegistrationIndicator:
      manualFiscalClientStateRegistrationIndicatorValue(
        stringPayloadValue(sale?.clientStateRegistrationIndicator) ?? '9',
      ),
    clientValues: {
      manualFiscalClientAddressCity: stringPayloadValue(
        sale?.clientAddressCity,
      ),
      manualFiscalClientAddressComplement: stringPayloadValue(
        sale?.clientAddressComplement,
      ),
      manualFiscalClientAddressDistrict: stringPayloadValue(
        sale?.clientAddressDistrict,
      ),
      manualFiscalClientAddressNumber: stringPayloadValue(
        sale?.clientAddressNumber,
      ),
      manualFiscalClientAddressState: stringPayloadValue(
        sale?.clientAddressState,
      ),
      manualFiscalClientAddressStreet: stringPayloadValue(
        sale?.clientAddressStreet,
      ),
      manualFiscalClientAddressZipCode: stringPayloadValue(
        sale?.clientAddressZipCode,
      ),
      manualFiscalClientDocument: stringPayloadValue(sale?.clientDocument),
      manualFiscalClientEmail: stringPayloadValue(sale?.clientEmail),
      manualFiscalClientName: stringPayloadValue(sale?.clientName),
      manualFiscalClientPhone: stringPayloadValue(sale?.clientPhone),
      manualFiscalClientStateRegistration: stringPayloadValue(
        sale?.clientStateRegistration,
      ),
    },
    items: formItems,
    totalAmount: manualFiscalItemsTotal(formItems).toFixed(2),
  }
}

function manualFiscalDocumentDraftFormValues(
  payload?: Record<string, unknown>,
) {
  const client =
    typeof payload?.client === 'object' && payload.client !== null
      ? (payload.client as Record<string, unknown>)
      : {}
  const referencedAccessKey = Array.isArray(payload?.referencedAccessKeys)
    ? (stringPayloadValue(payload.referencedAccessKeys[0]) ?? '')
    : ''
  const transportedVolumesQuantity =
    typeof payload?.transportedVolumesQuantity === 'number' &&
    payload.transportedVolumesQuantity > 0
      ? String(payload.transportedVolumesQuantity)
      : '1'
  const transportedVolumesGrossWeight =
    typeof payload?.transportedVolumesGrossWeight === 'number' &&
    payload.transportedVolumesGrossWeight > 0
      ? String(payload.transportedVolumesGrossWeight)
      : ''
  const items = Array.isArray(payload?.items)
    ? payload.items
        .map((item) =>
          typeof item === 'object' && item !== null
            ? manualFiscalItemFromDraftPayload(item as Record<string, unknown>)
            : null,
        )
        .filter((item): item is ManualFiscalItemForm => Boolean(item))
    : []
  const formItems = items.length ? items : [emptyManualFiscalItem()]

  return {
    operationType:
      payload?.operationType === 'EXIT' || payload?.operationType === 'ENTRY'
        ? payload.operationType
        : 'ENTRY',
    destinationOperation: manualFiscalDestinationOperationValue(
      stringPayloadValue(payload?.destinationOperation) ?? 'INTERNAL',
    ),
    purpose: manualFiscalPurposeValue(
      stringPayloadValue(payload?.purpose) ?? 'NORMAL',
    ),
    natureOperation:
      stringPayloadValue(payload?.natureOperation) ??
      '5.102/6.102 - Venda mercadoria terceiros',
    referencedAccessKey,
    transportedVolumesQuantity,
    transportedVolumesGrossWeight,
    billingEnabled: payload?.billingEnabled === true,
    billingIssueDate: stringPayloadValue(payload?.billingIssueDate) ?? '',
    billingDueDate: stringPayloadValue(payload?.billingDueDate) ?? '',
    payments: manualFiscalPaymentsFromDraftPayload(payload, formItems),
    paymentInstallments: manualFiscalInstallmentsFromDraftPayload(payload),
    additionalInformation:
      stringPayloadValue(payload?.additionalInformation) ?? '',
    clientPersonType: manualFiscalClientPersonTypeValue(
      stringPayloadValue(client.personType) ?? 'PJ',
    ),
    clientStateRegistrationIndicator:
      manualFiscalClientStateRegistrationIndicatorValue(
        stringPayloadValue(client.stateRegistrationIndicator) ?? '9',
      ),
    clientValues: {
      manualFiscalClientAddressCity: stringPayloadValue(client.addressCity),
      manualFiscalClientAddressComplement: stringPayloadValue(
        client.addressComplement,
      ),
      manualFiscalClientAddressDistrict: stringPayloadValue(
        client.addressDistrict,
      ),
      manualFiscalClientAddressNumber: stringPayloadValue(client.addressNumber),
      manualFiscalClientAddressState: stringPayloadValue(client.addressState),
      manualFiscalClientAddressStreet: stringPayloadValue(client.addressStreet),
      manualFiscalClientAddressZipCode: stringPayloadValue(
        client.addressZipCode,
      ),
      manualFiscalClientDocument: stringPayloadValue(client.document),
      manualFiscalClientEmail: stringPayloadValue(client.email),
      manualFiscalClientName: stringPayloadValue(client.name),
      manualFiscalClientPhone: stringPayloadValue(client.phone),
      manualFiscalClientStateRegistration: stringPayloadValue(
        client.stateRegistration,
      ),
    },
    items: formItems,
    totalAmount: manualFiscalItemsTotal(formItems).toFixed(2),
  }
}

function manualFiscalDocumentSaleFormValues(sale: Sale) {
  const items = sale.items.length
    ? sale.items.map((item) => ({
        productId: item.productId,
        productInternalCode: item.productInternalCode ?? '',
        productName: item.productName,
        productNcm: item.productNcm ?? '',
        productCfop: item.productCfop ?? '',
        productIcmsCst: item.productIcmsCst ?? '',
        productPisCst: item.productPisCst ?? '',
        productCofinsCst: item.productCofinsCst ?? '',
        productOrigin: item.productOrigin ?? '0',
        productUnit: item.productUnit || 'UN',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
      }))
    : [emptyManualFiscalItem()]
  const adjustedItems = applyManualFiscalSaleTotalAmount(
    items,
    Number(sale.totalAmount),
  )

  return {
    operationType: 'EXIT' as const,
    destinationOperation: 'INTERNAL' as const,
    purpose: 'NORMAL' as const,
    natureOperation: '5.102/6.102 - Venda mercadoria terceiros',
    referencedAccessKey: '',
    transportedVolumesQuantity: '1',
    transportedVolumesGrossWeight: '',
    billingEnabled:
      sale.paymentMethodCode === 'BOLETO' ||
      sale.payments.some((payment) => payment.paymentMethodCode === 'BOLETO') ||
      sale.paymentInstallments.length > 0,
    billingIssueDate: sale.billingIssueDate?.slice(0, 10) ?? '',
    billingDueDate: sale.billingDueDate?.slice(0, 10) ?? '',
    payments: sale.payments.length
      ? sale.payments.map((payment) => ({
          paymentMethodCode: payment.paymentMethodCode,
          paymentMethodName: payment.paymentMethodName,
          amount: payment.amount,
        }))
      : [
          {
            paymentMethodCode: sale.paymentMethodCode,
            paymentMethodName: sale.paymentMethodName,
            amount: sale.totalAmount,
          },
        ],
    paymentInstallments: sale.paymentInstallments.map((installment) => ({
      dueDate: dateInputValue(installment.dueDate) ?? installment.dueDate,
      amount: installment.amount,
    })),
    additionalInformation: '',
    clientPersonType: manualFiscalClientPersonTypeValue(
      sale.clientPersonType ?? 'PJ',
    ),
    clientStateRegistrationIndicator:
      manualFiscalClientStateRegistrationIndicatorValue(
        sale.clientStateRegistrationIndicator ?? '9',
      ),
    clientValues: {
      manualFiscalClientAddressCity: sale.clientAddressCity,
      manualFiscalClientAddressComplement: sale.clientAddressComplement,
      manualFiscalClientAddressDistrict: sale.clientAddressDistrict,
      manualFiscalClientAddressNumber: sale.clientAddressNumber,
      manualFiscalClientAddressState: sale.clientAddressState,
      manualFiscalClientAddressStreet: sale.clientAddressStreet,
      manualFiscalClientAddressZipCode: sale.clientAddressZipCode,
      manualFiscalClientDocument: sale.clientDocument,
      manualFiscalClientEmail: sale.clientEmail,
      manualFiscalClientName: sale.clientName,
      manualFiscalClientPhone: sale.clientPhone,
      manualFiscalClientStateRegistration: sale.clientStateRegistration,
    },
    items: adjustedItems,
    totalAmount: manualFiscalItemsTotal(adjustedItems).toFixed(2),
  }
}

function manualFiscalPayloadHasBilling(sale: Record<string, unknown> | null) {
  const paymentMethodCode = stringPayloadValue(sale?.paymentMethodCode)
  const payments = Array.isArray(sale?.payments) ? sale.payments : []

  return (
    paymentMethodCode === 'BOLETO' ||
    payments.some(
      (payment) =>
        typeof payment === 'object' &&
        payment !== null &&
        stringPayloadValue(
          (payment as Record<string, unknown>).paymentMethodCode,
        ) === 'BOLETO',
    )
  )
}

function manualFiscalPaymentsFromPayload(
  sale: Record<string, unknown> | null,
  items: ManualFiscalItemForm[],
): ManualFiscalPaymentForm[] {
  const payments = Array.isArray(sale?.payments) ? sale.payments : []
  const parsedPayments = payments
    .map((payment) =>
      typeof payment === 'object' && payment !== null
        ? manualFiscalPaymentFromPayload(payment as Record<string, unknown>)
        : null,
    )
    .filter((payment): payment is ManualFiscalPaymentForm => Boolean(payment))

  if (parsedPayments.length > 0) {
    return parsedPayments
  }

  const paymentMethodCode = stringPayloadValue(sale?.paymentMethodCode) ?? ''

  if (paymentMethodCode) {
    return [
      {
        paymentMethodCode,
        paymentMethodName:
          stringPayloadValue(sale?.paymentMethodName) ??
          manualFiscalPaymentName(paymentMethodCode),
        amount: stringPayloadValue(sale?.totalAmount) ?? '',
      },
    ]
  }

  return [
    {
      paymentMethodCode: 'NO_PAYMENT',
      paymentMethodName: manualFiscalPaymentName('NO_PAYMENT'),
      amount: '0',
    },
  ]
}

function manualFiscalPaymentFromPayload(
  payment: Record<string, unknown>,
): ManualFiscalPaymentForm | null {
  const paymentMethodCode = stringPayloadValue(payment.paymentMethodCode)

  if (!paymentMethodCode) {
    return null
  }

  return {
    paymentMethodCode,
    paymentMethodName:
      stringPayloadValue(payment.paymentMethodName) ??
      manualFiscalPaymentName(paymentMethodCode),
    amount: stringPayloadValue(payment.amount) ?? '',
  }
}

function manualFiscalInstallmentsFromPayload(
  sale: Record<string, unknown> | null,
): ManualFiscalPaymentInstallmentForm[] {
  const installments = Array.isArray(sale?.paymentInstallments)
    ? sale.paymentInstallments
    : []

  return installments
    .map((installment) =>
      typeof installment === 'object' && installment !== null
        ? manualFiscalInstallmentFromPayload(
            installment as Record<string, unknown>,
          )
        : null,
    )
    .filter((installment): installment is ManualFiscalPaymentInstallmentForm =>
      Boolean(installment),
    )
}

function manualFiscalPaymentsFromDraftPayload(
  payload: Record<string, unknown> | undefined,
  items: ManualFiscalItemForm[],
) {
  const payments = Array.isArray(payload?.payments) ? payload.payments : []
  const parsedPayments = payments
    .map((payment) =>
      typeof payment === 'object' && payment !== null
        ? manualFiscalPaymentFromPayload(payment as Record<string, unknown>)
        : null,
    )
    .filter((payment): payment is ManualFiscalPaymentForm => Boolean(payment))

  if (parsedPayments.length > 0) {
    return parsedPayments
  }

  if (payload?.billingEnabled === true) {
    return [
      {
        paymentMethodCode: 'BOLETO',
        paymentMethodName: manualFiscalPaymentName('BOLETO'),
        amount: manualFiscalItemsTotal(items).toFixed(2),
      },
    ]
  }

  return [emptyManualFiscalPayment()]
}

function manualFiscalInstallmentsFromDraftPayload(
  payload: Record<string, unknown> | undefined,
): ManualFiscalPaymentInstallmentForm[] {
  const installments = Array.isArray(payload?.paymentInstallments)
    ? payload.paymentInstallments
    : []

  return installments
    .map((installment) =>
      typeof installment === 'object' && installment !== null
        ? manualFiscalInstallmentFromPayload(
            installment as Record<string, unknown>,
          )
        : null,
    )
    .filter((installment): installment is ManualFiscalPaymentInstallmentForm =>
      Boolean(installment),
    )
}

function manualFiscalInstallmentFromPayload(
  installment: Record<string, unknown>,
): ManualFiscalPaymentInstallmentForm | null {
  const dueDate = stringPayloadValue(installment.dueDate)

  if (!dueDate) {
    return null
  }

  return {
    dueDate,
    amount: stringPayloadValue(installment.amount) ?? '',
  }
}

function manualFiscalItemFromDraftPayload(
  item: Record<string, unknown>,
): ManualFiscalItemForm {
  return {
    productId: stringPayloadValue(item.productId) ?? '',
    productInternalCode: stringPayloadValue(item.productInternalCode) ?? '',
    productName: stringPayloadValue(item.productName) ?? '',
    productNcm: stringPayloadValue(item.productNcm) ?? '',
    productCfop: stringPayloadValue(item.productCfop) ?? '',
    productIcmsCst: stringPayloadValue(item.productIcmsCst) ?? '',
    productPisCst: stringPayloadValue(item.productPisCst) ?? '',
    productCofinsCst: stringPayloadValue(item.productCofinsCst) ?? '',
    productOrigin: stringPayloadValue(item.productOrigin) ?? '0',
    productUnit: stringPayloadValue(item.productUnit) ?? 'UN',
    quantity: stringPayloadValue(item.quantity) ?? '1',
    unitPrice: stringPayloadValue(item.unitPrice) ?? '0',
    discountAmount: stringPayloadValue(item.discountAmount) ?? '0',
  }
}

function manualFiscalItemFromPayload(
  item: Record<string, unknown>,
): ManualFiscalItemForm {
  const productId = stringPayloadValue(item.productId) ?? ''

  return {
    productId: productId.startsWith('manual-') ? '' : productId,
    productInternalCode: stringPayloadValue(item.productInternalCode) ?? '',
    productName: stringPayloadValue(item.productName) ?? '',
    productNcm: stringPayloadValue(item.productNcm) ?? '',
    productCfop: stringPayloadValue(item.productCfop) ?? '',
    productIcmsCst: stringPayloadValue(item.productIcmsCst) ?? '',
    productPisCst: stringPayloadValue(item.productPisCst) ?? '',
    productCofinsCst: stringPayloadValue(item.productCofinsCst) ?? '',
    productOrigin: stringPayloadValue(item.productOrigin) ?? '0',
    productUnit: stringPayloadValue(item.productUnit) ?? 'UN',
    quantity: stringPayloadValue(item.quantity) ?? '1',
    unitPrice: stringPayloadValue(item.unitPrice) ?? '0',
    discountAmount: stringPayloadValue(item.discountAmount) ?? '0',
  }
}

function manualFiscalClientLookupValues(company: ClientCompanyLookup) {
  return {
    manualFiscalClientAddressCity: company.addressCity,
    manualFiscalClientAddressComplement: company.addressComplement,
    manualFiscalClientAddressDistrict: company.addressDistrict,
    manualFiscalClientAddressNumber: company.addressNumber,
    manualFiscalClientAddressState: company.addressState,
    manualFiscalClientAddressStreet: company.addressStreet,
    manualFiscalClientAddressZipCode: company.addressZipCode,
    manualFiscalClientDocument: company.document,
    manualFiscalClientEmail: company.email,
    manualFiscalClientName: company.name,
    manualFiscalClientPhone: company.phone,
    manualFiscalClientStateRegistration: company.stateRegistration,
  }
}

function manualFiscalRegisteredClientValues(client: Client) {
  return {
    manualFiscalClientAddressCity: client.addressCity,
    manualFiscalClientAddressComplement: client.addressComplement,
    manualFiscalClientAddressDistrict: client.addressDistrict,
    manualFiscalClientAddressNumber: client.addressNumber,
    manualFiscalClientAddressState: client.addressState,
    manualFiscalClientAddressStreet: client.addressStreet,
    manualFiscalClientAddressZipCode: client.addressZipCode,
    manualFiscalClientDocument: client.document,
    manualFiscalClientEmail: client.email,
    manualFiscalClientName: client.name,
    manualFiscalClientPhone: client.phone,
    manualFiscalClientStateRegistration: client.stateRegistration,
  }
}

function manualFiscalClientPersonTypeValue(
  value: string,
): ManualFiscalDocumentInput['client']['personType'] {
  const values: Record<
    string,
    ManualFiscalDocumentInput['client']['personType']
  > = {
    ES: 'ES',
    PF: 'PF',
    PJ: 'PJ',
  }

  return values[value] ?? 'PJ'
}

function manualFiscalClientStateRegistrationIndicatorValue(
  value: string,
): NonNullable<
  ManualFiscalDocumentInput['client']['stateRegistrationIndicator']
> {
  const values: Record<
    string,
    NonNullable<
      ManualFiscalDocumentInput['client']['stateRegistrationIndicator']
    >
  > = {
    '1': '1',
    '2': '2',
    '9': '9',
  }

  return values[value] ?? '9'
}

function manualFiscalDestinationOperationValue(
  value: string,
): ManualFiscalDocumentInput['destinationOperation'] {
  const values: Record<string, ManualFiscalDocumentInput['destinationOperation']> =
    {
      EXTERIOR: 'EXTERIOR',
      INTERNAL: 'INTERNAL',
      INTERSTATE: 'INTERSTATE',
    }

  return values[value] ?? 'INTERNAL'
}

function manualFiscalPurposeValue(
  value: string,
): ManualFiscalDocumentInput['purpose'] {
  const values: Record<string, ManualFiscalDocumentInput['purpose']> = {
    ADJUSTMENT: 'ADJUSTMENT',
    COMPLEMENTARY: 'COMPLEMENTARY',
    CREDIT_NOTE: 'CREDIT_NOTE',
    DEBIT_NOTE: 'DEBIT_NOTE',
    NORMAL: 'NORMAL',
    RETURN: 'RETURN',
  }

  return values[value] ?? 'RETURN'
}

function formText(form: FormData, field: string) {
  return String(form.get(field) ?? '').trim()
}

function nullableFormText(form: FormData, field: string) {
  return formText(form, field) || null
}

function todayInputDate() {
  return new Date().toLocaleDateString('en-CA')
}

function dateInputValue(value: string | null | undefined) {
  return value?.slice(0, 10) || null
}

function manualFiscalDueDate(
  issueDate: string,
  settings: CommercialSettings | null,
) {
  const date = new Date(`${issueDate || todayInputDate()}T00:00:00`)
  date.setDate(date.getDate() + Number(settings?.defaultQuoteDueDays ?? 0))

  return date.toLocaleDateString('en-CA')
}

function moneyInputValue(value: string) {
  const parsedValue = Number(value || 0)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0
}

function onlyDigits(value: string | null) {
  return value?.replace(/\D/g, '') ?? ''
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

function buildFiscalDocumentClients({
  clients,
  fiscalDocuments,
  pickupReservations,
  sales,
  shippingOrders,
}: {
  clients: Client[]
  fiscalDocuments: FiscalDocument[]
  pickupReservations: PickupReservation[]
  sales: Sale[]
  shippingOrders: ShippingOrder[]
}) {
  const clientsById = new Map(clients.map((client) => [client.id, client]))
  const salesById = new Map(sales.map((sale) => [sale.id, sale]))
  const sourceClients = new Map<
    string,
    { document: string | null; name: string }
  >()
  const clientFromSale = (sale: Sale | undefined) =>
    sale
      ? {
          document: sale.clientDocument,
          name: sale.clientName ?? 'Nao identificado',
        }
      : null
  const clientFromId = (clientId: string | null | undefined) => {
    const client = clientId ? clientsById.get(clientId) : undefined

    return client
      ? {
          document: client.document,
          name: client.name,
        }
      : null
  }

  sales.forEach((sale) => {
    sourceClients.set(`SALE-${sale.id}`, {
      document: sale.clientDocument,
      name: sale.clientName ?? 'Nao identificado',
    })
  })
  shippingOrders.forEach((order) => {
    const client =
      clientFromId(order.clientId) ??
      clientFromSale(salesById.get(order.saleId ?? ''))

    if (client) {
      sourceClients.set(`SHIPPING_ORDER-${order.id}`, client)
    }
  })
  pickupReservations.forEach((reservation) => {
    const client =
      clientFromId(reservation.clientId) ??
      clientFromSale(salesById.get(reservation.saleId ?? ''))

    if (client) {
      sourceClients.set(`PICKUP_RESERVATION-${reservation.id}`, client)
    }
  })
  fiscalDocuments.forEach((document) => {
    const client = manualFiscalDocumentClient(document)

    if (client) {
      sourceClients.set(`${document.sourceType}-${document.sourceId}`, client)
    }
  })

  return sourceClients
}

function manualFiscalDocumentClient(document: FiscalDocument) {
  if (document.sourceType !== 'MANUAL_NFE') {
    return null
  }

  const sale = manualFiscalPayloadSale(document.requestPayload)

  if (!sale) {
    return null
  }

  return {
    document: stringPayloadValue(sale.clientDocument),
    name: stringPayloadValue(sale.clientName) ?? 'Nao identificado',
  }
}

function manualFiscalPayloadSale(payload: Record<string, unknown> | null) {
  const sale = payload?.sale

  return typeof sale === 'object' && sale !== null
    ? (sale as Record<string, unknown>)
    : null
}

function stringPayloadValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

type FiscalRequestReadinessFilter = 'ALL' | 'READY' | 'PENDING' | 'DOCUMENTED'
type FiscalDocumentStatusFilter = FiscalDocument['status'] | 'ALL'

const fiscalRequestReadinessFilterOptions: Array<{
  label: string
  value: FiscalRequestReadinessFilter
}> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Prontas', value: 'READY' },
  { label: 'Com pendências', value: 'PENDING' },
  { label: 'Com documento', value: 'DOCUMENTED' },
]

const fiscalDocumentStatusFilterOptions: Array<{
  label: string
  value: FiscalDocumentStatusFilter
}> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Pendente', value: 'PENDING' },
  { label: 'Processando', value: 'PROCESSING' },
  { label: 'Autorizada', value: 'AUTHORIZED' },
  { label: 'Rejeitada', value: 'REJECTED' },
  { label: 'Cancelada', value: 'CANCELLED' },
]

function filterFiscalRequests(
  requests: FiscalRequest[],
  filters: {
    readiness: FiscalRequestReadinessFilter
    search: string
  },
) {
  const normalizedSearch = normalizeSearchText(filters.search)

  return requests.filter((request) => {
    const matchesReadiness =
      filters.readiness === 'ALL' ||
      (filters.readiness === 'READY' &&
        canIssueFiscalRequest(request) &&
        request.readinessIssues.length === 0) ||
      (filters.readiness === 'PENDING' &&
        canIssueFiscalRequest(request) &&
        request.readinessIssues.length > 0) ||
      (filters.readiness === 'DOCUMENTED' &&
        Boolean(request.document) &&
        request.document?.status !== 'REJECTED')

    return (
      matchesReadiness &&
      (!normalizedSearch ||
        fiscalRequestSearchText(request).includes(normalizedSearch))
    )
  })
}

function filterFiscalDocuments(
  documents: FiscalDocument[],
  sourceNumbers: Map<string, string>,
  filters: {
    clients: Map<string, { document: string | null; name: string }>
    search: string
    status: FiscalDocumentStatusFilter
  },
) {
  const normalizedSearch = normalizeSearchText(filters.search)

  return documents.filter((document) => {
    const matchesStatus =
      filters.status === 'ALL' || document.status === filters.status

    return (
      matchesStatus &&
      (!normalizedSearch ||
        fiscalDocumentSearchText(document, sourceNumbers).includes(
          normalizedSearch,
        ) ||
        fiscalDocumentClientSearchText(document, filters.clients).includes(
          normalizedSearch,
        ))
    )
  })
}

function fiscalRequestSearchText(request: FiscalRequest) {
  return normalizeSearchText(
    [
      request.sourceNumber,
      request.sourceLabel,
      request.pendingLabel,
      request.clientName,
      request.operatorName,
      request.totalAmount,
      request.document?.documentType,
      request.document?.number,
      request.document?.series,
      request.document?.providerReference,
      request.document?.accessKey,
      request.document
        ? fiscalDocumentStatusLabel(request.document.status)
        : '',
      ...request.readinessIssues,
    ].join(' '),
  )
}

function fiscalDocumentSearchText(
  document: FiscalDocument,
  sourceNumbers: Map<string, string>,
) {
  const sourceNumber = sourceNumbers.get(
    `${document.sourceType}-${document.sourceId}`,
  )

  return normalizeSearchText(
    [
      document.documentType,
      document.number,
      document.series,
      document.provider,
      fiscalDocumentEnvironmentLabel(document.environment),
      fiscalDocumentStatusLabel(document.status),
      document.providerReference,
      document.accessKey,
      document.issuedByUserName,
      document.rejectionReason,
      document.cancellationReason,
      sourceNumber,
      fiscalSourceTypeLabel(document.sourceType),
    ].join(' '),
  )
}

function fiscalDocumentClientSearchText(
  document: FiscalDocument,
  clients: Map<string, { document: string | null; name: string }>,
) {
  const client = clients.get(`${document.sourceType}-${document.sourceId}`)

  return normalizeSearchText([client?.name, client?.document].join(' '))
}

function normalizeSearchText(value: string | number | null | undefined) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

function shortFiscalSourceId(sourceId: string) {
  return sourceId.slice(0, 8)
}

function fiscalSourceTypeLabel(sourceType: FiscalDocument['sourceType']) {
  const labels: Record<FiscalDocument['sourceType'], string> = {
    MANUAL_NFE: 'NF-e avulsa',
    PICKUP_RESERVATION: 'Retirada',
    SALE: 'Venda direta',
    SHIPPING_ORDER: 'Envio',
  }

  return labels[sourceType]
}

function FiscalDocumentClient({
  client,
}: {
  client: { document: string | null; name: string } | undefined
}) {
  return (
    <>
      <strong>{client?.name ?? 'Nao identificado'}</strong>
      <InlineNote>{client?.document ?? 'Sem CPF/CNPJ'}</InlineNote>
    </>
  )
}

function FiscalRequestAction({
  request,
  onIssuePickupReservationFiscalDocument,
  onIssueSaleFiscalDocument,
  onIssueShippingOrderFiscalDocument,
  onPreviewPickupReservationFiscalDocument,
  onPreviewSaleFiscalDocument,
  onPreviewShippingOrderFiscalDocument,
  onEditSaleFiscalDocument,
  onResolveFiscalPendency,
}: {
  request: FiscalRequest
  onIssuePickupReservationFiscalDocument: (
    reservation: PickupReservation,
    additionalInformation?: string,
  ) => void
  onIssueSaleFiscalDocument: (
    sale: Sale,
    additionalInformation?: string,
  ) => void
  onIssueShippingOrderFiscalDocument: (
    order: ShippingOrder,
    additionalInformation?: string,
  ) => void
  onPreviewPickupReservationFiscalDocument: (
    reservation: PickupReservation,
    additionalInformation?: string,
  ) => void
  onPreviewSaleFiscalDocument: (
    sale: Sale,
    additionalInformation?: string,
  ) => void
  onPreviewShippingOrderFiscalDocument: (
    order: ShippingOrder,
    additionalInformation?: string,
  ) => void
  onEditSaleFiscalDocument: (sale: Sale) => void
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
  const canEditSaleFiscalDocument =
    Boolean(request.sale) &&
    (!request.document ||
      request.document.status === 'PENDING' ||
      request.document.status === 'REJECTED')
  const menuActions: TableActionsMenuAction[] = []

  if (canEditSaleFiscalDocument) {
    menuActions.push({
      label: 'Editar ou adicionar observação',
      onSelect: () => onEditSaleFiscalDocument(request.sale as Sale),
    })
  }

  if (previewAction) {
    menuActions.push({
      label: 'Pré-visualizar',
      onSelect: () => previewAction(),
    })
  }

  if (action) {
    menuActions.push({
      label: fiscalRequestActionText(request),
      onSelect: () => action(),
    })
  }

  if (action && request.readinessIssues.length === 0) {
    return (
      <div className='inline-flex justify-end'>
        <TableActionsMenu actions={menuActions} />
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

  if (canEditSaleFiscalDocument) {
    return (
      <div className='grid justify-items-end gap-1'>
        <TableActionsMenu actions={menuActions} />
        <InlineNote>{fiscalRequestActionLabel(request, Boolean(action))}</InlineNote>
      </div>
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

function FiscalDocumentActions({
  document,
  onCancelFiscalDocument,
  onOpenFiscalDocumentSource,
  onSyncFiscalDocument,
}: {
  document: FiscalDocument
  onCancelFiscalDocument: (
    event: FormEvent<HTMLFormElement>,
    fiscalDocument: FiscalDocument,
  ) => void
  onOpenFiscalDocumentSource: (fiscalDocument: FiscalDocument) => void
  onSyncFiscalDocument: (fiscalDocument: FiscalDocument) => void
}) {
  const [showCancellationForm, setShowCancellationForm] = useState(false)

  if (document.status === 'CANCELLED') {
    return (
      <TableActionButton
        type='button'
        onClick={() => onOpenFiscalDocumentSource(document)}>
        Abrir origem
      </TableActionButton>
    )
  }

  if (document.status === 'REJECTED') {
    return (
      <div className='grid min-w-0 gap-2 justify-items-end'>
        <span className='text-sm text-[#5f665f]'>
          Corrija os dados fiscais e reemita pela fila.
        </span>
        <TableActionButton
          type='button'
          onClick={() => onOpenFiscalDocumentSource(document)}>
          Abrir origem
        </TableActionButton>
      </div>
    )
  }

  const actions: TableActionsMenuAction[] = [
    {
      label: 'Abrir origem',
      onSelect: () => onOpenFiscalDocumentSource(document),
    },
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
