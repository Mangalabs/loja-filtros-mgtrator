export function optionalFormValue(
  form: FormData,
  key: string,
): string | undefined {
  const value = String(form.get(key) ?? "").trim();
  return value ? value : undefined;
}

export function nullableFormValue(form: FormData, key: string): string | null {
  return optionalFormValue(form, key) ?? null;
}
