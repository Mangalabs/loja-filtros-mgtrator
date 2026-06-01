import type { Quote } from "../../../models/quotes/quotes.model.js";

export function quotePdfHtml(quote: Quote) {
  const rows = quote.items
    .map(
      (item) => `
        <tr>
          <td>${item.position}</td>
          <td>
            <strong>${escapeHtml(item.description)}</strong>
            <small>${escapeHtml(item.productName)}</small>
          </td>
          <td>${formatQuantity(item.quantity)}</td>
          <td>${formatCurrency(item.unitPrice)}</td>
          <td>${formatCurrency(item.totalAmount)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Orcamento ${escapeHtml(quote.id)}</title>
        <style>
          ${quotePdfCss()}
        </style>
      </head>
      <body>
        <header>
          <div>
            <h1>Orcamento</h1>
            <p class="quote-number">Codigo: ${escapeHtml(quote.id)}</p>
          </div>
          <div class="muted company-block">
            <p>Filtros MG</p>
            <p>Operacao da filial</p>
          </div>
        </header>

        <section class="section grid">
          <div class="card">
            <h2>Cliente</h2>
            <p>${escapeHtml(quote.clientName)}</p>
            <p class="muted">${escapeHtml(quote.clientPhone ?? "Telefone nao informado")}</p>
          </div>
          <div class="card">
            <h2>Condicoes</h2>
            <p>Emissao: ${formatDate(quote.createdAt)}</p>
            <p>Validade: ${quote.validUntil ? formatDate(quote.validUntil) : "Nao informada"}</p>
          </div>
        </section>

        <section class="section">
          <h2>Itens</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Descricao</th>
                <th>Qtd.</th>
                <th>Valor un.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="total">
            <div class="total-box">
              <span>Total do orcamento</span>
              <strong>${formatCurrency(quote.totalAmount)}</strong>
            </div>
          </div>
        </section>

        ${quote.notes ? `<section class="section card"><h2>Observacoes</h2><p>${escapeHtml(quote.notes)}</p></section>` : ""}

        <footer>
          Este documento e um orcamento comercial e nao representa documento fiscal.
        </footer>
      </body>
    </html>
  `;
}

function quotePdfCss() {
  return `
    * { box-sizing: border-box; }
    body {
      color: #18211d;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      margin: 0;
    }
    header {
      align-items: flex-start;
      border-bottom: 2px solid #1f6f4a;
      display: flex;
      justify-content: space-between;
      padding-bottom: 18px;
    }
    h1, h2, p { margin: 0; }
    h1 { color: #1d3329; font-size: 26px; }
    h2 { color: #1d3329; font-size: 16px; margin-bottom: 8px; }
    .muted { color: #65716c; }
    .company-block { text-align: right; }
    .quote-number { color: #65716c; font-size: 12px; margin-top: 6px; }
    .section { margin-top: 22px; }
    .grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .card {
      background: #f7faf7;
      border: 1px solid #dfe5e1;
      border-radius: 8px;
      padding: 12px;
    }
    table {
      border-collapse: collapse;
      margin-top: 10px;
      width: 100%;
    }
    th {
      background: #edf5f0;
      color: #294236;
      font-size: 12px;
      text-align: left;
    }
    th, td {
      border-bottom: 1px solid #dfe5e1;
      padding: 9px 8px;
      vertical-align: top;
    }
    td small {
      color: #65716c;
      display: block;
      margin-top: 4px;
    }
    .total {
      align-items: center;
      display: flex;
      justify-content: flex-end;
      margin-top: 18px;
    }
    .total-box {
      background: #1f6f4a;
      border-radius: 8px;
      color: #ffffff;
      min-width: 220px;
      padding: 14px;
      text-align: right;
    }
    .total-box span { display: block; font-size: 12px; opacity: 0.85; }
    .total-box strong { display: block; font-size: 24px; margin-top: 4px; }
    footer {
      border-top: 1px solid #dfe5e1;
      color: #65716c;
      font-size: 11px;
      margin-top: 28px;
      padding-top: 12px;
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
