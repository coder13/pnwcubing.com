import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Editor login | PNW Cubing",
  robots: { index: false, follow: false },
};

export default function Login({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const errors: Record<string, string> = {
    access:
      "This WCA account has no active delegate profile or editor access here.",
    directus:
      "Directus sign-in failed. Check your email, password, and two-factor code.",
    "directus-access":
      "This Directus account needs the Content-Editor or Administrator role. Ask a site administrator for access.",
    "directus-otp":
      "Enter the current six-digit code from your authenticator app, then sign in again.",
    "directus-unavailable": "Directus sign-in is unavailable. Try again later.",
  };
  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-3xl font-bold">Editor login</h1>
      <p>
        Delegates can edit their own profile and visibility. Approved editors
        can manage site content.
      </p>
      {searchParams.error && (
        <p role="alert" className="text-red-700">
          {Object.hasOwn(errors, searchParams.error)
            ? errors[searchParams.error]
            : "Login failed or expired. Try again."}
        </p>
      )}
      <a
        href="/api/auth/login"
        className="inline-block rounded bg-primary px-5 py-3 text-white"
      >
        Sign in with WCA
      </a>
      <section className="space-y-4 border-t pt-6">
        <h2 className="text-xl font-semibold">Sign in with Directus</h2>
        <p>
          Use your admin.pnwcubing.com account. A WCA account is not required.
        </p>
        <form action="/api/auth/directus" method="post" className="space-y-4">
          <div>
            <label htmlFor="directus-email" className="mb-1 block font-medium">
              Email
            </label>
            <input
              id="directus-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              className="w-full rounded border border-gray-400 p-2"
            />
          </div>
          <div>
            <label
              htmlFor="directus-password"
              className="mb-1 block font-medium"
            >
              Password
            </label>
            <input
              id="directus-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={1024}
              className="w-full rounded border border-gray-400 p-2"
            />
          </div>
          <div>
            <label htmlFor="directus-otp" className="mb-1 block font-medium">
              Two-factor code (if enabled)
            </label>
            <input
              id="directus-otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              className="w-full rounded border border-gray-400 p-2"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-primary px-5 py-3 text-white"
          >
            Sign in with Directus
          </button>
        </form>
      </section>
    </main>
  );
}
