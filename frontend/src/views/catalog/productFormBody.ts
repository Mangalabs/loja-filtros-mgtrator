import { nullableFormValue } from "../../utils/forms";

export function productFormBody(form: FormData) {
  return {
    name: String(form.get("productName") ?? "").trim(),
    internalCode: nullableFormValue(form, "internalCode"),
    barcode: nullableFormValue(form, "barcode"),
    brandId: nullableFormValue(form, "brandId"),
    unit: String(form.get("unit") ?? "UN").trim(),
    location: nullableFormValue(form, "location"),
    costPrice: Number(form.get("costPrice") || 0),
    salePrice: Number(form.get("salePrice") || 0),
    minimumStock: Number(form.get("minimumStock") || 0),
    ncm: nullableFormValue(form, "ncm"),
    cest: nullableFormValue(form, "cest"),
    origin: nullableFormValue(form, "origin"),
    description: nullableFormValue(form, "description"),
  };
}
