import assert from "node:assert/strict";
import { test } from "node:test";
import { updateDelegateVisibility } from "../../scripts/update-delegate-visibility.mjs";

function fixture(roles: (string | null)[]) {
  const rows = roles.map((role, index) => ({
    id: index + 1,
    wcaUserId: index + 100,
    status: "published",
  }));
  const writes: { query: unknown; data: unknown }[] = [];
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.hostname === "wca.test") assert.fail("Unexpected WCA host");
    if (url.hostname === "www.worldcubeassociation.org") {
      assert.equal(init?.headers, undefined, "CMS token must never go to WCA");
      const id = Number(url.pathname.split("/").at(-1));
      return Response.json({ user: { id, delegate_status: roles[id - 100] } });
    }
    if (init?.method === "PATCH") {
      const body = JSON.parse(String(init.body));
      writes.push(body);
      assert.deepEqual(body.data, { status: "hidden" });
      const row = rows.find(
        (row) =>
          row.id === body.query.filter.id._eq && row.status === "published",
      );
      if (row) row.status = "hidden";
      return Response.json({ data: row ? [{ id: row.id }] : [] });
    }
    assert.deepEqual(JSON.parse(url.searchParams.get("filter")!), {
      status: { _eq: "published" },
    });
    return Response.json({
      data: rows.filter((row) => row.status === "published"),
    });
  };
  return {
    rows,
    writes,
    fetchImpl,
    run: (extra = {}) =>
      updateDelegateVisibility({
        baseUrl: "https://cms.test",
        token: "secret",
        fetchImpl,
        ...extra,
      }),
  };
}

test("cron hides only confirmed non-delegates and keeps all active roles, including trainees", async () => {
  const state = fixture([
    null,
    "delegate",
    "junior_delegate",
    "trainee_delegate",
    "regional_delegate",
    "senior_delegate",
  ]);
  assert.deepEqual(await state.run(), {
    checked: 6,
    wouldHide: 1,
    hidden: 1,
    dryRun: false,
  });
  assert.equal(state.writes.length, 1);
  assert.deepEqual(state.writes[0].query, {
    filter: {
      id: { _eq: 1 },
      wcaUserId: { _eq: 100 },
      status: { _eq: "published" },
    },
  });
  assert.equal((await state.run()).hidden, 0);
});

test("dry run reports retired profiles without writing", async () => {
  const state = fixture([null]);
  assert.equal((await state.run({ dryRun: true })).wouldHide, 1);
  assert.equal(state.writes.length, 0);
});

test("failed, missing, mismatched, or incomplete WCA accounts never hide profiles", async () => {
  for (const failure of ["http", "missing", "mismatch", "unknown"]) {
    const state = fixture([null, "delegate"]);
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/users/101")) {
        if (failure === "http") return new Response(null, { status: 503 });
        if (failure === "missing") return new Response(null, { status: 404 });
        return Response.json({
          user: { id: failure === "mismatch" ? 999 : 101 },
        });
      }
      return state.fetchImpl(input, init);
    };
    await assert.rejects(state.run({ fetchImpl }), /WCA/);
    assert.equal(state.writes.length, 0);
  }
});

test("a profile archived during the WCA check stays archived", async () => {
  const state = fixture([null]);
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await state.fetchImpl(input, init);
    if (String(input).endsWith("/users/100")) state.rows[0].status = "archived";
    return response;
  };
  assert.equal((await state.run({ fetchImpl })).hidden, 0);
  assert.equal(state.rows[0].status, "archived");
});
