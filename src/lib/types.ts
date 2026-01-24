import type { Timestamp } from "firebase/firestore";

// ============ Daily Questions ============
export type DailyQuestion = {
  id: string;
  leetcodeId: number;
  link?: string;
  topicRef?: string;
  note?: string;
  createdAt: Timestamp;
};

// ============ Topics ============
export type Topic = {
  id: string;
  name: string;
  description: string;
  createdAt: Timestamp;
};

export type TopicStats = {
  totalQuestions: number;
  solvedCount: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
};

export type TopicWithStats = Topic & {
  stats: TopicStats;
};

export type TopicNote = {
  id: string;
  content: string;
  type: 'text' | 'code';
  createdAt: Timestamp;
};

// ============ Question Statuses & Difficulties ============
export const questionStatuses = ['To-Do', 'Solved', 'Repeat', 'Important', 'Tricky'] as const;
export type QuestionStatus = (typeof questionStatuses)[number];

export const difficulties = ['Easy', 'Medium', 'Hard'] as const;
export type Difficulty = (typeof difficulties)[number];

export const confidenceLevels = [1, 2, 3, 4, 5] as const;
export type ConfidenceLevel = (typeof confidenceLevels)[number];

// ============ Patterns (for auto-tagging) ============
export const patterns = [
  'Two Pointers',
  'Sliding Window',
  'Binary Search',
  'Fast & Slow Pointers',
  'Merge Intervals',
  'Cyclic Sort',
  'In-place Reversal',
  'BFS',
  'DFS',
  'Two Heaps',
  'Subsets',
  'Modified Binary Search',
  'Top K Elements',
  'K-way Merge',
  'Topological Sort',
  'Dynamic Programming',
  'Backtracking',
  'Greedy',
  'Divide & Conquer',
  'Bit Manipulation',
  'Monotonic Stack',
  'Union Find',
  'Trie',
  'Segment Tree',
  'Hash Map',
  'Recursion',
  'Math',
  'Matrix',
  'String Manipulation',
  'Linked List',
  'Tree Traversal',
  'Graph',
  'Heap/Priority Queue',
  'Stack',
  'Queue',
] as const;
export type Pattern = (typeof patterns)[number];

// ============ Topics (Data Structures & Algorithms) ============
export const topicTags = [
  'Array',
  'String',
  'Hash Table',
  'Dynamic Programming',
  'Math',
  'Sorting',
  'Greedy',
  'Depth-First Search',
  'Binary Search',
  'Breadth-First Search',
  'Tree',
  'Matrix',
  'Two Pointers',
  'Bit Manipulation',
  'Stack',
  'Heap (Priority Queue)',
  'Graph',
  'Prefix Sum',
  'Simulation',
  'Design',
  'Backtracking',
  'Counting',
  'Sliding Window',
  'Union Find',
  'Linked List',
  'Monotonic Stack',
  'Ordered Set',
  'Recursion',
  'Divide and Conquer',
  'Binary Tree',
  'Trie',
  'Binary Search Tree',
  'Segment Tree',
  'Queue',
  'Memoization',
  'Geometry',
  'Topological Sort',
] as const;
export type TopicTag = (typeof topicTags)[number];

// ============ Companies ============
export const companies = [
  'Google',
  'Amazon',
  'Meta',
  'Apple',
  'Microsoft',
  'Netflix',
  'Bloomberg',
  'Adobe',
  'Uber',
  'LinkedIn',
  'Twitter',
  'Salesforce',
  'Oracle',
  'Goldman Sachs',
  'JPMorgan',
  'Morgan Stanley',
  'Citadel',
  'Two Sigma',
  'Airbnb',
  'Stripe',
  'Snap',
  'TikTok',
  'ByteDance',
  'Nvidia',
  'Intel',
  'Cisco',
  'VMware',
  'PayPal',
  'Walmart',
  'eBay',
] as const;
export type Company = (typeof companies)[number];

// ============ Enhanced Topic Question ============
export type TopicQuestion = {
  id: string;
  leetcodeNumber?: number;
  link?: string;
  title: string;
  difficulty: Difficulty;
  status: QuestionStatus;
  
  // Enhanced fields
  confidence?: number;
  patterns?: string[];
  topicTags?: string[];
  companies?: string[];
  timeComplexity?: string;
  spaceComplexity?: string;
  
  // Notes
  personalNotes?: string;
  approach?: string;
  keyInsights?: string;
  
  // Tracking
  attemptCount?: number;
  lastSolved?: Timestamp;
  nextReviewDate?: Timestamp;
  reviewInterval?: number; // days for spaced repetition
  createdAt: Timestamp;
};

// ============ Code Snippets ============
export const programmingLanguages = ['javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'rust'] as const;
export type ProgrammingLanguage = (typeof programmingLanguages)[number];

export type CodeSnippet = {
  id: string;
  title: string;
  description?: string;
  code: string;
  language: ProgrammingLanguage;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// ============ LeetCode Problem Database (for auto-tagging) ============
export type LeetCodeProblem = {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  patterns: string[];
  companies: string[];
  isPremium?: boolean;
  acceptance?: number;
  frequency?: number;
};

// ============ AI Memory Bank ============
export type MemoryType = 'insight' | 'mistake' | 'pattern' | 'tip';

export type Memory = {
  id: string;
  userId: string;
  content: string;
  tags: string[];
  relatedTopics?: string[];
  relatedProblems?: string[];
  type: MemoryType;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

// ============ Spaced Repetition ============
export type ReviewItem = {
  question: TopicQuestion;
  topicId: string;
  topicName: string;
  priority: number;
};

// ============ Export Data ============
export type ExportData = {
  exportedAt: string;
  version: string;
  user: {
    uid: string;
    email?: string;
    displayName?: string;
  };
  topics: (Topic & { questions: TopicQuestion[]; notes: TopicNote[] })[];
  dailyQuestions: DailyQuestion[];
  snippets: CodeSnippet[];
};

// ============ Offline Sync ============
export type SyncAction = {
  id: string;
  action: 'create' | 'update' | 'delete';
  collection: string;
  docId: string;
  data?: any;
  timestamp: Date;
  synced: boolean;
};
