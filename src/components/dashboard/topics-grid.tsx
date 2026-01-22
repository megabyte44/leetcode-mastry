
"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Topic } from "@/lib/types";
import { getTopics, addTopic } from "@/lib/actions";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "../ui/skeleton";

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
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Name
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="e.g., Arrays & Hashing"
            className="col-span-3"
            required
            disabled={isPending}
          />
        </div>
        <div className="grid grid-cols-4 items-start gap-4">
          <Label htmlFor="description" className="text-right pt-2">
            Description
          </Label>
          <Textarea
            id="description"
            name="description"
            placeholder="A brief description of the topic"
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
          Create Topic
        </Button>
      </DialogFooter>
    </form>
  );
}

export function TopicsGrid() {
  const { user, loading: authLoading } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setAddOpen] = useState(false);

  const fetchTopics = () => {
    if (user) {
      setLoading(true);
      getTopics(user.uid)
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
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline">Topics</CardTitle>
          <CardDescription>
            Organize your questions into topics for focused revision.
          </CardDescription>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!user}>
              <Plus className="mr-2 h-4 w-4" /> Add Topic
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Topic</DialogTitle>
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
      </CardHeader>
      <CardContent>
        {loading ? (
           <div className="flex justify-center items-center py-8">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
           </div>
        ) : topics.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <Link
                href={`/topics/${topic.id}`}
                key={topic.id}
                className="block"
              >
                <Card className="h-full transition-all hover:shadow-md hover:-translate-y-1">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg font-headline">
                        {topic.name}
                      </CardTitle>
                      <Folder className="h-5 w-5 text-primary" />
                    </div>
                    <CardDescription className="line-clamp-2">
                      {topic.description || "No description."}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>No topics yet.</p>
            <p className="text-sm">
              Create a topic to start organizing your problems.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
