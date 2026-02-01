"use client";

import { useActionState } from "react";
import { Logo } from "@/components/logo";
import { FadeIn } from "@/components/fade-in";
import { signUpWithEmail } from "@/app/auth/actions";
import Link from "next/link";
import type { AuthFormState } from "@/lib/types";

const initialState: AuthFormState = { error: null, success: null };

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(
    signUpWithEmail,
    initialState
  );

  return (
    <div className="hero-glow flex min-h-screen flex-col items-center justify-center px-8">
      <div className="w-full max-w-sm">
        <FadeIn delay={0}>
          <div className="mb-12 text-center">
            <Logo size="lg" />
            <p className="mt-3 text-sm text-neutral-500">
              Create an account to get started.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={120}>
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
            <form action={formAction} className="space-y-4">
              {state.error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {state.error}
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium text-neutral-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-neutral-400"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-sm font-medium text-neutral-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-neutral-400"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1 block text-sm font-medium text-neutral-700"
                >
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-neutral-400"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-full bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
              >
                {pending ? "Creating account…" : "Create account"}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-neutral-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-neutral-600 underline hover:text-neutral-900"
              >
                Sign in
              </Link>
            </p>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
