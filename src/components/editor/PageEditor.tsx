"use client";
import React, { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { EditablePage } from "@/lib/editor/pages";
import {
  moveItem,
  type PageBlock,
  type BlockType,
  type FaqBlockItem,
} from "@/lib/editor/blocks";
import { saveBlocks } from "@/lib/editor/saveBlocks";
import { HomeCardsEditor } from "./HomeCardsEditor";
import { RichTextEditor } from "./RichTextEditor";
import { PageBlockView } from "../PageBlockView";

const names = {
  text: "Normal text",
  highlight: "Green highlight",
  faq: "FAQ list",
  cards: "Home feed cards",
  pageTitle: "Page title",
};
export function PageEditor({
  page,
  sections,
  onBack,
  onDirty,
  onSaved,
}: {
  page: EditablePage;
  sections: PageBlock[];
  onBack: () => void;
  onDirty: (value: boolean) => void;
  onSaved: (notice: string) => void;
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState(sections);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(blocks) !== JSON.stringify(sections);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  function blockNumber(index: number) {
    return blocks
      .slice(0, index + 1)
      .filter((block) => block.blockType !== "pageTitle").length;
  }
  function change(id: string, value: Partial<PageBlock>) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === id ? { ...block, ...value } : block,
      ),
    );
  }
  function add(type: BlockType) {
    setBlocks((current) => [
      ...current,
      {
        id: `${page.id}.block.${crypto.randomUUID()}`,
        page: page.id,
        blockType: type,
        title: type === "faq" ? "Frequently Asked Questions" : "",
        body: "",
        status: "published",
        sort: current.length,
        faqItems: [],
        cardItems: [],
        subtitle: "",
      },
    ]);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveBlocks(sections, blocks);
      onDirty(false);
      onSaved(`${page.title} saved.`);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The page could not be saved. Keep your changes open and retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  const button =
    "rounded border bg-white px-3 py-2 text-sm disabled:opacity-40";
  return (
    <section className="space-y-5">
      <nav aria-label="Breadcrumb" className="flex gap-2 text-sm text-gray-600">
        <button type="button" onClick={onBack} className="underline">
          Pages
        </button>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{page.title}</span>
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{page.title}</h2>
        <a
          href={page.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline"
        >
          View public page
        </a>
      </div>
      <p className="text-sm text-gray-600">
        Edit the page title and subtitle. Add text, a green highlight, or a
        list. Move blocks up or down to set their order. Save page to publish
        your changes.
      </p>
      <form onSubmit={save} className="space-y-5">
        <fieldset disabled={busy} className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 rounded border bg-gray-50 p-3">
            <button
              type="submit"
              disabled={!dirty}
              className="rounded bg-primary px-4 py-2 text-white disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save page"}
            </button>
            <button
              type="button"
              className={button}
              onClick={() => setPreview(!preview)}
            >
              {preview ? "Hide preview" : "Show preview"}
            </button>
            <span className="text-sm text-gray-600">
              {dirty ? "Unsaved changes" : "No unsaved changes"}
            </span>
          </div>
          {blocks.map((block, index) =>
            block.blockType === "pageTitle" ? (
              <section
                key={block.id}
                aria-label="Page heading"
                className="space-y-4 rounded-lg border bg-gray-50 p-4"
              >
                <h3 className="font-semibold">Page heading</h3>
                <label className="block space-y-1 font-semibold">
                  Page title
                  <input
                    required
                    maxLength={300}
                    className="w-full rounded border p-2 font-normal"
                    value={block.title}
                    onChange={(event) =>
                      change(block.id, { title: event.target.value })
                    }
                  />
                </label>
                <label className="block space-y-1 font-semibold">
                  Subtitle (optional)
                  <input
                    maxLength={500}
                    className="w-full rounded border p-2 font-normal"
                    value={block.subtitle || ""}
                    onChange={(event) =>
                      change(block.id, { subtitle: event.target.value })
                    }
                  />
                </label>
              </section>
            ) : (
              <section
                key={block.id}
                aria-label={`Block ${blockNumber(index)}: ${
                  names[block.blockType]
                }`}
                className={`space-y-4 rounded-lg border p-4 ${
                  block.blockType === "highlight"
                    ? "bg-secondary bg-opacity-30"
                    : "bg-gray-50"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="mr-auto font-semibold">
                    Block {blockNumber(index)}
                  </h3>
                  <select
                    aria-label={`Block ${blockNumber(index)} type`}
                    className={button}
                    value={block.blockType}
                    onChange={(event) =>
                      change(block.id, {
                        blockType: event.target.value as BlockType,
                      })
                    }
                  >
                    {Object.entries(names)
                      .filter(([type]) => type !== "pageTitle")
                      .map(([type, name]) => (
                        <option key={type} value={type}>
                          {name}
                        </option>
                      ))}
                  </select>
                  <select
                    aria-label={`Block ${blockNumber(index)} visibility`}
                    className={button}
                    value={block.status}
                    onChange={(event) =>
                      change(block.id, {
                        status: event.target.value as PageBlock["status"],
                      })
                    }
                  >
                    <option value="published">Published</option>
                    <option value="hidden">Hidden</option>
                    <option value="draft">Draft</option>
                  </select>
                  <button
                    type="button"
                    aria-label={`Move block ${blockNumber(index)} up`}
                    disabled={
                      index === 0 ||
                      blocks[index - 1]?.blockType === "pageTitle"
                    }
                    className={button}
                    onClick={() =>
                      setBlocks((current) => moveItem(current, index, -1))
                    }
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    aria-label={`Move block ${blockNumber(index)} down`}
                    disabled={index === blocks.length - 1}
                    className={button}
                    onClick={() =>
                      setBlocks((current) => moveItem(current, index, 1))
                    }
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove block ${blockNumber(index)}`}
                    className={`${button} text-red-700`}
                    onClick={() =>
                      setBlocks((current) =>
                        current.filter((item) => item.id !== block.id),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
                {block.blockType === "cards" ? (
                  <HomeCardsEditor
                    items={block.cardItems || []}
                    disabled={busy}
                    onChange={(cardItems) => change(block.id, { cardItems })}
                  />
                ) : block.blockType === "faq" ? (
                  <>
                    <label className="block space-y-1 font-semibold">
                      FAQ heading
                      <input
                        className="w-full rounded border p-2 font-normal"
                        value={block.title}
                        maxLength={300}
                        onChange={(event) =>
                          change(block.id, { title: event.target.value })
                        }
                      />
                    </label>
                    {block.faqItems.map((item, itemIndex) => (
                      <section
                        key={item.id}
                        className="space-y-3 rounded border bg-white p-3"
                        aria-label={`FAQ ${itemIndex + 1}`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="mr-auto font-semibold">
                            Question {itemIndex + 1}
                          </h4>
                          <button
                            type="button"
                            className={button}
                            disabled={itemIndex === 0}
                            aria-label={`Move question ${itemIndex + 1} up`}
                            onClick={() =>
                              change(block.id, {
                                faqItems: moveItem(
                                  block.faqItems,
                                  itemIndex,
                                  -1,
                                ),
                              })
                            }
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            className={button}
                            disabled={itemIndex === block.faqItems.length - 1}
                            aria-label={`Move question ${itemIndex + 1} down`}
                            onClick={() =>
                              change(block.id, {
                                faqItems: moveItem(
                                  block.faqItems,
                                  itemIndex,
                                  1,
                                ),
                              })
                            }
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            className={`${button} text-red-700`}
                            aria-label={`Remove question ${itemIndex + 1}`}
                            onClick={() =>
                              change(block.id, {
                                faqItems: block.faqItems.filter(
                                  (faq) => faq.id !== item.id,
                                ),
                              })
                            }
                          >
                            Remove
                          </button>
                        </div>
                        <label className="block space-y-1 font-semibold">
                          Question
                          <input
                            required
                            maxLength={300}
                            className="w-full rounded border p-2 font-normal"
                            value={item.question}
                            onChange={(event) =>
                              change(block.id, {
                                faqItems: block.faqItems.map((faq) =>
                                  faq.id === item.id
                                    ? { ...faq, question: event.target.value }
                                    : faq,
                                ),
                              })
                            }
                          />
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          Show this question
                          <input
                            type="checkbox"
                            checked={item.status !== "hidden"}
                            onChange={(event) =>
                              change(block.id, {
                                faqItems: block.faqItems.map((faq) =>
                                  faq.id === item.id
                                    ? {
                                        ...faq,
                                        status: event.target.checked
                                          ? "published"
                                          : "hidden",
                                      }
                                    : faq,
                                ),
                              })
                            }
                          />
                        </label>
                        <p className="font-semibold">Answer</p>
                        <RichTextEditor
                          label={`Answer ${itemIndex + 1}`}
                          value={item.answer}
                          disabled={busy}
                          onChange={(answer) =>
                            change(block.id, {
                              faqItems: block.faqItems.map((faq) =>
                                faq.id === item.id ? { ...faq, answer } : faq,
                              ),
                            })
                          }
                        />
                      </section>
                    ))}
                    <button
                      type="button"
                      className={button}
                      onClick={() =>
                        change(block.id, {
                          faqItems: [
                            ...block.faqItems,
                            {
                              id: crypto.randomUUID(),
                              question: "",
                              answer: "",
                              status: "published",
                            } as FaqBlockItem,
                          ],
                        })
                      }
                    >
                      Add question
                    </button>
                  </>
                ) : (
                  <RichTextEditor
                    label={`Block ${blockNumber(index)} content`}
                    value={block.body}
                    disabled={busy}
                    onChange={(body) => change(block.id, { body })}
                  />
                )}
              </section>
            ),
          )}
          <div className="flex flex-wrap gap-2">
            {Object.entries(names)
              .filter(([type]) => type !== "pageTitle")
              .map(([type, name]) => (
                <button
                  key={type}
                  type="button"
                  className={button}
                  onClick={() => add(type as BlockType)}
                >
                  Add {name.toLowerCase()}
                </button>
              ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
      </form>
      {preview && (
        <section
          aria-label="Page preview"
          className="overflow-hidden rounded-lg border"
        >
          <h3 className="border-b bg-gray-50 p-3 font-semibold">
            {page.title} preview
          </h3>
          {blocks.map((block) => (
            <PageBlockView key={block.id} block={block} />
          ))}
        </section>
      )}
    </section>
  );
}
