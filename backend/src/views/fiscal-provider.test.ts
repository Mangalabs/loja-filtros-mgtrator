import assert from "node:assert/strict";
import { it } from "node:test";
import { PDFDocument } from "pdf-lib";
import { env } from "../config/env.js";
import type { FiscalIssueRequest } from "../integrations/fiscal/fiscal-provider.js";
import { FocusFiscalProvider } from "../integrations/fiscal/providers/focus-fiscal-provider.js";
import { hasManualFiscalTaxes } from "../integrations/pdf/manual-fiscal-tax-preview-pdf.js";
import { manualFiscalTaxPreviewHtml } from "../integrations/pdf/templates/manual-fiscal-tax-preview-template.js";
import { mergePdfBuffers } from "../integrations/pdf/pdf-merger.js";

it("sends the same manually calculated taxes to Focus preview and issue", async () => {
  const originalToken = env.fiscal.focus.token;
  const originalFetch = globalThis.fetch;
  const submittedPayloads: Record<string, unknown>[] = [];

  env.fiscal.focus.token = "token-nfe-teste";
  globalThis.fetch = (async (input, init) => {
    submittedPayloads.push(
      JSON.parse(String(init?.body)) as Record<string, unknown>,
    );

    if (String(input).endsWith("/v2/nfe/danfe")) {
      return new Response(Buffer.from("PDF preview"), {
        headers: { "content-type": "application/pdf" },
        status: 200,
      });
    }

    return new Response(
      JSON.stringify({ ref: "MANUAL-TAX-TEST", status: "autorizado" }),
      { status: 201 },
    );
  }) as typeof fetch;

  try {
    const provider = new FocusFiscalProvider();
    const request = fiscalRequestWithManualTaxes();

    await provider.preview(request);
    await provider.issue(request);

    assert.equal(submittedPayloads.length, 2);
    assert.deepEqual(submittedPayloads[0], submittedPayloads[1]);
    assert.equal(submittedPayloads[0]?.icms_base_calculo, 35);
    assert.equal(submittedPayloads[0]?.icms_valor_total, 6.3);
    assert.equal(submittedPayloads[0]?.valor_pis, 0.58);
    assert.equal(submittedPayloads[0]?.valor_cofins, 2.66);
    assert.equal(submittedPayloads[0]?.valor_ipi, 1.75);

    const item = (
      submittedPayloads[0]?.items as Array<Record<string, unknown>>
    )[0];

    assert.equal(item?.icms_situacao_tributaria, "00");
    assert.equal(item?.icms_base_calculo, 35);
    assert.equal(item?.icms_aliquota, 18);
    assert.equal(item?.icms_valor, 6.3);
    assert.equal(item?.pis_situacao_tributaria, "01");
    assert.equal(item?.pis_base_calculo, 35);
    assert.equal(item?.pis_aliquota_porcentual, 1.65);
    assert.equal(item?.pis_valor, 0.58);
    assert.equal(item?.cofins_situacao_tributaria, "01");
    assert.equal(item?.cofins_base_calculo, 35);
    assert.equal(item?.cofins_aliquota_porcentual, 7.6);
    assert.equal(item?.cofins_valor, 2.66);
    assert.equal(item?.ipi_situacao_tributaria, "50");
    assert.equal(item?.ipi_base_calculo, 35);
    assert.equal(item?.ipi_aliquota, 5);
    assert.equal(item?.ipi_valor, 1.75);
  } finally {
    env.fiscal.focus.token = originalToken;
    globalThis.fetch = originalFetch;
  }
});

