import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { EditorWorkspace } from "../components/editor/EditorWorkspace";
import type { Delegate } from "../lib/directus";

const delegate: Delegate = {
  id: "1",
  name: "Test Delegate",
  wcaId: "2010TEST01",
  email: "delegate@example.com",
  region: "Washington",
  description: "Existing blurb",
  status: "published",
  sort: 0,
  date_updated: "2026-11-05T00:00:00Z",
};

function render(delegates: Delegate[], isEditor = false) {
  const noop = () => {};
  return renderToStaticMarkup(
    createElement(
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
      createElement(EditorWorkspace, {
        delegates,
        isEditor,
        faq: [],
        content: [],
        editors: [],
        bootstrapIds: [],
      }),
    ),
  );
}

test("a delegate's single profile opens with all normal fields and a read-only WCA ID", () => {
  const html = render([delegate]);
  assert.match(html, /aria-pressed="true"/);
  assert.ok(!html.includes("Select a record to edit it."));
  for (const name of [
    "name",
    "email",
    "region",
    "description",
    "status",
    "sort",
    "wcaId",
  ]) {
    const field = html.match(
      new RegExp(`<[^>]+id="editor-Delegates-${name}"[^>]*>`),
    )?.[0];
    assert.ok(field, `The ${name} field is visible.`);
    assert.equal(field.includes("readonly"), name === "wcaId");
    assert.ok(!field.includes("disabled"));
  }
  assert.ok(html.includes(delegate.wcaId));
  assert.ok(!html.includes("Content types"));
  assert.ok(!html.includes(">Delete</button>"));
});

test("empty and multiple delegate matches do not select an arbitrary record", () => {
  const empty = render([]);
  assert.ok(empty.includes("Your WCA account has no delegate profile here."));
  assert.ok(!empty.includes("editor-Delegates-name"));
  const multiple = render([delegate, { ...delegate, id: "2" }]);
  assert.ok(multiple.includes("Select a record to edit it."));
  assert.ok(!multiple.includes("editor-Delegates-name"));
});

test("full editors keep the list selection workflow", () => {
  const html = render([delegate], true);
  assert.ok(html.includes("Content types"));
  assert.ok(html.includes("Select a record to edit it."));
  assert.ok(!html.includes("editor-Delegates-name"));
});
