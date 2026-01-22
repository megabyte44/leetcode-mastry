import { DailyQuestions } from "@/components/dashboard/daily-questions";
import { TopicsGrid } from "@/components/dashboard/topics-grid";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Your daily challenges and topics at a glance.</p>
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <DailyQuestions />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <TopicsGrid />
      </Suspense>
    </div>
  );
}
