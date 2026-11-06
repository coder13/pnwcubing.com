"use client";

import React, { FormEvent, useEffect, useRef, useState } from "react";
import { directusLoginMessage } from "@/lib/editor/loginMessages";

const inputClass = "w-full rounded border border-gray-400 p-2 text-gray-900";

export function DirectusLoginForm({ initialError }: { initialError?: string }) {
  const [needsOtp, setNeedsOtp] = useState(initialError === "directus-otp");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(
    initialError ? directusLoginMessage(initialError) : "",
  );
  const [pending, setPending] = useState(false);
  const credentials = useRef<{ email: string; password: string } | null>(null);
  const otpInput = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    if (needsOtp && !pending) otpInput.current?.focus();
  }, [needsOtp, pending]);
  useEffect(
    () => () => {
      controller.current?.abort();
      credentials.current = null;
    },
    [],
  );

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const account = credentials.current || {
      email: String(form.get("email") || "").trim(),
      password: String(form.get("password") || ""),
    };
    setEmail(account.email);
    setPending(true);
    setError("");
    controller.current = new AbortController();
    let navigating = false;
    try {
      const response = await fetch("/api/auth/directus", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        credentials: "same-origin",
        signal: controller.current.signal,
        body: new URLSearchParams({
          ...account,
          ...(needsOtp ? { otp: String(form.get("otp") || "").trim() } : {}),
        }),
      });
      const result = await response.json();
      if (response.ok && result.success === true) {
        credentials.current = null;
        window.location.replace("/admin");
        navigating = true;
        return;
      }
      if (result.requiresOtp === true) {
        credentials.current = account;
        if (needsOtp)
          setError(
            "That code was not accepted. Enter the current code and try again.",
          );
        setNeedsOtp(true);
        if (otpInput.current) otpInput.current.value = "";
        return;
      }
      if (result.code === "directus" || result.code === "directus-access") {
        credentials.current = null;
        setNeedsOtp(false);
      }
      setError(directusLoginMessage(result.code));
    } catch {
      if (!controller.current?.signal.aborted)
        setError("Sign-in could not connect. Try again.");
    } finally {
      if (!navigating) setPending(false);
    }
  }

  function changeAccount(event: React.MouseEvent<HTMLButtonElement>) {
    event.currentTarget.form?.reset();
    credentials.current = null;
    setNeedsOtp(false);
    setError("");
  }

  return (
    <form
      action="/api/auth/directus"
      method="post"
      onSubmit={signIn}
      aria-busy={pending}
      className="space-y-5"
    >
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {needsOtp && credentials.current ? (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Two-factor authentication</h2>
          <p>
            Enter the six-digit code from your authenticator app for {email}.
          </p>
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="directus-email" className="mb-1 block font-medium">
              Email
            </label>
            <input
              id="directus-email"
              name="email"
              type="email"
              autoComplete="username"
              defaultValue={email}
              required
              maxLength={254}
              disabled={pending}
              className={inputClass}
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
              disabled={pending}
              className={inputClass}
            />
          </div>
        </>
      )}
      {needsOtp && (
        <div>
          <label htmlFor="directus-otp" className="mb-1 block font-medium">
            Authentication code
          </label>
          <input
            ref={otpInput}
            id="directus-otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            disabled={pending}
            className={inputClass}
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-primary px-5 py-3 text-white disabled:opacity-50"
        >
          {pending
            ? "Signing in…"
            : needsOtp
            ? "Verify and sign in"
            : "Sign in"}
        </button>
        {needsOtp && (
          <button
            type="button"
            disabled={pending}
            onClick={changeAccount}
            className="text-primary underline"
          >
            Use a different account
          </button>
        )}
      </div>
    </form>
  );
}
