import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { setupCms } from "../../scripts/setup-cms";

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
      else {
        fields.set(body.collection, body.fields);
        items.set(body.collection, []);
      }
    } else if (path[0] === "fields") {
      if (method === "GET") data = fields.get(path[1]);
      else {
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
    } else if (path[0] === "access") {
      assert.deepEqual(JSON.parse(url.searchParams.get("filter")!), {
        _and: [{ role: { _null: true } }, { user: { _null: true } }],
      });
      data = [{ policy: "public-policy" }];
    } else if (path[0] === "items") {
      const records = items.get(path[1]);
      assert.ok(records, `Unknown collection ${path[1]}`);
      if (method === "GET") data = records;
      else if (method === "POST") {
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
    assert.deepEqual(
      state.permissions.map((rule) => rule.id),
      [2, 3],
    );
    assert.equal(state.items.get("FAQ")!.length, 7);
    assert.equal(
      state.items
        .get("SiteContent")!
        .filter((item) => item.status === "published").length,
      20,
    );
    assert.deepEqual(state.items.get("SiteEditors"), [
      { id: 8184, name: "Cailyn Sinclair", active: true },
    ]);
    // A rerun must preserve later changes, hidden records, and deliberate FAQ deletions.
    state.items.get("Delegates")![0].status = "hidden";
    state.items.get("SiteContent")![0].body = "Edited copy";
    state.items.get("FAQ")!.splice(0, 1);
    const fieldCounts = Array.from(state.fields.values()).map(
      (fields) => fields.length,
    );
    await setupCms();
    assert.equal(state.items.get("Delegates")![0].status, "hidden");
    assert.equal(state.items.get("SiteContent")![0].body, "Edited copy");
    assert.equal(state.items.get("FAQ")!.length, 6);
    assert.deepEqual(
      Array.from(state.fields.values()).map((fields) => fields.length),
      fieldCounts,
    );
  });
}
