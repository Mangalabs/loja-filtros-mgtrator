import type { FiscalEnvironment, FiscalProviderName, FiscalProviderStatus } from "../../shared/fiscal/fiscal-types.js";
import type { ServiceFiscalDocumentInput } from "../../shared/fiscal/service-fiscal-document.js";
import type { FiscalService } from "../../models/fiscal-services/fiscal-services.model.js";

export type ServiceFiscalIssueRequest = {
  reference: string;
  dpsSeries: number;
  dpsNumber: number;
  environment: FiscalEnvironment;
  companyCnpj: string;
  municipalRegistration: string;
  serviceMunicipalityIbgeCode: string;
  service: FiscalService;
  document: ServiceFiscalDocumentInput;
};

export type ServiceFiscalIssueResult = {
  provider: FiscalProviderName;
  status: FiscalProviderStatus;
  providerReference: string;
  protocol: string | null;
  accessKey: string | null;
  nfseNumber: string | null;
  xmlUrl: string | null;
  pdfUrl: string | null;
  rejectionReason: string | null;
  responsePayload: Record<string, unknown>;
};

export type ServiceFiscalCheckRequest = {
  providerReference: string;
  environment: FiscalEnvironment;
  companyCnpj: string;
};

export type ServiceFiscalCancelRequest = ServiceFiscalCheckRequest & {
  justification: string;
};

export type ServiceFiscalProvider = {
  issue(request: ServiceFiscalIssueRequest): Promise<ServiceFiscalIssueResult>;
  check(request: ServiceFiscalCheckRequest): Promise<ServiceFiscalIssueResult>;
  cancel(request: ServiceFiscalCancelRequest): Promise<ServiceFiscalIssueResult>;
};
