import { cookies } from "next/headers";
import { bootstrapEditorIds, siteOrigin } from "./config";
import { unseal } from "./crypto";
import { listItems } from "./directus";
import type { SiteEditor, WcaUser } from "./types";
import { AuthError } from "./authError";
import { fetchDirectusUser, type DirectusSession } from "./directusAuth";
export { AuthError } from "./authError";

export const sessionCookie = "pnw_session";
export const oauthCookie = "pnw_oauth";
export interface WcaSession {
  provider?: "wca";
  accessToken: string;
  expiresAt: number;
}
export type Session = WcaSession | DirectusSession;
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
  if (session.provider === "directus")
    return {
      user: await fetchDirectusUser(session.accessToken),
      isEditor: true,
    };
  const user = await fetchWcaUser(session.accessToken);
  return { user, isEditor: await isContentEditor(user.id) };
}

export async function requireUser() {
  const identity = await currentUser();
  if (!identity) throw new AuthError(401, "Sign in to edit content.");
  return identity;
}

export function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== siteOrigin()) {
    throw new AuthError(403, "This request did not come from this website.");
  }
}

export async function hasDelegateProfile(userId: number): Promise<boolean> {
  const delegates = await listItems<{ id: string }>("Delegates", {
    filter: JSON.stringify({
      wcaUserId: { _eq: userId },
      status: { _neq: "archived" },
    }),
    fields: "id",
    limit: "1",
  });
  return delegates.length > 0;
}
