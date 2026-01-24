"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Brain, Plus, Search, Trash2, Loader2, Lightbulb, AlertTriangle, CheckCircle, BookOpen, Database } from "lucide-react";
import { patterns, topicTags } from "@/lib/types";
import { 
  addMemory, 
  getMemories, 
  deleteMemory, 
  getMemoryStats,
  type MemoryType,
  type MongoMemory 
} from "@/lib/memory-actions";

const memoryTypeConfig: Record<MemoryType, { label: string; icon: typeof Lightbulb; color: string }> = {
  insight: { label: 'Insight', icon: Lightbulb, color: 'text-amber-500' },
  mistake: { label: 'Common Mistake', icon: AlertTriangle, color: 'text-red-500' },
  pattern: { label: 'Pattern', icon: CheckCircle, color: 'text-emerald-500' },
  tip: { label: 'Tip', icon: BookOpen, color: 'text-blue-500' },
};

function extractTagsLocally(content: string): string[] {
  const foundTags: string[] = [];
  const lowerContent = content.toLowerCase();
  
  for (const pattern of patterns) {
    if (lowerContent.includes(pattern.toLowerCase())) {
      foundTags.push(pattern);
    }
  }
  
  for (const topic of topicTags) {
    if (lowerContent.includes(topic.toLowerCase())) {
      foundTags.push(topic);
    }
  }
  
  return [...new Set(foundTags)].slice(0, 5);
}

export default function MemoryBankPage() {
  const { user, loading: authLoading } = useAuth();
  const [memories, setMemories] = useState<MongoMemory[]>([]);
  const [stats, setStats] = useState<Record<MemoryType, number>>({ insight: 0, mistake: 0, pattern: 0, tip: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<MemoryType | "all">("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  
  // Form state
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<MemoryType>("insight");
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Fetch memories from MongoDB
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);
      setDbError(null);
      
      try {
        const [memoriesResult, statsResult] = await Promise.all([
          getMemories(user.uid, { 
            type: filterType === "all" ? undefined : filterType,
            search: searchQuery || undefined,
          }),
          getMemoryStats(user.uid),
        ]);
        
        if (memoriesResult.success && memoriesResult.memories) {
          setMemories(memoriesResult.memories);
        } else if (memoriesResult.error) {
          setDbError(memoriesResult.error);
        }
        
        if (statsResult.success && statsResult.stats) {
          setStats(statsResult.stats);
        }
      } catch (error) {
        console.error("Failed to fetch memories:", error);
        setDbError("Failed to connect to database");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, filterType, searchQuery]);

  // Auto-suggest tags when content changes
  useEffect(() => {
    if (newContent.length > 10) {
      const tags = extractTagsLocally(newContent);
      setSuggestedTags(tags);
    } else {
      setSuggestedTags([]);
    }
  }, [newContent]);

  const handleAddMemory = async () => {
    if (!user || !newContent.trim()) return;
    
    startTransition(async () => {
      const tags = selectedTags.length > 0 ? selectedTags : suggestedTags;
      const result = await addMemory(user.uid, newContent, newType, tags);
      
      if (result.success) {
        // Refresh the list
        const memoriesResult = await getMemories(user.uid);
        if (memoriesResult.success && memoriesResult.memories) {
          setMemories(memoriesResult.memories);
        }
        
        const statsResult = await getMemoryStats(user.uid);
        if (statsResult.success && statsResult.stats) {
          setStats(statsResult.stats);
        }
        
        setNewContent("");
        setNewType("insight");
        setSelectedTags([]);
        setSuggestedTags([]);
        setIsAddOpen(false);
      } else {
        console.error("Failed to add memory:", result.error);
      }
    });
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!user) return;
    
    startTransition(async () => {
      const result = await deleteMemory(user.uid, memoryId);
      
      if (result.success) {
        setMemories(prev => prev.filter(m => m._id?.toString() !== memoryId));
        
        const statsResult = await getMemoryStats(user.uid);
        if (statsResult.success && statsResult.stats) {
          setStats(statsResult.stats);
        }
      } else {
        console.error("Failed to delete memory:", result.error);
      }
    });
  };

  if (authLoading) {
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
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <Database className="h-3 w-3" />
            Powered by MongoDB • Store insights and lessons learned
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

      {/* Database error banner */}
      {dbError && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Database connection issue:</strong> {dbError}. Make sure MONGODB_URI is set in your .env file.
          </p>
        </div>
      )}

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
          const count = stats[key as MemoryType] || 0;
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
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : memories.length > 0 ? (
        <div className="space-y-3">
          {memories.map(memory => {
            const config = memoryTypeConfig[memory.type];
            const Icon = config.icon;
            const memoryId = memory._id?.toString() || '';
            
            return (
              <Card key={memoryId} className="group">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-sm">{memory.content}</p>
                      {memory.tags && memory.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {memory.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {memory.createdAt ? new Date(memory.createdAt).toLocaleDateString() : 'Just now'}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteMemory(memoryId)}
                      disabled={isPending}
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
