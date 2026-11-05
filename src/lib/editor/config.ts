export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

export function siteOrigin(): string {
  const url = new URL(requiredEnv("SITE_URL"));
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  ) {
    throw new Error("SITE_URL must use HTTPS, except on localhost.");
  }
  return url.origin;
}

export function bootstrapEditorIds(): number[] {
  return (process.env.CONTENT_EDITOR_WCA_IDS || "")
    .split(",")
    .map(Number)
    .filter((id) => Number.isSafeInteger(id) && id > 0);
}
