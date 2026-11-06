"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Dropdown, MegaMenu, Navbar } from "flowbite-react";
import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/lib/editor/types";
import { AccountControl } from "./AccountControl";

export function Header({ navigation }: { navigation: NavigationItem[] }) {
  const pathname = usePathname();
  const roots = navigation.filter(
    (item) => item.parent === 0 && item.kind !== "brand",
  );
  return (
    <MegaMenu
      key={pathname}
      aria-label="Main navigation"
      className="relative z-50 flex min-h-20 shadow-md"
      theme={{
        root: {
          base: "bg-white px-2 py-2.5 sm:px-4",
          inner: {
            base: "mx-auto flex w-full flex-wrap items-center justify-between",
          },
        },
        collapse: {
          base: "w-full lg:block lg:w-auto",
          list: "mt-4 flex flex-col gap-1 lg:mt-0 lg:flex-row lg:items-center lg:gap-8 lg:text-sm lg:font-medium",
        },
        link: {
          base: "block py-2 pl-3 pr-4 lg:p-0",
          active: {
            on: "bg-primary text-white lg:bg-transparent lg:text-primary",
            off: "border-b border-gray-100 text-gray-700 hover:bg-gray-50 lg:border-0 lg:hover:bg-transparent lg:hover:text-primary",
          },
        },
        toggle: {
          base: "inline-flex items-center rounded-lg p-2 text-sm text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 lg:hidden",
        },
      }}
    >
      <div className="flex w-full flex-wrap items-center justify-between gap-x-6">
        <Navbar.Brand
          href="/"
          as={Link}
          aria-label="PNW Cubing home"
          className="mr-6 shrink-0"
        >
          <Image
            alt="Pacific Northwest Cubing Logo"
            src="/full.svg"
            className="-m-6 h-28"
            width={200}
            height={100}
          />
        </Navbar.Brand>
        <div className="ml-auto mr-12 flex items-center gap-3 lg:order-last lg:ml-0 lg:mr-0">
          <div className="absolute right-4 top-6">
            <AccountControl />
          </div>
          <Navbar.Toggle aria-label="Toggle navigation" />
        </div>
        <Navbar.Collapse className="lg:mx-auto">
          {roots.map((item) => {
            const children = navigation.filter(
              (child) => child.parent === item.id,
            );
            return item.kind === "menu" ? (
              <li key={item.id}>
                <Dropdown
                  inline
                  label={item.label}
                  placement="bottom"
                  theme={{
                    inlineWrapper: `group flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-gray-50 lg:w-auto lg:p-0 lg:hover:bg-transparent lg:hover:text-primary ${
                      children.some((child) => child.href === pathname)
                        ? "text-primary"
                        : "text-gray-700"
                    }`,
                    arrowIcon:
                      "ml-2 h-4 w-4 transition-transform group-aria-expanded:rotate-180",
                    floating: {
                      base: "z-50 w-56 divide-y divide-gray-100 rounded-lg shadow-lg focus:outline-none",
                      style: {
                        auto: "border border-gray-200 bg-white text-gray-700",
                      },
                      item: {
                        base: "flex w-full items-center rounded px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
                      },
                    },
                    content: "p-2",
                  }}
                >
                  {children.map((child) => (
                    <Dropdown.Item
                      key={child.id}
                      as={Link}
                      href={child.href}
                      target={child.newTab ? "_blank" : undefined}
                      rel={child.newTab ? "noopener noreferrer" : undefined}
                      aria-current={
                        pathname === child.href ? "page" : undefined
                      }
                    >
                      {child.label}
                    </Dropdown.Item>
                  ))}
                </Dropdown>
              </li>
            ) : (
              <Navbar.Link
                key={item.id}
                as={Link}
                href={item.href}
                active={pathname === item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                target={item.newTab ? "_blank" : undefined}
                rel={item.newTab ? "noopener noreferrer" : undefined}
              >
                {item.label}
              </Navbar.Link>
            );
          })}
        </Navbar.Collapse>
      </div>
    </MegaMenu>
  );
}
