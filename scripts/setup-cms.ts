import { loadEnvConfig } from "@next/env";
import defaults from "../src/content/default-content.json";
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
    fields: [primary(false, "string"), text("body", "text"), publication],
    note: "Website sections. Keep the existing IDs.",
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
    { id: number; collection: string; role?: string | null; policy?: string }[]
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
  const cmsCollections = ["Delegates", "FAQ", "SiteContent", "SiteEditors"];
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
  for (const { id, body, status } of defaults) {
    if (!existingContent.has(id))
      await api("/items/SiteContent", "POST", { id, body, status });
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
