"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { 
  getUserSnippets, 
  createSnippet, 
  updateSnippet, 
  deleteSnippet, 
  searchSnippets,
  incrementSnippetUsage,
  type CodeSnippet, 
  type ProgrammingLanguage,
  type SnippetFilters 
} from "@/lib/snippet-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import { 
  Copy, 
  Edit, 
  Plus, 
  Search, 
  Trash2, 
  Code2, 
  Tag, 
  Clock,
  Star,
  Filter,
  ChevronDown,
  Eye,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const LANGUAGES: { value: ProgrammingLanguage; label: string; icon: string }[] = [
  { value: "javascript", label: "JavaScript", icon: "🟨" },
  { value: "typescript", label: "TypeScript", icon: "🟦" },
  { value: "python", label: "Python", icon: "🐍" },
  { value: "java", label: "Java", icon: "☕" },
  { value: "cpp", label: "C++", icon: "⚡" },
  { value: "go", label: "Go", icon: "🐹" },
  { value: "rust", label: "Rust", icon: "🦀" },
  { value: "csharp", label: "C#", icon: "🔷" },
];

const CATEGORIES = [
  { value: "algorithm", label: "Algorithm" },
  { value: "data-structure", label: "Data Structure" },
  { value: "pattern", label: "Pattern" },
  { value: "utility", label: "Utility" },
  { value: "template", label: "Template" },
];

