import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { setupCms } from "../../scripts/setup-cms";
import { faqFieldMapId } from "../lib/editor/faqFields";

process.env.DIRECTUS_SETUP_TOKEN = "test-setup-token";
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

type Item = Record<string, unknown>;
function fixture(policies: boolean) {
  const fields = new Map<string, Item[]>([
    ["Delegates", [{ field: "id" }, { field: "name" }, { field: "wcaId" }]],
    ["directus_permissions", [{ field: policies ? "policy" : "role" }]],
  ]);
  const items = new Map<string, Item[]>([
    [
      "Delegates",
      [{ id: "old", name: "Existing delegate", description: "Existing blurb" }],
    ],
  ]);
  const relations: Item[] = [];
  const flows: Item[] = [];
  const operations: Item[] = [];
  const permissions = [
    {
      id: 1,
      collection: "Delegates",
      action: "read",
      ...(policies ? { policy: "public-policy" } : { role: null }),
    },
    {
      id: 2,
      collection: "unrelated",
      action: "read",
      ...(policies ? { policy: "public-policy" } : { role: null }),
    },
    {
      id: 3,
      collection: "Delegates",
      action: "update",
      ...(policies ? { policy: "private-policy" } : { role: "private-role" }),
    },
  ];
  global.fetch = async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname.split("/").filter(Boolean);
    const method = init?.method || "GET";
    assert.equal(
      (init?.headers as Record<string, string>).Authorization,
      "Bearer test-setup-token",
    );
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    let data: unknown;
    if (path[0] === "collections") {
      if (method === "GET")
        data = Array.from(fields.keys()).map((collection) => ({ collection }));
      else if (method === "PATCH") {
        assert.ok(fields.has(path[1]));
      } else {
        fields.set(body.collection, body.fields);
        items.set(body.collection, []);
      }
    } else if (path[0] === "fields") {
      if (method === "GET") data = fields.get(path[1]);
      else if (method === "PATCH") {
        if (body.schema)
          assert.ok(body.type, "Directus requires type with schema updates");
        const field = fields
          .get(path[1])!
          .find((field) => field.field === path[2]);
        assert.ok(field);
        field.meta = { ...(field.meta as Item), ...body.meta };
        field.schema = { ...(field.schema as Item), ...body.schema };
      } else {
        assert.ok(
          !fields
            .get(path[1])!
            .some(
              (field) =>
                String(field.field).toLowerCase() === body.field.toLowerCase(),
            ),
          "Duplicate field name (case-insensitive database)",
        );
        fields.get(path[1])!.push(body);
        if (body.schema?.default_value !== undefined)
          for (const item of items.get(path[1]) || [])
            item[body.field] = body.schema.default_value;
      }
    } else if (path[0] === "permissions") {
      if (method === "GET") data = [...permissions];
      else
        permissions.splice(
          permissions.findIndex((rule) => rule.id === Number(path[1])),
          1,
        );
    } else if (["flows", "operations"].includes(path[0])) {
      const records = path[0] === "flows" ? flows : operations;
      if (method === "GET") data = records;
      else if (method === "POST") {
        const record = { ...body, id: String(records.length + 1) };
        records.push(record);
        data = record;
      } else {
        const record = records.find((item) => item.id === path[1]);
        Object.assign(record!, body);
        data = record;
      }
    } else if (path[0] === "relations") {
      if (method === "GET") data = relations;
      else {
        relations.push(body);
        data = body;
      }
    } else if (path[0] === "roles") {
      data = [];
    } else if (path[0] === "access") {
      assert.deepEqual(JSON.parse(url.searchParams.get("filter")!), {
        _and: [{ role: { _null: true } }, { user: { _null: true } }],
      });
      data = [{ policy: "public-policy" }];
    } else if (path[0] === "items") {
      const records = items.get(path[1]);
      assert.ok(records, `Unknown collection ${path[1]}`);
      if (method === "GET")
        data = path[2]
          ? records.find((item) => String(item.id) === path[2])
          : records;
      else if (method === "POST") {
        for (const key of Object.keys(body))
          assert.ok(
            fields.get(path[1])!.some((field) => field.field === key),
            `Unknown field ${path[1]}.${key}`,
          );
        assert.ok(
          !records.some((item) => item.id === body.id),
          "Duplicate primary key",
        );
        records.push(body);
        data = body;
      } else if (method === "PATCH") {
        const item = records.find((item) => String(item.id) === path[2]);
        assert.ok(item);
        Object.assign(item, body);
        data = item;
      } else assert.fail("Unexpected item method");
    } else assert.fail(`Unexpected API endpoint ${url}`);
    return Response.json({ data: data ?? null });
  };
  return { fields, items, permissions };
}

