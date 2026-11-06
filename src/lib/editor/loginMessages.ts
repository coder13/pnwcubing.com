export const directusLoginMessages: Record<string, string> = {
  directus: "Sign-in failed. Check your email and password.",
  "directus-access":
    "This Directus account needs the Content-Editor or Administrator role. Ask a site administrator for access.",
  "directus-otp":
    "Enter the current six-digit code from your authenticator app.",
  "directus-unavailable": "Directus sign-in is unavailable. Try again later.",
};

export function directusLoginMessage(code: string): string {
  return Object.hasOwn(directusLoginMessages, code)
    ? directusLoginMessages[code]
    : directusLoginMessages["directus-unavailable"];
}
