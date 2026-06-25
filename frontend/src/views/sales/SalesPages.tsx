import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { PackagePlus, Plus, Send, ShoppingCart } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import type {
  CashRegisterSession,
  Client,
  PaymentMethod,
  PickupReservation,
  Product,
  Sale,
  ShippingOrder,
} from '../../api'
import { ProductSearchField } from '../../components/ProductSearchField'
import {
  ActionGroup,
  ActionStack,
  FormCard,
  FormGrid,
  FormRow,
  InlineNote,
  PageHeader,
  PagePanel,
  ResponsiveTable,
} from '../../components/layout'
import {
  PrimaryButton,
  SecondaryButton,
  StatusChip,
  TableActionButton,
  type StatusTone,
} from '../../components/ui'
import { usePaginatedRows } from '../../hooks/usePaginatedRows'
import {
  formatCurrency,
  formatDateTime,
  formatQuantity,
} from '../../utils/format'

type SaleDraftItem = {
  productId: string
  quantity: string
}

type PickupReservationDraftItem = {
  productId: string
  quantity: string
}

export type SaleDraftInput = {
  clientId?: string | null
  discountAmount: number
  allowInsufficientStock?: boolean
  paymentMethodId: string
  items: Array<{
    productId: string
    quantity: number
  }>
}

export type PickupReservationDraftInput = {
  clientId: string
  allowInsufficientStock?: boolean
  items: Array<{
    productId: string
    quantity: number
  }>
}

