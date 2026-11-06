import { loadEnvConfig } from "@next/env";
import defaults from "../src/content/default-content.json";
import { parseDocument, DomUtils } from "htmlparser2";
import {
  defaultPageBlocks,
  pageIds,
  contactBodyId,
} from "../src/lib/editor/blocks";
import {
  splitParentFaq,
  splitPageHeading,
  splitHomeCards,
} from "../src/lib/editor/blockMigration";
import navigation from "../src/content/default-navigation.json";
import faq from "../src/content/default-faq.json";
import {
  encodeFaqItem,
  faqFieldMapId,
  resolveFaqFields,
} from "../src/lib/editor/faqFields";

import type { Delegate } from "../src/lib/directus";
import { planDelegateLinks } from "../src/lib/editor/delegateIdentity";

loadEnvConfig(process.cwd());
const baseUrl = process.env.DIRECTUS_URL || "https://admin.pnwcubing.com";

async function api<T = unknown>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const token = process.env.DIRECTUS_SETUP_TOKEN;
  if (!token)
    throw new Error(
      "Set DIRECTUS_SETUP_TOKEN to a Directus administrator token.",
    );
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const field =
      path.startsWith("/fields/") &&
      body &&
      typeof body === "object" &&
      "field" in body
        ? ` (field ${String(body.field)})`
        : "";
    const details: string[] = [];
    try {
      const payload = await response.json();
      for (const error of Array.isArray(payload.errors) ? payload.errors : []) {
        const code =
          typeof error.extensions?.code === "string"
            ? `[${error.extensions.code}] `
            : "";
        if (typeof error.message === "string")
          details.push(`${code}${error.message}`);
      }
    } catch {
      /* Some proxies return HTML instead of a Directus error. */
    }
    let detail = details.join(" ").replace(/\s+/g, " ");
    for (const secret of [
      token,
      process.env.DIRECTUS_TOKEN,
      process.env.WCA_CLIENT_SECRET,
      process.env.SESSION_SECRET,
    ]) {
      if (secret) detail = detail.replaceAll(secret, "[redacted]");
    }
    throw new Error(
      `Directus returned ${response.status} for ${method} ${
        path.split("?")[0]
      }${field}.${detail ? ` ${detail.slice(0, 1500)}` : ""}`,
    );
  }
  return response.status === 204
    ? (undefined as T)
    : (await response.json()).data;
}

type Field = {
  field: string;
  type: string;
  schema?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};
function text(field: string, type = "string"): Field {
  return {
    field,
    type,
    meta: { interface: type === "text" ? "input-multiline" : "input" },
  };
}
function primary(auto: boolean, type = "integer"): Field {
  return {
    field: "id",
    type,
    schema: {
      is_primary_key: true,
      has_auto_increment: auto,
      is_nullable: false,
    },
    meta: { interface: "input", hidden: auto, readonly: auto },
  };
}
const publication: Field = {
  field: "status",
  type: "string",
  schema: { default_value: "draft", is_nullable: false },
  meta: {
    interface: "select-dropdown",
    options: {
      choices: ["draft", "published", "hidden"].map((value) => ({
        text: value,
        value,
      })),
    },
  },
};
const sort: Field = {
  field: "sort",
  type: "integer",
  schema: { default_value: 0 },
  meta: { interface: "input" },
};

type Collection = {
  collection: string;
  schema?: object | null;
  meta?: { singleton?: boolean } | null;
};

