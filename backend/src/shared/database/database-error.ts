export type DatabaseError = {
  code?: string;
  constraint?: string;
  detail?: string;
};

export function isDatabaseError(error: unknown): error is DatabaseError {
  return typeof error === "object" && error !== null && "code" in error;
}
