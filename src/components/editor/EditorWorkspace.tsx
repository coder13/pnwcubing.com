"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Delegate } from "@/lib/directus";
import type {
  ContentCollection,
  FAQItem,
  SiteContent,
  SiteEditor,
} from "@/lib/editor/types";
import defaults from "@/content/default-content.json";
import { safeHtml } from "@/lib/editor/html";

type RecordData = Record<string, string | number | boolean>;
type Props = {
  isEditor: boolean;
  delegates: Delegate[];
  faq: FAQItem[];
  content: SiteContent[];
  editors: SiteEditor[];
  bootstrapIds: number[];
};
const inputClass =
  "w-full rounded border border-gray-400 bg-white p-2 text-gray-900";
const buttonClass =
  "rounded bg-primary px-4 py-2 text-white disabled:opacity-50";
const labels: Record<ContentCollection, string> = {
  Delegates: "Delegates",
  FAQ: "FAQ questions",
  SiteContent: "Page content",
  SiteEditors: "Editor access",
};

export function EditorWorkspace(props: Props) {
  const [collection, setCollection] = useState<ContentCollection>("Delegates");
  const [selected, setSelected] = useState("");
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const records = {
    Delegates: props.delegates,
    FAQ: props.faq,
    SiteContent: props.content,
    SiteEditors: props.editors,
  }[collection] as unknown as RecordData[];
  const record = records.find((item) => String(item.id) === selected);
  const regions = Array.from(
    new Set(props.delegates.map((delegate) => delegate.region)),
  ).sort();

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirty) event.preventDefault();
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  function select(next: () => void) {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    setDirty(false);
    setNotice("");
    next();
  }

  return (
    <div className="space-y-5">
      {props.isEditor && (
        <nav aria-label="Content types" className="flex flex-wrap gap-2">
          {(Object.keys(labels) as ContentCollection[]).map((value) => (
            <button
              key={value}
              aria-pressed={collection === value}
              className={
                collection === value ? buttonClass : "rounded border px-4 py-2"
              }
              onClick={() =>
                select(() => {
                  setCollection(value);
                  setSelected("");
                  setCreating(false);
                })
              }
            >
              {labels[value]}
            </button>
          ))}
        </nav>
      )}
      <p>
        {props.isEditor
          ? "Create or select a record. Save your changes to update Directus."
          : "You can edit your blurb. A site editor manages your profile details and publication status."}
      </p>
      <p role="status" aria-live="polite" className="text-green-800">
        {notice}
      </p>
      <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
        <div className="space-y-3">
          {props.isEditor && collection !== "SiteContent" && (
            <button
              className={buttonClass}
              onClick={() =>
                select(() => {
                  setSelected("");
                  setCreating(true);
                })
              }
            >
              Add{" "}
              {collection === "FAQ"
                ? "question"
                : collection === "SiteEditors"
                ? "editor"
                : "delegate"}
            </button>
          )}
          <ul
            className="max-h-[60vh] space-y-1 overflow-auto"
            aria-label={labels[collection]}
          >
            {records.map((item) => (
              <li key={String(item.id)}>
                <button
                  aria-pressed={selected === String(item.id)}
                  className={`w-full rounded border p-3 text-left ${
                    selected === String(item.id) && !creating
                      ? "border-primary bg-blue-50"
                      : "border-gray-200"
                  }`}
                  onClick={() =>
                    select(() => {
                      setSelected(String(item.id));
                      setCreating(false);
                    })
                  }
                >
                  <span className="block font-semibold">
                    {String(
                      item.name ||
                        item.question ||
                        defaults.find((entry) => entry.id === item.id)?.label ||
                        item.id,
                    )}
                  </span>
                  <span className="text-sm text-gray-600">
                    {String(
                      item.status ||
                        (item.active === false
                          ? "Inactive"
                          : collection === "SiteEditors"
                          ? `WCA user ${item.id}`
                          : ""),
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!records.length && !creating && (
            <p>
              {props.isEditor
                ? "No records yet."
                : "Your WCA account has no delegate profile here. Ask a site editor to add one."}
            </p>
          )}
        </div>
        <div>
          {creating || record ? (
            <RecordForm
              key={`${collection}:${
                creating ? "new" : selected
              }:${JSON.stringify(record)}`}
              collection={collection}
              record={creating ? undefined : record}
              isEditor={props.isEditor}
              regions={regions}
              locked={
                collection === "SiteEditors" &&
                !!record &&
                props.bootstrapIds.includes(Number(record.id))
              }
              onDirty={setDirty}
              onSaved={(id, message) => {
                setSelected(id);
                setCreating(false);
                setDirty(false);
                setNotice(message);
              }}
            />
          ) : (
            <p className="rounded border border-dashed p-6">
              Select a record to edit it.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RecordForm({
  collection,
  record,
  isEditor,
  regions,
  locked,
  onDirty,
  onSaved,
}: {
  collection: ContentCollection;
  record?: RecordData;
  isEditor: boolean;
  regions: string[];
  locked: boolean;
  onDirty: (value: boolean) => void;
  onSaved: (id: string, message: string) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const fields: Record<ContentCollection, RecordData> = {
    Delegates: {
      name: "",
      wcaId: "",
      email: "",
      region: "",
      description: "",
      status: "draft",
      sort: 0,
    },
    FAQ: { question: "", answer: "", status: "draft", sort: 0 },
    SiteContent: { body: "", status: "published" },
    SiteEditors: { name: "", active: true, ...(!record ? { id: "" } : {}) },
  };
  const [values, setValues] = useState<RecordData>(() =>
    Object.fromEntries(
      Object.entries(fields[collection]).map(([key, fallback]) => [
        key,
        record?.[key] ?? fallback,
      ]),
    ),
  );

  function field(name: string, value: string | number | boolean) {
    setValues((current) => ({ ...current, [name]: value }));
    onDirty(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    await mutate(record ? "PATCH" : "POST");
  }
  async function mutate(method: string) {
    if (
      method === "DELETE" &&
      !window.confirm("Delete this record? This action cannot be undone.")
    )
      return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/editor/${collection}${
          record ? `/${encodeURIComponent(String(record.id))}` : ""
        }`,
        {
          method,
          headers: { "Content-Type": "application/json" },
          ...(method !== "DELETE"
            ? {
                body: JSON.stringify(
                  isEditor ? values : { description: values.description },
                ),
              }
            : {}),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "The content could not be saved.");
      onSaved(
        method === "DELETE" ? "" : String(result.data?.id ?? record?.id ?? ""),
        method === "DELETE" ? "Record deleted." : "Changes saved.",
      );
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The content could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <h2 className="text-2xl font-bold">
        {record ? "Edit" : "Add"}{" "}
        {collection === "SiteContent"
          ? "page section"
          : collection === "FAQ"
          ? "question"
          : collection === "SiteEditors"
          ? "editor"
          : "delegate"}
      </h2>
      {collection === "SiteContent" && (
        <p>
          {String(record?.id)}. Published content appears on the site. Hidden
          content is blank. Draft content uses the original site text.
        </p>
      )}
      {collection === "SiteEditors" && (
        <p>
          Full editors can change all content and grant access to other editors.
          Use the numeric WCA user ID.
        </p>
      )}
      {locked && (
        <p>This account has permanent access through the site configuration.</p>
      )}
      <fieldset
        disabled={busy || locked}
        className="space-y-4 disabled:opacity-60"
      >
        {Object.entries(values)
          .filter(([name]) => isEditor || name === "description")
          .map(([name, value]) => {
            const label =
              (
                {
                  wcaId: "WCA ID",
                  id: "WCA user ID (number)",
                  description: "Blurb",
                  body: "Content (HTML)",
                  sort: "Display order",
                  active: "Allow full content access",
                } as Record<string, string>
              )[name] || name[0].toUpperCase() + name.slice(1);
            const fieldId = `editor-${collection}-${name}`;
            return (
              <div key={name} className="block space-y-1">
                <label htmlFor={fieldId} className="font-semibold">
                  {label}
                </label>
                {name === "active" ? (
                  <input
                    id={fieldId}
                    type="checkbox"
                    checked={!!value}
                    onChange={(event) => field(name, event.target.checked)}
                    className="ml-3"
                  />
                ) : name === "status" ? (
                  <select
                    id={fieldId}
                    className={inputClass}
                    value={String(value)}
                    onChange={(event) => field(name, event.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="hidden">Hidden</option>
                  </select>
                ) : ["body", "answer", "description"].includes(name) ? (
                  <textarea
                    id={fieldId}
                    className={`${inputClass} ${
                      name === "body" ? "font-mono text-sm" : ""
                    }`}
                    rows={name === "body" ? 18 : 8}
                    maxLength={name === "body" ? 100000 : 10000}
                    value={String(value)}
                    onChange={(event) => field(name, event.target.value)}
                  />
                ) : (
                  <input
                    id={fieldId}
                    className={inputClass}
                    type={
                      name === "sort" || name === "id"
                        ? "number"
                        : name === "email"
                        ? "email"
                        : "text"
                    }
                    min={name === "id" ? 1 : 0}
                    maxLength={300}
                    required={[
                      "name",
                      "wcaId",
                      "region",
                      "question",
                      "id",
                    ].includes(name)}
                    list={name === "region" ? "delegate-regions" : undefined}
                    value={String(value)}
                    onChange={(event) =>
                      field(
                        name,
                        name === "sort" || name === "id"
                          ? event.target.value === ""
                            ? ""
                            : Number(event.target.value)
                          : event.target.value,
                      )
                    }
                  />
                )}
              </div>
            );
          })}
        <datalist id="delegate-regions">
          {regions.map((region) => (
            <option key={region} value={region} />
          ))}
        </datalist>
        {collection === "SiteContent" && (
          <>
            <p className="text-sm">
              Use HTML for headings, paragraphs, links, lists, and images.
              Scripts and unsafe HTML are removed. New style classes need a code
              change.
            </p>
            <button
              type="button"
              className="rounded border px-4 py-2"
              onClick={() => setPreview(!preview)}
            >
              {preview ? "Hide preview" : "Show preview"}
            </button>
            {preview && (
              <div
                aria-label="Content preview"
                className="cms-content rounded border p-4"
                dangerouslySetInnerHTML={{
                  __html: safeHtml(String(values.body)),
                }}
              />
            )}
          </>
        )}
        <div className="flex gap-3">
          <button type="submit" className={buttonClass}>
            {busy ? "Saving…" : "Save changes"}
          </button>
          {isEditor && record && collection !== "SiteContent" && (
            <button
              type="button"
              className="rounded border border-red-700 px-4 py-2 text-red-700"
              onClick={() => mutate("DELETE")}
            >
              Delete
            </button>
          )}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
