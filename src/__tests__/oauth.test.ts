import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { afterEach, test } from "node:test";
import { siteOrigin } from "../lib/editor/config";
import { unseal } from "../lib/editor/crypto";
import type { OAuthState, Session } from "../lib/editor/auth";

Object.assign(globalThis, { AsyncLocalStorage });
const { requireSameOrigin } =
  require("../lib/editor/auth") as typeof import("../lib/editor/auth");
// Supply the same request context that Next uses for HttpOnly cookies.
const {
  requestAsyncStorage,
} = require("next/dist/client/components/request-async-storage.external");
const {
  RequestCookies,
} = require("next/dist/server/web/spec-extension/cookies");
const { GET: login } =
  require("../app/api/auth/login/route") as typeof import("../app/api/auth/login/route");
const { GET: callback } =
  require("../app/api/auth/callback/route") as typeof import("../app/api/auth/callback/route");
const { POST: logout } =
  require("../app/api/auth/logout/route") as typeof import("../app/api/auth/logout/route");
const { PATCH: save } =
  require("../app/api/editor/[collection]/[[...id]]/route") as typeof import("../app/api/editor/[collection]/[[...id]]/route");
process.env.SITE_URL = "https://www.pnwcubing.com";
process.env.WCA_CLIENT_ID = "test-client";
process.env.WCA_CLIENT_SECRET = "test-secret";
process.env.SESSION_SECRET = "a-test-secret-with-more-than-32-characters";
process.env.DIRECTUS_TOKEN = "test-service-token";
process.env.CONTENT_EDITOR_WCA_IDS = "";
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
  process.env.CONTENT_EDITOR_WCA_IDS = "";
  process.env.SITE_URL = "https://www.pnwcubing.com";
});
function context<T>(cookie: string, fn: () => T): T {
  return requestAsyncStorage.run(
    { cookies: new RequestCookies(new Headers({ cookie })) },
    fn,
  );
}

async function startLogin() {
  const response = await login(
    new Request("https://www.pnwcubing.com/api/auth/login"),
  );
  assert.equal(response.status, 307);
  const location = new URL(response.headers.get("location")!);
  const cookie = response.cookies.get("pnw_oauth")!.value;
  const state = unseal<OAuthState>(cookie, "oauth")!;
  assert.equal(location.origin, "https://www.worldcubeassociation.org");
  assert.equal(location.searchParams.get("scope"), "public");
  assert.equal(location.searchParams.get("state"), state.state);
  assert.equal(
    location.searchParams.get("redirect_uri"),
    "https://www.pnwcubing.com/api/auth/callback",
  );
  assert.equal(location.searchParams.get("code_challenge_method"), "S256");
  assert.equal(
    location.searchParams.get("code_challenge"),
    createHash("sha256").update(state.verifier).digest("base64url"),
  );
  return { cookie, state };
}

test("WCA code flow verifies state and PKCE and stores a private session", async () => {
  process.env.CONTENT_EDITOR_WCA_IDS = "8184";
  const { cookie, state } = await startLogin();
  global.fetch = async (url, init) => {
    if (String(url).endsWith("/oauth/token")) {
      const params = init?.body as URLSearchParams;
      assert.equal(params.get("code_verifier"), state.verifier);
      assert.equal(params.get("client_secret"), "test-secret");
      return Response.json({
        access_token: "private-access-token",
        expires_in: 7200,
      });
    }
    assert.equal(url, "https://www.worldcubeassociation.org/api/v0/me");
    return Response.json({
      me: {
        id: 8184,
        wca_id: "2010TEST01",
        name: "Cailyn Sinclair",
        delegate_status: null,
      },
    });
  };
  const response = await context(`pnw_oauth=${cookie}`, () =>
    callback(
      new Request(
        `https://www.pnwcubing.com/api/auth/callback?code=verified-code&state=${state.state}`,
      ),
    ),
  );
  assert.equal(
    response.headers.get("location"),
    "https://www.pnwcubing.com/admin",
  );
  const session = response.cookies.get("pnw_session")!;
  assert.equal(session.httpOnly, true);
  assert.equal(session.secure, true);
  assert.equal(session.sameSite, "lax");
  assert.equal(session.maxAge, undefined);
  assert.equal(response.cookies.get("pnw_oauth")!.maxAge, 0);
  assert.equal(
    unseal<Session>(session.value, "session")?.accessToken,
    "private-access-token",
  );
});

