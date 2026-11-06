"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/lib/editor/types";
import { AccountControl } from "./AccountControl";

export function Header({ navigation }: { navigation: NavigationItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const roots = navigation.filter(
    (item) => item.parent === 0 && item.kind !== "brand",
  );
  function link(item: NavigationItem) {
    return (
      <Link
        href={item.href}
        target={item.newTab ? "_blank" : undefined}
        rel={item.newTab ? "noopener noreferrer" : undefined}
        aria-current={pathname === item.href ? "page" : undefined}
        className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 aria-[current=page]:text-primary"
      >
        {item.label}
      </Link>
    );
  }
  return (
    <header className="relative z-50 flex min-h-[5rem] items-center bg-white px-4 py-2 shadow-md">
      <div className="mx-auto flex w-full flex-wrap items-center justify-center gap-3">
        <div className="flex items-center gap-3">
          <nav
            key={pathname}
            aria-label="Main navigation"
            className="hidden items-center lg:flex"
          >
            {roots.map((item) =>
              item.kind === "menu" ? (
                <details key={item.id} className="relative">
                  <summary className="cursor-pointer rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    {item.label}
                  </summary>
                  <ul className="absolute right-0 min-w-[12rem] rounded border bg-white p-2 shadow-lg">
                    {navigation
                      .filter((child) => child.parent === item.id)
                      .map((child) => (
                        <li key={child.id}>{link(child)}</li>
                      ))}
                  </ul>
                </details>
              ) : (
                <React.Fragment key={item.id}>{link(item)}</React.Fragment>
              ),
            )}
          </nav>
          <div className="absolute right-4 top-6">
            <AccountControl />
          </div>
          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
            className="rounded border px-3 py-2 lg:hidden"
          >
            Menu
          </button>
        </div>
        {open && (
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="w-full border-t bg-white lg:hidden"
          >
            <ul>
              {roots.map((item) =>
                item.kind === "menu" ? (
                  <li key={item.id}>
                    <span className="block px-3 pt-3 text-sm font-semibold">
                      {item.label}
                    </span>
                    <ul className="pl-3">
                      {navigation
                        .filter((child) => child.parent === item.id)
                        .map((child) => (
                          <li key={child.id}>{link(child)}</li>
                        ))}
                    </ul>
                  </li>
                ) : (
                  <li key={item.id}>{link(item)}</li>
                ),
              )}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
