import type { FiscalIssueRequest } from "../../fiscal/fiscal-provider.js";
import type { QuotePdfStore } from "./quote-pdf-template.js";

type FiscalItem = FiscalIssueRequest["sale"]["items"][number];

type TaxRow = {
  name: string;
  code: string | null | undefined;
  description: string | null | undefined;
  baseCalculation: string | null | undefined;
  rate: string | null | undefined;
  amount: string | null | undefined;
};

export function manualFiscalTaxPreviewHtml(input: {
  request: FiscalIssueRequest;
  store: QuotePdfStore;
}) {
  const { request, store } = input;
  const rows = request.sale.items.flatMap((item) => taxRows(item));
  const totals = rows.reduce<Record<string, number>>((current, row) => {
    current[row.name] = (current[row.name] ?? 0) + numberValue(row.amount);
    return current;
  }, {});

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Conferência tributária da NF-e</title>
        <style>${taxPreviewCss()}</style>
      </head>
      <body>
        <main>
          <header>
            <div class="logo">
              ${store.logoDataUri ? `<img src="${escapeHtml(store.logoDataUri)}" alt="${escapeHtml(store.name)}" />` : ""}
            </div>
            <div class="issuer">
              <strong>${escapeHtml(store.name)}</strong>
              <span>${escapeHtml(store.document)}</span>
              <span>${escapeHtml(store.address)} · ${escapeHtml(store.city)}</span>
            </div>
            <div class="document-label">
              <strong>Conferência tributária</strong>
              <span>Anexo da pré-visualização da NF-e</span>
              <em>Sem valor fiscal</em>
            </div>
          </header>

          <section class="summary">
            ${summaryItem("Operação", request.defaultNatureOperation)}
            ${summaryItem("Destinatário", request.sale.clientName)}
            ${summaryItem("CPF/CNPJ", formatDocument(request.sale.clientDocument))}
            ${summaryItem("Total da NF-e", formatCurrency(request.sale.totalAmount))}
          </section>

          <section class="totals">
            ${totalItem("ICMS", totals.ICMS)}
            ${totalItem("PIS", totals.PIS)}
            ${totalItem("COFINS", totals.COFINS)}
            ${totalItem("IPI", totals.IPI)}
          </section>

          <table>
            <thead>
              <tr>
                <th>Item / produto</th>
                <th>Imposto</th>
                <th>CST/CSOSN</th>
                <th>Descrição informada</th>
                <th class="number">Base de cálculo</th>
                <th class="number">Alíquota</th>
                <th class="number">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${request.sale.items.map((item) => itemTaxRows(item)).join("")}
            </tbody>
          </table>

          <footer>
            Os valores acima reproduzem os dados enviados à Focus na mesma pré-visualização. O DANFE oficial permanece nas páginas anteriores deste arquivo.
          </footer>
        </main>
      </body>
    </html>
  `;
}

function itemTaxRows(item: FiscalItem) {
  return taxRows(item)
    .map(
      (tax, index) => `
        <tr>
          ${
            index === 0
              ? `<td rowspan="4"><strong>${escapeHtml(String(item.position).padStart(2, "0"))} · ${escapeHtml(item.productName)}</strong><span>Código: ${escapeHtml(item.productInternalCode || "Não informado")} · NCM: ${escapeHtml(item.productNcm || "Não informado")} · CFOP: ${escapeHtml(item.productCfop || "Não informado")}</span></td>`
              : ""
          }
          <td><strong>${escapeHtml(tax.name)}</strong></td>
          <td>${escapeHtml(tax.code || "Não informado")}</td>
          <td>${escapeHtml(tax.description || "Não informada")}</td>
          <td class="number">${formatOptionalCurrency(tax.baseCalculation)}</td>
          <td class="number">${formatPercentage(tax.rate)}</td>
          <td class="number">${formatOptionalCurrency(tax.amount)}</td>
        </tr>
      `,
    )
    .join("");
}

function taxRows(item: FiscalItem): TaxRow[] {
  return [
    {
      name: "ICMS",
      code: item.productIcmsCst,
      description: item.productIcmsCstDescription,
      baseCalculation: item.icmsBaseCalculation,
      rate: item.icmsRate,
      amount: item.icmsAmount,
    },
    {
      name: "PIS",
      code: item.productPisCst,
      description: item.productPisCstDescription,
      baseCalculation: item.pisBaseCalculation,
      rate: item.pisRate,
      amount: item.pisAmount,
    },
    {
      name: "COFINS",
      code: item.productCofinsCst,
      description: item.productCofinsCstDescription,
      baseCalculation: item.cofinsBaseCalculation,
      rate: item.cofinsRate,
      amount: item.cofinsAmount,
    },
    {
      name: "IPI",
      code: item.productIpiCst,
      description: item.productIpiCstDescription,
      baseCalculation: item.ipiBaseCalculation,
      rate: item.ipiRate,
      amount: item.ipiAmount,
    },
  ];
}

function summaryItem(label: string, value: string | null | undefined) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "Não informado")}</strong></div>`;
}

