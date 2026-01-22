
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { Topic, TopicQuestion, TopicNote } from "@/lib/types";
import TopicDetails from "@/components/topics/topic-details";
import { notFound, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type TopicData = {
  topic: Topic;
  questions: TopicQuestion[];
  notes: TopicNote[];
};

export default function TopicPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<TopicData | null>(null);
  const [loading, setLoading] = useState(true);

  const getTopicData = async (userId: string, topicId: string) => {
    try {
      const topicRef = doc(db, "users", userId, "topics", topicId);
      const topicSnap = await getDoc(topicRef);

      if (!topicSnap.exists()) {
        return null;
      }
      const topic = { id: topicSnap.id, ...topicSnap.data() } as Topic;

      const questionsQuery = query(collection(topicRef, "questions"), orderBy("createdAt", "asc"));
      const questionsSnap = await getDocs(questionsQuery);
      const questions = questionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TopicQuestion[];

      const notesQuery = query(collection(topicRef, "notes"), orderBy("createdAt", "asc"));
      const notesSnap = await getDocs(notesQuery);
      const notes = notesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TopicNote[];

      return { topic, questions, notes };
    } catch (error) {
      console.error("Error fetching topic data:", error);
      return null;
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    getTopicData(user.uid, params.id)
      .then((topicData) => {
        if (!topicData) {
          notFound();
        } else {
          setData(topicData);
        }
      })
      .finally(() => setLoading(false));
  }, [user, authLoading, params.id, router]);

  const handleDataRefresh = () => {
     if(user) {
        getTopicData(user.uid, params.id).then((topicData) => {
            if (topicData) {
                setData(topicData);
            }
        });
     }
  }

  if (loading || authLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { topic, questions, notes } = data;

  return (
    <TopicDetails
      initialTopic={topic}
      initialQuestions={questions}
      initialNotes={notes}
      onDataRefresh={handleDataRefresh}
    />
  );
}
