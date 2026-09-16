import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { FileText, ReceiptText } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
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
  pickupReservations,
  products,
  sales,
  shippingOrders,
  onCancelFiscalDocument,
  onEditSaleFiscalDocument,
  onIssuePickupReservationFiscalDocument,
  onIssueSaleFiscalDocument,
  onIssueShippingOrderFiscalDocument,
  onOpenFiscalDocumentSource,
  onPreviewPickupReservationFiscalDocument,
  onPreviewSaleFiscalDocument,
  onPreviewShippingOrderFiscalDocument,
  onResolveFiscalPendency,
  onSyncFiscalDocument,
}: {
  clients: Client[]
  fiscalDocuments: FiscalDocument[]
  fiscalSettings: FiscalSettings | null
  initialTab?: FiscalOperationsTab
  initialRequestSearch: string
  pickupReservations: PickupReservation[]
  products: Product[]
  sales: Sale[]
  shippingOrders: ShippingOrder[]
  onCancelFiscalDocument: (
    event: FormEvent<HTMLFormElement>,
    fiscalDocument: FiscalDocument,
  ) => void
  onEditSaleFiscalDocument: (sale: Sale) => void
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
  onOpenFiscalDocumentSource: (fiscalDocument: FiscalDocument) => void
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
  onSyncFiscalDocument: (fiscalDocument: FiscalDocument) => void
}) {
  const [activeTab, setActiveTab] = useState<FiscalOperationsTab>(
    initialTab ?? 'queue',
  )

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

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

  return (
    <section className='grid gap-4'>
      <div className='min-w-0 overflow-hidden rounded-xl border border-[#dfe5e1] bg-white'>
        <div className='px-4 pt-4 sm:px-5 sm:pt-5'>
          <PageHeader
            description='Gerencie emissões pendentes, correções fiscais, notas autorizadas, rejeições, XML e DANFE.'
            icon={<FileText size={18} />}
            title='NF-e'
          />
        </div>
        <Tabs
          allowScrollButtonsMobile
          className='border-t border-[#eef1ee] px-4 sm:px-5'
          value={activeTab}
          variant='scrollable'
          onChange={(_event, value) =>
            setActiveTab(value as FiscalOperationsTab)
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
      </div>

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
          onOpenFiscalDocumentSource={onOpenFiscalDocumentSource}
          onSyncFiscalDocument={onSyncFiscalDocument}
        />
      ) : null}
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
