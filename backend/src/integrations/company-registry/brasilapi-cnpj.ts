import { AppError } from "../../shared/errors/app-error.js";

export type CompanyRegistryResult = {
  personType: "PJ";
  name: string;
  document: string;
  email: string | null;
  phone: string | null;
  stateRegistration: string | null;
  stateRegistrationIndicator: "9";
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZipCode: string | null;
};

type BrasilApiCnpjResponse = {
  uf?: string | null;
  cep?: string | null;
  cnpj?: string | null;
  email?: string | null;
  bairro?: string | null;
  numero?: string | null;
  municipio?: string | null;
  logradouro?: string | null;
  complemento?: string | null;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  ddd_telefone_1?: string | null;
};

export async function lookupCompanyByCnpj(
  cnpj: string,
): Promise<CompanyRegistryResult> {
  const normalizedCnpj = onlyDigits(cnpj);

  if (normalizedCnpj.length !== 14) {
    throw new AppError("CNPJ deve conter 14 digitos.", 422);
  }

  const failures: unknown[] = [];

  for (const provider of companyRegistryProviders) {
    try {
      return await provider(normalizedCnpj);
    } catch (error) {
      failures.push(error);
    }
  }

  if (failures.some(notFoundError)) {
    throw new AppError("CNPJ nao encontrado.", 404);
  }

  throw new AppError(
    "Nao foi possivel consultar o CNPJ nos provedores disponiveis agora.",
    502,
  );
}

const companyRegistryProviders = [lookupBrasilApiCnpj, lookupMinhaReceitaCnpj];

async function lookupBrasilApiCnpj(cnpj: string) {
  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);

  return companyRegistryResponseToClient(response, cnpj);
}

async function lookupMinhaReceitaCnpj(cnpj: string) {
  const response = await fetch(`https://minhareceita.org/${cnpj}`);

  return companyRegistryResponseToClient(response, cnpj);
}

async function companyRegistryResponseToClient(response: Response, cnpj: string) {
  if (response.status === 404) {
    throw new AppError("CNPJ nao encontrado.", 404);
  }

  if (!response.ok) {
    throw new AppError("Provedor de CNPJ indisponivel.", 502);
  }

  return brasilApiCompanyToClient(
    (await response.json()) as BrasilApiCnpjResponse,
    cnpj,
  );
}

function brasilApiCompanyToClient(
  company: BrasilApiCnpjResponse,
  cnpj: string,
): CompanyRegistryResult {
  return {
    personType: "PJ",
    name: company.razao_social?.trim() || company.nome_fantasia?.trim() || cnpj,
    document: cnpj,
    email: optionalText(company.email),
    phone: optionalText(company.ddd_telefone_1),
    stateRegistration: null,
    stateRegistrationIndicator: "9",
    addressStreet: optionalText(company.logradouro),
    addressNumber: optionalText(company.numero),
    addressComplement: optionalText(company.complemento),
    addressDistrict: optionalText(company.bairro),
    addressCity: optionalText(company.municipio),
    addressState: optionalText(company.uf)?.toUpperCase() ?? null,
    addressZipCode: optionalText(company.cep),
  };
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function optionalText(value: string | null | undefined) {
  return value?.trim() || null;
}

function notFoundError(error: unknown) {
  return error instanceof AppError && error.statusCode === 404;
}