test("a forged or absent OAuth state cannot create a session", async () => {
  const { cookie } = await startLogin();
  global.fetch = async () => {
    assert.fail("A forged callback must not contact WCA");
  };
  const response = await context(`pnw_oauth=${cookie}`, () =>
    callback(
      new Request(
        "https://www.pnwcubing.com/api/auth/callback?code=forged&state=wrong",
      ),
    ),
  );
  assert.equal(
    response.headers.get("location"),
    "https://www.pnwcubing.com/login?error=login",
  );
  assert.equal(response.cookies.get("pnw_session"), undefined);
});

test("an unrelated WCA account receives no editor session", async () => {
  const { cookie, state } = await startLogin();
  global.fetch = async (url) => {
    if (String(url).endsWith("/oauth/token"))
      return Response.json({ access_token: "token", expires_in: 7200 });
    if (String(url).endsWith("/me"))
      return Response.json({
        me: {
          id: 12345,
          name: "Other user",
          wca_id: null,
          delegate_status: null,
        },
      });
    return Response.json({ data: [] });
  };
  const response = await context(`pnw_oauth=${cookie}`, () =>
    callback(
      new Request(
        `https://www.pnwcubing.com/api/auth/callback?code=verified&state=${state.state}`,
      ),
    ),
  );
  assert.equal(
    response.headers.get("location"),
    "https://www.pnwcubing.com/login?error=access",
  );
  assert.equal(response.cookies.get("pnw_session")!.maxAge, 0);
});

test("unauthenticated writes fail before Directus and foreign-origin writes fail before authentication", async () => {
  global.fetch = async () => {
    assert.fail("An unauthorized request must not contact upstream services");
  };
  const response = await context("", () =>
    save(
      new Request("https://www.pnwcubing.com/api/editor/Delegates/1", {
        method: "PATCH",
        headers: { origin: "https://www.pnwcubing.com" },
        body: "{}",
      }),
      { params: { collection: "Delegates", id: ["1"] } },
    ),
  );
  assert.equal(response.status, 401);
  const foreign = await save(
    new Request("https://www.pnwcubing.com/api/editor/Delegates/1", {
      method: "PATCH",
      headers: { origin: "https://evil.test" },
      body: "{}",
    }),
    { params: { collection: "Delegates", id: ["1"] } },
  );
  assert.equal(foreign.status, 403);
});

test("logout requires the site origin and clears the session", async () => {
  const response = await logout(
    new Request("https://www.pnwcubing.com/api/auth/logout", {
      method: "POST",
      headers: { origin: "https://www.pnwcubing.com" },
    }),
  );
  assert.equal(response.status, 303);
  assert.equal(response.cookies.get("pnw_session")!.maxAge, 0);
  assert.equal(
    (
      await logout(
        new Request("https://www.pnwcubing.com/api/auth/logout", {
          method: "POST",
          headers: { origin: "https://evil.test" },
        }),
      )
    ).status,
    403,
  );
});

test("an additional account with no competitor ID can sign in through its numeric profile link", async () => {
  const { cookie, state } = await startLogin();
  global.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/oauth/token")
      return Response.json({ access_token: "token", expires_in: 7200 });
    if (url.pathname === "/api/v0/me")
      return Response.json({
        me: {
          id: 123,
          name: "Additional",
          wca_id: null,
          delegate_status: null,
        },
      });
    if (url.pathname === "/items/SiteEditors")
      return Response.json({ data: [] });
    assert.equal(url.pathname, "/items/Delegates");
    assert.deepEqual(JSON.parse(url.searchParams.get("filter")!), {
      wcaUserId: { _eq: 123 },
      status: { _neq: "archived" },
    });
    return Response.json({ data: [{ id: "own" }] });
  };
  const response = await context(`pnw_oauth=${cookie}`, () =>
    callback(
      new Request(
        `https://www.pnwcubing.com/api/auth/callback?code=verified&state=${state.state}`,
      ),
    ),
  );
  assert.equal(
    response.headers.get("location"),
    "https://www.pnwcubing.com/admin",
  );
  assert.ok(response.cookies.get("pnw_session")?.value);
});

