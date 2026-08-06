import { listNcmOptions } from "../../models/fiscal-codes/ncm-options.model.js";

export function indexNcmOptions(search?: string) {
  return {
    code: 200,
    status: "success",
    data: listNcmOptions(search),
  };
}