for (const policies of [false, true]) {
  test(`CMS setup preserves content and removes anonymous access on Directus ${
    policies ? "11" : "10"
  }`, async () => {
    const state = fixture(policies);
    await setupCms();
    assert.equal(
      state.items.get("Delegates")![0].description,
      "Existing blurb",
    );
    assert.equal(state.items.get("Delegates")![0].status, "published");
    const pronouns = state.fields
      .get("Delegates")!
      .find((field) => field.field === "pronouns")!;
    assert.equal(pronouns.type, "string");
    assert.equal((pronouns.schema as Item).is_nullable, true);
    assert.equal((pronouns.meta as Item).interface, "input");
    assert.deepEqual(
      state.permissions.map((rule) => rule.id),
      [2, 3],
    );
    assert.equal(state.items.get("FAQ")!.length, 7);
    assert.equal(
      state.items
        .get("SiteContent")!
        .filter((item) => item.status === "published").length,
      21,
    );
    assert.deepEqual(state.items.get("SiteEditors"), []);
    // A rerun must preserve later changes, hidden records, and deliberate FAQ deletions.
    state.items.get("Delegates")![0].status = "hidden";
    state.items.get("Delegates")![0].pronouns = "she/her";
    const page = state.items
      .get("SiteContent")!
      .find((item) => item.id === "about.2")!;
    page.body = "Edited copy";
    state.items.get("FAQ")!.splice(0, 1);
    const fieldCounts = Array.from(state.fields.values()).map(
      (fields) => fields.length,
    );
    await setupCms();
    assert.equal(state.items.get("Delegates")![0].status, "hidden");
    assert.equal(state.items.get("Delegates")![0].pronouns, "she/her");
    assert.equal(page.body, "Edited copy");
    assert.equal(state.items.get("FAQ")!.length, 6);
    assert.deepEqual(
      Array.from(state.fields.values()).map((fields) => fields.length),
      fieldCounts,
    );
  });
}

test("the read-only check reports existing fields without changing content or permissions", async () => {
  const state = fixture(false);
  await setupCms();
  const original = global.fetch;
  const requests: string[] = [];
  global.fetch = async (input, init) => {
    assert.equal(init?.method, "GET");
    requests.push(new URL(String(input)).pathname);
    return original(input, init);
  };
  const before = JSON.stringify({
    fields: Array.from(state.fields),
    items: Array.from(state.items),
    permissions: state.permissions,
  });
  await setupCms({ checkOnly: true });
  assert.equal(
    JSON.stringify({
      fields: Array.from(state.fields),
      items: Array.from(state.items),
      permissions: state.permissions,
    }),
    before,
  );
  assert.ok(requests.includes("/fields/FAQ"));
});

for (const policies of [false, true]) {
  test(`setup reuses legacy FAQ fields and preserves records on Directus ${
    policies ? "11" : "10"
  }`, async () => {
    const state = fixture(policies);
    state.fields.set("FAQ", [
      { field: "id", type: "integer", schema: { is_primary_key: true } },
      { field: policies ? "Question" : "question", type: "string" },
      { field: "Answer", type: "text" },
      { field: "Category", type: "string" },
      { field: "status", type: "string" },
      { field: "sort", type: "integer" },
    ]);
    const record = {
      id: 1,
      [policies ? "Question" : "question"]: "Existing question",
      Answer: "Existing answer",
      Category: "Existing category",
      status: "hidden",
      sort: 23,
    };
    state.items.set("FAQ", [{ ...record }]);
    await setupCms();
    assert.deepEqual(state.items.get("FAQ")![0], record);
    assert.equal(state.items.get("FAQ")!.length, 7);
    assert.ok(
      state.items.get("FAQ")!.every((item) => typeof item.Answer === "string"),
    );
    assert.ok(
      !state.fields.get("FAQ")!.some((field) => field.field === "answer"),
    );
    const configuration = state.items
      .get("SiteContent")!
      .find((item) => item.id === faqFieldMapId)!;
    assert.deepEqual(JSON.parse(String(configuration.body)), {
      question: policies ? "Question" : "question",
      answer: "Answer",
    });
    assert.equal(configuration.status, "hidden");
    state.items.get("FAQ")!.pop();
    const before = JSON.stringify(Array.from(state.items));
    await setupCms();
    assert.equal(JSON.stringify(Array.from(state.items)), before);
  });
}

