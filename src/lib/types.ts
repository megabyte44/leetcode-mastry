import type { Timestamp } from "firebase/firestore";

export type DailyQuestion = {
  id: string;
  leetcodeId: number;
  link: string;
  topicRef?: string;
  note?: string;
  createdAt: Timestamp;
};

export type Topic = {
  id: string;
  name: string;
  description: string;
  createdAt: Timestamp;
};

export type TopicNote = {
  id: string;
  content: string;
  type: 'text' | 'code';
  createdAt: Timestamp;
};

export const questionStatuses = ['To-Do', 'Solved', 'Repeat', 'Important', 'Tricky'] as const;
export type QuestionStatus = (typeof questionStatuses)[number];

export const difficulties = ['Easy', 'Medium', 'Hard'] as const;
export type Difficulty = (typeof difficulties)[number];

export type TopicQuestion = {
  id: string;
  link: string;
  title: string;
  difficulty: Difficulty;
  status: QuestionStatus;
  personalNotes?: string;
  lastSolved?: Timestamp;
  createdAt: Timestamp;
};
