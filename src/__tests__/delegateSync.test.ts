import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { Delegate } from "../lib/directus";
import {
  getActiveWcaDelegates,
  getWcaAccount,
  type WcaDelegate,
} from "../lib/wcaDelegates";
import {
  planDelegateSync,
  syncDelegates,
  linkDelegateAccount,
} from "../lib/editor/delegateSync";
import { planDelegateLinks } from "../lib/editor/delegateIdentity";
import { mutateContent } from "../lib/editor/mutations";
import {
  validateDelegateProfile,
  validateContent,
} from "../lib/editor/validation";

process.env.DIRECTUS_TOKEN = "test-service-token";
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});
const saved: Delegate = {
  id: "old",
  wcaUserId: 123,
  wcaId: "2010TEST01",
  name: "Custom name",
  email: "custom@example.com",
  region: "Western Washington",
  description: "My blurb",
  status: "published",
  sort: 4,
  date_updated: "",
  wcaRegionId: 28,
  wcaRegion: "Pacific Northwest",
  wcaActive: true,
  wcaStatus: "delegate",
};
const entry: WcaDelegate = {
  user: {
    id: 123,
    wca_id: "2010TEST02",
    name: "WCA name",
    email: "wca@example.com",
  },
  regionId: 28,
  region: "Pacific Northwest",
  location: "WCA location",
  status: "delegate",
};
function role(id: number, regionId = 28) {
  return {
    id,
    user: { id, name: `User ${id}`, wca_id: null },
    end_date: null,
    group: {
      id: regionId,
      name: regionId === 28 ? "Pacific Northwest" : "Canada (West)",
      group_type: "delegate_regions",
    },
    metadata: { location: "Somewhere", status: "delegate" },
  };
}
function page(roles: unknown[], total: number, next = false) {
  return Response.json(roles, {
    headers: {
      total: String(total),
      ...(next
        ? {
            link: '<https://www.worldcubeassociation.org/api/v0/user_roles?page=2>; rel="next"',
          }
        : {}),
    },
  });
}
function request(method: string, body: unknown) {
  return new Request("https://www.pnwcubing.com/api/editor/Delegates/old", {
    method,
    body: JSON.stringify(body),
  });
}
const user = { id: 123, wca_id: null, name: "Delegate", delegate_status: null };
const profile = {
  name: "Name",
  email: "",
  region: "",
  description: "Hello",
  status: "hidden",
  sort: 0,
};

test("sync refreshes WCA metadata while preserving each publication state and custom fields", () => {
  for (const status of ["published", "hidden", "archived", "draft"] as const) {
    const original = { ...saved, status };
    const plan = planDelegateSync([original], [entry]);
    assert.deepEqual(plan.updates, [
      { id: "old", body: { wcaId: "2010TEST02" } },
    ]);
    assert.deepEqual(original, { ...saved, status });
  }
});

test("missing delegates stay in their chosen state and region and additional profiles stay unchanged", () => {
  const plan = planDelegateSync(
    [
      saved,
      { ...saved, id: "archived", wcaUserId: 124, status: "archived" },
      {
        ...saved,
        id: "extra",
        wcaUserId: 125,
        wcaRegionId: null,
        wcaRegion: null,
      },
    ],
    [],
  );
  assert.deepEqual(plan.updates, [
    { id: "old", body: { wcaActive: false } },
    { id: "archived", body: { wcaActive: false } },
  ]);
  assert.equal(plan.missing, 2);
});

test("new delegates without competitor IDs start hidden and repeat sync makes no changes", () => {
  const newcomer = { ...entry, user: { ...entry.user, id: 456, wca_id: null } };
  const plan = planDelegateSync([], [newcomer]);
  assert.equal(plan.creates[0].status, "hidden");
  assert.equal(plan.creates[0].wcaUserId, 456);
  assert.equal(plan.creates[0].wcaId, "");
  assert.deepEqual(
    planDelegateSync(
      [{ ...plan.creates[0], id: "new" } as unknown as Delegate],
      [newcomer],
    ),
    { creates: [], updates: [], missing: 0 },
  );
});

test("sync detects duplicate identities and unlinked legacy matches before any writes", () => {
  assert.throws(
    () => planDelegateSync([saved, { ...saved, id: "duplicate" }], [entry]),
    /duplicate/,
  );
  assert.throws(
    () =>
      planDelegateSync(
        [{ ...saved, wcaUserId: null }],
        [{ ...entry, user: { ...entry.user, wca_id: saved.wcaId } }],
      ),
    /cms:setup/,
  );
});

