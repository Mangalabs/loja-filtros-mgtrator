import Alert from '@mui/material/Alert'
import { BookPlus, Sparkles, Unlink } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  apiGet,
  type ApiResult,
  type Product,
  type QuoteProductMatch,
} from '../../api'
import {
  SecondaryButton,
  StatusChip,
  TableActionButton,
} from '../../components/ui'
import { formatCurrency, formatQuantity } from '../../utils/format'
import { productDisplayName } from '../../utils/productDisplay'

type QuoteProductSuggestionsProps = {
  batchLoading?: boolean
  batchResult?: {
    matches: QuoteProductMatch[]
    query: string
  }
  query: string
  selectedProductId: string
  onRememberAlias: (productId: string, alias: string) => Promise<boolean>
  onRemoveAlias: (id: string, alias: string) => Promise<boolean>
  onSelect: (product: Product) => void
}

export function QuoteProductSuggestions({
  batchLoading = false,
  batchResult,
  query,
  selectedProductId,
  onRememberAlias,
  onRemoveAlias,
  onSelect,
}: QuoteProductSuggestionsProps) {
  const [matches, setMatches] = useState<QuoteProductMatch[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [pendingAliasAction, setPendingAliasAction] = useState<string>()
  const requestSequence = useRef(0)
  const normalizedQuery = query.trim()
  const hasMatchingBatchResult =
    batchResult?.query.trim() === normalizedQuery

  useEffect(() => {
    requestSequence.current += 1
    setMatches([])
    setSearched(false)
    setLoading(false)
    setError(false)
  }, [normalizedQuery])

  useEffect(() => {
    if (!hasMatchingBatchResult) {
      return
    }

    requestSequence.current += 1
    setMatches(batchResult.matches)
    setSearched(true)
    setLoading(false)
    setError(false)
  }, [batchResult, hasMatchingBatchResult, normalizedQuery])

  useEffect(() => {
    if (
      normalizedQuery.length < 2 ||
      selectedProductId ||
      batchLoading ||
      hasMatchingBatchResult
    ) {
      return
    }

    const timeout = window.setTimeout(() => {
      void searchMatches()
    }, 400)

    return () => window.clearTimeout(timeout)
  }, [
    batchLoading,
    hasMatchingBatchResult,
    normalizedQuery,
    selectedProductId,
  ])

  if (normalizedQuery.length < 2 || selectedProductId) {
    return null
  }

  async function searchMatches() {
    const sequence = requestSequence.current + 1
    requestSequence.current = sequence
    setLoading(true)
    setError(false)

    try {
      const params = new URLSearchParams({
        query: normalizedQuery,
        limit: '3',
      })
      const result = await apiGet<ApiResult<QuoteProductMatch[]>>(
        `/quotes/product-matches?${params.toString()}`,
      )

      if (requestSequence.current === sequence) {
        setMatches(result.data)
        setSearched(true)
      }
    } catch {
      if (requestSequence.current === sequence) {
        setError(true)
      }
    } finally {
      if (requestSequence.current === sequence) {
        setLoading(false)
      }
    }
  }

  return (
    <div className='grid gap-3 rounded-xl border border-[#dfe5e1] bg-[#f8faf9] p-3'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <strong className='text-sm'>Smart Match</strong>
          <p className='mt-0.5 text-xs text-[#5f665f]'>
            Compara o texto recebido com códigos interno, de barras e do
            fornecedor, nome e fabricante. A descrição do cadastro é usada
            somente quando existir. Termos lembrados pela equipe também entram
            nas próximas buscas desta filial.
          </p>
        </div>
        <SecondaryButton
          disabled={loading || batchLoading}
          icon={<Sparkles size={16} />}
          type='button'
          onClick={() => void searchMatches()}>
          {loading || batchLoading
            ? 'Comparando…'
            : searched
              ? 'Comparar novamente'
              : 'Buscar novamente'}
        </SecondaryButton>
      </div>

      {error ? (
        <Alert severity='error'>
          Não foi possível buscar sugestões. Tente novamente.
        </Alert>
      ) : null}

      {searched && matches.length === 0 ? (
        <Alert severity='info'>Nenhum produto compatível foi encontrado.</Alert>
      ) : null}

      {matches.length > 0 ? (
        <div className='grid gap-2'>
          {matches.map((match) => (
            <div
              className='grid gap-2 rounded-lg border border-[#dfe5e1] bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'
              key={match.product.id}>
              <div className='min-w-0'>
                <div className='flex flex-wrap items-center gap-2'>
                  <strong className='truncate text-sm'>
                    {productDisplayName(match.product)}
                  </strong>
                  <StatusChip {...confidenceChip(match.confidence)} />
                </div>
                <p className='mt-1 text-xs text-[#5f665f]'>
                  {productDetails(match.product)}
                </p>
                <p className='mt-1 text-xs text-[#5f665f]'>
                  {match.reasons.join(' · ')}
                </p>
              </div>
              <div className='flex flex-wrap justify-end gap-2'>
                <TableActionButton
                  type='button'
                  onClick={() => onSelect(match.product)}>
                  Usar produto
                </TableActionButton>
                {match.matchedAlias ? (
                  <TableActionButton
                    disabled={Boolean(pendingAliasAction)}
                    icon={<Unlink size={15} />}
                    type='button'
                    onClick={() => void removeAlias(match)}>
                    {pendingAliasAction === `remove-${match.matchedAlias.id}`
                      ? 'Removendo…'
                      : 'Remover termo salvo'}
                  </TableActionButton>
                ) : normalizedQuery.length <= 180 ? (
                  <TableActionButton
                    disabled={Boolean(pendingAliasAction)}
                    icon={<BookPlus size={15} />}
                    type='button'
                    onClick={() => void rememberAlias(match)}>
                    {pendingAliasAction === `remember-${match.product.id}`
                      ? 'Salvando termo…'
                      : 'Usar e lembrar termo'}
                  </TableActionButton>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )

  async function rememberAlias(match: QuoteProductMatch) {
    const actionKey = `remember-${match.product.id}`

    setPendingAliasAction(actionKey)
    try {
      if (await onRememberAlias(match.product.id, normalizedQuery)) {
        onSelect(match.product)
      }
    } finally {
      setPendingAliasAction(undefined)
    }
  }

  async function removeAlias(match: QuoteProductMatch) {
    if (!match.matchedAlias) {
      return
    }

    setPendingAliasAction(`remove-${match.matchedAlias.id}`)
    try {
      if (await onRemoveAlias(match.matchedAlias.id, match.matchedAlias.alias)) {
        await searchMatches()
      }
    } finally {
      setPendingAliasAction(undefined)
    }
  }
}

function confidenceChip(confidence: QuoteProductMatch['confidence']) {
  if (confidence === 'HIGH') {
    return { label: 'Alta compatibilidade', tone: 'success' as const }
  }

  if (confidence === 'MEDIUM') {
    return { label: 'Média compatibilidade', tone: 'warning' as const }
  }

  return { label: 'Possível opção', tone: 'neutral' as const }
}

function productDetails(product: Product) {
  return [
    product.internalCode ? `Código ${product.internalCode}` : null,
    product.brandName ? `Fabricante ${product.brandName}` : null,
    `Preço ${formatCurrency(product.salePrice)}`,
    `Disponível ${formatQuantity(product.availableStock)}`,
  ]
    .filter(Boolean)
    .join(' · ')
}