export function SalesPage({
  cashRegister,
  clients,
  paymentMethods,
  products,
  sales,
  onSubmit,
}: {
  cashRegister: CashRegisterSession | null
  clients: Client[]
  paymentMethods: PaymentMethod[]
  products: Product[]
  sales: Sale[]
  onSubmit: (input: SaleDraftInput) => Promise<boolean>
}) {
  const [clientId, setClientId] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [items, setItems] = useState<SaleDraftItem[]>([emptySaleItem()])
  const { pagination, visibleItems } = usePaginatedRows<Sale>(sales)
  const activeProducts = products.filter((product) => product.active)
  const saleSubtotal = items.reduce((sum, item) => {
    const product = activeProducts.find(
      (currentProduct) => currentProduct.id === item.productId,
    )
    return sum + Number(item.quantity || 0) * Number(product?.salePrice ?? 0)
  }, 0)
  const saleDiscount = moneyInputValue(discountAmount)
  const discountExceedsSubtotal = saleDiscount > saleSubtotal
  const saleTotal = Math.max(saleSubtotal - saleDiscount, 0)

  function updateItem(index: number, changes: Partial<SaleDraftItem>) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    )
  }

  function removeItem(index: number) {
    setItems((currentItems) =>
      currentItems.filter((_item, itemIndex) => itemIndex !== index),
    )
  }

  function resetForm() {
    setClientId('')
    setDiscountAmount('')
    setPaymentMethodId('')
    setItems([emptySaleItem()])
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const saved = await onSubmit({
      clientId: clientId || null,
      discountAmount: saleDiscount,
      paymentMethodId,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      })),
    })

    saved && resetForm()
  }

  return (
    <section className='grid items-start gap-4 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)]'>
      <FormGrid className='gap-5 sm:gap-6' onSubmit={submit}>
        <PageHeader
          description='Monte uma venda de balcao com um ou mais itens.'
          icon={<ShoppingCart size={18} />}
          title='Nova venda'
        />
        {!cashRegister ? (
          <Alert severity='warning' variant='outlined'>
            Abra o caixa antes de registrar vendas.
          </Alert>
        ) : null}

        <div className='grid gap-4'>
          {items.map((item, index) => (
            <FormCard key={index}>
              <div className='flex items-center justify-between gap-3'>
                <strong>Item {index + 1}</strong>
                {items.length > 1 ? (
                  <TableActionButton
                    type='button'
                    onClick={() => removeItem(index)}>
                    Remover
                  </TableActionButton>
                ) : null}
              </div>
              <ProductSearchField
                disabled={!cashRegister}
                label='Produto'
                name={`saleItems.${index}.productId`}
                products={activeProducts}
                required
                stockLabel='available'
                value={item.productId}
                onChange={(productId) => updateItem(index, { productId })}
              />
              <TextField
                label='Quantidade'
                value={item.quantity}
                type='number'
                size='medium'
                required
                disabled={!cashRegister}
                onChange={(event) =>
                  updateItem(index, { quantity: event.target.value })
                }
                slotProps={{ htmlInput: { min: '0.001', step: '0.001' } }}
              />
            </FormCard>
          ))}
        </div>

        <ActionGroup>
          <SecondaryButton
            type='button'
            onClick={() =>
              setItems((currentItems) => [...currentItems, emptySaleItem()])
            }
            disabled={!cashRegister}>
            Adicionar item
          </SecondaryButton>
        </ActionGroup>

        <FormRow>
          <TextField
            label='Pagamento'
            select
            size='medium'
            value={paymentMethodId || ''}
            onChange={(event) => setPaymentMethodId(event.target.value)}
            required
            disabled={!cashRegister}>
            <MenuItem value='' disabled>
              Pagamento
            </MenuItem>
            {paymentMethods
              .filter((method) => method.active)
              .map((method) => (
                <MenuItem key={method.id} value={method.id}>
                  {method.name}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            disabled
            label='Subtotal'
            size='medium'
            value={formatCurrency(saleSubtotal)}
          />
        </FormRow>
        <FormRow>
          <TextField
            disabled={!cashRegister}
            error={discountExceedsSubtotal}
            helperText={
              discountExceedsSubtotal
                ? 'Desconto maior que o subtotal.'
                : 'Informe o desconto em reais, se houver.'
            }
            label='Desconto'
            size='medium'
            type='number'
            value={discountAmount}
            onChange={(event) => setDiscountAmount(event.target.value)}
            slotProps={{ htmlInput: { min: '0', step: '0.01' } }}
          />
          <TextField
            disabled
            label='Total final'
            size='medium'
            value={formatCurrency(saleTotal)}
          />
        </FormRow>
        <TextField
          label='Cliente'
          select
          size='medium'
          value={clientId || ''}
          onChange={(event) => setClientId(event.target.value)}
          disabled={!cashRegister}>
          <MenuItem value=''>Cliente nao identificado</MenuItem>
          {clients
            .filter((client) => client.active)
            .map((client) => (
              <MenuItem key={client.id} value={client.id}>
                {client.name}
              </MenuItem>
            ))}
        </TextField>
        <ActionGroup>
          <PrimaryButton
            icon={<Plus size={17} />}
            type='submit'
            disabled={!cashRegister || discountExceedsSubtotal}>
            Concluir venda
          </PrimaryButton>
        </ActionGroup>
      </FormGrid>

      <PagePanel wide>
        <PageHeader
          description={`${sales.length} registros`}
          title='Vendas registradas'
        />
        <ResponsiveTable
          columns={[
            {
              header: 'Data',
              render: (sale) => formatDateTime(sale.createdAt),
            },
            {
              header: 'Produto',
              render: (sale) => <SaleItemsSummary sale={sale} />,
            },
            {
              header: 'Qtd.',
              render: (sale) => formatQuantity(totalSaleQuantity(sale)),
            },
            {
              header: 'Total',
              render: (sale) => <SaleAmountSummary sale={sale} />,
            },
            {
              header: 'Pagamento',
              render: (sale) => sale.paymentMethodName,
            },
            {
              header: 'Cliente',
              render: (sale) => sale.clientName ?? 'Nao identificado',
            },
            {
              header: 'Operador',
              render: (sale) => sale.createdByUserName,
            },
          ]}
          emptyMessage='Nenhuma venda registrada.'
          getRowId={(sale) => sale.id}
          items={visibleItems}
          pagination={pagination}
        />
      </PagePanel>
    </section>
  )
}

function emptySaleItem(): SaleDraftItem {
  return {
    productId: '',
    quantity: '',
  }
}

function moneyInputValue(value: string) {
  const parsedValue = Number(value || 0)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0
}

function emptyPickupReservationItem(): PickupReservationDraftItem {
  return {
    productId: '',
    quantity: '',
  }
}

export function ShippingOrdersPage({
  cashRegister,
  paymentMethods,
  orders,
  onOpenQuotes,
  onApprove,
  onSeparate,
  onComplete,
  onCancel,
}: {
  cashRegister: CashRegisterSession | null
  paymentMethods: PaymentMethod[]
  orders: ShippingOrder[]
  onOpenQuotes: () => void
  onApprove: (order: ShippingOrder) => void
  onSeparate: (order: ShippingOrder) => void
  onComplete: (event: FormEvent<HTMLFormElement>, order: ShippingOrder) => void
  onCancel: (event: FormEvent<HTMLFormElement>, order: ShippingOrder) => void
}) {
  const { pagination, visibleItems } =
    usePaginatedRows<ShippingOrder>(orders)

  return (
    <section className='grid items-start gap-4 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)]'>
      <PagePanel>
        <PageHeader
          description='Crie o orcamento e envie para este fluxo quando o cliente aprovar.'
          icon={<Send size={18} />}
          title='Registrar orcamento'
        />
        <InlineNote>
          Pedidos para envio nascem de orcamentos salvos. Depois disso, aprove,
          reserve, separe e conclua a venda quando o pedido sair.
        </InlineNote>
        <PrimaryButton
          icon={<Plus size={17} />}
          type='button'
          onClick={onOpenQuotes}>
          Registrar orcamento
        </PrimaryButton>
      </PagePanel>

      <PagePanel wide>
        <PageHeader
          actions={
            <span className='text-sm text-[#5f665f]'>
              {orders.length} registros
            </span>
          }
          description='Reserve, separe e conclua a venda quando o pedido sair para envio.'
          title='Pedidos para envio'
        />
        <ResponsiveTable
          columns={[
            {
              header: 'Pedido',
              render: (order) => (
                <>
                  {formatDateTime(order.createdAt)}
                  <InlineNote>Operador: {order.createdByUserName}</InlineNote>
                </>
              ),
            },
            {
              header: 'Cliente e itens',
              render: (order) => <ShippingOrderItemsSummary order={order} />,
            },
            {
              header: 'Resumo',
              render: (order) => (
                <>
                  <strong>{formatCurrency(order.totalAmount)}</strong>
                  <InlineNote>
                    Qtd. {formatQuantity(totalShippingOrderQuantity(order))}
                  </InlineNote>
                </>
              ),
            },
            {
              header: 'Status',
              render: (order) => <ShippingOrderStatusSummary order={order} />,
            },
            {
              header: 'Acoes',
              render: (order) =>
                shippingOrderActionRenderers[order.status]({
                  cashRegister,
                  order,
                  paymentMethods,
                  onApprove,
                  onCancel,
                  onComplete,
                  onSeparate,
                }),
            },
          ]}
          emptyMessage='Nenhum orcamento para envio registrado.'
          getRowId={(order) => order.id}
          items={visibleItems}
          pagination={pagination}
        />
      </PagePanel>
    </section>
  )
}

type ShippingOrderActionRendererProps = {
  cashRegister: CashRegisterSession | null
  order: ShippingOrder
  paymentMethods: PaymentMethod[]
  onApprove: (order: ShippingOrder) => void
  onSeparate: (order: ShippingOrder) => void
  onComplete: (event: FormEvent<HTMLFormElement>, order: ShippingOrder) => void
  onCancel: (event: FormEvent<HTMLFormElement>, order: ShippingOrder) => void
}

const shippingOrderActionRenderers: Record<
  ShippingOrder['status'],
  (props: ShippingOrderActionRendererProps) => ReactNode
> = {
  APPROVED: ({ order, onCancel, onSeparate }) => (
    <ActionStack>
      <ActionGroup>
        <TableActionButton type='button' onClick={() => onSeparate(order)}>
          Confirmar separacao
        </TableActionButton>
      </ActionGroup>
      <ShippingOrderCancelForm order={order} onCancel={onCancel} />
    </ActionStack>
  ),
  CANCELLED: () => '-',
  COMPLETED: () => 'Venda concluida',
  QUOTED: ({ order, onApprove, onCancel }) => (
    <ActionStack>
      <ActionGroup>
        <TableActionButton type='button' onClick={() => onApprove(order)}>
          Aprovar e reservar
        </TableActionButton>
      </ActionGroup>
      <ShippingOrderCancelForm order={order} onCancel={onCancel} />
    </ActionStack>
  ),
  SEPARATED: ({
    cashRegister,
    order,
    paymentMethods,
    onCancel,
    onComplete,
  }) => (
    <ActionStack>
      <form
        className='grid gap-2'
        onSubmit={(event) => onComplete(event, order)}>
        {!cashRegister ? (
          <InlineNote>Abra o caixa para concluir.</InlineNote>
        ) : null}
        <TextField
          label='Pagamento'
          name='shippingPaymentMethodId'
          defaultValue=''
          select
          size='small'
          required
          disabled={!cashRegister}>
          <MenuItem value='' disabled>
            Pagamento
          </MenuItem>
          {paymentMethods
            .filter((method) => method.active)
            .map((method) => (
              <MenuItem key={method.id} value={method.id}>
                {method.name}
              </MenuItem>
            ))}
        </TextField>
        <ActionGroup>
          <TableActionButton type='submit' disabled={!cashRegister}>
            Concluir venda e saida
          </TableActionButton>
        </ActionGroup>
      </form>
      <ShippingOrderCancelForm order={order} onCancel={onCancel} />
    </ActionStack>
  ),
}

function ShippingOrderCancelForm({
  order,
  onCancel,
}: {
  order: ShippingOrder
  onCancel: (event: FormEvent<HTMLFormElement>, order: ShippingOrder) => void
}) {
  return (
    <form
      className='grid gap-2'
      onSubmit={(event) => onCancel(event, order)}>
      <TextField
        label='Motivo do cancelamento'
        name='shippingCancellationReason'
        size='small'
        slotProps={{ htmlInput: { maxLength: 500 } }}
        required
      />
      <ActionGroup>
        <TableActionButton type='submit'>Cancelar</TableActionButton>
      </ActionGroup>
    </form>
  )
}

export function PickupReservationsPage({
  cashRegister,
  clients,
  paymentMethods,
  products,
  reservations,
  onSubmit,
  onComplete,
  onCancel,
}: {
  cashRegister: CashRegisterSession | null
  clients: Client[]
  paymentMethods: PaymentMethod[]
  products: Product[]
  reservations: PickupReservation[]
  onSubmit: (input: PickupReservationDraftInput) => Promise<boolean>
  onComplete: (
    event: FormEvent<HTMLFormElement>,
    reservation: PickupReservation,
  ) => void
  onCancel: (
    event: FormEvent<HTMLFormElement>,
    reservation: PickupReservation,
  ) => void
}) {
  const [clientId, setClientId] = useState('')
  const [items, setItems] = useState<PickupReservationDraftItem[]>([
    emptyPickupReservationItem(),
  ])
  const { pagination, visibleItems } =
    usePaginatedRows<PickupReservation>(reservations)
  const activeProducts = products.filter((product) => product.active)
  const reservationTotal = items.reduce((sum, item) => {
    const product = activeProducts.find(
      (currentProduct) => currentProduct.id === item.productId,
    )
    return sum + Number(item.quantity || 0) * Number(product?.salePrice ?? 0)
  }, 0)

  function updateItem(
    index: number,
    changes: Partial<PickupReservationDraftItem>,
  ) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    )
  }

  function removeItem(index: number) {
    setItems((currentItems) =>
      currentItems.filter((_item, itemIndex) => itemIndex !== index),
    )
  }

  function resetForm() {
    setClientId('')
    setItems([emptyPickupReservationItem()])
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const saved = await onSubmit({
      clientId,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      })),
    })

    saved && resetForm()
  }

  return (
    <section className='grid items-start gap-4 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)]'>
      <FormGrid className='gap-5 sm:gap-6' onSubmit={submit}>
        <PageHeader
          description='Reserve uma ou mais pecas para retirada na loja.'
          icon={<PackagePlus size={18} />}
          title='Nova reserva'
        />
        <InlineNote>
          A reserva prende o saldo disponivel imediatamente. A baixa acontece
          somente ao concluir a venda.
        </InlineNote>
        <TextField
          label='Cliente'
          select
          size='medium'
          value={clientId || ''}
          onChange={(event) => setClientId(event.target.value)}
          required>
          <MenuItem value='' disabled>
            Cliente
          </MenuItem>
          {clients
            .filter((client) => client.active)
            .map((client) => (
              <MenuItem key={client.id} value={client.id}>
                {client.name}
                {client.phone ? ` - ${client.phone}` : ''}
              </MenuItem>
            ))}
        </TextField>

        <div className='grid gap-4'>
          {items.map((item, index) => (
            <FormCard key={index}>
              <div className='flex items-center justify-between gap-3'>
                <strong>Item {index + 1}</strong>
                {items.length > 1 ? (
                  <TableActionButton
                    type='button'
                    onClick={() => removeItem(index)}>
                    Remover
                  </TableActionButton>
                ) : null}
              </div>
              <ProductSearchField
                label='Produto'
                name={`pickupItems.${index}.productId`}
                products={activeProducts}
                required
                stockLabel='available'
                value={item.productId}
                onChange={(productId) => updateItem(index, { productId })}
              />
              <TextField
                label='Quantidade'
                value={item.quantity}
                type='number'
                size='medium'
                required
                onChange={(event) =>
                  updateItem(index, { quantity: event.target.value })
                }
                slotProps={{ htmlInput: { min: '0.001', step: '0.001' } }}
              />
            </FormCard>
          ))}
        </div>

        <ActionGroup>
          <SecondaryButton
            type='button'
            onClick={() =>
              setItems((currentItems) => [
                ...currentItems,
                emptyPickupReservationItem(),
              ])
            }>
            Adicionar item
          </SecondaryButton>
        </ActionGroup>
        <TextField
          disabled
          label='Total estimado'
          size='medium'
          value={formatCurrency(reservationTotal)}
        />
        <ActionGroup>
          <PrimaryButton icon={<Plus size={17} />} type='submit'>
            Registrar reserva
          </PrimaryButton>
        </ActionGroup>
      </FormGrid>

      <PagePanel wide>
        <PageHeader
          actions={
            <span className='text-sm text-[#5f665f]'>
              {reservations.length} registros
            </span>
          }
          description='Conclua a venda quando o cliente retirar ou cancele para liberar o estoque.'
          title='Reservas para retirada'
        />
        <ResponsiveTable
          columns={[
            {
              header: 'Data',
              render: (reservation) => formatDateTime(reservation.createdAt),
            },
            {
              header: 'Cliente',
              render: (reservation) => reservation.clientName,
            },
            {
              header: 'Produto',
              render: (reservation) => (
                <PickupReservationItemsSummary reservation={reservation} />
              ),
            },
            {
              header: 'Qtd.',
              render: (reservation) =>
                formatQuantity(totalPickupReservationQuantity(reservation)),
            },
            {
              header: 'Total',
              render: (reservation) =>
                formatCurrency(reservation.totalAmount),
            },
            {
              header: 'Operador',
              render: (reservation) => reservation.createdByUserName,
            },
            {
              header: 'Status',
              render: (reservation) => (
                <PickupReservationStatusSummary reservation={reservation} />
              ),
            },
            {
              header: 'Acoes',
              render: (reservation) => (
                <PickupReservationActions
                  cashRegister={cashRegister}
                  paymentMethods={paymentMethods}
                  reservation={reservation}
                  onCancel={onCancel}
                  onComplete={onComplete}
                />
              ),
            },
          ]}
          emptyMessage='Nenhuma reserva para retirada registrada.'
          getRowId={(reservation) => reservation.id}
          items={visibleItems}
          pagination={pagination}
        />
      </PagePanel>
    </section>
  )
}

