import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { DelegateDetails } from "../components/DelegateDetails/DelegateDetails";
import type { Delegate } from "../lib/directus";
import { renderToStaticMarkup } from "react-dom/server";
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});
const delegate: Delegate = {
  id: "1",
  wcaUserId: 123,
  wcaId: "",
  name: "Delegate",
  email: "contact@example.com",
  region: "Local",
  description: "Blurb",
  status: "published",
  sort: 0,
  date_updated: "",
  wcaStatus: "delegate",
};

test("public profiles show optional pronouns beside the name and the WCA ID below", async () => {
  global.fetch = async () => new Response(null, { status: 503 });
  const html = renderToStaticMarkup(
    await DelegateDetails({
      ...delegate,
      name: "Cailyn Sinclair",
      pronouns: "she/her",
      wcaId: "2010TEST01",
    }),
  );
  assert.match(
    html,
    /Cailyn Sinclair<\/span> \(she\/her\)<\/p><p[^>]*>2010TEST01<\/p>/,
  );
  for (const pronouns of [undefined, null, "", "  "])
    assert.ok(
      !renderToStaticMarkup(
        await DelegateDetails({ ...delegate, pronouns }),
      ).includes('<p class="text-sm text-gray-600">'),
    );
  const plain = renderToStaticMarkup(
    await DelegateDetails({
      ...delegate,
      pronouns: "<strong>she/her</strong>",
    }),
  );
  assert.ok(plain.includes("&lt;strong&gt;she/her&lt;/strong&gt;"));
  assert.ok(!plain.includes("<strong>she/her</strong>"));
});

test("public rendering hides trainee email even before the next sync", async () => {
  global.fetch = async () =>
    Response.json({
      user: {
        id: 123,
        name: "Delegate",
        wca_id: null,
        delegate_status: "trainee_delegate",
      },
    });
  const output = JSON.stringify(await DelegateDetails(delegate));
  assert.ok(!output.includes(delegate.email));
  assert.ok(output.includes(delegate.name));
  assert.ok(!output.includes("()"));
});

test("public rendering keeps verified non-trainee contacts and hides email if WCA is unavailable", async () => {
  global.fetch = async () =>
    Response.json({
      user: {
        id: 123,
        name: "Delegate",
        wca_id: null,
        delegate_status: "delegate",
      },
    });
  assert.ok(
    JSON.stringify(await DelegateDetails(delegate)).includes(delegate.email),
  );
  assert.ok(
    !JSON.stringify(
      await DelegateDetails({ ...delegate, wcaStatus: "trainee_delegate" }),
    ).includes(delegate.email),
  );
  global.fetch = async () => new Response(null, { status: 503 });
  assert.ok(
    !JSON.stringify(await DelegateDetails(delegate)).includes(delegate.email),
  );
});
