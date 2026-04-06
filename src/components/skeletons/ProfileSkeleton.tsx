import { Skeleton } from '@/components/ui/skeleton';

export const ProfileSkeleton = () => (
  <div className="min-h-screen px-4 py-8 md:py-12">
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>

      {/* User card */}
      <div className="bg-card/60 rounded-3xl border border-border/40 p-7">
        <div className="flex items-center gap-5">
          <Skeleton className="w-16 h-16 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card/60 rounded-2xl border border-border/40 p-5 flex flex-col items-center gap-3">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-6 w-10" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="bg-card/60 rounded-2xl border border-border/40 p-6 space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>

      {/* Profile summary */}
      <div className="bg-card/60 rounded-3xl border border-border/40 p-7 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-6 w-44" />
        </div>
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    </div>
  </div>
);
