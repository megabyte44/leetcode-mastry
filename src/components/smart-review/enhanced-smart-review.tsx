"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  getDueForReview,
  recordReview,
  getReviewStats,
  getWeakTopics,
  importSolvedProblemsToReview,
  getRecommendedForReview,
  addToReviewSystem,
  type SmartReview,
  type ReviewStats
} from "@/lib/smart-review-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  RotateCcw, 
  Brain,
  Clock,
  Trophy,
  TrendingUp,
  Target,
  Star,
  ChevronRight,
  ExternalLink,
  Plus,
  BarChart3,
  Flame,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

const CONFIDENCE_LEVELS = [
  { value: 1, label: "Need Help", description: "I couldn't solve this", color: "text-red-500" },
  { value: 2, label: "Struggled", description: "Solved with difficulty", color: "text-orange-500" },
  { value: 3, label: "Okay", description: "Solved but not confident", color: "text-yellow-500" },
  { value: 4, label: "Good", description: "Solved confidently", color: "text-blue-500" },
  { value: 5, label: "Mastered", description: "Easy, can teach others", color: "text-green-500" },
];

const MASTERY_COLORS = {
  learning: "border-blue-200 bg-blue-50",
  practicing: "border-yellow-200 bg-yellow-50", 
  mastered: "border-green-200 bg-green-50",
  forgotten: "border-red-200 bg-red-50"
};