it("adds the current manual tax fields to the same fiscal preview", () => {
  const request = fiscalRequestWithManualTaxes();
  const html = manualFiscalTaxPreviewHtml({
    request,
    store: {
      name: "MG Trator Peças",
      address: "Rua de teste, 10",
      city: "São Luís/MA",
      document: "CNPJ: 12.345.678/0001-99",
      phone: null,
      email: null,
      logoDataUri: null,
    },
  });

  assert.equal(hasManualFiscalTaxes(request), true);
  assert.match(html, /Anexo da pré-visualização da NF-e/);
  assert.match(html, /Produto de teste/);
  assert.match(html, /Tributada integralmente/);
  assert.match(html, /R\$\s*6,30/);
  assert.match(html, /R\$\s*0,58/);
  assert.match(html, /R\$\s*2,66/);
  assert.match(html, /R\$\s*1,75/);
});

it("merges the Focus DANFE and tax appendix into one preview file", async () => {
  const danfe = await PDFDocument.create();
  danfe.addPage();
  const appendix = await PDFDocument.create();
  appendix.addPage();

  const merged = await mergePdfBuffers([
    Buffer.from(await danfe.save()),
    Buffer.from(await appendix.save()),
  ]);
  const preview = await PDFDocument.load(merged);

  assert.equal(preview.getPageCount(), 2);
});

function fiscalRequestWithManualTaxes(): FiscalIssueRequest {
  return {
    reference: "MANUAL-TAX-TEST",
    documentType: "NFE",
    environment: "HOMOLOGATION",
    companyCnpj: "12345678000199",
    additionalInformation: null,
    operationType: "EXIT",
    destinationOperation: "INTERSTATE",
    purpose: "RETURN",
    referencedAccessKeys: ["1".repeat(44)],
    defaultNatureOperation: "Devolucao de mercadoria",
    defaultSaleCfop: "5411",
    defaultIcmsCst: "102",
    defaultPisCst: "49",
    defaultCofinsCst: "49",
    sale: {
      id: "manual-tax-test",
      clientPersonType: "PJ",
      clientName: "Cliente de teste",
      clientDocument: "12345678000190",
      clientEmail: "cliente@example.com",
      clientPhone: "98999990000",
      clientStateRegistration: "123456789",
      clientStateRegistrationIndicator: "1",
      clientAddressStreet: "Rua de teste",
      clientAddressNumber: "10",
      clientAddressComplement: null,
      clientAddressDistrict: "Centro",
      clientAddressCity: "Sao Luis",
      clientAddressState: "MA",
      clientAddressZipCode: "65000000",
      paymentMethodCode: "NO_PAYMENT",
      paymentMethodName: "Sem pagamento",
      payments: [
        {
          paymentMethodCode: "NO_PAYMENT",
          paymentMethodName: "Sem pagamento",
          amount: "0.00",
        },
      ],
      paymentInstallments: [],
      totalAmount: "36.75",
      discountAmount: "0.00",
      billingIssueDate: null,
      billingDueDate: null,
      items: [
        {
          productId: "manual-1",
          productInternalCode: "TESTE-1",
          productName: "Produto de teste",
          productCfop: "6411",
          productIcmsCst: "00",
          productIcmsCstDescription: "Tributada integralmente",
          icmsBaseCalculation: "35.00",
          icmsRate: "18.0000",
          icmsAmount: "6.30",
          productNcm: "84212300",
          productPisCst: "01",
          productPisCstDescription: "Operacao tributavel",
          pisBaseCalculation: "35.00",
          pisRate: "1.6500",
          pisAmount: "0.58",
          productCofinsCst: "01",
          productCofinsCstDescription: "Operacao tributavel",
          cofinsBaseCalculation: "35.00",
          cofinsRate: "7.6000",
          cofinsAmount: "2.66",
          productIpiCst: "50",
          productIpiCstDescription: "Saida tributada",
          ipiBaseCalculation: "35.00",
          ipiRate: "5.0000",
          ipiAmount: "1.75",
          productOrigin: "0",
          productUnit: "UN",
          quantity: "1.000",
          unitPrice: "35.00",
          discountAmount: "0.00",
          totalAmount: "35.00",
          position: 1,
        },
      ],
    },
  };
}
