import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import {
  ClipboardPaste,
  Copy,
  FilePlus2,
  Layers3,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type {
  QuoteFormDraft,
  QuoteFormDraftBatchRequest,
} from '../../api'
import {
  PageHeader,
  PagePanel,
  ResponsiveTable,
} from '../../components/layout'
import {
  PrimaryButton,
  SecondaryButton,
  StatusChip,
  TableActionButton,
  TableActionsMenu,
} from '../../components/ui'
import { usePaginatedRows } from '../../hooks/usePaginatedRows'
import { formatCurrency, formatDateTime } from '../../utils/format'
import {
  normalizeQuoteFormDraftPayload,
  type QuoteFormDraftPayload,
} from './QuotesPage'

type DraftReadinessFilter = 'ALL' | 'INCOMPLETE' | 'READY'

const quoteBatchPlaceholder = [
  'João Ferreira - 2x SM-JD6110-COMB-P 1x filtro de ar externo 6110',
  'Maria Oliveira - 1x filtro combustível MF 4292; 1x filtro de ar Donaldson',
  'Oficina Central Tratores',
].join('\n')
const quoteBatchQuantityFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 3,
})

type QuoteBatchRow = {
  draft: QuoteFormDraft
  issues: string[]
  payload: QuoteFormDraftPayload
  ready: boolean
  selectedItemsCount: number
}

