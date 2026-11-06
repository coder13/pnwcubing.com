export const editableNavigationLinks = [
  { id: 5, label: "Merch" },
  { id: 8, label: "Public Documents" },
] as const;

export function safeNavigationUrl(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !value ||
    /[\s\\\u0000-\u001f\u007f]/.test(value)
  )
    return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
export function safeAdditionalUrl(value: unknown): value is string {
  return safeNavigationUrl(value) && /^https?:\/\//.test(value);
}