function SaleItemsSummary({ sale }: { sale: Sale }) {
  return (
    <>
      {sale.items.length} item(ns)
      <InlineNote>{sale.items.map((item) => item.productName).join(', ')}</InlineNote>
    </>
  )
}

function SaleAmountSummary({ sale }: { sale: Sale }) {
  const discountAmount = Number(sale.discountAmount)

  return (
    <>
      <strong>{formatCurrency(sale.totalAmount)}</strong>
      {discountAmount > 0 ? (
        <InlineNote>
          Subtotal {formatCurrency(sale.subtotalAmount)} | Desconto{' '}
          {formatCurrency(sale.discountAmount)}
        </InlineNote>
      ) : null}
    </>
  )
}

function ShippingOrderItemsSummary({ order }: { order: ShippingOrder }) {
  return (
    <ActionStack>
      <strong>{order.clientName}</strong>
      {order.quoteId ? <InlineNote>Origem: orcamento</InlineNote> : null}
      <InlineNote>
        {order.items
          .map((item) => item.description ?? item.productName)
          .join(', ')}
      </InlineNote>
    </ActionStack>
  )
}

function ShippingOrderStatusSummary({ order }: { order: ShippingOrder }) {
  return (
    <ActionStack>
      <StatusChip
        label={shippingOrderStatusLabel(order.status)}
        tone={shippingOrderStatusTone(order.status)}
      />
      {shippingOrderAuditNotes(order).map((note) => (
        <InlineNote key={note}>{note}</InlineNote>
      ))}
      {order.cancellationReason ? (
        <InlineNote>{order.cancellationReason}</InlineNote>
      ) : null}
    </ActionStack>
  )
}

