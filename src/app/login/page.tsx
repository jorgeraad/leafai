import { Logo } from "@/components/logo";
import { GoogleIcon } from "@/components/google-icon";
import { Button } from "@/components/button";
import { FadeIn } from "@/components/fade-in";
import { signInWithGoogle } from "@/app/auth/actions";

export default function LoginPage() {
  return (
    <div className="hero-glow flex min-h-screen flex-col items-center justify-center px-8">
      <div className="w-full max-w-sm">
        <FadeIn delay={0}>
          <div className="mb-12 text-center">
            <Logo size="lg" />
            <p className="mt-3 text-sm text-neutral-500">
              Sign in to start asking your documents anything.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={120}>
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
            <form action={signInWithGoogle}>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-3 rounded-full border border-neutral-200 bg-white px-4 py-3.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </form>

            <p className="mt-5 text-center text-xs leading-relaxed text-neutral-400">
              By continuing, you agree to our terms of service and privacy
              policy.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={240}>
          <p className="mt-8 text-center">
            <Button
              variant="ghost"
              href="/"
              className="text-xs text-neutral-400 no-underline hover:text-neutral-600"
            >
              &larr; Back to home
            </Button>
          </p>
        </FadeIn>
      </div>
    </div>
  );
}
