import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Card className="gap-0 p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <Icon className={cn("size-4", accent && "text-primary")} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold leading-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}
