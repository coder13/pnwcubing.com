import { pageIds } from "./blocks";
import type { ContentCollection } from "./types";
export type EditorRoute = {
  collection: ContentCollection;
  page: string;
  selected: string;
  creating: boolean;
};
const sections: Record<string, ContentCollection> = {
  pages: "SiteContent",
  delegates: "Delegates",
  navigation: "SiteNavigation",
  "editor-access": "SiteEditors",
};
export function parseEditorRoute(path: string): EditorRoute | null {
  const parts = path.replace(/\/$/, "").split("/").filter(Boolean);
  if (parts.shift() !== "admin" || parts.length > 2) return null;
  const section = parts[0] || "pages";
  const collection = sections[section];
  if (!collection) return null;
  const selected = parts[1] || "";
  if (collection === "SiteContent")
    return !selected || pageIds.includes(selected)
      ? { collection, page: selected, selected: "", creating: false }
      : null;
  if (collection === "SiteNavigation" && selected) return null;
  if (selected && selected !== "new" && !/^[a-zA-Z0-9_-]+$/.test(selected))
    return null;
  return {
    collection,
    page: "",
    selected: selected === "new" ? "" : selected,
    creating: selected === "new",
  };
}
export function editorUrl(collection: ContentCollection, id = ""): string {
  const section = {
    SiteContent: "pages",
    Delegates: "delegates",
    SiteNavigation: "navigation",
    SiteEditors: "editor-access",
    FAQ: "pages",
  }[collection];
  return `/admin/${section}${id ? `/${encodeURIComponent(id)}` : ""}`;
}
