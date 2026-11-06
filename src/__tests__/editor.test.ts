import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { seal, unseal } from "../lib/editor/crypto";
import { canEditDelegate, isDelegate } from "../lib/editor/permissions";
import {
  validateDelegateProfile,
  validateContent,
} from "../lib/editor/validation";
import { safeHtml } from "../lib/editor/html";
import { mutateContent } from "../lib/editor/mutations";
import {
  isContentEditor,
  requireSameOrigin,
  fetchWcaUser,
} from "../lib/editor/auth";
import type { Delegate } from "../lib/directus";
import type { WcaUser } from "../lib/editor/types";
import { faqFieldMapId } from "../lib/editor/faqFields";

process.env.SESSION_SECRET = "a-test-secret-with-more-than-32-characters";
process.env.SITE_URL = "https://www.pnwcubing.com";
process.env.DIRECTUS_TOKEN = "test-service-token";
process.env.CONTENT_EDITOR_WCA_IDS = "";
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
  process.env.CONTENT_EDITOR_WCA_IDS = "";
});
const user: WcaUser = {
  id: 123,
  wca_id: "2010TEST01",
  name: "Test Delegate",
  delegate_status: "delegate",
};
const delegate = {
  id: "1",
  name: "Test Delegate",
  wcaId: user.wca_id,
  wcaUserId: user.id,
  email: "test@example.com",
  region: "Washington",
  description: "Old blurb",
  status: "published",
  sort: 0,
} as Delegate;
const identity = { user, isEditor: false };
const profile = {
  name: "Updated Delegate",
  email: "updated@example.com",
  region: "Oregon",
  description: "New blurb",
  status: "hidden",
  sort: 3,
};
function request(method: string, body?: unknown) {
  return new Request("https://www.pnwcubing.com/api/editor/Delegates/1", {
    method,
    headers: {
      origin: "https://www.pnwcubing.com",
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
function upstream(data: unknown) {
  return Response.json({ data });
}

test("sessions are encrypted, expire, reject tampering, and bind their purpose", () => {
  const value = {
    accessToken: "private-wca-token",
    expiresAt: Date.now() + 60000,
  };
  const encoded = seal(value, "session");
  assert.ok(!encoded.includes(value.accessToken));
  assert.deepEqual(unseal(encoded, "session"), value);
  assert.equal(unseal(encoded, "oauth"), null);
  const tampered = Buffer.from(encoded, "base64url");
  tampered[30] ^= 1;
  assert.equal(unseal(tampered.toString("base64url"), "session"), null);
  assert.equal(
    unseal(seal({ expiresAt: Date.now() - 1 }, "session"), "session"),
    null,
  );
});

test("numeric WCA accounts own profiles even without competitor IDs or a current delegate role", () => {
  assert.equal(canEditDelegate(user, delegate), true);
  assert.equal(
    canEditDelegate({ ...user, delegate_status: null, wca_id: null }, delegate),
    true,
  );
  assert.equal(canEditDelegate({ ...user, id: 999 }, delegate), false);
  assert.equal(canEditDelegate(user, { ...delegate, wcaUserId: null }), false);
  assert.equal(
    canEditDelegate(user, { ...delegate, status: "archived" }),
    false,
  );
  assert.equal(
    isDelegate({ ...user, delegate_status: "former_delegate" }),
    false,
  );
});

test("delegates can edit normal profile fields but not identity or system fields", () => {
  assert.deepEqual(validateDelegateProfile(profile), profile);
  for (const field of [
    "wcaId",
    "wcaUserId",
    "wcaActive",
    "wcaRegionId",
    "id",
    "active",
    "date_updated",
  ]) {
    assert.throws(() =>
      validateDelegateProfile({ ...profile, [field]: "changed" }),
    );
  }
  for (const invalid of [
    { email: "invalid-email" },
    { name: "" },
    { description: "x".repeat(10001) },
    { sort: -1 },
    { status: "public" },
  ])
    assert.throws(() => validateDelegateProfile({ ...profile, ...invalid }));
});

test("editor validation rejects unknown fields, invalid statuses, IDs, and orders", () => {
  assert.throws(() =>
    validateContent(
      "SiteEditors",
      { id: "8184", name: "Cailyn", active: true },
      true,
    ),
  );
  assert.throws(() =>
    validateContent(
      "FAQ",
      { question: "Q", answer: "A", status: "public", sort: 0 },
      true,
    ),
  );
  assert.throws(() =>
    validateContent(
      "FAQ",
      { question: "Q", answer: "A", status: "draft", sort: -1 },
      true,
    ),
  );
  assert.throws(() =>
    validateContent(
      "SiteContent",
      { body: "text", status: "published", admin: true },
      false,
    ),
  );
  assert.deepEqual(
    validateContent(
      "SiteEditors",
      { id: 123, name: "Editor", active: true },
      true,
    ),
    { id: 123, name: "Editor", active: true },
  );
});

test("HTML removes scripts, event handlers, unsafe URLs, forms, and foreign frames", () => {
  const html = safeHtml(
    '<p onclick="attack()">Safe</p><script>attack()</script><a href="javascript:alert(1)">link</a><img src=x onerror="attack()"><iframe src="https://evil.test/"></iframe><form action="/api/editor/FAQ"><input></form>',
  );
  assert.ok(html.includes("Safe"));
  for (const text of [
    "onclick",
    "onerror",
    "javascript:",
    "attack()",
    "evil.test",
    "<form",
    "<input",
  ])
    assert.ok(!html.includes(text));
  assert.ok(
    safeHtml(
      '<iframe src="https://www.youtube.com/embed/example"></iframe>',
    ).includes("youtube.com/embed/example"),
  );
});

test("mutations reject cross-origin and missing-origin requests", () => {
  assert.doesNotThrow(() => requireSameOrigin(request("PATCH", {})));
  assert.throws(() =>
    requireSameOrigin(
      new Request("https://www.pnwcubing.com", {
        headers: { origin: "https://evil.test" },
      }),
    ),
  );
  assert.throws(() =>
    requireSameOrigin(new Request("https://www.pnwcubing.com")),
  );
});

test("a delegate save checks ownership and updates all editable profile fields", async () => {
  const writes: { url: string; method?: string; body?: BodyInit | null }[] = [];
  global.fetch = async (url, init) => {
    writes.push({ url: String(url), method: init?.method, body: init?.body });
    assert.equal(
      (init?.headers as Record<string, string>).Authorization,
      "Bearer test-service-token",
    );
    return upstream(
      init?.method === "PATCH" ? { ...delegate, ...profile } : delegate,
    );
  };
  await mutateContent(request("PATCH", profile), "Delegates", ["1"], identity);
  assert.equal(writes.length, 2);
  assert.equal(writes[1].method, "PATCH");
  assert.deepEqual(JSON.parse(String(writes[1].body)), profile);
});

test("forged owner IDs, archived profiles, and non-owners cannot save", async () => {
  let mutations = 0;
  global.fetch = async (_url, init) => {
    if (init?.method) mutations++;
    return upstream({ ...delegate, wcaUserId: 999 });
  };
  await assert.rejects(
    mutateContent(
      request("PATCH", { description: "New" }),
      "Delegates",
      ["2"],
      identity,
    ),
    /own delegate profile/,
  );
  global.fetch = async () => upstream({ ...delegate, status: "archived" });
  await assert.rejects(
    mutateContent(
      request("PATCH", { description: "New" }),
      "Delegates",
      ["1"],
      { user: { ...user, delegate_status: null }, isEditor: false },
    ),
    /own delegate profile/,
  );
  assert.equal(mutations, 0);
});

test("FAQ create and update use the stored field names without schema permissions", async () => {
  const writes: unknown[] = [];
  global.fetch = async (url, init) => {
    const parsed = new URL(String(url));
    if (parsed.pathname === "/items/SiteContent") {
      assert.deepEqual(JSON.parse(parsed.searchParams.get("filter")!), {
        id: { _eq: faqFieldMapId },
      });
      return upstream([
        { body: JSON.stringify({ question: "Question", answer: "Answer" }) },
      ]);
    }
    assert.ok(parsed.pathname.startsWith("/items/FAQ"));
    const body = JSON.parse(String(init?.body));
    writes.push(body);
    return upstream({ id: 20, ...body });
  };
  const admin = { user, isEditor: true };
  const record = {
    question: "Question",
    answer: "Updated answer",
    status: "draft",
    sort: 0,
  };
  for (const method of ["POST", "PATCH"]) {
    const result = await mutateContent(
      request(method, record),
      "FAQ",
      method === "POST" ? undefined : ["20"],
      admin,
    );
    assert.deepEqual(result, { id: 20, ...record });
  }
  assert.deepEqual(
    writes,
    [0, 1].map(() => ({
      Question: record.question,
      Answer: record.answer,
      status: "draft",
      sort: 0,
    })),
  );
});

test("invalid FAQ field configuration prevents writes", async () => {
  global.fetch = async (url, init) => {
    assert.equal(new URL(String(url)).pathname, "/items/SiteContent");
    assert.equal(init?.method, undefined);
    return upstream([
      { body: JSON.stringify({ question: "question", answer: "status" }) },
    ]);
  };
  await assert.rejects(
    mutateContent(
      request("POST", { question: "Q", answer: "A", status: "draft", sort: 0 }),
      "FAQ",
      undefined,
      { user, isEditor: true },
    ),
    /FAQ field configuration is invalid/,
  );
});

test("the editor cannot change setup records", async () => {
  global.fetch = async () => {
    throw new Error("Unexpected upstream request");
  };
  await assert.rejects(
    mutateContent(
      request("PATCH", { body: "{}", status: "published" }),
      "SiteContent",
      [faqFieldMapId],
      { user, isEditor: true },
    ),
    /existing page section/,
  );
});

test("delegates cannot create, delete, or edit any other collection", async () => {
  global.fetch = async () => {
    throw new Error("Unexpected upstream request");
  };
  for (const collection of ["FAQ", "SiteContent", "SiteEditors"]) {
    await assert.rejects(
      mutateContent(request("PATCH", {}), collection, ["1"], identity),
      /cannot change/,
    );
  }
  for (const method of ["DELETE", "POST"]) {
    await assert.rejects(
      mutateContent(
        request(method, {}),
        "Delegates",
        method === "POST" ? undefined : ["1"],
        identity,
      ),
      /cannot change/,
    );
  }
});

test("delegate saves reject WCA ID changes before writing to Directus", async () => {
  global.fetch = async (_url, init) => {
    assert.equal(init?.method, undefined);
    return upstream(delegate);
  };
  for (const wcaId of [delegate.wcaId, "2011TEST01"]) {
    await assert.rejects(
      mutateContent(
        request("PATCH", { ...profile, wcaId }),
        "Delegates",
        ["1"],
        identity,
      ),
      /cannot change your WCA ID/,
    );
  }
});

test("full editors can publish and hide content and manage editor access", async () => {
  const writes: string[] = [];
  global.fetch = async (url, init) => {
    if (!init?.method) return upstream([]);
    writes.push(init.method);
    return upstream({ id: "1" });
  };
  const admin = { user, isEditor: true };
  await mutateContent(
    request("POST", {
      question: "New",
      answer: "Answer",
      status: "draft",
      sort: 2,
    }),
    "FAQ",
    undefined,
    admin,
  );
  await mutateContent(
    request("PATCH", { body: "<p>Updated</p>", status: "published" }),
    "SiteContent",
    ["about.2"],
    admin,
  );
  await mutateContent(
    request("POST", { id: 123, name: "New editor", active: true }),
    "SiteEditors",
    undefined,
    admin,
  );
  assert.deepEqual(writes, ["POST", "PATCH", "POST"]);
});

test("an environment editor cannot be revoked through editor access", async () => {
  process.env.CONTENT_EDITOR_WCA_IDS = "8184";
  global.fetch = async () => {
    throw new Error("Unexpected upstream request");
  };
  await assert.rejects(
    mutateContent(request("DELETE"), "SiteEditors", ["8184"], {
      user,
      isEditor: true,
    }),
    /site configuration/,
  );
});

test("editor access uses the numeric ID, handles absent entries, and honors revocation", async () => {
  global.fetch = async (url) => {
    assert.equal(
      JSON.parse(new URL(String(url)).searchParams.get("filter")!).id._eq,
      123,
    );
    return upstream([]);
  };
  assert.equal(await isContentEditor(123), false);
  global.fetch = async () => upstream([{ id: 123, active: true }]);
  assert.equal(await isContentEditor(123), true);
  global.fetch = async () => upstream([{ id: 123, active: false }]);
  assert.equal(await isContentEditor(123), false);
  global.fetch = async () => new Response(null, { status: 503 });
  await assert.rejects(isContentEditor(123));
});

test("user 8184 has full access only when explicitly configured", async () => {
  global.fetch = async () => upstream([]);
  assert.equal(await isContentEditor(8184), false);
  global.fetch = async () => upstream([{ id: 8184, active: true }]);
  assert.equal(await isContentEditor(8184), true);
  global.fetch = async () => upstream([{ id: 8184, active: false }]);
  assert.equal(await isContentEditor(8184), false);
  process.env.CONTENT_EDITOR_WCA_IDS = "8184";
  global.fetch = async () => {
    throw new Error("Unexpected upstream request");
  };
  assert.equal(await isContentEditor(8184), true);
});

test("WCA identity comes only from the authenticated me endpoint", async () => {
  global.fetch = async (url, init) => {
    assert.equal(url, "https://www.worldcubeassociation.org/api/v0/me");
    assert.equal(
      (init?.headers as Record<string, string>).Authorization,
      "Bearer verified-token",
    );
    assert.equal(init?.cache, "no-store");
    return Response.json({ me: user });
  };
  assert.deepEqual(await fetchWcaUser("verified-token"), user);
  global.fetch = async () =>
    Response.json({ me: { id: "8184", name: "Fake" } });
  await assert.rejects(fetchWcaUser("token"), /invalid user/);
  global.fetch = async () => new Response(null, { status: 401 });
  await assert.rejects(fetchWcaUser("expired"), /session expired/);
});
