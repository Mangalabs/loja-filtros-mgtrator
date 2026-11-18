export type ServiceFiscalDocumentInput = {
  serviceId: string;
  competenceDate: string;
  serviceDescription: string;
  serviceAmount: number;
  issRate: number;
  issRetained: boolean;
  consumerFinal: boolean;
  additionalInformation: string | null;
  taker: {
    clientId: string | null;
    personType: "PF" | "PJ" | "ES";
    name: string;
    document: string | null;
    email: string | null;
    phone: string | null;
    addressStreet: string;
    addressNumber: string;
    addressComplement: string | null;
    addressDistrict: string;
    addressCity: string;
    addressState: string;
    addressZipCode: string;
    municipalityIbgeCode: string;
  };
};
