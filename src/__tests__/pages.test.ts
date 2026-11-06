import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import defaults from "../content/default-content.json";
import {
  editablePages,
  pageSections,
  savePageChanges,
  sectionPreview,
} from "../lib/editor/pages";
import { PagesList } from "../components/editor/PagesList";
import { defaultPageBlocks } from "../lib/editor/blocks";
import { PageEditor } from "../components/editor/PageEditor";
import type { SiteContent } from "../lib/editor/types";
const content = defaults.map(({ id, body, status }) => ({
  id,
  body,
  status,
})) as SiteContent[];

test("the page index shows seven named pages with URLs and edit and view actions", () => {
  const html = renderToStaticMarkup(
    React.createElement(PagesList, { onSelect: () => {} }),
  );
  assert.equal(editablePages.length, 7);
  for (const page of editablePages) {
    assert.ok(html.includes(page.title));
    assert.ok(html.includes(`aria-label="Edit ${page.title}"`));
    assert.ok(html.includes(`aria-label="View ${page.title}"`));
    assert.ok(html.includes(`href="${page.href}"`));
  }
  assert.ok(!html.includes("<select"));
  assert.ok(!html.includes("published"));
});

test("page sections preserve public order and exclude unrelated and internal records", () => {
  const mixed = [
    ...content,
    {
      id: "__setup_navigation_v1",
      body: "Internal",
      status: "hidden" as const,
    },
  ];
  assert.deepEqual(
    pageSections("parents", mixed).map((item) => item.label),
    ["Heading", "Introduction", "Parent FAQ"],
  );
  assert.deepEqual(
    pageSections("home", mixed).map((item) => item.id),
    ["home.title", "home.cards"],
  );
  assert.deepEqual(pageSections("unknown", mixed), []);
});

test("opening Parents presents visual blocks with plain questions and rich answers", () => {
  const noop = () => {};
  const html = renderToStaticMarkup(
    React.createElement(
      AppRouterContext.Provider,
      {
        value: {
          back: noop,
          forward: noop,
          refresh: noop,
          push: noop,
          replace: noop,
          prefetch: noop,
        },
      },
      React.createElement(PageEditor, {
        page: editablePages.find((page) => page.id === "parents")!,
        sections: defaultPageBlocks("parents"),
        onBack: noop,
        onDirty: noop,
        onSaved: noop,
      }),
    ),
  );
  assert.ok(html.includes('aria-label="Breadcrumb"'));
  for (const label of ["Normal text", "Green highlight", "FAQ list"])
    assert.ok(html.includes(label));
  assert.ok(html.includes("Add question"));
  assert.ok(!html.includes("<textarea"));
  assert.ok(!html.includes("Content (HTML)"));
  assert.ok(html.includes('aria-label="Move block 2 up"'));
  assert.ok(html.includes("Save page"));
  assert.ok(html.includes("Show preview"));
  assert.ok(!html.includes("Our Team"));
});

test("page saves patch changed sections only, without metadata or unrelated pages", async () => {
  const sections = pageSections("parents", content);
  const drafts = Object.fromEntries(
    sections.map((section) => [
      section.id,
      { body: section.body, status: section.status },
    ]),
  );
  drafts["parents.1"].body = "<h1>New heading</h1>";
  drafts["about.1"] = { body: "Unrelated", status: "hidden" };
  const writes: string[] = [];
  const count = await savePageChanges(
    "parents",
    content,
    drafts,
    async (url, init) => {
      writes.push(String(url));
      assert.equal(init?.method, "PATCH");
      assert.deepEqual(JSON.parse(String(init?.body)), {
        body: "<h1>New heading</h1>",
        status: "published",
      });
      return Response.json({ data: {} });
    },
  );
  assert.equal(count, 1);
  assert.deepEqual(writes, ["/api/editor/SiteContent/parents.1"]);
});

test("failed page saves stop and keep a clear retry message", async () => {
  const sections = pageSections("parents", content);
  const drafts = Object.fromEntries(
    sections.map((section) => [
      section.id,
      { body: "Edited", status: section.status },
    ]),
  );
  let calls = 0;
  await assert.rejects(
    savePageChanges("parents", content, drafts, async () => {
      calls++;
      return new Response(null, { status: calls === 1 ? 200 : 503 });
    }),
    /fully saved/,
  );
  assert.equal(calls, 2);
});

test("section previews match published, hidden, and draft public behavior", () => {
  const original = content.find((section) => section.id === "parents.1")!.body;
  assert.equal(
    sectionPreview("parents.1", { body: "New copy", status: "published" }),
    "New copy",
  );
  assert.equal(
    sectionPreview("parents.1", { body: "New copy", status: "hidden" }),
    "",
  );
  assert.equal(
    sectionPreview("parents.1", { body: "New copy", status: "draft" }),
    original,
  );
});
