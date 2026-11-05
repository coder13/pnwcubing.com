import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { seal, unseal } from "../lib/editor/crypto";
import { canEditBlurb, isDelegate } from "../lib/editor/permissions";
import { validateBlurb, validateContent } from "../lib/editor/validation";
import { safeHtml } from "../lib/editor/html";
import { mutateContent } from "../lib/editor/mutations";
import {
  isContentEditor,
  requireSameOrigin,
  fetchWcaUser,
} from "../lib/editor/auth";
import type { Delegate } from "../lib/directus";
import type { WcaUser } from "../lib/editor/types";

process.env.SESSION_SECRET = "a-test-secret-with-more-than-32-characters";
process.env.SITE_URL = "https://www.pnwcubing.com";
process.env.DIRECTUS_TOKEN = "test-service-token";
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
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
  email: "test@example.com",
  region: "Washington",
  description: "Old blurb",
  status: "published",
  sort: 0,
} as Delegate;
const identity = { user, isEditor: false };
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

test("only verified delegates with a matching WCA ID own a blurb", () => {
  assert.equal(canEditBlurb(user, delegate), true);
  assert.equal(
    canEditBlurb({ ...user, delegate_status: null }, delegate),
    false,
  );
  assert.equal(
    canEditBlurb({ ...user, wca_id: "2011TEST01" }, delegate),
    false,
  );
  assert.equal(canEditBlurb({ ...user, wca_id: null }, delegate), false);
  assert.equal(
    isDelegate({ ...user, delegate_status: "former_delegate" }),
    false,
  );
  assert.equal(
    isDelegate({ ...user, delegate_status: "trainee_delegate" }),
    true,
  );
});

test("delegate input cannot change status, identity, region, or other fields", () => {
  for (const field of ["status", "region", "name", "wcaId", "id", "active"]) {
    assert.throws(() =>
      validateBlurb({ description: "New blurb", [field]: "changed" }),
    );
  }
  assert.throws(() => validateBlurb({ description: "x".repeat(10001) }));
  assert.deepEqual(validateBlurb({ description: "" }), { description: "" });
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

test("a delegate save reads the CMS owner and writes only their blurb", async () => {
  const writes: { url: string; method?: string; body?: BodyInit | null }[] = [];
  global.fetch = async (url, init) => {
    writes.push({ url: String(url), method: init?.method, body: init?.body });
    assert.equal(
      (init?.headers as Record<string, string>).Authorization,
      "Bearer test-service-token",
    );
    return upstream(
      init?.method === "PATCH"
        ? { ...delegate, description: "New blurb" }
        : delegate,
    );
  };
  await mutateContent(
    request("PATCH", { description: "New blurb" }),
    "Delegates",
    ["1"],
    identity,
  );
  assert.equal(writes.length, 2);
  assert.equal(writes[1].method, "PATCH");
  assert.deepEqual(JSON.parse(String(writes[1].body)), {
    description: "New blurb",
  });
});

test("forged owner IDs, former delegates, and non-owners cannot save", async () => {
  let mutations = 0;
  global.fetch = async (_url, init) => {
    if (init?.method) mutations++;
    return upstream({ ...delegate, wcaId: "2011TEST01" });
  };
  await assert.rejects(
    mutateContent(
      request("PATCH", { description: "New" }),
      "Delegates",
      ["2"],
      identity,
    ),
    /own delegate blurb/,
  );
  global.fetch = async () => upstream(delegate);
  await assert.rejects(
    mutateContent(
      request("PATCH", { description: "New" }),
      "Delegates",
      ["1"],
      { user: { ...user, delegate_status: null }, isEditor: false },
    ),
    /own delegate blurb/,
  );
  assert.equal(mutations, 0);
});

test("delegates cannot create, delete, publish, or edit any other collection", async () => {
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
  global.fetch = async () => upstream(delegate);
  await assert.rejects(
    mutateContent(
      request("PATCH", { description: "New", status: "published" }),
      "Delegates",
      ["1"],
      identity,
    ),
    /only your blurb/,
  );
});

test("full editors can create, move, publish, hide, and delete content", async () => {
  const writes: { method?: string; body: unknown }[] = [];
  global.fetch = async (_url, init) => {
    writes.push({
      method: init?.method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return init?.method === "DELETE"
      ? new Response(null, { status: 204 })
      : upstream({ id: "1" });
  };
  const admin = { user: { ...user, id: 8184 }, isEditor: true };
  const { id: _id, ...record } = delegate;
  await mutateContent(request("POST", record), "Delegates", undefined, admin);
  await mutateContent(
    request("PATCH", { ...record, region: "Oregon", status: "published" }),
    "Delegates",
    ["1"],
    admin,
  );
  await mutateContent(
    request("PATCH", { ...record, status: "hidden" }),
    "Delegates",
    ["1"],
    admin,
  );
  await mutateContent(request("DELETE"), "Delegates", ["1"], admin);
  await mutateContent(
    request("POST", {
      question: "New question",
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
  assert.deepEqual(
    writes.map((write) => write.method),
    ["POST", "PATCH", "PATCH", "DELETE", "POST", "PATCH", "POST"],
  );
});

test("the bootstrap account cannot be revoked through editor access", async () => {
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
  assert.equal(await isContentEditor(8184), true);
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
