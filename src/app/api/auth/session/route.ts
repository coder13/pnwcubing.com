import { NextResponse } from "next/server";
import { AuthError, currentUser } from "@/lib/editor/auth";
import { safeAvatar } from "@/lib/editor/account";

export const dynamic = "force-dynamic";
export async function GET() {
  const headers = {
    "Cache-Control": "private, no-store, max-age=0",
    Vary: "Cookie",
  };
  try {
    const identity = await currentUser();
    return NextResponse.json(
      {
        user: identity
          ? {
              name: identity.user.name,
              avatar: safeAvatar(
                identity.user.avatar?.thumb_url || identity.user.avatar?.url,
              ),
            }
          : null,
      },
      { headers },
    );
  } catch (error) {
    if (error instanceof AuthError && error.status === 401)
      return NextResponse.json({ user: null }, { headers });
    return NextResponse.json(
      { error: "Session could not be checked." },
      { status: 503, headers },
    );
  }
}
