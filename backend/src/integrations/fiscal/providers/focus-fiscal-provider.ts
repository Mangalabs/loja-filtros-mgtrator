import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import type {
  FiscalCancelRequest,
  FiscalCancelResult,
  FiscalCheckRequest,
  FiscalCheckResult,
  FiscalIssueRequest,
  FiscalIssueResult,
  FiscalProvider,
  FiscalProviderStatus,
} from "../fiscal-provider.js";

type FocusResponsePayload = Record<string, unknown>;

type FocusNfePayload = {
  natureza_operacao: string;
  data_emissao: string;
  tipo_documento: 1;
  local_destino: 1;
  finalidade_emissao: 1;
  consumidor_final: 1;
  presenca_comprador: 1;
  cnpj_emitente?: string;
  nome_destinatario: string;
  cpf_destinatario?: string;
  cnpj_destinatario?: string;
  inscricao_estadual_destinatario?: string;
  indicador_inscricao_estadual_destinatario: 1 | 2 | 9;
  logradouro_destinatario?: string;
  numero_destinatario?: string;
  complemento_destinatario?: string;
  bairro_destinatario?: string;
  municipio_destinatario?: string;
  uf_destinatario?: string;
  cep_destinatario?: string;
  telefone_destinatario?: string;
  email_destinatario?: string;
  valor_total: number;
  valor_produtos: number;
  modalidade_frete: 9;
  items: FocusNfeItemPayload[];
};

type FocusNfeItemPayload = {
  numero_item: number;
  codigo_produto: string;
  descricao: string;
  codigo_ncm?: string;
  cfop: string;
  icms_origem: string;
  icms_situacao_tributaria: string;
  pis_situacao_tributaria: string;
  cofins_situacao_tributaria: string;
  unidade_comercial: string;
  quantidade_comercial: number;
  valor_unitario_comercial: number;
  valor_bruto: number;
  unidade_tributavel: string;
  quantidade_tributavel: number;
  valor_unitario_tributavel: number;
};

export class FocusFiscalProvider implements FiscalProvider {
  async cancel(request: FiscalCancelRequest): Promise<FiscalCancelResult> {
    ensureFocusConfiguration(request.environment);

    const response = await focusFetch(
      focusNfeReferenceUrl(request.environment, request.providerReference),
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: focusAuthorizationHeader(
            focusToken(request.environment),
          ),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ justificativa: request.reason }),
      },
    );
    const responsePayload = await readFocusResponse(response);
    const status = focusCancelStatusFromPayload(response, responsePayload);

    return focusResultFromPayload({
      documentType: request.documentType,
      environment: request.environment,
      providerReference: request.providerReference,
      responsePayload,
      status,
    });
  }

  async check(request: FiscalCheckRequest): Promise<FiscalCheckResult> {
    ensureFocusConfiguration(request.environment);

    const response = await focusFetch(
      focusNfeReferenceUrl(request.environment, request.providerReference),
      {
        headers: {
          Accept: "application/json",
          Authorization: focusAuthorizationHeader(
            focusToken(request.environment),
          ),
        },
      },
    );
    const responsePayload = await readFocusResponse(response);
    const status = focusStatusFromPayload(response, responsePayload);

    return focusResultFromPayload({
      documentType: request.documentType,
      environment: request.environment,
      providerReference: request.providerReference,
      responsePayload,
      status,
    });
  }

  async issue(request: FiscalIssueRequest): Promise<FiscalIssueResult> {
    ensureFocusConfiguration(request.environment, request.companyCnpj);

    const response = await focusFetch(focusNfeUrl(request), {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: focusAuthorizationHeader(focusToken(request.environment)),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildFocusNfePayload(request)),
    });
    const responsePayload = await readFocusResponse(response);
    const status = focusStatusFromResponse(response, responsePayload);

    return focusResultFromPayload({
      documentType: request.documentType,
      environment: request.environment,
      providerReference: request.reference,
      responsePayload,
      status,
    });
  }
}

function focusResultFromPayload({
  environment,
  providerReference,
  responsePayload,
  status,
}: {
  documentType: FiscalCheckRequest["documentType"];
  environment: FiscalCheckRequest["environment"];
  providerReference: string;
  responsePayload: FocusResponsePayload;
  status: FiscalProviderStatus;
}): FiscalIssueResult {
  return {
    provider: "FOCUS",
    status,
    accessKey: focusString(responsePayload.chave_nfe),
    providerReference:
      focusString(responsePayload.ref) ??
      focusString(responsePayload.referencia) ??
      providerReference,
    number: focusNumber(responsePayload.numero),
    series: focusNumber(responsePayload.serie),
    xmlUrl: focusFileUrl(environment, responsePayload.caminho_xml_nota_fiscal),
    pdfUrl: focusFileUrl(environment, responsePayload.caminho_danfe),
    rejectionReason:
      status === "REJECTED" ? focusRejectionReason(responsePayload) : null,
    responsePayload,
  };
}

