import { parseDocument, DomUtils } from "htmlparser2";
import { safeHtml } from "./html";

export function splitParentFaq(html: string) {
  const document = parseDocument(html);
  const groups = DomUtils.findAll(
    (node) =>
      node.type === "tag" &&
      node.name === "div" &&
      DomUtils.getChildren(node).filter(
        (child) => child.type === "tag" && child.name === "p",
      ).length >= 2,
    document.children,
  );
  const items = groups.map((group, index) => {
    const paragraphs = DomUtils.getChildren(group).filter(
      (node) => node.type === "tag" && node.name === "p",
    );
    const question = DomUtils.textContent(paragraphs[0])
      .replace(/^\s*Q\s*:\s*/i, "")
      .trim();
    const answer = safeHtml(
      paragraphs
        .slice(1)
        .map((paragraph, paragraphIndex) => {
          let inner = DomUtils.getInnerHTML(paragraph);
          if (paragraphIndex === 0)
            inner = inner
              .replace(/^\s*<(b|strong)>\s*A\s*<\/\1>\s*:\s*/i, "")
              .replace(/^\s*A\s*:\s*/i, "");
          return `<p>${inner}</p>`;
        })
        .join(""),
    );
    if (!question || !answer)
      throw new Error(
        "The existing Parents FAQ could not be split safely. No page content was changed.",
      );
    return {
      id: `parent-faq-${index + 1}`,
      question,
      answer,
      status: "published" as const,
    };
  });
  if (!items.length && html.trim())
    throw new Error(
      "The existing Parents FAQ has no recognizable question and answer pairs. No page content was changed.",
    );
  return items;
}

export function splitPageHeading(html: string) {
  const document = parseDocument(html);
  const heading = DomUtils.findOne(
    (node) => node.type === "tag" && /^h[12]$/.test(node.name),
    document.children,
    true,
  );
  if (!heading)
    return {
      title: DomUtils.textContent(document).trim(),
      subtitle: "",
      remainder: "",
    };
  const title = DomUtils.textContent(heading).trim();
  const headingParent = heading.parent;
  DomUtils.removeElement(heading);
  const subtitleNode = DomUtils.findOne(
    (node) => node.type === "tag" && node.name === "p",
    document.children,
    true,
  );
  // Only the paragraph in the title wrapper is a subtitle, not page body copy.
  let subtitle = "";
  if (
    subtitleNode &&
    (subtitleNode.parent === document || subtitleNode.parent === headingParent)
  ) {
    subtitle = DomUtils.textContent(subtitleNode).trim();
    DomUtils.removeElement(subtitleNode);
  }
  return {
    title,
    subtitle,
    remainder: DomUtils.getInnerHTML(document)
      .replace(/<div[^>]*>\s*<\/div>/g, "")
      .trim(),
  };
}

export function splitHomeCards(html: string) {
  const document = parseDocument(html);
  const links = DomUtils.findAll(
    (node) => node.type === "tag" && node.name === "a" && !!node.attribs.href,
    document.children,
  );
  const cards = links.map((link, index) => {
    const heading = DomUtils.findOne(
      (node) => node.type === "tag" && /^h[1-6]$/.test(node.name),
      link.children,
      true,
    );
    const button = DomUtils.findOne(
      (node) => node.type === "tag" && node.name === "span",
      link.children,
      true,
    );
    if (!heading || !button)
      throw new Error(
        "The home cards could not be split safely. No card content was changed.",
      );
    const title = DomUtils.textContent(heading).trim();
    const linkText = DomUtils.textContent(button).trim();
    DomUtils.removeElement(heading);
    DomUtils.removeElement(button);
    return {
      id: `home-card-${index + 1}`,
      title,
      body: safeHtml(DomUtils.getInnerHTML(link)),
      href: link.attribs.href,
      linkText,
      status: "published" as const,
    };
  });
  if (!cards.length && html.trim())
    throw new Error(
      "The home cards could not be split safely. No card content was changed.",
    );
  return cards;
}
