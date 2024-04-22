"use client";

import Image from "next/image";
import { Navbar } from "flowbite-react";
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
    href: "https://merch.pnwcubing.com/",
    title: "Merchandise",
    openInNewTab: true,
  },
  {
    href: "/about",
    title: "About",
  },
  {
    href: "/contact",
    title: "Contact",
  },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <Navbar className="flex shadow-md z-50 h-20 xl:[&>div]:max-w-2/3 " rounded>
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
      <Navbar.Collapse className="hidden md:visible">
        {navItems.map((nav) => (
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
      </Navbar.Collapse>
      {isOpen && (
        <div
          className={classNames(
            "w-full md:w-auto md:hidden bg-white shadow-lg",
          )}
        >
          <ul className="flex flex-col md:flex-row md:space-x-8 md:text-sm md:font-medium z-50 bg-white">
            {navItems.map((nav) => (
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
    </Navbar>
  );
}
