"use client";

import { useState, useTransition } from "react";
import { useAuth } from "@/hooks/use-auth";
import { TopicNote } from "@/lib/types";
import { addNoteToTopic, updateNoteInTopic, deleteNoteFromTopic } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, FileText, Code, Type, Loader2 } from "lucide-react";

interface NotesListProps {
  notes: TopicNote[];
  topicId: string;
  topicName: string;
  onDataRefresh: () => void;
}

export function NotesList({ notes, topicId, topicName, onDataRefresh }: NotesListProps) {
  const { user } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<TopicNote | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAddNote = async (formData: FormData) => {
    if (!user) return;
    
    startTransition(async () => {
      await addNoteToTopic(user.uid, topicId, formData);
      setIsAddDialogOpen(false);
      onDataRefresh();
    });
  };

  const handleUpdateNote = async (noteId: string, formData: FormData) => {
    if (!user) return;
    
    startTransition(async () => {
      await updateNoteInTopic(user.uid, topicId, noteId, formData);
      setEditingNote(null);
      onDataRefresh();
    });
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!user) return;
    
    startTransition(async () => {
      await deleteNoteFromTopic(user.uid, topicId, noteId);
      onDataRefresh();
    });
  };

  const NoteForm = ({ note, onSubmit, onClose }: { 
    note?: TopicNote; 
    onSubmit: (formData: FormData) => void; 
    onClose: () => void;
  }) => {
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      onSubmit(formData);
    };

    return (
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="type">Note Type</Label>
            <Select name="type" defaultValue={note?.type || "text"}>
              <SelectTrigger>
                <SelectValue placeholder="Select note type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Text
                  </div>
                </SelectItem>
                <SelectItem value="code">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Code/Pseudocode
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              name="content"
              placeholder="Enter your note content..."
              defaultValue={note?.content || ""}
              className="min-h-[120px]"
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {note ? "Update Note" : "Add Note"}
          </Button>
        </DialogFooter>
      </form>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold">Notes for {topicName}</h3>
          <p className="text-xs text-muted-foreground">
            Store insights, patterns, and code snippets for this topic
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shrink-0 h-8">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Note</DialogTitle>
              <DialogDescription>
                Create a new note for {topicName}
              </DialogDescription>
            </DialogHeader>
            <NoteForm 
              onSubmit={handleAddNote} 
              onClose={() => setIsAddDialogOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-lg border border-border/50 bg-card p-8 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No notes yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add your first note to start building your knowledge base
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {notes.map((note) => (
            <Card key={note.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {note.type === 'code' ? (
                      <Code className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Type className="h-4 w-4 text-green-500" />
                    )}
                    {note.type === 'code' ? 'Code/Pseudocode' : 'Text Note'}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Dialog open={editingNote?.id === note.id} onOpenChange={(open) => !open && setEditingNote(null)}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingNote(note)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Note</DialogTitle>
                          <DialogDescription>
                            Update your note content
                          </DialogDescription>
                        </DialogHeader>
                        <NoteForm 
                          note={note}
                          onSubmit={(formData) => handleUpdateNote(note.id, formData)}
                          onClose={() => setEditingNote(null)}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className={`rounded-md p-3 ${
                  note.type === 'code' 
                    ? 'bg-slate-50 dark:bg-slate-900/50 border font-mono text-sm' 
                    : 'bg-muted/30'
                }`}>
                  <pre className={`whitespace-pre-wrap leading-relaxed ${note.type === 'code' ? 'font-mono text-sm' : 'font-sans text-sm'}`}>
                    {note.content}
                  </pre>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 text-xs text-muted-foreground border-t">
                  <span>
                    Created {note.createdAt.toDate().toLocaleDateString()}
                  </span>
                  {(note as any).updatedAt && (
                    <span>
                      Updated {(note as any).updatedAt.toDate().toLocaleDateString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}