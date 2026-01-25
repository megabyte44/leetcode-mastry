import { EnhancedSnippets } from "@/components/snippets/enhanced-snippets";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SnippetsPage() {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={
        <div className="space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      }>
        <EnhancedSnippets />
      </Suspense>
    </div>
  );
}
