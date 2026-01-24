
"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { TopicWithStats } from "@/lib/types";
import { getTopicsWithStats, addTopic } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Folder, Plus, Loader2, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "../ui/skeleton";
import { Progress } from "../ui/progress";

function AddTopicForm({
  userId,
  onTopicAdded,
}: {
  userId: string;
  onTopicAdded: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      await addTopic(userId, formData);
      onTopicAdded();
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Topic Name
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="e.g., Arrays & Hashing"
            className="h-10"
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">
            Description <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Brief description of this topic"
            className="min-h-[80px] resize-none"
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
          Create Topic
        </Button>
      </DialogFooter>
    </form>
  );
}

export function TopicsGrid() {
  const { user, loading: authLoading } = useAuth();
  const [topics, setTopics] = useState<TopicWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setAddOpen] = useState(false);

  const fetchTopics = () => {
    if (user) {
      setLoading(true);
      getTopicsWithStats(user.uid)
        .then(setTopics)
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchTopics();
    }
  }, [user, authLoading]);

  if (authLoading) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Topics</h2>
          <p className="text-sm text-muted-foreground">
            Organize problems by concept for focused revision
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 px-3" disabled={!user}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Topic
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Topic</DialogTitle>
              <DialogDescription>
                Group related problems together for better organization.
              </DialogDescription>
            </DialogHeader>
            {user && (
              <AddTopicForm
                userId={user.uid}
                onTopicAdded={() => {
                  setAddOpen(false);
                  fetchTopics();
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : topics.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => {
            const progress = topic.stats.totalQuestions > 0 
              ? Math.round((topic.stats.solvedCount / topic.stats.totalQuestions) * 100) 
              : 0;
            
            return (
              <Link
                href={`/topics/${topic.id}`}
                key={topic.id}
                className="group block"
              >
                <div className="h-full rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:border-border hover:shadow-sm hover:bg-card/80">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Folder className="h-4 w-4" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity mt-2.5" />
                  </div>
                  <div className="mt-3">
                    <h3 className="font-medium text-sm leading-tight">
                      {topic.name}
                    </h3>
                    {topic.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1 leading-relaxed">
                        {topic.description}
                      </p>
                    )}
                  </div>
                  
                  {/* Stats Section */}
                  <div className="mt-3 pt-3 border-t border-border/50">
                    {/* Question count and progress */}
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-muted-foreground">
                        {topic.stats.totalQuestions} {topic.stats.totalQuestions === 1 ? 'problem' : 'problems'}
                      </span>
                      <span className="font-medium text-primary">
                        {topic.stats.solvedCount}/{topic.stats.totalQuestions} solved
                      </span>
                    </div>
                    
                    {/* Progress bar */}
                    {topic.stats.totalQuestions > 0 && (
                      <Progress value={progress} className="h-1.5 mb-2" />
                    )}
                    
                    {/* Difficulty breakdown */}
                    {topic.stats.totalQuestions > 0 && (
                      <div className="flex gap-2 text-xs">
                        {topic.stats.easyCount > 0 && (
                          <span className="text-green-600 dark:text-green-400">
                            {topic.stats.easyCount} Easy
                          </span>
                        )}
                        {topic.stats.mediumCount > 0 && (
                          <span className="text-yellow-600 dark:text-yellow-400">
                            {topic.stats.mediumCount} Med
                          </span>
                        )}
                        {topic.stats.hardCount > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            {topic.stats.hardCount} Hard
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card py-12 px-4 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <Folder className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No topics yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create a topic to start organizing your problems
          </p>
        </div>
      )}
    </div>
  );
}