test("the read-only check accepts legacy FAQ casing without mutations", async () => {
  const state = fixture(false);
  state.fields.set("FAQ", [
    { field: "id", type: "integer", schema: { is_primary_key: true } },
    { field: "Question", type: "string" },
  ]);
  state.items.set("FAQ", [{ id: 1, Question: "Existing question" }]);
  const original = global.fetch;
  global.fetch = async (input, init) => {
    assert.equal(init?.method, "GET");
    return original(input, init);
  };
  await setupCms({ checkOnly: true });
  assert.equal(state.permissions.length, 3);
  assert.equal(state.items.get("FAQ")![0].Question, "Existing question");
});

test("ambiguous FAQ casing stops setup before permission changes", async () => {
  const state = fixture(false);
  state.fields.set("FAQ", [
    { field: "id", type: "integer", schema: { is_primary_key: true } },
    { field: "answer", type: "text" },
    { field: "Answer", type: "text" },
  ]);
  await assert.rejects(setupCms(), /multiple fields named answer/);
  assert.equal(state.permissions.length, 3);
  assert.equal(state.fields.get("Delegates")!.length, 3);
});

test("legacy FAQ casing does not bypass type checks", async () => {
  const state = fixture(false);
  state.fields.set("FAQ", [
    { field: "id", type: "integer", schema: { is_primary_key: true } },
    { field: "Answer", type: "integer" },
  ]);
  await assert.rejects(setupCms(), /FAQ.Answer has type integer/);
  assert.equal(state.permissions.length, 3);
});

test("unsupported field casing still stops setup before mutations", async () => {
  const state = fixture(false);
  state.fields.get("Delegates")!.push({ field: "Status", type: "string" });
  await assert.rejects(setupCms(), /Delegates.Status conflicts/);
  assert.equal(state.permissions.length, 3);
});

test("setup never adds a new primary key to an existing collection", async () => {
  const state = fixture(false);
  state.fields.set("FAQ", [{ field: "question", type: "string" }]);
  state.items.set("FAQ", []);
  await assert.rejects(setupCms(), /FAQ has no id primary key/);
  assert.equal(state.permissions.length, 3);
  assert.equal(state.fields.get("Delegates")!.length, 3);
});

test("setup repairs Boolean output for existing editor flags without changing records", async () => {
  const state = fixture(false);
  state.fields.set("SiteEditors", [
    { field: "id", type: "integer", schema: { is_primary_key: true } },
    { field: "name", type: "string" },
    {
      field: "active",
      type: "boolean",
      meta: { interface: "boolean", special: [] },
    },
  ]);
  const records = [
    { id: 8184, name: "Existing editor", active: 1 },
    { id: 123, name: "Inactive editor", active: 0 },
  ];
  state.items.set("SiteEditors", structuredClone(records));
  await setupCms();
  assert.deepEqual(state.items.get("SiteEditors"), records);
  assert.deepEqual(
    state.fields.get("SiteEditors")!.find((field) => field.field === "active")!
      .meta,
    { interface: "boolean", special: ["cast-boolean"] },
  );
  await setupCms();
  assert.deepEqual(state.items.get("SiteEditors"), records);
});

test("incompatible existing primary key types produce a clear error before changes", async () => {
  const state = fixture(false);
  state.fields.set("FAQ", [
    { field: "id", type: "uuid", schema: { is_primary_key: true } },
  ]);
  state.items.set("FAQ", []);
  await assert.rejects(
    setupCms(),
    /FAQ.id has type uuid, but the website expects integer/,
  );
  assert.equal(state.permissions.length, 3);
});

