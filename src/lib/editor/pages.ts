import defaults from "@/content/default-content.json";
import type { SiteContent } from "./types";

export const editablePages = [
  { id: "home", title: "Home", href: "/" },
  { id: "competitions", title: "Competitions", href: "/competitions" },
  { id: "delegates", title: "Delegates", href: "/delegates" },
  { id: "parents", title: "For Parents", href: "/for-parents" },
  { id: "competing", title: "Competition Guide", href: "/about/competing" },
  { id: "about", title: "About Us", href: "/about" },
  { id: "contact", title: "Contact", href: "/contact" },
] as const;
export type EditablePage = (typeof editablePages)[number];

export function pageSections(page: string, content: SiteContent[]) {
  const definitions = defaults.filter((item) => item.page === page);
  if (page === "home")
    definitions.sort(
      (a, b) => Number(b.id === "home.title") - Number(a.id === "home.title"),
    );
  return definitions.flatMap((definition) => {
    const record = content.find((item) => item.id === definition.id);
    return record ? [{ ...record, label: definition.label }] : [];
  });
}

export async function savePageChanges(
  page: string,
  content: SiteContent[],
  drafts: Record<string, Pick<SiteContent, "body" | "status">>,
  fetchImpl: typeof fetch = fetch,
) {
  const changes = pageSections(page, content).filter(
    (section) =>
      drafts[section.id] &&
      (drafts[section.id].body !== section.body ||
        drafts[section.id].status !== section.status),
  );
  for (const section of changes) {
    const { body, status } = drafts[section.id];
    const response = await fetchImpl(
      `/api/editor/SiteContent/${encodeURIComponent(section.id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, status }),
      },
    );
    if (!response.ok)
      throw new Error(
        "The page could not be fully saved. Some sections can already be saved. Keep this page open and try again.",
      );
  }
  return changes.length;
}

export function sectionPreview(
  id: string,
  value: Pick<SiteContent, "body" | "status">,
): string {
  return value.status === "hidden"
    ? ""
    : value.status === "draft"
    ? defaults.find((section) => section.id === id)?.body || ""
    : value.body;
}
