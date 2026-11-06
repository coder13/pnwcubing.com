import type { Delegate } from "../directus";
import type { EditorUser, WcaUser } from "./types";

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

export function canEditDelegate(user: EditorUser, delegate: Delegate): boolean {
  return user.id === delegate.wcaUserId && delegate.status !== "archived";
}
