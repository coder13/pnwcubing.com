"use client";
import React, { useEffect } from "react";

export function NoticeToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(
      onDismiss,
      Math.max(5000, Math.min(message.length * 55, 12000)),
    );
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-green-200 bg-white p-4 text-green-900 shadow-lg max-sm:left-5 max-sm:right-5"
    >
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100"
      >
        ✓
      </span>
      <p className="grow text-sm">{message}</p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className="rounded px-1 text-lg leading-6 hover:bg-green-50 focus-visible:outline focus-visible:outline-2"
      >
        ×
      </button>
    </div>
  );
}
