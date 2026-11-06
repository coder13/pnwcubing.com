"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension, Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { TextSelection } from "@tiptap/pm/state";
import { linkDraft, type LinkDraft } from "@/lib/editor/linkEditing";
import { EditorToolbar } from "./EditorToolbar";
import { LinkEditorPopover } from "./LinkEditorPopover";
import { safeHtml } from "@/lib/editor/html";

const LegacyDiv = Node.create({
  name: "legacyDiv",
  group: "block",
  content: "block*",
  parseHTML: () => [{ tag: "div" }],
  renderHTML: ({ HTMLAttributes }) => ["div", HTMLAttributes, 0],
});
const Attributes = Extension.create({
  name: "preserveContentAttributes",
  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "bulletList",
          "orderedList",
          "listItem",
          "blockquote",
          "legacyDiv",
          "image",
          "link",
        ],
        attributes: { class: { default: null }, id: { default: null } },
      },
    ];
  },
});
const ContentImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      height: { default: null },
      loading: { default: null },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
    ];
  },
});

export function RichTextEditor({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
}) {
  const change = useRef(onChange);
  change.current = onChange;
  const [tool, setTool] = useState<"image" | "video" | null>(null);
  const [editingLink, setEditingLink] = useState<LinkDraft | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, defaultProtocol: "https" },
      }),
      LegacyDiv,
      Attributes,
      ContentImage,
      Youtube.configure({ nocookie: true }),
    ],
    content: safeHtml(value),
    editable: !disabled,
    editorProps: {
      handleClick: (view, position, event) => {
        const anchor =
          event.target instanceof HTMLElement
            ? event.target.closest("a")
            : null;
        if (
          !view.editable ||
          event.button !== 0 ||
          !anchor ||
          !view.dom.contains(anchor)
        )
          return false;
        const draft = linkDraft(
          view.state,
          position,
          anchor.getAttribute("href") || "",
        );
        if (!draft.existing) return false;
        event.preventDefault();
        view.dispatch(
          view.state.tr.setSelection(
            TextSelection.create(view.state.doc, draft.from, draft.to),
          ),
        );
        setTool(null);
        setEditingLink(draft);
        return true;
      },
      handleKeyDown: (view, event) => {
        if (
          !view.editable ||
          !(event.ctrlKey || event.metaKey) ||
          event.altKey ||
          event.key.toLowerCase() !== "k"
        )
          return false;
        event.preventDefault();
        setTool(null);
        setEditingLink(linkDraft(view.state));
        return true;
      },
      attributes: {
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
        class: "rich-text min-h-[8rem] p-4 outline-none",
      },
    },
    onUpdate: ({ editor }) => change.current(editor.getHTML()),
  });
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);
  useEffect(() => {
    if (editor && editor.getHTML() !== value)
      editor.commands.setContent(safeHtml(value), { emitUpdate: false });
  }, [editor, value]);
  const closeLink = useCallback(
    (focusEditor: boolean) => {
      setEditingLink(null);
      if (focusEditor) editor?.commands.focus();
    },
    [editor],
  );
  function insert() {
    if (!editor) return;
    if (!/^(https?:\/\/|mailto:|\/[^/])/.test(url) || /[\s\\]/.test(url)) {
      setError("Enter an HTTPS URL or a local path.");
      return;
    }
    if (tool === "image")
      editor.chain().focus().setImage({ src: url, alt: "" }).run();
    else if (tool === "video") {
      if (!/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url)) {
        setError("Enter a YouTube video URL.");
        return;
      }
      editor.commands.setYoutubeVideo({ src: url });
    }
    setTool(null);
    setUrl("");
    setError("");
  }
  const button =
    "rounded border bg-white px-2 py-1 text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-40";
  return (
    <div className="overflow-hidden rounded border border-gray-400 bg-white">
      <EditorToolbar
        editor={editor}
        label={label}
        disabled={disabled}
        linkOpen={!!editingLink}
        mediaTool={tool}
        onLink={() => {
          if (!editor) return;
          setTool(null);
          setEditingLink(linkDraft(editor.state));
        }}
        onMedia={(name) => {
          setTool(tool === name ? null : name);
          setEditingLink(null);
          setUrl("");
          setError("");
        }}
      />
      {tool && (
        <div
          className="flex flex-wrap gap-2 border-b p-2"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              insert();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setTool(null);
              editor?.commands.focus();
            }
          }}
        >
          <label className="flex flex-1 items-center gap-2 text-sm">
            URL
            <input
              autoFocus
              className="min-w-0 flex-1 rounded border p-2"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>
          <button type="button" className={button} onClick={insert}>
            Apply
          </button>
          <button
            type="button"
            className={button}
            onClick={() => setTool(null)}
          >
            Cancel
          </button>
          {error && (
            <p role="alert" className="w-full text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      )}
      {editor && editingLink && !disabled && (
        <LinkEditorPopover
          key={`${editingLink.from}:${editingLink.to}:${editingLink.href}`}
          editor={editor}
          draft={editingLink}
          label={label}
          onClose={closeLink}
        />
      )}
      {editor ? (
        <EditorContent editor={editor} />
      ) : (
        <div
          aria-label={label}
          className="rich-text min-h-[8rem] p-4"
          dangerouslySetInnerHTML={{ __html: safeHtml(value) }}
        />
      )}
    </div>
  );
}
