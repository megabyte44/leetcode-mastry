"use client";

import { useState } from "react";
import { Topic, TopicQuestion, TopicNote, QuestionStatus, questionStatuses } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionList } from "./question-list";
import { Button } from "../ui/button";

interface TopicDetailsProps {
  initialTopic: Topic;
  initialQuestions: TopicQuestion[];
  initialNotes: TopicNote[];
}

export default function TopicDetails({
  initialTopic,
  initialQuestions,
}: TopicDetailsProps) {
  const [topic, setTopic] = useState(initialTopic);
  const [questions, setQuestions] = useState(initialQuestions);
  const [activeTab, setActiveTab] = useState<"questions" | "notes">("questions");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">{topic.name}</h1>
        <p className="text-muted-foreground">{topic.description}</p>
      </div>

      <Tabs defaultValue="questions" onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList>
          <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
          <TabsTrigger value="notes" disabled>Notes (Coming Soon)</TabsTrigger>
        </TabsList>
        <TabsContent value="questions">
          <QuestionList questions={questions} topicId={topic.id} />
        </TabsContent>
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Text, pseudocode, and snippets related to {topic.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Feature coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
