import React from "react";
import { getPageBlocks } from "@/lib/editor/content";
import { PageBlockView } from "./PageBlockView";
export async function CmsBlocks({
  page,
  bare = false,
}: {
  page: string;
  bare?: boolean;
}) {
  const blocks = await getPageBlocks(page);
  return (
    <>
      {blocks.map((block) => (
        <PageBlockView key={block.id} block={block} bare={bare} />
      ))}
    </>
  );
}
