import sanitizeHtml from "sanitize-html";

export function safeHtml(body: string): string {
  return sanitizeHtml(body, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "iframe"],
    allowedAttributes: {
      "*": ["class", "id"],
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height", "loading"],
      iframe: ["src", "title", "width", "height", "loading", "allowfullscreen"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, rel: "noopener noreferrer" },
      }),
    },
  });
}
