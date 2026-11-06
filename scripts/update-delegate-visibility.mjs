import { pathToFileURL } from "node:url";

const activeRoles = new Set([
  "senior_delegate",
  "regional_delegate",
  "delegate",
  "junior_delegate",
  "trainee_delegate",
]);

// Standalone Node 18+ job. It needs no website dependencies or administrator token.
export async function updateDelegateVisibility({
  baseUrl = process.env.DIRECTUS_URL,
  token = process.env.DIRECTUS_TOKEN,
  dryRun = false,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!baseUrl || !token)
    throw new Error(
      "Set DIRECTUS_URL and DIRECTUS_TOKEN for the visibility job.",
    );
  async function cms(path, init = {}) {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok)
      throw new Error(
        `Directus request failed (${response.status}). Retry the job.`,
      );
    return response.status === 204 ? undefined : (await response.json()).data;
  }
  const delegates = [];
  const seen = new Set();
  for (let page = 1; ; page++) {
    if (page > 1000)
      throw new Error("The CMS list is incomplete. No profiles were hidden.");
    const query = new URLSearchParams({
      fields: "id,wcaUserId,status",
      limit: "100",
      page: String(page),
      sort: "id",
      filter: JSON.stringify({ status: { _eq: "published" } }),
    });
    const rows = await cms(`/items/Delegates?${query}`);
    if (!Array.isArray(rows))
      throw new Error(
        "The CMS returned an invalid list. No profiles were hidden.",
      );
    for (const row of rows) {
      if (
        row.id == null ||
        seen.has(String(row.id)) ||
        row.status !== "published" ||
        !Number.isSafeInteger(row.wcaUserId) ||
        row.wcaUserId <= 0
      )
        throw new Error(
          "A published profile has an invalid WCA account link. No profiles were hidden.",
        );
      seen.add(String(row.id));
      delegates.push(row);
    }
    if (rows.length < 100) break;
  }
  // Finish every WCA check before writing. Errors and missing accounts are not retirement evidence.
  const retired = [];
  for (const delegate of delegates) {
    const response = await fetchImpl(
      `https://www.worldcubeassociation.org/api/v0/users/${delegate.wcaUserId}`,
      {
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      },
    );
    if (!response.ok)
      throw new Error(
        `WCA lookup failed for user ${delegate.wcaUserId} (${response.status}). No profiles were hidden.`,
      );
    const { user } = await response.json();
    if (
      user?.id !== delegate.wcaUserId ||
      !(user.delegate_status === null || activeRoles.has(user.delegate_status))
    )
      throw new Error(
        `WCA returned an unknown role for user ${delegate.wcaUserId}. No profiles were hidden.`,
      );
    if (user.delegate_status === null) retired.push(delegate);
  }
  let hidden = 0;
  if (!dryRun) {
    for (const delegate of retired) {
      // Recheck publication and identity at update time to protect concurrent archives and relinking.
      const result = await cms("/items/Delegates?fields=id", {
        method: "PATCH",
        body: JSON.stringify({
          query: {
            filter: {
              id: { _eq: delegate.id },
              wcaUserId: { _eq: delegate.wcaUserId },
              status: { _eq: "published" },
            },
          },
          data: { status: "hidden" },
        }),
      });
      if (!Array.isArray(result))
        throw new Error(
          "The CMS returned an invalid update result. Retry the job.",
        );
      hidden += result.length;
    }
  }
  return {
    checked: delegates.length,
    wouldHide: retired.length,
    hidden,
    dryRun,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  updateDelegateVisibility({ dryRun: process.argv.includes("--dry-run") })
    .then((result) =>
      console.log(
        JSON.stringify({ time: new Date().toISOString(), ...result }),
      ),
    )
    .catch(() => {
      // Upstream payloads and configured secrets never enter cron logs.
      console.error(
        "Delegate visibility check failed. Retry the job. No profiles are published or archived by this job.",
      );
      process.exitCode = 1;
    });
}
