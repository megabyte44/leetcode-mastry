
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { suggestLeetCodeProblems, SuggestLeetCodeProblemsOutput } from "@/ai/flows/suggest-leetcode-problems";
import { getAllUserProblems } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, ExternalLink, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";


const formSchema = z.object({
  topic: z.string().optional(),
  numberOfProblems: z.coerce.number().min(1).max(10).default(5),
  additionalContext: z.string().optional(),
});

const STORAGE_KEY = "ai-suggester-form-data";

export function AIProblemSuggester() {
  const [suggestions, setSuggestions] = useState<SuggestLeetCodeProblemsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
      numberOfProblems: 5,
      additionalContext: "",
    },
  });

  // Load saved form data on component mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        form.reset(parsedData);
      } catch (error) {
        console.error("Failed to parse saved form data:", error);
      }
    }
  }, [form]);

  // Save form data whenever it changes
  useEffect(() => {
    const subscription = form.watch((data) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error("Failed to save form data:", error);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
        setError("You must be logged in to get suggestions.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setSuggestions(null);

    try {
      const bucketHistory = await getAllUserProblems(user.uid);
      const result = await suggestLeetCodeProblems({
        ...values,
        bucketHistory,
      });
      setSuggestions(result);
    } catch (e) {
      console.error(e);
      setError("Failed to get suggestions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const difficultyStyles: Record<string, string> = {
    "easy": "text-emerald-600 dark:text-emerald-400",
    "medium": "text-amber-600 dark:text-amber-400",
    "hard": "text-red-600 dark:text-red-400",
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Form */}
        <div className="lg:col-span-1">
            <div className="rounded-xl border border-border/50 bg-card p-5">
                <div className="space-y-1 mb-5">
                    <h3 className="font-medium text-sm">Get Suggestions</h3>
                    <p className="text-xs text-muted-foreground">
                        AI will analyze your practice history
                    </p>
                </div>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="topic" className="text-sm font-medium">
                            Focus Topic <span className="text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <Input 
                            id="topic" 
                            {...form.register("topic")} 
                            placeholder="e.g., Dynamic Programming" 
                            className="h-10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="numberOfProblems" className="text-sm font-medium">
                            Number of Problems
                        </Label>
                        <Input 
                            id="numberOfProblems" 
                            type="number" 
                            {...form.register("numberOfProblems")} 
                            className="h-10"
                            min={1}
                            max={10}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="additionalContext" className="text-sm font-medium">
                            Additional Context <span className="text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <Textarea 
                            id="additionalContext" 
                            {...form.register("additionalContext")} 
                            placeholder="e.g., I'm preparing for FAANG interviews, prefer problems with O(n) solutions, focus on sliding window patterns..."
                            className="min-h-[80px] resize-none text-sm"
                        />
                    </div>
                    <Button type="submit" disabled={isLoading || !user} className="w-full h-10">
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Generate Suggestions
                    </Button>
                </form>
            </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
            <div className="rounded-xl border border-border/50 bg-card min-h-[300px]">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mb-3" />
                        <p className="text-sm text-muted-foreground">Analyzing your practice history...</p>
                    </div>
                )}
                {error && (
                    <div className="flex items-center justify-center py-20">
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}
                {!isLoading && !error && !suggestions && (
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                            <BrainCircuit className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Ready to suggest</p>
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                            Configure your preferences and click generate
                        </p>
                    </div>
                )}
                {suggestions && (
                    <div className="divide-y divide-border/50">
                        {suggestions.suggestedProblems.map((problem, index) => (
                            <div key={problem.leetcodeProblemId} className="p-4 hover:bg-muted/30 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground font-medium">
                                                #{index + 1}
                                            </span>
                                            <h4 className="font-medium text-sm">{problem.title}</h4>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {problem.reason}
                                        </p>
                                        <span className={`text-xs font-medium ${difficultyStyles[problem.difficulty.toLowerCase()] || 'text-muted-foreground'}`}>
                                            {problem.difficulty}
                                        </span>
                                    </div>
                                    <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                        <Link href={problem.url} target="_blank">
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
