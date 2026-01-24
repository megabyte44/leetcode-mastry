
"use client";

import { useState, useTransition, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { TopicQuestion, QuestionStatus, questionStatuses, Difficulty, difficulties, confidenceLevels, patterns, topicTags } from "@/lib/types";
import { Button } from "@/components/ui/button";
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
    FormDescription,
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Loader2, ExternalLink, Sparkles, Star, ArrowUpDown, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addQuestionToTopic, updateTopicQuestion, deleteTopicQuestion } from "@/lib/actions";
import { lookupProblem, parseLeetCodeUrl, buildLeetCodeUrl } from "@/lib/problem-lookup";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    difficulty: z.enum(difficulties),
    status: z.enum(questionStatuses),
    confidence: z.coerce.number().min(1).max(5).optional(),
    patterns: z.array(z.string()).optional(),
    topicTags: z.array(z.string()).optional(),
    companies: z.array(z.string()).optional(),
    timeComplexity: z.string().optional(),
    spaceComplexity: z.string().optional(),
    personalNotes: z.string().optional(),
    approach: z.string().optional(),
    keyInsights: z.string().optional(),
});

function QuestionForm({ 
    userId,
    topicId, 
    question, 
    onFinished 
}: { 
    userId: string,
    topicId: string, 
    question?: TopicQuestion, 
    onFinished: () => void 
}) {
    const [isPending, startTransition] = useTransition();
    const [autoFilled, setAutoFilled] = useState(false);
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: question ? {
            ...question,
            patterns: question.patterns || [],
            topicTags: question.topicTags || [],
            companies: question.companies || [],
            confidence: question.confidence || undefined,
        } : {
            title: "",
            link: "",
            difficulty: "Easy",
            status: "To-Do",
            confidence: undefined,
            patterns: [],
            topicTags: [],
            companies: [],
            timeComplexity: "",
            spaceComplexity: "",
            personalNotes: "",
            approach: "",
            keyInsights: "",
        },
    });

    // Auto-fill from LeetCode URL or problem number
    const handleAutoFill = (input: string) => {
        const problem = lookupProblem(input);
        if (problem) {
            form.setValue('title', problem.title);
            form.setValue('difficulty', problem.difficulty);
            form.setValue('link', buildLeetCodeUrl(problem.slug));
            form.setValue('patterns', problem.patterns);
            form.setValue('topicTags', problem.topics);
            form.setValue('companies', problem.companies);
            setAutoFilled(true);
        }
    };

    // Watch link field for auto-fill
    const linkValue = form.watch('link');
    useEffect(() => {
        if (linkValue && linkValue.includes('leetcode.com') && !autoFilled) {
            handleAutoFill(linkValue);
        }
    }, [linkValue]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData();
        Object.entries(values).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, String(value));
                }
            }
        });
        
        startTransition(async () => {
            if (question) {
                await updateTopicQuestion(userId, topicId, question.id, formData);
            } else {
                await addQuestionToTopic(userId, topicId, formData);
            }
            onFinished();
        });
    }

    const selectedPatterns = form.watch('patterns') || [];
    const selectedTopics = form.watch('topicTags') || [];
    const selectedCompanies = form.watch('companies') || [];

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="basic">Basic</TabsTrigger>
                        <TabsTrigger value="tags">Tags</TabsTrigger>
                        <TabsTrigger value="notes">Notes</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basic" className="space-y-4 mt-4">
                        {/* Auto-fill input */}
                        <div className="space-y-2">
                            <FormLabel className="text-sm font-medium">Quick Add</FormLabel>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Enter LeetCode URL or problem # to auto-fill"
                                    className="h-10"
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (/^\d+$/.test(val) || val.includes('leetcode.com')) {
                                            handleAutoFill(val);
                                        }
                                    }}
                                />
                                <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => {
                                    const link = form.getValues('link');
                                    if (link) handleAutoFill(link);
                                }}>
                                    <Sparkles className="h-4 w-4" />
                                </Button>
                            </div>
                            {autoFilled && (
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                    ✓ Auto-filled from problem database
                                </p>
                            )}
                        </div>

                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Title</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Two Sum" className="h-10" {...field} disabled={isPending} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                        )}/>
                        
                        <FormField control={form.control} name="link" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">
                                LeetCode Link <span className="text-muted-foreground font-normal">(optional)</span>
                              </FormLabel>
                              <FormControl>
                                <Input placeholder="https://leetcode.com/problems/..." className="h-10" {...field} disabled={isPending} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                        )}/>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <FormField control={form.control} name="difficulty" render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">Difficulty</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                                    <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                    <SelectContent>{difficulties.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">Status</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                                    <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                    <SelectContent>{questionStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                            )}/>
                        </div>

                        {/* Confidence Rating */}
                        <FormField control={form.control} name="confidence" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Confidence Level</FormLabel>
                              <div className="flex gap-1">
                                  {confidenceLevels.map((level) => (
                                      <Button
                                          key={level}
                                          type="button"
                                          variant={field.value === level ? "default" : "outline"}
                                          size="sm"
                                          className="h-9 w-9"
                                          onClick={() => field.onChange(level)}
                                          disabled={isPending}
                                      >
                                          {level}
                                      </Button>
                                  ))}
                              </div>
                              <FormDescription className="text-xs">
                                  1 = Not confident, 5 = Very confident
                              </FormDescription>
                            </FormItem>
                        )}/>

                        {/* Complexity */}
                        <div className="grid grid-cols-2 gap-3">
                            <FormField control={form.control} name="timeComplexity" render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">Time Complexity</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., O(n)" className="h-10" {...field} disabled={isPending} />
                                  </FormControl>
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="spaceComplexity" render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">Space Complexity</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., O(1)" className="h-10" {...field} disabled={isPending} />
                                  </FormControl>
                                </FormItem>
                            )}/>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="tags" className="space-y-4 mt-4">
                        {/* Patterns */}
                        <FormField control={form.control} name="patterns" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Patterns</FormLabel>
                              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border rounded-md">
                                  {patterns.slice(0, 20).map((pattern) => (
                                      <Badge
                                          key={pattern}
                                          variant={selectedPatterns.includes(pattern) ? "default" : "outline"}
                                          className="cursor-pointer text-xs"
                                          onClick={() => {
                                              const current = field.value || [];
                                              if (current.includes(pattern)) {
                                                  field.onChange(current.filter(p => p !== pattern));
                                              } else {
                                                  field.onChange([...current, pattern]);
                                              }
                                          }}
                                      >
                                          {pattern}
                                      </Badge>
                                  ))}
                              </div>
                            </FormItem>
                        )}/>

                        {/* Topic Tags */}
                        <FormField control={form.control} name="topicTags" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Topics</FormLabel>
                              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border rounded-md">
                                  {topicTags.slice(0, 20).map((tag) => (
                                      <Badge
                                          key={tag}
                                          variant={selectedTopics.includes(tag) ? "default" : "outline"}
                                          className="cursor-pointer text-xs"
                                          onClick={() => {
                                              const current = field.value || [];
                                              if (current.includes(tag)) {
                                                  field.onChange(current.filter(t => t !== tag));
                                              } else {
                                                  field.onChange([...current, tag]);
                                              }
                                          }}
                                      >
                                          {tag}
                                      </Badge>
                                  ))}
                              </div>
                            </FormItem>
                        )}/>

                        {/* Companies */}
                        <FormField control={form.control} name="companies" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Companies</FormLabel>
                              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border rounded-md">
                                  {['Google', 'Amazon', 'Meta', 'Apple', 'Microsoft', 'Netflix', 'Bloomberg', 'Adobe', 'Uber', 'LinkedIn'].map((company) => (
                                      <Badge
                                          key={company}
                                          variant={selectedCompanies.includes(company) ? "default" : "outline"}
                                          className="cursor-pointer text-xs"
                                          onClick={() => {
                                              const current = field.value || [];
                                              if (current.includes(company)) {
                                                  field.onChange(current.filter(c => c !== company));
                                              } else {
                                                  field.onChange([...current, company]);
                                              }
                                          }}
                                      >
                                          {company}
                                      </Badge>
                                  ))}
                              </div>
                            </FormItem>
                        )}/>
                    </TabsContent>
                    
                    <TabsContent value="notes" className="space-y-4 mt-4">
                        <FormField control={form.control} name="approach" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Approach</FormLabel>
                              <FormControl>
                                <Textarea placeholder="How did you solve it? What was the key insight?" className="min-h-[80px] resize-none" {...field} disabled={isPending} />
                              </FormControl>
                            </FormItem>
                        )}/>
                        
                        <FormField control={form.control} name="keyInsights" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Key Insights</FormLabel>
                              <FormControl>
                                <Textarea placeholder="What's the trick? Any edge cases to remember?" className="min-h-[80px] resize-none" {...field} disabled={isPending} />
                              </FormControl>
                            </FormItem>
                        )}/>
                        
                        <FormField control={form.control} name="personalNotes" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Personal Notes</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Any other notes or reminders" className="min-h-[80px] resize-none" {...field} disabled={isPending} />
                              </FormControl>
                            </FormItem>
                        )}/>
                    </TabsContent>
                </Tabs>
                
                <DialogFooter className="gap-2 sm:gap-0 pt-4 flex-col-reverse sm:flex-row">
                  <DialogClose asChild><Button type="button" variant="ghost" className="h-10" disabled={isPending}>Cancel</Button></DialogClose>
                  <Button type="submit" className="h-10" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {question ? 'Save Changes' : 'Add Question'}
                  </Button>
                </DialogFooter>
            </form>
        </Form>
    )
}

