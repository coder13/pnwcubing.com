import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { directusLoginMessages } from "@/lib/editor/loginMessages";

export const metadata: Metadata = {
  title: "Editor login | PNW Cubing",
  robots: { index: false, follow: false },
};

export default function Login({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  if (
    searchParams.error &&
    Object.hasOwn(directusLoginMessages, searchParams.error)
  )
    redirect(`/login/directus?error=${searchParams.error}`);
  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-3xl font-bold">Editor login</h1>
      <p>
        Delegates can edit their own profile and visibility. Approved editors
        can manage site content.
      </p>
      {searchParams.error && (
        <p role="alert" className="text-red-700">
          {searchParams.error === "access"
            ? "This WCA account has no active delegate profile or editor access here."
            : "Login failed or expired. Try again."}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <a
          href="/api/auth/login"
          className="inline-flex items-center rounded border border-primary bg-primary px-5 py-3 text-white"
        >
          Sign in with WCA
        </a>
        <Link
          href="/login/directus"
          className="inline-flex items-center rounded border border-gray-300 px-5 py-3 hover:bg-gray-50"
        >
          Sign in with Directus
        </Link>
      </div>
    </main>
  );
}
