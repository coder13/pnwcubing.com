import structure from "@/content/default-page-structure.json";
import defaults from "@/content/default-content.json";
import defaultParentsFaq from "@/content/default-parent-faq.json";
import defaultFaq from "@/content/default-faq.json";
import type { SiteContent } from "./types";

export const blockTypes = [
  "text",
  "highlight",
  "faq",
  "cards",
  "pageTitle",
] as const;
export type BlockType = (typeof blockTypes)[number];
export type FaqBlockItem = {
  id: string;
  question: string;
  answer: string;
  status: "published" | "hidden";
};
export type HomeCardItem = {
  id: string;
  title: string;
  body: string;
  href: string;
  linkText: string;
  status: "published" | "hidden";
};
export const contactBodyId =
  "contact.block.00000000-0000-4000-8000-000000000001";
export type PageBlock = SiteContent & {
  page: string;
  blockType: BlockType;
  sort: number;
  title: string;
  subtitle?: string;
  cardItems?: HomeCardItem[];
  faqItems: FaqBlockItem[];
  deleted?: boolean;
};
export const pageIds = [
  "home",
  "competitions",
  "delegates",
  "parents",
  "competing",
  "about",
  "contact",
];
export function defaultBlockType(id: string): BlockType {
  if (id === "home.cards") return "cards";
  if (id === "home.title" || pageIds.some((page) => id === `${page}.1`))
    return "pageTitle";
  return ["parents.3", "competing.7"].includes(id)
    ? "faq"
    : [
        "about.2",
        "parents.2",
        "competing.2",
        "competing.4",
        "competing.6",
        "delegates.2",
        "competitions.2",
      ].includes(id)
    ? "highlight"
    : "text";
}
export function defaultPageBlocks(page: string): PageBlock[] {
  const records = defaults.filter((item) => item.page === page);
  if (page === "home")
    records.sort(
      (a, b) => Number(b.id === "home.title") - Number(a.id === "home.title"),
    );
  const heading = structure.headings[page as keyof typeof structure.headings];
  if (page === "contact" && heading?.remainder)
    records.push({
      id: contactBodyId,
      page,
      label: "Contact information",
      body: heading.remainder,
      status: "published",
    });
  return records.map((item, sort) => ({
    ...item,
    status: item.status as SiteContent["status"],
    blockType: defaultBlockType(item.id),
    sort,
    subtitle: item.id === heading?.id ? heading.subtitle : "",
    cardItems:
      item.id === "home.cards" ? (structure.cards as HomeCardItem[]) : [],
    title:
      item.id === heading?.id
        ? heading.title
        : item.id === "parents.3"
        ? "Parent FAQ"
        : item.id === "competing.7"
        ? "Frequently Asked Questions"
        : "",
    faqItems:
      item.id === "parents.3"
        ? (defaultParentsFaq as FaqBlockItem[])
        : item.id === "competing.7"
        ? defaultFaq.map((item) => ({
            id: `competition-faq-${item.id}`,
            question: item.question,
            answer: item.answer,
            status: item.status as "published",
          }))
        : [],
  }));
}
export function blocksForPage(
  page: string,
  records: SiteContent[],
): PageBlock[] {
  return records
    .flatMap((record) => {
      const fallback = defaultPageBlocks(page).find(
        (item) => item.id === record.id,
      );
      const block = record as Partial<PageBlock>;
      if ((block.page || fallback?.page) !== page || block.deleted) return [];
      return [
        {
          ...fallback,
          ...record,
          page,
          blockType: block.blockType || fallback?.blockType || "text",
          sort: block.sort ?? fallback?.sort ?? 0,
          subtitle: block.subtitle ?? fallback?.subtitle ?? "",
          cardItems: (Array.isArray(block.cardItems)
            ? block.cardItems
            : fallback?.cardItems || []
          ).map((item, index) => ({
            ...item,
            id: item.id || `${record.id}-card-${index + 1}`,
            status: item.status || "published",
          })),
          title: block.title ?? fallback?.title ?? "",
          faqItems: (Array.isArray(block.faqItems)
            ? block.faqItems
            : fallback?.faqItems || []
          ).map((item, index) => ({
            ...item,
            id: item.id || `${record.id}-faq-${index + 1}`,
            status: item.status || "published",
          })),
        } as PageBlock,
      ];
    })
    .sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));
}
export function moveItem<T>(items: T[], index: number, direction: number): T[] {
  const result = [...items];
  const target = index + direction;
  if (
    index < 0 ||
    index >= result.length ||
    target < 0 ||
    target >= result.length
  )
    return result;
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}
