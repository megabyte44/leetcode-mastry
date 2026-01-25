import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, topicId, problemId, title, difficulty, titleSlug, topicTags } = body;

    if (!userId || !topicId || !problemId) {
      return NextResponse.json(
        { error: 'User ID, Topic ID and Problem ID are required' },
        { status: 400 }
      );
    }

    // Generate the LeetCode URL
    const link = titleSlug ? 
      `https://leetcode.com/problems/${titleSlug}/` : 
      `https://leetcode.com/problems/${problemId}/`;

    // Add to topic questions collection with proper TopicQuestion format
    await addDoc(collection(db, "users", userId, "topics", topicId, "questions"), {
      title: title || `Problem ${problemId}`,
      link: link,
      difficulty: difficulty || 'MEDIUM',
      status: 'Not Started',
      confidence: 1,
      timeComplexity: '',
      spaceComplexity: '',
      personalNotes: '',
      approach: '',
      keyInsights: '',
      patterns: topicTags || [],
      topicTags: topicTags || [],
      companies: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding question to topic:', error);
    return NextResponse.json(
      { error: 'Failed to add question to topic' },
      { status: 500 }
    );
  }
}