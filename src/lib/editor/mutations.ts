import { AuthError } from "./auth";
import { bootstrapEditorIds } from "./config";
import { cmsRequest, encodeFaqWrite, itemPath } from "./directus";
import { decodeFaqItem } from "./faqFields";
import defaults from "@/content/default-content.json";
import { canEditDelegate } from "./permissions";
import { contentCollections, ContentCollection, WcaUser } from "./types";
import {
  validateDelegateProfile,
  validateContent,
  ValidationError,
} from "./validation";
import type { Delegate } from "../directus";

export async function mutateContent(
  request: Request,
  collectionName: string,
  ids: string[] | undefined,
  { user, isEditor }: { user: WcaUser; isEditor: boolean },
) {
  if (
    !contentCollections.includes(collectionName as ContentCollection) ||
    (ids?.length || 0) > 1
  )
    throw new AuthError(404, "Content not found.");
  const collection = collectionName as ContentCollection;
  const id = ids?.[0];
  if ((request.method === "POST") === !!id)
    throw new ValidationError("Select a record for this action.");
  if (
    !isEditor &&
    !(collection === "Delegates" && request.method === "PATCH" && id)
  )
    throw new AuthError(403, "You cannot change this content.");
  if (
    collection === "SiteEditors" &&
    id &&
    bootstrapEditorIds().includes(Number(id))
  )
    throw new AuthError(
      403,
      "This editor account is managed by the site configuration.",
    );
  const path = itemPath(collection, id);
  let body;
  let input: unknown;
  if (request.method !== "DELETE") {
    if (Number(request.headers.get("content-length")) > 150000)
      throw new ValidationError("This content is too large.");
    const raw = await request.text();
    if (raw.length > 150000)
      throw new ValidationError("This content is too large.");
    input = JSON.parse(raw);
  }
  if (!isEditor) {
    const delegate = await cmsRequest<Delegate>(path);
    if (!canEditDelegate(user, delegate))
      throw new AuthError(403, "You can edit only your own delegate profile.");
    body = validateDelegateProfile(input, delegate.wcaId);
  } else if (request.method !== "DELETE") {
    body = validateContent(collection, input, request.method === "POST");
  }
  if (
    collection === "SiteContent" &&
    (request.method !== "PATCH" || !defaults.some((item) => item.id === id))
  )
    throw new ValidationError("Edit an existing page section.");
  if (collection === "FAQ" && body) body = await encodeFaqWrite(body);
  const result = await cmsRequest(path, {
    method: request.method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return collection === "FAQ" ? decodeFaqItem(result) : result;
}
