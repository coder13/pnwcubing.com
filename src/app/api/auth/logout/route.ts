import { NextResponse } from "next/server";
import {
  cookieOptions,
  requireSameOrigin,
  sessionCookie,
} from "@/lib/editor/auth";
import { siteOrigin } from "@/lib/editor/config";
import { cookies } from "next/headers";
import { unseal } from "@/lib/editor/crypto";
import type { Session } from "@/lib/editor/auth";
import { revokeDirectusSession } from "@/lib/editor/directusAuth";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json(
      { error: "This request did not come from this website." },
      { status: 403 },
    );
  }
  const response = NextResponse.redirect(new URL("/login", siteOrigin()), 303);
  response.headers.set("Cache-Control", "private, no-store");
  const session = unseal<Session>(
    cookies().get(sessionCookie)?.value,
    "session",
  );
  if (session?.provider === "directus")
    await revokeDirectusSession(session.refreshToken).catch(() => undefined);
  response.cookies.set(sessionCookie, "", { ...cookieOptions(), maxAge: 0 });
  return response;
}
