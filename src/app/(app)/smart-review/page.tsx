"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TopicQuestion, Topic, ReviewItem, Difficulty } from "@/lib/types";
import { Brain, CheckCircle2, XCircle, RotateCcw, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";

// SM-2 Spaced Repetition Algorithm (simplified)
function calculateNextReview(confidence: number, currentInterval: number = 1): { nextDate: Date; newInterval: number } {
  // Confidence 1-5 maps to quality 0-5 in SM-2
  const quality = confidence;
  
  let newInterval: number;
  
  if (quality < 3) {
    // Reset on poor performance
    newInterval = 1;
  } else {
    // Good performance - increase interval
    if (currentInterval === 1) {
      newInterval = 1;
    } else if (currentInterval === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * (1.3 + (quality - 3) * 0.1));
    }
  }
  
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + newInterval);
  
  return { nextDate, newInterval };
}

function getReviewPriority(question: TopicQuestion): number {
  // Higher priority = should review sooner
  let priority = 0;
  
  // Lower confidence = higher priority
  if (question.confidence) {
    priority += (6 - question.confidence) * 20;
  } else {
    priority += 50; // No confidence = high priority
  }
  
  // Overdue review = higher priority
  if (question.nextReviewDate) {
    const daysOverdue = Math.floor((Date.now() - new Date(question.nextReviewDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysOverdue > 0) {
      priority += daysOverdue * 10;
    }
  }
  
  // Status based priority
  if (question.status === 'Repeat') priority += 30;
  if (question.status === 'Tricky') priority += 25;
  if (question.status === 'Important') priority += 20;
  
  // Difficulty bonus
  if (question.difficulty === 'Hard') priority += 15;
  if (question.difficulty === 'Medium') priority += 10;
  
  return priority;
}

export default function SmartReviewPage() {
  const { user, loading: authLoading } = useAuth();
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, easy: 0, hard: 0 });

  useEffect(() => {
    if (!user) return;

    const fetchReviewItems = async () => {
      setIsLoading(true);
      const topicsRef = collection(db, "users", user.uid, "topics");
      const topicsSnapshot = await getDocs(topicsRef);
      
      const allItems: ReviewItem[] = [];
      
      for (const topicDoc of topicsSnapshot.docs) {
        const topicData = { id: topicDoc.id, ...topicDoc.data() } as Topic;
        const questionsRef = collection(db, "users", user.uid, "topics", topicDoc.id, "questions");
        const questionsSnapshot = await getDocs(questionsRef);
        
        for (const qDoc of questionsSnapshot.docs) {
          const question = { id: qDoc.id, ...qDoc.data() } as TopicQuestion;
          
          // Only include questions that need review
          const shouldReview = 
            question.status !== 'Solved' || 
            !question.confidence ||
            question.confidence < 4 ||
            (question.nextReviewDate && new Date(question.nextReviewDate) <= new Date());
          
          if (shouldReview) {
            allItems.push({
              question,
              topicId: topicDoc.id,
              topicName: topicData.name,
              priority: getReviewPriority(question),
            });
          }
        }
      }
      
      // Sort by priority (highest first)
      allItems.sort((a, b) => b.priority - a.priority);
      
      setReviewItems(allItems.slice(0, 20)); // Limit to 20 per session
      setIsLoading(false);
    };

    fetchReviewItems();
  }, [user]);

  const handleConfidenceRating = async (rating: number) => {
    if (!user || currentIndex >= reviewItems.length) return;
    
    const item = reviewItems[currentIndex];
    const { nextDate, newInterval } = calculateNextReview(rating, item.question.reviewInterval || 1);
    
    // Update in Firestore
    const questionRef = doc(db, "users", user.uid, "topics", item.topicId, "questions", item.question.id);
    await updateDoc(questionRef, {
      confidence: rating,
      nextReviewDate: nextDate.toISOString(),
      reviewInterval: newInterval,
      lastSolved: rating >= 3 ? serverTimestamp() : item.question.lastSolved,
      attemptCount: (item.question.attemptCount || 0) + 1,
    });
    
    // Update stats
    setSessionStats(prev => ({
      reviewed: prev.reviewed + 1,
      easy: prev.easy + (rating >= 4 ? 1 : 0),
      hard: prev.hard + (rating <= 2 ? 1 : 0),
    }));
    
    // Move to next
    setShowAnswer(false);
    setCurrentIndex(prev => prev + 1);
  };

  const difficultyStyles: Record<Difficulty, string> = {
    "Easy": "text-emerald-600 dark:text-emerald-400",
    "Medium": "text-amber-600 dark:text-amber-400",
    "Hard": "text-red-600 dark:text-red-400",
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Please log in to use Smart Review.</p>
      </div>
    );
  }

  // Session complete
  if (currentIndex >= reviewItems.length) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardTitle className="text-2xl">Review Complete!</CardTitle>
            <CardDescription>
              Great job on your review session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted">
                <div className="text-2xl font-bold">{sessionStats.reviewed}</div>
                <div className="text-xs text-muted-foreground">Reviewed</div>
              </div>
              <div className="p-4 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{sessionStats.easy}</div>
                <div className="text-xs text-muted-foreground">Easy</div>
              </div>
              <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/30">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{sessionStats.hard}</div>
                <div className="text-xs text-muted-foreground">Needs Work</div>
              </div>
            </div>
            <Button onClick={() => window.location.reload()} className="w-full">
              <RotateCcw className="mr-2 h-4 w-4" />
              Start New Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No items to review
  if (reviewItems.length === 0) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Brain className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>All Caught Up!</CardTitle>
            <CardDescription>
              You have no questions due for review right now.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Add more questions or wait for your scheduled reviews.
            </p>
            <Link href="/dashboard">
              <Button>
                Back to Dashboard
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentItem = reviewItems[currentIndex];
  const progress = (currentIndex / reviewItems.length) * 100;

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{currentIndex + 1} / {reviewItems.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Current card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant="outline">{currentItem.topicName}</Badge>
            <span className={`text-sm font-medium ${difficultyStyles[currentItem.question.difficulty]}`}>
              {currentItem.question.difficulty}
            </span>
          </div>
          <CardTitle className="text-xl pt-2">
            {currentItem.question.link ? (
              <Link 
                href={currentItem.question.link} 
                target="_blank" 
                className="hover:text-primary transition-colors inline-flex items-center gap-2"
              >
                {currentItem.question.title}
                <ExternalLink className="h-4 w-4" />
              </Link>
            ) : (
              currentItem.question.title
            )}
          </CardTitle>
          {currentItem.question.patterns && currentItem.question.patterns.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {currentItem.question.patterns.map(p => (
                <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!showAnswer ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Try to recall your approach and key insights before revealing the answer.
              </p>
              <Button onClick={() => setShowAnswer(true)} className="w-full">
                Show My Notes
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Show notes and insights */}
              {currentItem.question.approach && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Approach</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {currentItem.question.approach}
                  </p>
                </div>
              )}
              {currentItem.question.keyInsights && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Key Insights</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {currentItem.question.keyInsights}
                  </p>
                </div>
              )}
              {currentItem.question.timeComplexity && (
                <div className="flex gap-4 text-sm">
                  <span className="text-muted-foreground">Time: <code className="font-mono">{currentItem.question.timeComplexity}</code></span>
                  {currentItem.question.spaceComplexity && (
                    <span className="text-muted-foreground">Space: <code className="font-mono">{currentItem.question.spaceComplexity}</code></span>
                  )}
                </div>
              )}
              {currentItem.question.personalNotes && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Notes</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {currentItem.question.personalNotes}
                  </p>
                </div>
              )}
              
              {/* Confidence rating */}
              <div className="space-y-3 pt-4 border-t">
                <h4 className="text-sm font-medium text-center">How well did you remember?</h4>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      key={rating}
                      variant="outline"
                      className={`h-12 ${rating === 1 ? 'border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20' : ''} ${rating === 5 ? 'border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : ''}`}
                      onClick={() => handleConfidenceRating(rating)}
                    >
                      <div className="text-center">
                        <div className="font-bold">{rating}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {rating === 1 ? 'Forgot' : rating === 2 ? 'Hard' : rating === 3 ? 'OK' : rating === 4 ? 'Good' : 'Easy'}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Your rating affects when this question will appear again
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
