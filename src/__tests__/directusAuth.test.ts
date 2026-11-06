import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { afterEach, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { seal, unseal } from "../lib/editor/crypto";
import type { DirectusSession } from "../lib/editor/directusAuth";
import { canEditDelegate } from "../lib/editor/permissions";
import type { Delegate } from "../lib/directus";

Object.assign(globalThis, { AsyncLocalStorage });
const {
  requestAsyncStorage,
} = require("next/dist/client/components/request-async-storage.external");
const {
  RequestCookies,
} = require("next/dist/server/web/spec-extension/cookies");
const { POST: login } =
  require("../app/api/auth/directus/route") as typeof import("../app/api/auth/directus/route");
const { POST: logout } =
  require("../app/api/auth/logout/route") as typeof import("../app/api/auth/logout/route");
const { GET: sessionInfo } =
  require("../app/api/auth/session/route") as typeof import("../app/api/auth/session/route");
const { PATCH: save } =
  require("../app/api/editor/[collection]/[[...id]]/route") as typeof import("../app/api/editor/[collection]/[[...id]]/route");
const { currentUser } =
  require("../lib/editor/auth") as typeof import("../lib/editor/auth");
const { default: Login } =
  require("../app/login/page") as typeof import("../app/login/page");
const { default: DirectusLogin } =
  require("../app/login/directus/page") as typeof import("../app/login/directus/page");

process.env.SITE_URL = "https://www.pnwcubing.com";
process.env.DIRECTUS_URL = "https://admin.pnwcubing.com";
process.env.SESSION_SECRET = "a-test-secret-with-more-than-32-characters";
process.env.DIRECTUS_TOKEN = "website-service-token";
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});
const profile = {
  id: "9ba292d1-3780-4a91-aa5a-0d4b7040607d",
  first_name: "Content",
  last_name: "Editor",
  status: "active",
  role: { id: "content-role", name: "Content-Editor", admin_access: false },
};
const tokens = {
  access_token: "private-directus-access-token",
  refresh_token: "private-directus-refresh-token",
  expires: 900000,
};
function context<T>(cookie: string, fn: () => T): T {
  return requestAsyncStorage.run(
    { cookies: new RequestCookies(new Headers({ cookie })) },
    fn,
  );
}
function signIn(
  overrides: Record<string, string> = {},
  origin = process.env.SITE_URL!,
  json = false,
) {
  return login(
    new Request(`${process.env.SITE_URL}/api/auth/directus`, {
      method: "POST",
      headers: {
        origin,
        "Content-Type": "application/x-www-form-urlencoded",
        ...(json ? { Accept: "application/json" } : {}),
      },
      body: new URLSearchParams({
        email: "editor@example.com",
        password: "secret-password",
        ...overrides,
      }),
    }),
  );
}
function cookie() {
  return `pnw_session=${seal(
    {
      provider: "directus",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + 900000,
    },
    "session",
  )}`;
}

test("a Directus content editor without a WCA account gets a private session that follows the Directus expiry", async () => {
  let calls = 0;
  global.fetch = async (url, init) => {
    assert.equal(new URL(String(url)).origin, process.env.DIRECTUS_URL);
    assert.equal(init?.cache, "no-store");
    calls++;
    if (String(url).endsWith("/auth/login")) {
      assert.deepEqual(JSON.parse(String(init?.body)), {
        email: "editor@example.com",
        password: "secret-password",
        otp: "123456",
        mode: "json",
      });
      return Response.json({ data: tokens });
    }
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      `Bearer ${tokens.access_token}`,
    );
    return Response.json({ data: profile });
  };
  const response = await signIn({ otp: "123456" });
  assert.equal(response.status, 303);
  assert.equal(
    response.headers.get("location"),
    "https://www.pnwcubing.com/admin",
  );
  assert.match(response.headers.get("cache-control")!, /no-store/);
  const stored = response.cookies.get("pnw_session")!;
  assert.equal(stored.httpOnly, true);
  assert.equal(stored.secure, true);
  assert.equal(stored.sameSite, "lax");
  assert.ok(stored.maxAge! > 895 && stored.maxAge! <= 900);
  assert.ok(!response.headers.get("set-cookie")?.includes(tokens.access_token));
  assert.ok(
    !response.headers.get("set-cookie")?.includes(tokens.refresh_token),
  );
  const decrypted = unseal<DirectusSession>(stored.value, "session")!;
  assert.equal(decrypted.provider, "directus");
  const identity = await context(`pnw_session=${stored.value}`, currentUser);
  assert.equal(identity?.isEditor, true);
  assert.equal(identity?.user.id, profile.id);
  assert.equal(identity?.user.name, "Content Editor");
  assert.equal(calls, 3);
});

