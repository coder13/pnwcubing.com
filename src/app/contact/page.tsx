import { CmsBlocks } from "@/components/CmsBlocks";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | pnwcubing",
};

export default function Contact() {
  return (
    <main className="flex flex-col flex-1 leading-8 pb-8">
      <CmsBlocks page="contact" />
    </main>
  );
}
