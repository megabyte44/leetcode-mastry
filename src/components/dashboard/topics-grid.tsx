import { auth, db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { Topic } from "@/lib/types";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, Plus } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addTopic } from "@/app/actions";

async function getTopics() {
  const currentUser = auth.currentUser;
  if (!currentUser) return [];

  const q = query(
    collection(db, "users", currentUser.uid, "topics"),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as Topic)
  );
}

function AddTopicForm() {
    return (
      <form action={addTopic}>
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                Name
                </Label>
                <Input id="name" name="name" placeholder="e.g., Arrays & Hashing" className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right pt-2">
                Description
                </Label>
                <Textarea id="description" name="description" placeholder="A brief description of the topic" className="col-span-3" />
            </div>
        </div>
        <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <DialogTrigger asChild>
                <Button type="submit">Create Topic</Button>
            </DialogTrigger>
        </DialogFooter>
      </form>
    );
}

export async function TopicsGrid() {
  const topics = await getTopics();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline">Topics</CardTitle>
          <CardDescription>
            Organize your questions into topics for focused revision.
          </CardDescription>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Topic
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Topic</DialogTitle>
            </DialogHeader>
            <AddTopicForm />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {topics.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <Link href={`/topics/${topic.id}`} key={topic.id} className="block">
                <Card className="h-full transition-all hover:shadow-md hover:-translate-y-1">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                        <CardTitle className="text-lg font-headline">{topic.name}</CardTitle>
                        <Folder className="h-5 w-5 text-primary" />
                    </div>
                    <CardDescription className="line-clamp-2">{topic.description || "No description."}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>No topics yet.</p>
            <p className="text-sm">Create a topic to start organizing your problems.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
