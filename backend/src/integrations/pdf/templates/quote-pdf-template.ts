import type { Quote, QuoteItem } from "../../../models/quotes/quotes.model.js";

export type QuotePdfStore = {
  name: string;
  address: string;
  city: string;
  document: string;
  phone: string | null;
  email: string | null;
};

export function quotePdfHtml(quote: Quote, store: QuotePdfStore) {
  const rows = quote.items
    .map((item, index) => quoteItemRow(item, index))
    .join("");
  const storeContact = [store.phone, store.email].filter(Boolean).join(" | ");

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Orcamento no ${escapeHtml(quote.id)}</title>
        <style>
          ${quotePdfCss()}
        </style>
      </head>
      <body>
        <div class="page">
          <header class="header">
            <div class="logo-area">
              <span>Filtros MG</span>
            </div>

            <section class="seller-box">
              <h1>ORCAMENTO</h1>
              <p><strong>Vendedor:</strong> ${escapeHtml(quote.createdByUserName)}</p>
              <p><strong>Contato:</strong> ${escapeHtml(quote.createdByUserPhone ?? "Nao informado")}</p>
              <p><strong>Email:</strong> ${escapeHtml(quote.createdByUserEmail)}</p>
            </section>

            <section class="store-address">
              <strong>${escapeHtml(store.name)}</strong>
              <span>${escapeHtml(store.address)}</span>
              <span>${escapeHtml(store.city)}</span>
              <span>${escapeHtml(store.document)}</span>
              ${storeContact ? `<span>${escapeHtml(storeContact)}</span>` : ""}
            </section>
          </header>

          <section class="quote-number">
            <span>Numero do orcamento</span>
            <strong>#${escapeHtml(quote.id)}</strong>
          </section>

          <section class="buyer-box">
            <h2>Informacoes do comprador</h2>
            <div class="buyer-grid">
              <p><strong>Nome:</strong> ${escapeHtml(quote.clientName)}</p>
              <p><strong>Documento:</strong> ${escapeHtml(quote.clientDocument ?? "Nao informado")}</p>
              <p><strong>Telefone:</strong> ${escapeHtml(quote.clientPhone ?? "Nao informado")}</p>
              <p><strong>Email:</strong> ${escapeHtml(quote.clientEmail ?? "Nao informado")}</p>
              <p><strong>Emissao:</strong> ${formatDate(quote.createdAt)}</p>
              <p><strong>Validade:</strong> ${quote.validUntil ? formatDate(quote.validUntil) : "Nao informada"}</p>
            </div>
          </section>

          <table class="items-table">
            <thead>
              <tr>
                <th class="text-center">Item</th>
                <th class="text-center">Qtde</th>
                <th>Produto</th>
                <th>Descricao</th>
                <th>Marca</th>
                <th class="text-center">NCM</th>
                <th class="text-right">Preco unit.</th>
                <th class="text-right">IPI</th>
                <th class="text-right">ST</th>
                <th class="text-right">Total unit.</th>
                <th class="text-center">Entrega</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <section class="summary-row">
            <div class="notes-box">
              <h2>Observacoes</h2>
              <p>${quote.notes ? escapeHtml(quote.notes) : "Sem observacoes adicionais."}</p>
            </div>

            <table class="summary-table">
              <tbody>
                <tr>
                  <td>Subtotal:</td>
                  <td class="text-right">${formatCurrency(quote.totalAmount)}</td>
                </tr>
                <tr>
                  <td>Frete:</td>
                  <td class="text-right">A combinar</td>
                </tr>
                <tr class="total-row">
                  <td>Total geral:</td>
                  <td class="text-right">${formatCurrency(quote.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <footer class="footer">
            Gerado automaticamente pelo sistema da filial. Proposta sujeita a disponibilidade de estoque.
          </footer>
        </div>
      </body>
    </html>
  `;
}

function quoteItemRow(item: QuoteItem, index: number) {
  const delivery =
    Number(item.productAvailableStock) >= Number(item.quantity)
      ? "IMEDIATA"
      : "NEGATIVO";

  return `
    <tr>
      <td class="text-center">${String(index + 1).padStart(2, "0")}</td>
      <td class="text-center">${formatQuantity(item.quantity)}</td>
      <td>${escapeHtml(item.productInternalCode ?? "-")}</td>
      <td>${escapeHtml(item.description)}</td>
      <td>${escapeHtml(item.productBrandName ?? "-")}</td>
      <td class="text-center">${escapeHtml(item.productNcm ?? "-")}</td>
      <td class="text-right">${formatCurrency(item.unitPrice)}</td>
      <td class="text-right">-</td>
      <td class="text-right">-</td>
      <td class="text-right">${formatCurrency(item.totalAmount)}</td>
      <td class="text-center delivery-${delivery.toLowerCase()}">${delivery}</td>
    </tr>
  `;
}

function quotePdfCss() {
  return `
    @page {
      size: A4 landscape;
      margin: 0;
    }
    * { box-sizing: border-box; }
    body {
      color: #243241;
      font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 8.5pt;
      line-height: 1.3;
      margin: 0;
      padding: 0;
    }
    .page {
      min-height: 100%;
      padding-bottom: 20px;
      position: relative;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .header {
      align-items: stretch;
      border-bottom: 2px solid #1a365d;
      display: grid;
      gap: 12px;
      grid-template-columns: 42mm 1fr 1fr;
      margin-bottom: 10px;
      padding-bottom: 8px;
    }
    .logo-area {
      align-items: center;
      background-color: #f1f5f9;
      border: 1px dashed #cbd5e1;
      color: #64748b;
      display: flex;
      font-size: 10pt;
      font-weight: 700;
      justify-content: center;
      min-height: 24mm;
      text-transform: uppercase;
    }
    .seller-box h1 {
      color: #1a365d;
      font-size: 18pt;
      margin: 0 0 5px;
    }
    .seller-box p,
    .store-address span {
      color: #475569;
      display: block;
      margin: 2px 0;
    }
    .store-address {
      color: #475569;
      text-align: right;
    }
    .store-address strong {
      color: #1a365d;
      display: block;
      font-size: 11pt;
      margin-bottom: 4px;
    }
    .quote-number {
      align-items: center;
      background-color: #f8fafc;
      border: 1px solid #dbe4ee;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      padding: 8px 10px;
    }
    .quote-number span {
      color: #64748b;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .quote-number strong {
      color: #1a365d;
      font-size: 11pt;
    }
    .buyer-box {
      border: 1px solid #dbe4ee;
      border-radius: 6px;
      margin-bottom: 10px;
      padding: 8px 10px;
    }
    .buyer-box h2,
    .notes-box h2 {
      color: #1a365d;
      font-size: 9pt;
      margin: 0 0 6px;
      text-transform: uppercase;
    }
    .buyer-grid {
      display: grid;
      gap: 4px 12px;
      grid-template-columns: 1.5fr 1fr 1fr;
    }
    .buyer-grid p,
    .notes-box p {
      margin: 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    tr {
      page-break-inside: avoid;
    }
    th {
      background-color: #1a365d;
      color: #ffffff;
      font-size: 7.2pt;
      font-weight: 700;
      padding: 5px 4px;
      text-transform: uppercase;
    }
    td {
      border-bottom: 1px solid #e2e8f0;
      font-size: 7.6pt;
      padding: 5px 4px;
      vertical-align: top;
    }
    .items-table {
      margin-bottom: 10px;
      table-layout: fixed;
    }
    .items-table th:nth-child(1) { width: 5%; }
    .items-table th:nth-child(2) { width: 6%; }
    .items-table th:nth-child(3) { width: 13%; }
    .items-table th:nth-child(4) { width: 20%; }
    .items-table th:nth-child(5) { width: 10%; }
    .items-table th:nth-child(6) { width: 9%; }
    .items-table th:nth-child(7) { width: 9%; }
    .items-table th:nth-child(8) { width: 6%; }
    .items-table th:nth-child(9) { width: 6%; }
    .items-table th:nth-child(10) { width: 9%; }
    .items-table th:nth-child(11) { width: 7%; }
    .items-table tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .delivery-imediata {
      color: #166534;
      font-weight: 700;
    }
    .delivery-negativo {
      color: #991b1b;
      font-weight: 700;
    }
    .summary-row {
      align-items: flex-start;
      display: grid;
      gap: 12px;
      grid-template-columns: 1fr 72mm;
      page-break-inside: avoid;
    }
    .notes-box {
      background-color: #f8fafc;
      border: 1px solid #dbe4ee;
      border-radius: 6px;
      min-height: 24mm;
      padding: 8px 10px;
    }
    .summary-table td {
      border-bottom: 1px solid #e2e8f0;
      font-size: 8.2pt;
      padding: 6px 8px;
    }
    .summary-table tr.total-row td {
      background-color: #f1f5f9;
      border-top: 2px solid #1a365d;
      color: #1a365d;
      font-size: 10pt;
      font-weight: 700;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      bottom: 0;
      color: #94a3b8;
      font-size: 7pt;
      left: 0;
      padding-top: 5px;
      position: fixed;
      right: 0;
      text-align: center;
    }
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCurrency(value: string) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatQuantity(value: string) {
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("pt-BR");
}
