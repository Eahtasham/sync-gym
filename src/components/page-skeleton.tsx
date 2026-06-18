import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
