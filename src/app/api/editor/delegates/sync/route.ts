import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { AuthError, requireSameOrigin, requireUser } from "@/lib/editor/auth";
import { syncDelegates } from "@/lib/editor/delegateSync";
import { ValidationError } from "@/lib/editor/validation";
import { WcaDataError } from "@/lib/wcaDelegates";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { isEditor } = await requireUser();
    const data = await syncDelegates(isEditor);
    revalidatePath("/", "layout");
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AuthError ||
          error instanceof ValidationError ||
          error instanceof WcaDataError
            ? error.message
            : "Sync stopped. Some profiles may already be updated. Run sync again to finish.",
      },
      {
        status:
          error instanceof AuthError
            ? error.status
            : error instanceof ValidationError
            ? 400
            : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
