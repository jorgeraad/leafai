import Link from "next/link";

const VARIANT_CLASSES = {
  primary:
    "bg-green-800 text-white hover:bg-green-900 shadow-sm shadow-green-900/10",
  outline:
    "border border-green-800 text-green-800 hover:bg-green-800 hover:text-white",
  ghost:
    "text-green-700 underline underline-offset-4 hover:text-green-900",
} as const;

type ButtonProps = {
  variant?: keyof typeof VARIANT_CLASSES;
  href?: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export function Button({
  variant = "primary",
  href,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const base =
    variant === "ghost"
      ? "text-sm font-medium transition-colors"
      : "rounded-full px-7 py-2.5 text-sm font-medium transition-all duration-200";

  const classes = `${base} ${VARIANT_CLASSES[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
