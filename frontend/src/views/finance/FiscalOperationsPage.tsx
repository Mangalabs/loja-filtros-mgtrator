import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Skeleton from '@mui/material/Skeleton'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { FileText, ReceiptText, RefreshCw } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import type {
  Client,
  FiscalDocument,
  FiscalSettings,
  PickupReservation,
  Product,
  Sale,
  ShippingOrder,
} from '../../api'
import { PageHeader } from '../../components/layout'
import {
  FiscalDocumentsPage,
  IssuedFiscalDocumentsPage,
  type FiscalPendencyTarget,
} from './FiscalDocumentsPage'

export type FiscalOperationsTab = 'queue' | 'issued'

export function FiscalOperationsPage({
  clients,
  fiscalDocuments,
  fiscalSettings,
  initialTab,
  initialRequestSearch,
  loading,
  pickupReservations,
  products,
  sales,
  shippingOrders,
  onCancelFiscalDocument,
  onIssueFiscalDocumentCorrectionLetter,
  onEditSaleFiscalDocument,
  onIssuePickupReservationFiscalDocument,
  onIssueSaleFiscalDocument,
  onIssueShippingOrderFiscalDocument,
  onOpenFiscalDocumentSource,
  onPreviewPickupReservationFiscalDocument,
  onPreviewSaleFiscalDocument,
  onPreviewShippingOrderFiscalDocument,
  onResolveFiscalPendency,
  onSyncFiscalDocuments,
}: {
  clients: Client[]
  fiscalDocuments: FiscalDocument[]
  fiscalSettings: FiscalSettings | null
  initialTab?: FiscalOperationsTab
  initialRequestSearch: string
  loading: boolean
  pickupReservations: PickupReservation[]
  products: Product[]
  sales: Sale[]
  shippingOrders: ShippingOrder[]
  onCancelFiscalDocument: (
    event: FormEvent<HTMLFormElement>,
    fiscalDocument: FiscalDocument,
  ) => Promise<boolean>
  onIssueFiscalDocumentCorrectionLetter: (
    event: FormEvent<HTMLFormElement>,
    fiscalDocument: FiscalDocument,
  ) => Promise<boolean>
  onEditSaleFiscalDocument: (sale: Sale) => void
  onIssuePickupReservationFiscalDocument: (
    reservation: PickupReservation,
    additionalInformation?: string,
  ) => Promise<unknown>
  onIssueSaleFiscalDocument: (
    sale: Sale,
    additionalInformation?: string,
  ) => Promise<unknown>
  onIssueShippingOrderFiscalDocument: (
    order: ShippingOrder,
    additionalInformation?: string,
  ) => Promise<unknown>
  onOpenFiscalDocumentSource: (fiscalDocument: FiscalDocument) => void
  onPreviewPickupReservationFiscalDocument: (
    reservation: PickupReservation,
    additionalInformation?: string,
  ) => Promise<unknown>
  onPreviewSaleFiscalDocument: (
    sale: Sale,
    additionalInformation?: string,
  ) => Promise<unknown>
  onPreviewShippingOrderFiscalDocument: (
    order: ShippingOrder,
    additionalInformation?: string,
  ) => Promise<unknown>
  onResolveFiscalPendency: (target: FiscalPendencyTarget) => void
  onSyncFiscalDocuments: (fiscalDocuments: FiscalDocument[]) => Promise<void>
}) {
  const [selectedTab, setSelectedTab] = useState<FiscalOperationsTab>(
    initialTab ?? 'queue',
  )
  const activeTab = initialTab ?? selectedTab
  const [syncState, setSyncState] = useState<FiscalSyncState>('idle')
  const [lastSyncAt, setLastSyncAt] = useState<Date>()
  const [syncingDocumentIds, setSyncingDocumentIds] = useState<Set<string>>(
    () => new Set(),
  )
  const syncInFlight = useRef(false)

  const pendingFiscalDocuments = fiscalDocuments.filter(
    (document) =>
      document.status === 'PENDING' ||
      document.status === 'PROCESSING' ||
      document.status === 'REJECTED',
  ).length
  const issuedFiscalDocuments = fiscalDocuments.filter(
    (document) =>
      document.status === 'AUTHORIZED' || document.status === 'CANCELLED',
  ).length
  const automaticSyncDocuments = useMemo(
    () =>
      activeTab === 'queue'
        ? fiscalDocuments.filter(
            (document) =>
              document.status === 'PENDING' ||
              document.status === 'PROCESSING',
          )
        : [],
    [activeTab, fiscalDocuments],
  )

  const syncFiscalDocuments = useCallback(
    async (documents: FiscalDocument[]) => {
      if (syncInFlight.current || documents.length === 0) {
        return
      }

      syncInFlight.current = true
      setSyncState('syncing')
      setSyncingDocumentIds(new Set(documents.map((document) => document.id)))

      try {
        await onSyncFiscalDocuments(documents)
        setLastSyncAt(new Date())
        setSyncState('success')
      } catch {
        setSyncState('error')
      } finally {
        syncInFlight.current = false
        setSyncingDocumentIds(new Set())
      }
    },
    [onSyncFiscalDocuments],
  )

  useEffect(() => {
    if (loading || automaticSyncDocuments.length === 0) {
      return
    }

    function syncWhenVisible() {
      if (document.visibilityState === 'visible') {
        void syncFiscalDocuments(automaticSyncDocuments)
      }
    }

    const interval = window.setInterval(syncWhenVisible, 15_000)

    document.addEventListener('visibilitychange', syncWhenVisible)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', syncWhenVisible)
    }
  }, [automaticSyncDocuments, loading, syncFiscalDocuments])

  if (loading) {
    return <FiscalOperationsLoading />
  }

  return (
    <section className='grid gap-4'>
      <div className='min-w-0 overflow-hidden rounded-xl border border-[#dfe5e1] bg-white'>
        <div className='px-4 pt-4 sm:px-5 sm:pt-5'>
          <PageHeader
            description={
              initialTab === 'issued'
                ? 'Consulte notas autorizadas ou canceladas, eventos, XML e DANFE.'
                : initialTab === 'queue'
                  ? 'Acompanhe emissões pendentes, rejeições e a atualização automática do retorno fiscal.'
                  : 'Gerencie emissões pendentes, correções fiscais, notas autorizadas, rejeições, XML e DANFE.'
            }
            icon={
              initialTab === 'issued' ? (
                <ReceiptText size={18} />
              ) : (
                <FileText size={18} />
              )
            }
            title={
              initialTab === 'issued'
                ? 'Histórico de notas emitidas'
                : initialTab === 'queue'
                  ? 'Fila de emissão'
                  : 'NF-e'
            }
          />
        </div>
        {initialTab ? null : (
          <Tabs
            allowScrollButtonsMobile
            className='border-t border-[#eef1ee] px-4 sm:px-5'
            value={activeTab}
            variant='scrollable'
            onChange={(_event, value) =>
              setSelectedTab(value as FiscalOperationsTab)
            }>
            <Tab
              icon={<FileText size={16} />}
              iconPosition='start'
              label={
                <FiscalOperationsTabLabel
                  count={pendingFiscalDocuments}
                  label='Fila de emissão'
                />
              }
              value='queue'
            />
            <Tab
              icon={<ReceiptText size={16} />}
              iconPosition='start'
              label={
                <FiscalOperationsTabLabel
                  count={issuedFiscalDocuments}
                  label='Notas emitidas'
                />
              }
              value='issued'
            />
          </Tabs>
        )}
      </div>

      {activeTab === 'queue' ? (
        <FiscalSyncFeedback
          documents={automaticSyncDocuments}
          lastSyncAt={lastSyncAt}
          state={syncState}
          onSync={() => void syncFiscalDocuments(automaticSyncDocuments)}
        />
      ) : null}

      {activeTab === 'queue' ? (
        <FiscalDocumentsPage
          clients={clients}
          embedded
          fiscalDocuments={fiscalDocuments}
          fiscalSettings={fiscalSettings}
          initialRequestSearch={initialRequestSearch}
          pickupReservations={pickupReservations}
          products={products}
          sales={sales}
          shippingOrders={shippingOrders}
          onEditSaleFiscalDocument={onEditSaleFiscalDocument}
          onIssuePickupReservationFiscalDocument={
            onIssuePickupReservationFiscalDocument
          }
          onIssueSaleFiscalDocument={onIssueSaleFiscalDocument}
          onIssueShippingOrderFiscalDocument={onIssueShippingOrderFiscalDocument}
          onPreviewPickupReservationFiscalDocument={
            onPreviewPickupReservationFiscalDocument
          }
          onPreviewSaleFiscalDocument={onPreviewSaleFiscalDocument}
          onPreviewShippingOrderFiscalDocument={
            onPreviewShippingOrderFiscalDocument
          }
          onResolveFiscalPendency={onResolveFiscalPendency}
          syncingDocumentIds={syncingDocumentIds}
          onSyncFiscalDocument={(document) => syncFiscalDocuments([document])}
        />
      ) : null}

      {activeTab === 'issued' ? (
        <IssuedFiscalDocumentsPage
          clients={clients}
          embedded
          fiscalDocuments={fiscalDocuments}
          pickupReservations={pickupReservations}
          sales={sales}
          shippingOrders={shippingOrders}
          onCancelFiscalDocument={onCancelFiscalDocument}
          onIssueFiscalDocumentCorrectionLetter={
            onIssueFiscalDocumentCorrectionLetter
          }
          onOpenFiscalDocumentSource={onOpenFiscalDocumentSource}
          syncingDocumentIds={syncingDocumentIds}
          onSyncFiscalDocument={(document) => syncFiscalDocuments([document])}
        />
      ) : null}
    </section>
  )
}

