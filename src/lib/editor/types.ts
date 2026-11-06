export const statuses = ["draft", "published", "hidden"] as const;
export type PublicationStatus = (typeof statuses)[number];

export interface SiteContent {
  id: string;
  body: string;
  status: PublicationStatus;
  page?: string;
  label?: string;
  blockType?: "text" | "highlight" | "faq" | "cards" | "pageTitle";
  sort?: number;
  title?: string;
  subtitle?: string;
  cardItems?: import("./blocks").HomeCardItem[];
  deleted?: boolean;
  faqItems?: {
    id: string;
    question: string;
    answer: string;
    status: "published" | "hidden";
  }[];
}

export interface FAQItem {
  id: number;
  question: string;
  answer: string;
  status: PublicationStatus;
  sort: number;
}

export interface SiteEditor {
  id: number;
  name: string;
  active: boolean;
}

export interface NavigationItem {
  id: number;
  label: string;
  href: string;
  kind: "link" | "menu" | "brand";
  parent: number;
  newTab: boolean;
  status: PublicationStatus;
  sort: number;
}

export interface WcaUser {
  id: number;
  wca_id: string | null;
  name: string;
  delegate_status: string | null;
  avatar?: { url?: string; thumb_url?: string };
}

export const contentCollections = [
  "Delegates",
  "FAQ",
  "SiteContent",
  "SiteEditors",
  "SiteNavigation",
] as const;
export type ContentCollection = (typeof contentCollections)[number];
