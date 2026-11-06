import { blockTypes, pageIds, type PageBlock } from "./blocks";
import { ValidationError } from "./validation";

export function validatePageBlock(
  value: unknown,
  create: boolean,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ValidationError("Enter a valid page block.");
  const item = value as Record<string, unknown>;
  const fields = [
    "page",
    "blockType",
    "sort",
    "title",
    "body",
    "status",
    "faqItems",
    "subtitle",
    "cardItems",
    ...(create ? ["id"] : []),
  ];
  if (Object.keys(item).some((key) => !fields.includes(key)))
    throw new ValidationError(
      "This block contains fields that you cannot change.",
    );
  if (
    !pageIds.includes(String(item.page)) ||
    !blockTypes.includes(item.blockType as PageBlock["blockType"])
  )
    throw new ValidationError("Select a valid page and block type.");
  if (!Number.isSafeInteger(item.sort) || Number(item.sort) < 0)
    throw new ValidationError("Enter a valid block order.");
  if (!["published", "hidden", "draft"].includes(String(item.status)))
    throw new ValidationError("Select a valid block visibility.");
  for (const field of ["title", "body"])
    if (
      typeof item[field] !== "string" ||
      (item[field] as string).length > (field === "body" ? 100000 : 300)
    )
      throw new ValidationError(`Enter valid ${field}.`);
  if (!Array.isArray(item.faqItems) || item.faqItems.length > 100)
    throw new ValidationError("A FAQ block can contain up to 100 questions.");
  const ids = new Set();
  for (const question of item.faqItems) {
    if (
      !question ||
      typeof question !== "object" ||
      Object.keys(question).some(
        (key) => !["id", "question", "answer", "status"].includes(key),
      ) ||
      typeof question.question !== "string" ||
      !question.question.trim() ||
      question.question.length > 300 ||
      typeof question.answer !== "string" ||
      question.answer.length > 10000 ||
      typeof question.id !== "string" ||
      !question.id ||
      ids.has(question.id) ||
      !["published", "hidden"].includes(question.status)
    )
      throw new ValidationError(
        "Each FAQ needs a plain-text question, an answer, and a unique ID.",
      );
    ids.add(question.id);
  }
  if (
    item.subtitle !== undefined &&
    (typeof item.subtitle !== "string" || item.subtitle.length > 500)
  )
    throw new ValidationError("Enter a subtitle with up to 500 characters.");
  if (item.cardItems !== undefined) {
    if (!Array.isArray(item.cardItems) || item.cardItems.length > 100)
      throw new ValidationError("A home feed can contain up to 100 cards.");
    const cardIds = new Set();
    for (const card of item.cardItems) {
      if (
        !card ||
        typeof card !== "object" ||
        Object.keys(card).some(
          (key) =>
            !["id", "title", "body", "href", "linkText", "status"].includes(
              key,
            ),
        ) ||
        typeof card.id !== "string" ||
        !card.id ||
        cardIds.has(card.id) ||
        typeof card.title !== "string" ||
        !card.title.trim() ||
        card.title.length > 300 ||
        typeof card.body !== "string" ||
        card.body.length > 10000 ||
        typeof card.linkText !== "string" ||
        !card.linkText.trim() ||
        card.linkText.length > 100 ||
        typeof card.href !== "string" ||
        !safeCardUrl(card.href) ||
        !["published", "hidden"].includes(card.status)
      )
        throw new ValidationError(
          "Each card needs a title, content, link text, a valid URL, and a unique ID.",
        );
      cardIds.add(card.id);
    }
  }
  if (
    create &&
    (typeof item.id !== "string" ||
      !new RegExp(`^${item.page}\\.block\\.[a-f0-9-]{36}$`).test(item.id))
  )
    throw new ValidationError("The new block ID is invalid.");
  return item;
}

export function safeCardUrl(value: string): boolean {
  if (value !== value.trim() || /[\\\s\u0000-\u001f]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
