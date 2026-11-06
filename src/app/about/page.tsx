import { CmsBlocks } from "@/components/CmsBlocks";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | pnwcubing",
};

export default function About() {
  return (
    <main className="flex flex-col flex-1 leading-8 pb-8">
      <CmsBlocks page="about" />
    </main>
  );
}
