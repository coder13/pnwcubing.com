"use client";
import React from "react";
import type { Editor } from "@tiptap/core";
import type { IconType } from "react-icons";
import {
  LuBold,
  LuChevronDown,
  LuHeading1,
  LuHeading2,
  LuHeading3,
  LuHeading4,
  LuHeading5,
  LuHeading6,
  LuImage,
  LuItalic,
  LuLink,
  LuList,
  LuListOrdered,
  LuRedo2,
  LuType,
  LuUnderline,
  LuUndo2,
  LuYoutube,
} from "react-icons/lu";

function ToolbarButton({
  label,
  icon: Icon,
  active,
  title,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: IconType;
  active?: boolean;
}) {
  return (
    <button
      {...props}
      type="button"
      aria-label={label}
      title={title || label}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent aria-pressed:bg-blue-100 aria-pressed:text-primary"
    >
      <Icon aria-hidden="true" focusable="false" className="h-5 w-5" />
    </button>
  );
}

const headingIcons = [
  LuType,
  LuHeading1,
  LuHeading2,
  LuHeading3,
  LuHeading4,
  LuHeading5,
  LuHeading6,
];
export function EditorToolbar({
  editor,
  label,
  disabled,
  linkOpen,
  mediaTool,
  onLink,
  onMedia,
}: {
  editor: Editor | null;
  label: string;
  disabled: boolean;
  linkOpen: boolean;
  mediaTool: "image" | "video" | null;
  onLink: () => void;
  onMedia: (tool: "image" | "video") => void;
}) {
  const unavailable = !editor || disabled;
  const level = editor?.isActive("heading")
    ? Number(editor.getAttributes("heading").level)
    : 0;
  const HeadingIcon = headingIcons[level] || LuType;
  const group = "flex items-center gap-0.5";
  const divider = "border-l border-gray-200 pl-1.5";
  return (
    <div
      role="toolbar"
      aria-label={`${label} formatting`}
      className="flex flex-wrap items-center gap-x-1.5 gap-y-1 border-b border-gray-200 bg-gray-50 p-1.5"
    >
      <div role="group" aria-label="History" className={group}>
        <ToolbarButton
          label="Undo"
          icon={LuUndo2}
          disabled={unavailable || !editor?.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
        />
        <ToolbarButton
          label="Redo"
          icon={LuRedo2}
          disabled={unavailable || !editor?.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
        />
      </div>
      <div className={divider}>
        <div
          className={`relative flex h-10 w-14 items-center justify-center gap-1 rounded-md text-gray-600 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${
            unavailable ? "opacity-40" : "hover:bg-gray-200"
          }`}
        >
          <HeadingIcon
            aria-hidden="true"
            focusable="false"
            className="h-5 w-5"
          />
          <LuChevronDown
            aria-hidden="true"
            focusable="false"
            className="h-3 w-3"
          />
          <select
            aria-label={`${label} text style`}
            title={
              level ? `Text style: Heading ${level}` : "Text style: Paragraph"
            }
            disabled={unavailable}
            value={level ? String(level) : "paragraph"}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            onChange={(event) => {
              if (event.target.value === "paragraph")
                editor?.chain().focus().setParagraph().run();
              else
                editor
                  ?.chain()
                  .focus()
                  .setHeading({
                    level: Number(event.target.value) as 1 | 2 | 3 | 4 | 5 | 6,
                  })
                  .run();
            }}
          >
            <option value="paragraph">Paragraph</option>
            {[1, 2, 3, 4, 5, 6].map((value) => (
              <option key={value} value={value}>
                Heading {value}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div
        role="group"
        aria-label="Text formatting"
        className={`${group} ${divider}`}
      >
        <ToolbarButton
          label="Bold"
          icon={LuBold}
          disabled={unavailable}
          active={editor?.isActive("bold") || false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="Italic"
          icon={LuItalic}
          disabled={unavailable}
          active={editor?.isActive("italic") || false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="Underline"
          icon={LuUnderline}
          disabled={unavailable}
          active={editor?.isActive("underline") || false}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        />
      </div>
      <div role="group" aria-label="Lists" className={`${group} ${divider}`}>
        <ToolbarButton
          label="Bulleted list"
          icon={LuList}
          disabled={unavailable}
          active={editor?.isActive("bulletList") || false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="Numbered list"
          icon={LuListOrdered}
          disabled={unavailable}
          active={editor?.isActive("orderedList") || false}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        />
      </div>
      <div role="group" aria-label="Insert" className={`${group} ${divider}`}>
        <ToolbarButton
          label="Link"
          title="Add or edit link (Ctrl+K or ⌘K)"
          icon={LuLink}
          disabled={unavailable}
          active={linkOpen || editor?.isActive("link") || false}
          aria-haspopup="dialog"
          aria-expanded={linkOpen}
          onClick={onLink}
        />
        <ToolbarButton
          label="Image"
          icon={LuImage}
          disabled={unavailable}
          active={mediaTool === "image"}
          aria-expanded={mediaTool === "image"}
          onClick={() => onMedia("image")}
        />
        <ToolbarButton
          label="YouTube"
          icon={LuYoutube}
          disabled={unavailable}
          active={mediaTool === "video"}
          aria-expanded={mediaTool === "video"}
          onClick={() => onMedia("video")}
        />
      </div>
    </div>
  );
}