test("collection folders cannot be mistaken for tables", async () => {
  const state = fixture(false);
  state.fields.set("FAQ", []);
  const original = global.fetch;
  global.fetch = async (input, init) => {
    assert.equal(init?.method, "GET");
    if (new URL(String(input)).pathname === "/collections")
      return Response.json({
        data: [
          { collection: "Delegates", schema: {} },
          { collection: "FAQ", schema: null },
        ],
      });
    return original(input, init);
  };
  await assert.rejects(setupCms(), /FAQ is a collection folder/);
  assert.equal(state.permissions.length, 3);
});

test("a field failure reports Directus details and can resume without replacing data", async () => {
  const state = fixture(false);
  state.fields.set("FAQ", [
    { field: "id", type: "integer", schema: { is_primary_key: true } },
    { field: "question", type: "string" },
  ]);
  state.items.set("FAQ", [{ id: 20, question: "Existing question" }]);
  const original = global.fetch;
  let fail = true;
  global.fetch = async (input, init) => {
    if (
      new URL(String(input)).pathname === "/fields/FAQ" &&
      init?.method === "POST" &&
      fail
    ) {
      return Response.json(
        {
          errors: [
            {
              message: "SQLITE_ERROR: cannot add column. test-setup-token",
              extensions: { code: "INTERNAL_SERVER_ERROR" },
            },
          ],
        },
        { status: 500 },
      );
    }
    return original(input, init);
  };
  await assert.rejects(setupCms(), (error: Error) => {
    assert.match(error.message, /POST \/fields\/FAQ \(field answer\)/);
    assert.match(
      error.message,
      /\[INTERNAL_SERVER_ERROR\] SQLITE_ERROR: cannot add column/,
    );
    assert.ok(!error.message.includes("test-setup-token"));
    return true;
  });
  fail = false;
  await setupCms();
  assert.equal(state.items.get("FAQ")![0].question, "Existing question");
  assert.equal(state.items.get("Delegates")![0].status, "published");
  assert.equal(
    state.fields.get("FAQ")!.filter((field) => field.field === "answer").length,
    1,
  );
});

test("setup links existing delegates without changing their primary keys, content, or visibility", async () => {
  const state = fixture(false);
  state.fields.get("Delegates")!.push({ field: "status", type: "string" });
  const existing = {
    id: "old",
    name: "Custom name",
    wcaId: "2010TEST01",
    region: "Custom region",
    description: "Custom text",
    email: "custom@example.com",
    status: "archived",
  };
  state.items.set("Delegates", [{ ...existing }]);
  const cmsFetch = global.fetch;
  global.fetch = async (input, init) => {
    if (new URL(String(input)).hostname === "www.worldcubeassociation.org")
      return Response.json({
        user: {
          id: 123,
          name: "WCA name",
          wca_id: "2010TEST01",
          region_id: 28,
          delegate_status: "delegate",
        },
      });
    return cmsFetch(input, init);
  };
  await setupCms();
  const item = state.items.get("Delegates")![0];
  for (const [key, value] of Object.entries(existing))
    assert.equal(item[key], value);
  assert.equal(item.wcaUserId, 123);
  assert.equal(
    (
      state.fields
        .get("Delegates")!
        .find((field) => field.field === "wcaUserId")!.schema as Item
    ).is_unique,
    true,
  );
  const before = JSON.stringify(item);
  await setupCms();
  assert.equal(JSON.stringify(item), before);
});

test("conflicting numeric identities stop setup before schema or permission writes", async () => {
  const state = fixture(false);
  state.fields.get("Delegates")!.push({ field: "wcaUserId", type: "integer" });
  state.items.set("Delegates", [
    { id: "one", wcaUserId: 123 },
    { id: "two", wcaUserId: 123 },
  ]);
  const cmsFetch = global.fetch;
  global.fetch = async (input, init) => {
    assert.equal(init?.method, "GET");
    return cmsFetch(input, init);
  };
  await assert.rejects(setupCms(), /duplicate WCA user ID/);
  assert.equal(state.permissions.length, 3);
});

