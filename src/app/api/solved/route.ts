import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, problemId, title, difficulty, titleSlug, topicTags } = body;

    if (!userId || !problemId) {
      return NextResponse.json(
        { error: 'User ID and Problem ID are required' },
        { status: 400 }
      );
    }

    // Add to solved collection
    await addDoc(collection(db, "users", userId, "solvedProblems"), {
      problemId,
      title: title || `Problem ${problemId}`,
      difficulty: difficulty || 'UNKNOWN',
      titleSlug: titleSlug || problemId,
      topicTags: topicTags || [],
      solvedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding solved problem:', error);
    return NextResponse.json(
      { error: 'Failed to add solved problem' },
      { status: 500 }
    );
  }
}