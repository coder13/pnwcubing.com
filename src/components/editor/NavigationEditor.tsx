"use client";
import React, { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import defaults from "@/content/default-navigation.json";
import { editableNavigationLinks } from "@/lib/editor/navigationSettings";

export function NavigationEditor({
  links,
  onDirty,
  onSaved,
}: {
  links: { id: number; href: string }[];
  onDirty: (value: boolean) => void;
  onSaved: (notice: string) => void;
}) {
  const router = useRouter();
  const initial = Object.fromEntries(
    editableNavigationLinks.map((link) => [
      link.id,
      links.find((item) => item.id === link.id)?.href ||
        defaults.find((item) => item.id === link.id)!.href,
    ]),
  );
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const changed = editableNavigationLinks.filter(
    (link) => values[link.id] !== initial[link.id],
  );
  const dirty = changed.length > 0;
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      for (const link of changed) {
        const response = await fetch(`/api/editor/SiteNavigation/${link.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ href: values[link.id] }),
        });
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "Links could not be saved.");
        }
      }
      onDirty(false);
      onSaved("Link URLs saved.");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Links could not be saved. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-5" aria-labelledby="navigation-title">
      <div>
        <h2 id="navigation-title" className="text-2xl font-bold">
          Navigation
        </h2>
        <p className="mt-1 text-gray-600">
          Edit the Merch and Public Documents URLs. Website page links, labels,
          and layout stay fixed.
        </p>
      </div>
      <form onSubmit={save} className="space-y-4">
        <fieldset
          disabled={busy}
          className="space-y-4 rounded-lg border p-4 disabled:opacity-60"
        >
          {editableNavigationLinks.map((link) => (
            <label key={link.id} className="block space-y-2 font-semibold">
              {link.label} URL
              <input
                type="url"
                required
                maxLength={2048}
                value={values[link.id]}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [link.id]: event.target.value,
                  }))
                }
                className="w-full rounded border border-gray-400 bg-white p-2 font-normal text-gray-900"
              />
            </label>
          ))}
          <button
            type="submit"
            disabled={!dirty}
            className="rounded bg-primary px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save links"}
          </button>
        </fieldset>
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