test("Directus administrators can sign in and unrelated or inactive roles cannot inherit full editor access", async () => {
  for (const allowed of [true, false]) {
    const paths: string[] = [];
    global.fetch = async (input) => {
      const path = new URL(String(input)).pathname;
      paths.push(path);
      return path === "/auth/login"
        ? Response.json({ data: tokens })
        : path === "/auth/logout"
        ? new Response(null, { status: 204 })
        : Response.json({
            data: {
              ...profile,
              role: {
                name: allowed ? "Administrator" : "Delegate",
                admin_access: allowed,
              },
            },
          });
    };
    const response = await signIn();
    assert.equal(
      response.headers.get("location"),
      allowed
        ? "https://www.pnwcubing.com/admin"
        : "https://www.pnwcubing.com/login/directus?error=directus-access",
    );
    assert.equal(!!response.cookies.get("pnw_session"), allowed);
    assert.equal(paths.includes("/auth/logout"), !allowed);
  }
  global.fetch = async () =>
    Response.json({ data: { ...profile, status: "suspended" } });
  await assert.rejects(context(cookie(), currentUser), /session expired/);
});

test("Directus role and account status are checked again before website saves", async () => {
  let activeRole = true,
    writes = 0;
  global.fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    if (path === "/users/me")
      return Response.json({
        data: {
          ...profile,
          role: {
            name: activeRole ? "Content-Editor" : "Delegate",
            admin_access: false,
          },
        },
      });
    assert.equal(path, "/items/SiteNavigation/5");
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      "Bearer website-service-token",
    );
    writes++;
    return Response.json({ data: { id: 5, href: "https://shop.example.com" } });
  };
  Object.assign(global.fetch, {
    __nextGetStaticStore: () => ({
      getStore: () => ({
        incrementalCache: { revalidateTag: async () => {} },
      }),
    }),
  });
  const request = () =>
    new Request("https://www.pnwcubing.com/api/editor/SiteNavigation/5", {
      method: "PATCH",
      headers: { origin: process.env.SITE_URL! },
      body: JSON.stringify({ href: "https://shop.example.com" }),
    });
  const action = () =>
    save(request(), { params: { collection: "SiteNavigation", id: ["5"] } });
  assert.equal((await context(cookie(), action)).status, 200);
  activeRole = false;
  assert.equal((await context(cookie(), action)).status, 403);
  assert.equal(writes, 1);
});

test("Directus sign-in rejects cross-site requests and invalid form data before sending credentials", async () => {
  global.fetch = async () => {
    assert.fail("No upstream request is allowed");
  };
  assert.equal((await signIn({}, "https://evil.example")).status, 403);
  const invalidInputs: Record<string, string>[] = [
    { password: "" },
    { otp: "bad" },
    { email: "x".repeat(255) },
    { password: "x".repeat(1025) },
  ];
  for (const input of invalidInputs) {
    const response = await signIn(input);
    assert.equal(
      response.headers.get("location"),
      "https://www.pnwcubing.com/login/directus?error=directus",
    );
    assert.equal(response.cookies.get("pnw_session"), undefined);
  }
});

test("Directus failures give safe messages and support two-factor codes without exposing credentials", async () => {
  for (const [status, code, reason] of [
    [401, "INVALID_CREDENTIALS", "directus"],
    [401, "INVALID_OTP", "directus-otp"],
    [429, "LIMIT_EXCEEDED", "directus-unavailable"],
    [503, "SERVICE_UNAVAILABLE", "directus-unavailable"],
  ] as const) {
    global.fetch = async () =>
      Response.json(
        { errors: [{ message: "secret-password", extensions: { code } }] },
        { status },
      );
    const response = await signIn();
    assert.equal(
      response.headers.get("location"),
      `https://www.pnwcubing.com/login/directus?error=${reason}`,
    );
    assert.equal(response.cookies.get("pnw_session"), undefined);
    assert.ok(!response.headers.get("location")!.includes("secret-password"));
    assert.equal(await response.text(), "");
  }
});

test("Directus sign-out revokes its own refresh token and clears the website cookie even during an outage", async () => {
  for (const status of [204, 503]) {
    let calls = 0;
    global.fetch = async (input, init) => {
      calls++;
      assert.equal(String(input), "https://admin.pnwcubing.com/auth/logout");
      assert.deepEqual(JSON.parse(String(init?.body)), {
        refresh_token: tokens.refresh_token,
      });
      return new Response(null, { status });
    };
    const response = await context(cookie(), () =>
      logout(
        new Request("https://www.pnwcubing.com/api/auth/logout", {
          method: "POST",
          headers: { origin: process.env.SITE_URL! },
        }),
      ),
    );
    assert.equal(response.status, 303);
    assert.equal(response.cookies.get("pnw_session")!.maxAge, 0);
    assert.equal(calls, 1);
  }
});

