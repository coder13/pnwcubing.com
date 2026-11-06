import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { DirectusLoginForm } from "@/components/editor/DirectusLoginForm";

export const metadata: Metadata = {
  title: "Directus login | PNW Cubing",
  robots: { index: false, follow: false },
};

export default function DirectusLogin({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <Link href="/login" className="inline-block text-primary underline">
        Back to sign-in options
      </Link>
      <h1 className="text-3xl font-bold">Sign in with Directus</h1>
      <p>Use your admin.pnwcubing.com account.</p>
      <DirectusLoginForm initialError={searchParams.error} />
    </main>
  );
}