test("WCA roster loads every page of both regions and accepts accounts without competitor IDs", async () => {
  const calls: string[] = [];
  global.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(
      (init?.headers as Record<string, string> | undefined)?.Authorization,
      undefined,
    );
    calls.push(
      `${url.searchParams.get("groupId")}:${url.searchParams.get("page")}`,
    );
    assert.equal(url.searchParams.get("isActive"), "true");
    if (url.searchParams.get("groupId") === "114")
      return page([role(3, 114)], 1);
    return url.searchParams.get("page") === "1"
      ? page([role(1)], 2, true)
      : page([role(2)], 2);
  };
  const roster = await getActiveWcaDelegates();
  assert.deepEqual(calls, ["28:1", "28:2", "114:1"]);
  assert.deepEqual(
    roster.map((entry) => entry.user.id),
    [1, 2, 3],
  );
});

test("incomplete, duplicate, changing, or wrong-region WCA responses stop sync before CMS writes", async () => {
  for (const failure of [
    "truncated",
    "duplicate",
    "changed",
    "wrong-region",
    "unavailable",
  ]) {
    global.fetch = async (input, init) => {
      assert.equal(init?.method, undefined);
      const url = new URL(String(input));
      assert.equal(url.hostname, "www.worldcubeassociation.org");
      if (failure === "unavailable") return new Response(null, { status: 503 });
      if (failure === "truncated") return page([role(1)], 2);
      if (failure === "wrong-region") return page([role(1, 114)], 1);
      if (url.searchParams.get("page") === "1") return page([role(1)], 2, true);
      return failure === "changed" ? page([role(2)], 3) : page([role(1)], 2);
    };
    await assert.rejects(syncDelegates(true));
  }
});

test("a delegate cannot trigger sync or upstream requests", async () => {
  global.fetch = async () => assert.fail("Unauthorized upstream request");
  await assert.rejects(syncDelegates(false), /full editor/);
});

test("partially completed imports can be rerun without duplicate profiles", async () => {
  const records: Delegate[] = [];
  let fail = true;
  global.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname === "www.worldcubeassociation.org")
      return url.searchParams.get("groupId") === "28"
        ? page([role(1), role(2)], 2)
        : page([], 0);
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      if (body.wcaUserId === 2 && fail) {
        fail = false;
        return new Response(null, { status: 503 });
      }
      assert.ok(!records.some((record) => record.wcaUserId === body.wcaUserId));
      records.push({ ...body, id: String(body.wcaUserId) });
      return Response.json({ data: records.at(-1) });
    }
    return Response.json({ data: records });
  };
  await assert.rejects(syncDelegates(true));
  assert.equal(records.length, 1);
  assert.equal((await syncDelegates(true)).added, 1);
  assert.equal(records.length, 2);
  assert.equal((await syncDelegates(true)).added, 0);
});

test("legacy migration links by competitor ID and preserves the internal primary key and profile", async () => {
  const legacy = { ...saved, wcaUserId: null };
  global.fetch = async (input) => {
    assert.ok(String(input).endsWith(`/users/${legacy.wcaId}`));
    return Response.json({
      user: {
        id: 123,
        wca_id: legacy.wcaId,
        name: "WCA name",
        region_id: 28,
        delegate_status: "delegate",
      },
    });
  };
  const plan = await planDelegateLinks([legacy]);
  assert.deepEqual(plan.updates, [
    {
      id: "old",
      body: {
        wcaUserId: 123,
        wcaRegionId: 28,
        wcaRegion: "Pacific Northwest",
        wcaActive: true,
        wcaStatus: "delegate",
      },
    },
  ]);
  assert.equal(legacy.wcaUserId, null);
  assert.equal(legacy.description, saved.description);
});

test("migration rejects conflicting identities, and never guesses a link from name or email", async () => {
  global.fetch = async () =>
    Response.json({
      user: { id: 123, wca_id: saved.wcaId, name: "Same name" },
    });
  await assert.rejects(
    planDelegateLinks([saved, { ...saved, id: "other", wcaUserId: null }]),
    /duplicate/,
  );
  global.fetch = async () => assert.fail("No account lookup without an ID");
  const plan = await planDelegateLinks([
    { ...saved, wcaUserId: null, wcaId: "" },
  ]);
  assert.deepEqual(plan, { updates: [], unresolved: ["old"] });
});