const definitions = [
  {
    collection: "Delegates",
    fields: [
      {
        ...publication,
        schema: { default_value: "hidden", is_nullable: false },
        meta: {
          interface: "select-dropdown",
          options: {
            choices: ["published", "hidden", "archived", "draft"].map(
              (value) => ({ text: value, value }),
            ),
          },
        },
      },
      sort,
      {
        field: "wcaUserId",
        type: "integer",
        schema: { is_unique: true, is_nullable: true },
        meta: {
          interface: "input",
          note: "Stable WCA account ID. Do not change after linking.",
        },
      },
      { ...text("wcaRegionId", "integer"), schema: { is_nullable: true } },
      { ...text("wcaRegion"), schema: { is_nullable: true } },
      { ...text("wcaStatus"), schema: { is_nullable: true } },
      {
        field: "wcaActive",
        type: "boolean",
        schema: { is_nullable: true },
        meta: { interface: "boolean", special: ["cast-boolean"] },
      },
    ],
    note: "Delegate profiles. The website publishes only published records.",
  },
  {
    collection: "FAQ",
    fields: [
      primary(true),
      text("question"),
      text("answer", "text"),
      publication,
      sort,
    ],
    note: "Competition FAQ questions.",
  },
  {
    collection: "SiteContent",
    fields: [
      primary(false, "string"),
      text("label"),
      text("page"),
      {
        ...text("body", "text"),
        meta: {
          interface: "input-rich-text-html",
          options: {
            toolbar: [
              "bold",
              "italic",
              "underline",
              "h1",
              "h2",
              "h3",
              "bullist",
              "numlist",
              "link",
              "image",
              "removeformat",
            ],
          },
          note: "Visual page content. Formatting follows the website theme.",
        },
      },
      publication,
      sort,
      {
        ...text("blockType"),
        schema: { is_nullable: true },
        meta: {
          interface: "select-dropdown",
          required: true,
          options: {
            choices: [
              { text: "Normal text", value: "text" },
              { text: "Green highlight", value: "highlight" },
              { text: "FAQ list", value: "faq" },
              { text: "Home feed cards", value: "cards" },
              { text: "Page title", value: "pageTitle" },
            ],
          },
        },
      },
      {
        ...text("title"),
        meta: {
          interface: "input",
          conditions: [
            {
              name: "Text block",
              rule: { blockType: { _nin: ["faq", "pageTitle"] } },
              hidden: true,
            },
          ],
        },
      },
      {
        ...text("subtitle"),
        meta: {
          interface: "input",
          note: "Optional plain-text subtitle.",
          conditions: [
            {
              name: "Other blocks",
              rule: { blockType: { _neq: "pageTitle" } },
              hidden: true,
            },
          ],
        },
      },
      {
        field: "cardItems",
        type: "json",
        schema: { is_nullable: true },
        meta: {
          interface: "list",
          special: ["cast-json"],
          conditions: [
            {
              name: "Other blocks",
              rule: { blockType: { _neq: "cards" } },
              hidden: true,
            },
          ],
          options: {
            template: "{{title}}",
            addLabel: "Add card",
            fields: [
              {
                field: "id",
                name: "Item ID",
                type: "string",
                meta: { interface: "input", hidden: true },
              },
              {
                field: "title",
                name: "Card title",
                type: "string",
                meta: { interface: "input", required: true },
              },
              {
                field: "body",
                name: "Description",
                type: "text",
                meta: { interface: "input-rich-text-html" },
              },
              {
                field: "href",
                name: "Destination URL",
                type: "string",
                meta: { interface: "input", required: true },
              },
              {
                field: "linkText",
                name: "Link text",
                type: "string",
                meta: { interface: "input", required: true },
              },
              {
                field: "status",
                name: "Visibility",
                type: "string",
                schema: { default_value: "published" },
                meta: {
                  interface: "select-dropdown",
                  options: {
                    choices: [
                      { text: "Published", value: "published" },
                      { text: "Hidden", value: "hidden" },
                    ],
                  },
                },
              },
            ],
          },
        },
      },
      {
        field: "faqItems",
        type: "json",
        schema: { is_nullable: true },
        meta: {
          interface: "list",
          special: ["cast-json"],
          conditions: [
            {
              name: "Text block",
              rule: { blockType: { _neq: "faq" } },
              hidden: true,
            },
          ],
          options: {
            template: "{{question}}",
            addLabel: "Add question",
            fields: [
              {
                field: "id",
                name: "Item ID",
                type: "string",
                meta: { interface: "input", hidden: true },
              },
              {
                field: "question",
                name: "Question",
                type: "string",
                meta: { interface: "input", required: true },
              },
              {
                field: "answer",
                name: "Answer",
                type: "text",
                meta: { interface: "input-rich-text-html" },
              },
              {
                field: "status",
                name: "Visibility",
                type: "string",
                schema: { default_value: "published" },
                meta: {
                  interface: "select-dropdown",
                  options: {
                    choices: [
                      { text: "Published", value: "published" },
                      { text: "Hidden", value: "hidden" },
                    ],
                  },
                },
              },
            ],
          },
        },
      },
      {
        field: "deleted",
        type: "boolean",
        schema: { default_value: false },
        meta: { interface: "boolean", special: ["cast-boolean"], hidden: true },
      },
    ],
    note: "Ordered page blocks. Edit through Pages or here. Existing IDs stay unchanged.",
  },
  {
    collection: "SiteEditors",
    fields: [
      primary(false),
      text("name"),
      {
        field: "active",
        type: "boolean",
        schema: { default_value: true },
        meta: { interface: "boolean", special: ["cast-boolean"] },
      },
    ],
    note: "Full website editors. The ID is a numeric WCA user ID.",
  },
  {
    collection: "SiteNavigation",
    fields: [
      primary(true),
      text("label"),
      { ...text("href"), type: "text" },
      {
        ...text("kind"),
        schema: { default_value: "link" },
        meta: {
          interface: "select-dropdown",
          options: {
            choices: ["link", "menu", "brand"].map((value) => ({
              text: value,
              value,
            })),
          },
        },
      },
      {
        ...text("parent", "integer"),
        schema: { default_value: 0 },
        meta: {
          interface: "input",
          note: "Use 0 for a top-level item, or the numeric ID of a menu.",
        },
      },
      {
        field: "newTab",
        type: "boolean",
        schema: { default_value: false },
        meta: { interface: "boolean", special: ["cast-boolean"] },
      },
      publication,
      sort,
    ],
    note: "Only the Merch and Public Documents destination URLs are used. Website routes and header layout stay in code.",
  },
  {
    collection: "Pages",
    fields: [
      primary(false, "string"),
      text("title"),
      {
        field: "blocks",
        type: "alias",
        meta: {
          interface: "list-o2m",
          special: ["o2m"],
          options: {
            template: "{{blockType}}: {{title}}",
            enableCreate: true,
            enableSelect: false,
          },
        },
      },
    ],
    note: "Open a page to edit, add, or reorder its blocks. Website URLs stay in code.",
  },
];

