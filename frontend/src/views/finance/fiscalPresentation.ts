import type { FiscalDocument } from '../../api'
import type { StatusTone } from '../../components/ui'
import { formatDateTime } from '../../utils/format'

export function fiscalDocumentSourceLabel(
  sourceType: FiscalDocument['sourceType'],
) {
  return fiscalDocumentSourceLabels[sourceType]
}

export function fiscalDocumentEnvironmentLabel(
  environment: FiscalDocument['environment'],
) {
  return fiscalDocumentEnvironmentLabels[environment]
}

export function fiscalDocumentStatusLabel(status: FiscalDocument['status']) {
  return fiscalDocumentStatusPresentations[status].label
}

export function fiscalDocumentStatusTone(
  status: FiscalDocument['status'],
): StatusTone {
  return fiscalDocumentStatusPresentations[status].tone
}

export function fiscalDocumentStatusDetail(document: FiscalDocument) {
  const detailByStatus: Partial<Record<FiscalDocument['status'], string | null>> =
    {
      AUTHORIZED: document.rejectionReason,
      CANCELLED: document.cancellationReason,
      PROCESSING: document.cancellationReason,
      REJECTED: document.rejectionReason,
    }

  return detailByStatus[document.status] ?? null
}

export function fiscalDocumentAuditDetail(document: FiscalDocument) {
  const detailByStatus: Partial<Record<FiscalDocument['status'], string | null>> =
    {
      CANCELLED:
        document.cancelledByUserName && document.cancelledAt
          ? `Cancelada por ${document.cancelledByUserName} em ${formatDateTime(document.cancelledAt)}`
          : null,
      PROCESSING:
        document.cancelledByUserName && document.cancellationReason
          ? `Cancelamento solicitado por ${document.cancelledByUserName}`
          : null,
    }

  return detailByStatus[document.status] ?? null
}

export function fiscalReadinessIssueLabel(issue: string) {
  return (
    fiscalReadinessIssueLabelPatterns.find(({ pattern }) =>
      pattern.test(issue),
    )?.label ?? issue
  )
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

const fiscalReadinessIssueLabelPatterns = [
  { label: 'Configuracao fiscal', pattern: /configuracao fiscal/i },
  { label: 'CNPJ da loja', pattern: /cnpj fiscal da loja/i },
  { label: 'Producao bloqueada', pattern: /producao bloqueada/i },
  { label: 'Cliente cadastrado', pattern: /cliente deve estar cadastrado/i },
  { label: 'Nome cliente', pattern: /nome do cliente/i },
  { label: 'CPF/CNPJ cliente', pattern: /cpf\/cnpj/i },
  { label: 'Logradouro cliente', pattern: /logradouro/i },
  { label: 'Numero cliente', pattern: /numero do cliente/i },
  { label: 'Bairro cliente', pattern: /bairro/i },
  { label: 'Cidade cliente', pattern: /cidade/i },
  { label: 'UF cliente', pattern: /uf do cliente/i },
  { label: 'CEP cliente', pattern: /cep do cliente/i },
  { label: 'Produto cadastrado', pattern: /produto .+ deve estar cadastrado/i },
  { label: 'NCM produto', pattern: /ncm (pendente|de)/i },
  { label: 'CFOP produto', pattern: /cfop (pendente|de)/i },
  { label: 'Origem fiscal produto', pattern: /origem fiscal (pendente|de)/i },
  { label: 'CST ICMS produto', pattern: /cst icms (pendente|de)/i },
  { label: 'CST PIS produto', pattern: /cst pis (pendente|de)/i },
  { label: 'CST COFINS produto', pattern: /cst cofins (pendente|de)/i },
]
