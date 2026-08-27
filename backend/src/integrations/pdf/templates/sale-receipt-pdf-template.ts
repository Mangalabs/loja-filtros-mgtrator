import type {
  Sale,
  SaleItem,
  SaleItemReturn,
} from "../../../models/sales/sales.model.js";
import type { QuotePdfStore } from "./quote-pdf-template.js";

export function saleReceiptPdfHtml(sale: Sale, store: QuotePdfStore) {
  const rows = sale.items.map((item) => saleItemRow(item)).join("");
  const paymentRows = sale.payments
    .map((payment) => salePaymentRow(payment))
    .join("");
  const returnRows = sale.items
    .flatMap((item) =>
      item.returns.map((itemReturn) => saleReturnRow(item, itemReturn)),
    )
    .join("");
  const refundAmount = saleRefundAmount(sale);
  const netAmount = Math.max(Number(sale.totalAmount) - refundAmount, 0);
  const storeContact = [store.phone, store.email].filter(Boolean).join(" | ");

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Comprovante de venda ${escapeHtml(sale.id)}</title>
        <style>${saleReceiptCss()}</style>
      </head>
      <body>
        <main class="receipt">
          <header class="header">
            <div class="logo-area">
              ${store.logoDataUri ? `<img src="${escapeHtml(store.logoDataUri)}" alt="${escapeHtml(store.name)}" />` : `<strong>${escapeHtml(store.name)}</strong>`}
            </div>
            <span>${escapeHtml(store.address)}</span>
            <span>${escapeHtml(store.city)}</span>
            <span>${escapeHtml(store.document)}</span>
            ${storeContact ? `<span>${escapeHtml(storeContact)}</span>` : ""}
          </header>

          <section class="title-box">
            <div>
              <h1>Comprovante de venda</h1>
              <span>Resumo comercial da venda concluida</span>
            </div>
            <strong>Sem valor fiscal</strong>
          </section>

          <section class="info-grid">
            <p><strong>Venda:</strong> ${escapeHtml(sale.id)}</p>
            <p><strong>Data:</strong> ${formatDateTime(sale.createdAt)}</p>
            <p><strong>Operador:</strong> ${escapeHtml(sale.createdByUserName)}</p>
            <p><strong>Cliente:</strong> ${escapeHtml(sale.clientName ?? "Nao identificado")}</p>
            <p><strong>Documento:</strong> ${escapeHtml(sale.clientDocument ?? "Nao informado")}</p>
            <p><strong>Pagamento:</strong> ${escapeHtml(sale.paymentMethodName)}</p>
            <p><strong>Data da fatura:</strong> ${formatOptionalDate(sale.billingIssueDate)}</p>
            <p><strong>Vencimento:</strong> ${formatOptionalDate(sale.billingDueDate)}</p>
          </section>

          ${
            paymentRows
              ? `<table class="payments-table">
                  <thead>
                    <tr>
                      <th>Forma de pagamento</th>
                      <th class="text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>${paymentRows}</tbody>
                </table>`
              : ""
          }

          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Produto</th>
                <th class="text-right">Qtde</th>
                <th class="text-right">Unit.</th>
                <th class="text-right">Desc.</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          ${
            returnRows
              ? `<section class="returns-section">
                  <h2>Devolucoes e estornos</h2>
                  <table class="returns-table">
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th class="text-right">Qtde</th>
                        <th class="text-right">Valor</th>
                        <th>Forma</th>
                        <th>Data</th>
                      </tr>
                    </thead>
                    <tbody>${returnRows}</tbody>
                  </table>
                </section>`
              : ""
          }

          <table class="summary-table">
            <tbody>
              <tr>
                <td>Subtotal</td>
                <td class="text-right">${formatCurrency(sale.subtotalAmount)}</td>
              </tr>
              <tr>
                <td>Desconto</td>
                <td class="text-right">${formatCurrency(sale.discountAmount)}</td>
              </tr>
              <tr class="total-row">
                <td>Total da venda</td>
                <td class="text-right">${formatCurrency(sale.totalAmount)}</td>
              </tr>
              ${
                refundAmount > 0
                  ? `<tr>
                      <td>Estornos</td>
                      <td class="text-right">-${formatCurrency(refundAmount)}</td>
                    </tr>
                    <tr class="net-row">
                      <td>Total liquido</td>
                      <td class="text-right">${formatCurrency(netAmount)}</td>
                    </tr>`
                  : ""
              }
            </tbody>
          </table>

          <footer>
            Documento auxiliar interno. Este comprovante nao substitui NF-e,
            NFC-e, DANFE ou qualquer documento fiscal.
          </footer>
        </main>
      </body>
    </html>
  `;
}

function saleRefundAmount(sale: Sale) {
  return sale.items.reduce(
    (total, item) =>
      total +
      item.returns.reduce(
        (itemTotal, itemReturn) => itemTotal + Number(itemReturn.refundAmount),
        0,
      ),
    0,
  );
}

function saleItemRow(item: SaleItem) {
  return `
    <tr>
      <td>${item.position}</td>
      <td>
        ${escapeHtml(item.productName)}
        ${item.productInternalCode ? `<small>Codigo: ${escapeHtml(item.productInternalCode)}</small>` : ""}
      </td>
      <td class="text-right">${formatQuantity(item.quantity)}</td>
      <td class="text-right">${formatCurrency(item.unitPrice)}</td>
      <td class="text-right">${formatCurrency(item.discountAmount)}</td>
      <td class="text-right">${formatCurrency(item.totalAmount)}</td>
    </tr>
  `;
}

function saleReturnRow(item: SaleItem, itemReturn: SaleItemReturn) {
  const reference = itemReturn.refundReference
    ? `<small>Ref.: ${escapeHtml(itemReturn.refundReference)}</small>`
    : "";
  const reason = itemReturn.reason
    ? `<small>Motivo: ${escapeHtml(itemReturn.reason)}</small>`
    : "";

  return `
    <tr>
      <td>
        ${escapeHtml(item.productName)}
        ${reason}
        ${reference}
      </td>
      <td class="text-right">${formatQuantity(itemReturn.quantity)}</td>
      <td class="text-right">${formatCurrency(itemReturn.refundAmount)}</td>
      <td>${escapeHtml(itemReturn.refundPaymentMethodName)}</td>
      <td>${formatDateTime(itemReturn.refundedAt)}</td>
    </tr>
  `;
}

function salePaymentRow(payment: Sale["payments"][number]) {
  return `
    <tr>
      <td>${escapeHtml(payment.paymentMethodName)}</td>
      <td class="text-right">${formatCurrency(payment.amount)}</td>
    </tr>
  `;
}

function saleReceiptCss() {
  return `
    * { box-sizing: border-box; }
    body {
      color: #2c281e;
      font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 9pt;
      margin: 0;
    }
    .receipt {
      min-height: 100%;
      padding: 18px;
    }
    .header {
      border-bottom: 1px solid #d8b769;
      display: grid;
      gap: 2px;
      padding-bottom: 10px;
      text-align: center;
    }
    .logo-area {
      align-items: center;
      display: flex;
      justify-content: center;
      min-height: 18mm;
    }
    .logo-area img {
      display: block;
      max-height: 17mm;
      max-width: 42mm;
      object-fit: contain;
    }
    .logo-area strong {
      color: #203466;
      font-size: 15pt;
      text-transform: uppercase;
    }
    .header span,
    footer {
      color: #64748b;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .title-box {
      align-items: center;
      background: #f8fafc;
      border: 1px solid #dbe4ee;
      display: flex;
      justify-content: space-between;
      margin: 14px 0;
      padding: 10px 12px;
    }
    h1 {
      color: #203466;
      font-size: 14pt;
      margin: 0;
      text-transform: uppercase;
    }
    .title-box span {
      color: #64748b;
      display: block;
      font-size: 8pt;
      margin-top: 2px;
    }
    .title-box strong {
      color: #991b1b;
      text-transform: uppercase;
    }
    .info-grid {
      display: grid;
      gap: 6px 16px;
      grid-template-columns: 1fr 1fr;
      margin-bottom: 14px;
    }
    p {
      margin: 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    .payments-table {
      margin-bottom: 12px;
    }
    th {
      background: #203466;
      color: #ffffff;
      font-size: 8pt;
      padding: 7px 6px;
      text-align: left;
      text-transform: uppercase;
    }
    td {
      border-bottom: 1px solid #e2e8f0;
      padding: 7px 6px;
      vertical-align: top;
    }
    small {
      color: #64748b;
      display: block;
      margin-top: 2px;
    }
    .text-right {
      text-align: right;
    }
    .summary-table {
      margin-left: auto;
      margin-top: 14px;
      width: 260px;
    }
    .returns-section {
      margin-top: 14px;
    }
    .returns-section h2 {
      color: #203466;
      font-size: 10pt;
      margin: 0 0 6px;
      text-transform: uppercase;
    }
    .total-row {
      color: #203466;
      font-size: 11pt;
      font-weight: 700;
    }
    .net-row {
      background: #f8fafc;
      color: #203466;
      font-size: 11pt;
      font-weight: 700;
    }
    footer {
      border-top: 1px solid #e2e8f0;
      margin-top: 20px;
      padding-top: 10px;
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

function formatQuantity(value: string) {
  return Number(value).toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  });
}

function formatDateTime(value: Date | string) {
  return new Date(value).toLocaleString("pt-BR");
}

function formatOptionalDate(value: Date | string | null) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "Nao informada";
}
