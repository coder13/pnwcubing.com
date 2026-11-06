import { pageIds } from "@/lib/editor/blocks";
import type { Metadata } from "next";
import { parseEditorRoute, editorUrl } from "@/lib/editor/routes";
import { redirect, notFound } from "next/navigation";
import { EditorWorkspace } from "@/components/editor/EditorWorkspace";
import { AuthError, currentUser } from "@/lib/editor/auth";
import { DirectusLoginError } from "@/lib/editor/directusAuth";
import { bootstrapEditorIds } from "@/lib/editor/config";
import { listItems } from "@/lib/editor/directus";
import type { Delegate } from "@/lib/directus";
import type {
  FAQItem,
  NavigationItem,
  SiteContent,
  SiteEditor,
} from "@/lib/editor/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Content editor | PNW Cubing",
  robots: { index: false, follow: false },
};

export default async function Admin({
  params,
}: {
  params: { path?: string[] };
}) {
  let identity;
  try {
    identity = await currentUser();
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) redirect("/login");
    if (
      error instanceof DirectusLoginError &&
      error.reason === "directus-access"
    )
      redirect("/login/directus?error=directus-access");
    return <EditorUnavailable />;
  }
  if (!identity) redirect("/login");
  const { user, isEditor } = identity;
  if (!params.path?.length)
    redirect(isEditor ? "/admin/pages" : "/admin/delegates");
  const path = `/admin/${params.path.join("/")}`;
  const route = parseEditorRoute(path);
  if (!route) notFound();
  if (!isEditor && route.collection !== "Delegates")
    redirect("/admin/delegates");

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
    if (
      !isEditor &&
      delegates.length === 1 &&
      route.selected !== String(delegates[0].id)
    )
      redirect(editorUrl("Delegates", String(delegates[0].id)));
    const [faq, content, editors, navigation] = isEditor
      ? await Promise.all([
          listItems<FAQItem>("FAQ", { sort: "sort,id" }),
          listItems<SiteContent>("SiteContent", { sort: "id" }),
          listItems<SiteEditor>("SiteEditors", { sort: "name" }),
          listItems<NavigationItem>("SiteNavigation", { fields: "id,href" }),
        ])
      : [[], [], [], []];
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
          initialPath={path}
          navigation={navigation}
          delegates={delegates}
          faq={faq}
          content={content.filter(
            (item) =>
              !!item.page && pageIds.includes(item.page) && !item.deleted,
          )}
          editors={editors}
          bootstrapIds={bootstrapEditorIds()}
        />
      </main>
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_")
    )
      throw error;
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
