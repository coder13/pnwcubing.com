"use client";

import { Button } from "flowbite-react";

export function EmailButton({ email }: { email: string }) {
  return (
    <Button
      as="a"
      className="w-full bg-white text-black border-primary"
      href={`mailto:${email}`}
      target="_blank"
    >
      Contact
    </Button>
  );
}
