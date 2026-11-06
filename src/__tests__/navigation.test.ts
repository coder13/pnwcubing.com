import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import defaults from "../content/default-navigation.json";
import {
  publicNavigation,
  safeNavigationUrl,
  getNavigation,
} from "../lib/editor/navigation";
import {
  loginHistory,
  loginHistoryKey,
  safeAvatar,
} from "../lib/editor/account";
import { mutateContent } from "../lib/editor/mutations";
import { getContent } from "../lib/editor/content";
import type { NavigationItem } from "../lib/editor/types";
process.env.DIRECTUS_TOKEN = "test-service-token";
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});
const items = defaults as NavigationItem[];

test("additional header destinations come from records while website routes stay fixed", async () => {
  const changed = items.map((item) => ({
    ...item,
    href: item.label === "Merch" ? "https://shop.example.com/new" : item.href,
  }));
  global.fetch = async (input) => {
    assert.equal(new URL(String(input)).pathname, "/items/SiteNavigation");
    return Response.json({ data: changed });
  };
  const navigation = await getNavigation();
  assert.equal(
    navigation.find((item) => item.label === "Merch")?.href,
    "https://shop.example.com/new",
  );
  assert.ok(navigation.some((item) => item.label === "Public Documents"));
  assert.ok(!navigation.some((item) => item.kind === "brand"));
});

test("CMS edits cannot change built-in routes, labels, visibility, or header structure", () => {
  const records = items.map((item) => ({
    ...item,
    label: "Changed label",
    href: "javascript:alert(1)",
    status: "hidden" as const,
  }));
  const navigation = publicNavigation(records);
  assert.equal(navigation.find((item) => item.id === 2)?.href, "/competitions");
  assert.equal(navigation.find((item) => item.id === 7)?.href, "/about");
  assert.equal(navigation.find((item) => item.id === 2)?.label, "Competitions");
  assert.ok(navigation.every((item) => item.status === "published"));
  for (const href of [
    "//evil.test",
    "/\\evil.test",
    "javascript:alert(1)",
    "https://user:secret@example.com",
  ])
    assert.equal(safeNavigationUrl(href), false);
});

test("empty settings and a CMS outage both preserve the fixed header", async () => {
  global.fetch = async () => Response.json({ data: [] });
  assert.equal((await getNavigation()).length, defaults.length - 1);
  global.fetch = async () => new Response(null, { status: 503 });
  assert.equal((await getNavigation()).length, defaults.length - 1);
});

test("navigation saves require full editor access and safe fields", async () => {
  const id = 5;
  const link = { href: "https://shop.example.com" };
  const user = {
    id: 123,
    name: "Delegate",
    wca_id: null,
    delegate_status: "delegate",
  };
  global.fetch = async (_input, init) => {
    assert.equal(init?.method, "PATCH");
    assert.deepEqual(JSON.parse(String(init.body)), link);
    return Response.json({ data: { ...link, id } });
  };
  const request = () =>
    new Request("https://www.pnwcubing.com/api/editor/SiteNavigation/5", {
      method: "PATCH",
      body: JSON.stringify(link),
    });
  await assert.rejects(
    mutateContent(request(), "SiteNavigation", [String(id)], {
      user,
      isEditor: false,
    }),
    /cannot change/,
  );
  await mutateContent(request(), "SiteNavigation", [String(id)], {
    user,
    isEditor: true,
  });
  for (const forbiddenId of ["1", "2", "3", "4", "6", "7", "9"]) {
    await assert.rejects(
      mutateContent(request(), "SiteNavigation", [forbiddenId], {
        user,
        isEditor: true,
      }),
      /Only the Merch/,
    );
  }
  await assert.rejects(
    mutateContent(
      new Request("https://example.com", {
        method: "PATCH",
        body: JSON.stringify({ href: "javascript:alert(1)" }),
      }),
      "SiteNavigation",
      ["5"],
      { user, isEditor: true },
    ),
    /valid HTTP/,
  );
});

test("page content changed in Directus appears through the same public content reader", async () => {
  for (const id of [
    "parents.1",
    "parents.2",
    "parents.3",
    "about.1",
    "about.2",
    "about.3",
    "contact.1",
  ]) {
    global.fetch = async () =>
      Response.json({
        data: [{ id, body: `<p>Edited ${id}</p>`, status: "published" }],
      });
    assert.equal((await getContent(id))?.body, `<p>Edited ${id}</p>`);
  }
});

test("login history starts empty and stores only a flag after a confirmed login", () => {
  const entries = new Map<string, string>();
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
  assert.equal(loginHistory(storage, false), false);
  assert.equal(entries.size, 0);
  assert.equal(loginHistory(storage, true), true);
  assert.deepEqual(Array.from(entries), [[loginHistoryKey, "true"]]);
  assert.equal(loginHistory(storage, false), true);
  assert.equal(
    loginHistory(
      {
        getItem: () => {
          throw Error("Disabled");
        },
        setItem: () => {
          throw Error("Disabled");
        },
      },
      true,
    ),
    false,
  );
});

test("avatar URLs accept only the WCA avatar host", () => {
  assert.equal(
    safeAvatar("https://avatars.worldcubeassociation.org/uploads/image.png"),
    "https://avatars.worldcubeassociation.org/uploads/image.png",
  );
  for (const url of [
    "https://evil.test/photo.png",
    "javascript:alert(1)",
    "http://avatars.worldcubeassociation.org/photo.png",
    null,
  ])
    assert.equal(safeAvatar(url), null);
});

test("the normal header has centered website links and no logo", async () => {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { Header } = await import("../components/Layout/Header/Header");
  const html = renderToStaticMarkup(
    React.createElement(Header, { navigation: publicNavigation([]) }),
  );
  assert.ok(html.includes("justify-center"));
  assert.ok(!html.includes("/full.svg"));
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes('href="/competitions"'));
  assert.ok(html.includes('href="/about"'));
});

test("navigation cannot create or delete links or update anything besides the two approved URLs", async () => {
  const user = {
    id: 8184,
    name: "Editor",
    wca_id: null,
    delegate_status: null,
  };
  global.fetch = async () =>
    assert.fail("Rejected edits must not reach Directus");
  for (const method of ["POST", "DELETE"]) {
    await assert.rejects(
      mutateContent(
        new Request("https://example.com", {
          method,
          ...(method === "POST"
            ? { body: JSON.stringify({ href: "https://example.com" }) }
            : {}),
        }),
        "SiteNavigation",
        method === "POST" ? undefined : ["5"],
        { user, isEditor: true },
      ),
      /Only the Merch/,
    );
  }
  for (const body of [
    { href: "/competitions" },
    { href: "https://example.com", label: "Change" },
  ]) {
    await assert.rejects(
      mutateContent(
        new Request("https://example.com", {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
        "SiteNavigation",
        ["8"],
        { user, isEditor: true },
      ),
      /Only the destination/,
    );
  }
});
