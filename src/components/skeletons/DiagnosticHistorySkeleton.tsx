import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/components/AppLayout';

export const DiagnosticHistorySkeleton = () => (
  <AppLayout>
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-5 h-5 rounded" />
        <div className="space-y-1">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-lg" />
        ))}
      </div>

      {/* Comparison radar */}
      <div className="bg-card rounded-2xl border border-border/30 p-8">
        <div className="flex justify-between mb-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-[280px] w-full rounded-xl" />
      </div>

      {/* Entries */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-36" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border/30 p-5 flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-56" />
              <div className="flex gap-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-40 hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  </AppLayout>
);
