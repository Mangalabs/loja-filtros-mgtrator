import { PackagePlus, Plus, Send, ShoppingCart } from "lucide-react";
import type { FormEvent } from "react";
import type {
  CashRegisterSession,
  Client,
  PaymentMethod,
  PickupReservation,
  Product,
  Sale,
  ShippingOrder,
} from "../../api";
import { PrimaryButton, StatusChip, TableActionButton, type StatusTone } from "../../components/ui";
import { formatCurrency, formatDateTime, formatQuantity } from "../../utils/format";

export function SalesPage({
  cashRegister,
  clients,
  paymentMethods,
  products,
  sales,
  onSubmit,
}: {
  cashRegister: CashRegisterSession | null;
  clients: Client[];
  paymentMethods: PaymentMethod[];
  products: Product[];
  sales: Sale[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="layout-grid stock-entry-layout">
      <form className="panel form-panel" onSubmit={onSubmit}>
        <div className="panel-header compact">
          <div>
            <h2>Nova venda</h2>
            <span>Esta etapa aceita um produto e um pagamento por venda.</span>
          </div>
          <ShoppingCart size={18} />
        </div>
        {!cashRegister ? <div className="alert">Abra o caixa antes de registrar vendas.</div> : null}
        <select name="saleProductId" defaultValue="" required disabled={!cashRegister}>
          <option value="" disabled>
            Produto
          </option>
          {products
            .filter((product) => product.active && Number(product.availableStock) > 0)
            .map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} - {formatCurrency(product.salePrice)} - disponivel {formatQuantity(product.availableStock)}
              </option>
            ))}
        </select>
        <div className="two-columns">
          <input
            name="saleQuantity"
            type="number"
            min="0.001"
            step="0.001"
            placeholder="Quantidade"
            required
            disabled={!cashRegister}
          />
          <select name="salePaymentMethodId" defaultValue="" required disabled={!cashRegister}>
            <option value="" disabled>
              Pagamento
            </option>
            {paymentMethods.filter((method) => method.active).map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>
        </div>
        <select name="saleClientId" defaultValue="" disabled={!cashRegister}>
          <option value="">Cliente nao identificado</option>
          {clients.filter((client) => client.active).map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <PrimaryButton icon={<Plus size={17} />} type="submit" disabled={!cashRegister}>
          Concluir venda
        </PrimaryButton>
      </form>

      <div className="panel wide">
        <div className="panel-header compact">
          <h2>Vendas registradas</h2>
          <span>{sales.length} registros</span>
        </div>
        <div className="table-shell">
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
                  <td>{sale.productName}</td>
                  <td>{formatQuantity(sale.quantity)}</td>
                  <td>{formatCurrency(sale.totalAmount)}</td>
                  <td>{sale.paymentMethodName}</td>
                  <td>{sale.clientName ?? "Nao identificado"}</td>
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
  );
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
  cashRegister: CashRegisterSession | null;
  paymentMethods: PaymentMethod[];
  orders: ShippingOrder[];
  onOpenQuotes: () => void;
  onApprove: (order: ShippingOrder) => void;
  onSeparate: (order: ShippingOrder) => void;
  onComplete: (event: FormEvent<HTMLFormElement>, order: ShippingOrder) => void;
  onCancel: (event: FormEvent<HTMLFormElement>, order: ShippingOrder) => void;
}) {
  return (
    <section className="layout-grid stock-entry-layout">
      <div className="panel form-panel">
        <div className="panel-header compact">
          <div>
            <h2>Novo orcamento</h2>
            <span>Monte o orcamento antes de aprovar, reservar e separar o pedido.</span>
          </div>
          <Send size={18} />
        </div>
        <p className="field-help">
          O fluxo de envio passara a nascer a partir de um orcamento salvo. A conversao do orcamento para pedido
          sera adicionada na proxima etapa.
        </p>
        <PrimaryButton icon={<Plus size={17} />} type="button" onClick={onOpenQuotes}>
          Registrar orcamento
        </PrimaryButton>
      </div>

      <div className="panel wide">
        <div className="panel-header compact">
          <div>
            <h2>Pedidos para envio</h2>
            <span>Reserve, separe e conclua a venda quando o pedido sair para envio.</span>
          </div>
          <span>{orders.length} registros</span>
        </div>
        <div className="table-shell">
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
                    {order.quoteId ? <span className="table-note">Origem: orcamento</span> : null}
                    <span className="table-note">
                      {order.items.map((item) => item.productName).join(", ")}
                    </span>
                  </td>
                  <td>
                    {formatQuantity(
                      String(order.items.reduce((sum, item) => sum + Number(item.quantity), 0)),
                    )}
                  </td>
                  <td>{formatCurrency(order.totalAmount)}</td>
                  <td>
                    <StatusChip
                      label={shippingOrderStatusLabel(order.status)}
                      tone={shippingOrderStatusTone(order.status)}
                    />
                    {order.cancellationReason ? <div className="table-note">{order.cancellationReason}</div> : null}
                  </td>
                  <td>
                    {order.status !== "CANCELLED" && order.status !== "COMPLETED" ? (
                      <div className="shipping-order-actions">
                        {order.status === "QUOTED" ? (
                          <TableActionButton type="button" onClick={() => onApprove(order)}>
                            Aprovar e reservar
                          </TableActionButton>
                        ) : order.status === "APPROVED" ? (
                          <TableActionButton type="button" onClick={() => onSeparate(order)}>
                            Confirmar separacao
                          </TableActionButton>
                        ) : (
                          <form className="cancel-order-form" onSubmit={(event) => onComplete(event, order)}>
                            {!cashRegister ? <span className="table-note">Abra o caixa para concluir.</span> : null}
                            <select name="shippingPaymentMethodId" defaultValue="" required disabled={!cashRegister}>
                              <option value="" disabled>
                                Pagamento
                              </option>
                              {paymentMethods.filter((method) => method.active).map((method) => (
                                <option key={method.id} value={method.id}>
                                  {method.name}
                                </option>
                              ))}
                            </select>
                            <TableActionButton type="submit" disabled={!cashRegister}>
                              Concluir venda e saida
                            </TableActionButton>
                          </form>
                        )}
                        <form className="cancel-order-form" onSubmit={(event) => onCancel(event, order)}>
                          <input
                            name="shippingCancellationReason"
                            maxLength={500}
                            placeholder="Motivo do cancelamento"
                            required
                          />
                          <TableActionButton type="submit">
                            Cancelar
                          </TableActionButton>
                        </form>
                      </div>
                    ) : order.status === "COMPLETED" ? (
                      "Venda concluida"
                    ) : (
                      "-"
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
  );
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
  cashRegister: CashRegisterSession | null;
  clients: Client[];
  paymentMethods: PaymentMethod[];
  products: Product[];
  reservations: PickupReservation[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onComplete: (event: FormEvent<HTMLFormElement>, reservation: PickupReservation) => void;
  onCancel: (event: FormEvent<HTMLFormElement>, reservation: PickupReservation) => void;
}) {
  return (
    <section className="layout-grid stock-entry-layout">
      <form className="panel form-panel" onSubmit={onSubmit}>
        <div className="panel-header compact">
          <div>
            <h2>Nova reserva</h2>
            <span>Reserve uma peca para o cliente retirar na loja.</span>
          </div>
          <PackagePlus size={18} />
        </div>
        <p className="field-help">
          A reserva prende o saldo disponivel imediatamente. A baixa acontece somente ao concluir a venda.
        </p>
        <select name="pickupClientId" defaultValue="" required>
          <option value="" disabled>
            Cliente
          </option>
          {clients.filter((client) => client.active).map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}{client.phone ? ` - ${client.phone}` : ""}
            </option>
          ))}
        </select>
        <select name="pickupProductId" defaultValue="" required>
          <option value="" disabled>
            Produto
          </option>
          {products
            .filter((product) => product.active && Number(product.availableStock) > 0)
            .map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} - {formatCurrency(product.salePrice)} - disponivel {formatQuantity(product.availableStock)}
              </option>
            ))}
        </select>
        <input
          name="pickupQuantity"
          type="number"
          min="0.001"
          step="0.001"
          placeholder="Quantidade"
          required
        />
        <PrimaryButton icon={<Plus size={17} />} type="submit">
          Registrar reserva
        </PrimaryButton>
      </form>

      <div className="panel wide">
        <div className="panel-header compact">
          <div>
            <h2>Reservas para retirada</h2>
            <span>Conclua a venda quando o cliente retirar ou cancele para liberar o estoque.</span>
          </div>
          <span>{reservations.length} registros</span>
        </div>
        <div className="table-shell">
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
                  <td>{reservation.productName}</td>
                  <td>{formatQuantity(reservation.quantity)}</td>
                  <td>{formatCurrency(reservation.totalAmount)}</td>
                  <td>
                    <StatusChip
                      label={pickupReservationStatusLabel(reservation.status)}
                      tone={pickupReservationStatusTone(reservation.status)}
                    />
                    {reservation.cancellationReason ? (
                      <div className="table-note">{reservation.cancellationReason}</div>
                    ) : null}
                  </td>
                  <td>
                    {reservation.status === "RESERVED" ? (
                      <div className="shipping-order-actions">
                        <form className="cancel-order-form" onSubmit={(event) => onComplete(event, reservation)}>
                          {!cashRegister ? <span className="table-note">Abra o caixa para concluir.</span> : null}
                          <select name="pickupPaymentMethodId" defaultValue="" required disabled={!cashRegister}>
                            <option value="" disabled>
                              Pagamento
                            </option>
                            {paymentMethods.filter((method) => method.active).map((method) => (
                              <option key={method.id} value={method.id}>
                                {method.name}
                              </option>
                            ))}
                          </select>
                          <TableActionButton type="submit" disabled={!cashRegister}>
                            Concluir venda
                          </TableActionButton>
                        </form>
                        <form className="cancel-order-form" onSubmit={(event) => onCancel(event, reservation)}>
                          <input
                            name="pickupCancellationReason"
                            maxLength={500}
                            placeholder="Motivo do cancelamento"
                            required
                          />
                          <TableActionButton type="submit">
                            Cancelar
                          </TableActionButton>
                        </form>
                      </div>
                    ) : reservation.status === "COMPLETED" ? (
                      "Venda concluida"
                    ) : (
                      "-"
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
  );
}

function shippingOrderStatusLabel(status: ShippingOrder["status"]) {
  if (status === "APPROVED") {
    return "Aprovado - separar";
  }

  if (status === "SEPARATED") {
    return "Separado para envio";
  }

  if (status === "COMPLETED") {
    return "Venda concluida";
  }

  return status === "CANCELLED" ? "Cancelado" : "Orcamento enviado";
}

function shippingOrderStatusTone(status: ShippingOrder["status"]): StatusTone {
  if (status === "APPROVED" || status === "SEPARATED" || status === "COMPLETED") {
    return "success";
  }

  return status === "CANCELLED" ? "neutral" : "warning";
}

function pickupReservationStatusLabel(status: PickupReservation["status"]) {
  if (status === "COMPLETED") {
    return "Venda concluida";
  }

  return status === "CANCELLED" ? "Cancelada" : "Reservada";
}

function pickupReservationStatusTone(status: PickupReservation["status"]): StatusTone {
  if (status === "COMPLETED") {
    return "success";
  }

  return status === "CANCELLED" ? "neutral" : "warning";
}
