import assert from "node:assert/strict";
import { test } from "node:test";
import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { history, undo } from "@tiptap/pm/history";
import {
  changeLink,
  linkDraft,
  validEditorLink,
} from "../lib/editor/linkEditing";

const schema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: { content: "inline*", group: "block" },
    text: { group: "inline" },
    image: { group: "inline", inline: true, attrs: { src: {} } },
  },
  marks: {
    link: {
      attrs: { href: {}, target: { default: null }, class: { default: null } },
    },
    bold: {},
  },
});
const linked = schema.marks.link.create({
  href: "/delegates",
  target: "_blank",
  class: "underline",
});
function document() {
  return schema.node("doc", null, [
    schema.node("paragraph", null, [
      schema.text("See "),
      schema.text("Local ", [linked]),
      schema.text("Delegates", [linked, schema.marks.bold.create()]),
      schema.text(" for help."),
    ]),
  ]);
}
function stateAt(from = 12, to = from) {
  const doc = document();
  return EditorState.create({
    schema,
    doc,
    selection: TextSelection.create(doc, from, to),
    plugins: [history()],
  });
}

test("clicking any part of a formatted link finds the whole link without changing the document", () => {
  const state = stateAt();
  for (const position of [5, 8, 12, 20]) {
    const draft = linkDraft(state, position, "/delegates");
    assert.equal(draft.existing, true);
    assert.deepEqual([draft.from, draft.to], [5, 20]);
    assert.equal(draft.text, "Local Delegates");
    assert.equal(draft.href, "/delegates");
    assert.equal(draft.canEditText, true);
    assert.equal(draft.document, state.doc);
  }
  assert.ok(state.doc.eq(document()));
  assert.equal(linkDraft(stateAt(12, 15)).text, "Local Delegates");
});

test("editing a URL updates the entire original link after focus moves, with rich formatting intact", () => {
  const state = stateAt();
  const draft = linkDraft(state);
  const blurred = state.apply(
    state.tr.setSelection(TextSelection.create(state.doc, 1)),
  );
  const changed = blurred.apply(
    changeLink(blurred, draft, { href: "/contact", text: draft.text }),
  );
  assert.equal(changed.doc.textContent, state.doc.textContent);
  assert.equal(changed.doc.child(0).child(0).text, "See ");
  for (const index of [1, 2]) {
    const marks = changed.doc.child(0).child(index).marks;
    assert.equal(
      marks.find((mark) => mark.type.name === "link")?.attrs.href,
      "/contact",
    );
    assert.equal(
      marks.find((mark) => mark.type.name === "link")?.attrs.target,
      "_blank",
    );
    assert.equal(
      marks.find((mark) => mark.type.name === "link")?.attrs.class,
      "underline",
    );
  }
  assert.ok(
    changed.doc
      .child(0)
      .child(2)
      .marks.some((mark) => mark.type.name === "bold"),
  );
  assert.equal(changed.selection.empty, true);
});

test("link text edits replace only the chosen link and undo restores it in one step", () => {
  const state = stateAt();
  const changed = state.apply(
    changeLink(state, linkDraft(state), {
      href: "mailto:contact@pnwcubing.com",
      text: "Contact us",
    }),
  );
  assert.equal(changed.doc.textContent, "See Contact us for help.");
  assert.equal(linkDraft(changed, 7).href, "mailto:contact@pnwcubing.com");
  let restored = changed;
  assert.equal(
    undo(changed, (tr) => {
      restored = changed.apply(tr);
    }),
    true,
  );
  assert.ok(restored.doc.eq(state.doc));
});

test("removing a partially selected link keeps all text and formatting", () => {
  const state = stateAt(12, 15);
  const tr = changeLink(state, linkDraft(state), null);
  const changed = state.apply(tr);
  assert.equal(changed.doc.textContent, state.doc.textContent);
  changed.doc.descendants((node) =>
    assert.ok(!node.marks.some((mark) => mark.type.name === "link")),
  );
  assert.ok(
    changed.doc
      .child(0)
      .child(1)
      .marks.some((mark) => mark.type.name === "bold"),
  );
  assert.equal(tr.getMeta("preventAutolink"), true);
});

test("new links use selected text or insert plain link text at the saved cursor", () => {
  const selected = stateAt(1, 4);
  const selectionDraft = linkDraft(selected);
  assert.equal(selectionDraft.existing, false);
  const wrapped = selected.apply(
    changeLink(selected, selectionDraft, {
      href: "https://example.com",
      text: "See",
    }),
  );
  assert.equal(wrapped.doc.textContent, selected.doc.textContent);
  assert.equal(linkDraft(wrapped, 2).href, "https://example.com");
  const cursor = stateAt(1);
  const inserted = cursor.apply(
    changeLink(cursor, linkDraft(cursor), {
      href: "/",
      text: "<script>plain text</script>",
    }),
  );
  assert.ok(
    inserted.doc.textContent.startsWith("<script>plain text</script>See"),
  );
  assert.equal(inserted.doc.child(0).child(0).type.name, "text");
  const fallback = cursor.apply(
    changeLink(cursor, linkDraft(cursor), { href: "/contact", text: "" }),
  );
  assert.ok(fallback.doc.textContent.startsWith("/contactSee"));
});

test("link URL validation permits local, anchor, email and website links and rejects unsafe targets", () => {
  for (const href of [
    "/",
    "/delegates",
    "#faq",
    "mailto:contact@pnwcubing.com",
    "https://example.com",
    "http://example.com/a?x=1",
  ])
    assert.equal(validEditorLink(href), true, href);
  for (const href of [
    "",
    "#",
    "mailto:",
    "javascript:alert(1)",
    "data:text/html,x",
    "//evil.example",
    "/\\evil.example",
    "https://example.com/a b",
    "\nhttps://example.com",
  ])
    assert.equal(validEditorLink(href), false, href);
  const state = stateAt();
  assert.throws(
    () =>
      changeLink(state, linkDraft(state), {
        href: "javascript:alert(1)",
        text: "Oops",
      }),
    /Enter a website URL/,
  );
});

test("a stale link draft cannot change a different document", () => {
  const state = stateAt();
  const draft = linkDraft(state);
  const changed = state.apply(state.tr.insertText("New text", 1));
  assert.throws(
    () =>
      changeLink(changed, draft, { href: "/contact", text: "Wrong target" }),
    /text changed/,
  );
});

test("image links retain their content when the URL changes", () => {
  const doc = schema.node("doc", null, [
    schema.node("paragraph", null, [
      schema.node("image", { src: "/image.png" }, undefined, [linked]),
    ]),
  ]);
  const state = EditorState.create({ schema, doc });
  const draft = linkDraft(state, 1, "/delegates");
  assert.equal(draft.canEditText, false);
  const changed = state.apply(
    changeLink(state, draft, { href: "/contact", text: "" }),
  );
  assert.equal(changed.doc.child(0).child(0).type.name, "image");
  assert.equal(changed.doc.child(0).child(0).attrs.src, "/image.png");
  assert.equal(changed.doc.child(0).child(0).marks[0].attrs.href, "/contact");
});
