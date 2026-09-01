import { nullableFormValue } from "../../utils/forms";

export function productFormBody(form: FormData) {
  const body = {
    name: String(form.get("productName") ?? "").trim(),
    internalCode: nullableFormValue(form, "internalCode"),
    barcode: nullableFormValue(form, "barcode"),
    brandId: nullableFormValue(form, "brandId"),
    unit: String(form.get("unit") ?? "UN").trim(),
    location: nullableFormValue(form, "location"),
    costPrice: Number(form.get("costPrice") || 0),
    accessoryExpenses: Number(form.get("accessoryExpenses") || 0),
    otherExpenses: Number(form.get("otherExpenses") || 0),
    salePrice: Number(form.get("salePrice") || 0),
    profitMarginPercentage: Number(form.get("profitMarginPercentage") || 0),
    minimumStock: Number(form.get("minimumStock") || 0),
    currentStock: Number(form.get("currentStock") || 0),
    ncm: nullableFormValue(form, "ncm"),
    cest: nullableFormValue(form, "cest"),
    origin: nullableFormValue(form, "origin"),
    description: nullableFormValue(form, "description"),
  };

  return body;
}
