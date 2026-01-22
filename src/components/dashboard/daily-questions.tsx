import { auth, db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { DailyQuestion } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, BookOpen } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addDailyQuestion, deleteDailyQuestion } from "@/app/actions";

async function getDailyQuestions() {
  const currentUser = auth.currentUser;
  if (!currentUser) return [];

  const q = query(
    collection(db, "users", currentUser.uid, "dailyQuestions"),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as DailyQuestion)
  );
}

function AddDailyQuestionForm() {
  return (
    <form action={addDailyQuestion} className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="leetcodeId" className="text-right">
          LeetCode ID
        </Label>
        <Input
          id="leetcodeId"
          name="leetcodeId"
          placeholder="e.g., 1 or 1. Two Sum"
          className="col-span-3"
          required
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="note" className="text-right">
          Note
        </Label>
        <Input
          id="note"
          name="note"
          placeholder="Optional note or quote"
          className="col-span-3"
        />
      </div>
      <DialogTrigger asChild>
        <Button type="submit" className="ml-auto">Save Question</Button>
      </DialogTrigger>
    </form>
  );
}

export async function DailyQuestions() {
  const questions = await getDailyQuestions();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline">Daily Questions</CardTitle>
          <CardDescription>
            Quick questions to capture during idle time.
          </CardDescription>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Question
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Daily Question</DialogTitle>
            </DialogHeader>
            <AddDailyQuestionForm />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {questions.length > 0 ? (
          <ul className="space-y-3">
            {questions.map((q) => (
              <li
                key={q.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-4">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Link
                      href={q.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline"
                    >
                      Question {q.leetcodeId}
                    </Link>
                    {q.note && <p className="text-sm text-muted-foreground">{q.note}</p>}
                  </div>
                </div>
                <form action={deleteDailyQuestion.bind(null, q.id)}>
                  <Button variant="ghost" size="icon" type="submit">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>No daily questions yet.</p>
            <p className="text-sm">Add one to get started!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
