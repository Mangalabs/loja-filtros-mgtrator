import { listCestOptions } from "../../models/fiscal-codes/cest-options.model.js";
import { listNcmOptions } from "../../models/fiscal-codes/ncm-options.model.js";

export async function indexCestOptions(branchId: string, search?: string) {
  return {
    code: 200,
    status: "success",
    data: await listCestOptions({ branchId, search }),
  };
}

export function indexNcmOptions(search?: string) {
  return {
    code: 200,
    status: "success",
    data: listNcmOptions(search),
  };
}