function QuestionItem({ question, userId, topicId, onDeleted }: { question: TopicQuestion, userId: string, topicId: string, onDeleted: () => void }) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const statusStyles: Record<QuestionStatus, string> = {
        "To-Do": "bg-muted text-muted-foreground",
        "Solved": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        "Repeat": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        "Important": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        "Tricky": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    };

    const difficultyStyles: Record<Difficulty, string> = {
        "Easy": "text-emerald-600 dark:text-emerald-400",
        "Medium": "text-amber-600 dark:text-amber-400",
        "Hard": "text-red-600 dark:text-red-400",
    };

    const handleDelete = () => {
        startTransition(async () => {
            await deleteTopicQuestion(userId, topicId, question.id);
            setIsDeleteOpen(false);
            onDeleted();
        });
    }

    return (
        <div className="group flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 rounded-xl border border-border/50 bg-card p-4 transition-colors hover:border-border">
            <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start gap-2 flex-wrap">
                    {question.link ? (
                        <Link 
                            href={question.link} 
                            target="_blank" 
                            className="font-medium text-sm hover:text-primary transition-colors inline-flex items-center gap-1 touch-manipulation"
                        >
                            {question.title}
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </Link>
                    ) : (
                        <span className="font-medium text-sm">{question.title}</span>
                    )}
                    {/* Confidence stars */}
                    {question.confidence && (
                        <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((level) => (
                                <Star 
                                    key={level} 
                                    className={`h-3 w-3 ${level <= question.confidence! ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`} 
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium ${difficultyStyles[question.difficulty]}`}>
                        {question.difficulty}
                    </span>
                    <span className="text-muted-foreground/30">•</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[question.status]}`}>
                        {question.status}
                    </span>
                    {/* Complexity badges */}
                    {question.timeComplexity && (
                        <>
                            <span className="text-muted-foreground/30">•</span>
                            <span className="text-xs text-muted-foreground font-mono">
                                T: {question.timeComplexity}
                            </span>
                        </>
                    )}
                    {question.spaceComplexity && (
                        <>
                            <span className="text-muted-foreground/30">•</span>
                            <span className="text-xs text-muted-foreground font-mono">
                                S: {question.spaceComplexity}
                            </span>
                        </>
                    )}
                </div>
                {/* Pattern/topic tags */}
                {((question.patterns && question.patterns.length > 0) || (question.topicTags && question.topicTags.length > 0)) && (
                    <div className="flex items-center gap-1 flex-wrap">
                        {question.patterns?.slice(0, 2).map(pattern => (
                            <Badge key={pattern} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                {pattern}
                            </Badge>
                        ))}
                        {question.topicTags?.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                                {tag}
                            </Badge>
                        ))}
                        {((question.patterns?.length || 0) + (question.topicTags?.length || 0)) > 4 && (
                            <span className="text-xs text-muted-foreground">
                                +{(question.patterns?.length || 0) + (question.topicTags?.length || 0) - 4} more
                            </span>
                        )}
                    </div>
                )}
                {question.personalNotes && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {question.personalNotes}
                    </p>
                )}
            </div>
            <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 touch-manipulation">
                            <Edit className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader className="pb-2">
                            <DialogTitle className="text-lg">Edit Question</DialogTitle>
                            <DialogDescription className="text-sm">Update the problem details below.</DialogDescription>
                        </DialogHeader>
                        <QuestionForm userId={userId} topicId={topicId} question={question} onFinished={() => { setIsEditOpen(false); onDeleted(); }}/>
                    </DialogContent>
                </Dialog>
                <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 touch-manipulation">
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader className="pb-2">
                            <DialogTitle className="text-lg">Delete Question</DialogTitle>
                            <DialogDescription className="text-sm">
                                This will permanently remove "{question.title}" from this topic.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0 pt-4 flex-col-reverse sm:flex-row">
                            <DialogClose asChild><Button variant="ghost" className="h-11" disabled={isPending}>Cancel</Button></DialogClose>
                            <Button variant="destructive" className="h-11" onClick={handleDelete} disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}

