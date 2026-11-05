import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  cookieOptions,
  fetchWcaUser,
  isContentEditor,
  oauthCookie,
  OAuthState,
  sessionCookie,
} from "@/lib/editor/auth";
import { requiredEnv, siteOrigin } from "@/lib/editor/config";
import { seal, unseal } from "@/lib/editor/crypto";
import { isDelegate } from "@/lib/editor/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pending = unseal<OAuthState>(
    cookies().get(oauthCookie)?.value,
    "oauth",
  );
  const response = NextResponse.redirect(new URL("/admin", siteOrigin()));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.cookies.set(oauthCookie, "", { ...cookieOptions(), maxAge: 0 });
  try {
    const code = url.searchParams.get("code");
    if (
      !pending ||
      pending.state !== url.searchParams.get("state") ||
      !code ||
      url.searchParams.has("error")
    ) {
      throw new Error("Invalid OAuth callback");
    }
    const tokenResponse = await fetch(
      "https://www.worldcubeassociation.org/oauth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: requiredEnv("WCA_CLIENT_ID"),
          client_secret: requiredEnv("WCA_CLIENT_SECRET"),
          redirect_uri: `${siteOrigin()}/api/auth/callback`,
          code,
          code_verifier: pending.verifier,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!tokenResponse.ok) throw new Error("Token exchange failed");
    const token = await tokenResponse.json();
    if (
      typeof token.access_token !== "string" ||
      !Number.isFinite(token.expires_in) ||
      token.expires_in <= 0
    ) {
      throw new Error("Invalid access token");
    }
    const user = await fetchWcaUser(token.access_token);
    if (!(await isContentEditor(user.id)) && !isDelegate(user)) {
      response.headers.set("Location", `${siteOrigin()}/login?error=access`);
      response.cookies.set(sessionCookie, "", {
        ...cookieOptions(),
        maxAge: 0,
      });
      return response;
    }
    const expiresAt = Date.now() + Math.min(token.expires_in, 28800) * 1000;
    response.cookies.set(
      sessionCookie,
      seal({ accessToken: token.access_token, expiresAt }, "session"),
      cookieOptions(),
    );
  } catch {
    response.headers.set("Location", `${siteOrigin()}/login?error=login`);
  }
  return response;
}