export function QuoteBatchWorkspace({
  drafts,
  onCreateDraftBatch,
  onDeleteDraft,
  onDuplicateDraft,
  onNewQuote,
  onOpenDraft,
}: {
  drafts: QuoteFormDraft[]
  onCreateDraftBatch: (
    requests: QuoteFormDraftBatchRequest[],
  ) => Promise<boolean>
  onDeleteDraft: (draft: QuoteFormDraft) => Promise<boolean | void>
  onDuplicateDraft: (
    payload: QuoteFormDraftPayload,
  ) => Promise<boolean | void>
  onNewQuote: () => void
  onOpenDraft: (draft: QuoteFormDraft) => void
}) {
  const [search, setSearch] = useState('')
  const [readiness, setReadiness] = useState<DraftReadinessFilter>('ALL')
  const [batchInput, setBatchInput] = useState('')
  const [batchFormOpen, setBatchFormOpen] = useState(false)
  const [creatingBatch, setCreatingBatch] = useState(false)
  const batchRequests = useMemo(
    () => quoteBatchRequests(batchInput),
    [batchInput],
  )
  const batchHasLongRequest = batchRequests.some(
    (request) =>
      request.requestLabel.length > 180 ||
      request.items.some((item) => item.description.length > 500),
  )
  const batchHasTooManyItems = batchRequests.some(
    (request) => request.items.length > 20,
  )
  const batchExceedsLimit = batchRequests.length > 20
  const rows = useMemo(
    () => drafts.map(quoteBatchRow),
    [drafts],
  )
  const filteredRows = useMemo(
    () => filterQuoteBatchRows(rows, search, readiness),
    [readiness, rows, search],
  )
  const { pagination, visibleItems } = usePaginatedRows(
    filteredRows,
    `${search}|${readiness}`,
  )
  const readyCount = rows.filter((row) => row.ready).length

  return (
    <PagePanel wide>
      <PageHeader
        actions={
          <div className='flex flex-wrap gap-2'>
            <SecondaryButton
              icon={<ClipboardPaste size={17} />}
              onClick={() => setBatchFormOpen((current) => !current)}>
              Adicionar lote
            </SecondaryButton>
            <PrimaryButton icon={<FilePlus2 size={17} />} onClick={onNewQuote}>
              Novo orçamento
            </PrimaryButton>
          </div>
        }
        description={`${drafts.length} solicitação(ões) em andamento · ${readyCount} pronta(s) para revisão.`}
        icon={<Layers3 size={18} />}
        title='Central de orçamentos em lote'
      />

      {batchFormOpen ? (
        <form
          className='mb-5 grid gap-3 rounded-xl border border-[#dfe5e1] bg-[#f8faf9] p-4'
          onSubmit={(event) => {
            event.preventDefault()
            void createDraftBatch()
          }}>
          <div>
            <h3 className='font-semibold text-[#1f2937]'>
              Nova fila de solicitações
            </h3>
            <p className='mt-1 text-sm text-[#5f665f]'>
              Use uma solicitação por linha no formato “Cliente - 2x código ou
              título 1x outro produto”. O ponto e vírgula é opcional; uma nova
              quantidade também inicia outro item.
            </p>
          </div>
          <TextField
            error={
              batchExceedsLimit ||
              batchHasLongRequest ||
              batchHasTooManyItems
            }
            helperText={batchInputHelperText(
              batchRequests,
              batchExceedsLimit,
              batchHasLongRequest,
              batchHasTooManyItems,
            )}
            label='Solicitações do lote'
            minRows={5}
            multiline
            placeholder={quoteBatchPlaceholder}
            value={batchInput}
            onChange={(event) => setBatchInput(event.target.value)}
          />
          {batchRequests.length > 0 ? (
            <div
              aria-live='polite'
              className='grid gap-3 rounded-xl border border-[#dfe5e1] bg-white p-3'>
              <div>
                <strong className='text-sm'>Prévia do lote</strong>
                <p className='mt-0.5 text-xs text-[#5f665f]'>
                  Confira como cada linha será transformada antes de criar a
                  fila.
                </p>
              </div>
              <div className='grid gap-2'>
                {batchRequests.map((request, requestIndex) => (
                  <div
                    className='grid gap-2 rounded-lg border border-[#e6eae7] bg-[#f8faf9] p-3'
                    key={`${requestIndex}-${request.requestLabel}`}>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <strong className='text-sm'>{request.requestLabel}</strong>
                      <StatusChip
                        label={`${request.items.length} item(ns)`}
                        tone={request.items.length > 0 ? 'success' : 'neutral'}
                      />
                    </div>
                    {request.items.length > 0 ? (
                      <ol className='grid gap-1 text-sm text-[#40524a]'>
                        {request.items.map((item, itemIndex) => (
                          <li
                            className='grid grid-cols-[auto_minmax(0,1fr)] gap-2'
                            key={`${itemIndex}-${item.description}`}>
                            <span className='font-semibold'>
                              {formatBatchQuantity(item.quantity)}x
                            </span>
                            <span className='break-words'>
                              {item.description}
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className='text-xs text-[#5f665f]'>
                        Sem produtos informados; o orçamento abrirá com um item
                        vazio para preenchimento manual.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className='flex flex-wrap justify-end gap-2'>
            <SecondaryButton
              disabled={creatingBatch}
              type='button'
              onClick={() => {
                setBatchFormOpen(false)
                setBatchInput('')
              }}>
              Cancelar
            </SecondaryButton>
            <PrimaryButton
              disabled={
                creatingBatch ||
                batchRequests.length === 0 ||
                batchExceedsLimit ||
                batchHasLongRequest ||
                batchHasTooManyItems
              }
              type='submit'>
              {creatingBatch
                ? 'Criando solicitações…'
                : `Criar ${batchRequests.length || ''} solicitação(ões)`}
            </PrimaryButton>
          </div>
        </form>
      ) : null}

      <div className='mb-5 grid gap-3 md:grid-cols-[minmax(16rem,1fr)_14rem]'>
        <TextField
          label='Pesquisar solicitação'
          placeholder='Cliente, observação ou item'
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <TextField
          label='Situação do rascunho'
          select
          value={readiness}
          onChange={(event) =>
            setReadiness(event.target.value as DraftReadinessFilter)
          }>
          <MenuItem value='ALL'>Todas</MenuItem>
          <MenuItem value='READY'>Prontas para revisar</MenuItem>
          <MenuItem value='INCOMPLETE'>Incompletas</MenuItem>
        </TextField>
      </div>

      <ResponsiveTable
        columns={[
          {
            header: 'Solicitação',
            render: (row) => (
              <div className='grid gap-1'>
                <strong>
                  {row.payload.requestLabel ||
                    row.payload.clientName ||
                    'Solicitação sem identificação'}
                </strong>
                {row.payload.requestLabel ? (
                  <span className='text-xs text-[#5f665f]'>
                    {row.payload.clientName ?? 'Cliente ainda não informado'}
                  </span>
                ) : null}
                <span className='text-xs text-[#5f665f]'>
                  Atualizada em {formatDateTime(row.draft.updatedAt)}
                </span>
              </div>
            ),
          },
          {
            align: 'right',
            header: 'Itens',
            render: (row) =>
              `${row.selectedItemsCount}/${row.payload.items.length}`,
          },
          {
            align: 'right',
            header: 'Total estimado',
            render: (row) => formatCurrency(row.payload.totalAmount),
          },
          {
            header: 'Situação',
            render: (row) => (
              <div className='grid gap-1.5'>
                <div>
                  <StatusChip
                    label={row.ready ? 'Pronto para revisar' : 'Incompleto'}
                    tone={row.ready ? 'success' : 'neutral'}
                  />
                </div>
                {row.issues.length > 0 ? (
                  <span className='max-w-64 text-xs text-[#5f665f]'>
                    Falta: {row.issues.join(' · ')}
                  </span>
                ) : null}
              </div>
            ),
          },
          {
            align: 'right',
            header: 'Ações',
            render: (row) => (
              <div className='flex flex-wrap justify-end gap-2'>
                <TableActionButton
                  type='button'
                  onClick={() => onOpenDraft(row.draft)}>
                  {row.ready ? 'Revisar' : 'Continuar'}
                </TableActionButton>
                <TableActionsMenu
                  actions={[
                    {
                      icon: <Copy size={15} />,
                      label: 'Duplicar solicitação',
                      onSelect: () => void onDuplicateDraft(row.payload),
                    },
                    {
                      icon: <Trash2 size={15} />,
                      label: 'Excluir rascunho',
                      onSelect: () => void onDeleteDraft(row.draft),
                    },
                  ]}
                />
              </div>
            ),
          },
        ]}
        emptyMessage={
          drafts.length === 0
            ? 'Adicione um lote ou salve um orçamento como rascunho para iniciar sua fila.'
            : 'Nenhuma solicitação encontrada para os filtros informados.'
        }
        getRowId={(row) => row.draft.id}
        items={visibleItems}
        pagination={pagination}
      />
    </PagePanel>
  )

  async function createDraftBatch() {
    if (
      creatingBatch ||
      batchRequests.length === 0 ||
      batchExceedsLimit ||
      batchHasLongRequest ||
      batchHasTooManyItems
    ) {
      return
    }

    setCreatingBatch(true)

    try {
      const created = await onCreateDraftBatch(batchRequests)

      if (created) {
        setBatchInput('')
        setBatchFormOpen(false)
      }
    } finally {
      setCreatingBatch(false)
    }
  }
}

function quoteBatchRow(draft: QuoteFormDraft): QuoteBatchRow {
  const payload = normalizeQuoteFormDraftPayload(draft.payload)
  const selectedItemsCount = payload.items.filter(
    (item) => item.productId,
  ).length
  const issues = quoteBatchIssues(payload, selectedItemsCount)
  const ready = issues.length === 0

  return { draft, issues, payload, ready, selectedItemsCount }
}

function quoteBatchIssues(
  payload: QuoteFormDraftPayload,
  selectedItemsCount: number,
) {
  const issues: string[] = []

  if (!payload.clientId) {
    issues.push('vincular cliente')
  }

  if (!payload.payments.some((payment) => payment.paymentMethodId)) {
    issues.push('informar pagamento')
  }

  if (payload.items.length === 0) {
    issues.push('adicionar itens')
  } else if (selectedItemsCount < payload.items.length) {
    const pendingItemsCount = payload.items.length - selectedItemsCount

    issues.push(
      `vincular ${pendingItemsCount} produto${pendingItemsCount === 1 ? '' : 's'}`,
    )
  }

  return issues
}

function filterQuoteBatchRows(
  rows: QuoteBatchRow[],
  search: string,
  readiness: DraftReadinessFilter,
) {
  const normalizedSearch = normalizeSearch(search)

  return rows.filter((row) => {
    const matchesReadiness =
      readiness === 'ALL' ||
      (readiness === 'READY' ? row.ready : !row.ready)
    const searchText = normalizeSearch(
      [
        row.draft.title,
        row.payload.clientName,
        row.payload.notes,
        ...row.payload.items.map((item) => item.description),
      ].join(' '),
    )

    return (
      matchesReadiness &&
      (!normalizedSearch || searchText.includes(normalizedSearch))
    )
  })
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

function quoteBatchRequests(value: string) {
  return value
    .split(/\r?\n/)
    .map(parseQuoteBatchRequest)
    .filter(
      (request): request is QuoteFormDraftBatchRequest => Boolean(request),
    )
}

function parseQuoteBatchRequest(
  value: string,
): QuoteFormDraftBatchRequest | null {
  const request = value.trim()

  if (!request) {
    return null
  }

  const separator = request.match(/\s+(?:[—–-]|\|)\s+/u)

  if (!separator || separator.index === undefined) {
    return { requestLabel: request, items: [] }
  }

  const requestLabel = request.slice(0, separator.index).trim()
  const itemList = request
    .slice(separator.index + separator[0].length)
    .split(
      /\s*;\s*|(?=\s+\d+(?:[.,]\d+)?\s*(?:x|un(?:id(?:ade)?s?)?\.?)\s+)/i,
    )
    .map(parseQuoteBatchItem)
    .filter((item): item is QuoteFormDraftBatchRequest['items'][number] =>
      Boolean(item),
    )

  return requestLabel
    ? { requestLabel, items: itemList }
    : null
}

function parseQuoteBatchItem(
  value: string,
): QuoteFormDraftBatchRequest['items'][number] | null {
  const item = value.trim()

  if (!item || quoteBatchQuantityOnlyPattern.test(item)) {
    return null
  }

  const quantityMatch = item.match(
    /^(\d+(?:[.,]\d+)?)\s*(?:x|un(?:id(?:ade)?s?)?\.?)\s+(.+)$/i,
  )
  const quantity = Number(quantityMatch?.[1]?.replace(',', '.') ?? 1)
  const description = quantityMatch?.[2]?.trim() ?? item

  return {
    description,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
  }
}

const quoteBatchQuantityOnlyPattern =
  /^\d+(?:[.,]\d+)?\s*(?:x|un(?:id(?:ade)?s?)?\.?)$/i

function formatBatchQuantity(quantity: number) {
  return quoteBatchQuantityFormatter.format(quantity)
}

function batchInputHelperText(
  requests: QuoteFormDraftBatchRequest[],
  exceedsLimit: boolean,
  hasLongRequest: boolean,
  hasTooManyItems: boolean,
) {
  if (exceedsLimit) {
    return 'O limite é de 20 solicitações por lote.'
  }

  if (hasLongRequest) {
    return 'O cliente pode ter até 180 caracteres e cada item até 500.'
  }

  if (hasTooManyItems) {
    return 'Cada solicitação pode ter no máximo 20 itens.'
  }

  const itemCount = requests.reduce(
    (total, request) => total + request.items.length,
    0,
  )

  return `${requests.length} de 20 solicitações · ${itemCount} item(ns) identificados.`
}