test("sync and account lookup reject anonymous and non-editor accounts", async () => {
  const { POST: sync } =
    require("../app/api/editor/delegates/sync/route") as typeof import("../app/api/editor/delegates/sync/route");
  const { GET: lookup } =
    require("../app/api/editor/delegates/lookup/route") as typeof import("../app/api/editor/delegates/lookup/route");
  const { seal } = await import("../lib/editor/crypto");
  const syncRequest = (origin = process.env.SITE_URL!) =>
    new Request(`${process.env.SITE_URL}/api/editor/delegates/sync`, {
      method: "POST",
      headers: { origin },
    });
  const lookupRequest = new Request(
    `${process.env.SITE_URL}/api/editor/delegates/lookup?userId=8184`,
  );
  global.fetch = async () => assert.fail("Unauthorized upstream request");
  assert.equal((await sync(syncRequest("https://evil.test"))).status, 403);
  assert.equal((await context("", () => sync(syncRequest()))).status, 401);
  assert.equal((await context("", () => lookup(lookupRequest))).status, 401);
  global.fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    if (path === "/api/v0/me")
      return Response.json({
        me: {
          id: 123,
          name: "Delegate",
          wca_id: null,
          delegate_status: "delegate",
        },
      });
    assert.equal(path, "/items/SiteEditors");
    return Response.json({ data: [] });
  };
  const cookie = `pnw_session=${seal(
    { accessToken: "token", expiresAt: Date.now() + 60000 },
    "session",
  )}`;
  assert.equal((await context(cookie, () => sync(syncRequest()))).status, 403);
  assert.equal(
    (await context(cookie, () => lookup(lookupRequest))).status,
    403,
  );
});

test("the header session endpoint returns only verified display details and never caches them", async () => {
  const { GET: session } =
    require("../app/api/auth/session/route") as typeof import("../app/api/auth/session/route");
  global.fetch = async () =>
    assert.fail("An anonymous visitor needs no upstream requests");
  const anonymous = await context("", session);
  assert.deepEqual(await anonymous.json(), { user: null });
  assert.ok(anonymous.headers.get("cache-control")?.includes("no-store"));
  assert.equal(anonymous.headers.get("vary"), "Cookie");
  const { seal } = await import("../lib/editor/crypto");
  const cookie = `pnw_session=${seal(
    { accessToken: "secret-token", expiresAt: Date.now() + 60000 },
    "session",
  )}`;
  process.env.CONTENT_EDITOR_WCA_IDS = "8184";
  global.fetch = async () =>
    Response.json({
      me: {
        id: 8184,
        name: "Cailyn",
        wca_id: "2016HOOV01",
        delegate_status: "delegate",
        email: "private@example.com",
        avatar: {
          thumb_url: "https://avatars.worldcubeassociation.org/photo.png",
        },
      },
    });
  const verified = await context(cookie, session);
  assert.deepEqual(await verified.json(), {
    user: {
      name: "Cailyn",
      avatar: "https://avatars.worldcubeassociation.org/photo.png",
    },
  });
  global.fetch = async () => new Response(null, { status: 401 });
  assert.deepEqual(await (await context(cookie, session)).json(), {
    user: null,
  });
  global.fetch = async () => new Response(null, { status: 503 });
  assert.equal((await context(cookie, session)).status, 503);
});

test("production login normalizes the apex configuration and accepts saves only from the canonical host", async () => {
  process.env.SITE_URL = "https://pnwcubing.com";
  assert.equal(siteOrigin(), "https://www.pnwcubing.com");
  await startLogin();
  const saveRequest = (origin: string) =>
    new Request("https://www.pnwcubing.com/api/editor/Delegates/24", {
      method: "PATCH",
      headers: { Origin: origin },
    });
  assert.doesNotThrow(() =>
    requireSameOrigin(saveRequest("https://www.pnwcubing.com")),
  );
  assert.throws(
    () => requireSameOrigin(saveRequest("https://pnwcubing.com")),
    /did not come from/,
  );
  assert.throws(
    () => requireSameOrigin(saveRequest("https://evil.example")),
    /did not come from/,
  );
});

test("login reaches the configured host before setting the OAuth state cookie", async () => {
  const response = await login(
    new Request("https://pnwcubing.com/api/auth/login"),
  );
  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "https://www.pnwcubing.com/api/auth/login",
  );
  assert.equal(response.cookies.get("pnw_oauth"), undefined);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("localhost and explicit preview origins stay unchanged", () => {
  for (const origin of [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://preview.example.com",
  ]) {
    process.env.SITE_URL = origin;
    assert.equal(siteOrigin(), origin);
  }
});

test("the apex website redirects all paths to the canonical public host", async () => {
  const config = require("../../next.config.js");
  const redirects = await config.redirects();
  assert.deepEqual(redirects[0], {
    source: "/:path*",
    has: [{ type: "host", value: "pnwcubing.com" }],
    destination: "https://www.pnwcubing.com/:path*",
    permanent: true,
  });
});
