import { List as ListIcon, Plus } from "lucide-react";
import { FormEvent, useState } from "react";
import type { Client, Product, Quote } from "../../api";
import { PrimaryButton, SecondaryButton, StatusChip, TableActionButton } from "../../components/ui";
import { formatCurrency, formatDate, formatDateTime } from "../../utils/format";

type QuoteDraftItem = {
  productId: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

export type QuoteDraftInput = {
  clientId: string;
  validUntil?: string | null;
  notes?: string | null;
  items: Array<{
    productId: string;
    description?: string | null;
    quantity: number;
    unitPrice?: number | null;
  }>;
};

export function QuotesPage({
  clients,
  products,
  quotes,
  onSubmit,
}: {
  clients: Client[];
  products: Product[];
  quotes: Quote[];
  onSubmit: (input: QuoteDraftInput) => Promise<boolean>;
}) {
  const [clientId, setClientId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuoteDraftItem[]>([emptyQuoteItem()]);
  const activeProducts = products.filter((product) => product.active);
  const quoteTotal = items.reduce((sum, item) => {
    return sum + Number(item.quantity || 0) * Number(item.unitPrice || 0);
  }, 0);

  function updateItem(index: number, changes: Partial<QuoteDraftItem>) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        if (changes.productId) {
          const product = activeProducts.find((currentProduct) => currentProduct.id === changes.productId);

          return {
            ...item,
            ...changes,
            description: product?.description ?? product?.name ?? item.description,
            unitPrice: product?.salePrice ?? item.unitPrice,
          };
        }

        return { ...item, ...changes };
      }),
    );
  }

  function removeItem(index: number) {
    setItems((currentItems) => currentItems.filter((_item, itemIndex) => itemIndex !== index));
  }

  function resetQuoteForm() {
    setClientId("");
    setValidUntil("");
    setNotes("");
    setItems([emptyQuoteItem()]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const saved = await onSubmit({
      clientId,
      validUntil: validUntil || null,
      notes: notes.trim() || null,
      items: items.map((item) => ({
        productId: item.productId,
        description: item.description.trim() || null,
        quantity: Number(item.quantity),
        unitPrice: item.unitPrice === "" ? null : Number(item.unitPrice),
      })),
    });

    if (saved) {
      resetQuoteForm();
    }
  }

  return (
    <section className="layout-grid stock-entry-layout">
      <form className="panel form-panel" onSubmit={submit}>
        <div className="panel-header compact">
          <div>
            <h2>Novo orcamento</h2>
            <span>Monte itens, valores e dados comerciais antes do PDF.</span>
          </div>
          <ListIcon size={18} />
        </div>
        <select value={clientId} onChange={(event) => setClientId(event.target.value)} required>
          <option value="" disabled>
            Cliente
          </option>
          {clients.filter((client) => client.active).map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}{client.phone ? ` - ${client.phone}` : ""}
            </option>
          ))}
        </select>
        <div className="two-columns">
          <label className="field-label">
            Validade
            <input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
          </label>
          <label className="field-label">
            Total
            <input value={formatCurrency(quoteTotal)} disabled />
          </label>
        </div>
        <textarea
          value={notes}
          maxLength={1000}
          placeholder="Observacoes do orcamento"
          rows={3}
          onChange={(event) => setNotes(event.target.value)}
        />

        <div className="quote-items">
          {items.map((item, index) => (
            <div className="quote-item-row" key={index}>
              <div className="panel-header compact">
                <strong>Item {index + 1}</strong>
                {items.length > 1 ? (
                  <TableActionButton type="button" onClick={() => removeItem(index)}>
                    Remover
                  </TableActionButton>
                ) : null}
              </div>
              <select
                value={item.productId}
                onChange={(event) => updateItem(index, { productId: event.target.value })}
                required
              >
                <option value="" disabled>
                  Produto
                </option>
                {activeProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - base {formatCurrency(product.salePrice)}
                  </option>
                ))}
              </select>
              <input
                value={item.description}
                placeholder="Descricao no orcamento"
                maxLength={500}
                onChange={(event) => updateItem(index, { description: event.target.value })}
                required
              />
              <div className="two-columns">
                <input
                  value={item.quantity}
                  type="number"
                  min="0.001"
                  step="0.001"
                  placeholder="Quantidade"
                  onChange={(event) => updateItem(index, { quantity: event.target.value })}
                  required
                />
                <input
                  value={item.unitPrice}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Valor unitario"
                  onChange={(event) => updateItem(index, { unitPrice: event.target.value })}
                  required
                />
              </div>
            </div>
          ))}
        </div>

        <SecondaryButton type="button" onClick={() => setItems((currentItems) => [...currentItems, emptyQuoteItem()])}>
          Adicionar item
        </SecondaryButton>
        <PrimaryButton icon={<Plus size={17} />} type="submit">
          Salvar orcamento
        </PrimaryButton>
      </form>

      <div className="panel wide">
        <div className="panel-header compact">
          <div>
            <h2>Orcamentos salvos</h2>
            <span>{quotes.length} registros</span>
          </div>
          <StatusChip label="PDF disponivel" tone="success" />
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Itens</th>
                <th>Validade</th>
                <th>Total</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id}>
                  <td>{formatDateTime(quote.createdAt)}</td>
                  <td>{quote.clientName}</td>
                  <td>
                    {quote.items.length} item(ns)
                    <span className="table-note">
                      {quote.items.map((item) => item.description).join(", ")}
                    </span>
                  </td>
                  <td>{quote.validUntil ? formatDate(quote.validUntil) : "-"}</td>
                  <td>{formatCurrency(quote.totalAmount)}</td>
                  <td>
                    <StatusChip label="Rascunho" tone="warning" />
                  </td>
                  <td>
                    <TableActionButton href={`/api/quotes/${quote.id}/pdf`}>
                      Baixar PDF
                    </TableActionButton>
                  </td>
                </tr>
              ))}
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={7}>Nenhum orcamento salvo.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function emptyQuoteItem(): QuoteDraftItem {
  return {
    productId: "",
    description: "",
    quantity: "1",
    unitPrice: "",
  };
}
