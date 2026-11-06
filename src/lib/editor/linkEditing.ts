import { getMarkRange } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";

export type LinkDraft = {
  from: number;
  to: number;
  href: string;
  text: string;
  canEditText: boolean;
  existing: boolean;
  attributes: Record<string, unknown>;
  document: Node;
};

export function linkDraft(
  state: EditorState,
  position?: number,
  href?: string,
): LinkDraft {
  const { selection, doc, schema } = state;
  const range = getMarkRange(
    doc.resolve(position ?? selection.from),
    schema.marks.link,
    href === undefined ? undefined : { href },
  );
  const existing =
    !!range &&
    (position !== undefined ||
      (range.from <= selection.from && range.to >= selection.to));
  const { from, to } = existing ? range! : selection;
  const mark = existing
    ? doc
        .resolve(from)
        .nodeAfter?.marks.find((mark) => mark.type === schema.marks.link)
    : undefined;
  let canEditText = doc.resolve(from).sameParent(doc.resolve(to));
  doc.nodesBetween(from, to, (node) => {
    if (node.isInline && !node.isText) canEditText = false;
  });
  return {
    from,
    to,
    existing,
    href: String(mark?.attrs.href || ""),
    text: doc.textBetween(from, to, "\n", ""),
    canEditText,
    attributes: mark?.attrs || {},
    document: doc,
  };
}

export function validEditorLink(value: string): boolean {
  if (!value || /[\s\\\u0000-\u001f]/.test(value)) return false;
  if (value.startsWith("/")) return !value.startsWith("//");
  if (value.startsWith("#")) return value.length > 1;
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" ||
      url.protocol === "https:" ||
      (url.protocol === "mailto:" && !!url.pathname)
    );
  } catch {
    return false;
  }
}

export function changeLink(
  state: EditorState,
  draft: LinkDraft,
  change: { href: string; text: string } | null,
) {
  if (!state.doc.eq(draft.document))
    throw new Error(
      "The text changed while this link was open. Close the link editor and try again.",
    );
  const tr = state.tr;
  const link = state.schema.marks.link;
  let end = draft.to;
  if (change) {
    const href = change.href.trim();
    if (!validEditorLink(href))
      throw new Error("Enter a website URL, an email link, or a local path.");
    if (
      draft.canEditText &&
      (change.text !== draft.text || draft.from === draft.to)
    ) {
      const text = change.text || href;
      const marks = state.doc
        .resolve(draft.from)
        .marks()
        .filter((mark) => mark.type !== link);
      tr.replaceWith(
        draft.from,
        draft.to,
        state.schema.text(text, [
          ...marks,
          link.create({ ...draft.attributes, href }),
        ]),
      );
      end = draft.from + text.length;
    } else {
      tr.removeMark(draft.from, draft.to, link);
      tr.addMark(
        draft.from,
        draft.to,
        link.create({ ...draft.attributes, href }),
      );
    }
  } else {
    tr.removeMark(draft.from, draft.to, link);
  }
  return tr
    .setSelection(TextSelection.near(tr.doc.resolve(end)))
    .removeStoredMark(link)
    .setMeta("preventAutolink", true)
    .scrollIntoView();
}
