import { PackagePlus, Plus, Send, ShoppingCart } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type {
  CashRegisterSession,
  Client,
  PaymentMethod,
  PickupReservation,
  Product,
  Sale,
  ShippingOrder,
} from '../../api'
import {
  PrimaryButton,
  SecondaryButton,
  StatusChip,
  TableActionButton,
  type StatusTone,
} from '../../components/ui'
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
  paymentMethodId: string
  items: Array<{
    productId: string
    quantity: number
  }>
}

export type PickupReservationDraftInput = {
  clientId: string
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
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [items, setItems] = useState<SaleDraftItem[]>([emptySaleItem()])
  const availableProducts = products.filter(
    (product) => product.active && Number(product.availableStock) > 0,
  )
  const saleTotal = items.reduce((sum, item) => {
    const product = availableProducts.find(
      (currentProduct) => currentProduct.id === item.productId,
    )
    return sum + Number(item.quantity || 0) * Number(product?.salePrice ?? 0)
  }, 0)

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
    setPaymentMethodId('')
    setItems([emptySaleItem()])
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const saved = await onSubmit({
      clientId: clientId || null,
      paymentMethodId,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      })),
    })

    saved && resetForm()
  }

  return (
    <section className='layout-grid stock-entry-layout'>
      <form className='panel form-panel' onSubmit={submit}>
        <div className='panel-header compact'>
          <div>
            <h2>Nova venda</h2>
            <span>Monte uma venda de balcão com um ou mais itens.</span>
          </div>
          <ShoppingCart size={18} />
        </div>
        {!cashRegister ? (
          <div className='alert'>Abra o caixa antes de registrar vendas.</div>
        ) : null}

        <div className='quote-items'>
          {items.map((item, index) => (
            <div className='quote-item-row' key={index}>
              <div className='panel-header compact'>
                <strong>Item {index + 1}</strong>
                {items.length > 1 ? (
                  <TableActionButton
                    type='button'
                    onClick={() => removeItem(index)}>
                    Remover
                  </TableActionButton>
                ) : null}
              </div>
              <select
                value={item.productId}
                onChange={(event) =>
                  updateItem(index, { productId: event.target.value })
                }
                required
                disabled={!cashRegister}>
                <option value='' disabled>
                  Produto
                </option>
                {availableProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {formatCurrency(product.salePrice)} -
                    disponivel {formatQuantity(product.availableStock)}
                  </option>
                ))}
              </select>
              <input
                value={item.quantity}
                type='number'
                min='0.001'
                step='0.001'
                placeholder='Quantidade'
                required
                disabled={!cashRegister}
                onChange={(event) =>
                  updateItem(index, { quantity: event.target.value })
                }
              />
            </div>
          ))}
        </div>

        <SecondaryButton
          type='button'
          onClick={() =>
            setItems((currentItems) => [...currentItems, emptySaleItem()])
          }
          disabled={!cashRegister}>
          Adicionar item
        </SecondaryButton>

        <div className='two-columns'>
          <select
            value={paymentMethodId}
            onChange={(event) => setPaymentMethodId(event.target.value)}
            required
            disabled={!cashRegister}>
            <option value='' disabled>
              Pagamento
            </option>
            {paymentMethods
              .filter((method) => method.active)
              .map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
          </select>
          <label className='field-label'>
            Total estimado
            <input value={formatCurrency(saleTotal)} disabled />
          </label>
        </div>
        <select
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
          disabled={!cashRegister}>
          <option value=''>Cliente nao identificado</option>
          {clients
            .filter((client) => client.active)
            .map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
        </select>
        <PrimaryButton
          icon={<Plus size={17} />}
          type='submit'
          disabled={!cashRegister}>
          Concluir venda
        </PrimaryButton>
      </form>

      <div className='panel wide'>
        <div className='panel-header compact'>
          <h2>Vendas registradas</h2>
          <span>{sales.length} registros</span>
        </div>
        <div className='table-shell'>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Qtd.</th>
                <th>Total</th>
                <th>Pagamento</th>
                <th>Cliente</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{formatDateTime(sale.createdAt)}</td>
                  <td>
                    {sale.items.length} item(ns)
                    <span className='table-note'>
                      {sale.items.map((item) => item.productName).join(', ')}
                    </span>
                  </td>
                  <td>
                    {formatQuantity(
                      String(
                        sale.items.reduce(
                          (sum, item) => sum + Number(item.quantity),
                          0,
                        ),
                      ),
                    )}
                  </td>
                  <td>{formatCurrency(sale.totalAmount)}</td>
                  <td>{sale.paymentMethodName}</td>
                  <td>{sale.clientName ?? 'Nao identificado'}</td>
                </tr>
              ))}
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={6}>Nenhuma venda registrada.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function emptySaleItem(): SaleDraftItem {
  return {
    productId: '',
    quantity: '',
  }
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
  return (
    <section className='layout-grid stock-entry-layout'>
      <div className='panel form-panel'>
        <div className='panel-header compact'>
          <div>
            <h2>Registrar orcamento</h2>
            <span>
              Crie o orcamento e envie para este fluxo quando o cliente aprovar.
            </span>
          </div>
          <Send size={18} />
        </div>
        <p className='field-help'>
          Pedidos para envio nascem de orcamentos salvos. Depois disso, aprove,
          reserve, separe e conclua a venda quando o pedido sair.
        </p>
        <PrimaryButton
          icon={<Plus size={17} />}
          type='button'
          onClick={onOpenQuotes}>
          Registrar orcamento
        </PrimaryButton>
      </div>

      <div className='panel wide'>
        <div className='panel-header compact'>
          <div>
            <h2>Pedidos para envio</h2>
            <span>
              Reserve, separe e conclua a venda quando o pedido sair para envio.
            </span>
          </div>
          <span>{orders.length} registros</span>
        </div>
        <div className='table-shell'>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Produto</th>
                <th>Qtd.</th>
                <th>Total</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{formatDateTime(order.createdAt)}</td>
                  <td>{order.clientName}</td>
                  <td>
                    {order.items.length} item(ns)
                    {order.quoteId ? (
                      <span className='table-note'>Origem: orcamento</span>
                    ) : null}
                    <span className='table-note'>
                      {order.items.map((item) => item.productName).join(', ')}
                    </span>
                  </td>
                  <td>
                    {formatQuantity(
                      String(
                        order.items.reduce(
                          (sum, item) => sum + Number(item.quantity),
                          0,
                        ),
                      ),
                    )}
                  </td>
                  <td>{formatCurrency(order.totalAmount)}</td>
                  <td>
                    <StatusChip
                      label={shippingOrderStatusLabel(order.status)}
                      tone={shippingOrderStatusTone(order.status)}
                    />
                    {order.cancellationReason ? (
                      <div className='table-note'>
                        {order.cancellationReason}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {order.status !== 'CANCELLED' &&
                    order.status !== 'COMPLETED' ? (
                      <div className='shipping-order-actions'>
                        {order.status === 'QUOTED' ? (
                          <TableActionButton
                            type='button'
                            onClick={() => onApprove(order)}>
                            Aprovar e reservar
                          </TableActionButton>
                        ) : order.status === 'APPROVED' ? (
                          <TableActionButton
                            type='button'
                            onClick={() => onSeparate(order)}>
                            Confirmar separacao
                          </TableActionButton>
                        ) : (
                          <form
                            className='cancel-order-form'
                            onSubmit={(event) => onComplete(event, order)}>
                            {!cashRegister ? (
                              <span className='table-note'>
                                Abra o caixa para concluir.
                              </span>
                            ) : null}
                            <select
                              name='shippingPaymentMethodId'
                              defaultValue=''
                              required
                              disabled={!cashRegister}>
                              <option value='' disabled>
                                Pagamento
                              </option>
                              {paymentMethods
                                .filter((method) => method.active)
                                .map((method) => (
                                  <option key={method.id} value={method.id}>
                                    {method.name}
                                  </option>
                                ))}
                            </select>
                            <TableActionButton
                              type='submit'
                              disabled={!cashRegister}>
                              Concluir venda e saida
                            </TableActionButton>
                          </form>
                        )}
                        <form
                          className='cancel-order-form'
                          onSubmit={(event) => onCancel(event, order)}>
                          <input
                            name='shippingCancellationReason'
                            maxLength={500}
                            placeholder='Motivo do cancelamento'
                            required
                          />
                          <TableActionButton type='submit'>
                            Cancelar
                          </TableActionButton>
                        </form>
                      </div>
                    ) : order.status === 'COMPLETED' ? (
                      'Venda concluida'
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7}>Nenhum orcamento para envio registrado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
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
  const availableProducts = products.filter(
    (product) => product.active && Number(product.availableStock) > 0,
  )
  const reservationTotal = items.reduce((sum, item) => {
    const product = availableProducts.find(
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
    <section className='layout-grid stock-entry-layout'>
      <form className='panel form-panel' onSubmit={submit}>
        <div className='panel-header compact'>
          <div>
            <h2>Nova reserva</h2>
            <span>Reserve uma ou mais pecas para retirada na loja.</span>
          </div>
          <PackagePlus size={18} />
        </div>
        <p className='field-help'>
          A reserva prende o saldo disponivel imediatamente. A baixa acontece
          somente ao concluir a venda.
        </p>
        <select
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
          required>
          <option value='' disabled>
            Cliente
          </option>
          {clients
            .filter((client) => client.active)
            .map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
                {client.phone ? ` - ${client.phone}` : ''}
              </option>
            ))}
        </select>

        <div className='quote-items'>
          {items.map((item, index) => (
            <div className='quote-item-row' key={index}>
              <div className='panel-header compact'>
                <strong>Item {index + 1}</strong>
                {items.length > 1 ? (
                  <TableActionButton
                    type='button'
                    onClick={() => removeItem(index)}>
                    Remover
                  </TableActionButton>
                ) : null}
              </div>
              <select
                value={item.productId}
                onChange={(event) =>
                  updateItem(index, { productId: event.target.value })
                }
                required>
                <option value='' disabled>
                  Produto
                </option>
                {availableProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {formatCurrency(product.salePrice)} -
                    disponivel {formatQuantity(product.availableStock)}
                  </option>
                ))}
              </select>
              <input
                value={item.quantity}
                type='number'
                min='0.001'
                step='0.001'
                placeholder='Quantidade'
                required
                onChange={(event) =>
                  updateItem(index, { quantity: event.target.value })
                }
              />
            </div>
          ))}
        </div>

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
        <label className='field-label'>
          Total estimado
          <input value={formatCurrency(reservationTotal)} disabled />
        </label>
        <PrimaryButton icon={<Plus size={17} />} type='submit'>
          Registrar reserva
        </PrimaryButton>
      </form>

      <div className='panel wide'>
        <div className='panel-header compact'>
          <div>
            <h2>Reservas para retirada</h2>
            <span>
              Conclua a venda quando o cliente retirar ou cancele para liberar o
              estoque.
            </span>
          </div>
          <span>{reservations.length} registros</span>
        </div>
        <div className='table-shell'>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Produto</th>
                <th>Qtd.</th>
                <th>Total</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation.id}>
                  <td>{formatDateTime(reservation.createdAt)}</td>
                  <td>{reservation.clientName}</td>
                  <td>
                    {reservation.items.length} item(ns)
                    <span className='table-note'>
                      {reservation.items
                        .map((item) => item.productName)
                        .join(', ')}
                    </span>
                  </td>
                  <td>
                    {formatQuantity(
                      String(
                        reservation.items.reduce(
                          (sum, item) => sum + Number(item.quantity),
                          0,
                        ),
                      ),
                    )}
                  </td>
                  <td>{formatCurrency(reservation.totalAmount)}</td>
                  <td>
                    <StatusChip
                      label={pickupReservationStatusLabel(reservation.status)}
                      tone={pickupReservationStatusTone(reservation.status)}
                    />
                    {reservation.cancellationReason ? (
                      <div className='table-note'>
                        {reservation.cancellationReason}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {reservation.status === 'RESERVED' ? (
                      <div className='shipping-order-actions'>
                        <form
                          className='cancel-order-form'
                          onSubmit={(event) => onComplete(event, reservation)}>
                          {!cashRegister ? (
                            <span className='table-note'>
                              Abra o caixa para concluir.
                            </span>
                          ) : null}
                          <select
                            name='pickupPaymentMethodId'
                            defaultValue=''
                            required
                            disabled={!cashRegister}>
                            <option value='' disabled>
                              Pagamento
                            </option>
                            {paymentMethods
                              .filter((method) => method.active)
                              .map((method) => (
                                <option key={method.id} value={method.id}>
                                  {method.name}
                                </option>
                              ))}
                          </select>
                          <TableActionButton
                            type='submit'
                            disabled={!cashRegister}>
                            Concluir venda
                          </TableActionButton>
                        </form>
                        <form
                          className='cancel-order-form'
                          onSubmit={(event) => onCancel(event, reservation)}>
                          <input
                            name='pickupCancellationReason'
                            maxLength={500}
                            placeholder='Motivo do cancelamento'
                            required
                          />
                          <TableActionButton type='submit'>
                            Cancelar
                          </TableActionButton>
                        </form>
                      </div>
                    ) : reservation.status === 'COMPLETED' ? (
                      'Venda concluida'
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
              {reservations.length === 0 ? (
                <tr>
                  <td colSpan={7}>Nenhuma reserva para retirada registrada.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
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
