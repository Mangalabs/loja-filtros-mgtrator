import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import type { FiscalProviderStatus } from "../../../shared/fiscal/fiscal-types.js";
import type {
  ServiceFiscalCancelRequest,
  ServiceFiscalCheckRequest,
  ServiceFiscalIssueRequest,
  ServiceFiscalIssueResult,
  ServiceFiscalProvider,
} from "../service-fiscal-provider.js";

type FocusPayload = Record<string, unknown>;

export class FocusServiceFiscalProvider implements ServiceFiscalProvider {
  async cancel(
    request: ServiceFiscalCancelRequest,
  ): Promise<ServiceFiscalIssueResult> {
    const token = requireFocusToken(request.environment, request.companyCnpj);
    const url = `${focusBaseUrl(request.environment)}/${encodeURIComponent(request.providerReference)}`;

    let response: Response;

    try {
      response = await fetch(url, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: focusAuthorizationHeader(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ justificativa: request.justification }),
      });
    } catch {
      throw new AppError("Nao foi possivel conectar a Focus NFe.", 502);
    }

    return focusResult(
      response,
      await readResponse(response),
      request.environment,
      request.providerReference,
    );
  }

  async check(
    request: ServiceFiscalCheckRequest,
  ): Promise<ServiceFiscalIssueResult> {
    const token = requireFocusToken(request.environment, request.companyCnpj);
    const url = `${focusBaseUrl(request.environment)}/${encodeURIComponent(request.providerReference)}`;

    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          Accept: "application/json",
          Authorization: focusAuthorizationHeader(token),
        },
      });
    } catch {
      throw new AppError("Nao foi possivel conectar a Focus NFe.", 502);
    }

    return focusResult(
      response,
      await readResponse(response),
      request.environment,
      request.providerReference,
    );
  }

  async issue(
    request: ServiceFiscalIssueRequest,
  ): Promise<ServiceFiscalIssueResult> {
    const token = requireFocusToken(request.environment, request.companyCnpj);

    const url = new URL(focusBaseUrl(request.environment));
    url.searchParams.set("ref", request.reference);

    let response: Response;

    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: focusAuthorizationHeader(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildFocusPayload(request)),
      });
    } catch {
      throw new AppError("Nao foi possivel conectar a Focus NFe.", 502);
    }

    const responsePayload = await readResponse(response);

    return focusResult(
      response,
      responsePayload,
      request.environment,
      request.reference,
    );
  }
}

function focusResult(
  response: Response,
  responsePayload: FocusPayload,
  environment: ServiceFiscalIssueRequest["environment"],
  fallbackReference: string,
): ServiceFiscalIssueResult {
  if (response.status === 401) {
    throw new AppError("Token da Focus NFe nao autorizado.", 502);
  }

  const status = focusStatus(response, responsePayload);

  return {
    provider: "FOCUS",
    status,
    providerReference:
      text(responsePayload.ref) ??
      text(responsePayload.referencia) ??
      fallbackReference,
    protocol: text(responsePayload.protocolo),
    accessKey: text(responsePayload.chave_nfse) ?? text(responsePayload.chave),
    nfseNumber:
      text(responsePayload.numero_nfse) ?? text(responsePayload.numero),
    xmlUrl: fileUrl(
      environment,
      responsePayload.caminho_xml_nota_fiscal ?? responsePayload.caminho_xml,
    ),
    pdfUrl: fileUrl(
      environment,
      responsePayload.caminho_danfse ??
        responsePayload.caminho_pdf ??
        responsePayload.url,
    ),
    rejectionReason:
      status === "REJECTED" ? rejectionReason(responsePayload) : null,
    responsePayload,
  };
}

function buildFocusPayload(request: ServiceFiscalIssueRequest) {
  const takerDocument = digits(request.document.taker.document);

  if (request.document.taker.personType === "ES") {
    throw new AppError(
      "Emissao para tomador do exterior ainda nao esta disponivel neste formulario.",
      422,
    );
  }

  if (
    (request.document.taker.personType === "PF" && takerDocument.length !== 11) ||
    (request.document.taker.personType === "PJ" && takerDocument.length !== 14)
  ) {
    throw new AppError("CPF ou CNPJ do tomador esta invalido para NFS-e.", 422);
  }

  const payload: Record<string, unknown> = {
    data_emissao: brazilIssueDateTime(),
    serie_dps: request.dpsSeries,
    numero_dps: request.dpsNumber,
    data_competencia: request.document.competenceDate,
    emitente_dps: 1,
    codigo_municipio_emissora: Number(request.serviceMunicipalityIbgeCode),
    cnpj_prestador: digits(request.companyCnpj),
    inscricao_municipal_prestador: text(request.municipalRegistration),
    codigo_opcao_simples_nacional: 3,
    regime_tributario_simples_nacional: 1,
    regime_especial_tributacao: 0,
    razao_social_tomador: request.document.taker.name,
    codigo_municipio_tomador: Number(
      request.document.taker.municipalityIbgeCode,
    ),
    cep_tomador: digits(request.document.taker.addressZipCode),
    logradouro_tomador: request.document.taker.addressStreet,
    numero_tomador: request.document.taker.addressNumber,
    complemento_tomador: text(request.document.taker.addressComplement),
    bairro_tomador: request.document.taker.addressDistrict,
    telefone_tomador: digits(request.document.taker.phone),
    email_tomador: text(request.document.taker.email),
    codigo_municipio_prestacao: request.serviceMunicipalityIbgeCode,
    codigo_tributacao_nacional_iss: digits(request.service.nationalTaxCode),
    descricao_servico: request.document.serviceDescription,
    codigo_nbs: digits(request.service.nbsCode),
    informacoes_complementares: nationalNfseText(
      request.document.additionalInformation,
    ),
    valor_servico: money(request.document.serviceAmount),
    tributacao_iss: 1,
    tipo_retencao_iss: request.document.issRetained ? 2 : 1,
    percentual_aliquota_relativa_municipio: money(request.document.issRate),
    situacao_tributaria_pis_cofins: "00",
    tipo_retencao_pis_cofins: 0,
    indicador_total_tributacao: "0",
    finalidade_emissao: 0,
    consumidor_final: request.document.consumerFinal ? 1 : 0,
    indicador_destinatario: 0,
  };

  if (request.document.taker.personType === "PF") {
    payload.cpf_tomador = takerDocument;
  } else {
    payload.cnpj_tomador = takerDocument;
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== null && value !== ""),
  );
}

