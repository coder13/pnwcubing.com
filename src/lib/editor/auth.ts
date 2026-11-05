import { cookies } from "next/headers";
import { bootstrapEditorIds, siteOrigin } from "./config";
import { unseal } from "./crypto";
import { listItems } from "./directus";
import type { SiteEditor, WcaUser } from "./types";

export const sessionCookie = "pnw_session";
export const oauthCookie = "pnw_oauth";
export interface Session {
  accessToken: string;
  expiresAt: number;
}
export interface OAuthState {
  state: string;
  verifier: string;
  expiresAt: number;
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: siteOrigin().startsWith("https:"),
    sameSite: "lax" as const,
    path: "/",
  };
}

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function fetchWcaUser(accessToken: string): Promise<WcaUser> {
  const response = await fetch(
    "https://www.worldcubeassociation.org/api/v0/me",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (response.status === 401)
    throw new AuthError(401, "Your session expired. Sign in again.");
  if (!response.ok)
    throw new AuthError(503, "WCA login is unavailable. Try again later.");
  const { me } = await response.json();
  if (
    !Number.isSafeInteger(me?.id) ||
    me.id <= 0 ||
    typeof me.name !== "string"
  ) {
    throw new AuthError(503, "WCA returned an invalid user profile.");
  }
  return me;
}

export async function isContentEditor(userId: number): Promise<boolean> {
  if (bootstrapEditorIds().includes(userId)) return true;
  const editors = await listItems<SiteEditor>("SiteEditors", {
    filter: JSON.stringify({ id: { _eq: userId } }),
    limit: "1",
  });
  return editors[0]?.active === true;
}

export async function currentUser() {
  const session = unseal<Session>(
    cookies().get(sessionCookie)?.value,
    "session",
  );
  if (!session) return null;
  const user = await fetchWcaUser(session.accessToken);
  return { user, isEditor: await isContentEditor(user.id) };
}

export async function requireUser() {
  const identity = await currentUser();
  if (!identity) throw new AuthError(401, "Sign in with WCA to edit content.");
  return identity;
}

export function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== siteOrigin()) {
    throw new AuthError(403, "This request did not come from this website.");
  }
}
