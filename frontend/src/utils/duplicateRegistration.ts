export function normalizeDuplicateText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeDuplicateDocument(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  const digits = text.replace(/\D/g, "");

  return digits || normalizeDuplicateText(text);
}

export function hasDuplicateValue<Entity extends { id: string }>(
  entities: Entity[],
  value: string | null | undefined,
  currentId: string | undefined,
  readValue: (entity: Entity) => string | null | undefined,
  normalize: (value: string | null | undefined) => string =
    normalizeDuplicateText,
) {
  const normalizedValue = normalize(value);

  return (
    normalizedValue.length > 0 &&
    entities.some(
      (entity) =>
        entity.id !== currentId &&
        normalize(readValue(entity)) === normalizedValue,
    )
  );
}
