"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { getSolvedProblems, getTopicProgress, SolvedProblem } from "@/lib/progress-actions";
import { getTopics } from "@/lib/actions";
import { getProblemById } from "@/lib/problem-lookup";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Search, ExternalLink, Filter, TrendingUp, Plus, FolderPlus, PlaySquare } from "lucide-react";
import Link from "next/link";
import type { Topic } from "@/lib/types";

export default function SolvedProblemsPage() {
  const [problems, setProblems] = useState<SolvedProblem[]>([]);
  const [topicProgress, setTopicProgress] = useState<{ name: string; solved: number; total: number; percentage: number }[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedProblems, setSelectedProblems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [total, setTotal] = useState(0);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPlaylistDialogOpen, setIsPlaylistDialogOpen] = useState(false);
  const [newProblemId, setNewProblemId] = useState("");
  const [problemDetails, setProblemDetails] = useState<any>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        const [solvedResult, topicsResult, userTopics] = await Promise.all([
          getSolvedProblems("default-user", { limit: 500 }),
          getTopicProgress(),
          user ? getTopics(user.uid) : Promise.resolve([])
        ]);

        if (solvedResult.success && solvedResult.problems) {
          setProblems(solvedResult.problems);
          setTotal(solvedResult.total || 0);
        }

        if (topicsResult.success && topicsResult.topics) {
          setTopicProgress(topicsResult.topics);
        }

        setTopics(userTopics);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Auto-fetch problem details when ID is entered
  useEffect(() => {
    if (newProblemId && /^\d+$/.test(newProblemId.trim())) {
      const problem = getProblemById(parseInt(newProblemId.trim()));
      if (problem) {
        setProblemDetails(problem);
      } else {
        setProblemDetails(null);
      }
    } else {
      setProblemDetails(null);
    }
  }, [newProblemId]);

  const addSolvedProblem = async () => {
    if (!problemDetails || !user?.uid) return;
    
    try {
      const response = await fetch('/api/solved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          problemId: problemDetails.questionFrontendId || newProblemId,
          title: problemDetails.title,
          difficulty: problemDetails.difficulty,
          titleSlug: problemDetails.titleSlug || problemDetails.slug,
          topicTags: problemDetails.topics || []
        })
      });
      
      if (response.ok) {
        toast({
          title: "Problem Added to Solved! ✅",
          description: `${problemDetails.title} has been added to your solved problems.`,
        });
        setIsAddDialogOpen(false);
        setNewProblemId("");
        setProblemDetails(null);
        
        // Refresh the data
        const loadData = async () => {
          setIsLoading(true);
          const [problemsResult, progressResult, topicsResult] = await Promise.all([
            getSolvedProblems(user.uid),
            getTopicProgress(user.uid),
            getTopics(user.uid)
          ]);
          
          if (problemsResult.success && problemsResult.problems) {
            setProblems(problemsResult.problems);
            setTotal(problemsResult.total || 0);
          }
          if (progressResult.success && progressResult.topics) {
            setTopicProgress(progressResult.topics);
          }
          if (Array.isArray(topicsResult)) {
            setTopics(topicsResult);
          }
          setIsLoading(false);
        };
        loadData();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add problem to solved. Please try again.",
        variant: "destructive"
      });
    }
  };

  const addToPlaylist = async (topicId: string) => {
    if (selectedProblems.size === 0) {
      toast({
        title: "No problems selected",
        description: "Please select at least one problem to add to the topic.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Add each selected problem to the topic
      const selectedProblemList = Array.from(selectedProblems).map(id => 
        problems.find(p => p._id?.toString() === id)
      ).filter(Boolean);
      
      for (const problem of selectedProblemList) {
        if (problem && user?.uid) {
          const response = await fetch('/api/topics/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.uid,
              topicId,
              problemId: problem.odId?.toString() || problem.questionFrontendId,
              title: problem.title,
              difficulty: problem.difficulty,
              titleSlug: problem.titleSlug,
              topicTags: problem.topicTags || []
            })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to add ${problem.title}`);
          }
        }
      }
      
      const selectedCount = selectedProblems.size;
      const topicName = topics.find(t => t.id === topicId)?.name || "topic";
      
      toast({
        title: `Added to ${topicName}! 📚`,
        description: `${selectedCount} problem(s) have been added to your ${topicName} playlist.`,
      });
      
      setSelectedProblems(new Set());
      setIsPlaylistDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add problems to topic. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "EASY": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "MEDIUM": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "HARD": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Filter problems
  const filteredProblems = problems.filter(problem => {
    const matchesSearch = problem.title.toLowerCase().includes(search.toLowerCase());
    const matchesDifficulty = difficultyFilter === "all" || problem.difficulty === difficultyFilter;
    const matchesTopic = topicFilter === "all" || problem.topicTags?.includes(topicFilter);
    return matchesSearch && matchesDifficulty && matchesTopic;
  });

  // Get unique topics from solved problems
  const uniqueTopics = [...new Set(problems.flatMap(p => p.topicTags || []))].sort();

  if (isLoading) {
    return (
      <div className="space-y-6 pb-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            My Solved Problems
          </h1>
          <p className="text-muted-foreground mt-2">
            Track and review all the problems you&apos;ve conquered
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Solved Problem
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Solved Problem</DialogTitle>
                <DialogDescription>
                  Enter the LeetCode problem ID to add it to your solved list
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="problemId">LeetCode Problem ID</Label>
                  <Input
                    id="problemId"
                    value={newProblemId}
                    onChange={(e) => setNewProblemId(e.target.value)}
                    placeholder="e.g., 1"
                  />
                  {problemDetails && (
                    <div className="mt-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800 dark:text-green-200">{problemDetails.title}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          problemDetails.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                          problemDetails.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {problemDetails.difficulty}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={addSolvedProblem} disabled={!problemDetails}>
                  Add to Solved
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {selectedProblems.size > 0 && (
            <Dialog open={isPlaylistDialogOpen} onOpenChange={setIsPlaylistDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <PlaySquare className="h-4 w-4" />
                  Add to Topic ({selectedProblems.size})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add to Topic Playlist</DialogTitle>
                  <DialogDescription>
                    Select a topic to add the selected problems to your playlist
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select Topic</Label>
                    <Select onValueChange={addToPlaylist}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {topics.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id}>
                            <div className="flex items-center gap-2">
                              <FolderPlus className="h-4 w-4" />
                              {topic.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-600">{total}</div>
            <p className="text-sm text-muted-foreground">Total Solved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-500">
              {problems.filter(p => p.difficulty === "EASY").length}
            </div>
            <p className="text-sm text-muted-foreground">Easy Problems</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-yellow-500">
              {problems.filter(p => p.difficulty === "MEDIUM").length}
            </div>
            <p className="text-sm text-muted-foreground">Medium Problems</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-red-500">
              {problems.filter(p => p.difficulty === "HARD").length}
            </div>
            <p className="text-sm text-muted-foreground">Hard Problems</p>
          </CardContent>
        </Card>
      </div>

      {/* Topic Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Topic Progress
          </CardTitle>
          <CardDescription>Your progress across different DSA topics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {topicProgress.slice(0, 12).map((topic) => (
              <div key={topic.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate">{topic.name}</span>
                  <span className="text-muted-foreground shrink-0">
                    {topic.solved}/{topic.total}
                  </span>
                </div>
                <Progress value={topic.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulties</SelectItem>
            <SelectItem value="EASY">Easy</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HARD">Hard</SelectItem>
          </SelectContent>
        </Select>
        <Select value={topicFilter} onValueChange={setTopicFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            {uniqueTopics.map(topic => (
              <SelectItem key={topic} value={topic}>{topic}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Problems List */}
      <Card>
        <CardHeader>
          <CardTitle>Solved Problems ({filteredProblems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredProblems.map((problem) => (
              <div
                key={problem.titleSlug}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Checkbox
                    checked={selectedProblems.has(problem.titleSlug)}
                    onCheckedChange={(checked) => {
                      const newSelected = new Set(selectedProblems);
                      if (checked) {
                        newSelected.add(problem.titleSlug);
                      } else {
                        newSelected.delete(problem.titleSlug);
                      }
                      setSelectedProblems(newSelected);
                    }}
                  />
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <div className="min-w-0">
                    <Link
                      href={`https://leetcode.com/problems/${problem.titleSlug}`}
                      target="_blank"
                      className="font-medium text-sm hover:text-primary flex items-center gap-1"
                    >
                      <span className="text-muted-foreground mr-1">#{problem.questionFrontendId}</span>
                      {problem.title}
                      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                    </Link>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {problem.topicTags?.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                      {(problem.topicTags?.length || 0) > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{(problem.topicTags?.length || 0) - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge className={getDifficultyColor(problem.difficulty)}>
                    {problem.difficulty}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(problem.acRate * 100)}% AC
                  </span>
                </div>
              </div>
            ))}
            
            {filteredProblems.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No problems found matching your filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}