export function QuestionList({ questions, topicId, onDataRefresh }: { questions: TopicQuestion[]; topicId: string; onDataRefresh: () => void; }) {
  const [filter, setFilter] = useState<QuestionStatus | "All">("All");
  const [sortBy, setSortBy] = useState<'date' | 'difficulty' | 'confidence' | 'status' | 'alpha'>('date');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { user } = useAuth();

  const difficultyOrder: Record<Difficulty, number> = { Easy: 1, Medium: 2, Hard: 3 };
  const statusOrder: Record<QuestionStatus, number> = { 'To-Do': 1, 'Repeat': 2, 'Tricky': 3, 'Important': 4, 'Solved': 5 };

  const sortedAndFilteredQuestions = (filter === "All" ? questions : questions.filter(q => q.status === filter))
    .sort((a, b) => {
      switch (sortBy) {
        case 'difficulty':
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        case 'confidence':
          return (a.confidence || 0) - (b.confidence || 0);
        case 'status':
          return statusOrder[a.status] - statusOrder[b.status];
        case 'alpha':
          return a.title.localeCompare(b.title);
        case 'date':
        default:
          return 0; // Keep original Firestore order (by createdAt)
      }
    });

  if (!user) {
      return (
        <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Please log in to view questions.</p>
        </div>
      );
  }

  return (
    <div className="space-y-4">
        {/* Header with add button and filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="h-8 px-3 w-fit">
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Add Question
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader className="pb-2">
                            <DialogTitle className="text-lg">Add Question</DialogTitle>
                            <DialogDescription className="text-sm">Add a new problem to this topic.</DialogDescription>
                        </DialogHeader>
                        <QuestionForm 
                            userId={user.uid} 
                            topicId={topicId} 
                            onFinished={() => { setIsAddOpen(false); onDataRefresh(); }}
                        />
                    </DialogContent>
                </Dialog>
                
                {/* Sort dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 px-3">
                            <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
                            Sort
                            <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => setSortBy('date')} className={sortBy === 'date' ? 'bg-accent' : ''}>
                            Date Added
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy('alpha')} className={sortBy === 'alpha' ? 'bg-accent' : ''}>
                            Alphabetical
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy('difficulty')} className={sortBy === 'difficulty' ? 'bg-accent' : ''}>
                            Difficulty
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy('confidence')} className={sortBy === 'confidence' ? 'bg-accent' : ''}>
                            Confidence
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy('status')} className={sortBy === 'status' ? 'bg-accent' : ''}>
                            Status
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                <button 
                    onClick={() => setFilter('All')}
                    className={`shrink-0 text-xs px-3 py-2 rounded-full font-medium transition-colors touch-manipulation ${
                        filter === 'All' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground active:bg-muted/80'
                    }`}
                >
                    All ({questions.length})
                </button>
                {questionStatuses.map(status => {
                    const count = questions.filter(q => q.status === status).length;
                    return (
                        <button 
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`shrink-0 text-xs px-3 py-2 rounded-full font-medium transition-colors touch-manipulation ${
                                filter === status 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-muted text-muted-foreground active:bg-muted/80'
                            }`}
                        >
                            {status} ({count})
                        </button>
                    );
                })}
            </div>
        </div>
        
        {/* Questions list */}
        {sortedAndFilteredQuestions.length > 0 ? (
            <div className="space-y-2">
                {sortedAndFilteredQuestions.map(q => (
                    <QuestionItem key={q.id} question={q} userId={user.uid} topicId={topicId} onDeleted={onDataRefresh} />
                ))}
            </div>
        ) : (
            <div className="rounded-xl border border-border/50 bg-card py-12 px-4 text-center">
                <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                    {filter === "All" ? "No questions yet" : `No ${filter} questions`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    {filter === "All" ? "Add your first question to get started" : "Questions with this status will appear here"}
                </p>
            </div>
        )}
    </div>
  );
}
