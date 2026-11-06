import {
  editableNavigationLinks,
  safeAdditionalUrl,
} from "./navigationSettings";
import { validatePageBlock } from "./blockValidation";
import { pageIds } from "./blocks";
import { AuthError } from "./auth";
import { bootstrapEditorIds } from "./config";
import { cmsRequest, encodeFaqWrite, itemPath, listItems } from "./directus";
import { decodeFaqItem } from "./faqFields";
import defaults from "@/content/default-content.json";
import { canEditDelegate } from "./permissions";
import { contentCollections, ContentCollection, EditorUser } from "./types";
import {
  validateDelegateProfile,
  validateContent,
  ValidationError,
} from "./validation";
import { linkDelegateAccount } from "./delegateSync";
import type { Delegate } from "../directus";

export async function mutateContent(
  request: Request,
  collectionName: string,
  ids: string[] | undefined,
  { user, isEditor }: { user: EditorUser; isEditor: boolean },
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
  if (collection === "Delegates" && request.method === "DELETE")
    throw new ValidationError(
      "Archive this delegate to keep the profile and WCA account link.",
    );
  if (
    collection === "SiteNavigation" &&
    (request.method !== "PATCH" ||
      !editableNavigationLinks.some((link) => String(link.id) === id))
  )
    throw new ValidationError(
      "Only the Merch and Public Documents URLs can be edited.",
    );
  let path = itemPath(collection, id);
  let method = request.method;
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
  if (collection === "SiteContent") {
    if (!isEditor) throw new AuthError(403, "You cannot change this content.");
    if (id?.startsWith("__setup_"))
      throw new ValidationError("Edit an existing page section.");
    if (request.method === "POST") {
      body = validatePageBlock(input, true);
      const existing = await listItems<{ page?: string }>("SiteContent", {
        filter: JSON.stringify({ id: { _eq: body.id } }),
        limit: "1",
      });
      if (existing.length) {
        if (existing[0].page !== body.page)
          throw new ValidationError("This block belongs to another page.");
        path = itemPath("SiteContent", String(body.id));
        method = "PATCH";
        const { id: _id, ...update } = body;
        body = update;
      }
    } else {
      if (!id) throw new ValidationError("Select a page block.");
      const current = await cmsRequest<{ page?: string; deleted?: boolean }>(
        path,
      );
      if (current.deleted && request.method === "DELETE") return current;
      const page =
        current.page || defaults.find((item) => item.id === id)?.page;
      if (!page || !pageIds.includes(page))
        throw new ValidationError("Edit an existing page section.");
      if (request.method === "DELETE") {
        method = "PATCH";
        body = { deleted: true, status: "hidden", page: null };
      } else if (input && typeof input === "object" && "blockType" in input) {
        body = validatePageBlock(input, false);
        if (body.page !== page)
          throw new ValidationError("A block cannot move to another page.");
      } else body = validateContent("SiteContent", input, false);
    }
  } else if (!isEditor) {
    const delegate = await cmsRequest<Delegate>(path);
    if (!canEditDelegate(user, delegate))
      throw new AuthError(403, "You can edit only your own delegate profile.");
    body = validateDelegateProfile(input);
  } else if (collection === "Delegates") {
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new ValidationError("Enter a valid record.");
    const { wcaUserId, ...profile } = input as Record<string, unknown>;
    body = validateContent(collection, profile, request.method === "POST");
    const current = id ? await cmsRequest<Delegate>(path) : undefined;
    const account = await linkDelegateAccount(wcaUserId, current);
    body = { ...body, ...account };
  } else if (collection === "SiteNavigation") {
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).length !== 1 ||
      !("href" in input) ||
      !safeAdditionalUrl(input.href)
    )
      throw new ValidationError(
        "Enter a valid HTTP or HTTPS URL. Only the destination URL can be edited.",
      );
    body = { href: input.href };
  } else if (request.method !== "DELETE") {
    body = validateContent(collection, input, request.method === "POST");
  }
  if (collection === "FAQ" && body) body = await encodeFaqWrite(body);
  const result = await cmsRequest(path, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return collection === "FAQ" ? decodeFaqItem(result) : result;
}
