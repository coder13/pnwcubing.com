import { loadEnvConfig } from "@next/env";
import defaults from "../src/content/default-content.json";
import faq from "../src/content/default-faq.json";

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
  if (!response.ok)
    throw new Error(
      `Directus returned ${response.status} for ${method} ${
        path.split("?")[0]
      }.`,
    );
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

async function ensureCollection(
  collection: string,
  fields: Field[],
  note: string,
  existing: Set<string>,
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
    const current = await api<Field[]>(`/fields/${collection}`);
    for (const field of fields) {
      if (!current.some((value) => value.field === field.field)) {
        await api(`/fields/${collection}`, "POST", field);
        console.log(`Added ${collection}.${field.field}.`);
      }
    }
  }
}

export async function setupCms() {
  const collections = new Set(
    (await api<{ collection: string }[]>("/collections")).map(
      (item) => item.collection,
    ),
  );
  if (!collections.has("Delegates"))
    throw new Error(
      "The existing Delegates collection was not found. No changes were made.",
    );
  const delegateFields = await api<Field[]>("/fields/Delegates");
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

  await ensureCollection(
    "Delegates",
    [publication, sort],
    "Delegate profiles. The website publishes only published records.",
    collections,
  );
  for (const delegate of legacyDelegates) {
    await api(
      `/items/Delegates/${encodeURIComponent(String(delegate.id))}`,
      "PATCH",
      { status: "published" },
    );
  }
  await ensureCollection(
    "FAQ",
    [
      primary(true),
      text("question"),
      text("answer", "text"),
      publication,
      sort,
    ],
    "Competition FAQ questions.",
    collections,
  );
  await ensureCollection(
    "SiteContent",
    [primary(false, "string"), text("body", "text"), publication],
    "Website sections. Keep the existing IDs.",
    collections,
  );
  await ensureCollection(
    "SiteEditors",
    [
      primary(false),
      text("name"),
      {
        field: "active",
        type: "boolean",
        schema: { default_value: true },
        meta: { interface: "boolean" },
      },
    ],
    "Full website editors. The ID is a numeric WCA user ID.",
    collections,
  );

  const existingContent = new Set(
    (await api<{ id: string }[]>("/items/SiteContent?limit=-1&fields=id")).map(
      (item) => item.id,
    ),
  );
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
      if (!existingFaq.has(item.id)) await api("/items/FAQ", "POST", item);
    }
    await api("/items/SiteContent", "POST", {
      id: "__setup_faq_v1",
      body: "",
      status: "hidden",
    });
  }
  const existingEditors = await api<{ id: number }[]>(
    "/items/SiteEditors?limit=-1&fields=id",
  );
  if (!existingEditors.some((item) => item.id === 8184)) {
    await api("/items/SiteEditors", "POST", {
      id: 8184,
      name: "Cailyn Sinclair",
      active: true,
    });
  }
  console.log(
    "CMS setup is complete. Configure the website service token before deployment.",
  );
}

if (require.main === module) {
  setupCms().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