type FiscalSyncState = 'idle' | 'syncing' | 'success' | 'error'

const fiscalSyncTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

function FiscalSyncFeedback({
  documents,
  lastSyncAt,
  state,
  onSync,
}: {
  documents: FiscalDocument[]
  lastSyncAt?: Date
  state: FiscalSyncState
  onSync: () => void
}) {
  if (documents.length === 0 && state === 'idle') {
    return null
  }

  const severity =
    state === 'error' ? 'error' : state === 'success' ? 'success' : 'info'
  const documentCountLabel = `${documents.length} ${
    documents.length === 1 ? 'nota' : 'notas'
  }`
  const messageByState: Record<FiscalSyncState, string> = {
    idle: `Atualização automática ativa para ${documentCountLabel}. Consultas a cada 15 segundos.`,
    syncing: `Consultando o retorno de ${documentCountLabel}…`,
    success: lastSyncAt
      ? `Retornos consultados às ${fiscalSyncTimeFormatter.format(lastSyncAt)}.`
      : 'Retornos consultados.',
    error:
      documents.length > 0
        ? 'Não foi possível consultar todos os retornos. Uma nova tentativa será feita automaticamente.'
        : 'Não foi possível consultar o retorno. Tente novamente pela ação da nota.',
  }

  return (
    <Alert
      action={
        documents.length > 0 ? (
          <Button
            color='inherit'
            disabled={state === 'syncing'}
            size='small'
            startIcon={
              state === 'syncing' ? (
                <CircularProgress
                  aria-hidden='true'
                  color='inherit'
                  size={14}
                />
              ) : (
                <RefreshCw aria-hidden='true' size={15} />
              )
            }
            onClick={onSync}>
            {state === 'syncing' ? 'Atualizando…' : 'Atualizar agora'}
          </Button>
        ) : undefined
      }
      aria-live='polite'
      severity={severity}
      variant='outlined'>
      {messageByState[state]}
    </Alert>
  )
}

