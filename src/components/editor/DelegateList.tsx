import React from "react";
import classNames from "classnames";
import type { Delegate } from "@/lib/directus";
import { trackedWcaRegions } from "@/lib/wcaDelegates";

export function publicationClass(status: unknown) {
  return status === "published"
    ? "border-green-300 bg-green-50 text-green-950"
    : status === "archived"
    ? "border-gray-300 bg-gray-100 text-gray-700"
    : status === "hidden" || status === "draft"
    ? "border-amber-300 bg-amber-50 text-amber-950"
    : "border-gray-200 bg-white text-gray-900";
}
export function DelegateList({
  delegates,
  selectedId,
  onSelect,
}: {
  delegates: Delegate[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const groups = [
    ...trackedWcaRegions.map((region) => ({
      label: region.name,
      items: delegates.filter(
        (item) => item.status === "published" && item.wcaRegionId === region.id,
      ),
    })),
    {
      label: "Additional delegates",
      items: delegates.filter(
        (item) =>
          item.status === "published" &&
          !trackedWcaRegions.some((region) => region.id === item.wcaRegionId),
      ),
    },
    {
      label: "Hidden",
      items: delegates.filter(
        (item) => item.status !== "published" && item.status !== "archived",
      ),
    },
    {
      label: "Archived",
      items: delegates.filter((item) => item.status === "archived"),
    },
  ];
  return (
    <div
      aria-label="Delegates"
      className="max-h-[65vh] space-y-5 overflow-auto p-1"
    >
      {groups.map(({ label, items }) => (
        <section key={label} aria-label={label}>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            {label} ({items.length})
          </h2>
          {items.length ? (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={selectedId === String(item.id)}
                    className={classNames(
                      "w-full rounded border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      publicationClass(item.status),
                      {
                        "ring-2 ring-primary ring-offset-1":
                          selectedId === String(item.id),
                      },
                    )}
                    onClick={() => onSelect(String(item.id))}
                  >
                    <span className="block font-semibold">{item.name}</span>
                    <span className="block text-sm">
                      {item.status === "draft"
                        ? "Hidden"
                        : item.status[0].toUpperCase() + item.status.slice(1)}
                    </span>
                    <span className="block text-xs">
                      {item.wcaRegion || "Additional delegate"}
                    </span>
                    {item.wcaActive === false && item.wcaRegionId && (
                      <span className="mt-1 block text-xs font-semibold">
                        No longer in the tracked WCA list
                      </span>
                    )}
                    {!item.wcaUserId && (
                      <span className="mt-1 block text-xs font-semibold">
                        Needs WCA user ID
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No delegates.</p>
          )}
        </section>
      ))}
    </div>
  );
}
