import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  action,
  backHref,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  backHref?: string;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-2">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Back"
            className="-ml-2 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="size-6" />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
