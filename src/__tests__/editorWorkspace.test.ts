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
  wcaUserId: 123,
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
    "wcaUserId",
  ]) {
    const field = html.match(
      new RegExp(`<[^>]+id="editor-Delegates-${name}"[^>]*>`),
    )?.[0];
    assert.ok(field, `The ${name} field is visible.`);
    assert.equal(
      field.includes("readonly"),
      ["wcaId", "wcaUserId"].includes(name),
    );
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

test("delegate cards use distinct state colors, visible labels, and region groups", () => {
  const html = render(
    [
      { ...delegate, wcaRegionId: 28, wcaRegion: "Pacific Northwest" },
      {
        ...delegate,
        id: "2",
        wcaUserId: 456,
        name: "Canadian delegate",
        wcaRegionId: 114,
        wcaRegion: "Canada (West)",
      },
      {
        ...delegate,
        id: "3",
        wcaUserId: 789,
        name: "Hidden delegate",
        status: "hidden",
      },
      {
        ...delegate,
        id: "4",
        wcaUserId: 999,
        name: "Archived delegate",
        status: "archived",
      },
    ],
    true,
  );
  for (const label of [
    "Pacific Northwest",
    "Canada (West)",
    "Additional delegates",
    "Hidden",
    "Archived",
  ])
    assert.ok(html.includes(`aria-label="${label}"`));
  for (const color of ["bg-green-50", "bg-amber-50", "bg-gray-100"])
    assert.ok(html.includes(color));
  for (const label of ["Published", "Hidden", "Archived"])
    assert.ok(html.includes(`>${label}</span>`));
  assert.ok(html.includes("Sync WCA delegates"));
});

test("accounts without competitor IDs can edit their profile without a required competitor field", () => {
  const html = render([{ ...delegate, wcaId: "", wcaRegionId: null }]);
  const field = html.match(/<input[^>]+id="editor-Delegates-wcaId"[^>]*>/)![0];
  assert.ok(field.includes("readonly"));
  assert.ok(!field.includes("required"));
  assert.ok(!html.includes("Sync WCA delegates"));
  assert.ok(!html.includes('value="archived"'));
});

test("trainee editors see that their email will stay private", () => {
  const html = render([{ ...delegate, wcaStatus: "trainee_delegate" }]);
  assert.ok(html.includes("Trainee delegate emails stay private"));
  assert.ok(html.includes('id="editor-Delegates-email"'));
});