function FiscalOperationsLoading() {
  return (
    <section
      aria-busy='true'
      aria-label='Carregando operações fiscais'
      className='grid gap-4'>
      <div className='rounded-xl border border-[#dfe5e1] bg-white p-4 sm:p-5'>
        <Skeleton height={30} width={180} />
        <Skeleton height={20} width='min(100%, 560px)' />
        <div className='mt-5 flex gap-4'>
          <Skeleton height={42} width={160} />
          <Skeleton height={42} width={150} />
        </div>
      </div>
      <div className='rounded-xl border border-[#dfe5e1] bg-white p-4 sm:p-5'>
        <div className='grid gap-3 lg:grid-cols-3'>
          <Skeleton height={56} variant='rounded' />
          <Skeleton height={56} variant='rounded' />
          <Skeleton height={56} variant='rounded' />
        </div>
        <Skeleton className='mt-4' height={280} variant='rounded' />
      </div>
    </section>
  )
}

function FiscalOperationsTabLabel({
  count,
  label,
}: {
  count: number
  label: string
}) {
  return (
    <span className='inline-flex items-center gap-1.5'>
      <span>{label}</span>
      {count > 0 ? (
        <span className='rounded-full bg-[#eef1ee] px-1.5 py-0.5 text-[11px] font-semibold text-[#203466]'>
          {count}
        </span>
      ) : null}
    </span>
  )
}
