import { AIProblemSuggester } from "@/components/ai/problem-suggester";

export default function AISuggesterPage() {
  return (
    <div className="container mx-auto py-6">
      {/* Enhanced Page header */}
      <header className="space-y-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              AI Problem Suggester
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Get personalized problem recommendations powered by AI analysis of your practice history, weaknesses, and learning patterns.
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            Smart targeting of weak areas
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            Quick capture to daily list
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-purple-500"></div>
            Personal insights dashboard
          </span>
        </div>
      </header>
      
      <AIProblemSuggester />
    </div>
  );
}
