
"use client";

import { useState, useEffect } from "react";
import { Topic, TopicQuestion, TopicNote } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionList } from "./question-list";
import { ArrowLeft, ListChecks, FileText } from "lucide-react";
import Link from "next/link";

interface TopicDetailsProps {
  initialTopic: Topic;
  initialQuestions: TopicQuestion[];
  initialNotes: TopicNote[];
  onDataRefresh: () => void;
}

export default function TopicDetails({
  initialTopic,
  initialQuestions,
  initialNotes,
  onDataRefresh,
}: TopicDetailsProps) {
  const [topic, setTopic] = useState(initialTopic);
  const [questions, setQuestions] = useState(initialQuestions);
  const [notes, setNotes] = useState(initialNotes);
  const [activeTab, setActiveTab] = useState<"questions" | "notes">("questions");

  useEffect(() => {
    setTopic(initialTopic);
  }, [initialTopic]);

  useEffect(() => {
    setQuestions(initialQuestions);
  }, [initialQuestions]);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  return (
    <div className="space-y-6 pb-8">
      {/* Back link */}
      <Link 
        href="/dashboard" 
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Dashboard
      </Link>

      {/* Page header */}
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {topic.name}
        </h1>
        {topic.description && (
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
            {topic.description}
          </p>
        )}
      </header>

      {/* Tabs */}
      <Tabs 
        defaultValue="questions" 
        onValueChange={(value) => setActiveTab(value as "questions" | "notes")}
        className="space-y-6"
      >
        <TabsList className="h-11 p-1 bg-muted/50">
          <TabsTrigger 
            value="questions" 
            className="gap-1.5 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm touch-manipulation"
          >
            <ListChecks className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Questions</span>
            <span className="xs:hidden">Q</span>
            <span className="ml-1 text-xs text-muted-foreground">({questions.length})</span>
          </TabsTrigger>
          <TabsTrigger 
            value="notes" 
            disabled
            className="gap-1.5 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm touch-manipulation"
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Notes</span>
            <span className="xs:hidden">N</span>
            <span className="ml-1 text-xs text-muted-foreground">(Soon)</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="questions" className="mt-0">
          <QuestionList questions={questions} topicId={topic.id} onDataRefresh={onDataRefresh} />
        </TabsContent>
        
        <TabsContent value="notes" className="mt-0">
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
            <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Notes coming soon</p>
            <p className="text-xs text-muted-foreground mt-1">
              Text, pseudocode, and snippets for {topic.name}
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