function PickupReservationItemsSummary({
  reservation,
}: {
  reservation: PickupReservation
}) {
  return (
    <>
      {reservation.items.length} item(ns)
      <InlineNote>
        {reservation.items.map((item) => item.productName).join(', ')}
      </InlineNote>
    </>
  )
}

function PickupReservationStatusSummary({
  reservation,
}: {
  reservation: PickupReservation
}) {
  return (
    <ActionStack>
      <StatusChip
        label={pickupReservationStatusLabel(reservation.status)}
        tone={pickupReservationStatusTone(reservation.status)}
      />
      {pickupReservationAuditNotes(reservation).map((note) => (
        <InlineNote key={note}>{note}</InlineNote>
      ))}
      {reservation.cancellationReason ? (
        <InlineNote>{reservation.cancellationReason}</InlineNote>
      ) : null}
    </ActionStack>
  )
}

function PickupReservationActions({
  cashRegister,
  paymentMethods,
  reservation,
  onComplete,
  onCancel,
}: {
  cashRegister: CashRegisterSession | null
  paymentMethods: PaymentMethod[]
  reservation: PickupReservation
  onComplete: (
    event: FormEvent<HTMLFormElement>,
    reservation: PickupReservation,
  ) => void
  onCancel: (
    event: FormEvent<HTMLFormElement>,
    reservation: PickupReservation,
  ) => void
}) {
  if (reservation.status === 'COMPLETED') {
    return 'Venda concluida'
  }

  if (reservation.status !== 'RESERVED') {
    return '-'
  }

  return (
    <ActionStack>
      <form
        className='grid gap-2'
        onSubmit={(event) => onComplete(event, reservation)}>
        {!cashRegister ? (
          <InlineNote>Abra o caixa para concluir.</InlineNote>
        ) : null}
        <TextField
          label='Pagamento'
          name='pickupPaymentMethodId'
          defaultValue=''
          select
          size='small'
          required
          disabled={!cashRegister}>
          <MenuItem value='' disabled>
            Pagamento
          </MenuItem>
          {paymentMethods
            .filter((method) => method.active)
            .map((method) => (
              <MenuItem key={method.id} value={method.id}>
                {method.name}
              </MenuItem>
            ))}
        </TextField>
        <ActionGroup>
          <TableActionButton type='submit' disabled={!cashRegister}>
            Concluir venda
          </TableActionButton>
        </ActionGroup>
      </form>
      <form
        className='grid gap-2'
        onSubmit={(event) => onCancel(event, reservation)}>
        <TextField
          label='Motivo do cancelamento'
          name='pickupCancellationReason'
          size='small'
          slotProps={{ htmlInput: { maxLength: 500 } }}
          required
        />
        <ActionGroup>
          <TableActionButton type='submit'>Cancelar</TableActionButton>
        </ActionGroup>
      </form>
    </ActionStack>
  )
}

