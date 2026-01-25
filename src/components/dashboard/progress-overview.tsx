"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserProgress, getTopicProgress, UserProgress } from "@/lib/progress-actions";
import { TrendingUp, Target, Award, BookOpen, CheckCircle2 } from "lucide-react";

export function ProgressOverview() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [topicProgress, setTopicProgress] = useState<{ name: string; solved: number; total: number; percentage: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      try {
        const [progressResult, topicsResult] = await Promise.all([
          getUserProgress(),
          getTopicProgress()
        ]);

        if (progressResult.success && progressResult.progress) {
          setProgress(progressResult.progress);
        }

        if (topicsResult.success && topicsResult.topics) {
          setTopicProgress(topicsResult.topics);
        }
      } catch (error) {
        console.error("Failed to load progress:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProgress();
  }, []);

  if (isLoading) {
    return (
      <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 sm:h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!progress) {
    return null;
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "hard": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards - Mobile optimized grid */}
      <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Solved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{progress.totalSolved}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              of {progress.totalProblems} ({progress.progressPercentage}%)
            </p>
            <Progress value={progress.progressPercentage} className="mt-2 h-1.5 sm:h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Easy</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{progress.byDifficulty.easy}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">solved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Medium</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">{progress.byDifficulty.medium}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">solved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Hard</CardTitle>
            <Award className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-red-600">{progress.byDifficulty.hard}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">solved</p>
          </CardContent>
        </Card>
      </div>

      {/* Topic Progress & Recent Activity */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {/* Topic Progress */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
              Topic Progress
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Your progress across different topics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
            {topicProgress.slice(0, 6).map((topic) => (
              <div key={topic.name} className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium truncate mr-2">{topic.name}</span>
                  <span className="text-muted-foreground shrink-0">
                    {topic.solved}/{topic.total}
                  </span>
                </div>
                <Progress value={topic.percentage} className="h-1.5 sm:h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Topics Covered */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Award className="h-4 w-4 sm:h-5 sm:w-5" />
              Top Topics Mastered
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Topics you&apos;ve practiced the most</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {progress.topTopics.map((topic, index) => (
                <Badge 
                  key={topic.name} 
                  variant={index < 3 ? "default" : "secondary"}
                  className="text-sm py-1 px-3"
                >
                  {topic.name} ({topic.count})
                </Badge>
              ))}
            </div>

            {/* Recently Solved */}
            <div className="mt-6">
              <h4 className="font-medium mb-3">Recently Solved</h4>
              <div className="space-y-2">
                {progress.recentlySolved.slice(0, 5).map((problem) => (
                  <div 
                    key={problem.titleSlug}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {problem.title}
                    </span>
                    <Badge className={getDifficultyColor(problem.difficulty.toLowerCase())}>
                      {problem.difficulty}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}