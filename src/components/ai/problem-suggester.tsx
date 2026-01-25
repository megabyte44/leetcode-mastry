
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { suggestLeetCodeProblems, SuggestLeetCodeProblemsOutput } from "@/ai/flows/suggest-leetcode-problems";
import { getAllUserProblems, addAISuggestedToDailyQuestion, getTopicsWithStats } from "@/lib/actions";
import { cache, CacheUtils } from "@/lib/cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Sparkles, 
  ExternalLink, 
  BrainCircuit, 
  Plus, 
  TrendingUp, 
  Target, 
  Clock, 
  BookOpen,
  Zap,
  Brain,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Cloud
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import type { TopicWithStats } from "@/lib/types";


const formSchema = z.object({
  topic: z.string().optional(),
  numberOfProblems: z.coerce.number().min(1).max(10).default(5),
  additionalContext: z.string().optional(),
  targetDifficulty: z.string().optional(),
  focusArea: z.string().optional(),
  includeWeakAreas: z.boolean().default(true),
  prioritizeRecent: z.boolean().default(true),
  adaptiveDifficulty: z.boolean().default(true),
});

const STORAGE_KEY = "ai-suggester-form-data";
const SUGGESTIONS_STORAGE_KEY = "ai-suggester-suggestions";

export function AIProblemSuggester() {
  const [suggestions, setSuggestions] = useState<SuggestLeetCodeProblemsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personalStats, setPersonalStats] = useState<any>(null);
  const [topics, setTopics] = useState<TopicWithStats[]>([]);
  const [addingToDaily, setAddingToDaily] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
      numberOfProblems: 5,
      additionalContext: "",
      targetDifficulty: "any",
      focusArea: "weakness",
      includeWeakAreas: true,
      prioritizeRecent: true,
      adaptiveDifficulty: true,
    },
  });

  // Load saved form data and suggestions on component mount
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

    // Load saved suggestions
    const savedSuggestions = localStorage.getItem(SUGGESTIONS_STORAGE_KEY);
    if (savedSuggestions) {
      try {
        const parsedSuggestions = JSON.parse(savedSuggestions);
        setSuggestions(parsedSuggestions);
      } catch (error) {
        console.error("Failed to parse saved suggestions:", error);
      }
    }
  }, [form]);

  // Load personal statistics and topics
  useEffect(() => {
    if (user) {
      loadPersonalData();
    }
  }, [user]);

  const loadPersonalData = async () => {
    if (!user) return;
    
    try {
      const [userProblems, userTopics] = await Promise.all([
        getAllUserProblems(user.uid),
        getTopicsWithStats(user.uid)
      ]);
      
      // Calculate detailed personal statistics
      const today = new Date();
      const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const stats = {
        totalSolved: userProblems.Solved?.length || 0,
        totalTricky: userProblems.Tricky?.length || 0,
        totalRepeat: userProblems.Repeat?.length || 0,
        totalImportant: userProblems.Important?.length || 0,
        totalToDo: userProblems['To-Do']?.length || 0,
        
        // Identify weakest areas with more context
        weakestAreas: userTopics
          .filter(topic => topic.stats.totalQuestions > 0)
          .map(topic => ({
            ...topic,
            successRate: topic.stats.solvedCount / topic.stats.totalQuestions,
            needsWork: topic.stats.totalQuestions > 2 && topic.stats.solvedCount / topic.stats.totalQuestions < 0.6
          }))
          .sort((a, b) => a.successRate - b.successRate)
          .slice(0, 8),
          
        // Calculate performance patterns
        performancePatterns: {
          trickyToSolvedRatio: (userProblems.Tricky?.length || 0) / Math.max(1, userProblems.Solved?.length || 1),
          repeatToSolvedRatio: (userProblems.Repeat?.length || 0) / Math.max(1, userProblems.Solved?.length || 1),
          toDoAccumulation: (userProblems['To-Do']?.length || 0) > 10,
          strongInInterviews: (userProblems.Important?.length || 0) > 5,
        },
        
        // Learning velocity indicators
        recentActivity: {
          hasRecentSolved: userProblems.Solved?.some(p => {
            // This would need timestamp data, approximating with array position
            return userProblems.Solved.indexOf(p) > Math.max(0, userProblems.Solved.length - 5);
          }),
          recentStruggles: userProblems.Tricky?.slice(-3) || [],
          consistencyScore: Math.min(1, (userProblems.Solved?.length || 0) / Math.max(1, (userProblems['To-Do']?.length || 0) + (userProblems.Tricky?.length || 0))),
        }
      };
      
      setPersonalStats(stats);
      setTopics(userTopics);
    } catch (error) {
      console.error("Failed to load personal data:", error);
    }
  };

  // Quick capture function to add to daily list
  const addToDailyList = async (problem: any) => {
    if (!user) return;
    
    setAddingToDaily(problem.leetcodeProblemId);
    
    try {
      await addAISuggestedToDailyQuestion(
        user.uid, 
        problem.leetcodeProblemId, 
        problem.title, 
        problem.reason, 
        problem.url
      );
      
      toast({
        title: "Added to Daily List! 🎯",
        description: `${problem.title} has been added to your daily practice queue.`,
      });
    } catch (error) {
      toast({
        title: "Failed to add",
        description: "Could not add to daily list. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingToDaily(null);
    }
  };

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
      
      // Create enhanced cache key that includes personal context
      const personalContext = {
        stats: personalStats,
        topicPrefs: values,
        weakAreas: personalStats?.weakestAreas?.slice(0, 3).map(t => t.name) || [],
        patterns: personalStats?.performancePatterns || {}
      };
      
      const enhancedCacheKey = CacheUtils.createAICacheKey(
        user.uid, 
        bucketHistory, 
        values.topic, 
        `${values.additionalContext}_${JSON.stringify(personalContext)}_v2`
      );
      
      // Try to get from cache first
      const cachedResult = await cache.get('ai_suggestions', enhancedCacheKey);
      if (cachedResult && !values.prioritizeRecent) {
        setSuggestions(cachedResult);
        console.log('Using cached personalized AI suggestions');
        setIsLoading(false);
        return;
      }
      
      // If not in cache or prioritizing recent data, make API call
      console.log('Making personalized AI API call...');
      const enhancedInput = {
        ...values,
        bucketHistory,
        personalStats,
        topicPerformance: topics.reduce((acc, topic) => {
          acc[topic.name] = {
            solved: topic.stats.solvedCount,
            total: topic.stats.totalQuestions,
            successRate: topic.stats.totalQuestions > 0 ? topic.stats.solvedCount / topic.stats.totalQuestions : 0
          };
          return acc;
        }, {} as Record<string, any>),
        weakestAreas: personalStats?.weakestAreas?.filter(area => area.needsWork).map(area => area.name) || [],
        learningVelocity: personalStats?.recentActivity || {},
        userPreferences: {
          includeWeakAreas: values.includeWeakAreas,
          adaptiveDifficulty: values.adaptiveDifficulty,
          focusArea: values.focusArea
        }
      };
      
      const result = await suggestLeetCodeProblems(enhancedInput);
      
      setSuggestions(result);
      
      // Cache the new result
      await cache.set('ai_suggestions', enhancedCacheKey, result);
      console.log('Cached new personalized AI suggestions');
      
      // Also save to localStorage as backup
      localStorage.setItem(SUGGESTIONS_STORAGE_KEY, JSON.stringify(result));
    } catch (e) {
      console.error(e);
      setError("Failed to get suggestions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const clearSuggestions = async () => {
    setSuggestions(null);
    localStorage.removeItem(SUGGESTIONS_STORAGE_KEY);
    
    // Clear all AI suggestions from IndexedDB cache
    try {
      await cache.clear('ai_suggestions');
      console.log('Cleared AI suggestions cache');
      toast({
        title: "Suggestions Cleared",
        description: "All AI suggestions have been cleared from cache.",
      });
    } catch (error) {
      console.error('Failed to clear AI cache:', error);
      toast({
        title: "Suggestions Cleared",
        description: "All AI suggestions have been cleared.",
      });
    }
  };

  const difficultyStyles: Record<string, string> = {
    "easy": "text-emerald-600 dark:text-emerald-400",
    "medium": "text-amber-600 dark:text-amber-400",
    "hard": "text-red-600 dark:text-red-400",
  };

  return (
    <div className="space-y-6">
      {suggestions && (
        <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200/50 dark:border-blue-800/50">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <Cloud className="h-4 w-4" />
            <span className="font-medium">Your AI suggestions are stored in the cloud and will persist until manually cleared</span>
          </div>
        </div>
      )}
      
      <Tabs defaultValue="suggester" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="suggester">AI Suggestions</TabsTrigger>
          <TabsTrigger value="insights">Personal Insights</TabsTrigger>
          <TabsTrigger value="topics">Topic Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="suggester" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Enhanced Input Form */}
            <div className="lg:col-span-1">
              <Card className="border-border/50 bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Get Smart Suggestions
                  </CardTitle>
                  <CardDescription>
                    AI analyzes your practice history for targeted recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="focusArea" className="text-sm font-medium">
                          Focus Strategy
                        </Label>
                        <Select {...form.register("focusArea")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose focus area" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weakness">🎯 Target Weaknesses</SelectItem>
                            <SelectItem value="strength">💪 Build Strengths</SelectItem>
                            <SelectItem value="mixed">⚖️ Balanced Practice</SelectItem>
                            <SelectItem value="interview">🚀 Interview Prep</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="targetDifficulty" className="text-sm font-medium">
                          Target Difficulty
                        </Label>
                        <Select {...form.register("targetDifficulty")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Any difficulty" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any Difficulty (Easy/Medium)</SelectItem>
                            <SelectItem value="easy">🟢 Easy Only</SelectItem>
                            <SelectItem value="medium">🟡 Medium Only</SelectItem>
                            <SelectItem value="progressive">📈 Progressive (Easy→Medium)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

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

                      {/* Personalization Options */}
                      <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
                        <div className="flex items-center gap-2 mb-3">
                          <BrainCircuit className="h-4 w-4 text-blue-500" />
                          <Label className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            AI Personalization
                          </Label>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="includeWeakAreas"
                              {...form.register("includeWeakAreas")}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="includeWeakAreas" className="text-sm">
                              🎯 Target my weakest topic areas
                            </Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="prioritizeRecent"
                              {...form.register("prioritizeRecent")}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="prioritizeRecent" className="text-sm">
                              ⚡ Prioritize fresh suggestions over cached ones
                            </Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="adaptiveDifficulty"
                              {...form.register("adaptiveDifficulty")}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="adaptiveDifficulty" className="text-sm">
                              📈 Adapt difficulty based on my success patterns
                            </Label>
                          </div>
                        </div>
                        
                        {personalStats && (
                          <div className="mt-3 p-2 bg-white/60 dark:bg-slate-800/60 rounded text-xs">
                            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                              <div>Solved: {personalStats.totalSolved}</div>
                              <div>Tricky: {personalStats.totalTricky}</div>
                              <div>Success Rate: {personalStats.recentActivity.consistencyScore > 0 ? Math.round(personalStats.recentActivity.consistencyScore * 100) : 0}%</div>
                              <div className={personalStats.recentActivity.hasRecentSolved ? "text-green-600" : "text-orange-600"}>
                                {personalStats.recentActivity.hasRecentSolved ? "🟢 Active" : "🟡 Inactive"}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="additionalContext" className="text-sm font-medium">
                          Specific Goals & Context <span className="text-muted-foreground font-normal">(be specific for better suggestions)</span>
                        </Label>
                        <Textarea 
                          id="additionalContext" 
                          {...form.register("additionalContext")} 
                          placeholder="Examples:
• 'Preparing for Meta interview in 2 weeks, struggling with tree traversal patterns'
• 'Want to master sliding window, currently solve easy arrays but struggle with medium'
• 'Focus on optimization - I can solve problems but time complexity is poor'
• 'Avoid recursion-heavy problems, prefer iterative solutions'
• 'Need to understand when to use different data structures'"
                          className="min-h-[120px] resize-none text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          💡 The more specific you are, the better AI can tailor suggestions to your actual needs
                        </p>
                        
                        {/* Quick Context Buttons */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => form.setValue("additionalContext", "Preparing for FAANG interviews in 3-4 weeks, need to focus on Easy to Medium problems with optimal solutions and clean code")}
                            className="text-xs px-2 py-1 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                          >
                            🚀 Interview Prep
                          </button>
                          <button
                            type="button"
                            onClick={() => form.setValue("additionalContext", "I can solve problems but my solutions are inefficient. Need help with optimization techniques and choosing right data structures")}
                            className="text-xs px-2 py-1 rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50"
                          >
                            ⚡ Optimization Focus
                          </button>
                          <button
                            type="button"
                            onClick={() => form.setValue("additionalContext", "Stuck at easy level, want to progressively tackle medium problems. Need bridge problems that build confidence without jumping to hard")}
                            className="text-xs px-2 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
                          >
                            📈 Level Up
                          </button>
                          <button
                            type="button"
                            onClick={() => form.setValue("additionalContext", "Looking for pattern recognition - want to understand when and how to apply different algorithmic approaches")}
                            className="text-xs px-2 py-1 rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
                          >
                            🧩 Pattern Mastery
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <Button type="submit" disabled={isLoading || !user} className="w-full h-11 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <BrainCircuit className="mr-2 h-4 w-4" />
                      )}
                      {isLoading ? "Personalizing..." : "Generate Personalized Suggestions"}
                    </Button>
                    
                    {personalStats && (
                      <div className="mt-3 text-center">
                        <p className="text-xs text-muted-foreground">
                          🧠 AI will analyze your {personalStats.totalSolved} solved problems and {personalStats.weakestAreas.filter(a => a.needsWork).length} weak areas for personalized suggestions
                        </p>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Results */}
            <div className="lg:col-span-2">
              <Card className="border-0 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-blue-950/20 dark:via-slate-900/40 dark:to-purple-950/20 min-h-[400px] shadow-xl shadow-blue-100/30 dark:shadow-blue-900/10 backdrop-blur-sm">
                {isLoading && (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping"></div>
                      <Loader2 className="relative h-8 w-8 animate-spin text-blue-500 mb-4" />
                    </div>
                    <p className="text-sm font-medium">Analyzing your personal practice patterns...</p>
                    <p className="text-xs text-muted-foreground mt-1">AI is crafting suggestions based on your specific data 🧠</p>
                  </div>
                )}
                
                {error && (
                  <div className="flex flex-col items-center justify-center py-20">
                    <AlertCircle className="h-8 w-8 text-destructive mb-3" />
                    <p className="text-sm text-destructive font-medium">Something went wrong</p>
                    <p className="text-xs text-muted-foreground mt-1">{error}</p>
                  </div>
                )}
                
                {!isLoading && !error && !suggestions && (
                  <div className="flex flex-col items-center justify-center py-20 px-4">
                    <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4 shadow-lg">
                      <BrainCircuit className="h-8 w-8 text-blue-500" />
                      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-400/20 animate-pulse"></div>
                    </div>
                    <p className="text-lg font-medium text-foreground">Ready for Personalized AI Suggestions</p>
                    <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
                      Configure your preferences above and let AI analyze your unique practice patterns for tailored recommendations 🧠
                    </p>
                  </div>
                )}
                
                {suggestions && (
                  <div>
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <BrainCircuit className="h-5 w-5 text-blue-500" />
                            Personalized AI Recommendations
                          </CardTitle>
                          <CardDescription>
                            Problems tailored to your specific practice history, weak areas, and learning patterns
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => onSubmit(form.getValues())}
                            disabled={isLoading || !user}
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Refresh
                          </Button>
                          <Button
                            onClick={clearSuggestions}
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Clear
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-0">
                      <div className="space-y-4">
                        {suggestions.suggestedProblems.map((problem, index) => (
                          <div 
                            key={problem.leetcodeProblemId} 
                            className="group relative p-5 rounded-2xl border-0 bg-gradient-to-br from-blue-50/80 via-white to-purple-50/80 dark:from-blue-950/20 dark:via-slate-900/50 dark:to-purple-950/20 shadow-lg shadow-blue-100/50 dark:shadow-blue-900/10 hover:shadow-xl hover:shadow-blue-200/60 dark:hover:shadow-blue-800/20 transition-all duration-300 backdrop-blur-sm border border-blue-100/50 dark:border-blue-800/30"
                          >
                            {/* Cloud effect overlay */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent via-blue-50/20 to-purple-100/20 dark:from-transparent dark:via-blue-900/10 dark:to-purple-900/10 opacity-60"></div>
                            
                            <div className="relative flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0 space-y-3">
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-bold shadow-md">
                                    #{index + 1}
                                  </span>
                                  <h4 className="font-bold text-base text-slate-800 dark:text-slate-100">{problem.title}</h4>
                                  <Badge 
                                    variant={problem.difficulty.toLowerCase() === 'easy' ? 'default' : problem.difficulty.toLowerCase() === 'medium' ? 'secondary' : 'destructive'} 
                                    className="text-xs font-semibold shadow-sm"
                                  >
                                    {problem.difficulty}
                                  </Badge>
                                </div>
                                <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 backdrop-blur-sm border border-blue-100/40 dark:border-blue-800/40">
                                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                    <span className="font-semibold text-blue-700 dark:text-blue-300">💡 AI Insight:</span> {problem.reason}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button 
                                  onClick={() => addToDailyList(problem)}
                                  disabled={addingToDaily === problem.leetcodeProblemId}
                                  size="sm" 
                                  variant="outline"
                                  className="h-9 px-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-blue-200/60 dark:border-blue-700/60 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 shadow-sm"
                                >
                                  {addingToDaily === problem.leetcodeProblemId ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Plus className="h-4 w-4 mr-1" />
                                      Add
                                    </>
                                  )}
                                </Button>
                                <Button 
                                  asChild 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-9 w-9 p-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-200 shadow-sm"
                                >
                                  <Link href={problem.url} target="_blank">
                                    <ExternalLink className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {personalStats ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Solved
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{personalStats.totalSolved}</div>
                  <p className="text-xs text-muted-foreground">Problems completed</p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    Tricky
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{personalStats.totalTricky}</div>
                  <p className="text-xs text-muted-foreground">Need attention</p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    Repeat
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{personalStats.totalRepeat}</div>
                  <p className="text-xs text-muted-foreground">For review</p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    To-Do
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-600">{personalStats.totalToDo}</div>
                  <p className="text-xs text-muted-foreground">Queued</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </TabsContent>

        <TabsContent value="topics" className="space-y-6">
          <div className="grid gap-4">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Topic Performance Analysis</h3>
            </div>
            
            {topics.length > 0 ? (
              <div className="space-y-4">
                {topics.map((topic) => {
                  const successRate = topic.stats.totalQuestions > 0 
                    ? (topic.stats.solvedCount / topic.stats.totalQuestions) * 100 
                    : 0;
                  
                  return (
                    <Card key={topic.id} className="border-border/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">{topic.name}</CardTitle>
                          <Badge variant={successRate >= 70 ? 'default' : successRate >= 40 ? 'secondary' : 'destructive'} className="text-xs">
                            {successRate.toFixed(0)}% Complete
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <Progress value={successRate} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{topic.stats.solvedCount}/{topic.stats.totalQuestions} solved</span>
                            <span>{topic.stats.easyCount}E • {topic.stats.mediumCount}M • {topic.stats.hardCount}H</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No topics created yet</p>
                <p className="text-xs mt-1">Start by creating topics to track your progress</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
