import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor login | PNW Cubing",
  robots: { index: false, follow: false },
};

export default function Login({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
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
      <a
        href="/api/auth/login"
        className="inline-block rounded bg-primary px-5 py-3 text-white"
      >
        Sign in with WCA
      </a>
    </main>
  );
}
