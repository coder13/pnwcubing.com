import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { AuthError, requireSameOrigin, requireUser } from "@/lib/editor/auth";
import { DirectusError } from "@/lib/editor/directus";
import { ValidationError } from "@/lib/editor/validation";
import { mutateContent } from "@/lib/editor/mutations";

type Context = { params: { collection: string; id?: string[] } };

async function mutate(request: Request, { params }: Context) {
  try {
    requireSameOrigin(request);
    const { user, isEditor } = await requireUser();
    const data = await mutateContent(request, params.collection, params.id, {
      user,
      isEditor,
    });
    revalidatePath("/", "layout");
    return NextResponse.json(
      { data: data ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const status =
      error instanceof AuthError
        ? error.status
        : error instanceof ValidationError || error instanceof SyntaxError
        ? 400
        : error instanceof DirectusError && [404, 409].includes(error.status)
        ? error.status
        : 503;
    const message =
      error instanceof AuthError || error instanceof ValidationError
        ? error.message
        : status === 404
        ? "Content not found."
        : status === 409
        ? "A record with this ID already exists."
        : "The content could not be saved. Try again.";
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export const POST = mutate;
export const PATCH = mutate;
export const DELETE = mutate;
