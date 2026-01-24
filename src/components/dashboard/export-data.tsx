"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileJson, FileText, Loader2 } from "lucide-react";
import { ExportData, Topic, TopicQuestion, DailyQuestion, TopicNote, Snippet } from "@/lib/types";

export function ExportDataButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [isExporting, setIsExporting] = useState(false);
  const { user } = useAuth();

  const fetchAllData = async (): Promise<ExportData | null> => {
    if (!user) return null;

    // Fetch topics with their questions and notes
    const topicsRef = collection(db, "users", user.uid, "topics");
    const topicsSnapshot = await getDocs(query(topicsRef, orderBy("createdAt", "desc")));
    
    const topics: (Topic & { questions: TopicQuestion[]; notes: TopicNote[] })[] = [];
    
    for (const topicDoc of topicsSnapshot.docs) {
      const topicData = { id: topicDoc.id, ...topicDoc.data() } as Topic;
      
      // Fetch questions for this topic
      const questionsRef = collection(db, "users", user.uid, "topics", topicDoc.id, "questions");
      const questionsSnapshot = await getDocs(questionsRef);
      const questions = questionsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as TopicQuestion[];
      
      // Fetch notes for this topic
      const notesRef = collection(db, "users", user.uid, "topics", topicDoc.id, "notes");
      const notesSnapshot = await getDocs(notesRef);
      const notes = notesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as TopicNote[];
      
      topics.push({ ...topicData, questions, notes });
    }

    // Fetch daily questions
    const dailyRef = collection(db, "users", user.uid, "dailyQuestions");
    const dailySnapshot = await getDocs(query(dailyRef, orderBy("createdAt", "desc")));
    const dailyQuestions = dailySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as DailyQuestion[];

    // Fetch snippets
    const snippetsRef = collection(db, "users", user.uid, "snippets");
    const snippetsSnapshot = await getDocs(query(snippetsRef, orderBy("createdAt", "desc")));
    const snippets = snippetsSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as Snippet[];

    return {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      user: {
        uid: user.uid,
        email: user.email || undefined,
        displayName: user.displayName || undefined,
      },
      topics,
      dailyQuestions,
      snippets,
    };
  };

  const exportAsJson = (data: ExportData) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leetcode-mastery-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAsCsv = (data: ExportData) => {
    // Flatten questions for CSV
    const rows: string[] = [];
    
    // Header
    rows.push([
      "Topic",
      "Question Title",
      "Link",
      "Difficulty",
      "Status",
      "Confidence",
      "Patterns",
      "Topics",
      "Companies",
      "Time Complexity",
      "Space Complexity",
      "Approach",
      "Key Insights",
      "Notes"
    ].join(","));

    // Data rows
    for (const topic of data.topics) {
      for (const q of topic.questions) {
        const row = [
          `"${topic.name}"`,
          `"${q.title.replace(/"/g, '""')}"`,
          `"${q.link || ""}"`,
          q.difficulty,
          q.status,
          q.confidence || "",
          `"${(q.patterns || []).join("; ")}"`,
          `"${(q.topicTags || []).join("; ")}"`,
          `"${(q.companies || []).join("; ")}"`,
          `"${q.timeComplexity || ""}"`,
          `"${q.spaceComplexity || ""}"`,
          `"${(q.approach || "").replace(/"/g, '""')}"`,
          `"${(q.keyInsights || "").replace(/"/g, '""')}"`,
          `"${(q.personalNotes || "").replace(/"/g, '""')}"`,
        ];
        rows.push(row.join(","));
      }
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leetcode-mastery-questions-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllData();
      if (!data) {
        console.error("No data to export");
        return;
      }

      if (format === "json") {
        exportAsJson(data);
      } else {
        exportAsCsv(data);
      }

      setIsOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Your Data</DialogTitle>
          <DialogDescription>
            Download all your topics, questions, notes, and snippets.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Format</label>
            <Select value={format} onValueChange={(v) => setFormat(v as "json" | "csv")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    JSON (Full backup)
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CSV (Questions only)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {format === "json" 
                ? "Includes everything: topics, questions, notes, snippets, and all metadata." 
                : "Spreadsheet format with questions only - great for review or sharing."}
            </p>
          </div>
          
          <Button onClick={handleExport} disabled={isExporting} className="w-full">
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export as {format.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
