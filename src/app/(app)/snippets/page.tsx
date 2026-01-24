import { SnippetsList } from "@/components/snippets/snippets-list";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SnippetsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Code Snippets</h1>
        <p className="text-muted-foreground">
          Save and organize your frequently used code patterns and algorithms.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <SnippetsList />
      </Suspense>
    </div>
  );
}