function validateExistingCollection(
  collection: Collection,
  fields: Field[],
  expected: Field[],
) {
  if (collection.schema === null)
    throw new Error(
      `${collection.collection} is a collection folder, not a database table. Setup stopped before changing permissions.`,
    );
  if (collection.meta?.singleton)
    throw new Error(
      `${collection.collection} is a singleton. The website needs a collection with multiple records. Setup stopped before changing permissions.`,
    );
  for (const field of expected) {
    const existing = fields.find(
      (value) => value.field.toLowerCase() === field.field.toLowerCase(),
    );
    if (!existing) {
      if (field.schema?.is_primary_key)
        throw new Error(
          `${collection.collection} has no ${field.field} primary key. Setup will not add or replace an existing primary key. Setup stopped before changing permissions.`,
        );
      continue;
    }
    if (existing.field !== field.field)
      throw new Error(
        `${collection.collection}.${existing.field} conflicts with the required field ${field.field}. Field names are case-sensitive in the website. Setup stopped before changing permissions.`,
      );
    const stringTypes = ["string", "text"];
    if (
      existing.type !== field.type &&
      !(stringTypes.includes(existing.type) && stringTypes.includes(field.type))
    ) {
      throw new Error(
        `${collection.collection}.${field.field} has type ${existing.type}, but the website expects ${field.type}. Setup will not change existing field types. Setup stopped before changing permissions.`,
      );
    }
    if (
      field.schema?.is_primary_key &&
      existing.schema?.is_primary_key !== true
    )
      throw new Error(
        `${collection.collection}.${field.field} is not the primary key. Setup stopped before changing permissions.`,
      );
  }
}

