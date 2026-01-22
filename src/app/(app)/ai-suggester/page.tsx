import { AIProblemSuggester } from "@/components/ai/problem-suggester";

export default function AISuggesterPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">AI Problem Suggester</h1>
        <p className="text-muted-foreground">
          Get personalized LeetCode problem suggestions based on your performance.
        </p>
      </div>
      <AIProblemSuggester />
    </div>
  );
}
