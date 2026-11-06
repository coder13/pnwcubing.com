export const loginHistoryKey = "pnw.hasLoggedIn";
export function safeAvatar(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "avatars.worldcubeassociation.org"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function loginHistory(
  storage: Pick<Storage, "getItem" | "setItem">,
  loggedIn: boolean,
): boolean {
  try {
    if (loggedIn) storage.setItem(loginHistoryKey, "true");
    return storage.getItem(loginHistoryKey) === "true";
  } catch {
    return false;
  }
}
