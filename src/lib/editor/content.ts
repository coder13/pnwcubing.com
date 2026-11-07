import defaults from "@/content/default-content.json";
import defaultFaq from "@/content/default-faq.json";
import { listItems } from "./directus";
import type { SiteContent, FAQItem } from "./types";
import type { Delegate } from "../directus";

export const getContent = async (
  id: string,
): Promise<SiteContent | undefined> => {
  const fallback = defaults.find((item) => item.id === id) as
    | SiteContent
    | undefined;
  try {
    const records = await listItems<SiteContent>("SiteContent", {
      filter: JSON.stringify({ id: { _eq: id } }),
    });
    const record = records[0];
    if (!record || record.status === "draft") return fallback;
    return record.status === "hidden" ? { ...record, body: "" } : record;
  } catch {
    return fallback;
  }
};

export async function getPublicDelegates(): Promise<Delegate[]> {
  try {
    const delegates = await listItems<Delegate>(
      "Delegates",
      {
        filter: JSON.stringify({ status: { _eq: "published" } }),
        fields:
          "id,name,pronouns,email,region,description,wcaId,wcaUserId,wcaStatus,status,sort,date_updated",
        sort: "sort,name",
      },
      !!process.env.DIRECTUS_TOKEN,
    );
    return delegates.map((delegate) => ({
      ...delegate,
      email:
        !delegate.wcaStatus || delegate.wcaStatus === "trainee_delegate"
          ? ""
          : delegate.email,
    }));
  } catch {
    return [];
  }
}

export async function getPublicFaq(): Promise<FAQItem[]> {
  try {
    return await listItems<FAQItem>("FAQ", {
      filter: JSON.stringify({ status: { _eq: "published" } }),
      sort: "sort,id",
    });
  } catch {
    return defaultFaq as FAQItem[];
  }
}

export async function getPageBlocks(page: string) {
  const { blocksForPage, defaultPageBlocks } = await import("./blocks");
  try {
    const records = await listItems<SiteContent>("SiteContent", {
      filter: JSON.stringify({ page: { _eq: page }, deleted: { _neq: true } }),
      sort: "sort,id",
    });
    return blocksForPage(page, records).flatMap((block) =>
      block.status === "hidden"
        ? []
        : block.status === "draft"
        ? defaultPageBlocks(page).filter((original) => original.id === block.id)
        : [block],
    );
  } catch {
    return defaultPageBlocks(page);
  }
}
