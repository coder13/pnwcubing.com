export const statuses = ["draft", "published", "hidden"] as const;
export type PublicationStatus = (typeof statuses)[number];

export interface SiteContent {
  id: string;
  body: string;
  status: PublicationStatus;
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

export interface WcaUser {
  id: number;
  wca_id: string | null;
  name: string;
  delegate_status: string | null;
}

export const contentCollections = [
  "Delegates",
  "FAQ",
  "SiteContent",
  "SiteEditors",
] as const;
export type ContentCollection = (typeof contentCollections)[number];
