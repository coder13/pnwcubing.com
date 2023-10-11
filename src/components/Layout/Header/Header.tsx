"use client";

import Image from "next/image";
import { Button, Navbar } from "flowbite-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
  {
    href: "/competitions",
    title: "Competitions",
  },
  {
    href: "/delegates",
    title: "Delegates",
  },
];

export function Header() {
  const pathname = usePathname();

  return (
    <Navbar className="flex" fluid>
      <Navbar.Brand href="/" as={Link}>
        <Image
          alt="Pacific Northwest Cubing Logo"
          src="/full.svg"
          className="-m-6"
          width={200}
          height={100}
        />
      </Navbar.Brand>
      <Navbar.Toggle />
      <Navbar.Collapse>
        {navItems.map((nav) => (
          <Navbar.Link
            as={Link}
            active={pathname === nav.href}
            key={nav.href}
            href={nav.href}
          >
            <p>{nav.title}</p>
          </Navbar.Link>
        ))}
      </Navbar.Collapse>
    </Navbar>
  );
}
