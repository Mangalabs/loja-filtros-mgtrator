import type {
  FiscalDocumentType,
  FiscalEnvironment,
  FiscalProviderName,
  FiscalProviderStatus,
} from "../../shared/fiscal/fiscal-types.js";

export type {
  FiscalDocumentType,
  FiscalEnvironment,
  FiscalProviderName,
  FiscalProviderStatus,
} from "../../shared/fiscal/fiscal-types.js";

export type FiscalIssueRequest = {
  reference: string;
  documentType: FiscalDocumentType;
  environment: FiscalEnvironment;
  companyCnpj: string | null;
  sale: {
    id: string;
    clientPersonType: "PF" | "PJ" | "ES" | null;
    clientName: string | null;
    clientDocument: string | null;
    clientEmail: string | null;
    clientPhone: string | null;
    clientStateRegistration: string | null;
    clientStateRegistrationIndicator: "1" | "2" | "9" | null;
    clientAddressStreet: string | null;
    clientAddressNumber: string | null;
    clientAddressComplement: string | null;
    clientAddressDistrict: string | null;
    clientAddressCity: string | null;
    clientAddressState: string | null;
    clientAddressZipCode: string | null;
    paymentMethodName: string;
    totalAmount: string;
    discountAmount: string;
    items: Array<{
      productId: string;
      productInternalCode: string | null;
      productName: string;
      productCfop: string | null;
      productIcmsCst: string | null;
      productNcm: string | null;
      productPisCst: string | null;
      productCofinsCst: string | null;
      productOrigin: string | null;
      productUnit: string;
      quantity: string;
      unitPrice: string;
      discountAmount: string;
      totalAmount: string;
      position: number;
    }>;
  };
};

export type FiscalIssueResult = {
  provider: FiscalProviderName;
  status: FiscalProviderStatus;
  accessKey: string | null;
  providerReference: string;
  number: number | null;
  series: number | null;
  xmlUrl: string | null;
  pdfUrl: string | null;
  rejectionReason: string | null;
  responsePayload: Record<string, unknown>;
};

export type FiscalCheckRequest = {
  documentType: FiscalDocumentType;
  environment: FiscalEnvironment;
  providerReference: string;
};

export type FiscalCheckResult = FiscalIssueResult;

export type FiscalCancelRequest = {
  documentType: FiscalDocumentType;
  environment: FiscalEnvironment;
  providerReference: string;
  reason: string;
};

export type FiscalCancelResult = FiscalIssueResult;

export type FiscalProvider = {
  cancel(request: FiscalCancelRequest): Promise<FiscalCancelResult>;
  check(request: FiscalCheckRequest): Promise<FiscalCheckResult>;
  issue(request: FiscalIssueRequest): Promise<FiscalIssueResult>;
};
