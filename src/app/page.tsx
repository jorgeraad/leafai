import { Logo } from "@/components/logo";
import { Button } from "@/components/button";
import { FadeIn } from "@/components/fade-in";

const STEPS = [
  {
    step: "01",
    title: "Connect",
    description:
      "Link your Google Drive with one click. Your files stay where they are.",
  },
  {
    step: "02",
    title: "Ask",
    description:
      "Start a conversation. Ask questions in plain language about any of your documents.",
  },
  {
    step: "03",
    title: "Get answers",
    description:
      "Receive accurate, cited responses pulled directly from your files.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 md:px-16">
        <Logo />
        <Button variant="outline" href="/login">
          Sign in
        </Button>
      </nav>

      {/* Hero */}
      <main className="hero-glow flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="mx-auto max-w-2xl">
          <FadeIn delay={0}>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-sm text-green-700">
              Now in early access
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <h1 className="font-serif text-5xl font-bold leading-tight tracking-tight text-green-950 md:text-7xl">
              Ask your
              <br />
              documents
              <br />
              <span className="italic text-green-700">anything.</span>
            </h1>
          </FadeIn>

          <FadeIn delay={200}>
            <p className="mx-auto mt-8 max-w-md text-lg leading-relaxed text-neutral-500">
              Connect your Google Drive and let AI read, understand, and answer
              questions about your files — instantly.
            </p>
          </FadeIn>

          <FadeIn delay={300}>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button href="/login">Get started</Button>
              <Button variant="ghost" href="#how-it-works">
                How it works
              </Button>
            </div>
          </FadeIn>
        </div>
      </main>

      {/* How it works */}
      <section
        id="how-it-works"
        className="border-t border-neutral-200 bg-white px-8 py-24 md:px-16"
      >
        <div className="mx-auto max-w-4xl">
          <FadeIn>
            <h2 className="font-serif text-3xl font-bold text-green-950 md:text-4xl">
              Simple by design.
            </h2>
            <p className="mt-3 max-w-lg text-neutral-500">
              Three steps to turn your documents into a conversation.
            </p>
          </FadeIn>

          <div className="mt-16 grid gap-12 md:grid-cols-3">
            {STEPS.map((item, i) => (
              <FadeIn key={item.step} delay={i * 120}>
                <span className="font-mono text-sm text-green-400">
                  {item.step}
                </span>
                <h3 className="mt-2 font-serif text-xl font-semibold text-green-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  {item.description}
                </p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 px-8 py-8 md:px-16">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Logo size="sm" />
          <span className="text-xs text-neutral-400">
            &copy; {new Date().getFullYear()} Leaf AI
          </span>
        </div>
      </footer>
    </div>
  );
}
