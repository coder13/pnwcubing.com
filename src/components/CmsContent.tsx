import { getContent } from "@/lib/editor/content";
import { safeHtml } from "@/lib/editor/html";

export async function CmsContent({
  contentKey,
  as: Tag = "div",
  className = "",
}: {
  contentKey: string;
  as?: "div" | "span";
  className?: string;
}) {
  const content = await getContent(contentKey);
  return (
    <Tag
      className={`cms-content ${className}`}
      dangerouslySetInnerHTML={{ __html: safeHtml(content?.body || "") }}
    />
  );
}
