import { DailyQuestions } from "@/components/dashboard/daily-questions";
import { TopicsGrid } from "@/components/dashboard/topics-grid";
import { ProgressOverview } from "@/components/dashboard/progress-overview";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  return (
    <div className="space-y-10 pb-8">
      {/* Page Header */}
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Dashboard
        </h1>
      </header>

      {/* Progress Overview Section */}
      <section>
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <ProgressOverview />
        </Suspense>
      </section>

      {/* Daily Questions Section */}
      <section>
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <DailyQuestions />
        </Suspense>
      </section>

      {/* Topics Section */}
      <section>
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
          <TopicsGrid />
        </Suspense>
      </section>
    </div>
  );
}