test("Directus identities never match numeric WCA ownership and session responses expose only the display name", async () => {
  assert.equal(
    canEditDelegate({ provider: "directus", id: "8184", name: "Editor" }, {
      wcaUserId: 8184,
      status: "published",
    } as Delegate),
    false,
  );
  global.fetch = async () => Response.json({ data: profile });
  const response = await context(cookie(), sessionInfo);
  assert.deepEqual(await response.json(), {
    user: { name: "Content Editor", avatar: null },
  });
  assert.equal(response.headers.get("vary"), "Cookie");
  global.fetch = async () =>
    Response.json({
      data: { ...profile, role: { name: "Delegate", admin_access: false } },
    });
  assert.deepEqual(await (await context(cookie(), sessionInfo)).json(), {
    user: null,
  });
});

test("the login page shows provider buttons and keeps the Directus fields on their own page", () => {
  const html = renderToStaticMarkup(createElement(Login, { searchParams: {} }));
  assert.ok(html.includes('href="/login/directus"'));
  assert.ok(html.includes("Sign in with WCA"));
  assert.ok(html.includes("Sign in with Directus"));
  assert.ok(!html.includes('type="password"'));
  assert.ok(!html.includes('name="email"'));
});

test("the Directus page renders email and password first and only displays a code field after a challenge", () => {
  for (const error of [
    undefined,
    "constructor",
    "__proto__",
    "directus-access",
  ]) {
    const html = renderToStaticMarkup(
      createElement(DirectusLogin, { searchParams: { error } }),
    );
    assert.ok(html.includes('action="/api/auth/directus"'));
    assert.ok(html.includes('type="password"'));
    assert.match(html, /autocomplete="current-password"/i);
    assert.ok(!html.includes('name="otp"'));
    assert.ok(html.includes('href="/login"'));
  }
  const challenge = renderToStaticMarkup(
    createElement(DirectusLogin, { searchParams: { error: "directus-otp" } }),
  );
  assert.match(challenge, /autocomplete="one-time-code"/i);
  assert.match(challenge, /name="otp"[^>]*required/);
});

test("the JSON login flow requests a code only when Directus requires one and creates no session before verification", async () => {
  let attempt = 0;
  global.fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    if (path === "/users/me") return Response.json({ data: profile });
    assert.equal(path, "/auth/login");
    const body = JSON.parse(String(init?.body));
    attempt++;
    assert.equal(body.email, "editor@example.com");
    assert.equal(body.password, "secret-password");
    if (!body.otp || body.otp !== "123456")
      return Response.json(
        { errors: [{ extensions: { code: "INVALID_OTP" } }] },
        { status: 401 },
      );
    return Response.json({ data: tokens });
  };
  const unverifiedAttempts: Record<string, string>[] = [{}, { otp: "000000" }];
  for (const input of unverifiedAttempts) {
    const response = await signIn(input, process.env.SITE_URL!, true);
    assert.equal(response.status, 401);
    const result = await response.json();
    assert.equal(result.requiresOtp, true);
    assert.equal(result.code, "directus-otp");
    assert.equal(response.cookies.get("pnw_session"), undefined);
    assert.ok(!JSON.stringify(result).includes("secret-password"));
    assert.match(response.headers.get("cache-control")!, /no-store/);
  }
  const verified = await signIn({ otp: "123456" }, process.env.SITE_URL!, true);
  assert.equal(verified.status, 200);
  assert.deepEqual(await verified.json(), { success: true });
  assert.ok(verified.cookies.get("pnw_session")?.httpOnly);
  assert.equal(attempt, 3);
});

test("accounts without two-factor authentication sign in directly without a challenge", async () => {
  global.fetch = async (input, init) => {
    if (new URL(String(input)).pathname === "/users/me")
      return Response.json({ data: profile });
    assert.ok(!("otp" in JSON.parse(String(init?.body))));
    return Response.json({ data: tokens });
  };
  const response = await signIn({}, process.env.SITE_URL!, true);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  assert.ok(response.cookies.get("pnw_session"));
});

test("wrong passwords do not request two-factor verification or expose upstream error details", async () => {
  global.fetch = async () =>
    Response.json(
      {
        errors: [
          {
            message: "secret-password",
            extensions: { code: "INVALID_CREDENTIALS" },
          },
        ],
      },
      { status: 401 },
    );
  const response = await signIn({}, process.env.SITE_URL!, true);
  const result = await response.json();
  assert.equal(response.status, 401);
  assert.equal(result.requiresOtp, false);
  assert.equal(result.code, "directus");
  assert.ok(!JSON.stringify(result).includes("secret-password"));
  assert.equal(response.cookies.get("pnw_session"), undefined);
});
