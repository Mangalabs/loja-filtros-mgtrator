import type { FiscalService } from "../../../models/fiscal-services/fiscal-services.model.js";
import type { FiscalSettings } from "../../../models/fiscal-settings/fiscal-settings.model.js";
import type { ServiceFiscalDocumentInput } from "../../../shared/fiscal/service-fiscal-document.js";
import type { QuotePdfStore } from "./quote-pdf-template.js";

export function serviceFiscalDocumentPreviewHtml(input: {
  document: ServiceFiscalDocumentInput;
  fiscalService: FiscalService;
  fiscalSettings: FiscalSettings;
  store: QuotePdfStore;
}) {
  const { document, fiscalService, fiscalSettings, store } = input;
  const estimatedIss = document.serviceAmount * (document.issRate / 100);
  const issuerContact = [store.phone, store.email].filter(Boolean).join(" | ");
  const warnings = serviceFiscalPreviewWarnings(fiscalService, fiscalSettings);

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Pré-visualização de NFS-e</title>
        <style>${serviceFiscalDocumentPreviewCss()}</style>
      </head>
      <body>
        <main class="document">
          <header class="issuer-header">
            <div class="logo-area">
              ${store.logoDataUri ? `<img src="${escapeHtml(store.logoDataUri)}" alt="${escapeHtml(store.name)}" />` : `<strong>${escapeHtml(store.name)}</strong>`}
            </div>
            <div class="issuer-data">
              <strong>${escapeHtml(store.name)}</strong>
              <span>${escapeHtml(store.document)}</span>
              <span>${escapeHtml(store.address)}</span>
              <span>${escapeHtml(store.city)}</span>
              ${issuerContact ? `<span>${escapeHtml(issuerContact)}</span>` : ""}
            </div>
          </header>

          <section class="title-box">
            <div>
              <h1>Pré-visualização de NFS-e</h1>
              <span>Conferência dos dados antes da transmissão</span>
            </div>
            <strong>Rascunho sem valor fiscal</strong>
          </section>

          ${
            warnings.length > 0
              ? `<section class="warning-box"><strong>Pendências para futura emissão</strong><ul>${warnings
                  .map((warning) => `<li>${escapeHtml(warning)}</li>`)
                  .join("")}</ul></section>`
              : ""
          }

          <section class="section">
            <h2>Prestador e incidência</h2>
            <div class="info-grid">
              ${info("Inscrição municipal", fiscalSettings.municipalRegistration)}
              ${info("Município de incidência", municipalityLabel(fiscalSettings))}
              ${info("Código IBGE", fiscalSettings.serviceMunicipalityIbgeCode)}
              ${info("Regime", "Simples Nacional normal")}
              ${info("Competência", formatDate(document.competenceDate))}
            </div>
          </section>

          <section class="section">
            <h2>Tomador do serviço</h2>
            <div class="info-grid">
              ${info("Nome", document.taker.name)}
              ${info("CPF/CNPJ", formatDocument(document.taker.document))}
              ${info("Telefone", document.taker.phone)}
              ${info("E-mail", document.taker.email)}
              ${info("Endereço", takerAddress(document), "full")}
              ${info("Município", `${document.taker.addressCity}/${document.taker.addressState}`)}
              ${info("CEP", document.taker.addressZipCode)}
              ${info("Código IBGE", document.taker.municipalityIbgeCode)}
            </div>
          </section>

          <section class="section">
            <h2>Serviço prestado</h2>
            <div class="info-grid">
              ${info("Serviço", fiscalService.name)}
              ${info("Código nacional", formatNationalTaxCode(fiscalService.nationalTaxCode))}
              ${info("NBS", fiscalService.nbsCode)}
              ${info("Código municipal", fiscalService.municipalTaxCode)}
              ${info("Atividade municipal", fiscalService.municipalActivityCode)}
              ${info("Descrição", document.serviceDescription, "full")}
            </div>
          </section>

          <section class="totals-grid">
            ${total("Valor do serviço", formatCurrency(document.serviceAmount))}
            ${total("Alíquota de ISS", formatPercentage(document.issRate))}
            ${total("ISS estimado", formatCurrency(estimatedIss))}
            ${total("ISS retido", document.issRetained ? "Sim" : "Não")}
          </section>

          <section class="section">
            <h2>Retenções e informações adicionais</h2>
            <p><strong>Retenções federais:</strong> ${escapeHtml(federalRetentionLabel(fiscalSettings))}</p>
            <p><strong>Informações adicionais:</strong> ${escapeHtml(document.additionalInformation || "Nenhuma")}</p>
          </section>

          <footer>
            Documento gerado apenas para conferência interna. Não representa uma NFS-e autorizada e não foi transmitido à Focus nem à prefeitura.
          </footer>
        </main>
      </body>
    </html>
  `;
}

function serviceFiscalPreviewWarnings(
  service: FiscalService,
  settings: FiscalSettings,
) {
  const warnings: string[] = [];

  if (!service.nbsCode) {
    warnings.push("Código NBS ainda não informado.");
  }

  if (
    !settings.municipalRegistration ||
    !settings.serviceMunicipalityName ||
    !settings.serviceMunicipalityState ||
    !settings.serviceMunicipalityIbgeCode
  ) {
    warnings.push("Configuração municipal da filial está incompleta.");
  }

  return warnings;
}

function federalRetentionLabel(settings: FiscalSettings) {
  const retained = [
    settings.defaultRetainPis ? "PIS" : null,
    settings.defaultRetainCofins ? "COFINS" : null,
    settings.defaultRetainCsll ? "CSLL" : null,
    settings.defaultRetainIr ? "IRRF" : null,
    settings.defaultRetainInss ? "INSS" : null,
  ].filter(Boolean);

  return retained.length > 0 ? `Reter ${retained.join(", ")}` : "Sem retenções";
}

function info(label: string, value: string | null | undefined, className = "") {
  return `<p class="${className}"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value || "Não informado")}</p>`;
}

function total(label: string, value: string) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function municipalityLabel(settings: FiscalSettings) {
  return [settings.serviceMunicipalityName, settings.serviceMunicipalityState]
    .filter(Boolean)
    .join("/");
}

function takerAddress(document: ServiceFiscalDocumentInput) {
  return [
    document.taker.addressStreet,
    document.taker.addressNumber,
    document.taker.addressComplement,
    document.taker.addressDistrict,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatNationalTaxCode(value: string) {
  return value.length === 6
    ? `${value.slice(0, 2)}.${value.slice(2, 4)}.${value.slice(4)}`
    : value;
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

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPercentage(value: number) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function serviceFiscalDocumentPreviewCss() {
  return `
    * { box-sizing: border-box; }
    body { color: #1f2937; font-family: Arial, sans-serif; margin: 0; }
    .document { display: grid; gap: 12px; }
    .issuer-header { align-items: center; border-bottom: 2px solid #1a365d; display: grid; gap: 16px; grid-template-columns: 48mm 1fr; padding-bottom: 10px; }
    .logo-area img { display: block; max-height: 24mm; max-width: 46mm; object-fit: contain; }
    .issuer-data { display: grid; font-size: 8pt; gap: 3px; }
    .issuer-data strong { color: #1a365d; font-size: 12pt; }
    .title-box { align-items: center; background: #f1f5f9; border-radius: 7px; display: flex; justify-content: space-between; padding: 10px 12px; }
    .title-box h1 { color: #1a365d; font-size: 15pt; margin: 0 0 3px; }
    .title-box span { color: #64748b; font-size: 8pt; }
    .title-box > strong { border: 1px solid #b45309; border-radius: 999px; color: #92400e; font-size: 8pt; padding: 5px 8px; text-transform: uppercase; }
    .warning-box { background: #fff7e6; border: 1px solid #f0c36d; border-radius: 7px; color: #78350f; font-size: 8pt; padding: 9px 12px; }
    .warning-box ul { margin: 5px 0 0; padding-left: 18px; }
    .section { border: 1px solid #dbe4ee; border-radius: 7px; padding: 10px 12px; page-break-inside: avoid; }
    .section h2 { color: #1a365d; font-size: 9pt; margin: 0 0 8px; text-transform: uppercase; }
    .section p { font-size: 8pt; margin: 4px 0; }
    .info-grid { display: grid; gap: 2px 14px; grid-template-columns: 1fr 1fr; }
    .info-grid .full { grid-column: 1 / -1; }
    .totals-grid { display: grid; gap: 8px; grid-template-columns: repeat(4, 1fr); page-break-inside: avoid; }
    .totals-grid div { background: #f8fafc; border: 1px solid #dbe4ee; border-radius: 7px; display: grid; gap: 5px; padding: 10px; }
    .totals-grid span { color: #64748b; font-size: 7pt; text-transform: uppercase; }
    .totals-grid strong { color: #1a365d; font-size: 10pt; }
    footer { border-top: 1px solid #dbe4ee; color: #64748b; font-size: 7pt; padding-top: 8px; text-align: center; }
  `;
}