function ensureFocusConfiguration(
  environment: FiscalIssueRequest["environment"],
  companyCnpj?: string | null,
) {
  const missingFields = [
    [`FOCUS_NFE_${environment}_TOKEN`, focusToken(environment)],
    ["CNPJ fiscal da loja", companyCnpj === undefined ? true : companyCnpj],
  ]
    .filter((field): field is [string, null] => !field[1])
    .map(([field]) => field);

  if (missingFields.length > 0) {
    throw new AppError(
      `Integracao Focus NFe sem configuracao: ${missingFields.join(", ")}.`,
      503,
    );
  }
}

function buildFocusNfePayload(request: FiscalIssueRequest): FocusNfePayload {
  const totalAmount = moneyNumber(request.sale.totalAmount);

  return {
    natureza_operacao: "Venda de mercadoria",
    data_emissao: new Date().toISOString(),
    tipo_documento: 1,
    local_destino: 1,
    finalidade_emissao: 1,
    consumidor_final: 1,
    presenca_comprador: 1,
    cnpj_emitente: digits(request.companyCnpj),
    nome_destinatario: request.sale.clientName ?? "Consumidor final",
    ...focusCustomerDocument(request),
    inscricao_estadual_destinatario:
      request.sale.clientStateRegistration ?? undefined,
    indicador_inscricao_estadual_destinatario:
      focusCustomerStateRegistrationIndicator(request),
    logradouro_destinatario: request.sale.clientAddressStreet ?? undefined,
    numero_destinatario: request.sale.clientAddressNumber ?? undefined,
    complemento_destinatario: request.sale.clientAddressComplement ?? undefined,
    bairro_destinatario: request.sale.clientAddressDistrict ?? undefined,
    municipio_destinatario: request.sale.clientAddressCity ?? undefined,
    uf_destinatario: request.sale.clientAddressState?.toUpperCase(),
    cep_destinatario: digits(request.sale.clientAddressZipCode),
    telefone_destinatario: digits(request.sale.clientPhone),
    email_destinatario: request.sale.clientEmail ?? undefined,
    valor_total: totalAmount,
    valor_produtos: totalAmount,
    modalidade_frete: 9,
    items: request.sale.items.map(focusNfeItemPayload),
  };
}

function focusCustomerDocument(request: FiscalIssueRequest) {
  const document = digits(request.sale.clientDocument);
  const documentFields: Record<string, Record<string, string | undefined>> = {
    ES: {},
    PF: { cpf_destinatario: document },
    PJ: { cnpj_destinatario: document },
  };

  return documentFields[request.sale.clientPersonType ?? "PF"];
}

function focusCustomerStateRegistrationIndicator(
  request: FiscalIssueRequest,
): 1 | 2 | 9 {
  const indicator = Number(request.sale.clientStateRegistrationIndicator ?? 9);
  const indicators: Record<number, 1 | 2 | 9> = {
    1: 1,
    2: 2,
    9: 9,
  };

  return indicators[indicator] ?? 9;
}

function focusNfeItemPayload(
  item: FiscalIssueRequest["sale"]["items"][number],
): FocusNfeItemPayload {
  const quantity = quantityNumber(item.quantity);
  const unitPrice = moneyNumber(item.unitPrice);

  return {
    numero_item: item.position,
    codigo_produto: item.productInternalCode ?? item.productId,
    descricao: item.productName,
    codigo_ncm: item.productNcm ?? undefined,
    cfop: focusProductCfop(item.productCfop),
    icms_origem: focusProductOrigin(item.productOrigin),
    icms_situacao_tributaria: focusTaxCode(item.productIcmsCst, "102"),
    pis_situacao_tributaria: focusTaxCode(item.productPisCst, "49"),
    cofins_situacao_tributaria: focusTaxCode(item.productCofinsCst, "49"),
    unidade_comercial: focusProductUnit(item.productUnit),
    quantidade_comercial: quantity,
    valor_unitario_comercial: unitPrice,
    valor_bruto: moneyNumber(item.totalAmount),
    unidade_tributavel: focusProductUnit(item.productUnit),
    quantidade_tributavel: quantity,
    valor_unitario_tributavel: unitPrice,
  };
}

function focusNfeUrl(request: FiscalIssueRequest) {
  const url = new URL(focusBaseUrl(request.environment));
  url.searchParams.set("ref", request.reference);
  return url;
}

function focusNfeReferenceUrl(
  environment: FiscalIssueRequest["environment"],
  reference: string,
) {
  return `${focusBaseUrl(environment)}/${encodeURIComponent(reference)}`;
}

function focusBaseUrl(environment: FiscalIssueRequest["environment"]) {
  const baseUrl = env.fiscal.focus.baseUrls[environment].replace(/\/$/, "");
  const path = baseUrl.endsWith("/v2/nfe") ? "" : "/v2/nfe";

  return `${baseUrl}${path}`;
}

