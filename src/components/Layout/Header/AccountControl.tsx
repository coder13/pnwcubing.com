"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { loginHistory, safeAvatar } from "@/lib/editor/account";

type Account = { name: string; avatar: string | null };
export function AccountControl() {
  const pathname = usePathname();
  const [user, setUser] = useState<Account | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  useEffect(() => {
    let active = true;
    let controller: AbortController | undefined;
    async function check() {
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
          credentials: "same-origin",
          signal: requestController.signal,
        });
        if (!response.ok) throw new Error("Session unavailable");
        const data = await response.json();
        if (!active) return;
        const account =
          data.user && typeof data.user.name === "string"
            ? { name: data.user.name, avatar: safeAvatar(data.user.avatar) }
            : null;
        let returning = false;
        try {
          returning = loginHistory(localStorage, !!account);
        } catch {
          /* Storage can be disabled. */
        }
        setUser(account);
        setShowLogin(!account && returning);
      } catch {
        if (!active || requestController.signal.aborted) return;
        setUser(null);
        setShowLogin(false);
      }
    }
    void check();
    window.addEventListener("focus", check);
    const timer = window.setInterval(check, 60000);
    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener("focus", check);
      window.clearInterval(timer);
    };
  }, [pathname]);
  if (user)
    return (
      <Link
        href="/admin"
        aria-label={`Open editor for ${user.name}`}
        title={user.name}
        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-700"
      >
        {user.avatar ? (
          <Image
            src={user.avatar}
            width={36}
            height={36}
            alt={user.name}
            className="h-9 w-9 object-cover"
          />
        ) : (
          <span aria-hidden="true">{user.name.trim().slice(0, 1)}</span>
        )}
      </Link>
    );
  return showLogin ? (
    <Link href="/login" className="text-sm text-gray-600 hover:underline">
      login
    </Link>
  ) : null;
}