test("setup seeds header links once and preserves edits and intentional deletions", async () => {
  const state = fixture(false);
  await setupCms();
  const links = state.items.get("SiteNavigation")!;
  assert.equal(links.length, 9);
  links.find((item) => item.label === "Merch")!.href =
    "https://shop.example.com";
  links.splice(
    links.findIndex((item) => item.label === "Public Documents"),
    1,
  );
  const before = JSON.stringify(links);
  await setupCms();
  assert.equal(JSON.stringify(links), before);
  const parentPage = state.items
    .get("SiteContent")!
    .find((item) => item.id === "parents.3")!;
  assert.equal(parentPage.page, "parents");
  assert.equal(parentPage.label, "Parent FAQ");
  assert.equal(
    state.fields.get("SiteContent")!.find((field) => field.field === "body")!
      .meta &&
      (
        state.fields
          .get("SiteContent")!
          .find((field) => field.field === "body")!.meta as Item
      ).interface,
    "input-rich-text-html",
  );
});

test("native Directus pages expose ordered visual blocks and rich FAQ repeaters without rewriting source HTML", async () => {
  const state = fixture(false);
  await setupCms();
  const source = state.items
    .get("SiteContent")!
    .find((item) => item.id === "parents.3")!;
  const body = source.body;
  assert.equal(source.blockType, "faq");
  assert.equal((source.faqItems as Item[]).length, 8);
  assert.ok(state.items.get("Pages")!.some((item) => item.id === "parents"));
  const schema = state.fields.get("SiteContent")!;
  assert.equal(
    (schema.find((field) => field.field === "body")!.meta as Item).interface,
    "input-rich-text-html",
  );
  assert.equal(
    (schema.find((field) => field.field === "faqItems")!.meta as Item)
      .interface,
    "list",
  );
  (source.faqItems as Item[])[0].answer = "<p>Edited rich answer</p>";
  source.sort = 4;
  await setupCms();
  assert.equal(source.body, body);
  assert.equal(
    (source.faqItems as Item[])[0].answer,
    "<p>Edited rich answer</p>",
  );
  assert.equal(source.sort, 4);
});

test("setup preserves blocks removed through the native page relationship", async () => {
  const state = fixture(false);
  await setupCms();
  const removed = state.items
    .get("SiteContent")!
    .find((item) => item.id === "about.2")!;
  removed.page = null;
  await setupCms();
  assert.equal(removed.page, null);
  assert.ok(removed.body);
});

test("setup converts home cards and page headings once without replacing legacy HTML", async () => {
  const state = fixture(false);
  await setupCms();
  const records = state.items.get("SiteContent")!;
  const home = records.find((item) => item.id === "home.cards")!;
  const parents = records.find((item) => item.id === "parents.1")!;
  const contact = records.find((item) => item.id === "contact.1")!;
  const legacyHome = home.body;
  const legacyContact = contact.body;
  assert.equal(home.blockType, "cards");
  assert.equal((home.cardItems as Item[]).length, 3);
  assert.equal(parents.blockType, "pageTitle");
  assert.equal(parents.title, "For Parents");
  assert.ok(String(parents.subtitle).includes("written by parents"));
  assert.ok(
    records.some(
      (item) =>
        item.id === "contact.block.00000000-0000-4000-8000-000000000001" &&
        String(item.body).includes("Have a quick question?"),
    ),
  );
  (home.cardItems as Item[])[0].title = "My edited card";
  parents.title = "For families";
  parents.subtitle = "A changed subtitle";
  const count = records.length;
  await setupCms();
  assert.equal(home.body, legacyHome);
  assert.equal(contact.body, legacyContact);
  assert.equal((home.cardItems as Item[])[0].title, "My edited card");
  assert.equal(parents.title, "For families");
  assert.equal(parents.subtitle, "A changed subtitle");
  assert.equal(records.length, count);
  const fields = state.fields.get("SiteContent")!;
  assert.equal(
    (fields.find((field) => field.field === "cardItems")!.meta as Item)
      .interface,
    "list",
  );
  assert.equal(
    (fields.find((field) => field.field === "subtitle")!.meta as Item)
      .interface,
    "input",
  );
});
