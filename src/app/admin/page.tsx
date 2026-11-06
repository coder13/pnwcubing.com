import defaults from "@/content/default-content.json";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EditorWorkspace } from "@/components/editor/EditorWorkspace";
import { AuthError, currentUser } from "@/lib/editor/auth";
import { bootstrapEditorIds } from "@/lib/editor/config";
import { listItems } from "@/lib/editor/directus";
import type { Delegate } from "@/lib/directus";
import type { FAQItem, SiteContent, SiteEditor } from "@/lib/editor/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Content editor | PNW Cubing",
  robots: { index: false, follow: false },
};

export default async function Admin() {
  let identity;
  try {
    identity = await currentUser();
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) redirect("/login");
    return <EditorUnavailable />;
  }
  if (!identity) redirect("/login");
  const { user, isEditor } = identity;

  try {
    const delegates = await listItems<Delegate>("Delegates", {
      ...(!isEditor
        ? {
            filter: JSON.stringify({
              wcaUserId: { _eq: user.id },
              status: { _neq: "archived" },
            }),
          }
        : {}),
      sort: "sort,name",
    });
    const [faq, content, editors] = isEditor
      ? await Promise.all([
          listItems<FAQItem>("FAQ", { sort: "sort,id" }),
          listItems<SiteContent>("SiteContent", { sort: "id" }),
          listItems<SiteEditor>("SiteEditors", { sort: "name" }),
        ])
      : [[], [], []];
    return (
      <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Content editor</h1>
            <p>
              {user.name} · {isEditor ? "Full editor" : "Delegate"}
            </p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button className="rounded border px-4 py-2">Sign out</button>
          </form>
        </div>
        <EditorWorkspace
          isEditor={isEditor}
          delegates={delegates}
          faq={faq}
          content={content.filter((item) =>
            defaults.some((entry) => entry.id === item.id),
          )}
          editors={editors}
          bootstrapIds={bootstrapEditorIds()}
        />
      </main>
    );
  } catch {
    return <EditorUnavailable />;
  }
}

function EditorUnavailable() {
  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-3xl font-bold">Editor unavailable</h1>
      <p role="alert">
        The editor could not load. The WCA or content service is unavailable, or
        the CMS setup is incomplete.
      </p>
      <a href="/admin" className="block text-primary underline">
        Try again
      </a>
      <form action="/api/auth/logout" method="post">
        <button className="rounded border px-4 py-2">Sign out</button>
      </form>
    </main>
  );
}
