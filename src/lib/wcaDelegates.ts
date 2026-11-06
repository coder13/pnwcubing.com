export const trackedWcaRegions = [
  { id: 28, name: "Pacific Northwest" },
  { id: 114, name: "Canada (West)" },
] as const;

export interface WcaProfile {
  id: number;
  name: string;
  wca_id: string | null;
  email?: string;
  region_id?: number | null;
  delegate_status?: string | null;
  avatar?: { url?: string };
}
export interface WcaDelegate {
  user: WcaProfile;
  regionId: number;
  region: string;
  location: string;
  status: string;
}

const base = "https://www.worldcubeassociation.org/api/v0";
export class WcaDataError extends Error {}

async function get(path: string) {
  const response = await fetch(`${base}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new WcaDataError(
      response.status === 404
        ? "This WCA account was not found. Check the numeric WCA user ID."
        : "The WCA list could not load. Try again later.",
    );
  return response;
}
function profile(value: unknown): WcaProfile {
  const user = value as WcaProfile | undefined;
  if (
    !user ||
    !Number.isSafeInteger(user.id) ||
    user.id <= 0 ||
    typeof user.name !== "string" ||
    !user.name.trim() ||
    !(
      user.wca_id === null ||
      (typeof user.wca_id === "string" &&
        /^\d{4}[A-Z]{4}\d{2}$/.test(user.wca_id))
    )
  )
    throw new WcaDataError(
      "The WCA returned an invalid account. No sync changes were made.",
    );
  return user;
}

// The public users endpoint accepts either a numeric user ID or a competitor ID.
// Competitor IDs are used only to link existing records during setup.
export async function getWcaAccount(id: number | string): Promise<WcaProfile> {
  if (!/^(?:[1-9]\d*|\d{4}[A-Z]{4}\d{2})$/.test(String(id)))
    throw new WcaDataError("Enter a numeric WCA user ID.");
  const user = profile(
    (await (await get(`/users/${encodeURIComponent(id)}`)).json()).user,
  );
  if (
    (typeof id === "number" && user.id !== id) ||
    (typeof id === "string" && user.wca_id !== id)
  )
    throw new WcaDataError(
      "The WCA returned a different account. No changes were made.",
    );
  return user;
}

export async function getActiveWcaDelegates(): Promise<WcaDelegate[]> {
  const result = new Map<number, WcaDelegate>();
  for (const region of trackedWcaRegions) {
    const rolesSeen = new Set<number>();
    let expectedTotal: number | undefined;
    for (let page = 1; ; page++) {
      if (page > 100)
        throw new WcaDataError("The WCA list is incomplete. Try sync again.");
      const query = new URLSearchParams({
        groupType: "delegate_regions",
        isActive: "true",
        groupId: String(region.id),
        per_page: "100",
        page: String(page),
      });
      const response = await get(`/user_roles?${query}`);
      const total = Number(response.headers.get("total"));
      if (
        !response.headers.has("total") ||
        !Number.isSafeInteger(total) ||
        total < 0 ||
        (expectedTotal !== undefined && total !== expectedTotal)
      )
        throw new WcaDataError(
          "The WCA list changed or is incomplete. Try sync again.",
        );
      expectedTotal = total;
      const roles = await response.json();
      if (!Array.isArray(roles))
        throw new WcaDataError("The WCA returned an invalid delegate list.");
      for (const role of roles) {
        if (
          !Number.isSafeInteger(role.id) ||
          rolesSeen.has(role.id) ||
          role.group?.id !== region.id ||
          role.group?.group_type !== "delegate_regions" ||
          typeof role.group?.name !== "string" ||
          typeof role.metadata?.status !== "string" ||
          !role.metadata.status ||
          (role.end_date &&
            (!/^\d{4}-\d{2}-\d{2}$/.test(role.end_date) ||
              role.end_date <= new Date().toISOString().slice(0, 10)))
        )
          throw new WcaDataError("The WCA returned an invalid delegate list.");
        rolesSeen.add(role.id);
        const user = profile(role.user);
        const existing = result.get(user.id);
        if (existing && existing.regionId !== region.id)
          throw new WcaDataError(
            `WCA user ${user.id} appears in both regions. No sync changes were made.`,
          );
        result.set(user.id, {
          user,
          regionId: region.id,
          region: role.group.name,
          status:
            existing?.status === "trainee_delegate"
              ? "trainee_delegate"
              : role.metadata.status,
          location:
            typeof role.metadata?.location === "string"
              ? role.metadata.location
              : "",
        });
      }
      const more = /rel="next"/.test(response.headers.get("link") || "");
      if (!more) {
        if (rolesSeen.size !== expectedTotal)
          throw new WcaDataError("The WCA list is incomplete. Try sync again.");
        break;
      }
      if (!roles.length)
        throw new WcaDataError("The WCA list is incomplete. Try sync again.");
    }
  }
  return Array.from(result.values());
}
