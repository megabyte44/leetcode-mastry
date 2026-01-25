
"use client";

import { db } from "@/lib/firebase";
import { cache, CacheUtils } from "@/lib/cache";
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
  
  // Invalidate cache
  try {
    await CacheUtils.invalidateUserCache(userId);
  } catch (error) {
    console.error('Failed to invalidate cache after adding topic:', error);
  }
}

export async function updateTopic(userId: string, topicId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  
  if (!name) {
    return { error: "Topic name is required." };
  }

  const topicRef = doc(db, "users", userId, "topics", topicId);
  await updateDoc(topicRef, { name, description });
  
  // Invalidate cache
  try {
    await CacheUtils.invalidateUserCache(userId);
  } catch (error) {
    console.error('Failed to invalidate cache after updating topic:', error);
  }
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
    
    // Invalidate cache
    try {
      await CacheUtils.invalidateUserCache(userId);
    } catch (error) {
      console.error('Failed to invalidate cache after deleting topic:', error);
    }
}


// Daily Questions Actions
export async function addDailyQuestion(userId: string, formData: FormData) {
  const leetcodeId = formData.get("leetcodeId") as string;
  const note = formData.get("note") as string;

  if (!leetcodeId) {
    return { error: "LeetCode ID is required." };
  }
  const title = formData.get("title") as string;
  const difficulty = formData.get("difficulty") as string;
  const titleSlug = formData.get("titleSlug") as string;
  
  const link = titleSlug ? `https://leetcode.com/problems/${titleSlug}/` : 
               leetcodeId ? `https://leetcode.com/problems/${leetcodeId}/` : undefined;

  await addDoc(collection(db, "users", userId, "dailyQuestions"), {
    leetcodeId: parseInt(leetcodeId, 10),
    ...(title && { title }),
    ...(difficulty && { difficulty }),
    ...(titleSlug && { titleSlug }),
    ...(link && { link }),
    note,
    createdAt: serverTimestamp(),
  });
}

export async function addAISuggestedToDailyQuestion(
  userId: string, 
  problemId: string, 
  title: string, 
  reason: string, 
  url: string
) {
  if (!problemId || !userId) {
    return { error: "Problem ID and User ID are required." };
  }

  await addDoc(collection(db, "users", userId, "dailyQuestions"), {
    leetcodeId: parseInt(problemId, 10),
    link: url,
    note: `🤖 AI Suggested: ${reason}`,
    title,
    source: 'ai-suggestion',
    createdAt: serverTimestamp(),
  });
}

export async function deleteDailyQuestion(userId: string, id: string) {
    await deleteDoc(doc(db, "users", userId, "dailyQuestions", id));
}

// Topic Questions Actions
export async function addQuestionToTopic(userId: string, topicId: string, formData: FormData) {
    const parseJsonArray = (value: FormDataEntryValue | null): string[] => {
        if (!value) return [];
        try {
            return JSON.parse(value as string);
        } catch {
            return [];
        }
    };

    const questionData = {
        title: formData.get('title') as string,
        link: formData.get('link') as string,
        difficulty: formData.get('difficulty'),
        status: formData.get('status'),
        personalNotes: formData.get('personalNotes') || '',
        confidence: formData.get('confidence') ? parseInt(formData.get('confidence') as string, 10) : undefined,
        patterns: parseJsonArray(formData.get('patterns')),
        topicTags: parseJsonArray(formData.get('topicTags')),
        companies: parseJsonArray(formData.get('companies')),
        timeComplexity: formData.get('timeComplexity') || '',
        spaceComplexity: formData.get('spaceComplexity') || '',
        approach: formData.get('approach') || '',
        keyInsights: formData.get('keyInsights') || '',
    };

    if(!questionData.title || !questionData.difficulty || !questionData.status) {
        return { error: "Missing required fields." };
    }

    await addDoc(collection(db, "users", userId, "topics", topicId, "questions"), {
        ...questionData,
        attemptCount: 1,
        createdAt: serverTimestamp(),
    });
}