async function ensureCollection(
  collection: string,
  fields: Field[],
  note: string,
  existing: Set<string>,
  current: Field[] = [],
) {
  if (!existing.has(collection)) {
    await api("/collections", "POST", {
      collection,
      meta: { note },
      schema: {},
      fields,
    });
    console.log(`Created ${collection}.`);
  } else {
    for (const field of fields) {
      const existing = current.find((value) => value.field === field.field);
      if (!existing) {
        console.log(`Adding ${collection}.${field.field} (${field.type}).`);
        await api(`/fields/${collection}`, "POST", field);
        console.log(`Added ${collection}.${field.field}.`);
      } else if (
        collection === "SiteContent" &&
        field.field === "id" &&
        existing.meta?.readonly !== true
      ) {
        await api(`/fields/${collection}/${field.field}`, "PATCH", {
          meta: field.meta,
        });
      } else if (collection === "SiteNavigation") {
        if (
          existing.meta?.readonly !== field.meta?.readonly ||
          JSON.stringify(existing.meta?.conditions || []) !==
            JSON.stringify(field.meta?.conditions || []) ||
          (field.type === "boolean" &&
            !(
              Array.isArray(existing.meta?.special) &&
              existing.meta.special.includes("cast-boolean")
            ))
        )
          await api(`/fields/${collection}/${field.field}`, "PATCH", {
            meta: field.meta,
          });
      } else if (
        collection === "Delegates" &&
        field.field === "wcaUserId" &&
        existing.schema?.is_unique !== true
      ) {
        await api(`/fields/${collection}/${field.field}`, "PATCH", {
          type: existing.type,
          schema: { is_unique: true },
        });
        console.log("Required unique WCA user IDs for delegates.");
      } else if (collection === "Delegates" && field.field === "status") {
        const choices =
          (
            existing.meta?.options as
              | { choices?: { value: string }[] }
              | undefined
          )?.choices || [];
        if (
          !choices.some((choice) => choice.value === "archived") ||
          existing.schema?.default_value !== "hidden"
        )
          await api(`/fields/${collection}/${field.field}`, "PATCH", {
            meta: field.meta,
            type: existing.type,
            schema: { default_value: "hidden" },
          });
      } else if (
        collection === "SiteContent" &&
        [
          "body",
          "page",
          "blockType",
          "title",
          "subtitle",
          "cardItems",
        ].includes(field.field) &&
        (existing.meta?.interface !== field.meta?.interface ||
          JSON.stringify(existing.meta?.conditions || []) !==
            JSON.stringify(field.meta?.conditions || []) ||
          JSON.stringify(existing.meta?.options || {}) !==
            JSON.stringify(field.meta?.options || {}))
      ) {
        await api(`/fields/${collection}/${field.field}`, "PATCH", {
          meta: field.meta,
        });
      } else if (field.type === "boolean") {
        const special = Array.isArray(existing.meta?.special)
          ? existing.meta.special
          : [];
        if (!special.includes("cast-boolean")) {
          await api(`/fields/${collection}/${field.field}`, "PATCH", {
            meta: { special: [...special, "cast-boolean"] },
          });
          console.log(
            `Enabled Boolean values for ${collection}.${field.field}.`,
          );
        }
      }
    }
  }
}

