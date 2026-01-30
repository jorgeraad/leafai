import Link from "next/link";

const LEAF_ICON = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-green-500"
  >
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
);

export function Logo({ size = "sm" }: { size?: "sm" | "lg" }) {
  const textClass =
    size === "lg"
      ? "font-serif text-3xl font-bold"
      : "font-serif text-xl font-bold";

  return (
    <Link href="/" className={`${textClass} inline-flex items-center gap-1.5 text-green-800`}>
      {LEAF_ICON}
      Leaf <span className="font-normal text-green-500">AI</span>
    </Link>
  );
}
