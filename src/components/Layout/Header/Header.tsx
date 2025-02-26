"use client";

import Image from "next/image";
import { MegaMenu, Navbar } from "flowbite-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import classNames from "classnames";

const navItems = [
  {
    href: "/competitions",
    title: "Competitions",
  },
  {
    href: "/delegates",
    title: "Delegates",
  },
  {
    href: "/for-parents",
    title: "For Parents",
  },
  {
    title: "About",
    items: [
      {
        href: "/about",
        title: "About Us",
      },
      {
        href: "https://drive.google.com/drive/folders/1_8lCU2c5EOrkil0AOhS0EmhOLucsR5Ou?usp=drive_link",
        title: "Public Documents",
        openInNewTab: true,
      },
    ],
  },
  {
    href: "/contact",
    title: "Contact",
  },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <MegaMenu className="flex shadow-md z-50 xl:[&>div]:max-w-2/3 h-20">
      <div className="mx-auto flex flex-wrap items-center justify-between w-full">
        <Navbar.Brand href="/" as={Link}>
          <Image
            alt="Pacific Northwest Cubing Logo"
            src="/full.svg"
            className="h-28 -m-6"
            width={200}
            height={100}
          />
        </Navbar.Brand>
        <Navbar.Toggle onClick={() => setIsOpen((open) => !open)} />
        <Navbar.Collapse className="visible">
          {navItems.map((nav) => {
            if ("items" in nav && nav.items?.length) {
              return (
                <Navbar.Link key={nav.title}>
                  <MegaMenu.Dropdown toggle={<>{nav.title}</>}>
                    <ul className="grid grid-cols-1">
                      <div className="space-y-4 p-4">
                        {nav.items.map((item) => (
                          <Navbar.Link
                            key={item.href}
                            as={Link}
                            active={pathname === item.href}
                            href={item.href}
                            target={item.openInNewTab ? "_blank" : undefined}
                          >
                            <p>{item.title}</p>
                          </Navbar.Link>
                        ))}
                      </div>
                    </ul>
                  </MegaMenu.Dropdown>
                </Navbar.Link>
              );
            }

            return (
              <Navbar.Link
                key={nav.href}
                as={Link}
                active={pathname === nav.href}
                href={nav.href}
                target={nav.openInNewTab ? "_blank" : undefined}
              >
                <p>{nav.title}</p>
              </Navbar.Link>
            );
          })}
        </Navbar.Collapse>
        {isOpen && (
          <div
            className={classNames(
              "w-full md:w-auto md:hidden bg-white shadow-lg",
            )}
          >
            <ul className="flex flex-col md:flex-row md:space-x-8 md:text-sm md:font-medium z-50 bg-white">
              {navItems
                .flatMap(
                  (nav) =>
                    ("items" in nav && nav.items?.length && nav.items.length > 0
                      ? nav.items
                      : nav) as {
                      href: string;
                      title: string;
                      openInNewTab?: boolean;
                    },
                )
                .map((nav) => (
                  <Navbar.Link
                    key={nav.href}
                    as={Link}
                    active={pathname === nav.href}
                    href={nav.href}
                    target={nav.openInNewTab ? "_blank" : undefined}
                  >
                    <p>{nav.title}</p>
                  </Navbar.Link>
                ))}
            </ul>
          </div>
        )}
      </div>
    </MegaMenu>
  );
}