export function EnhancedSnippets() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SnippetFilters>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<CodeSnippet | null>(null);
  const [viewingSnippet, setViewingSnippet] = useState<CodeSnippet | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    code: "",
    language: "javascript" as ProgrammingLanguage,
    tags: "",
    category: "algorithm" as CodeSnippet["category"],
    difficulty: "" as CodeSnippet["difficulty"],
    isPublic: false
  });

  // Load snippets
  const loadSnippets = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let result;
      
      if (searchQuery) {
        result = await searchSnippets(user.uid, searchQuery, filters);
      } else {
        result = await getUserSnippets(user.uid, filters);
      }

      if (result.success && result.snippets) {
        setSnippets(result.snippets);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load snippets",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading snippets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnippets();
  }, [user, filters, searchQuery]);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      code: "",
      language: "javascript",
      tags: "",
      category: "algorithm",
      difficulty: undefined as CodeSnippet["difficulty"],
      isPublic: false
    });
  };

  const handleCreate = async () => {
    if (!user || !formData.title.trim() || !formData.code.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and code are required",
        variant: "destructive",
      });
      return;
    }

    const tags = formData.tags
      .split(",")
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    const snippet = {
      ...formData,
      tags,
      relatedProblems: [],
      difficulty: formData.difficulty as CodeSnippet["difficulty"] || undefined,
    };

    const result = await createSnippet(user.uid, snippet);

    if (result.success) {
      toast({
        title: "Success",
        description: "Snippet created successfully",
      });
      setIsCreateOpen(false);
      resetForm();
      loadSnippets();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to create snippet",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!user || !editingSnippet || !formData.title.trim() || !formData.code.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and code are required",
        variant: "destructive",
      });
      return;
    }

    const tags = formData.tags
      .split(",")
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    const updates = {
      ...formData,
      tags,
      difficulty: formData.difficulty as CodeSnippet["difficulty"] || undefined,
    };

    const result = await updateSnippet(user.uid, editingSnippet.id!, updates);

    if (result.success) {
      toast({
        title: "Success",
        description: "Snippet updated successfully",
      });
      setEditingSnippet(null);
      resetForm();
      loadSnippets();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update snippet",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async (snippet: CodeSnippet) => {
    await navigator.clipboard.writeText(snippet.code);
    
    // Increment usage count
    if (snippet.id) {
      await incrementSnippetUsage(snippet.id);
    }
    
    toast({
      title: "Copied!",
      description: "Code copied to clipboard",
    });
  };

  const handleDelete = async (snippetId: string) => {
    if (!user) return;

    const result = await deleteSnippet(user.uid, snippetId);

    if (result.success) {
      toast({
        title: "Success",
        description: "Snippet deleted successfully",
      });
      loadSnippets();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete snippet",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (snippet: CodeSnippet) => {
    setFormData({
      title: snippet.title,
      description: snippet.description || "",
      code: snippet.code,
      language: snippet.language,
      tags: snippet.tags.join(", "),
      category: snippet.category,
      difficulty: snippet.difficulty || undefined,
      isPublic: snippet.isPublic
    });
    setEditingSnippet(snippet);
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view your code snippets.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Code Snippets</h1>
          <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
            Save and organize your frequently used code patterns
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="w-full sm:w-auto touch-manipulation">
              <Plus className="h-4 w-4 mr-2" />
              New Snippet
            </Button>
          </DialogTrigger>
          <CreateEditDialog
            formData={formData}
            setFormData={setFormData}
            onSave={handleCreate}
            isEditing={false}
          />
        </Dialog>
      </div>

      {/* Search and Filters - Mobile optimized */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search snippets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
          <Select value={filters.language || "all"} onValueChange={(value) => 
            setFilters({...filters, language: value === "all" ? undefined : value as ProgrammingLanguage})}>
            <SelectTrigger className="w-32 sm:w-40 shrink-0 h-9">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.icon} {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.category || "all"} onValueChange={(value) => 
            setFilters({...filters, category: value === "all" ? undefined : value})}>
            <SelectTrigger className="w-32 sm:w-40 shrink-0 h-9">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Snippets Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-5/6"></div>
                  <div className="h-3 bg-muted rounded w-4/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : snippets.length === 0 ? (
        <Card className="text-center py-10 sm:py-12">
          <CardContent>
            <Code2 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-base sm:text-lg font-medium mb-2">No snippets found</h3>
            <p className="text-sm text-muted-foreground mb-4 px-4">
              {searchQuery ? "Try adjusting your search or filters" : "Create your first code snippet to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateOpen(true)} className="touch-manipulation">
                <Plus className="h-4 w-4 mr-2" />
                Create Snippet
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {snippets.map((snippet) => (
            <SnippetCard
              key={snippet.id}
              snippet={snippet}
              onCopy={() => handleCopy(snippet)}
              onEdit={() => openEditDialog(snippet)}
              onDelete={() => handleDelete(snippet.id!)}
              onView={() => setViewingSnippet(snippet)}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingSnippet && (
        <Dialog open={!!editingSnippet} onOpenChange={() => setEditingSnippet(null)}>
          <CreateEditDialog
            formData={formData}
            setFormData={setFormData}
            onSave={handleUpdate}
            isEditing={true}
          />
        </Dialog>
      )}

      {/* View Dialog */}
      {viewingSnippet && (
        <ViewSnippetDialog
          snippet={viewingSnippet}
          onClose={() => setViewingSnippet(null)}
          onCopy={() => handleCopy(viewingSnippet)}
        />
      )}
    </div>
  );
}

// Snippet Card Component
function SnippetCard({ 
  snippet, 
  onCopy, 
  onEdit, 
  onDelete, 
  onView 
}: {
  snippet: CodeSnippet;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const langInfo = LANGUAGES.find(l => l.value === snippet.language);

  return (
    <Card className="group hover:shadow-md transition-shadow touch-manipulation active:scale-[0.98]">
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0" onClick={onView}>
            <CardTitle className="text-sm font-medium truncate cursor-pointer">
              {snippet.title}
            </CardTitle>
            <CardDescription className="text-xs mt-1 line-clamp-2">
              {snippet.description || "No description"}
            </CardDescription>
          </div>
          {/* Actions - visible on mobile, hover on desktop */}
          <div className="flex gap-0.5 sm:gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" onClick={onView} className="h-8 w-8 touch-manipulation">
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onCopy} className="h-8 w-8 touch-manipulation">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8 touch-manipulation hidden sm:flex">
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 touch-manipulation hidden sm:flex">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground mb-2 sm:mb-3 flex-wrap">
          <span className="shrink-0">{langInfo?.icon} {langInfo?.label}</span>
          <Badge variant="secondary" className="text-[10px] sm:text-xs">
            {snippet.category}
          </Badge>
          {snippet.difficulty && (
            <Badge variant={
              snippet.difficulty === "Easy" ? "default" :
              snippet.difficulty === "Medium" ? "secondary" : "destructive"
            } className="text-[10px] sm:text-xs">
              {snippet.difficulty}
            </Badge>
          )}
        </div>

        <pre className="text-[11px] sm:text-xs bg-muted rounded p-2 overflow-hidden line-clamp-3 sm:line-clamp-4 font-mono">
          {snippet.code}
        </pre>

        {snippet.tags.length > 0 && (
          <div className="flex gap-1 mt-2 sm:mt-3 flex-wrap">
            {snippet.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] sm:text-xs">
                {tag}
              </Badge>
            ))}
            {snippet.tags.length > 2 && (
              <Badge variant="outline" className="text-[10px] sm:text-xs">
                +{snippet.tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground mt-2 sm:mt-3">
          <span>Used {snippet.usageCount || 0}x</span>
          <span>{new Date(snippet.updatedAt).toLocaleDateString()}</span>
        </div>
        
        {/* Mobile-only edit/delete row */}
        <div className="flex gap-2 mt-3 sm:hidden border-t pt-3">
          <Button variant="outline" size="sm" onClick={onEdit} className="flex-1 h-9 touch-manipulation">
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="flex-1 h-9 touch-manipulation text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Create/Edit Dialog Component (continues in next part due to length)
function CreateEditDialog({
  formData,
  setFormData,
  onSave,
  isEditing
}: {
  formData: any;
  setFormData: (data: any) => void;
  onSave: () => void;
  isEditing: boolean;
}) {
  return (
    <DialogContent className="max-w-4xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit" : "Create"} Snippet</DialogTitle>
        <DialogDescription className="hidden sm:block">
          {isEditing ? "Update your code snippet" : "Create a new reusable code snippet"}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 sm:gap-4 py-2 sm:py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <Label htmlFor="title" className="text-sm">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g., Binary Search Template"
              className="h-10 mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="language" className="text-sm">Language *</Label>
            <Select 
              value={formData.language} 
              onValueChange={(value) => setFormData({...formData, language: value})}
            >
              <SelectTrigger className="h-10 mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.icon} {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="description" className="text-sm">Description</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Brief description of the snippet"
            className="h-10 mt-1.5"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <Label htmlFor="category" className="text-sm">Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData({...formData, category: value})}
            >
              <SelectTrigger className="h-10 mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="difficulty" className="text-sm">Difficulty</Label>
            <Select 
              value={formData.difficulty || "none"} 
              onValueChange={(value) => setFormData({...formData, difficulty: value === "none" ? "" : value})}
            >
              <SelectTrigger className="h-10 mt-1.5">
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => setFormData({...formData, isPublic: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">Make public</span>
            </label>
          </div>
        </div>

        <div>
          <Label htmlFor="code">Code *</Label>
          <Textarea
            id="code"
            value={formData.code}
            onChange={(e) => setFormData({...formData, code: e.target.value})}
            placeholder="Your code here..."
            className="font-mono min-h-[200px]"
          />
        </div>

        <div>
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={formData.tags}
            onChange={(e) => setFormData({...formData, tags: e.target.value})}
            placeholder="e.g., binary-search, template, algorithm"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setFormData({...formData})}>
          Cancel
        </Button>
        <Button onClick={onSave}>
          <Sparkles className="h-4 w-4 mr-2" />
          {isEditing ? "Update" : "Create"} Snippet
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// View Snippet Dialog
function ViewSnippetDialog({
  snippet,
  onClose,
  onCopy
}: {
  snippet: CodeSnippet;
  onClose: () => void;
  onCopy: () => void;
}) {
  const langInfo = LANGUAGES.find(l => l.value === snippet.language);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{snippet.title}</DialogTitle>
              <DialogDescription className="mt-1">
                {snippet.description || "No description provided"}
              </DialogDescription>
            </div>
            <Button onClick={onCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Code
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              {langInfo?.icon} {langInfo?.label}
            </span>
            <Badge variant="secondary">{snippet.category}</Badge>
            {snippet.difficulty && (
              <Badge variant={
                snippet.difficulty === "Easy" ? "default" :
                snippet.difficulty === "Medium" ? "secondary" : "destructive"
              }>
                {snippet.difficulty}
              </Badge>
            )}
            <span className="text-muted-foreground ml-auto">
              Used {snippet.usageCount || 0} times
            </span>
          </div>

          <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto font-mono">
            <code>{snippet.code}</code>
          </pre>

          {snippet.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {snippet.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="text-xs text-muted-foreground border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>Created: {new Date(snippet.createdAt).toLocaleString()}</div>
              <div>Updated: {new Date(snippet.updatedAt).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}