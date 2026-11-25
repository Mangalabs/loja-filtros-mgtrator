const icmsCodesWithRegularCalculation = new Set([
  "00",
  "10",
  "20",
  "51",
  "70",
  "90",
  "900",
]);

export function icmsCodeSupportsRegularCalculation(
  code: string | null | undefined,
) {
  return Boolean(code && icmsCodesWithRegularCalculation.has(code));
}