export function EnhancedSmartReview() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [dueProblems, setDueProblems] = useState<SmartReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [weakTopics, setWeakTopics] = useState<any[]>([]);
  const [recommendedProblems, setRecommendedProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  
  // Review session state
  const [currentProblem, setCurrentProblem] = useState<SmartReview | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [selectedConfidence, setSelectedConfidence] = useState<number | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Load all data
  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [dueResult, statsResult, topicsResult, recommendedResult] = await Promise.all([
        getDueForReview(user.uid, 20),
        getReviewStats(user.uid),
        getWeakTopics(user.uid),
        getRecommendedForReview(user.uid, 10)
      ]);

      if (dueResult.success && dueResult.problems) {
        setDueProblems(dueResult.problems);
      }

      if (statsResult.success && statsResult.stats) {
        setStats(statsResult.stats);
      }

      if (topicsResult.success && topicsResult.topics) {
        setWeakTopics(topicsResult.topics);
      }

      if (recommendedResult.success && recommendedResult.problems) {
        setRecommendedProblems(recommendedResult.problems);
      }
    } catch (error) {
      console.error("Error loading review data:", error);
      toast({
        title: "Error",
        description: "Failed to load review data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Start review session
  const startReview = (problem: SmartReview) => {
    setCurrentProblem(problem);
    setSelectedConfidence(null);
    setReviewNotes("");
    setIsReviewOpen(true);
  };

  // Submit review
  const submitReview = async () => {
    if (!user || !currentProblem || !selectedConfidence) {
      toast({
        title: "Error",
        description: "Please select a confidence level",
        variant: "destructive",
      });
      return;
    }

    const result = await recordReview(
      user.uid,
      currentProblem.problemSlug,
      selectedConfidence,
      reviewNotes || undefined
    );

    if (result.success) {
      toast({
        title: "Review Recorded",
        description: `Next review: ${result.nextReviewDate?.toLocaleDateString()}`,
      });
      
      setIsReviewOpen(false);
      setCurrentProblem(null);
      loadData(); // Refresh data
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to record review",
        variant: "destructive",
      });
    }
  };

  // Import solved problems
  const handleImport = async () => {
    if (!user) return;
    
    setImporting(true);
    try {
      const result = await importSolvedProblemsToReview(user.uid);
      
      if (result.success) {
        toast({
          title: "Import Complete",
          description: `Imported ${result.imported} problems to review system`,
        });
        loadData();
      } else {
        toast({
          title: "Import Error",
          description: result.error || "Failed to import problems",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Import error:", error);
    } finally {
      setImporting(false);
    }
  };

  // Add problem to review system
  const addToReview = async (problem: any) => {
    if (!user) return;

    const result = await addToReviewSystem(
      user.uid,
      problem.titleSlug,
      problem.title,
      problem.difficulty,
      problem.topicTags || [],
      3 // Default confidence
    );

    if (result.success) {
      toast({
        title: "Added to Review",
        description: `${problem.title} added to review system`,
      });
      loadData();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to add to review",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Brain className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Smart Review System</h2>
        <p className="text-muted-foreground">Please log in to use the spaced repetition system</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
            <RotateCcw className="h-6 w-6 sm:h-8 sm:w-8" />
            Smart Review
          </h1>
          <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
            Spaced repetition system to master LeetCode problems
          </p>
        </div>
        
        {stats && stats.totalProblems === 0 && (
          <Button onClick={handleImport} disabled={importing} variant="outline" className="w-full sm:w-auto touch-manipulation">
            <Download className="h-4 w-4 mr-2" />
            {importing ? "Importing..." : "Import Solved Problems"}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="p-3 sm:p-6">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-6 sm:h-8 bg-muted rounded w-1/2 mt-2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : stats && stats.totalProblems === 0 ? (
        <EmptyState onImport={handleImport} importing={importing} />
      ) : (
        <Tabs defaultValue="review" className="space-y-4 sm:space-y-6">
          {/* Mobile-optimized tab list */}
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger value="review" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 py-2 sm:py-1.5 text-[10px] sm:text-sm">
              <Clock className="h-4 w-4" />
              <span className="hidden xs:inline">Review</span>
              <span className="xs:hidden">Rev</span>
              <span className="hidden sm:inline">({stats?.dueForReview || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 py-2 sm:py-1.5 text-[10px] sm:text-sm">
              <BarChart3 className="h-4 w-4" />
              <span>Stats</span>
            </TabsTrigger>
            <TabsTrigger value="topics" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 py-2 sm:py-1.5 text-[10px] sm:text-sm">
              <Target className="h-4 w-4" />
              <span className="hidden xs:inline">Topics</span>
              <span className="xs:hidden">Weak</span>
            </TabsTrigger>
            <TabsTrigger value="add" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 py-2 sm:py-1.5 text-[10px] sm:text-sm">
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="review" className="space-y-4">
            <ReviewTab 
              dueProblems={dueProblems}
              onStartReview={startReview}
              stats={stats}
            />
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <StatsTab stats={stats} />
          </TabsContent>

          <TabsContent value="topics" className="space-y-4">
            <WeakTopicsTab topics={weakTopics} />
          </TabsContent>

          <TabsContent value="add" className="space-y-4">
            <AddProblemsTab 
              problems={recommendedProblems}
              onAddToReview={addToReview}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Review Dialog */}
      {currentProblem && (
        <ReviewDialog
          problem={currentProblem}
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          confidence={selectedConfidence}
          onConfidenceChange={setSelectedConfidence}
          notes={reviewNotes}
          onNotesChange={setReviewNotes}
          onSubmit={submitReview}
        />
      )}
    </div>
  );
}

// Empty State Component
function EmptyState({ onImport, importing }: { onImport: () => void; importing: boolean }) {
  return (
    <Card className="text-center py-16">
      <CardContent>
        <Brain className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
        <h3 className="text-xl font-semibold mb-3">Start Your Review Journey</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          The Smart Review system uses spaced repetition to help you retain LeetCode solutions. 
          Import your solved problems to get started.
        </p>
        <div className="space-y-4">
          <Button onClick={onImport} disabled={importing} size="lg">
            <Download className="h-5 w-5 mr-2" />
            {importing ? "Importing Problems..." : "Import Solved Problems"}
          </Button>
          <p className="text-sm text-muted-foreground">
            This will analyze your solved problems and create a review schedule
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Review Tab Component
function ReviewTab({ 
  dueProblems, 
  onStartReview, 
  stats 
}: { 
  dueProblems: SmartReview[];
  onStartReview: (problem: SmartReview) => void;
  stats: ReviewStats | null;
}) {
  if (dueProblems.length === 0) {
    return (
      <Card className="text-center py-10 sm:py-12">
        <CardContent>
          <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-base sm:text-lg font-medium mb-2">All caught up!</h3>
          <p className="text-sm text-muted-foreground px-4">
            No problems due for review right now. Check back tomorrow!
          </p>
          {stats && stats.totalProblems > 0 && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              You have {stats.totalProblems} problems in your review system
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Stats cards - horizontal scroll on mobile */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 scrollbar-hide">
        <Card className="shrink-0 w-[140px] sm:w-auto">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{dueProblems.length}</p>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Due</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {stats && (
          <>
            <Card className="shrink-0 w-[140px] sm:w-auto">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Flame className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
                  <div>
                    <p className="text-xl sm:text-2xl font-bold">{stats.streakDays}</p>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Streak</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shrink-0 w-[140px] sm:w-auto">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
                  <div>
                    <p className="text-xl sm:text-2xl font-bold">{stats.masteredCount}</p>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Mastered</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-3 sm:gap-4">
        {dueProblems.map((problem) => (
          <Card key={problem.problemSlug} className={`${MASTERY_COLORS[problem.masteryLevel]} touch-manipulation active:scale-[0.99] transition-transform`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1 sm:mb-2">
                    <h3 className="font-medium text-sm sm:text-base truncate">{problem.problemTitle}</h3>
                    <Badge variant={
                      problem.difficulty === "Easy" ? "default" :
                      problem.difficulty === "Medium" ? "secondary" : "destructive"
                    } className="text-[10px] sm:text-xs">
                      {problem.difficulty}
                    </Badge>
                    <Badge variant="outline" className="capitalize text-[10px] sm:text-xs">
                      {problem.masteryLevel}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <span>Confidence: {problem.confidence}/5</span>
                    <span className="hidden sm:inline">Reviews: {problem.totalReviews}</span>
                    <span>Last: {new Date(problem.lastReviewedAt).toLocaleDateString()}</span>
                  </div>
                  
                  {problem.topics.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {problem.topics.slice(0, 2).map(topic => (
                        <Badge key={topic} variant="outline" className="text-[10px] sm:text-xs">
                          {topic}
                        </Badge>
                      ))}
                      {problem.topics.length > 2 && (
                        <Badge variant="outline" className="text-[10px] sm:text-xs">
                          +{problem.topics.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button variant="outline" size="sm" asChild className="touch-manipulation h-9 sm:h-8">
                    <Link 
                      href={`https://leetcode.com/problems/${problem.problemSlug}`}
                      target="_blank"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button onClick={() => onStartReview(problem)} className="flex-1 sm:flex-none h-9 sm:h-8 touch-manipulation">
                    <span className="sm:hidden">Review</span>
                    <span className="hidden sm:inline">Start Review</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Stats Tab Component  
function StatsTab({ stats }: { stats: ReviewStats | null }) {
  if (!stats) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
            Review Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="flex justify-between items-center">
            <span className="text-sm">Average Confidence</span>
            <span className="font-mono text-base sm:text-lg">{stats.avgConfidence}/5</span>
          </div>
          <Progress value={(stats.avgConfidence / 5) * 100} />
          
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.masteredCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Mastered</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.learningCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Learning</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5" />
            Streak & Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-500">{stats.streakDays}</p>
            <p className="text-sm text-muted-foreground">Days streak</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xl font-bold">{stats.totalProblems}</p>
              <p className="text-sm text-muted-foreground">Total Problems</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">{stats.dueForReview}</p>
              <p className="text-sm text-muted-foreground">Due Today</p>
            </div>
          </div>

          {stats.forgottenCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">{stats.forgottenCount} problems need attention</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Weak Topics Tab
function WeakTopicsTab({ topics }: { topics: any[] }) {
  if (topics.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No weak areas identified</h3>
          <p className="text-muted-foreground">
            Keep practicing to identify areas for improvement
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Topics where you need more practice, ranked by confidence level
      </p>
      
      {topics.map((topic, index) => (
        <Card key={topic.topic}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium capitalize">{topic.topic.replace(/-/g, ' ')}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {topic.count} problems • Avg confidence: {topic.avgConfidence}/5
                </p>
              </div>
              <div className="text-right">
                <div className="w-32">
                  <Progress value={(topic.avgConfidence / 5) * 100} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round((topic.avgConfidence / 5) * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Add Problems Tab
function AddProblemsTab({ 
  problems, 
  onAddToReview 
}: { 
  problems: any[];
  onAddToReview: (problem: any) => void;
}) {
  if (problems.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">All caught up!</h3>
          <p className="text-muted-foreground">
            All your solved problems are already in the review system
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Recommended problems from your solved list to add to review system
      </p>
      
      {problems.map((problem) => (
        <Card key={problem.titleSlug}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-medium">{problem.title}</h3>
                  <Badge variant={
                    problem.difficulty === "Easy" ? "default" :
                    problem.difficulty === "Medium" ? "secondary" : "destructive"
                  }>
                    {problem.difficulty}
                  </Badge>
                </div>
                
                {problem.topicTags && problem.topicTags.length > 0 && (
                  <div className="flex gap-1">
                    {problem.topicTags.slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {problem.topicTags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{problem.topicTags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              
              <Button onClick={() => onAddToReview(problem)}>
                <Plus className="h-4 w-4 mr-2" />
                Add to Review
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Review Dialog Component
function ReviewDialog({
  problem,
  isOpen,
  onClose,
  confidence,
  onConfidenceChange,
  notes,
  onNotesChange,
  onSubmit
}: {
  problem: SmartReview;
  isOpen: boolean;
  onClose: () => void;
  confidence: number | null;
  onConfidenceChange: (confidence: number) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg pr-8">Review: {problem.problemTitle}</DialogTitle>
          <DialogDescription className="text-sm">
            How confident are you with this problem now?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
            <div>
              <span className="text-muted-foreground">Difficulty:</span>
              <Badge variant={
                problem.difficulty === "Easy" ? "default" :
                problem.difficulty === "Medium" ? "secondary" : "destructive"
              } className="ml-2 text-[10px] sm:text-xs">
                {problem.difficulty}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Current:</span>
              <span className="ml-2 font-medium">{problem.confidence}/5</span>
            </div>
            <div>
              <span className="text-muted-foreground">Reviews:</span>
              <span className="ml-2">{problem.totalReviews}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Mastery:</span>
              <Badge variant="outline" className="ml-2 capitalize text-[10px] sm:text-xs">
                {problem.masteryLevel}
              </Badge>
            </div>
          </div>

          <div>
            <Label className="text-sm sm:text-base font-medium mb-3 sm:mb-4 block">
              Rate your confidence level:
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {CONFIDENCE_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => onConfidenceChange(level.value)}
                  className={`p-3 rounded-lg border text-left transition-colors touch-manipulation active:scale-[0.98] ${
                    confidence === level.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex gap-0.5 sm:gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                            i < level.value 
                              ? level.color + ' fill-current' 
                              : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base">{level.label}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {level.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="notes" className="text-sm">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Any insights, mistakes to remember, or key concepts..."
              className="mt-1.5 min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto h-10 touch-manipulation">
            Cancel
          </Button>
          <Button 
            onClick={onSubmit} 
            disabled={!confidence}
            className="w-full sm:w-auto min-w-[120px] h-10 touch-manipulation"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Submit Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}