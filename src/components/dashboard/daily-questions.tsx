
"use client";

import { useState, useEffect, useTransition } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DailyQuestion } from "@/lib/types";
import {
  getDailyQuestions,
  addDailyQuestion,
  deleteDailyQuestion,
} from "@/lib/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, BookOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
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
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="leetcodeId" className="text-right">
            LeetCode ID
          </Label>
          <Input
            id="leetcodeId"
            name="leetcodeId"
            placeholder="e.g., 1 or 1. Two Sum"
            className="col-span-3"
            required
            disabled={isPending}
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="note" className="text-right">
            Note
          </Label>
          <Input
            id="note"
            name="note"
            placeholder="Optional note or quote"
            className="col-span-3"
            disabled={isPending}
          />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="secondary" disabled={isPending}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Question
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
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline">Daily Questions</CardTitle>
          <CardDescription>
            Quick questions to capture during idle time.
          </CardDescription>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!user}>
              <Plus className="mr-2 h-4 w-4" /> Add Question
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Daily Question</DialogTitle>
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
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : questions.length > 0 ? (
          <ul className="space-y-3">
            {questions.map((q) => (
              <li
                key={q.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-4">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Link
                      href={q.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline"
                    >
                      Question {q.leetcodeId}
                    </Link>
                    {q.note && (
                      <p className="text-sm text-muted-foreground">{q.note}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(q.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                  <span className="sr-only">Delete</span>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>No daily questions yet.</p>
            <p className="text-sm">Add one to get started!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
