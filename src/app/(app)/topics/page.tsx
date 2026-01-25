"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getTopicsWithStats, addTopic, deleteTopic } from "@/lib/actions";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Plus, BookOpen, Trash2, Search, Filter } from "lucide-react";
import Link from "next/link";
import type { TopicWithStats } from "@/lib/types";

export default function TopicsPage() {
  const [topics, setTopics] = useState<TopicWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicDescription, setNewTopicDescription] = useState("");
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const fetchTopics = async () => {
    if (user) {
      setIsLoading(true);
      const fetchedTopics = await getTopicsWithStats(user.uid);
      if (Array.isArray(fetchedTopics)) {
        setTopics(fetchedTopics);
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchTopics();
    }
  }, [user, authLoading]);

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !newTopicName.trim()) return;

    try {
      const formData = new FormData();
      formData.append('name', newTopicName.trim());
      formData.append('description', newTopicDescription.trim());
      
      await addTopic(user.uid, formData);
      
      toast({
        title: "Topic Created! 📚",
        description: `${newTopicName} has been added to your topics.`,
      });
      
      setNewTopicName("");
      setNewTopicDescription("");
      setIsAddDialogOpen(false);
      fetchTopics();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create topic. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTopic = async (topicId: string, topicName: string) => {
    if (!user?.uid) return;

    try {
      await deleteTopic(user.uid, topicId);
      
      toast({
        title: "Topic Deleted",
        description: `${topicName} has been removed.`,
      });
      
      fetchTopics();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete topic. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Filter topics
  const filteredTopics = topics.filter(topic => 
    topic.name.toLowerCase().includes(search.toLowerCase()) ||
    (topic.description?.toLowerCase().includes(search.toLowerCase()))
  );

  if (authLoading || isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Topics</h1>
            <p className="text-sm text-muted-foreground">Organize your problems by topic</p>
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Topics</h1>
          <p className="text-sm text-muted-foreground">Organize your problems by topic</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shrink-0">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Topic</span>
              <span className="sm:hidden">New</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Topic</DialogTitle>
              <DialogDescription>
                Create a new topic to organize your problems.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddTopic} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Topic Name</Label>
                <Input
                  id="name"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="e.g., Dynamic Programming"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={newTopicDescription}
                  onChange={(e) => setNewTopicDescription(e.target.value)}
                  placeholder="Brief description of the topic"
                  rows={3}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="ghost">Cancel</Button>
                </DialogClose>
                <Button type="submit">Create Topic</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Badge variant="secondary" className="text-xs shrink-0">
          {filteredTopics.length} {filteredTopics.length === 1 ? 'topic' : 'topics'}
        </Badge>
      </div>

      {/* Topics Grid */}
      {filteredTopics.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTopics.map((topic) => (
            <Link key={topic.id} href={`/topics/${topic.id}`} className="block group">
              <Card className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <BookOpen className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm font-medium truncate">{topic.name}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {topic.createdAt ? new Date((topic.createdAt as any).toDate?.() || topic.createdAt).toLocaleDateString() : 'Recently'}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteTopic(topic.id, topic.name);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {topic.description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {topic.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-xs py-0.5 px-1.5">
                        {topic.stats.totalQuestions} questions
                      </Badge>
                      {topic.stats.totalQuestions > 0 && (
                        <div className="flex gap-1 text-xs">
                          {topic.stats.easyCount > 0 && (
                            <span className="text-green-600 dark:text-green-400">
                              {topic.stats.easyCount}E
                            </span>
                          )}
                          {topic.stats.mediumCount > 0 && (
                            <span className="text-yellow-600 dark:text-yellow-400">
                              {topic.stats.mediumCount}M
                            </span>
                        )}
                        {topic.stats.hardCount > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            {topic.stats.hardCount}H
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                    Click to open →
                  </div>
                </div>
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          {search ? (
            <>
              <Filter className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <h3 className="text-base font-medium mb-2">No topics found</h3>
              <p className="text-sm text-muted-foreground mb-3">
                No topics match your search "{search}". Try a different search term.
              </p>
              <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                Clear search
              </Button>
            </>
          ) : (
            <>
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <h3 className="text-base font-medium mb-2">No topics yet</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Create your first topic to organize your LeetCode problems by categories.
              </p>
              <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create Your First Topic
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}