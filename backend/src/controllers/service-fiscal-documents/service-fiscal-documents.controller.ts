import {
  deleteServiceFiscalDocumentDraft,
  insertServiceFiscalDocumentDraft,
  listServiceFiscalDocumentDrafts,
  shareServiceFiscalDocumentDraft,
  updateServiceFiscalDocumentDraft,
} from "../../models/service-fiscal-documents/service-fiscal-document-drafts.model.js";
import { draftShareCandidateExists } from "../../models/users/users.model.js";
import { getFiscalServiceById } from "../../models/fiscal-services/fiscal-services.model.js";
import { findBranchById } from "../../models/branches/branches.model.js";
import { currentFiscalSettings } from "../fiscal-settings/fiscal-settings.controller.js";
import { generateServiceFiscalDocumentPreviewPdf } from "../../integrations/pdf/service-fiscal-document-preview-pdf.js";
import type { ServiceFiscalDocumentInput } from "../../shared/fiscal/service-fiscal-document.js";
import { AppError } from "../../shared/errors/app-error.js";
import { randomUUID } from "node:crypto";
import { makeServiceFiscalProviderByName } from "../../integrations/fiscal/service-fiscal-provider-factory.js";
import {
  getServiceFiscalDocumentById,
  insertServiceFiscalDocument,
  listServiceFiscalDocuments,
  markServiceFiscalDocumentCancelled,
  nextServiceFiscalDpsNumber,
  updateServiceFiscalDocumentStatus,
} from "../../models/service-fiscal-documents/service-fiscal-documents.model.js";

const SERVICE_DPS_SERIES = 49999;

export async function indexServiceFiscalDocuments(filters: {
  branchId: string;
  limit: number;
  offset: number;
  status?: "PROCESSING" | "AUTHORIZED" | "REJECTED" | "CANCELLED";
}) {
  const result = await listServiceFiscalDocuments(filters);

  return {
    code: 200,
    status: "success",
    data: {
      items: result.data,
      total: result.total,
      limit: filters.limit,
      offset: filters.offset,
    },
  };
}

export async function indexServiceFiscalDocumentDrafts(
  branchId: string,
  userId: string,
) {
  return {
    code: 200,
    status: "success",
    data: await listServiceFiscalDocumentDrafts({
      branchId,
      createdByUserId: userId,
    }),
  };
}

export async function storeServiceFiscalDocumentDraft(
  payload: ServiceFiscalDocumentInput,
  userId: string,
  branchId: string,
) {
  await requireActiveFiscalService(payload, branchId);
  const draft = await insertServiceFiscalDocumentDraft({
    branchId,
    createdByUserId: userId,
    title: serviceFiscalDocumentDraftTitle(payload),
    payload,
  });

  return { code: 201, status: "success", data: draft };
}

export async function replaceServiceFiscalDocumentDraft(
  id: string,
  payload: ServiceFiscalDocumentInput,
  userId: string,
  branchId: string,
) {
  await requireActiveFiscalService(payload, branchId);
  const draft = await updateServiceFiscalDocumentDraft(id, {
    branchId,
    createdByUserId: userId,
    title: serviceFiscalDocumentDraftTitle(payload),
    payload,
  });

  if (!draft) {
    throw new AppError("Rascunho de NFS-e nao encontrado.", 404);
  }

  return { code: 200, status: "success", data: draft };
}

export async function destroyServiceFiscalDocumentDraft(
  id: string,
  userId: string,
  branchId: string,
) {
  const deleted = await deleteServiceFiscalDocumentDraft({
    id,
    branchId,
    createdByUserId: userId,
  });

  if (!deleted) {
    throw new AppError("Rascunho de NFS-e nao encontrado.", 404);
  }

  return { code: 200, status: "success", data: { id } };
}

export async function replaceServiceFiscalDocumentDraftSharing(
  id: string,
  sharedWithUserId: string | null,
  userId: string,
  branchId: string,
) {
  if (sharedWithUserId === userId) {
    throw new AppError("Selecione outro usuario para compartilhar.", 422);
  }

  if (
    sharedWithUserId &&
    !(await draftShareCandidateExists(
      sharedWithUserId,
      branchId,
      "MANAGE_FISCAL_DOCUMENTS",
    ))
  ) {
    throw new AppError(
      "Usuario selecionado nao possui acesso fiscal nesta filial.",
      422,
    );
  }

  const draft = await shareServiceFiscalDocumentDraft({
    id,
    branchId,
    createdByUserId: userId,
    sharedWithUserId,
  });

  if (!draft) {
    throw new AppError("Rascunho de NFS-e nao encontrado.", 404);
  }

  return { code: 200, status: "success", data: draft };
}

