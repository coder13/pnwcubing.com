import type { Delegate } from "../directus";
import { getWcaAccount, trackedWcaRegions } from "../wcaDelegates";
import { ValidationError } from "./validation";

export function assertUniqueDelegateIds(
  delegates: Pick<Delegate, "id" | "wcaUserId">[],
) {
  const seen = new Set<number>();
  for (const delegate of delegates) {
    if (delegate.wcaUserId == null) continue;
    if (
      !Number.isSafeInteger(delegate.wcaUserId) ||
      delegate.wcaUserId <= 0 ||
      seen.has(delegate.wcaUserId)
    )
      throw new ValidationError(
        `Delegate ${delegate.id} has an invalid or duplicate WCA user ID. Fix the records before sync.`,
      );
    seen.add(delegate.wcaUserId);
  }
}

export async function planDelegateLinks(delegates: Delegate[]) {
  assertUniqueDelegateIds(delegates);
  const linked = delegates.map((item) => ({ ...item }));
  const updates: { id: string; body: Record<string, unknown> }[] = [];
  const unresolved: string[] = [];
  for (const item of linked) {
    if (item.wcaUserId) {
      if (!item.wcaStatus) {
        const user = await getWcaAccount(item.wcaUserId);
        updates.push({
          id: String(item.id),
          body: { wcaStatus: user.delegate_status || "none" },
        });
      }
      continue;
    }
    if (!item.wcaId) {
      unresolved.push(String(item.id));
      continue;
    }
    const user = await getWcaAccount(item.wcaId);
    item.wcaUserId = user.id;
    const region = trackedWcaRegions.find(
      (region) => region.id === user.region_id,
    );
    updates.push({
      id: String(item.id),
      body: {
        wcaUserId: user.id,
        wcaRegionId: region?.id ?? null,
        wcaRegion: region?.name ?? null,
        wcaActive: region ? !!user.delegate_status : null,
        wcaStatus: user.delegate_status || "none",
      },
    });
  }
  assertUniqueDelegateIds(linked);
  return { updates, unresolved };
}
