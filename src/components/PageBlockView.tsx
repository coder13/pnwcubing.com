import React from "react";
import type { PageBlock } from "@/lib/editor/blocks";
import { safeCardUrl } from "@/lib/editor/blockValidation";
import { safeHtml } from "@/lib/editor/html";

export function PageBlockView({
  block,
  bare = false,
}: {
  block: PageBlock;
  bare?: boolean;
}) {
  if (block.deleted || block.status !== "published") return null;
  if (block.blockType === "pageTitle") {
    const heading = (
      <>
        <h1 className={bare ? "text-5xl md:text-7xl" : "text-4xl"}>
          {block.title}
        </h1>
        {block.subtitle && <p className="mt-3 text-lg">{block.subtitle}</p>}
      </>
    );
    return bare ? (
      <header className="py-12">{heading}</header>
    ) : (
      <header className="flex w-full justify-center px-4 py-6">
        <div className="w-full md:w-2/3">{heading}</div>
      </header>
    );
  }
  if (block.blockType === "cards") {
    const cards = (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8">
        {(block.cardItems || [])
          .filter((card) => card.status !== "hidden")
          .map((card) => (
            <article
              key={card.id}
              className="flex flex-col gap-4 rounded-lg bg-white p-6 text-left text-gray-900 shadow-md"
            >
              <h2 className="text-lg font-bold md:text-2xl">{card.title}</h2>
              <div
                className="rich-text grow text-sm text-gray-700 md:text-base"
                dangerouslySetInnerHTML={{ __html: safeHtml(card.body) }}
              />
              {safeCardUrl(card.href) && (
                <a
                  href={card.href}
                  className="self-start rounded bg-primary px-4 py-2 text-white"
                >
                  {card.linkText}
                </a>
              )}
            </article>
          ))}
      </div>
    );
    return bare ? (
      <section className="py-4">{cards}</section>
    ) : (
      <section className="flex w-full justify-center px-4 py-4">
        <div className="w-full md:w-2/3">{cards}</div>
      </section>
    );
  }
  const content =
    block.blockType === "faq" ? (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">
          {block.title || "Frequently Asked Questions"}
        </h2>
        <div className="space-y-6 text-gray-900">
          {block.faqItems
            .filter((item) => item.status !== "hidden")
            .map((item) => (
              <section key={item.id} className="space-y-2">
                <h3 className="font-semibold">{item.question}</h3>
                <div
                  className="rich-text"
                  dangerouslySetInnerHTML={{ __html: safeHtml(item.answer) }}
                />
              </section>
            ))}
        </div>
      </div>
    ) : (
      <div
        className="rich-text cms-content"
        dangerouslySetInnerHTML={{ __html: safeHtml(block.body) }}
      />
    );
  if (bare && block.blockType === "text")
    return (
      <div
        className={
          block.id === "home.title" ? "text-6xl md:text-7xl py-12" : "py-4"
        }
      >
        {content}
      </div>
    );
  return (
    <section
      className={`flex w-full justify-center px-4 py-4 leading-8 ${
        block.blockType === "highlight"
          ? "bg-secondary bg-opacity-80"
          : "bg-white"
      }`}
    >
      <div className="w-full md:w-2/3">{content}</div>
    </section>
  );
}
