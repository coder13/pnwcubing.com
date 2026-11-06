import { NextResponse } from "next/server";
import {
  cookieOptions,
  requireSameOrigin,
  sessionCookie,
} from "@/lib/editor/auth";
import { siteOrigin } from "@/lib/editor/config";
import { seal } from "@/lib/editor/crypto";
import { DirectusLoginError, loginDirectus } from "@/lib/editor/directusAuth";
import { directusLoginMessage } from "@/lib/editor/loginMessages";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const wantsJson = request.headers.get("accept")?.includes("application/json");
  const headers = {
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
  };
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json(
      { error: "This request did not come from this website." },
      { status: 403, headers },
    );
  }
  try {
    if (Number(request.headers.get("content-length")) > 8192)
      throw new DirectusLoginError("directus", 400, "Enter valid credentials.");
    const raw = await request.text();
    if (
      raw.length > 8192 ||
      !request.headers
        .get("content-type")
        ?.startsWith("application/x-www-form-urlencoded")
    )
      throw new DirectusLoginError("directus", 400, "Enter valid credentials.");
    const form = new URLSearchParams(raw);
    const email = form.get("email")?.trim() || "";
    const password = form.get("password") || "";
    const otp = form.get("otp")?.trim() || "";
    if (
      !email ||
      email.length > 254 ||
      !password ||
      password.length > 1024 ||
      (otp && !/^\d{6}$/.test(otp))
    )
      throw new DirectusLoginError("directus", 400, "Enter valid credentials.");
    const session = await loginDirectus({
      email,
      password,
      ...(otp ? { otp } : {}),
    });
    const response = wantsJson
      ? NextResponse.json({ success: true }, { headers })
      : NextResponse.redirect(new URL("/admin", siteOrigin()), {
          status: 303,
          headers,
        });
    response.cookies.set(sessionCookie, seal(session, "session"), {
      ...cookieOptions(),
      maxAge: Math.max(1, Math.floor((session.expiresAt - Date.now()) / 1000)),
    });
    return response;
  } catch (error) {
    const reason =
      error instanceof DirectusLoginError
        ? error.reason
        : "directus-unavailable";
    if (wantsJson)
      return NextResponse.json(
        {
          code: reason,
          error: directusLoginMessage(reason),
          requiresOtp: reason === "directus-otp",
        },
        {
          status: error instanceof DirectusLoginError ? error.status : 503,
          headers,
        },
      );
    return NextResponse.redirect(
      new URL(`/login/directus?error=${reason}`, siteOrigin()),
      { status: 303, headers },
    );
  }
}
