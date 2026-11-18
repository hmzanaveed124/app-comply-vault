import Link from "next/link";
import { cn } from "~/lib/utils";

type DashboardCardProps = {
  title: string;
  /** Optional right-aligned link in the card header */
  link?: { href: string; label: string };
  /** Larger, darker title for section-level cards (tables) */
  emphasized?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
};

export function DashboardCard({
  title,
  link,
  emphasized = false,
  className,
  bodyClassName,
  children,
}: DashboardCardProps): React.JSX.Element {
  return (
    <section
      className={cn(
        "rounded-[10px] border border-surface-border bg-surface-card shadow-[0_1px_2px_rgba(20,31,25,0.04)]",
        className,
      )}
    >
      <div className="flex items-center justify-between px-[18px] pt-4">
        <span
          className={cn(
            "font-semibold",
            emphasized ? "text-[13.5px] text-text-primary" : "text-[12px] text-text-primary",
          )}
        >
          {title}
        </span>
        {link ? (
          <Link
            href={link.href}
            className="text-[12px] font-semibold text-brand hover:underline"
          >
            {link.label}
          </Link>
        ) : null}
      </div>
      <div className={cn("px-[18px] pb-[18px] pt-[14px]", bodyClassName)}>{children}</div>
    </section>
  );
}

type MetricProps = {
  value: React.ReactNode;
  unit?: string;
  delta?: { text: string; tone: "good" | "bad" };
};

export function Metric({ value, unit, delta }: MetricProps): React.JSX.Element {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[26px] font-[650] leading-none tracking-[-0.02em] tabular-nums text-text-primary">
        {value}
      </span>
      {unit ? <span className="text-[12.5px] text-text-secondary">{unit}</span> : null}
      {delta ? (
        <span
          className={cn(
            "ml-1 text-[11.5px] font-semibold",
            delta.tone === "bad" ? "text-semantic-danger" : "text-brand",
          )}
        >
          {delta.text}
        </span>
      ) : null}
    </div>
  );
}
