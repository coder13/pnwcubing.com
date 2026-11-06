"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from "@floating-ui/dom";
import { changeLink, type LinkDraft } from "@/lib/editor/linkEditing";

export function LinkEditorPopover({
  editor,
  draft,
  label,
  onClose,
}: {
  editor: Editor;
  draft: LinkDraft;
  label: string;
  onClose: (focusEditor: boolean) => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const urlInput = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const [href, setHref] = useState(draft.href);
  const [text, setText] = useState(draft.text);
  const [error, setError] = useState("");
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  useEffect(() => {
    const element = panel.current;
    if (!element) return;
    let active = true;
    const anchor = {
      contextElement: editor.view.dom,
      getBoundingClientRect: () => {
        const at = editor.view.coordsAtPos(draft.to);
        return new DOMRect(at.left, at.top, 1, at.bottom - at.top);
      },
    };
    const stop = autoUpdate(anchor, element, () => {
      void computePosition(anchor, element, {
        placement: "bottom-start",
        strategy: "fixed",
        middleware: [offset(8), flip({ padding: 12 }), shift({ padding: 12 })],
      }).then(({ x, y }) => {
        if (active) setPosition({ x, y });
      });
    });
    return () => {
      active = false;
      stop();
    };
  }, [editor, draft]);
  const ready = position !== null;
  useEffect(() => {
    if (ready) {
      urlInput.current?.focus();
      urlInput.current?.select();
    }
  }, [ready]);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (
        event.target instanceof globalThis.Node &&
        !panel.current?.contains(event.target)
      )
        onClose(false);
    }
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [onClose]);
  function apply(remove = false) {
    try {
      editor.view.dispatch(
        changeLink(editor.state, draft, remove ? null : { href, text }),
      );
      onClose(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "This link could not be changed.",
      );
    }
  }
  const button = "rounded border px-3 py-2 text-sm hover:bg-gray-50";
  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-labelledby={headingId}
      aria-label={`${draft.existing ? "Edit" : "Add"} link in ${label}`}
      style={{
        left: position?.x || 0,
        top: position?.y || 0,
        visibility: position ? "visible" : "hidden",
      }}
      className="fixed z-[60] w-80 max-w-[calc(100vw-1.5rem)] space-y-3 rounded-lg border border-gray-300 bg-white p-4 text-gray-900 shadow-xl"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose(true);
        }
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
          event.stopPropagation();
          apply();
        }
      }}
    >
      <h3 id={headingId} className="font-semibold">
        {draft.existing ? "Edit link" : "Add link"}
      </h3>
      {draft.canEditText && (
        <label className="block space-y-1 text-sm">
          Link text
          <input
            className="w-full rounded border border-gray-400 p-2"
            value={text}
            placeholder="Use the URL as link text"
            onChange={(event) => setText(event.target.value)}
          />
        </label>
      )}
      <label className="block space-y-1 text-sm">
        URL
        <input
          ref={urlInput}
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded border border-gray-400 p-2"
          value={href}
          placeholder="https://example.com or /contact"
          onChange={(event) => setHref(event.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-primary px-3 py-2 text-sm text-white"
          onClick={() => apply()}
        >
          Apply link
        </button>
        {draft.existing && (
          <button
            type="button"
            className={`${button} text-red-700`}
            onClick={() => apply(true)}
          >
            Remove link
          </button>
        )}
        <button type="button" className={button} onClick={() => onClose(true)}>
          Cancel
        </button>
      </div>
    </div>,
    document.body,
  );
}
