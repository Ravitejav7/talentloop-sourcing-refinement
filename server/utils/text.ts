export function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeTerm(value: unknown): string {
  return cleanText(value).toLowerCase();
}

export function unique<T>(values: T[]): T[] {
  return [...new Set(values.filter(Boolean))];
}
