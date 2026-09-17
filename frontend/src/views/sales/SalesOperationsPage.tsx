import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { PackagePlus, Send, ShoppingCart } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import type {
  CashRegisterSession,
  Client,
  FiscalDocument,
  PaymentMethod,
  PickupReservation,
  Product,
  Sale,
  ShippingOrder,
} from '../../api'
import { PageHeader } from '../../components/layout'
import {
  PickupReservationsPage,
  SalesPage,
  ShippingOrdersPage,
  type PickupReservationDraftInput,
  type SaleDraftInput,
} from './SalesPages'
import {
  SalesHistoryPage,
  type SaleCommercialDetailsHandler,
  type SaleEditActionHandler,
  type SaleStatusActionHandler,
} from './SalesHistoryPage'
import type { SaleReturnHandler } from './SaleReturnForm'

export type SalesOperationsTab = 'shipping' | 'direct' | 'pickup'

export function SalesOperationsPage({
  cashRegister,
  clients,
  fiscalDocuments,
  initialTab,
  paymentMethods,
  pickupReservations,
  products,
  sales,
  shippingOrders,
  onApproveShippingOrder,
  onCancelPickupReservation,
  onCancelShippingOrder,
  onCompletePickupReservation,
  onCompleteReopenedSale,
  onCompleteShippingOrder,
  onCreatePickupReservation,
  onCreateSale,
  onEditSale,
  onOpenSalesHistory,
  onOpenQuotes,
  onOpenSaleFiscalQueue,
  onReturnItem,
  onSeparateShippingOrder,
  onUpdateSaleCommercialDetails,
}: {
  cashRegister: CashRegisterSession | null
  clients: Client[]
  fiscalDocuments: FiscalDocument[]
  initialTab?: SalesOperationsTab
  paymentMethods: PaymentMethod[]
  pickupReservations: PickupReservation[]
  products: Product[]
  sales: Sale[]
  shippingOrders: ShippingOrder[]
  onApproveShippingOrder: (order: ShippingOrder) => void
  onCancelPickupReservation: (
    event: FormEvent<HTMLFormElement>,
    reservation: PickupReservation,
  ) => void
  onCancelShippingOrder: (
    event: FormEvent<HTMLFormElement>,
    order: ShippingOrder,
  ) => void
  onCompletePickupReservation: (
    event: FormEvent<HTMLFormElement>,
    reservation: PickupReservation,
  ) => void
  onCompleteReopenedSale: SaleStatusActionHandler
  onCompleteShippingOrder: (
    event: FormEvent<HTMLFormElement>,
    order: ShippingOrder,
  ) => void
  onCreatePickupReservation: (
    input: PickupReservationDraftInput,
  ) => Promise<boolean>
  onCreateSale: (input: SaleDraftInput) => Promise<boolean>
  onEditSale: SaleEditActionHandler
  onOpenSalesHistory: () => void
  onOpenQuotes: () => void
  onOpenSaleFiscalQueue: (sale: Sale) => void
  onReturnItem: SaleReturnHandler
  onSeparateShippingOrder: (order: ShippingOrder) => void
  onUpdateSaleCommercialDetails: SaleCommercialDetailsHandler
}) {
  const [activeTab, setActiveTab] = useState<SalesOperationsTab>(
    initialTab ?? 'shipping',
  )

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  const activeShippingOrders = shippingOrders.filter(
    (order) => order.status !== 'COMPLETED' && order.status !== 'CANCELLED',
  ).length
  const reservedPickups = pickupReservations.filter(
    (reservation) => reservation.status === 'RESERVED',
  ).length
  const linkedSaleIds = [
    ...shippingOrders.flatMap((order) => (order.saleId ? [order.saleId] : [])),
    ...pickupReservations.flatMap((reservation) =>
      reservation.saleId ? [reservation.saleId] : [],
    ),
  ]
  const directSalesCount = sales.filter(
    (sale) => !linkedSaleIds.includes(sale.id),
  ).length

  return (
    <section className='grid gap-4'>
      <div className='min-w-0 overflow-hidden rounded-xl border border-[#dfe5e1] bg-white'>
        <div className='px-4 pt-4 sm:px-5 sm:pt-5'>
          <PageHeader
            description='Acompanhe pedidos, vendas diretas, retiradas, correções, devoluções e emissão fiscal.'
            icon={<ShoppingCart size={18} />}
            title='Vendas'
          />
        </div>
        <Tabs
          allowScrollButtonsMobile
          className='border-t border-[#eef1ee] px-4 sm:px-5'
          value={activeTab}
          variant='scrollable'
          onChange={(_event, value) =>
            setActiveTab(value as SalesOperationsTab)
          }>
          <Tab
            icon={<Send size={16} />}
            iconPosition='start'
            label={
              <SalesOperationsTabLabel
                count={activeShippingOrders}
                label='Pedidos'
              />
            }
            value='shipping'
          />
          <Tab
            icon={<ShoppingCart size={16} />}
            iconPosition='start'
            label={
              <SalesOperationsTabLabel
                count={directSalesCount}
                label='Venda direta'
              />
            }
            value='direct'
          />
          <Tab
            icon={<PackagePlus size={16} />}
            iconPosition='start'
            label={
              <SalesOperationsTabLabel
                count={reservedPickups}
                label='Retirada'
              />
            }
            value='pickup'
          />
        </Tabs>
      </div>

      {activeTab === 'shipping' ? (
        <ShippingOrdersPage
          cashRegister={cashRegister}
          embedded
          fiscalDocuments={fiscalDocuments}
          orders={shippingOrders}
          paymentMethods={paymentMethods}
          sales={sales}
          onCompleteReopenedSale={onCompleteReopenedSale}
          onEditSale={onEditSale}
          onApprove={onApproveShippingOrder}
          onCancel={onCancelShippingOrder}
          onComplete={onCompleteShippingOrder}
          onOpenQuotes={onOpenQuotes}
          onOpenSaleFiscalQueue={onOpenSaleFiscalQueue}
          onReturnItem={onReturnItem}
          onSeparate={onSeparateShippingOrder}
          onUpdateSaleCommercialDetails={onUpdateSaleCommercialDetails}
        />
      ) : null}

      {activeTab === 'direct' ? (
        <SalesPage
          cashRegister={cashRegister}
          clients={clients}
          embedded
          excludedSaleIds={linkedSaleIds}
          fiscalDocuments={fiscalDocuments}
          paymentMethods={paymentMethods}
          products={products}
          sales={sales}
          onCompleteReopenedSale={onCompleteReopenedSale}
          onEditSale={onEditSale}
          onOpenSalesHistory={onOpenSalesHistory}
          onOpenSaleFiscalQueue={onOpenSaleFiscalQueue}
          onReturnItem={onReturnItem}
          onSubmit={onCreateSale}
          onUpdateSaleCommercialDetails={onUpdateSaleCommercialDetails}
        />
      ) : null}

      {activeTab === 'pickup' ? (
        <PickupReservationsPage
          cashRegister={cashRegister}
          clients={clients}
          embedded
          fiscalDocuments={fiscalDocuments}
          paymentMethods={paymentMethods}
          products={products}
          reservations={pickupReservations}
          sales={sales}
          onCancel={onCancelPickupReservation}
          onComplete={onCompletePickupReservation}
          onCompleteReopenedSale={onCompleteReopenedSale}
          onEditSale={onEditSale}
          onOpenSaleFiscalQueue={onOpenSaleFiscalQueue}
          onReturnItem={onReturnItem}
          onSubmit={onCreatePickupReservation}
          onUpdateSaleCommercialDetails={onUpdateSaleCommercialDetails}
        />
      ) : null}

    </section>
  )
}

function SalesOperationsTabLabel({
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
