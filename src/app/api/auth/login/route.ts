import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookieOptions, oauthCookie } from "@/lib/editor/auth";
import { requiredEnv, siteOrigin } from "@/lib/editor/config";
import { seal } from "@/lib/editor/crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const origin = siteOrigin();
    if (new URL(request.url).origin !== origin)
      return NextResponse.redirect(new URL("/api/auth/login", origin), {
        headers: { "Cache-Control": "no-store" },
      });
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");
    const url = new URL("https://www.worldcubeassociation.org/oauth/authorize");
    url.search = new URLSearchParams({
      client_id: requiredEnv("WCA_CLIENT_ID"),
      redirect_uri: `${origin}/api/auth/callback`,
      response_type: "code",
      scope: "public",
      state,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
    }).toString();
    const response = NextResponse.redirect(url);
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(
      oauthCookie,
      seal({ state, verifier, expiresAt: Date.now() + 600000 }, "oauth"),
      {
        ...cookieOptions(),
        maxAge: 600,
      },
    );
    return response;
  } catch {
    return NextResponse.json(
      { error: "WCA login is not configured. Contact a site administrator." },
      { status: 503 },
    );
  }
}