export async function previewServiceFiscalDocument(
  payload: ServiceFiscalDocumentInput,
  branchId: string,
) {
  const fiscalService = await requireActiveFiscalService(payload, branchId);
  const [fiscalSettings, branch] = await Promise.all([
    currentFiscalSettings(branchId),
    findBranchById(branchId),
  ]);

  return {
    content: await generateServiceFiscalDocumentPreviewPdf({
      branch,
      document: payload,
      fiscalService,
      fiscalSettings,
    }),
    contentType: "application/pdf",
    fileName: `previa-nfse-${payload.competenceDate}.pdf`,
  };
}

export async function issueServiceFiscalDocument(
  payload: ServiceFiscalDocumentInput,
  userId: string,
  branchId: string,
) {
  const fiscalService = await requireActiveFiscalService(payload, branchId);
  const settings = await currentFiscalSettings(branchId);

  ensureServiceFiscalIssueIsReady(settings, fiscalService, payload);

  const dpsNumber = await nextServiceFiscalDpsNumber();
  const reference = `NFSE-${randomUUID()}`;
  const provider = makeServiceFiscalProviderByName(settings.provider);
  const providerRequest = {
    reference,
    dpsSeries: SERVICE_DPS_SERIES,
    dpsNumber,
    environment: settings.environment,
    companyCnpj: settings.companyCnpj as string,
    municipalRegistration: settings.municipalRegistration,
    serviceMunicipalityIbgeCode:
      settings.serviceMunicipalityIbgeCode as string,
    simpleNationalNominalTaxRate: Number(
      settings.simpleNationalNominalTaxRate,
    ),
    service: fiscalService,
    document: payload,
  };
  const requestPayload = {
    document: payload,
    fiscalService: {
      id: fiscalService.id,
      name: fiscalService.name,
      nationalTaxCode: fiscalService.nationalTaxCode,
      municipalTaxCode: fiscalService.municipalTaxCode,
      municipalActivityCode: fiscalService.municipalActivityCode,
      nbsCode: fiscalService.nbsCode,
    },
    companyCnpj: settings.companyCnpj,
    dpsSeries: SERVICE_DPS_SERIES,
    dpsNumber,
  };
  const pendingDocument = await insertServiceFiscalDocument({
    branchId,
    fiscalServiceId: fiscalService.id,
    provider: settings.provider,
    environment: settings.environment,
    status: "PROCESSING",
    providerReference: reference,
    protocol: null,
    accessKey: null,
    dpsSeries: SERVICE_DPS_SERIES,
    dpsNumber,
    nfseNumber: null,
    xmlUrl: null,
    pdfUrl: null,
    rejectionReason: null,
    requestPayload,
    responsePayload: {},
    issuedByUserId: userId,
  });
  const result = await provider.issue(providerRequest);
  const document = await updateServiceFiscalDocumentStatus(
    pendingDocument.id,
    branchId,
    {
      status: result.status,
      providerReference: result.providerReference,
      protocol: result.protocol,
      accessKey: result.accessKey,
      nfseNumber: result.nfseNumber,
      xmlUrl: result.xmlUrl,
      pdfUrl: result.pdfUrl,
      rejectionReason: result.rejectionReason,
      responsePayload: result.responsePayload,
    },
  );

  if (!document) {
    throw new AppError("NFS-e nao encontrada apos o envio.", 500);
  }

  return {
    code: 201,
    status: "success",
    data: document,
  };
}

export async function cancelServiceFiscalDocument(
  id: string,
  justification: string,
  userId: string,
  branchId: string,
) {
  const document = await getServiceFiscalDocumentById(id, branchId);

  if (!document) {
    throw new AppError("Documento fiscal de servico nao encontrado.", 404);
  }

  if (document.status !== "AUTHORIZED") {
    throw new AppError("Somente uma NFS-e autorizada pode ser cancelada.", 422);
  }

  const settings = await currentFiscalSettings(branchId);
  const provider = makeServiceFiscalProviderByName(document.provider);
  const result = await provider.cancel({
    providerReference: document.providerReference,
    environment: document.environment,
    companyCnpj: settings.companyCnpj as string,
    justification,
  });

  if (result.status !== "CANCELLED") {
    throw new AppError(
      result.rejectionReason ?? "A Focus nao confirmou o cancelamento da NFS-e.",
      422,
    );
  }

  const cancelled = await markServiceFiscalDocumentCancelled(id, branchId, {
    cancelledByUserId: userId,
    cancellationReason: justification,
    responsePayload: result.responsePayload,
  });

  if (!cancelled) {
    const current = await getServiceFiscalDocumentById(id, branchId);

    if (current?.status === "CANCELLED") {
      return { code: 200, status: "success", data: current };
    }

    throw new AppError("A NFS-e mudou de situacao durante o cancelamento.", 409);
  }

  return { code: 200, status: "success", data: cancelled };
}