function totalSaleQuantity(sale: Sale) {
  return String(
    sale.items.reduce((sum, item) => sum + Number(item.quantity), 0),
  )
}

function totalShippingOrderQuantity(order: ShippingOrder) {
  return String(
    order.items.reduce((sum, item) => sum + Number(item.quantity), 0),
  )
}

function totalPickupReservationQuantity(reservation: PickupReservation) {
  return String(
    reservation.items.reduce((sum, item) => sum + Number(item.quantity), 0),
  )
}

function shippingOrderAuditNotes(order: ShippingOrder) {
  return [
    order.approvedByUserName ? `Aprovado por ${order.approvedByUserName}` : null,
    order.separatedByUserName
      ? `Separado por ${order.separatedByUserName}`
      : null,
    order.completedByUserName
      ? `Concluido por ${order.completedByUserName}`
      : null,
    order.cancelledByUserName
      ? `Cancelado por ${order.cancelledByUserName}`
      : null,
  ].filter((note): note is string => Boolean(note))
}

function pickupReservationAuditNotes(reservation: PickupReservation) {
  return [
    reservation.completedByUserName
      ? `Concluida por ${reservation.completedByUserName}`
      : null,
    reservation.cancelledByUserName
      ? `Cancelada por ${reservation.cancelledByUserName}`
      : null,
  ].filter((note): note is string => Boolean(note))
}