function focusToken(environment: FiscalIssueRequest["environment"]) {
  return env.fiscal.focus.tokens[environment] ?? env.fiscal.focus.token;
}

function focusAuthorizationHeader(token: string | null) {
  return `Basic ${Buffer.from(`${token ?? ""}:`).toString("base64")}`;
}

async function focusFetch(input: string | URL, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch {
    throw new AppError("Nao foi possivel conectar a Focus NFe.", 502);
  }
}

async function readFocusResponse(
  response: Response,
): Promise<FocusResponsePayload> {
  const text = await response.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as FocusResponsePayload;
  } catch {
    return { raw: text };
  }
}

function focusStatusFromResponse(
  response: Response,
  payload: FocusResponsePayload,
): FiscalProviderStatus {
  const payloadStatus = focusStatusFromPayloadValue(payload);

  if (payloadStatus) {
    return payloadStatus;
  }

  const statusByHttpStatus: Record<number, FiscalProviderStatus> = {
    201: "PROCESSING",
    202: "PROCESSING",
    400: "REJECTED",
    415: "REJECTED",
    422: "REJECTED",
  };
  const mappedStatus = statusByHttpStatus[response.status];

  if (mappedStatus) {
    return mappedStatus;
  }

  if (!response.ok) {
    throw focusHttpError(response, payload);
  }

  return "PROCESSING";
}

function focusStatusFromPayload(
  response: Response,
  payload: FocusResponsePayload,
): FiscalProviderStatus {
  if (!response.ok) {
    throw focusHttpError(response, payload);
  }

  return focusStatusFromPayloadValue(payload) ?? "PROCESSING";
}

function focusStatusFromPayloadValue(
  payload: FocusResponsePayload,
): FiscalProviderStatus | null {
  const status = focusString(payload.status)?.toLowerCase() ?? "";
  const statusByFocusStatus: Record<string, FiscalProviderStatus> = {
    autorizado: "AUTHORIZED",
    cancelado: "CANCELLED",
    erro_autorizacao: "REJECTED",
    processando_autorizacao: "PROCESSING",
    requisicao_recebida: "PROCESSING",
  };

  return statusByFocusStatus[status] ?? null;
}

function focusCancelStatusFromPayload(
  response: Response,
  payload: FocusResponsePayload,
): FiscalProviderStatus {
  if (!response.ok) {
    throw focusHttpError(response, payload);
  }

  const status = focusString(payload.status)?.toLowerCase() ?? "";
  const statusByFocusStatus: Record<string, FiscalProviderStatus> = {
    cancelado: "CANCELLED",
    erro_cancelamento: "REJECTED",
    processando_cancelamento: "PROCESSING",
    requisicao_recebida: "PROCESSING",
  };

  return statusByFocusStatus[status] ?? "PROCESSING";
}

function focusHttpError(response: Response, payload: FocusResponsePayload) {
  const messagesByHttpStatus: Record<number, string> = {
    401: "Token da Focus NFe nao autorizado.",
  };

  return new AppError(
    messagesByHttpStatus[response.status] ?? focusRejectionReason(payload),
    502,
  );
}

function focusRejectionReason(payload: FocusResponsePayload) {
  return (
    focusMessage(payload.mensagem_sefaz) ??
    focusMessage(payload.mensagem) ??
    focusMessage(payload.erros) ??
    focusMessage(payload.status) ??
    "Retorno da Focus NFe nao autorizado."
  );
}

function focusString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function focusFileUrl(
  environment: FiscalIssueRequest["environment"],
  value: unknown,
) {
  const path = focusString(value);

  if (!path) {
    return null;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const baseUrl = focusFilesBaseUrl(environment);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
}

function focusFilesBaseUrl(environment: FiscalIssueRequest["environment"]) {
  return env.fiscal.focus.baseUrls[environment]
    .replace(/\/$/, "")
    .replace(/\/v2\/nfe$/, "")
    .replace(/\/v2$/, "");
}

function focusNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function focusMessage(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value.map(String).join("; ");
  }

  return value && typeof value === "object" ? JSON.stringify(value) : null;
}

function focusProductUnit(unit: string) {
  const unitByProductUnit: Record<string, string> = {
    CJ: "CJ",
    KIT: "KIT",
    UN: "UN",
  };

  return unitByProductUnit[unit] ?? "UN";
}

function focusProductCfop(cfop: string | null) {
  return cfop?.replace(/\D/g, "") || "5102";
}

function focusProductOrigin(origin: string | null) {
  return origin?.replace(/\D/g, "") || "0";
}

function focusTaxCode(value: string | null, fallback: string) {
  return value?.trim() || fallback;
}

function moneyNumber(value: string) {
  return Number(Number(value).toFixed(2));
}

function quantityNumber(value: string) {
  return Number(Number(value).toFixed(3));
}

function digits(value: string | null) {
  const normalized = value?.replace(/\D/g, "");
  return normalized || undefined;
}
