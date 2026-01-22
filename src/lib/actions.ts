
"use client";

import { db } from "@/lib/firebase";
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
  orderBy,
} from "firebase/firestore";
import {
  Topic,
  TopicQuestion,
  DailyQuestion,
  TopicNote,
} from "@/lib/types";


// Topics Actions
export async function addTopic(userId: string, formData: FormData) {
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
}

export async function updateTopic(userId: string, topicId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  
  if (!name) {
    return { error: "Topic name is required." };
  }

  const topicRef = doc(db, "users", userId, "topics", topicId);
  await updateDoc(topicRef, { name, description });
}

export async function deleteTopic(userId: string, topicId: string) {
    const batch = writeBatch(db);

    const questionsSnapshot = await getDocs(collection(db, "users", userId, "topics", topicId, "questions"));
    questionsSnapshot.forEach(doc => batch.delete(doc.ref));

    const notesSnapshot = await getDocs(collection(db, "users", userId, "topics", topicId, "notes"));
    notesSnapshot.forEach(doc => batch.delete(doc.ref));

    const topicRef = doc(db, "users", userId, "topics", topicId);
    batch.delete(topicRef);
    
    await batch.commit();
}


// Daily Questions Actions
export async function addDailyQuestion(userId: string, formData: FormData) {
  const leetcodeId = formData.get("leetcodeId") as string;
  const note = formData.get("note") as string;

  if (!leetcodeId) {
    return { error: "LeetCode ID is required." };
  }
  const link = `https://leetcode.com/problems/${leetcodeId.split(' ')[0]}/`;

  await addDoc(collection(db, "users", userId, "dailyQuestions"), {
    leetcodeId: parseInt(leetcodeId, 10),
    link,
    note,
    createdAt: serverTimestamp(),
  });
}

export async function deleteDailyQuestion(userId: string, id: string) {
    await deleteDoc(doc(db, "users", userId, "dailyQuestions", id));
}

// Topic Questions Actions
export async function addQuestionToTopic(userId: string, topicId: string, formData: FormData) {
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
}

export async function updateTopicQuestion(userId: string, topicId: string, questionId: string, formData: FormData) {
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
}

export async function deleteTopicQuestion(userId: string, topicId: string, questionId: string) {
    await deleteDoc(doc(db, "users", userId, "topics", topicId, "questions", questionId));
}

// Topic Notes Actions
export async function addNoteToTopic(userId: string, topicId: string, formData: FormData) {
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
}

export async function updateNoteInTopic(userId: string, topicId: string, noteId: string, formData: FormData) {
    const noteData = {
        content: formData.get('content') as string,
    };
    if (!noteData.content) {
        return { error: "Note content cannot be empty." };
    }
    const noteRef = doc(db, "users", userId, "topics", topicId, "notes", noteId);
    await updateDoc(noteRef, noteData);
}

export async function deleteNoteFromTopic(userId: string, topicId: string, noteId: string) {
    await deleteDoc(doc(db, "users", userId, "topics", topicId, "notes", noteId));
}

export async function getAllUserProblems(userId: string) {
  if (!userId) return {};
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

export async function getTopics(userId: string): Promise<Topic[]> {
  if (!userId) return [];

  const q = query(
    collection(db, "users", userId, "topics"),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as Topic)
  );
}

export async function getDailyQuestions(userId: string): Promise<DailyQuestion[]> {
  if (!userId) return [];

  const q = query(
    collection(db, "users", userId, "dailyQuestions"),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as DailyQuestion)
  );
}
