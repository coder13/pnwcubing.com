import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  getContent,
  getPublicDelegates,
  getPublicFaq,
} from "../lib/editor/content";
import defaults from "../content/default-content.json";
import defaultFaq from "../content/default-faq.json";

process.env.DIRECTUS_TOKEN = "test-service-token";
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

test("published page sections appear, hidden sections are blank, and drafts use the original copy", async () => {
  const record = {
    id: "about.2",
    body: "New public copy",
    status: "published",
  };
  global.fetch = async () => Response.json({ data: [record] });
  assert.equal((await getContent("about.2"))?.body, record.body);
  global.fetch = async () =>
    Response.json({ data: [{ ...record, status: "hidden" }] });
  assert.equal((await getContent("about.2"))?.body, "");
  global.fetch = async () =>
    Response.json({ data: [{ ...record, status: "draft" }] });
  assert.equal(
    (await getContent("about.2"))?.body,
    defaults.find((item) => item.id === "about.2")?.body,
  );
});

test("public delegates and FAQ requests always filter to published content", async () => {
  const collections: string[] = [];
  global.fetch = async (input) => {
    const url = new URL(String(input));
    collections.push(url.pathname);
    assert.deepEqual(JSON.parse(url.searchParams.get("filter")!), {
      status: { _eq: "published" },
    });
    assert.equal(url.searchParams.get("limit"), "-1");
    return Response.json({ data: [] });
  };
  assert.deepEqual(await getPublicDelegates(), []);
  assert.deepEqual(await getPublicFaq(), []);
  assert.deepEqual(collections, ["/items/Delegates", "/items/FAQ"]);
});

test("upstream failures preserve page copy and FAQs, without exposing unfiltered delegates", async () => {
  let requests = 0;
  global.fetch = async () => {
    requests++;
    return new Response(null, { status: 503 });
  };
  assert.deepEqual(await getPublicDelegates(), []);
  assert.equal(requests, 1);
  assert.equal(
    (await getContent("about.2"))?.body,
    defaults.find((item) => item.id === "about.2")?.body,
  );
  assert.equal((await getPublicFaq()).length, defaultFaq.length);
});

test("every page section and original FAQ has a nonempty fallback", () => {
  assert.equal(defaults.length, 20);
  assert.equal(defaultFaq.length, 7);
  assert.equal(new Set(defaults.map((item) => item.id)).size, defaults.length);
  assert.ok(defaults.every((item) => item.body.trim()));
  assert.ok(
    defaultFaq.every((item) => item.question.trim() && item.answer.trim()),
  );
});
