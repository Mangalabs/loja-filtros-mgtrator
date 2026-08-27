import type { Quote, QuoteItem } from "../../../models/quotes/quotes.model.js";

export type QuotePdfStore = {
  name: string;
  address: string;
  city: string;
  document: string;
  phone: string | null;
  email: string | null;
  logoDataUri?: string | null;
};

export function quotePdfHtml(quote: Quote, store: QuotePdfStore) {
  const rows = quote.items
    .map((item, index) => quoteItemRow(item, index, quote.showBrand))
    .join("");
  const storeContact = [store.phone, store.email].filter(Boolean).join(" | ");
  const itemDiscountAmount = quote.items.reduce(
    (sum, item) => sum + Number(item.discountAmount),
    0,
  );

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
              ${store.logoDataUri ? `<img src="${escapeHtml(store.logoDataUri)}" alt="${escapeHtml(store.name)}" />` : `<span>${escapeHtml(store.name)}</span>`}
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
            <div>
              <span>Numero do orcamento</span>
              <strong>#${escapeHtml(quote.id)}</strong>
            </div>
            <div>
              <span>Filial</span>
              <strong>${escapeHtml(quote.branchName ?? "Nao informada")}</strong>
            </div>
          </section>

          <section class="buyer-box">
            <h2>Informacoes do comprador</h2>
            <div class="buyer-grid">
              <p><strong>Nome:</strong> ${escapeHtml(quote.clientName)}</p>
              <p><strong>Documento:</strong> ${escapeHtml(quote.clientDocument ?? "Nao informado")}</p>
              <p><strong>Telefone:</strong> ${escapeHtml(quote.clientPhone ?? "Nao informado")}</p>
              <p><strong>Email:</strong> ${escapeHtml(quote.clientEmail ?? "Nao informado")}</p>
              <p><strong>Emissao:</strong> ${formatDate(quote.createdAt)}</p>
              <p><strong>Data de emissão/fatura:</strong> ${formatOptionalDate(quote.billingIssueDate)}</p>
              <p><strong>Vencimento do boleto/fatura:</strong> ${formatOptionalDate(quote.billingDueDate)}</p>
              <p><strong>Validade do orçamento:</strong> ${quote.validUntil ? formatDate(quote.validUntil) : "Nao informada"}</p>
            </div>
            <div class="payment-highlight">
              <span>Forma de pagamento</span>
              <strong>${escapeHtml(quote.paymentMethodName ?? "Nao informada")}</strong>
            </div>
            ${quote.paymentInstallments.length > 0 ? quoteInstallmentsHtml(quote) : ""}
          </section>

          <table class="items-table">
            <thead>
              <tr>
                <th class="text-center">Item</th>
                <th class="text-center">Qtde</th>
                <th>Produto</th>
                <th>Descricao</th>
                ${quote.showBrand ? "<th>Marca</th>" : ""}
                <th class="text-center">NCM</th>
                <th class="text-right">Preco unit.</th>
                <th class="text-right">Desc.</th>
                <th class="text-right">IPI</th>
                <th class="text-right">ST</th>
                <th class="text-right">Total unit.</th>
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
                  <td class="text-right">${formatCurrency(quote.subtotalAmount)}</td>
                </tr>
                <tr>
                  <td>Desc. itens:</td>
                  <td class="text-right">${formatCurrency(itemDiscountAmount)}</td>
                </tr>
                <tr>
                  <td>Desc. geral (${formatPercentage(quote.discountPercentage)}):</td>
                  <td class="text-right">${formatCurrency(quote.discountAmount)}</td>
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

function quoteInstallmentsHtml(quote: Quote) {
  const rows = quote.paymentInstallments
    .map(
      (installment) => `
        <tr>
          <td>${installment.position}</td>
          <td>${formatDate(installment.dueDate)}</td>
          <td class="text-right">${formatCurrency(installment.amount)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <div class="installments-box">
      <strong>Parcelamento</strong>
      <table>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function quoteItemRow(item: QuoteItem, index: number, showBrand: boolean) {
  return `
    <tr>
      <td class="text-center">${String(index + 1).padStart(2, "0")}</td>
      <td class="text-center">${formatQuantity(item.quantity)}</td>
      <td>${escapeHtml(item.productInternalCode ?? "-")}</td>
      <td>${escapeHtml(item.description)}</td>
      ${showBrand ? `<td>${escapeHtml(item.productBrandName ?? "-")}</td>` : ""}
      <td class="text-center">${escapeHtml(item.productNcm ?? "-")}</td>
      <td class="text-right">${formatCurrency(item.unitPrice)}</td>
      <td class="text-right">${formatPercentage(item.discountPercentage)} (${formatCurrency(item.discountAmount)})</td>
      <td class="text-right">-</td>
      <td class="text-right">-</td>
      <td class="text-right">${formatCurrency(item.totalAmount)}</td>
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
      min-height: 210mm;
      padding: 8mm 8mm 20px;
      position: relative;
      width: 100%;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .header {
      align-items: stretch;
      border-bottom: 1px solid #d8b769;
      display: grid;
      gap: 12px;
      grid-template-columns: 38mm minmax(0, 1fr) minmax(0, 70mm);
      margin-bottom: 10px;
      padding-bottom: 8px;
    }
    .logo-area {
      align-items: center;
      display: flex;
      font-size: 10pt;
      font-weight: 700;
      justify-content: center;
      min-height: 24mm;
      text-transform: uppercase;
    }
    .logo-area img {
      display: block;
      max-height: 22mm;
      max-width: 39mm;
      object-fit: contain;
    }
    .seller-box h1 {
      color: #1a365d;
      font-size: 18pt;
      margin: 0 0 5px;
    }
    .seller-box,
    .store-address {
      min-width: 0;
    }
    .seller-box p,
    .store-address span {
      color: #475569;
      display: block;
      margin: 2px 0;
    }
    .store-address {
      color: #475569;
      display: grid;
      gap: 2px;
      line-height: 1.2;
      max-width: 100%;
      min-width: 0;
      overflow-wrap: anywhere;
      text-align: right;
    }
    .seller-box p,
    .store-address span,
    .store-address strong {
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
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
    .quote-number div {
      display: grid;
      gap: 2px;
      min-width: 0;
    }
    .quote-number div:last-child {
      text-align: right;
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
    .payment-highlight {
      align-items: center;
      background-color: #fff8e6;
      border: 1px solid #d8b769;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      padding: 7px 10px;
    }
    .payment-highlight span {
      color: #7c6a36;
      font-size: 7.4pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .payment-highlight strong {
      color: #1a365d;
      font-size: 10pt;
    }
    .installments-box {
      border-top: 1px solid #e2e8f0;
      margin-top: 8px;
      padding-top: 8px;
    }
    .installments-box strong {
      color: #1a365d;
      display: block;
      font-size: 8pt;
      margin-bottom: 5px;
      text-transform: uppercase;
    }
    .installments-box td {
      font-size: 7.6pt;
      padding: 4px 5px;
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
      word-break: break-word;
    }
    td {
      border-bottom: 1px solid #e2e8f0;
      font-size: 7.6pt;
      padding: 5px 4px;
      vertical-align: top;
      word-break: break-word;
    }
    .items-table {
      margin-bottom: 10px;
      table-layout: fixed;
    }
    .items-table th:nth-child(1) { width: 5%; }
    .items-table th:nth-child(2) { width: 6%; }
    .items-table th:nth-child(3) { width: 14%; }
    .items-table th:nth-child(4) { width: 22%; }
    .items-table th:nth-child(5) { width: 9%; }
    .items-table th:nth-child(6) { width: 8%; }
    .items-table th:nth-child(7) { width: 9%; }
    .items-table th:nth-child(8) { width: 9%; }
    .items-table th:nth-child(9) { width: 5%; }
    .items-table th:nth-child(10) { width: 5%; }
    .items-table th:nth-child(11) { width: 8%; }
    .items-table tr:nth-child(even) td {
      background-color: #f8fafc;
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
      left: 8mm;
      padding-top: 5px;
      position: fixed;
      right: 8mm;
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

function formatCurrency(value: string | number) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPercentage(value: string | number) {
  return `${Number(value).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}%`;
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

function formatOptionalDate(value: Date | string | null) {
  return value ? formatDate(value) : "Nao informada";
}
