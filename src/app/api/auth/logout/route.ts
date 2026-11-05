import { NextResponse } from "next/server";
import {
  cookieOptions,
  requireSameOrigin,
  sessionCookie,
} from "@/lib/editor/auth";
import { siteOrigin } from "@/lib/editor/config";

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
  response.cookies.set(sessionCookie, "", { ...cookieOptions(), maxAge: 0 });
  return response;
}
