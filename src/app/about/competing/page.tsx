import { CmsBlocks } from "@/components/CmsBlocks";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Competing | pnwcubing",
};

export default function AboutCompeting() {
  return (
    <main className="flex flex-col flex-1 leading-8 pb-8">
      <CmsBlocks page="competing" />
    </main>
  );
}
