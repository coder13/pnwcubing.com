import type { Delegate } from "../directus";
import {
  getActiveWcaDelegates,
  getWcaAccount,
  trackedWcaRegions,
  type WcaDelegate,
} from "../wcaDelegates";
import { AuthError } from "./auth";
import { cmsRequest, itemPath, listItems } from "./directus";
import { ValidationError } from "./validation";

import { assertUniqueDelegateIds } from "./delegateIdentity";

export function planDelegateSync(existing: Delegate[], roster: WcaDelegate[]) {
  assertUniqueDelegateIds(existing);
  const creates: Record<string, unknown>[] = [];
  const updates: { id: string; body: Record<string, unknown> }[] = [];
  const incoming = new Set<number>();
  for (const entry of roster) {
    if (incoming.has(entry.user.id))
      throw new ValidationError("The WCA list contains duplicate accounts.");
    incoming.add(entry.user.id);
    const current = existing.find((item) => item.wcaUserId === entry.user.id);
    if (
      !current &&
      entry.user.wca_id &&
      existing.some(
        (item) => !item.wcaUserId && item.wcaId === entry.user.wca_id,
      )
    )
      throw new ValidationError(
        "An existing delegate needs a WCA user ID. Run yarn cms:setup before sync.",
      );
    const metadata = {
      wcaId: entry.user.wca_id || "",
      wcaRegionId: entry.regionId,
      wcaRegion: entry.region,
      wcaActive: true,
      wcaStatus: entry.status,
    };
    if (!current) {
      creates.push({
        ...metadata,
        wcaUserId: entry.user.id,
        name: entry.user.name,
        email:
          entry.status === "trainee_delegate" ? "" : entry.user.email || "",
        region: entry.location,
        description: "",
        status: "hidden",
        sort: 0,
      });
    } else {
      const body = Object.fromEntries(
        Object.entries(metadata).filter(
          ([key, value]) => current[key as keyof Delegate] !== value,
        ),
      );
      if (Object.keys(body).length)
        updates.push({ id: String(current.id), body });
    }
  }
  const missing = existing.filter(
    (item) =>
      item.wcaUserId &&
      trackedWcaRegions.some((region) => region.id === item.wcaRegionId) &&
      !incoming.has(item.wcaUserId),
  );
  for (const item of missing) {
    if (item.wcaActive !== false)
      updates.push({ id: String(item.id), body: { wcaActive: false } });
  }
  return { creates, updates, missing: missing.length };
}

export async function syncDelegates(isEditor: boolean) {
  if (!isEditor)
    throw new AuthError(403, "Only a full editor can sync delegates.");
  // Finish both reads and all validation before the first write.
  const roster = await getActiveWcaDelegates();
  const existing = await listItems<Delegate>("Delegates");
  const plan = planDelegateSync(existing, roster);
  // Unique wcaUserId in Directus prevents duplicate imports, including concurrent requests.
  // Patch only WCA metadata so a simultaneous visibility or profile edit is preserved.
  for (const update of plan.updates)
    await cmsRequest(itemPath("Delegates", update.id), {
      method: "PATCH",
      body: JSON.stringify(update.body),
    });
  for (const body of plan.creates)
    await cmsRequest(itemPath("Delegates"), {
      method: "POST",
      body: JSON.stringify(body),
    });
  return {
    added: plan.creates.length,
    updated: plan.updates.length,
    missing: plan.missing,
  };
}

export async function linkDelegateAccount(value: unknown, current?: Delegate) {
  if (!Number.isSafeInteger(value) || Number(value) <= 0)
    throw new ValidationError("Enter a numeric WCA user ID.");
  const id = Number(value);
  if (current?.wcaUserId) {
    if (id !== current.wcaUserId)
      throw new ValidationError(
        "The WCA user ID cannot change after a profile is linked.",
      );
    return {};
  }
  const duplicates = await listItems<Delegate>("Delegates", {
    filter: JSON.stringify({ wcaUserId: { _eq: id } }),
  });
  if (duplicates.some((item) => String(item.id) !== String(current?.id)))
    throw new ValidationError(
      "This WCA account already has a delegate profile. Select that profile.",
    );
  const user = await getWcaAccount(id);
  if (!current && user.wca_id) {
    const legacy = await listItems<Delegate>("Delegates", {
      filter: JSON.stringify({
        wcaId: { _eq: user.wca_id },
        wcaUserId: { _null: true },
      }),
    });
    if (legacy.length)
      throw new ValidationError(
        "An existing profile matches this WCA account. Link that profile instead of adding another.",
      );
  }

  // Legacy profiles must link to the same WCA account. Never match by name or email.
  if (current?.wcaId && current.wcaId !== user.wca_id)
    throw new ValidationError(
      "This account does not match the existing WCA ID.",
    );
  const region = trackedWcaRegions.find((item) => item.id === user.region_id);
  return {
    wcaUserId: user.id,
    wcaId: user.wca_id || "",
    wcaRegionId: region?.id ?? null,
    wcaRegion: region?.name ?? null,
    wcaActive: region ? !!user.delegate_status : null,
    wcaStatus: user.delegate_status || "none",
  };
}
