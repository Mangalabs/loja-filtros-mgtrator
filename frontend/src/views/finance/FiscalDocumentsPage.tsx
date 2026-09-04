import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { ChevronDown, FileText, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import type {
  Client,
  ClientCompanyLookup,
  FiscalDocument,
  FiscalSettings,
  ManualFiscalDocumentInput,
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
    additionalInformation?: string,
  ) => void
  onIssueSaleFiscalDocument: (sale: Sale, additionalInformation?: string) => void
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
  onResolveFiscalPendency: (target: FiscalPendencyTarget) => void
}) {
  const [requestSearch, setRequestSearch] = useState('')
  const [requestReadinessFilter, setRequestReadinessFilter] =
    useState<FiscalRequestReadinessFilter>('ALL')
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
    usePaginatedRows<FiscalRequest>(filteredFiscalRequests, [
      requestReadinessFilter,
      requestSearch,
    ].join('|'))

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
  } = usePaginatedRows<FiscalDocument>(filteredFiscalDocuments, [
    documentSearch,
    documentStatusFilter,
  ].join('|'))

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

export function ManualFiscalDocumentPage({
  products,
  onIssueManualFiscalDocument,
  onLookupCompany,
  onPreviewManualFiscalDocument,
}: {
  products: Product[]
  onIssueManualFiscalDocument: (input: ManualFiscalDocumentInput) => void
  onLookupCompany: (cnpj: string) => Promise<ClientCompanyLookup>
  onPreviewManualFiscalDocument: (input: ManualFiscalDocumentInput) => void
}) {
  const [items, setItems] = useState<ManualFiscalItemForm[]>([
    emptyManualFiscalItem(),
  ])
  const [clientPersonType, setClientPersonType] =
    useState<ManualFiscalDocumentInput['client']['personType']>('PJ')
  const [
    clientStateRegistrationIndicator,
    setClientStateRegistrationIndicator,
  ] = useState<NonNullable<ManualFiscalDocumentInput['client']['stateRegistrationIndicator']>>(
    '9',
  )
  const [lookupState, setLookupState] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
  const [lookupValues, setLookupValues] = useState<
    Record<string, string | null>
  >({})

  function updateItem(index: number, input: Partial<ManualFiscalItemForm>) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...input } : item,
      ),
    )
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

  function submitManualFiscalDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const action = String(form.get('manualFiscalAction') ?? 'preview')
    const input = manualFiscalDocumentInput(form, items)

    if (action === 'issue') {
      onIssueManualFiscalDocument(input)
      return
    }

    onPreviewManualFiscalDocument(input)
  }

  return (
    <section className='grid min-w-0 gap-4'>
      <PagePanel className='min-w-0'>
        <PageHeader
          description='Preenchimento manual sem venda vinculada.'
          icon={<FileText size={18} />}
          title='NF-e avulsa / devolução'
        />
        <form className='grid gap-4' onSubmit={submitManualFiscalDocument}>
          <div className='grid gap-3 md:grid-cols-3'>
            <TextField
              defaultValue='RETURN'
              label='Finalidade'
              name='manualFiscalPurpose'
              select
              required>
              <MenuItem value='RETURN'>Devolução</MenuItem>
              <MenuItem value='NORMAL'>Normal</MenuItem>
            </TextField>
            <TextField
              defaultValue='ENTRY'
              label='Tipo da nota'
              name='manualFiscalOperationType'
              select
              required>
              <MenuItem value='ENTRY'>Entrada</MenuItem>
              <MenuItem value='EXIT'>Saída</MenuItem>
            </TextField>
            <TextField
              defaultValue='Devolucao de mercadoria'
              label='Natureza da operação'
              name='manualFiscalNatureOperation'
              required
            />
          </div>
          <TextField
            helperText='Obrigatória para devolução.'
            label='Chave da NF-e referenciada'
            name='manualFiscalReferencedAccessKey'
          />

          <div className='grid gap-3 border-t border-[#e4e9e5] pt-4'>
            <strong className='text-[#2c281e]'>Destinatário / remetente</strong>
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
                  updateClientField('manualFiscalClientName', event.target.value)
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
                  updateClientField('manualFiscalClientPhone', event.target.value)
                }
              />
              <TextField
                label='Email'
                name='manualFiscalClientEmail'
                type='email'
                value={clientFieldValue('manualFiscalClientEmail')}
                onChange={(event) =>
                  updateClientField('manualFiscalClientEmail', event.target.value)
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
                onClick={() => setItems((currentItems) => [...currentItems, emptyManualFiscalItem()])}>
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
                        currentItems.filter((_currentItem, itemIndex) => itemIndex !== index),
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
                    onChange={(event) => updateItem(index, { productName: event.target.value })}
                  />
                  <TextField
                    label='Código'
                    value={item.productInternalCode}
                    onChange={(event) =>
                      updateItem(index, { productInternalCode: event.target.value })
                    }
                  />
                  <TextField
                    label='NCM'
                    value={item.productNcm}
                    onChange={(event) => updateItem(index, { productNcm: event.target.value })}
                  />
                  <TextField
                    label='CFOP'
                    value={item.productCfop}
                    onChange={(event) => updateItem(index, { productCfop: event.target.value })}
                  />
                  <TextField
                    label='Origem'
                    value={item.productOrigin}
                    onChange={(event) => updateItem(index, { productOrigin: event.target.value })}
                  />
                  <TextField
                    label='CST ICMS'
                    value={item.productIcmsCst}
                    onChange={(event) => updateItem(index, { productIcmsCst: event.target.value })}
                  />
                  <TextField
                    label='CST PIS'
                    value={item.productPisCst}
                    onChange={(event) => updateItem(index, { productPisCst: event.target.value })}
                  />
                  <TextField
                    label='CST COFINS'
                    value={item.productCofinsCst}
                    onChange={(event) =>
                      updateItem(index, { productCofinsCst: event.target.value })
                    }
                  />
                  <TextField
                    label='Unidade'
                    value={item.productUnit}
                    onChange={(event) => updateItem(index, { productUnit: event.target.value })}
                  />
                  <TextField
                    label='Quantidade'
                    required
                    type='number'
                    value={item.quantity}
                    onChange={(event) => updateItem(index, { quantity: event.target.value })}
                    slotProps={{ htmlInput: { min: '0.001', step: '0.001' } }}
                  />
                  <TextField
                    label='Valor unitário'
                    required
                    type='number'
                    value={item.unitPrice}
                    onChange={(event) => updateItem(index, { unitPrice: event.target.value })}
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
            label='Observações no rodapé'
            multiline
            minRows={3}
            name='manualFiscalAdditionalInformation'
          />
          <div className='flex flex-wrap justify-end gap-2'>
            <Button name='manualFiscalAction' type='submit' value='preview' variant='outlined'>
              Pré-visualizar DANFE
            </Button>
            <Button name='manualFiscalAction' type='submit' value='issue' variant='contained'>
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

function manualFiscalDocumentInput(
  form: FormData,
  items: ManualFiscalItemForm[],
): ManualFiscalDocumentInput {
  const referencedAccessKey = onlyDigits(
    formText(form, 'manualFiscalReferencedAccessKey'),
  )

  return {
    documentType: 'NFE',
    operationType: formText(form, 'manualFiscalOperationType') as
      | 'ENTRY'
      | 'EXIT',
    purpose: formText(form, 'manualFiscalPurpose') as 'NORMAL' | 'RETURN',
    natureOperation: formText(form, 'manualFiscalNatureOperation'),
    referencedAccessKeys: referencedAccessKey ? [referencedAccessKey] : [],
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
      addressState: formText(form, 'manualFiscalClientAddressState').toUpperCase(),
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

const manualFiscalLookupStatusLabel = {
  idle: 'Digite um CNPJ para buscar os dados.',
  loading: 'Consultando CNPJ...',
  success: 'Dados encontrados. Revise antes de emitir.',
  error: 'Não foi possível buscar este CNPJ.',
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

function manualFiscalClientPersonTypeValue(
  value: string,
): ManualFiscalDocumentInput['client']['personType'] {
  const values: Record<string, ManualFiscalDocumentInput['client']['personType']> =
    {
      ES: 'ES',
      PF: 'PF',
      PJ: 'PJ',
    }

  return values[value] ?? 'PJ'
}

function manualFiscalClientStateRegistrationIndicatorValue(
  value: string,
): NonNullable<ManualFiscalDocumentInput['client']['stateRegistrationIndicator']> {
  const values: Record<
    string,
    NonNullable<ManualFiscalDocumentInput['client']['stateRegistrationIndicator']>
  > = {
    '1': '1',
    '2': '2',
    '9': '9',
  }

  return values[value] ?? '9'
}

function formText(form: FormData, field: string) {
  return String(form.get(field) ?? '').trim()
}

function nullableFormText(form: FormData, field: string) {
  return formText(form, field) || null
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
      request.document ? fiscalDocumentStatusLabel(request.document.status) : '',
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
  onResolveFiscalPendency,
}: {
  request: FiscalRequest
  onIssuePickupReservationFiscalDocument: (
    reservation: PickupReservation,
    additionalInformation?: string,
  ) => void
  onIssueSaleFiscalDocument: (sale: Sale, additionalInformation?: string) => void
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
  onResolveFiscalPendency: (target: FiscalPendencyTarget) => void
}) {
  const [additionalInformation, setAdditionalInformation] = useState('')
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
      <div className='grid min-w-0 gap-2'>
        <TextField
          label='Observações no rodapé da NF-e'
          multiline
          maxRows={3}
          onChange={(event) => setAdditionalInformation(event.target.value)}
          size='small'
          slotProps={{ htmlInput: { maxLength: 5000 } }}
          value={additionalInformation}
        />
        <div className='flex flex-wrap justify-end gap-2'>
          {previewAction ? (
            <TableActionButton
              type='button'
              onClick={() => previewAction(additionalInformation)}>
              Pré-visualizar
            </TableActionButton>
          ) : null}
          <TableActionButton
            type='button'
            onClick={() => action(additionalInformation)}>
            {fiscalRequestActionText(request)}
          </TableActionButton>
        </div>
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
