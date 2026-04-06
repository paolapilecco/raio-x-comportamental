import { Skeleton } from '@/components/ui/skeleton';

export const CentralReportSkeleton = () => (
  <div className="min-h-screen px-4 py-8 md:py-12">
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-5 h-5 rounded" />
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>

      {/* Dominant pattern */}
      <div className="rounded-xl border border-border/30 p-8 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-6 w-52" />
        </div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </div>

      {/* Pattern combination */}
      <div className="rounded-xl border border-border/30 p-8 space-y-4">
        <Skeleton className="h-6 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Two-column */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border/30 p-6 space-y-3">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="rounded-xl border border-border/30 p-6 space-y-3">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>

      {/* Radar */}
      <div className="rounded-xl border border-border/30 p-8">
        <Skeleton className="h-6 w-56 mb-4" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    </div>
  </div>
);