function focusStatus(response: Response, payload: FocusPayload): FiscalProviderStatus {
  const key = statusKey(payload.status);
  const mapped: Record<string, FiscalProviderStatus> = {
    autorizado: "AUTHORIZED",
    cancelado: "CANCELLED",
    erro_autorizacao: "REJECTED",
    erro_cancelamento: "REJECTED",
    processando_autorizacao: "PROCESSING",
    requisicao_recebida: "PROCESSING",
  };

  if (mapped[key]) {
    return mapped[key];
  }

  if (response.status === 202) {
    return "PROCESSING";
  }

  if ([400, 415, 422].includes(response.status)) {
    return "REJECTED";
  }

  if (!response.ok) {
    throw new AppError(rejectionReason(payload), 502);
  }

  return "PROCESSING";
}

function focusBaseUrl(environment: ServiceFiscalIssueRequest["environment"]) {
  const base = env.fiscal.focus.baseUrls[environment]
    .replace(/\/$/, "")
    .replace(/\/v2\/(?:nfe|nfsen)$/, "")
    .replace(/\/v2$/, "");

  return `${base}/v2/nfsen`;
}

function focusToken(
  environment: ServiceFiscalIssueRequest["environment"],
  companyCnpj: string,
) {
  return (
    env.fiscal.focus.tokensByCompanyCnpj[environment][digits(companyCnpj)] ??
    env.fiscal.focus.tokens[environment] ??
    env.fiscal.focus.token
  );
}

function requireFocusToken(
  environment: ServiceFiscalIssueRequest["environment"],
  companyCnpj: string,
) {
  const token = focusToken(environment, companyCnpj);

  if (!token) {
    throw new AppError(
      `Integracao Focus NFe sem configuracao: FOCUS_NFE_${environment}_TOKEN.`,
      503,
    );
  }

  return token;
}

function focusAuthorizationHeader(token: string) {
  return `Basic ${Buffer.from(`${token}:`).toString("base64")}`;
}

async function readResponse(response: Response): Promise<FocusPayload> {
  const body = await response.text();

  if (!body.trim()) {
    return {};
  }

  try {
    return JSON.parse(body) as FocusPayload;
  } catch {
    return { raw: body };
  }
}

function rejectionReason(payload: FocusPayload) {
  return (
    message(payload.mensagem_sefaz) ??
    message(payload.mensagem) ??
    message(payload.erros) ??
    message(payload.status) ??
    "Retorno da Focus NFe nao autorizado."
  );
}

function message(value: unknown): string | null {
  const valueText = text(value);

  if (valueText) {
    return valueText;
  }

  if (Array.isArray(value)) {
    const messages = value.map(message).filter(Boolean);
    return messages.length ? messages.join("; ") : null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const nested = value as FocusPayload;
  return (
    message(nested.mensagem) ??
    message(nested.message) ??
    message(nested.erro) ??
    JSON.stringify(nested)
  );
}

function fileUrl(
  environment: ServiceFiscalIssueRequest["environment"],
  value: unknown,
) {
  const path = text(value);

  if (!path || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const base = env.fiscal.focus.baseUrls[environment]
    .replace(/\/$/, "")
    .replace(/\/v2\/(?:nfe|nfsen)$/, "")
    .replace(/\/v2$/, "");

  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function brazilIssueDateTime(date = new Date()) {
  const localDateTime = new Date(date.getTime() - 3 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19);

  return `${localDateTime}-03:00`;
}

function statusKey(value: unknown) {
  return (
    text(value)
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase() ?? ""
  );
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nationalNfseText(value: unknown) {
  return (
    text(value)
      ?.normalize("NFC")
      .replace(/[^\u0020-\u00ff]/g, " ")
      .replace(/\s+/g, " ")
      .trim() || null
  );
}

function digits(value: string | null) {
  return value?.replace(/\D/g, "") ?? "";
}

function money(value: number) {
  return Number(Number(value).toFixed(2));
}