function shippingOrderStatusLabel(status: ShippingOrder['status']) {
  return shippingOrderStatusPresentation[status].label
}

function shippingOrderStatusTone(status: ShippingOrder['status']): StatusTone {
  return shippingOrderStatusPresentation[status].tone
}

function pickupReservationStatusLabel(status: PickupReservation['status']) {
  return pickupReservationStatusPresentation[status].label
}

function pickupReservationStatusTone(
  status: PickupReservation['status'],
): StatusTone {
  return pickupReservationStatusPresentation[status].tone
}

const shippingOrderStatusPresentation: Record<
  ShippingOrder['status'],
  { label: string; tone: StatusTone }
> = {
  APPROVED: { label: 'Aprovado - separar', tone: 'success' },
  CANCELLED: { label: 'Cancelado', tone: 'neutral' },
  COMPLETED: { label: 'Venda concluida', tone: 'success' },
  QUOTED: { label: 'Orcamento enviado', tone: 'warning' },
  SEPARATED: { label: 'Separado para envio', tone: 'success' },
}

const pickupReservationStatusPresentation: Record<
  PickupReservation['status'],
  { label: string; tone: StatusTone }
> = {
  CANCELLED: { label: 'Cancelada', tone: 'neutral' },
  COMPLETED: { label: 'Venda concluida', tone: 'success' },
  RESERVED: { label: 'Reservada', tone: 'warning' },
}
