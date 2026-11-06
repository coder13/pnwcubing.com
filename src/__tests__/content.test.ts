import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  getContent,
  getPublicDelegates,
  getPublicFaq,
} from "../lib/editor/content";
import defaults from "../content/default-content.json";
import defaultFaq from "../content/default-faq.json";
import { listItems } from "../lib/editor/directus";

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

test("public and editor FAQ reads normalize legacy fields without schema access", async () => {
  const record = {
    id: 20,
    Question: "Existing question",
    Answer: "Existing answer",
    Category: "General",
    status: "published",
    sort: 2,
  };
  global.fetch = async (input) => {
    assert.equal(new URL(String(input)).pathname, "/items/FAQ");
    return Response.json({ data: [record] });
  };
  const expected = [
    {
      id: 20,
      question: record.Question,
      answer: record.Answer,
      Category: record.Category,
      status: record.status,
      sort: record.sort,
    },
  ];
  assert.deepEqual(await getPublicFaq(), expected);
  assert.deepEqual(await listItems("FAQ"), expected);
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

test("public delegate data omits trainee emails, including manually entered values", async () => {
  global.fetch = async () =>
    Response.json({
      data: [
        {
          id: 1,
          status: "published",
          wcaStatus: "trainee_delegate",
          email: "private@example.com",
        },
        {
          id: 2,
          status: "published",
          wcaStatus: "delegate",
          email: "public@example.com",
        },
        {
          id: 3,
          status: "published",
          wcaStatus: null,
          email: "unverified@example.com",
        },
        {
          id: 4,
          status: "published",
          wcaStatus: "none",
          email: "additional@example.com",
        },
      ],
    });
  const delegates = await getPublicDelegates();
  assert.deepEqual(
    delegates.map((row) => row.email),
    ["", "public@example.com", "", "additional@example.com"],
  );
  assert.ok(!JSON.stringify(delegates).includes("private@example.com"));
});