export async function updateTopicQuestion(userId: string, topicId: string, questionId: string, formData: FormData) {
    const parseJsonArray = (value: FormDataEntryValue | null): string[] => {
        if (!value) return [];
        try {
            return JSON.parse(value as string);
        } catch {
            return [];
        }
    };

    const questionData: Partial<TopicQuestion> = {
        title: formData.get('title') as string,
        link: formData.get('link') as string,
        difficulty: formData.get('difficulty') as TopicQuestion['difficulty'],
        status: formData.get('status') as TopicQuestion['status'],
        personalNotes: formData.get('personalNotes') as string || '',
        confidence: formData.get('confidence') ? parseInt(formData.get('confidence') as string, 10) : undefined,
        patterns: parseJsonArray(formData.get('patterns')),
        topicTags: parseJsonArray(formData.get('topicTags')),
        companies: parseJsonArray(formData.get('companies')),
        timeComplexity: formData.get('timeComplexity') as string || '',
        spaceComplexity: formData.get('spaceComplexity') as string || '',
        approach: formData.get('approach') as string || '',
        keyInsights: formData.get('keyInsights') as string || '',
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
  
  const cacheKey = CacheUtils.createUserCacheKey(userId, 'problems');
  
  try {
    // Try cache first
    const cached = await cache.get('user_progress', cacheKey);
    if (cached) {
      console.log('Using cached user problems data');
      return cached;
    }
  } catch (error) {
    console.error('Cache read failed, fetching from Firebase:', error);
  }
  
  // Fetch from Firebase
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
  
  // Cache the result
  try {
    await cache.set('user_progress', cacheKey, allProblems);
  } catch (error) {
    console.error('Failed to cache user problems:', error);
  }
  
  return allProblems;
}

export async function getTopics(userId: string): Promise<Topic[]> {
  if (!userId) return [];
  
  const cacheKey = CacheUtils.createUserCacheKey(userId, 'topics');
  
  try {
    // Try cache first
    const cached = await cache.get('user_topics', cacheKey);
    if (cached) {
      console.log('Using cached topics data');
      return cached;
    }
  } catch (error) {
    console.error('Cache read failed, fetching topics from Firebase:', error);
  }

  const q = query(
    collection(db, "users", userId, "topics"),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  const topics = querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as Topic)
  );
  
  // Cache the result
  try {
    await cache.set('user_topics', cacheKey, topics);
  } catch (error) {
    console.error('Failed to cache topics:', error);
  }
  
  return topics;
}

export async function getTopicsWithStats(userId: string): Promise<import("@/lib/types").TopicWithStats[]> {
  if (!userId) return [];

  const q = query(
    collection(db, "users", userId, "topics"),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  
  const topicsWithStats = await Promise.all(
    querySnapshot.docs.map(async (topicDoc) => {
      const topicData = { id: topicDoc.id, ...topicDoc.data() } as Topic;
      
      // Fetch questions for this topic
      const questionsSnapshot = await getDocs(
        collection(db, "users", userId, "topics", topicDoc.id, "questions")
      );
      
      let solvedCount = 0;
      let easyCount = 0;
      let mediumCount = 0;
      let hardCount = 0;
      
      questionsSnapshot.forEach((questionDoc) => {
        const question = questionDoc.data() as TopicQuestion;
        if (question.status === "Solved") solvedCount++;
        if (question.difficulty === "Easy") easyCount++;
        else if (question.difficulty === "Medium") mediumCount++;
        else if (question.difficulty === "Hard") hardCount++;
      });
      
      return {
        ...topicData,
        stats: {
          totalQuestions: questionsSnapshot.size,
          solvedCount,
          easyCount,
          mediumCount,
          hardCount,
        },
      };
    })
  );
  
  return topicsWithStats;
}

export async function getDailyQuestions(userId: string): Promise<DailyQuestion[]> {
  if (!userId) return [];
  
  const cacheKey = CacheUtils.createUserCacheKey(userId, 'daily');
  
  try {
    // Try cache first
    const cached = await cache.get('daily_questions', cacheKey);
    if (cached) {
      console.log('Using cached daily questions data');
      return cached;
    }
  } catch (error) {
    console.error('Cache read failed, fetching daily questions from Firebase:', error);
  }

  const q = query(
    collection(db, "users", userId, "dailyQuestions"),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  const dailyQuestions = querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as DailyQuestion)
  );
  
  // Cache the result
  try {
    await cache.set('daily_questions', cacheKey, dailyQuestions);
  } catch (error) {
    console.error('Failed to cache daily questions:', error);
  }
  
  return dailyQuestions;
}
