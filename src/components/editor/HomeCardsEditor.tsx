"use client";
import React from "react";
import { moveItem, type HomeCardItem } from "@/lib/editor/blocks";
import { RichTextEditor } from "./RichTextEditor";

export function HomeCardsEditor({
  items,
  onChange,
  disabled,
}: {
  items: HomeCardItem[];
  onChange: (items: HomeCardItem[]) => void;
  disabled: boolean;
}) {
  const button =
    "rounded border bg-white px-3 py-2 text-sm disabled:opacity-40";
  function change(id: string, patch: Partial<HomeCardItem>) {
    onChange(
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Edit each home feed card. The website applies the card layout and
        colors.
      </p>
      {items.map((item, index) => (
        <section
          key={item.id}
          aria-label={`Home feed card ${index + 1}`}
          className="space-y-3 rounded border bg-white p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="mr-auto font-semibold">Card {index + 1}</h4>
            <button
              type="button"
              className={button}
              disabled={index === 0}
              aria-label={`Move card ${index + 1} up`}
              onClick={() => onChange(moveItem(items, index, -1))}
            >
              Up
            </button>
            <button
              type="button"
              className={button}
              disabled={index === items.length - 1}
              aria-label={`Move card ${index + 1} down`}
              onClick={() => onChange(moveItem(items, index, 1))}
            >
              Down
            </button>
            <button
              type="button"
              className={`${button} text-red-700`}
              aria-label={`Remove card ${index + 1}`}
              onClick={() =>
                onChange(items.filter((card) => card.id !== item.id))
              }
            >
              Remove
            </button>
          </div>
          {(
            [
              ["title", "Card title", 300],
              ["linkText", "Link text", 100],
              ["href", "Destination URL", 2000],
            ] as const
          ).map(([field, label, max]) => (
            <label key={field} className="block space-y-1 font-semibold">
              {label}
              <input
                required
                maxLength={max}
                className="w-full rounded border p-2 font-normal"
                value={item[field]}
                onChange={(event) =>
                  change(item.id, { [field]: event.target.value })
                }
              />
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={item.status !== "hidden"}
              onChange={(event) =>
                change(item.id, {
                  status: event.target.checked ? "published" : "hidden",
                })
              }
            />
            Show this card
          </label>
          <p className="font-semibold">Description</p>
          <RichTextEditor
            label={`Card ${index + 1} description`}
            value={item.body}
            disabled={disabled}
            onChange={(body) => change(item.id, { body })}
          />
        </section>
      ))}
      <button
        type="button"
        className={button}
        onClick={() =>
          onChange([
            ...items,
            {
              id: crypto.randomUUID(),
              title: "",
              body: "",
              href: "",
              linkText: "Learn more",
              status: "published",
            },
          ])
        }
      >
        Add card
      </button>
    </div>
  );
}
