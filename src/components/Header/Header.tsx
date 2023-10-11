"use client";

import Image from "next/image";
import { Button, Navbar } from "flowbite-react";
import { usePathname } from "next/navigation";

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

export default function Header() {
  const pathname = usePathname();

  return (
    <Navbar rounded>
      <Navbar.Brand href="/">
        <Image
          alt="Pacific Northwest Cubing Logo"
          className="mr-3"
          src="/full.svg"
          width={100}
          height={100}
        />
      </Navbar.Brand>
      <Navbar.Toggle />
      <Navbar.Collapse>
        {navItems.map((nav) => (
          <Navbar.Link
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
