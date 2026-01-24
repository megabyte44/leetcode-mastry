"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import type { CodeSnippet, ProgrammingLanguage } from "@/lib/types";
import { programmingLanguages } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Check, Copy, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SnippetCardProps {
  snippet: CodeSnippet;
  onDelete: (id: string) => void;
}

const languageColors: Record<ProgrammingLanguage, string> = {
  javascript: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  typescript: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  python: "bg-green-500/10 text-green-700 border-green-500/20",
  java: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  cpp: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  go: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  rust: "bg-red-500/10 text-red-700 border-red-500/20",
};

export function SnippetCard({ snippet, onDelete }: SnippetCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState(snippet.title);
  const [editDescription, setEditDescription] = useState(snippet.description || "");
  const [editCode, setEditCode] = useState(snippet.code);
  const [editLanguage, setEditLanguage] = useState<ProgrammingLanguage>(snippet.language);
  const [editTags, setEditTags] = useState(snippet.tags.join(", "));

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet.code);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdate = async () => {
    if (!user || !editTitle.trim() || !editCode.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and code are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      const snippetRef = doc(db, "users", user.uid, "snippets", snippet.id);
      const tags = editTags
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0);

      await updateDoc(snippetRef, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        code: editCode.trim(),
        language: editLanguage,
        tags,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Snippet Updated",
        description: "Your changes have been saved.",
      });
      setIsEditOpen(false);
    } catch (error) {
      console.error("Error updating snippet:", error);
      toast({
        title: "Error",
        description: "Failed to update snippet.",
        variant: "destructive",
      });
    }
  };

  const resetEditForm = () => {
    setEditTitle(snippet.title);
    setEditDescription(snippet.description || "");
    setEditCode(snippet.code);
    setEditLanguage(snippet.language);
    setEditTags(snippet.tags.join(", "));
  };

  return (
    <>
      <Card
        className="cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => setIsViewOpen(true)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{snippet.title}</CardTitle>
              {snippet.description && (
                <CardDescription className="line-clamp-2 mt-1">
                  {snippet.description}
                </CardDescription>
              )}
            </div>
            <Badge variant="outline" className={languageColors[snippet.language]}>
              {snippet.language}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-hidden max-h-24">
            <code className="line-clamp-4">{snippet.code}</code>
          </pre>
          {snippet.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {snippet.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {snippet.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{snippet.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 pr-8">
              <div>
                <DialogTitle className="text-xl">{snippet.title}</DialogTitle>
                {snippet.description && (
                  <DialogDescription className="mt-1">
                    {snippet.description}
                  </DialogDescription>
                )}
              </div>
              <Badge variant="outline" className={languageColors[snippet.language]}>
                {snippet.language}
              </Badge>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <pre className="bg-muted p-4 rounded-md text-sm font-mono overflow-x-auto">
                <code>{snippet.code}</code>
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {snippet.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {snippet.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Snippet?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    code snippet.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onDelete(snippet.id);
                      setIsViewOpen(false);
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetEditForm();
                setIsViewOpen(false);
                setIsEditOpen(true);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Code Snippet</DialogTitle>
            <DialogDescription>
              Update your code snippet details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-language">Language</Label>
              <Select
                value={editLanguage}
                onValueChange={(val) => setEditLanguage(val as ProgrammingLanguage)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {programmingLanguages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-code">Code *</Label>
              <Textarea
                id="edit-code"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                className="font-mono text-sm min-h-[200px]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
              <Input
                id="edit-tags"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
