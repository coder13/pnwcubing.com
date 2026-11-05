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
    return await listItems<Delegate>(
      "Delegates",
      {
        filter: JSON.stringify({ status: { _eq: "published" } }),
        fields:
          "id,name,email,region,description,wcaId,status,sort,date_updated",
        sort: "sort,name",
      },
      !!process.env.DIRECTUS_TOKEN,
    );
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
