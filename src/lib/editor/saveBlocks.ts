import type { PageBlock } from "./blocks";
export async function saveBlocks(
  initial: PageBlock[],
  blocks: PageBlock[],
  fetchImpl: typeof fetch = fetch,
) {
  const original = new Map(initial.map((block) => [block.id, block]));
  for (let sort = 0; sort < blocks.length; sort++) {
    const block = blocks[sort];
    const previous = original.get(block.id);
    const value = {
      page: block.page,
      blockType: block.blockType,
      title: block.title,
      body: block.body,
      status: block.status,
      faqItems: block.faqItems,
      subtitle: block.subtitle || "",
      cardItems: block.cardItems || [],
      sort,
    };
    const previousValue = previous && {
      page: previous.page,
      blockType: previous.blockType,
      title: previous.title,
      body: previous.body,
      status: previous.status,
      faqItems: previous.faqItems,
      subtitle: previous.subtitle || "",
      cardItems: previous.cardItems || [],
      sort: previous.sort,
    };
    if (JSON.stringify(value) === JSON.stringify(previousValue)) continue;
    const response = await fetchImpl(
      `/api/editor/SiteContent${
        previous ? `/${encodeURIComponent(block.id)}` : ""
      }`,
      {
        method: previous ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(previous ? value : { id: block.id, ...value }),
      },
    );
    if (!response.ok)
      throw new Error(
        "The page could not be fully saved. Keep your changes open and retry.",
      );
  }
  for (const block of initial.filter(
    (block) => !blocks.some((item) => item.id === block.id),
  )) {
    const response = await fetchImpl(
      `/api/editor/SiteContent/${encodeURIComponent(block.id)}`,
      { method: "DELETE" },
    );
    if (!response.ok)
      throw new Error(
        "A removed block could not be saved. Keep your changes open and retry.",
      );
  }
}
