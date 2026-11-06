"use client";

import classNames from "classnames";
import { NoticeToast } from "./NoticeToast";
import { NavigationEditor } from "./NavigationEditor";
import { PagesList } from "./PagesList";
import { PageEditor } from "./PageEditor";
import { RichTextEditor } from "./RichTextEditor";
import { blocksForPage } from "@/lib/editor/blocks";
import { editablePages } from "@/lib/editor/pages";
import { DelegateList, publicationClass } from "./DelegateList";
import React, { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { editorUrl, parseEditorRoute } from "@/lib/editor/routes";
import type { Delegate } from "@/lib/directus";
import type {
  ContentCollection,
  FAQItem,
  NavigationItem,
  SiteContent,
  SiteEditor,
} from "@/lib/editor/types";
import defaults from "@/content/default-content.json";

type RecordData = Record<string, string | number | boolean>;
type Props = {
  isEditor: boolean;
  delegates: Delegate[];
  faq: FAQItem[];
  content: SiteContent[];
  editors: SiteEditor[];
  bootstrapIds: number[];
  navigation?: NavigationItem[];
  initialPath?: string;
};
const inputClass =
  "w-full rounded border border-gray-400 bg-white p-2 text-gray-900";
const buttonClass =
  "rounded bg-primary px-4 py-2 text-white disabled:opacity-50";
const labels: Record<ContentCollection, string> = {
  SiteContent: "Pages",
  Delegates: "Delegates",
  FAQ: "FAQs",
  SiteNavigation: "Navigation",
  SiteEditors: "Editor access",
};

export function EditorWorkspace(props: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const pathname = usePathname();
  const route = parseEditorRoute(
    pathname ||
      props.initialPath ||
      (props.isEditor ? "/admin/pages" : "/admin/delegates"),
  )!;
  const collection = route.collection;
  const contentPage = route.page;
  const selected = route.selected;
  const creating = route.creating;
  const [notice, setToast] = useState<{ message: string; id: number } | null>(
    null,
  );
  const setNotice = useCallback(
    (message: string) =>
      setToast((current) =>
        message ? { message, id: (current?.id || 0) + 1 } : null,
      ),
    [],
  );
  const dismissNotice = useCallback(() => setToast(null), []);
  const [dirty, setDirty] = useState(false);
  const selectedId =
    !props.isEditor && props.delegates.length === 1
      ? String(props.delegates[0].id)
      : selected;
  const records = {
    Delegates: props.delegates,
    FAQ: props.faq,
    SiteContent: props.content,
    SiteEditors: props.editors,
    SiteNavigation: props.navigation || [],
  }[collection] as unknown as RecordData[];
  const record = records.find((item) => String(item.id) === selectedId);
  const regions = Array.from(
    new Set(props.delegates.map((delegate) => delegate.region)),
  ).sort();

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirty) event.preventDefault();
    }
    const currentUrl = window.location.href;
    const currentState = window.history.state;
    function onBack(event: PopStateEvent) {
      if (!dirty) return;
      if (window.confirm("Discard your unsaved changes?")) {
        setDirty(false);
        return;
      }
      event.stopImmediatePropagation();
      window.history.pushState(currentState, "", currentUrl);
    }
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("popstate", onBack, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", onBack, true);
    };
  }, [dirty, pathname]);

  function select(next: () => void) {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    setDirty(false);
    setNotice("");
    next();
  }

  async function sync() {
    if (
      dirty &&
      !window.confirm("Discard your unsaved changes and sync delegates?")
    )
      return;
    setDirty(false);
    router.replace("/admin/delegates");
    setSyncing(true);
    setSyncError("");
    setNotice("");
    try {
      const response = await fetch("/api/editor/delegates/sync", {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Sync failed. Try again.");
      setNotice(
        `Sync complete. ${result.data.added} added as hidden, ${result.data.updated} updated. ${result.data.missing} no longer in the tracked WCA list. Visibility and archive choices stayed the same.`,
      );
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : "Sync failed. Try again.",
      );
    } finally {
      setSyncing(false);
      router.refresh();
    }
  }

  return (
    <div
      className={
        props.isEditor
          ? "grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)]"
          : "space-y-5"
      }
    >
      {props.isEditor && (
        <nav
          aria-label="Editor navigation"
          className="flex flex-wrap gap-2 self-start md:sticky md:top-4 md:flex-col md:rounded-lg md:border md:bg-gray-50 md:p-3"
        >
          {(Object.keys(labels) as ContentCollection[])
            .filter((value) => value !== "FAQ")
            .map((value) => (
              <button
                key={value}
                aria-pressed={
                  collection === value ||
                  (collection === "FAQ" && value === "SiteContent")
                }
                className={
                  collection === value ||
                  (collection === "FAQ" && value === "SiteContent")
                    ? `${buttonClass} text-left`
                    : "rounded border px-4 py-2 text-left hover:bg-white"
                }
                onClick={() =>
                  select(() => {
                    router.push(editorUrl(value));
                  })
                }
              >
                {labels[value]}
              </button>
            ))}
        </nav>
      )}
      <div className="min-w-0 space-y-5">
        {notice && (
          <NoticeToast
            key={notice.id}
            message={notice.message}
            onDismiss={dismissNotice}
          />
        )}
        {collection === "SiteNavigation" ? (
          <NavigationEditor
            key={JSON.stringify(props.navigation)}
            links={props.navigation || []}
            onDirty={setDirty}
            onSaved={setNotice}
          />
        ) : collection === "SiteContent" ? (
          (() => {
            const page = editablePages.find((item) => item.id === contentPage);
            const sections = page ? blocksForPage(page.id, props.content) : [];
            return page ? (
              <PageEditor
                key={`${page.id}:${JSON.stringify(sections)}`}
                page={page}
                sections={sections}
                onBack={() => select(() => router.push("/admin/pages"))}
                onDirty={setDirty}
                onSaved={setNotice}
              />
            ) : (
              <PagesList
                onSelect={(page) =>
                  select(() => router.push(editorUrl("SiteContent", page)))
                }
              />
            );
          })()
        ) : (
          <>
            <h2 className="text-2xl font-bold">
              {props.isEditor ? labels[collection] : "Your profile"}
            </h2>
            <p>
              {props.isEditor
                ? "Create or select a record. Save your changes to update Directus."
                : "You can edit your profile details and publication status. Your WCA account IDs are read-only. Either you or a full editor can show or hide your profile."}
            </p>
            {props.isEditor && collection === "SiteEditors" && (
              <p>
                This list controls WCA editor access. For editors without a WCA
                account,{" "}
                <a
                  href="https://admin.pnwcubing.com/admin/users"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  manage Directus users
                </a>{" "}
                and assign the Content-Editor role.
              </p>
            )}
            {props.isEditor && collection === "Delegates" && (
              <div className="space-y-2 rounded border p-4">
                <button
                  type="button"
                  className={buttonClass}
                  disabled={syncing}
                  onClick={sync}
                >
                  {syncing ? "Syncing…" : "Sync WCA delegates"}
                </button>
                <p className="text-sm text-gray-600">
                  Import active delegates from Pacific Northwest and Canada
                  (West). New profiles start hidden. Existing visibility,
                  archives, and profile details stay the same.
                </p>
                {syncError && (
                  <p role="alert" className="text-red-700">
                    {syncError}
                  </p>
                )}
              </div>
            )}
            <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
              <div className="space-y-3">
                {props.isEditor && (
                  <button
                    className={buttonClass}
                    onClick={() =>
                      select(() => {
                        router.push(editorUrl(collection, "new"));
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
                {collection === "Delegates" ? (
                  <DelegateList
                    delegates={props.delegates}
                    selectedId={creating ? "" : selectedId}
                    onSelect={(id) =>
                      select(() => {
                        router.push(editorUrl(collection, id));
                      })
                    }
                  />
                ) : (
                  <ul
                    className="max-h-[60vh] space-y-1 overflow-auto"
                    aria-label={labels[collection]}
                  >
                    {records.map((item) => (
                      <li key={String(item.id)}>
                        <button
                          aria-pressed={selectedId === String(item.id)}
                          className={classNames(
                            "w-full rounded border p-3 text-left",
                            publicationClass(item.status),
                            {
                              "ring-2 ring-primary ring-offset-1":
                                selectedId === String(item.id) && !creating,
                            },
                          )}
                          onClick={() =>
                            select(() => {
                              router.push(
                                editorUrl(collection, String(item.id)),
                              );
                            })
                          }
                        >
                          <span className="block font-semibold">
                            {String(
                              item.name ||
                                item.label ||
                                item.question ||
                                defaults
                                  .filter((entry) => entry.id === item.id)
                                  .map(
                                    (entry) => `${entry.page}: ${entry.label}`,
                                  )
                                  .join("") ||
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
                )}
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
                      creating ? "new" : selectedId
                    }:${JSON.stringify(record)}`}
                    collection={collection}
                    record={creating ? undefined : record}
                    isEditor={props.isEditor}
                    regions={regions}
                    navigation={props.navigation || []}
                    locked={
                      collection === "SiteEditors" &&
                      !!record &&
                      props.bootstrapIds.includes(Number(record.id))
                    }
                    onDirty={setDirty}
                    onSaved={(id, message) => {
                      router.replace(editorUrl(collection, id));
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
          </>
        )}
      </div>
    </div>
  );
}

function RecordForm({
  collection,
  record,
  isEditor,
  regions,
  navigation,
  locked,
  onDirty,
  onSaved,
}: {
  collection: ContentCollection;
  record?: RecordData;
  isEditor: boolean;
  regions: string[];
  navigation: NavigationItem[];
  locked: boolean;
  onDirty: (value: boolean) => void;
  onSaved: (id: string, message: string) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wcaStatus, setWcaStatus] = useState(String(record?.wcaStatus || ""));
  const fields: Record<ContentCollection, RecordData> = {
    Delegates: {
      name: "",
      wcaUserId: "",
      wcaId: "",
      email: "",
      region: "",
      description: "",
      status: "hidden",
      sort: 0,
    },
    FAQ: { question: "", answer: "", status: "draft", sort: 0 },
    SiteContent: { body: "", status: "published" },
    SiteNavigation: { href: "" },
    SiteEditors: { name: "", active: true, ...(!record ? { id: "" } : {}) },
  };
  const [values, setValues] = useState<RecordData>(() =>
    Object.fromEntries(
      Object.entries(fields[collection]).map(([key, fallback]) => [
        key,
        key === "status" &&
        collection === "Delegates" &&
        record?.status === "draft"
          ? "hidden"
          : record?.[key] ?? fallback,
      ]),
    ),
  );

  function field(name: string, value: string | number | boolean) {
    setValues((current) => ({ ...current, [name]: value }));
    onDirty(true);
  }
  async function lookup() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/editor/delegates/lookup?userId=${encodeURIComponent(
          String(values.wcaUserId),
        )}`,
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "The WCA account could not load.");
      setWcaStatus(result.data.wcaStatus);
      setValues((current) => ({
        ...current,
        wcaId: result.data.wcaId,
        ...(!record
          ? { name: result.data.name, email: result.data.email }
          : {}),
      }));
      onDirty(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The WCA account could not load.",
      );
    } finally {
      setBusy(false);
    }
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
                  Object.fromEntries(
                    Object.entries(values).filter(
                      ([name]) =>
                        collection !== "Delegates" ||
                        (name !== "wcaId" &&
                          (isEditor || name !== "wcaUserId")),
                    ),
                  ),
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
          : collection === "SiteNavigation"
          ? "header link"
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
      {collection === "Delegates" &&
        (wcaStatus === "trainee_delegate" || !record) && (
          <div className="space-y-1 text-sm text-gray-600">
            {wcaStatus === "trainee_delegate" && (
              <p className="font-semibold text-amber-900">
                Trainee delegate emails stay private and do not appear on the
                public page.
              </p>
            )}
            {!record && (
              <p>
                Add any WCA account by its numeric user ID. A competitor ID is
                optional.
              </p>
            )}
          </div>
        )}
      {locked && (
        <p>This account has permanent access through the site configuration.</p>
      )}
      <fieldset
        disabled={busy || locked}
        className="space-y-4 disabled:opacity-60"
      >
        {Object.entries(values).map(([name, value]) => {
          const label =
            (
              {
                wcaId: "WCA competitor ID",
                wcaUserId: "WCA user ID (number)",
                region: "Local region",
                id: "WCA user ID (number)",
                description: "Blurb",
                body: "Content",
                sort: "Display order",
                active: "Allow full content access",
                href: "Destination URL",
                label: "Link text",
                kind: "Link type",
                parent: "Parent menu",
                newTab: "Open in a new tab",
              } as Record<string, string>
            )[name] || name[0].toUpperCase() + name.slice(1);
          const fieldId = `editor-${collection}-${name}`;
          return (
            <div key={name} className="block space-y-1">
              <label htmlFor={fieldId} className="font-semibold">
                {label}
              </label>
              {name === "active" || name === "newTab" ? (
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
                  {collection !== "Delegates" && (
                    <option value="draft">Draft</option>
                  )}
                  <option value="published">Published</option>
                  <option value="hidden">Hidden</option>
                  {collection === "Delegates" && isEditor && (
                    <option value="archived">Archived</option>
                  )}
                </select>
              ) : ["body", "answer", "description"].includes(name) ? (
                <div id={fieldId}>
                  <RichTextEditor
                    label={label}
                    value={String(value)}
                    onChange={(value) => field(name, value)}
                    disabled={busy || locked}
                  />
                </div>
              ) : (
                <input
                  id={fieldId}
                  className={`${inputClass} read-only:bg-gray-100 read-only:text-gray-600`}
                  type={
                    name === "sort" || name === "id" || name === "wcaUserId"
                      ? "number"
                      : name === "email"
                      ? "email"
                      : "text"
                  }
                  min={name === "id" || name === "wcaUserId" ? 1 : 0}
                  maxLength={name === "href" ? 2048 : 300}
                  readOnly={
                    name === "wcaId" ||
                    (name === "wcaUserId" && (!isEditor || !!record?.wcaUserId))
                  }
                  required={[
                    "name",
                    "wcaUserId",
                    "question",
                    "id",
                    "label",
                  ].includes(name)}
                  list={name === "region" ? "delegate-regions" : undefined}
                  value={String(value)}
                  onChange={(event) =>
                    field(
                      name,
                      name === "sort" || name === "id" || name === "wcaUserId"
                        ? event.target.value === ""
                          ? ""
                          : Number(event.target.value)
                        : event.target.value,
                    )
                  }
                />
              )}
              {collection === "Delegates" &&
                name === "wcaUserId" &&
                isEditor &&
                !record?.wcaUserId && (
                  <button
                    type="button"
                    className="rounded border px-3 py-2"
                    onClick={lookup}
                  >
                    Look up WCA account
                  </button>
                )}
            </div>
          );
        })}
        <datalist id="delegate-regions">
          {regions.map((region) => (
            <option key={region} value={region} />
          ))}
        </datalist>
        <div className="flex gap-3">
          <button type="submit" className={buttonClass}>
            {busy ? "Saving…" : "Save changes"}
          </button>
          {isEditor &&
            record &&
            collection !== "SiteContent" &&
            collection !== "Delegates" && (
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