test("additional accounts need no competitor ID or official delegate role", async () => {
  global.fetch = async (input) =>
    String(input).includes("/api/v0/users/")
      ? Response.json({
          user: {
            id: 777,
            name: "Additional",
            wca_id: null,
            delegate_status: null,
          },
        })
      : Response.json({ data: [] });
  assert.deepEqual(await linkDelegateAccount(777), {
    wcaUserId: 777,
    wcaId: "",
    wcaRegionId: null,
    wcaRegion: null,
    wcaActive: null,
    wcaStatus: "none",
  });
});

test("an existing numeric identity cannot be reassigned and duplicate additions are rejected", async () => {
  global.fetch = async () => assert.fail("No request needed for a locked ID");
  await assert.rejects(linkDelegateAccount(999, saved), /cannot change/);
  assert.deepEqual(await linkDelegateAccount(saved.wcaUserId, saved), {});
  global.fetch = async () => Response.json({ data: [saved] });
  await assert.rejects(linkDelegateAccount(123), /already has/);
});

test("WCA lookup rejects invalid or mismatched user IDs", async () => {
  global.fetch = async () => assert.fail("Invalid ID must not be sent");
  await assert.rejects(getWcaAccount("../../me"));
  global.fetch = async () =>
    Response.json({ user: { id: 999, name: "Wrong", wca_id: null } });
  await assert.rejects(getWcaAccount(123), /different account/);
});

test("either owner or full editor can publish or hide, only full editors can archive or restore", async () => {
  const writes: unknown[] = [];
  global.fetch = async (_input, init) => {
    if (init?.method) writes.push(JSON.parse(String(init.body)));
    return Response.json({ data: saved });
  };
  for (const status of ["hidden", "published"]) {
    await mutateContent(
      request("PATCH", { ...profile, status }),
      "Delegates",
      [saved.id],
      { user, isEditor: false },
    );
    await mutateContent(
      request("PATCH", { ...profile, status, wcaUserId: 123 }),
      "Delegates",
      [saved.id],
      { user, isEditor: true },
    );
  }
  await assert.rejects(
    mutateContent(
      request("PATCH", { ...profile, status: "archived" }),
      "Delegates",
      [saved.id],
      { user, isEditor: false },
    ),
    /full editor/,
  );
  await mutateContent(
    request("PATCH", { ...profile, status: "archived", wcaUserId: 123 }),
    "Delegates",
    [saved.id],
    { user, isEditor: true },
  );
  assert.equal(writes.length, 5);
  assert.equal((writes[4] as { status: string }).status, "archived");
  global.fetch = async () =>
    Response.json({ data: { ...saved, status: "archived" } });
  await assert.rejects(
    mutateContent(request("PATCH", profile), "Delegates", [saved.id], {
      user,
      isEditor: false,
    }),
    /own delegate profile/,
  );
  assert.throws(() =>
    validateContent(
      "FAQ",
      { question: "Q", answer: "A", status: "archived", sort: 0 },
      false,
    ),
  );
  assert.throws(() => validateDelegateProfile({ ...profile, wcaUserId: 999 }));
});

test("new profiles seed public WCA emails while trainee imports omit email and existing edits survive", () => {
  const seeded = planDelegateSync([], [entry]).creates[0];
  assert.equal(seeded.email, "wca@example.com");
  const trainee = { ...entry, status: "trainee_delegate" };
  const created = planDelegateSync([], [trainee]).creates[0];
  assert.equal(created.wcaStatus, "trainee_delegate");
  assert.equal(created.email, "");
  const updated = planDelegateSync([saved], [trainee]).updates[0].body;
  assert.equal(updated.wcaStatus, "trainee_delegate");
  assert.ok(!("email" in updated));
});

test("a duplicate WCA role cannot overwrite trainee privacy status", async () => {
  global.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.searchParams.get("groupId") === "114") return page([], 0);
    const trainee = role(1);
    trainee.metadata.status = "trainee_delegate";
    const other = { ...role(1), id: 2 };
    return page([trainee, other], 2);
  };
  const roster = await getActiveWcaDelegates();
  assert.equal(roster.length, 1);
  assert.equal(roster[0].status, "trainee_delegate");
});
