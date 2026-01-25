
"use client";

import { useState, useEffect, useTransition } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DailyQuestion } from "@/lib/types";
import {
  getDailyQuestions,
  addDailyQuestion,
  deleteDailyQuestion,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ExternalLink, Loader2, Zap, CheckCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "../ui/skeleton";
import { getProblemById } from "@/lib/problem-lookup";
import { useToast } from "@/hooks/use-toast";

function AddDailyQuestionForm({
  userId,
  user,
  onQuestionAdded,
}: {
  userId: string;
  user: any;
  onQuestionAdded: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [leetcodeId, setLeetcodeId] = useState("");
  const [problemDetails, setProblemDetails] = useState<any>(null);
  const [note, setNote] = useState("");
  const { toast } = useToast();

  // Auto-fetch problem details when ID is entered
  useEffect(() => {
    if (leetcodeId && /^\d+$/.test(leetcodeId.trim())) {
      const problem = getProblemById(parseInt(leetcodeId.trim()));
      if (problem) {
        setProblemDetails(problem);
      } else {
        setProblemDetails(null);
      }
    } else {
      setProblemDetails(null);
    }
  }, [leetcodeId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    startTransition(async () => {
      const formData = new FormData();
      formData.append('leetcodeId', leetcodeId);
      formData.append('note', note);
      if (problemDetails) {
        formData.append('title', problemDetails.title);
        formData.append('difficulty', problemDetails.difficulty);
        formData.append('titleSlug', problemDetails.titleSlug || problemDetails.slug || '');
      }
      
      await addDailyQuestion(userId, formData);
      onQuestionAdded();
      
      // Reset form
      setLeetcodeId("");
      setNote("");
      setProblemDetails(null);
      
      toast({
        title: "Problem Added! 🎯",
        description: problemDetails ? `${problemDetails.title} added to your daily queue.` : "Problem added to your daily queue.",
      });
    });
  };

  const markAsSolved = async () => {
    if (!problemDetails || !user?.uid) return;
    
    try {
      // Add to solved collection
      const response = await fetch('/api/solved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          problemId: problemDetails.questionFrontendId,
          title: problemDetails.title,
          difficulty: problemDetails.difficulty,
          titleSlug: problemDetails.titleSlug,
          topicTags: problemDetails.topics || []
        })
      });
      
      if (response.ok) {
        toast({
          title: "Marked as Solved! ✅",
          description: `Great job solving ${problemDetails.title}!`,
        });
        
        // Remove from daily questions since it's now solved
        setLeetcodeId("");
        setProblemDetails(null);
        onQuestionAdded(); // Refresh the list
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark as solved. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="leetcodeId" className="text-sm font-medium">
            LeetCode Problem ID
          </Label>
          <Input
            id="leetcodeId"
            value={leetcodeId}
            onChange={(e) => setLeetcodeId(e.target.value)}
            placeholder="e.g., 1"
            className="h-10"
            required
            disabled={isPending}
          />
          {problemDetails && (
            <div className="mt-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-200">{problemDetails.title}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  problemDetails.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                  problemDetails.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {problemDetails.difficulty}
                </span>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                Topics: {problemDetails.topics?.join(', ') || 'N/A'}
              </p>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="note" className="text-sm font-medium">
            Note <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Quick note or reminder"
            className="h-10"
            disabled={isPending}
          />
        </div>
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <DialogClose asChild>
          <Button type="button" variant="ghost" disabled={isPending}>
            Cancel
          </Button>
        </DialogClose>
        {problemDetails && (
          <Button 
            type="button" 
            onClick={markAsSolved}
            variant="outline" 
            disabled={isPending}
            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark as Solved
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add to Daily Queue
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DailyQuestions() {
  const { user, loading: authLoading } = useAuth();
  const [questions, setQuestions] = useState<DailyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setAddOpen] = useState(false);

  const fetchQuestions = () => {
    if (user) {
      setLoading(true);
      getDailyQuestions(user.uid)
        .then(setQuestions)
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchQuestions();
    }
  }, [user, authLoading]);

  const handleDelete = async (questionId: string) => {
    if (user) {
      await deleteDailyQuestion(user.uid, questionId);
      fetchQuestions();
    }
  };

  if (authLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Quick Capture</h2>
          <p className="text-sm text-muted-foreground">
            Questions to tackle during idle moments
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 px-3" disabled={!user}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Question</DialogTitle>
              <DialogDescription>
                Quickly capture a problem to practice later.
              </DialogDescription>
            </DialogHeader>
            {user && (
              <AddDailyQuestionForm
                userId={user.uid}
                user={user}
                onQuestionAdded={() => {
                  setAddOpen(false);
                  fetchQuestions();
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-border/50 bg-card">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : questions.length > 0 ? (
          <ul className="divide-y divide-border/50">
            {questions.map((q) => (
              <li
                key={q.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-4 py-3 transition-colors hover:bg-muted/50 touch-manipulation"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-10 w-10 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm sm:text-xs font-semibold">
                    {q.leetcodeId}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                      {q.link ? (
                        <Link
                          href={q.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors touch-manipulation"
                        >
                          <span className="line-clamp-1">{(q as any).title || `Problem ${q.leetcodeId}`}</span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                        </Link>
                      ) : (
                        <span className="text-sm font-medium line-clamp-1">
                          {(q as any).title || `Problem ${q.leetcodeId}`}
                        </span>
                      )}
                      {(q as any).difficulty && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] px-1.5 py-0 shrink-0",
                            (q as any).difficulty === 'Easy' && "text-green-600 border-green-200 bg-green-50",
                            (q as any).difficulty === 'Medium' && "text-yellow-600 border-yellow-200 bg-yellow-50",
                            (q as any).difficulty === 'Hard' && "text-red-600 border-red-200 bg-red-50"
                          )}
                        >
                          {(q as any).difficulty}
                        </Badge>
                      )}
                      {(q as any).source === 'ai-suggestion' && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-medium rounded-full shrink-0">
                          <Zap className="h-2.5 w-2.5" />
                          AI
                        </div>
                      )}
                    </div>
                    {q.note && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {q.note}
                      </p>
                    )}
                  </div>
                </div>
                {/* Actions - always visible on mobile */}
                <div className="flex items-center gap-2 mt-2 sm:mt-0 sm:ml-3 pl-12 sm:pl-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 sm:h-7 px-3 sm:px-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200 touch-manipulation flex-1 sm:flex-none"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/solved', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            userId: user?.uid,
                            problemId: q.leetcodeId.toString(),
                            title: (q as any).title || `Problem ${q.leetcodeId}`,
                            difficulty: (q as any).difficulty || 'UNKNOWN',
                            titleSlug: (q as any).titleSlug || q.leetcodeId.toString(),
                            topicTags: []
                          })
                        });
                        
                        if (response.ok) {
                          // Remove from daily questions
                          await handleDelete(q.id);
                        }
                      } catch (error) {
                        console.error('Error marking as solved:', error);
                      }
                    }}
                  >
                    <CheckCircle className="mr-1 h-3.5 w-3.5" />
                    <span className="sm:hidden">Mark Done</span>
                    <span className="hidden sm:inline">Done</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 touch-manipulation"
                    onClick={() => handleDelete(q.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12 px-4">
            <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No questions yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add problems to practice during class or commute
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
