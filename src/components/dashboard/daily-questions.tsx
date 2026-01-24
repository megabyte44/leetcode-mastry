
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
import { Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
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

function AddDailyQuestionForm({
  userId,
  onQuestionAdded,
}: {
  userId: string;
  onQuestionAdded: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      await addDailyQuestion(userId, formData);
      onQuestionAdded();
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="leetcodeId" className="text-sm font-medium">
            LeetCode ID
          </Label>
          <Input
            id="leetcodeId"
            name="leetcodeId"
            placeholder="e.g., 1 or 1. Two Sum"
            className="h-10"
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="note" className="text-sm font-medium">
            Note <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="note"
            name="note"
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
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Question
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
                className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                    {q.leetcodeId}
                  </div>
                  <div className="min-w-0 flex-1">
                    {q.link ? (
                      <Link
                        href={q.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors"
                      >
                        Problem {q.leetcodeId}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </Link>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        Problem {q.leetcodeId}
                      </span>
                    )}
                    {q.note && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {q.note}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(q.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  <span className="sr-only">Delete</span>
                </Button>
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
