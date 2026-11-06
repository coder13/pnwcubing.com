import defaults from "@/content/default-navigation.json";
import { listItems } from "./directus";
import type { NavigationItem } from "./types";
import {
  editableNavigationLinks,
  safeAdditionalUrl,
} from "./navigationSettings";
export { safeNavigationUrl } from "./navigationSettings";

// Website routes and header structure stay in code. Only these two external URLs come from Directus.
export function publicNavigation(
  records: Pick<NavigationItem, "id" | "href">[],
): NavigationItem[] {
  return (defaults as NavigationItem[])
    .filter((item) => item.kind !== "brand")
    .map((item) => {
      const custom = records.find((record) => record.id === item.id);
      return editableNavigationLinks.some((link) => link.id === item.id) &&
        safeAdditionalUrl(custom?.href)
        ? { ...item, href: custom.href }
        : { ...item };
    });
}
export async function getNavigation(): Promise<NavigationItem[]> {
  try {
    return publicNavigation(
      await listItems<NavigationItem>("SiteNavigation", {
        fields: "id,href",
        filter: JSON.stringify({
          id: { _in: editableNavigationLinks.map((link) => link.id) },
        }),
      }),
    );
  } catch {
    return publicNavigation([]);
  }
}
