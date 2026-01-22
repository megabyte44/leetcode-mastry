"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { suggestLeetCodeProblems, SuggestLeetCodeProblemsOutput } from "@/ai/flows/suggest-leetcode-problems";
import { getAllUserProblems } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lightbulb, ExternalLink, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";


const formSchema = z.object({
  topic: z.string().optional(),
  numberOfProblems: z.coerce.number().min(1).max(10).default(5),
});

export function AIProblemSuggester() {
  const [suggestions, setSuggestions] = useState<SuggestLeetCodeProblemsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
      numberOfProblems: 5,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setError(null);
    setSuggestions(null);

    try {
      const bucketHistory = await getAllUserProblems();
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

  return (
    <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
            <Card>
                <CardHeader>
                <CardTitle className="font-headline">Get Suggestions</CardTitle>
                <CardDescription>
                    Fill in the details to get personalized problem recommendations.
                </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <Label htmlFor="topic">Focus Topic (Optional)</Label>
                            <Input id="topic" {...form.register("topic")} placeholder="e.g., Dynamic Programming" />
                        </div>
                        <div>
                            <Label htmlFor="numberOfProblems">Number of Problems</Label>
                            <Input id="numberOfProblems" type="number" {...form.register("numberOfProblems")} />
                        </div>
                        <Button type="submit" disabled={isLoading} className="w-full">
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Lightbulb className="mr-2 h-4 w-4" />
                            )}
                            Suggest Problems
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>

        <div className="md:col-span-2">
            <Card className="min-h-[300px]">
                <CardHeader>
                    <CardTitle className="font-headline">Suggested Problems</CardTitle>
                    <CardDescription>
                        Here are some problems tailored for you to work on.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading && (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                    {error && <p className="text-destructive text-center py-16">{error}</p>}
                    {!isLoading && !error && !suggestions && (
                        <div className="text-center text-muted-foreground py-16">
                            <BrainCircuit className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-4">Your suggestions will appear here.</p>
                        </div>
                    )}
                    {suggestions && (
                        <ul className="space-y-4">
                            {suggestions.suggestedProblems.map((problem) => (
                                <li key={problem.leetcodeProblemId} className="rounded-lg border p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-semibold">{problem.title}</h3>
                                            <p className="text-sm text-muted-foreground">{problem.reason}</p>
                                        </div>
                                        <Button asChild variant="ghost" size="sm">
                                            <Link href={problem.url} target="_blank">
                                                <ExternalLink className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                    <div className="mt-2">
                                        <Badge variant={problem.difficulty.toLowerCase() === 'easy' ? 'secondary' : problem.difficulty.toLowerCase() === 'medium' ? 'outline' : 'destructive'} className="border-none">{problem.difficulty}</Badge>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
