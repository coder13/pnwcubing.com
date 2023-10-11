"use client";

import { Footer as FlowbiteFooter } from "flowbite-react";

export function Footer() {
  return (
    <FlowbiteFooter container>
      <FlowbiteFooter.Copyright
        by="Pacific Northwest Cubing LLC"
        href="#"
        year={2023}
      />
      <FlowbiteFooter.LinkGroup></FlowbiteFooter.LinkGroup>
    </FlowbiteFooter>
  );
}
