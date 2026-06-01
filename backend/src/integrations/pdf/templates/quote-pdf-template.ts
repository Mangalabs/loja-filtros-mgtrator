import type { Quote } from "../../../models/quotes/quotes.model.js";

export function quotePdfHtml(quote: Quote) {
  const rows = quote.items
    .map((item, index) => {
      return `
        <tr>
          <td class="text-center">${String(index + 1).padStart(2, "0")}</td>
          <td>
            <strong>${escapeHtml(item.description)}</strong>
            <span class="item-origin">${escapeHtml(item.productName)}</span>
          </td>
          <td class="text-center">${escapeHtml(item.productNcm ?? "-")}</td>
          <td class="text-center">${formatQuantity(item.quantity)}</td>
          <td class="text-right">${formatCurrency(item.unitPrice)}</td>
          <td class="text-right">${formatCurrency(item.totalAmount)}</td>
        </tr>
      `;
    })
    .join("");

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
          <header class="header-container">
            <div class="logo-area">
              <span>Filtros MG</span>
            </div>
            <div class="company-info">
              <h1 class="document-title">ORCAMENTO</h1>
              <strong>Filtros MG</strong><br />
              Operacao da filial<br />
              Documento comercial sem valor fiscal
            </div>
          </header>

          <section class="info-grid">
            <div class="info-box">
              <h2>Dados do cliente</h2>
              <p><strong>Nome:</strong> ${escapeHtml(quote.clientName)}</p>
              <p><strong>Telefone:</strong> ${escapeHtml(quote.clientPhone ?? "Nao informado")}</p>
              <p><strong>Documento:</strong> ${escapeHtml(quote.clientDocument ?? "Nao informado")}</p>
              <p><strong>Email:</strong> ${escapeHtml(quote.clientEmail ?? "Nao informado")}</p>
            </div>

            <div class="info-box">
              <h2>Condicoes comerciais</h2>
              <p><strong>No controle:</strong> #${escapeHtml(quote.id)}</p>
              <p><strong>Data de emissao:</strong> ${formatDate(quote.createdAt)}</p>
              <p><strong>Forma de pagamento:</strong> A combinar</p>
              <p><strong>Validade da proposta:</strong> ${quote.validUntil ? formatDate(quote.validUntil) : "Nao informada"}</p>
            </div>
          </section>

          <table class="items-table">
            <thead>
              <tr>
                <th class="text-center">Item</th>
                <th>Descricao do produto</th>
                <th class="text-center">NCM</th>
                <th class="text-center">Qtd</th>
                <th class="text-right">Val. unitario</th>
                <th class="text-right">Val. total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <section class="financial-summary">
            <table class="summary-table">
              <tbody>
                <tr>
                  <td>Subtotal dos itens:</td>
                  <td class="text-right">${formatCurrency(quote.totalAmount)}</td>
                </tr>
                <tr>
                  <td>Frete:</td>
                  <td class="text-right">A combinar</td>
                </tr>
                <tr>
                  <td>Impostos calculados:</td>
                  <td class="text-right">Inclusos quando aplicavel</td>
                </tr>
                <tr class="total-row">
                  <td>Total geral:</td>
                  <td class="text-right">${formatCurrency(quote.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          ${quote.notes ? `<section class="notes-box"><h2>Observacoes</h2><p>${escapeHtml(quote.notes)}</p></section>` : ""}

          <footer class="footer">
            Gerado automaticamente pelo sistema da filial. Proposta sujeita a disponibilidade de estoque.
          </footer>
        </div>
      </body>
    </html>
  `;
}

function quotePdfCss() {
  return `
    @page {
      size: A4;
      margin: 0;
    }
    * { box-sizing: border-box; }
    body {
      color: #333333;
      font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      margin: 0;
      padding: 0;
    }
    .page {
      min-height: 100%;
      padding-bottom: 26px;
      position: relative;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .header-container {
      align-items: center;
      border-bottom: 2px solid #1a365d;
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 12px;
    }
    .logo-area {
      align-items: center;
      background-color: #f1f5f9;
      border: 1px dashed #cbd5e1;
      color: #64748b;
      display: flex;
      font-size: 9pt;
      height: 55px;
      justify-content: center;
      width: 140px;
    }
    .company-info {
      color: #475569;
      font-size: 8.5pt;
      text-align: right;
    }
    .document-title {
      color: #1a365d;
      font-size: 16pt;
      font-weight: 700;
      margin: 0 0 3px;
    }
    .info-grid {
      display: flex;
      gap: 15px;
      margin-bottom: 20px;
    }
    .info-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      flex: 1;
      padding: 10px;
    }
    .info-box h2,
    .notes-box h2 {
      border-bottom: 1px solid #e2e8f0;
      color: #1a365d;
      font-size: 10pt;
      margin: 0 0 6px;
      padding-bottom: 3px;
      text-transform: uppercase;
    }
    .info-box p,
    .notes-box p {
      color: #334155;
      font-size: 9pt;
      margin: 3px 0;
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
      font-size: 9pt;
      font-weight: 600;
      padding: 6px 8px;
      text-transform: uppercase;
    }
    td {
      border-bottom: 1px solid #e2e8f0;
      font-size: 9pt;
      padding: 6px 8px;
      vertical-align: top;
    }
    .items-table {
      margin-bottom: 20px;
    }
    .items-table th:nth-child(1) { width: 6%; }
    .items-table th:nth-child(2) { width: 44%; }
    .items-table th:nth-child(3) { width: 14%; }
    .items-table th:nth-child(4) { width: 8%; }
    .items-table th:nth-child(5) { width: 14%; }
    .items-table th:nth-child(6) { width: 14%; }
    .items-table tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .item-origin {
      color: #64748b;
      display: block;
      font-size: 8pt;
      margin-top: 2px;
    }
    .financial-summary {
      display: flex;
      justify-content: flex-end;
      margin-top: 10px;
      page-break-inside: avoid;
    }
    .summary-table {
      width: 280px;
    }
    .summary-table td {
      border-bottom: 1px solid #e2e8f0;
      padding: 5px 8px;
    }
    .summary-table tr.total-row td {
      background-color: #f1f5f9;
      border-top: 2px solid #1a365d;
      color: #1a365d;
      font-size: 10.5pt;
      font-weight: 700;
    }
    .notes-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      margin-top: 18px;
      padding: 10px;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      bottom: 0;
      color: #94a3b8;
      font-size: 7.5pt;
      left: 0;
      padding-top: 6px;
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