export async function setupCms({ checkOnly = false } = {}) {
  const collectionList = await api<Collection[]>("/collections");
  const collections = new Set(collectionList.map((item) => item.collection));
  if (!collections.has("Delegates"))
    throw new Error(
      "The existing Delegates collection was not found. No changes were made.",
    );
  const fieldsByCollection = new Map<string, Field[]>();
  // Read every existing collection before any schema or permission mutation.
  for (const { collection } of definitions) {
    if (!collections.has(collection)) {
      if (checkOnly)
        console.log(`${collection}: will create a new collection.`);
      continue;
    }
    const fields = await api<Field[]>(`/fields/${collection}`);
    fieldsByCollection.set(collection, fields);
    if (checkOnly)
      console.log(
        `${collection}: ${
          fields
            .map(
              (field) =>
                `${field.field}:${field.type}${
                  field.schema?.is_primary_key ? " (primary key)" : ""
                }`,
            )
            .join(", ") || "no fields"
        }`,
      );
  }
  const faqFields = resolveFaqFields(
    (fieldsByCollection.get("FAQ") || []).map((field) => field.field),
  );
  const resolvedDefinitions = definitions.map((definition) => ({
    ...definition,
    fields: definition.fields.map((field) => ({
      ...field,
      ...(definition.collection === "SiteContent" && field.field === "id"
        ? { meta: { ...field.meta, readonly: true, special: [] } }
        : {}),
      ...(definition.collection === "SiteContent" && field.field === "body"
        ? {
            meta: {
              ...field.meta,
              conditions: [
                {
                  name: "FAQ list",
                  rule: { blockType: { _in: ["faq", "cards", "pageTitle"] } },
                  hidden: true,
                },
              ],
            },
          }
        : {}),
      ...(definition.collection === "SiteContent" && field.field === "page"
        ? { meta: { interface: "select-dropdown-m2o", special: ["m2o"] } }
        : {}),
      ...(definition.collection === "SiteNavigation"
        ? {
            meta: {
              ...field.meta,
              readonly: field.field !== "href",
              ...(field.field === "href"
                ? {
                    note: "Only Merch and Public Documents URLs are editable. Website page routes stay fixed.",
                    conditions: [
                      {
                        name: "Fixed website link",
                        rule: { id: { _nin: [5, 8] } },
                        readonly: true,
                      },
                    ],
                  }
                : {}),
            },
          }
        : {}),
      field:
        definition.collection === "FAQ" &&
        (field.field === "question" || field.field === "answer")
          ? faqFields[field.field]
          : field.field,
    })),
  }));
  for (const [name, field] of Object.entries(faqFields)) {
    if (name !== field) console.log(`Using existing FAQ.${field} for ${name}.`);
  }
  for (const { collection, fields } of resolvedDefinitions) {
    const existing = collectionList.find(
      (item) => item.collection === collection,
    );
    if (existing)
      validateExistingCollection(
        existing,
        fieldsByCollection.get(collection)!,
        fields,
      );
  }
  const existingDelegates = await api<Delegate[]>("/items/Delegates?limit=-1");
  const identityPlan = await planDelegateLinks(existingDelegates);
  if (identityPlan.unresolved.length)
    console.log(
      `Delegate records need a numeric WCA user ID in the editor: ${identityPlan.unresolved.join(
        ", ",
      )}. Existing content will stay unchanged.`,
    );
  const blockSources = collections.has("SiteContent")
    ? await api<Record<string, unknown>[]>("/items/SiteContent?limit=-1")
    : [];
  const structuredSources = new Map(
    blockSources.flatMap((source) => {
      const id = String(source.id);
      if (!source.page || source.deleted) return [];
      if (id === "home.cards" && source.blockType !== "cards")
        return [
          [id, { cardItems: splitHomeCards(String(source.body || "")) }],
        ] as [string, Record<string, unknown>][];
      if (
        (id === "home.title" || pageIds.some((page) => id === `${page}.1`)) &&
        source.blockType !== "pageTitle"
      )
        return [[id, splitPageHeading(String(source.body || ""))]] as [
          string,
          Record<string, unknown>,
        ][];
      return [];
    }),
  );
  const legacyParent = blockSources.find((item) => item.id === "parents.3");
  const parentQuestions =
    legacyParent && !legacyParent.blockType
      ? splitParentFaq(String(legacyParent.body || ""))
      : [];
  if (checkOnly) {
    console.log(
      `${identityPlan.updates.length} delegate records need WCA account details.`,
    );
    console.log("Schema check passed. No changes were made.");
    return;
  }
  const delegateFields = fieldsByCollection.get("Delegates")!;
  const needsStatus = !delegateFields.some((field) => field.field === "status");
  const legacyDelegates = needsStatus
    ? await api<{ id: string }[]>("/items/Delegates?limit=-1&fields=id")
    : [];

  // Prevent anonymous reads and writes before new draft fields or collections exist.
  const permissions = await api<
    {
      id: number;
      collection: string;
      role?: string | null;
      policy?: string;
      action: string;
    }[]
  >("/permissions?limit=-1");
  const permissionFields = await api<Field[]>("/fields/directus_permissions");
  const usesPolicies = permissionFields.some(
    (field) => field.field === "policy",
  );
  const publicPolicies = usesPolicies
    ? new Set(
        (
          await api<{ policy: string }[]>(
            `/access?limit=-1&filter=${encodeURIComponent(
              JSON.stringify({
                _and: [{ role: { _null: true } }, { user: { _null: true } }],
              }),
            )}`,
          )
        ).map((access) => access.policy),
      )
    : new Set<string>();
  const cmsCollections = definitions.map((definition) => definition.collection);
  const publicRules = permissions.filter((permission) =>
    usesPolicies
      ? publicPolicies.has(permission.policy || "")
      : permission.role === null,
  );
  if (publicRules.some((permission) => permission.collection === "*"))
    throw new Error(
      "A public wildcard permission exists. Remove public access to CMS collections before this setup.",
    );
  for (const permission of publicRules.filter((rule) =>
    cmsCollections.includes(rule.collection),
  )) {
    await api(`/permissions/${permission.id}`, "DELETE");
    console.log(`Removed anonymous access to ${permission.collection}.`);
  }

  const delegatesDefinition = definitions[0];
  await ensureCollection(
    "Delegates",
    delegatesDefinition.fields,
    delegatesDefinition.note,
    collections,
    delegateFields,
  );
  for (const update of identityPlan.updates) {
    await api(
      `/items/Delegates/${encodeURIComponent(update.id)}`,
      "PATCH",
      update.body,
    );
    console.log(
      `Updated WCA account details for delegate record ${update.id}.`,
    );
  }
  for (const delegate of legacyDelegates) {
    await api(
      `/items/Delegates/${encodeURIComponent(String(delegate.id))}`,
      "PATCH",
      { status: "published" },
    );
  }
  for (const { collection, fields, note } of resolvedDefinitions.slice(1)) {
    await ensureCollection(
      collection,
      fields,
      note,
      collections,
      fieldsByCollection.get(collection),
    );
  }

  const existingContent = new Set(
    (await api<{ id: string }[]>("/items/SiteContent?limit=-1&fields=id")).map(
      (item) => item.id,
    ),
  );
  // Store field names with the content so the website needs no schema access.
  const fieldMapRecord = {
    body: JSON.stringify(faqFields),
    status: "hidden",
  };
  if (existingContent.has(faqFieldMapId)) {
    const current = await api<{ body: string; status: string }>(
      `/items/SiteContent/${faqFieldMapId}`,
    );
    if (
      current.body !== fieldMapRecord.body ||
      current.status !== fieldMapRecord.status
    )
      await api(`/items/SiteContent/${faqFieldMapId}`, "PATCH", fieldMapRecord);
  } else {
    await api("/items/SiteContent", "POST", {
      id: faqFieldMapId,
      ...fieldMapRecord,
    });
  }
  const contentRecords = await api<
    { id: string; label?: string; page?: string; blockType?: string }[]
  >("/items/SiteContent?limit=-1");
  for (const { id, body, status, label, page } of defaults) {
    if (!existingContent.has(id))
      await api("/items/SiteContent", "POST", {
        id,
        body,
        status,
        label,
        page,
      });
    else {
      const current = contentRecords.find((item) => item.id === id);
      const metadata = {
        ...(!current?.label ? { label } : {}),
        ...(!current?.page && !current?.blockType ? { page } : {}),
      };
      if (Object.keys(metadata).length)
        await api(
          `/items/SiteContent/${encodeURIComponent(id)}`,
          "PATCH",
          metadata,
        );
    }
  }
  if (!existingContent.has("__setup_navigation_v1")) {
    const existingLinks = new Set(
      (
        await api<{ id: number }[]>("/items/SiteNavigation?limit=-1&fields=id")
      ).map((item) => item.id),
    );
    for (const item of navigation)
      if (!existingLinks.has(item.id))
        await api("/items/SiteNavigation", "POST", item);
    await api("/items/SiteContent", "POST", {
      id: "__setup_navigation_v1",
      body: "",
      status: "hidden",
      label: "Navigation setup marker",
      page: "internal",
    });
  }
  if (!usesPolicies) {
    const roles = await api<
      { id: string; name: string; admin_access: boolean; app_access: boolean }[]
    >("/roles?limit=-1&fields=id,name,admin_access,app_access");
    const role = roles.find(
      (item) =>
        item.name === "PNW Website Service" &&
        !item.admin_access &&
        !item.app_access,
    );
    if (role) {
      const rules = permissions.filter(
        (item) => item.role === role.id && item.collection === "SiteNavigation",
      );
      for (const rule of rules.filter(
        (item) => !["read", "update"].includes(item.action),
      ))
        await api(`/permissions/${rule.id}`, "DELETE");
      for (const action of ["read", "update"]) {
        const body = {
          role: role.id,
          collection: "SiteNavigation",
          action,
          permissions: { id: { _in: [5, 8] } },
          validation: {},
          presets: {},
          fields: action === "read" ? ["id", "href"] : ["href"],
        };
        const existingRule = rules.find((item) => item.action === action);
        await api(
          existingRule ? `/permissions/${existingRule.id}` : "/permissions",
          existingRule ? "PATCH" : "POST",
          body,
        );
      }
    }
  }
  const pages = new Set(
    (await api<{ id: string }[]>("/items/Pages?limit=-1&fields=id")).map(
      (item) => item.id,
    ),
  );
  for (const id of [...pageIds, "internal"])
    if (!pages.has(id))
      await api("/items/Pages?fields=id,title", "POST", {
        id,
        title:
          id === "parents"
            ? "For Parents"
            : id === "about"
            ? "About Us"
            : id === "internal"
            ? "Internal settings"
            : id.charAt(0).toUpperCase() + id.slice(1),
      });
  const currentBlocks = await api<Record<string, unknown>[]>(
    "/items/SiteContent?limit=-1",
  );
  const legacyQuestions = collections.has("FAQ")
    ? await api<Record<string, unknown>[]>("/items/FAQ?limit=-1&sort=sort,id")
    : [];
  for (const source of currentBlocks) {
    const legacyHeading =
      source.id === "home.title" ||
      pageIds.some((page) => source.id === `${page}.1`);
    const needsHeading = legacyHeading && source.blockType !== "pageTitle";
    const needsCards =
      source.id === "home.cards" && source.blockType !== "cards";
    if (source.blockType && !needsHeading && !needsCards) continue;
    // A native unlink must stay unlinked on later setup runs.
    if (source.blockType && (!source.page || source.deleted)) continue;
    const page = String(
      source.page || defaults.find((item) => item.id === source.id)?.page || "",
    );
    if (!pageIds.includes(page)) continue;
    const original = defaultPageBlocks(page).find(
      (item) => item.id === source.id,
    );
    if (!original) continue;
    const update: Record<string, unknown> = {
      page,
      blockType: original.blockType,
      sort: original.sort,
      title: original.title,
      faqItems: [],
      subtitle: "",
      cardItems: [],
    };
    if (legacyHeading) {
      const heading =
        structuredSources.get(String(source.id)) ||
        splitPageHeading(String(source.body || ""));
      update.title = heading.title;
      update.subtitle = heading.subtitle;
      // The Contact record contains both its heading and body. Copy body into a new block and keep the original HTML.
      if (
        source.id === "contact.1" &&
        heading.remainder &&
        !currentBlocks.some((item) => item.id === contactBodyId)
      ) {
        await api("/items/SiteContent", "POST", {
          id: contactBodyId,
          page,
          blockType: "text",
          title: "",
          subtitle: "",
          body: heading.remainder,
          status: source.status,
          sort: Number(source.sort || 0) + 1,
          faqItems: [],
          cardItems: [],
        });
      }
    }
    if (needsCards || source.id === "home.cards")
      update.cardItems = (
        structuredSources.get("home.cards") || {
          cardItems: splitHomeCards(String(source.body || "")),
        }
      ).cardItems;
    if (source.id === "parents.3") {
      update.faqItems = legacyParent ? parentQuestions : original.faqItems;
      const heading = DomUtils.findOne(
        (node) => node.type === "tag" && /^h[1-6]$/.test(node.name),
        parseDocument(String(source.body || "")).children,
        true,
      );
      update.title = heading ? DomUtils.textContent(heading) : "";
    } else if (source.id === "competing.7")
      update.faqItems = legacyQuestions.length
        ? legacyQuestions.map((item, index) => ({
            id: `competition-faq-${item.id}`,
            question: String(item[faqFields.question] || ""),
            answer: String(item[faqFields.answer] || ""),
            status:
              item.status === "hidden" || item.status === "draft"
                ? "hidden"
                : "published",
          }))
        : original.faqItems;
    await api(
      `/items/SiteContent/${encodeURIComponent(String(source.id))}`,
      "PATCH",
      update,
    );
  }
  const relations =
    await api<{ collection: string; field: string }[]>("/relations");
  if (
    !relations.some(
      (item) => item.collection === "SiteContent" && item.field === "page",
    )
  )
    await api("/relations", "POST", {
      collection: "SiteContent",
      field: "page",
      related_collection: "Pages",
      schema: { on_delete: "RESTRICT" },
      meta: {
        one_field: "blocks",
        sort_field: "sort",
        one_deselect_action: "nullify",
      },
    });
  const flowName = "Assign page block IDs";
  const flows = await api<{ id: string; name: string }[]>("/flows?limit=-1");
  let idFlow = flows.find((flow) => flow.name === flowName);
  if (!idFlow)
    idFlow = await api<{ id: string; name: string }>("/flows", "POST", {
      name: flowName,
      status: "inactive",
      trigger: "event",
      accountability: "all",
      options: {
        type: "filter",
        scope: ["items.create"],
        collections: ["SiteContent"],
        return: "assign_block_id",
      },
    });
  const operations = await api<{ id: string; key: string }[]>(
    `/operations?limit=-1&filter=${encodeURIComponent(
      JSON.stringify({ flow: { _eq: idFlow.id } }),
    )}`,
  );
  let idOperation = operations.find(
    (operation) => operation.key === "assign_block_id",
  );
  const operationConfig = {
    name: "Assign block ID",
    key: "assign_block_id",
    type: "exec",
    flow: idFlow.id,
    position_x: 20,
    position_y: 20,
    options: {
      code: "module.exports = function(data) { var value = data.$trigger.payload; if (!value.id) { var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) { var r = Math.floor(Math.random()*16); return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); value.id = String(value.page || 'page') + '.block.' + uuid; } return value; }",
    },
  };
  if (!idOperation)
    idOperation = await api<{ id: string; key: string }>(
      "/operations",
      "POST",
      operationConfig,
    );
  await api(`/flows/${idFlow.id}`, "PATCH", {
    status: "active",
    operation: idOperation.id,
    options: {
      type: "filter",
      scope: ["items.create"],
      collections: ["SiteContent"],
      return: "assign_block_id",
    },
  });
  await api("/collections/SiteContent", "PATCH", {
    meta: {
      sort_field: "sort",
      display_template: "{{page}}: {{blockType}} {{title}}",
    },
  });
  await api("/collections/Pages", "PATCH", {
    meta: { display_template: "{{title}}" },
  });
  if (!usesPolicies) {
    const roles = await api<
      { id: string; name: string; admin_access: boolean; app_access: boolean }[]
    >("/roles?limit=-1&fields=id,name,admin_access,app_access");
    const role = roles.find(
      (item) =>
        item.name === "PNW Website Service" &&
        !item.admin_access &&
        !item.app_access,
    );
    if (role)
      for (const action of ["create"]) {
        if (
          !permissions.some(
            (item) =>
              item.role === role.id &&
              item.collection === "SiteContent" &&
              item.action === action,
          )
        )
          await api("/permissions", "POST", {
            role: role.id,
            collection: "SiteContent",
            action,
            permissions: {},
            validation: { page: { _in: pageIds } },
            fields: ["*"],
          });
      }
  }
  const existingFaq = new Set(
    (await api<{ id: number }[]>("/items/FAQ?limit=-1&fields=id")).map(
      (item) => item.id,
    ),
  );
  if (!existingContent.has("__setup_faq_v1")) {
    for (const item of faq) {
      if (!existingFaq.has(item.id))
        await api("/items/FAQ", "POST", encodeFaqItem(item, faqFields));
    }
    await api("/items/SiteContent", "POST", {
      id: "__setup_faq_v1",
      body: "",
      status: "hidden",
    });
  }
  console.log(
    "CMS setup is complete. Configure the website service token before deployment.",
  );
}

if (require.main === module) {
  setupCms({ checkOnly: process.argv.includes("--check") }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
