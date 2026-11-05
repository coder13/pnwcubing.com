import type { Delegate } from "../directus";
import type { WcaUser } from "./types";

const delegateStatuses = new Set([
  "senior_delegate",
  "regional_delegate",
  "delegate",
  "junior_delegate",
  "trainee_delegate",
]);

export function isDelegate(user: WcaUser): boolean {
  return delegateStatuses.has(user.delegate_status || "");
}

export function canEditDelegate(user: WcaUser, delegate: Delegate): boolean {
  return isDelegate(user) && !!user.wca_id && user.wca_id === delegate.wcaId;
}
