import { UserRoundSearch } from 'lucide-react'
import { useMemo } from 'react'
import type { Client } from '../../api'
import { StatusChip, TableActionButton } from '../../components/ui'

type ClientMatch = {
  client: Client
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  reason: string
  score: number
}

export function QuoteClientSuggestions({
  clients,
  query,
  selectedClientId,
  onSelect,
}: {
  clients: Client[]
  query: string
  selectedClientId: string
  onSelect: (client: Client) => void
}) {
  const matches = useMemo(
    () => matchClients(query, clients),
    [clients, query],
  )

  if (selectedClientId || matches.length === 0) {
    return null
  }

  return (
    <div className='grid gap-3 rounded-xl border border-[#dfe5e1] bg-[#f8faf9] p-3'>
      <div className='flex items-start gap-2'>
        <UserRoundSearch className='mt-0.5 shrink-0 text-[#40524a]' size={18} />
        <div>
          <strong className='text-sm'>Possíveis clientes cadastrados</strong>
          <p className='mt-0.5 text-xs text-[#5f665f]'>
            Confirme o cadastro correto para vincular o orçamento ao histórico
            do cliente.
          </p>
        </div>
      </div>
      <div className='grid gap-2'>
        {matches.map((match) => (
          <div
            className='grid gap-2 rounded-lg border border-[#dfe5e1] bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'
            key={match.client.id}>
            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-2'>
                <strong className='truncate text-sm'>{match.client.name}</strong>
                <StatusChip {...confidenceChip(match.confidence)} />
              </div>
              <p className='mt-1 text-xs text-[#5f665f]'>
                {[match.client.document, match.client.phone, match.reason]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <TableActionButton
              type='button'
              onClick={() => onSelect(match.client)}>
              Vincular cliente
            </TableActionButton>
          </div>
        ))}
      </div>
    </div>
  )
}

function matchClients(query: string, clients: Client[]): ClientMatch[] {
  const normalizedQuery = normalizeClientText(query)
  const leadingName = normalizeClientText(
    query.split(/\s+(?:—|–|-|:)\s+/u, 1)[0] ?? query,
  )
  const queryDigits = query.replace(/\D/g, '')
  const tokens = [...new Set(leadingName.split(' '))].filter(
    (token) => token.length >= 3 && !clientStopWords.has(token),
  )

  if (!normalizedQuery || (tokens.length === 0 && queryDigits.length < 4)) {
    return []
  }

  return clients
    .map((client) =>
      rankClientMatch(client, {
        leadingName,
        queryDigits,
        tokens,
      }),
    )
    .filter((match): match is ClientMatch => Boolean(match))
    .sort(
      (current, next) =>
        next.score - current.score ||
        current.client.name.localeCompare(next.client.name, 'pt-BR'),
    )
    .slice(0, 3)
}

function rankClientMatch(
  client: Client,
  query: {
    leadingName: string
    queryDigits: string
    tokens: string[]
  },
): ClientMatch | null {
  const name = normalizeClientText(client.name)
  const document = (client.document ?? '').replace(/\D/g, '')
  const phone = (client.phone ?? '').replace(/\D/g, '')
  const exactDocument =
    query.queryDigits.length >= 8 && document === query.queryDigits
  const exactPhone = query.queryDigits.length >= 8 && phone === query.queryDigits
  const exactName = name === query.leadingName
  const startsWithName =
    name.startsWith(`${query.leadingName} `) ||
    query.leadingName.startsWith(`${name} `)
  const matchingTokens = query.tokens.filter((token) => name.includes(token))

  if (
    !exactDocument &&
    !exactPhone &&
    !exactName &&
    !startsWithName &&
    matchingTokens.length === 0
  ) {
    return null
  }

  const tokenCoverage = query.tokens.length
    ? matchingTokens.length / query.tokens.length
    : 0
  const score =
    (exactDocument ? 1_100 : 0) +
    (exactPhone ? 1_050 : 0) +
    (exactName ? 1_000 : 0) +
    (startsWithName ? 750 : 0) +
    Math.round(tokenCoverage * 500)
  const confidence =
    exactDocument || exactPhone || exactName || score >= 900
      ? 'HIGH'
      : score >= 450
        ? 'MEDIUM'
        : 'LOW'
  const reason = exactDocument
    ? 'Documento correspondente'
    : exactPhone
      ? 'Telefone correspondente'
      : exactName
        ? 'Nome exato'
        : `${matchingTokens.length} termo(s) do nome encontrado(s)`

  return { client, confidence, reason, score }
}

function normalizeClientText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function confidenceChip(confidence: ClientMatch['confidence']) {
  if (confidence === 'HIGH') {
    return { label: 'Alta compatibilidade', tone: 'success' as const }
  }

  if (confidence === 'MEDIUM') {
    return { label: 'Média compatibilidade', tone: 'warning' as const }
  }

  return { label: 'Possível opção', tone: 'neutral' as const }
}

const clientStopWords = new Set([
  'cliente',
  'orcamento',
  'pedido',
  'revisao',
  'solicitacao',
])
