import { AIProblemSuggester } from "@/components/ai/problem-suggester";

export default function AISuggesterPage() {
  return (
    <div className="space-y-6 pb-8">
      {/* Page header */}
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          AI Suggester
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
          Get personalized problem recommendations based on your practice history.
        </p>
      </header>
      
      <AIProblemSuggester />
    </div>
  );
}
