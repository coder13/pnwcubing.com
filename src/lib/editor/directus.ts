import { requiredEnv } from "./config";
import {
  decodeFaqItem,
  encodeFaqItem,
  faqFieldMapId,
  parseFaqFieldMap,
  resolveFaqFields,
} from "./faqFields";
import type { ContentCollection } from "./types";

export class DirectusError extends Error {
  constructor(public status: number) {
    super("The content service could not complete the request.");
  }
}

// This module is used only by server pages, route handlers, and setup scripts.
export async function cmsRequest<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const response = await fetch(
    `${process.env.DIRECTUS_URL || "https://admin.pnwcubing.com"}${path}`,
    {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: {
        "Content-Type": "application/json",
        ...(authenticated
          ? { Authorization: `Bearer ${requiredEnv("DIRECTUS_TOKEN")}` }
          : {}),
        ...init.headers,
      },
    },
  );
  if (!response.ok) throw new DirectusError(response.status);
  if (response.status === 204) return undefined as T;
  return (await response.json()).data;
}

export function itemPath(collection: ContentCollection, id?: string): string {
  return `/items/${collection}${
    id === undefined ? "" : `/${encodeURIComponent(id)}`
  }`;
}

export async function listItems<T>(
  collection: ContentCollection,
  query: Record<string, string> = {},
  authenticated = true,
): Promise<T[]> {
  const items = await cmsRequest<T[]>(
    `${itemPath(collection)}?${new URLSearchParams({ limit: "-1", ...query })}`,
    {},
    authenticated,
  );
  return collection === "FAQ" ? items.map(decodeFaqItem) : items;
}

export async function encodeFaqWrite(body: Record<string, unknown>) {
  const records = await listItems<{ body: string }>("SiteContent", {
    filter: JSON.stringify({ id: { _eq: faqFieldMapId } }),
    fields: "body",
    limit: "1",
  });
  const mapping = records.length
    ? parseFaqFieldMap(records[0].body)
    : resolveFaqFields([]);
  return encodeFaqItem(body, mapping);
}