export async function syncServiceFiscalDocument(
  id: string,
  branchId: string,
) {
  const document = await getServiceFiscalDocumentById(id, branchId);

  if (!document) {
    throw new AppError("Documento fiscal de servico nao encontrado.", 404);
  }

  if (!["PROCESSING", "AUTHORIZED"].includes(document.status)) {
    return { code: 200, status: "success", data: document };
  }

  const settings = await currentFiscalSettings(branchId);
  const provider = makeServiceFiscalProviderByName(document.provider);
  const result = await provider.check({
    providerReference: document.providerReference,
    environment: document.environment,
    companyCnpj: settings.companyCnpj as string,
  });
  const updated = await updateServiceFiscalDocumentStatus(id, branchId, {
    status: result.status,
    providerReference: result.providerReference,
    protocol: result.protocol ?? document.protocol,
    accessKey: result.accessKey ?? document.accessKey,
    nfseNumber: result.nfseNumber ?? document.nfseNumber,
    xmlUrl: result.xmlUrl ?? document.xmlUrl,
    pdfUrl: result.pdfUrl ?? document.pdfUrl,
    rejectionReason: result.rejectionReason,
    responsePayload: result.responsePayload,
  });

  if (!updated) {
    throw new AppError("Documento fiscal de servico nao encontrado.", 404);
  }

  return { code: 200, status: "success", data: updated };
}

async function requireActiveFiscalService(
  payload: ServiceFiscalDocumentInput,
  branchId: string,
) {
  const service = await getFiscalServiceById(String(payload.serviceId), branchId);

  if (!service || !service.active) {
    throw new AppError("Servico fiscal ativo nao encontrado nesta filial.", 400);
  }

  return service;
}

function serviceFiscalDocumentDraftTitle(payload: ServiceFiscalDocumentInput) {
  const takerName = payload.taker.name.trim();
  const competenceDate = payload.competenceDate.trim();

  return [takerName || "Tomador nao informado", competenceDate]
    .filter(Boolean)
    .join(" - ")
    .slice(0, 180);
}

function ensureServiceFiscalIssueIsReady(
  settings: Awaited<ReturnType<typeof currentFiscalSettings>>,
  fiscalService: Awaited<ReturnType<typeof requireActiveFiscalService>>,
  payload: ServiceFiscalDocumentInput,
) {
  if (settings.environment === "PRODUCTION" && !settings.allowProduction) {
    throw new AppError(
      "Emissao de NFS-e em producao bloqueada pela configuracao fiscal.",
      422,
    );
  }

  const companyCnpj = settings.companyCnpj?.replace(/\D/g, "") ?? "";
  const missing = [
    ["CNPJ fiscal da filial", companyCnpj.length === 14],
    [
      "codigo IBGE do municipio de incidencia",
      /^\d{7}$/.test(settings.serviceMunicipalityIbgeCode ?? ""),
    ],
    [
      "aliquota nominal total do Simples Nacional",
      Number(settings.simpleNationalNominalTaxRate) > 0,
    ],
    ["codigo nacional do servico", /^\d{6}$/.test(fiscalService.nationalTaxCode)],
    ["codigo NBS", /^\d{9}$/.test(fiscalService.nbsCode ?? "")],
  ]
    .filter(([, ready]) => !ready)
    .map(([label]) => label);

  if (missing.length > 0) {
    throw new AppError(
      `Configuracao incompleta para emitir NFS-e: ${missing.join(", ")}.`,
      422,
    );
  }

  if (
    settings.defaultRetainPis ||
    settings.defaultRetainCofins ||
    settings.defaultRetainCsll ||
    settings.defaultRetainIr ||
    settings.defaultRetainInss
  ) {
    throw new AppError(
      "Este fluxo esta configurado apenas para emissao sem retencoes federais.",
      422,
    );
  }

  if (payload.taker.personType === "ES") {
    throw new AppError(
      "Emissao para tomador do exterior ainda nao esta disponivel neste formulario.",
      422,
    );
  }

  const takerDocument = payload.taker.document?.replace(/\D/g, "") ?? "";
  const expectedDocumentLength =
    payload.taker.personType === "PF" ? 11 : 14;

  if (takerDocument.length !== expectedDocumentLength) {
    throw new AppError("CPF ou CNPJ do tomador esta invalido para NFS-e.", 422);
  }
}
