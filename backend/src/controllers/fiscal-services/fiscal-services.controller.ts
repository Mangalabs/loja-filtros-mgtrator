import {
  createFiscalService,
  listFiscalServices,
  updateFiscalService,
  type FiscalServiceInput,
} from "../../models/fiscal-services/fiscal-services.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function indexFiscalServices(filters: {
  branchId: string;
  active?: boolean;
}) {
  return {
    code: 200,
    status: "success",
    data: await listFiscalServices(filters),
  };
}

export async function storeFiscalService(
  branchId: string,
  input: FiscalServiceInput,
) {
  return {
    code: 201,
    status: "success",
    data: await createFiscalService(branchId, normalizeFiscalService(input)),
  };
}

export async function replaceFiscalService(
  id: string,
  branchId: string,
  input: FiscalServiceInput & { active: boolean },
) {
  const service = await updateFiscalService(
    id,
    branchId,
    normalizeFiscalService(input),
  );

  if (!service) {
    throw new AppError("Servico fiscal nao encontrado nesta filial.", 404);
  }

  return {
    code: 200,
    status: "success",
    data: service,
  };
}

function normalizeFiscalService<T extends FiscalServiceInput>(input: T): T {
  return {
    ...input,
    name: input.name.trim(),
    nationalTaxCode: input.nationalTaxCode.replace(/\D/g, ""),
    municipalTaxCode:
      input.municipalTaxCode === undefined
        ? undefined
        : input.municipalTaxCode?.trim() || null,
    municipalActivityCode:
      input.municipalActivityCode === undefined
        ? undefined
        : input.municipalActivityCode?.replace(/\D/g, "") || null,
    nbsCode:
      input.nbsCode === undefined
        ? undefined
        : input.nbsCode?.replace(/\D/g, "") || null,
    description: input.description?.trim() || null,
  };
}
