import { AuthError } from "./authError";

export interface DirectusSession {
  provider: "directus";
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface DirectusEditorUser {
  provider: "directus";
  id: string;
  name: string;
  avatar?: { url?: string; thumb_url?: string };
}

const baseUrl = () => process.env.DIRECTUS_URL || "https://admin.pnwcubing.com";

export class DirectusLoginError extends AuthError {
  constructor(
    public reason:
      | "directus"
      | "directus-access"
      | "directus-otp"
      | "directus-unavailable",
    status: number,
    message: string,
  ) {
    super(status, message);
  }
}

export async function fetchDirectusUser(
  accessToken: string,
): Promise<DirectusEditorUser> {
  const response = await fetch(
    `${baseUrl()}/users/me?fields=id,first_name,last_name,status,role.id,role.name,role.admin_access`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (response.status === 401)
    throw new AuthError(401, "Your session expired. Sign in again.");
  if (!response.ok)
    throw new AuthError(503, "Directus login is unavailable. Try again later.");
  const { data } = await response.json();
  if (typeof data?.id !== "string" || data.status !== "active")
    throw new AuthError(401, "Your session expired. Sign in again.");
  if (data.role?.admin_access !== true && data.role?.name !== "Content-Editor")
    throw new DirectusLoginError(
      "directus-access",
      403,
      "This Directus account needs the Content-Editor or Administrator role.",
    );
  return {
    provider: "directus",
    id: data.id,
    name:
      [data.first_name, data.last_name]
        .filter((name) => typeof name === "string" && name.trim())
        .join(" ") || "Directus editor",
  };
}

export async function revokeDirectusSession(refreshToken: string) {
  const response = await fetch(`${baseUrl()}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok && response.status !== 401)
    throw new AuthError(503, "Directus sign-out is unavailable. Try again.");
}

export async function loginDirectus(input: {
  email: string;
  password: string;
  otp?: string;
}): Promise<DirectusSession> {
  const response = await fetch(`${baseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, mode: "json" }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const otpRequired = payload?.errors?.some(
      (error: { extensions?: { code?: string } }) =>
        error.extensions?.code === "INVALID_OTP",
    );
    throw new DirectusLoginError(
      response.status >= 500 || response.status === 429
        ? "directus-unavailable"
        : otpRequired
        ? "directus-otp"
        : "directus",
      response.status === 429 ? 429 : response.status >= 500 ? 503 : 401,
      "Directus sign-in failed. Check your credentials and two-factor code.",
    );
  }
  const { data } = await response.json();
  if (
    typeof data?.access_token !== "string" ||
    !data.access_token ||
    typeof data.refresh_token !== "string" ||
    !data.refresh_token ||
    !Number.isFinite(data.expires) ||
    data.expires <= 0
  )
    throw new DirectusLoginError(
      "directus-unavailable",
      503,
      "Directus returned an invalid session.",
    );
  try {
    await fetchDirectusUser(data.access_token);
  } catch (error) {
    await revokeDirectusSession(data.refresh_token).catch(() => undefined);
    throw error;
  }
  return {
    provider: "directus",
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + Math.min(data.expires, 28800000),
  };
}
