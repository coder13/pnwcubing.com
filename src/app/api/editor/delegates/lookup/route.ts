import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/editor/auth";
import { getWcaAccount, WcaDataError } from "@/lib/wcaDelegates";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const { isEditor } = await requireUser();
    if (!isEditor)
      throw new AuthError(403, "Only a full editor can add delegates.");
    const id = Number(new URL(request.url).searchParams.get("userId"));
    if (!Number.isSafeInteger(id) || id <= 0)
      throw new AuthError(400, "Enter a numeric WCA user ID.");
    const user = await getWcaAccount(id);
    return NextResponse.json(
      {
        data: {
          id: user.id,
          name: user.name,
          wcaId: user.wca_id || "",
          email:
            user.delegate_status === "trainee_delegate" ? "" : user.email || "",
          wcaStatus: user.delegate_status || "none",
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AuthError || error instanceof WcaDataError
            ? error.message
            : "The WCA account could not load. Try again.",
      },
      {
        status: error instanceof AuthError ? error.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
