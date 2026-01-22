"use server";

import { revalidatePath } from "next/cache";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDoc,
} from "firebase/firestore";
import {
  Topic,
  TopicQuestion,
  DailyQuestion,
  TopicNote,
} from "@/lib/types";

// Helper to get current user ID
async function getUserId() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("User not authenticated");
  }
  return currentUser.uid;
}

// Topics Actions
export async function addTopic(formData: FormData) {
  const userId = await getUserId();
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  if (!name) {
    return { error: "Topic name is required." };
  }

  await addDoc(collection(db, "users", userId, "topics"), {
    name,
    description,
    createdAt: serverTimestamp(),
  });

  revalidatePath("/dashboard");
}

export async function updateTopic(topicId: string, formData: FormData) {
  const userId = await getUserId();
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  
  if (!name) {
    return { error: "Topic name is required." };
  }

  const topicRef = doc(db, "users", userId, "topics", topicId);
  await updateDoc(topicRef, { name, description });

  revalidatePath(`/topics/${topicId}`);
  revalidatePath("/dashboard");
}

export async function deleteTopic(topicId: string) {
    const userId = await getUserId();
    const batch = writeBatch(db);

    // Delete all questions in the topic
    const questionsSnapshot = await getDocs(collection(db, "users", userId, "topics", topicId, "questions"));
    questionsSnapshot.forEach(doc => batch.delete(doc.ref));

    // Delete all notes in the topic
    const notesSnapshot = await getDocs(collection(db, "users", userId, "topics", topicId, "notes"));
    notesSnapshot.forEach(doc => batch.delete(doc.ref));

    // Delete the topic itself
    const topicRef = doc(db, "users", userId, "topics", topicId);
    batch.delete(topicRef);
    
    await batch.commit();

    revalidatePath("/dashboard");
}


// Daily Questions Actions
export async function addDailyQuestion(formData: FormData) {
  const userId = await getUserId();
  const leetcodeId = formData.get("leetcodeId") as string;
  const note = formData.get("note") as string;

  if (!leetcodeId) {
    return { error: "LeetCode ID is required." };
  }
  const link = `https://leetcode.com/problems/${leetcodeId.split(' ')[0]}/`; // Handle cases like '1. Two Sum'

  await addDoc(collection(db, "users", userId, "dailyQuestions"), {
    leetcodeId: parseInt(leetcodeId, 10),
    link,
    note,
    createdAt: serverTimestamp(),
  });

  revalidatePath("/dashboard");
}

export async function deleteDailyQuestion(id: string) {
    const userId = await getUserId();
    await deleteDoc(doc(db, "users", userId, "dailyQuestions", id));
    revalidatePath("/dashboard");
}

// Topic Questions Actions
export async function addQuestionToTopic(topicId: string, formData: FormData) {
    const userId = await getUserId();
    const questionData = {
        title: formData.get('title') as string,
        link: formData.get('link') as string,
        difficulty: formData.get('difficulty'),
        status: formData.get('status'),
        personalNotes: formData.get('personalNotes'),
    };

    if(!questionData.title || !questionData.link || !questionData.difficulty || !questionData.status) {
        return { error: "Missing required fields." };
    }

    await addDoc(collection(db, "users", userId, "topics", topicId, "questions"), {
        ...questionData,
        createdAt: serverTimestamp(),
    });
    revalidatePath(`/topics/${topicId}`);
}

export async function updateTopicQuestion(topicId: string, questionId: string, formData: FormData) {
    const userId = await getUserId();
    const questionData: Partial<TopicQuestion> = {
        title: formData.get('title') as string,
        link: formData.get('link') as string,
        difficulty: formData.get('difficulty') as TopicQuestion['difficulty'],
        status: formData.get('status') as TopicQuestion['status'],
        personalNotes: formData.get('personalNotes') as string,
    };
    
    if (questionData.status === 'Solved') {
      questionData.lastSolved = serverTimestamp() as any;
    }

    const questionRef = doc(db, "users", userId, "topics", topicId, "questions", questionId);
    await updateDoc(questionRef, questionData);
    revalidatePath(`/topics/${topicId}`);
}

export async function deleteTopicQuestion(topicId: string, questionId: string) {
    const userId = await getUserId();
    await deleteDoc(doc(db, "users", userId, "topics", topicId, "questions", questionId));
    revalidatePath(`/topics/${topicId}`);
}

// Topic Notes Actions
export async function addNoteToTopic(topicId: string, formData: FormData) {
    const userId = await getUserId();
    const noteData = {
        content: formData.get('content') as string,
        type: formData.get('type') as 'text' | 'code' || 'text'
    };

    if (!noteData.content) {
        return { error: "Note content cannot be empty." };
    }

    await addDoc(collection(db, "users", userId, "topics", topicId, "notes"), {
        ...noteData,
        createdAt: serverTimestamp(),
    });
    revalidatePath(`/topics/${topicId}`);
}

export async function updateNoteInTopic(topicId: string, noteId: string, formData: FormData) {
    const userId = await getUserId();
    const noteData = {
        content: formData.get('content') as string,
    };
    if (!noteData.content) {
        return { error: "Note content cannot be empty." };
    }
    const noteRef = doc(db, "users", userId, "topics", topicId, "notes", noteId);
    await updateDoc(noteRef, noteData);
    revalidatePath(`/topics/${topicId}`);
}

export async function deleteNoteFromTopic(topicId: string, noteId: string) {
    const userId = await getUserId();
    await deleteDoc(doc(db, "users", userId, "topics", topicId, "notes", noteId));
    revalidatePath(`/topics/${topicId}`);
}

export async function getAllUserProblems() {
  const userId = await getUserId();
  const topicsSnapshot = await getDocs(collection(db, "users", userId, "topics"));
  const allProblems: Record<string, string[]> = {
    "To-Do": [],
    "Solved": [],
    "Repeat": [],
    "Important": [],
    "Tricky": [],
  };

  for (const topicDoc of topicsSnapshot.docs) {
    const questionsSnapshot = await getDocs(collection(db, "users", userId, "topics", topicDoc.id, "questions"));
    questionsSnapshot.forEach((questionDoc) => {
      const question = questionDoc.data() as TopicQuestion;
      if (question.status && allProblems[question.status]) {
        allProblems[question.status].push(question.title);
      }
    });
  }
  return allProblems;
}
