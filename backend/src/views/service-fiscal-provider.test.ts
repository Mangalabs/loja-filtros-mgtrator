import assert from "node:assert/strict";
import { it } from "node:test";
import { env } from "../config/env.js";
import { FocusServiceFiscalProvider } from "../integrations/fiscal/providers/focus-service-fiscal-provider.js";

it("sends the national DPS payload and cancellation to Focus", async () => {
  const originalToken = env.fiscal.focus.tokens.HOMOLOGATION;
  const originalFetch = globalThis.fetch;
  let receivedUrl = "";
  let receivedMethod = "";
  let receivedPayload: Record<string, unknown> = {};

  env.fiscal.focus.tokens.HOMOLOGATION = "token-nfse-homologacao";
  globalThis.fetch = (async (input, init) => {
    receivedUrl = String(input);
    receivedMethod = init?.method ?? "GET";
    receivedPayload = init?.body
      ? (JSON.parse(String(init.body)) as Record<string, unknown>)
      : {};

    return new Response(
      JSON.stringify({
        ref: "NFSE-TESTE",
        status:
          receivedMethod === "DELETE"
            ? "cancelado"
            : "processando_autorizacao",
        protocolo: "PROTOCOLO-TESTE",
      }),
      { status: receivedMethod === "DELETE" ? 200 : 202 },
    );
  }) as typeof fetch;

  try {
    const provider = new FocusServiceFiscalProvider();
    const result = await provider.issue({
      reference: "NFSE-TESTE",
      dpsSeries: 49999,
      dpsNumber: 1,
      environment: "HOMOLOGATION",
      companyCnpj: "12345678000199",
      municipalRegistration: "3682435794",
      serviceMunicipalityIbgeCode: "2111300",
      service: {
        id: "00000000-0000-4000-8000-000000000001",
        branchId: "00000000-0000-4000-8000-000000000002",
        name: "Manutencao de caminhoes",
        nationalTaxCode: "140101",
        municipalTaxCode: "14.01.01",
        municipalActivityCode: null,
        nbsCode: "120013110",
        description: null,
        issRate: "2.00",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      document: {
        serviceId: "00000000-0000-4000-8000-000000000001",
        competenceDate: "2026-11-18",
        serviceDescription: "Manutencao preventiva de caminhao",
        serviceAmount: 1250,
        issRate: 2,
        issRetained: true,
        consumerFinal: false,
        additionalInformation: null,
        taker: {
          clientId: null,
          personType: "PJ",
          name: "Tomador de homologacao",
          document: "12345678000190",
          email: null,
          phone: null,
          addressStreet: "Rua de teste",
          addressNumber: "10",
          addressComplement: null,
          addressDistrict: "Centro",
          addressCity: "Sao Luis",
          addressState: "MA",
          addressZipCode: "65000000",
          municipalityIbgeCode: "2111300",
        },
      },
    });

    assert.match(receivedUrl, /\/v2\/nfsen\?ref=NFSE-TESTE$/);
    assert.equal(receivedMethod, "POST");
    assert.equal(receivedPayload.finalidade_emissao, 0);
    assert.equal(receivedPayload.consumidor_final, 0);
    assert.equal(receivedPayload.indicador_destinatario, 0);
    assert.equal(receivedPayload.codigo_opcao_simples_nacional, 3);
    assert.equal(receivedPayload.regime_tributario_simples_nacional, 1);
    assert.equal(receivedPayload.tipo_retencao_iss, 2);
    assert.equal(receivedPayload.tipo_retencao_pis_cofins, 0);
    assert.equal(receivedPayload.codigo_tributacao_nacional_iss, "140101");
    assert.equal(receivedPayload.codigo_nbs, "120013110");
    assert.ok(!("ibs_cbs_situacao_tributaria" in receivedPayload));
    assert.equal(result.status, "PROCESSING");

    const cancelled = await provider.cancel({
      providerReference: "NFSE-TESTE",
      environment: "HOMOLOGATION",
      companyCnpj: "12345678000199",
      justification: "Servico cancelado a pedido do tomador.",
    });

    assert.match(receivedUrl, /\/v2\/nfsen\/NFSE-TESTE$/);
    assert.equal(receivedMethod, "DELETE");
    assert.equal(
      receivedPayload.justificativa,
      "Servico cancelado a pedido do tomador.",
    );
    assert.equal(cancelled.status, "CANCELLED");
  } finally {
    env.fiscal.focus.tokens.HOMOLOGATION = originalToken;
    globalThis.fetch = originalFetch;
  }
});
