import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { Topic, TopicQuestion, TopicNote } from "@/lib/types";
import TopicDetails from "@/components/topics/topic-details";
import { notFound } from "next/navigation";

async function getTopicData(topicId: string) {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("User not found");

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
}

export default async function TopicPage({ params }: { params: { id: string } }) {
  const data = await getTopicData(params.id);

  if (!data) {
    notFound();
  }

  const { topic, questions, notes } = data;

  return (
    <TopicDetails
      initialTopic={topic}
      initialQuestions={questions}
      initialNotes={notes}
    />
  );
}
