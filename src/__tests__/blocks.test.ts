import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  splitParentFaq,
  splitHomeCards,
  splitPageHeading,
} from "../lib/editor/blockMigration";
import {
  defaultPageBlocks,
  blocksForPage,
  moveItem,
} from "../lib/editor/blocks";
import { validatePageBlock } from "../lib/editor/blockValidation";
import { saveBlocks } from "../lib/editor/saveBlocks";
import { parseEditorRoute, editorUrl } from "../lib/editor/routes";
import { mutateContent } from "../lib/editor/mutations";
import { PageBlockView } from "../components/PageBlockView";
process.env.DIRECTUS_TOKEN = "test-service-token";
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});
const editor = {
  user: { id: 8184, name: "Editor", wca_id: null, delegate_status: null },
  isEditor: true,
};
const block = defaultPageBlocks("parents")[0];
function request(method: string, body?: unknown) {
  return new Request("https://www.pnwcubing.com/api/editor/SiteContent", {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
function payload() {
  const { page, blockType, sort, title, body, status, faqItems } = block;
  return { page, blockType, sort, title, body, status, faqItems };
}

test("Parents FAQ migration preserves rich answers and makes question titles plain text", () => {
  const items = splitParentFaq(
    '<div><h2>FAQ</h2><div><p><b>Q</b>: A <i>question</i>?</p><p><b>A</b>: An <strong>answer</strong> with <a href="/contact">a link</a>.</p><p>Another paragraph.</p></div></div>',
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].question, "A question?");
  assert.ok(items[0].answer.includes("<strong>answer</strong>"));
  assert.ok(items[0].answer.includes('href="/contact"'));
  assert.ok(items[0].answer.includes("Another paragraph."));
  assert.throws(
    () => splitParentFaq("<p>Unrecognized content</p>"),
    /could not|no recognizable/,
  );
});

test("native Directus FAQ items without IDs or status normalize for both editors", () => {
  const source = {
    ...block,
    blockType: "faq" as const,
    faqItems: [{ question: "Q", answer: "<p>A</p>" }],
  };
  const normalized = blocksForPage("parents", [
    source as unknown as typeof block,
  ]);
  assert.equal(normalized[0].faqItems[0].id, `${block.id}-faq-1`);
  assert.equal(normalized[0].faqItems[0].status, "published");
});

test("blocks and FAQ items reorder without changing content and removed blocks stay removed", () => {
  const initial = defaultPageBlocks("parents");
  const reordered = moveItem(initial, 2, -1);
  assert.deepEqual(
    reordered.map((item) => item.id),
    ["parents.1", "parents.3", "parents.2"],
  );
  assert.equal(reordered[1].faqItems.length, 8);
  assert.deepEqual(moveItem(initial, 0, -1), initial);
  assert.equal(
    blocksForPage("parents", [{ ...initial[0], deleted: true }]).length,
    0,
  );
});

test("the theme renders green highlights and always-visible rich FAQ answers with plain titles", () => {
  const green = renderToStaticMarkup(
    React.createElement(PageBlockView, {
      block: defaultPageBlocks("parents")[1],
    }),
  );
  assert.ok(green.includes("bg-secondary"));
  const faq = {
    ...defaultPageBlocks("parents")[2],
    faqItems: [
      {
        id: "one",
        question: '<img src=x onerror="attack()">',
        answer: "<p><strong>Good</strong><script>attack()</script></p>",
        status: "published" as const,
      },
    ],
  };
  const html = renderToStaticMarkup(
    React.createElement(PageBlockView, { block: faq }),
  );
  assert.ok(html.includes("&lt;img"));
  assert.ok(html.includes("<strong>Good</strong>"));
  assert.ok(!html.includes("<details"));
  assert.ok(!html.includes("<summary"));
  assert.ok(!html.includes("<script>"));
});

test("block validation restricts fields, page types, and malformed FAQ items", () => {
  assert.doesNotThrow(() => validatePageBlock(payload(), false));
  for (const invalid of [
    { page: "internal" },
    { blockType: "script" },
    { sort: -1 },
    { deleted: true },
    { faqItems: [{ id: "q", question: "", answer: "A", status: "published" }] },
  ])
    assert.throws(() => validatePageBlock({ ...payload(), ...invalid }, false));
});

test("removed blocks are hidden and unlinked, with repeat removal safe", async () => {
  let state = { ...block };
  global.fetch = async (_url, init) => {
    if (init?.method === "PATCH") {
      assert.deepEqual(JSON.parse(String(init.body)), {
        deleted: true,
        status: "hidden",
        page: null,
      });
      state = { ...state, ...JSON.parse(String(init.body)) };
    }
    return Response.json({ data: state });
  };
  await mutateContent(request("DELETE"), "SiteContent", [block.id], editor);
  await mutateContent(request("DELETE"), "SiteContent", [block.id], editor);
  assert.equal(state.deleted, true);
});

test("a partial save retries new blocks using stable IDs instead of duplicating them", async () => {
  const id = "parents.block.12345678-1234-1234-1234-123456789abc";
  let exists = false;
  const methods: string[] = [];
  global.fetch = async (_url, init) => {
    if (!init?.method)
      return Response.json({ data: exists ? [{ page: "parents" }] : [] });
    methods.push(init.method);
    exists = true;
    return Response.json({ data: { id } });
  };
  await mutateContent(
    request("POST", { id, ...payload() }),
    "SiteContent",
    undefined,
    editor,
  );
  await mutateContent(
    request("POST", { id, ...payload() }),
    "SiteContent",
    undefined,
    editor,
  );
  assert.deepEqual(methods, ["POST", "PATCH"]);
});

test("block saves preserve ordering and soft-remove omitted records", async () => {
  const initial = defaultPageBlocks("parents");
  const methods: string[] = [];
  await saveBlocks(initial, [initial[2], initial[0]], async (_url, init) => {
    methods.push(init!.method!);
    return Response.json({ data: {} });
  });
  assert.deepEqual(methods, ["PATCH", "PATCH", "DELETE"]);
});

test("admin routes preserve page and record selections and reject unknown paths", () => {
  assert.equal(parseEditorRoute("/admin/pages/parents")?.page, "parents");
  assert.equal(parseEditorRoute("/admin/delegates/123")?.selected, "123");
  assert.equal(parseEditorRoute("/admin/editor-access/new")?.creating, true);
  assert.equal(editorUrl("Delegates", "123"), "/admin/delegates/123");
  for (const path of [
    "/admin/pages/missing",
    "/admin/navigation/5",
    "/admin/unknown",
    "/admin/pages/parents/extra",
  ])
    assert.equal(parseEditorRoute(path), null);
});

test("page headings are plain text and Contact body stays separate", () => {
  const result = splitPageHeading(
    "<div><h1>A <b>title</b></h1><p>A subtitle</p></div><div><h2>Body</h2><p>Keep this paragraph</p></div>",
  );
  assert.equal(result.title, "A title");
  assert.equal(result.subtitle, "A subtitle");
  assert.ok(result.remainder.includes("Keep this paragraph"));
  assert.ok(!result.remainder.includes("A subtitle"));
  for (const page of [
    "home",
    "parents",
    "contact",
    "competitions",
    "delegates",
    "competing",
    "about",
  ])
    assert.equal(
      defaultPageBlocks(page).filter((item) => item.blockType === "pageTitle")
        .length,
      1,
    );
});

test("home cards split into records and render with the site theme", () => {
  const cards = splitHomeCards(
    '<div><a href="/competitions"><h2>Title</h2><p><strong>Description</strong></p><span>View</span></a></div>',
  );
  assert.equal(cards[0].title, "Title");
  assert.ok(cards[0].body.includes("<strong>Description</strong>"));
  assert.equal(cards[0].href, "/competitions");
  assert.equal(cards[0].linkText, "View");
  const block = defaultPageBlocks("home").find(
    (item) => item.blockType === "cards",
  )!;
  const html = renderToStaticMarkup(
    React.createElement(PageBlockView, {
      block: {
        ...block,
        cardItems: [
          cards[0],
          { ...cards[0], id: "hidden", title: "Not visible", status: "hidden" },
        ],
      },
    }),
  );
  assert.equal((html.match(/<article/g) || []).length, 1);
  assert.ok(html.includes("<h2"));
  assert.ok(!html.includes("Not visible"));
  assert.throws(
    () => splitHomeCards('<a href="/lost">Missing structure</a>'),
    /could not be split safely/,
  );
});

test("card validation rejects unsafe URLs and duplicate IDs, and titles render as plain text", () => {
  const cardBlock = defaultPageBlocks("home").find(
    (item) => item.blockType === "cards",
  )!;
  const { id, label, ...value } = cardBlock;
  assert.doesNotThrow(() => validatePageBlock(value, false));
  for (const href of [
    "javascript:alert(1)",
    "//evil.example",
    "/\\evil.example",
    "https://example.com/ x",
  ])
    assert.throws(() =>
      validatePageBlock(
        { ...value, cardItems: [{ ...cardBlock.cardItems![0], href }] },
        false,
      ),
    );
  assert.throws(() =>
    validatePageBlock(
      {
        ...value,
        cardItems: [cardBlock.cardItems![0], cardBlock.cardItems![0]],
      },
      false,
    ),
  );
  const heading = {
    ...defaultPageBlocks("home")[0],
    title: "<b>Plain title</b>",
    subtitle: "<i>Plain subtitle</i>",
  };
  const html = renderToStaticMarkup(
    React.createElement(PageBlockView, { block: heading }),
  );
  assert.ok(html.includes("&lt;b&gt;Plain title"));
  assert.ok(html.includes("&lt;i&gt;Plain subtitle"));
});
