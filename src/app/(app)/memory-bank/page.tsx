"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Brain, Plus, Search, Trash2, Edit, Loader2, Lightbulb, AlertTriangle, CheckCircle, BookOpen } from "lucide-react";
import { patterns, topicTags } from "@/lib/types";

type MemoryType = 'insight' | 'mistake' | 'pattern' | 'tip';

interface Memory {
  id: string;
  content: string;
  type: MemoryType;
  tags: string[];
  createdAt: any;
  relatedProblems?: string[];
}

const memoryTypeConfig: Record<MemoryType, { label: string; icon: typeof Lightbulb; color: string }> = {
  insight: { label: 'Insight', icon: Lightbulb, color: 'text-amber-500' },
  mistake: { label: 'Common Mistake', icon: AlertTriangle, color: 'text-red-500' },
  pattern: { label: 'Pattern', icon: CheckCircle, color: 'text-emerald-500' },
  tip: { label: 'Tip', icon: BookOpen, color: 'text-blue-500' },
};

function extractTags(content: string): string[] {
  const words = content.toLowerCase().split(/\s+/);
  const foundTags: string[] = [];
  
  // Check for pattern matches
  for (const pattern of patterns) {
    if (content.toLowerCase().includes(pattern.toLowerCase())) {
      foundTags.push(pattern);
    }
  }
  
  // Check for topic matches
  for (const topic of topicTags) {
    if (content.toLowerCase().includes(topic.toLowerCase())) {
      foundTags.push(topic);
    }
  }
  
  return [...new Set(foundTags)].slice(0, 5);
}

export default function MemoryBankPage() {
  const { user, loading: authLoading } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<MemoryType | "all">("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  
  // Form state
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<MemoryType>("insight");
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchMemories = async () => {
      setIsLoading(true);
      const memoriesRef = collection(db, "users", user.uid, "memories");
      const memoriesSnapshot = await getDocs(query(memoriesRef, orderBy("createdAt", "desc")));
      
      const fetchedMemories = memoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Memory[];
      
      setMemories(fetchedMemories);
      setIsLoading(false);
    };

    fetchMemories();
  }, [user]);

  // Auto-suggest tags when content changes
  useEffect(() => {
    if (newContent.length > 10) {
      const tags = extractTags(newContent);
      setSuggestedTags(tags);
    }
  }, [newContent]);

  const handleAddMemory = async () => {
    if (!user || !newContent.trim()) return;
    
    setIsPending(true);
    try {
      const memoryRef = collection(db, "users", user.uid, "memories");
      const newMemory = {
        content: newContent,
        type: newType,
        tags: selectedTags.length > 0 ? selectedTags : suggestedTags,
        createdAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(memoryRef, newMemory);
      
      setMemories(prev => [{
        id: docRef.id,
        ...newMemory,
      } as Memory, ...prev]);
      
      setNewContent("");
      setNewType("insight");
      setSelectedTags([]);
      setSuggestedTags([]);
      setIsAddOpen(false);
    } catch (error) {
      console.error("Failed to add memory:", error);
    } finally {
      setIsPending(false);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, "users", user.uid, "memories", memoryId));
      setMemories(prev => prev.filter(m => m.id !== memoryId));
    } catch (error) {
      console.error("Failed to delete memory:", error);
    }
  };

  const filteredMemories = memories.filter(memory => {
    const matchesSearch = searchQuery === "" || 
      memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memory.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === "all" || memory.type === filterType;
    return matchesSearch && matchesType;
  });

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
        <p className="text-muted-foreground">Please log in to use Memory Bank.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Memory Bank
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Store insights, patterns, and lessons learned from your problem-solving journey.
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Memory
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Memory</DialogTitle>
              <DialogDescription>
                Capture an insight, pattern, or lesson learned.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={newType} onValueChange={(v) => setNewType(v as MemoryType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(memoryTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className={`h-4 w-4 ${config.color}`} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Content</label>
                <Textarea 
                  placeholder="What did you learn? What pattern did you notice?"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              
              {suggestedTags.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Suggested Tags</label>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedTags.map(tag => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          if (selectedTags.includes(tag)) {
                            setSelectedTags(prev => prev.filter(t => t !== tag));
                          } else {
                            setSelectedTags(prev => [...prev, tag]);
                          }
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click to select/deselect tags
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAddMemory} disabled={isPending || !newContent.trim()}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Memory
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search memories..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as MemoryType | "all")}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(memoryTypeConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <config.icon className={`h-4 w-4 ${config.color}`} />
                  {config.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(memoryTypeConfig).map(([key, config]) => {
          const count = memories.filter(m => m.type === key).length;
          return (
            <Card key={key} className="p-4">
              <div className="flex items-center gap-2">
                <config.icon className={`h-5 w-5 ${config.color}`} />
                <span className="text-2xl font-bold">{count}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{config.label}s</p>
            </Card>
          );
        })}
      </div>

      {/* Memory list */}
      {filteredMemories.length > 0 ? (
        <div className="space-y-3">
          {filteredMemories.map(memory => {
            const config = memoryTypeConfig[memory.type];
            const Icon = config.icon;
            
            return (
              <Card key={memory.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-sm">{memory.content}</p>
                      {memory.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {memory.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {memory.createdAt?.toDate?.()?.toLocaleDateString() || 'Just now'}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteMemory(memory.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Brain className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium">No memories yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery || filterType !== "all" 
              ? "No memories match your search or filter."
              : "Start capturing insights from your problem-solving journey."}
          </p>
        </Card>
      )}
    </div>
  );
}
