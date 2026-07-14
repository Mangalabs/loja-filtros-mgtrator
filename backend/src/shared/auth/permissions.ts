export const employeePermissionValues = [
  "MANAGE_COMMERCIAL_SETTINGS",
  "IMPORT_PURCHASE_INVOICES",
  "MANAGE_STOCK_ADJUSTMENTS",
  "MANAGE_PAYMENT_METHODS",
  "MANAGE_FISCAL_SETTINGS",
  "MANAGE_FISCAL_DOCUMENTS",
  "MANAGE_CASH_REGISTER",
  "VIEW_REPORTS",
] as const;

export type EmployeePermission = (typeof employeePermissionValues)[number];