function totalItem(label: string, value: number | undefined) {
  return `<div><span>${escapeHtml(label)}</span><strong>${formatCurrency(value ?? 0)}</strong></div>`;
}

function formatDocument(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";

  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  if (digits.length === 14) {
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }

  return value || "Não informado";
}

function formatCurrency(value: string | number) {
  return numberValue(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatOptionalCurrency(value: string | null | undefined) {
  return value === null || value === undefined
    ? "Não informado"
    : formatCurrency(value);
}

function formatPercentage(value: string | null | undefined) {
  return value === null || value === undefined
    ? "Não informada"
    : `${numberValue(value).toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%`;
}

function numberValue(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function taxPreviewCss() {
  return `
    * { box-sizing: border-box; }
    body { color: #243241; font-family: Arial, sans-serif; font-size: 8pt; margin: 0; }
    main { display: grid; gap: 10px; }
    header { align-items: center; border-bottom: 2px solid #1a365d; display: grid; gap: 12px; grid-template-columns: 38mm 1fr auto; padding-bottom: 8px; }
    .logo img { display: block; max-height: 20mm; max-width: 36mm; object-fit: contain; }
    .issuer { display: grid; gap: 2px; }
    .issuer strong { color: #1a365d; font-size: 11pt; }
    .issuer span { color: #475569; font-size: 7pt; }
    .document-label { display: grid; gap: 3px; text-align: right; }
    .document-label strong { color: #1a365d; font-size: 14pt; }
    .document-label span { color: #64748b; }
    .document-label em { color: #92400e; font-size: 7pt; font-style: normal; text-transform: uppercase; }
    .summary { display: grid; gap: 7px; grid-template-columns: 1.2fr 1.2fr .8fr .6fr; }
    .summary div, .totals div { background: #f8fafc; border: 1px solid #dbe4ee; border-radius: 5px; display: grid; gap: 3px; padding: 7px; }
    .summary span, .totals span { color: #64748b; font-size: 6.5pt; text-transform: uppercase; }
    .summary strong, .totals strong { color: #1a365d; overflow-wrap: anywhere; }
    .totals { display: grid; gap: 7px; grid-template-columns: repeat(4, 1fr); }
    table { border-collapse: collapse; table-layout: fixed; width: 100%; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th { background: #1a365d; color: white; font-size: 7pt; padding: 6px; text-align: left; }
    td { border: 1px solid #dbe4ee; padding: 6px; vertical-align: top; overflow-wrap: anywhere; }
    td:first-child { width: 28%; }
    td span { color: #64748b; display: block; font-size: 6.5pt; margin-top: 4px; }
    .number { text-align: right; }
    footer { border-top: 1px solid #dbe4ee; color: #64748b; font-size: 7pt; padding-top: 7px; text-align: center; }
  `;
}
