"use client";

import { useState } from "react";
import { TopicQuestion, QuestionStatus, questionStatuses, Difficulty, difficulties } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addQuestionToTopic, updateTopicQuestion, deleteTopicQuestion } from "@/app/actions";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    link: z.string().url("Must be a valid URL"),
    difficulty: z.enum(difficulties),
    status: z.enum(questionStatuses),
    personalNotes: z.string().optional(),
});

function QuestionForm({ topicId, question, onFinished }: { topicId: string, question?: TopicQuestion, onFinished: () => void }) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: question || {
            title: "",
            link: "",
            difficulty: "Easy",
            status: "To-Do",
            personalNotes: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData();
        Object.entries(values).forEach(([key, value]) => {
            if (value) formData.append(key, value);
        });
        
        if (question) {
            await updateTopicQuestion(topicId, question.id, formData);
        } else {
            await addQuestionToTopic(topicId, formData);
        }
        onFinished();
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g. Two Sum" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="link" render={({ field }) => (
                    <FormItem><FormLabel>LeetCode Link</FormLabel><FormControl><Input placeholder="https://leetcode.com/problems/..." {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="difficulty" render={({ field }) => (
                        <FormItem><FormLabel>Difficulty</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select difficulty" /></SelectTrigger></FormControl>
                            <SelectContent>{difficulties.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                        </Select><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                            <SelectContent>{questionStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select><FormMessage /></FormItem>
                    )}/>
                </div>
                <FormField control={form.control} name="personalNotes" render={({ field }) => (
                    <FormItem><FormLabel>Personal Notes</FormLabel><FormControl><Textarea placeholder="Your thoughts and notes on this problem." {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                  <Button type="submit">Save</Button>
                </DialogFooter>
            </form>
        </Form>
    )
}

function QuestionItem({ question, topicId }: { question: TopicQuestion, topicId: string }) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const statusColorMap: Record<QuestionStatus, string> = {
        "To-Do": "bg-gray-200 text-gray-800",
        "Solved": "bg-green-200 text-green-800",
        "Repeat": "bg-yellow-200 text-yellow-800",
        "Important": "bg-red-200 text-red-800",
        "Tricky": "bg-purple-200 text-purple-800",
    };

    return (
        <div className="flex items-center justify-between rounded-md border p-4">
            <div className="space-y-1">
                <Link href={question.link} target="_blank" className="font-medium hover:underline">{question.title}</Link>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant={question.difficulty === 'Easy' ? 'secondary' : question.difficulty === 'Medium' ? 'outline' : 'destructive'} className="border-none">{question.difficulty}</Badge>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColorMap[question.status]}`}>{question.status}</span>
                </div>
                {question.personalNotes && <p className="text-sm text-muted-foreground pt-1">{question.personalNotes}</p>}
            </div>
            <div className="flex items-center gap-1">
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild><Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button></DialogTrigger>
                    <DialogContent><DialogHeader><DialogTitle>Edit Question</DialogTitle></DialogHeader><QuestionForm topicId={topicId} question={question} onFinished={() => setIsEditOpen(false)}/></DialogContent>
                </Dialog>
                <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                    <DialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Are you sure?</DialogTitle><DialogDescription>This will permanently delete the question. This action cannot be undone.</DialogDescription></DialogHeader>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
                            <form action={async () => { await deleteTopicQuestion(topicId, question.id); setIsDeleteOpen(false); }}>
                                <Button variant="destructive" type="submit">Delete</Button>
                            </form>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}

export function QuestionList({ questions, topicId }: { questions: TopicQuestion[]; topicId: string }) {
  const [filter, setFilter] = useState<QuestionStatus | "All">("All");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const filteredQuestions = filter === "All" ? questions : questions.filter(q => q.status === filter);

  return (
    <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Questions</CardTitle>
                    <CardDescription>Problems associated with this topic.</CardDescription>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Question</Button></DialogTrigger>
                    <DialogContent><DialogHeader><DialogTitle>Add New Question</DialogTitle></DialogHeader><QuestionForm topicId={topicId} onFinished={() => setIsAddOpen(false)}/></DialogContent>
                </Dialog>
            </div>
             <div className="flex items-center gap-2 pt-4 overflow-x-auto">
                <Button size="sm" variant={filter === 'All' ? 'default' : 'outline'} onClick={() => setFilter('All')}>All ({questions.length})</Button>
                {questionStatuses.map(status => (
                    <Button key={status} size="sm" variant={filter === status ? 'default' : 'outline'} onClick={() => setFilter(status)}>
                        {status} ({questions.filter(q => q.status === status).length})
                    </Button>
                ))}
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            {filteredQuestions.length > 0 ? (
                filteredQuestions.map(q => <QuestionItem key={q.id} question={q} topicId={topicId} />)
            ) : (
                <div className="text-center text-muted-foreground py-8">
                    <p>No questions found for this filter.</p>
                </div>
            )}
        </CardContent>
    </Card>
  );
}
