import React from "react";
import { editablePages } from "@/lib/editor/pages";

export function PagesList({ onSelect }: { onSelect: (page: string) => void }) {
  return (
    <section className="space-y-5" aria-labelledby="pages-title">
      <div>
        <h2 id="pages-title" className="text-2xl font-bold">
          Pages
        </h2>
        <p className="mt-1 text-gray-600">
          Choose a page to edit its content. Header links are managed in
          Navigation.
        </p>
      </div>
      <ul
        className="divide-y rounded-lg border bg-white"
        aria-label="Website pages"
      >
        {editablePages.map((page) => (
          <li
            key={page.id}
            className="flex flex-wrap items-center justify-between gap-4 p-4"
          >
            <div className="min-w-0">
              <button
                type="button"
                className="text-left text-lg font-semibold text-primary hover:underline"
                onClick={() => onSelect(page.id)}
              >
                {page.title}
              </button>
              <p className="break-all text-sm text-gray-500">{page.href}</p>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <button
                type="button"
                onClick={() => onSelect(page.id)}
                aria-label={`Edit ${page.title}`}
                className="rounded border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-blue-50"
              >
                Edit
              </button>
              <a
                href={page.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View ${page.title}`}
                className="text-sm text-gray-600 underline"
              >
                View
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
