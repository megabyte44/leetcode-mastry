
"use client";

import { useState, useEffect } from "react";
import { Topic, TopicQuestion, TopicNote } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionList } from "./question-list";
import { NotesList } from "./notes-list";
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
    <div className="space-y-3 pb-4">
      {/* Page header */}
      <header className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
          {topic.name}
        </h1>
        {topic.description && (
          <p className="text-muted-foreground text-sm max-w-2xl">
            {topic.description}
          </p>
        )}
      </header>

      {/* Tabs */}
      <Tabs 
        defaultValue="questions" 
        onValueChange={(value) => setActiveTab(value as "questions" | "notes")}
        className="space-y-3"
      >
        <TabsList className="h-10 p-1 bg-muted/50 w-full sm:w-auto">
          <TabsTrigger 
            value="questions" 
            className="gap-1.5 px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm touch-manipulation flex-1 sm:flex-initial"
          >
            <ListChecks className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Questions</span>
            <span className="xs:hidden">Q</span>
            <span className="ml-1 text-xs text-muted-foreground">({questions.length})</span>
          </TabsTrigger>
          <TabsTrigger 
            value="notes" 
            className="gap-1.5 px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm touch-manipulation flex-1 sm:flex-initial"
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Notes</span>
            <span className="xs:hidden">N</span>
            <span className="ml-1 text-xs text-muted-foreground">({notes.length})</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="questions" className="mt-0">
          <QuestionList questions={questions} topicId={topic.id} onDataRefresh={onDataRefresh} />
        </TabsContent>
        
        <TabsContent value="notes" className="mt-0">
          <NotesList 
            notes={notes} 
            topicId={topic.id} 
            topicName={topic.name}
            onDataRefresh={onDataRefresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
