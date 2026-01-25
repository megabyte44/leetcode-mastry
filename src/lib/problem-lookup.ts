import problemsData from './leetcode-problems.json';
import type { LeetCodeProblem, Difficulty } from './types';

// Type the imported data
const problems: LeetCodeProblem[] = problemsData.problems as LeetCodeProblem[];

// Create lookup maps for fast access
const problemById = new Map<number, LeetCodeProblem>();
const problemBySlug = new Map<string, LeetCodeProblem>();

// Initialize maps
problems.forEach(problem => {
  problemById.set(problem.id, problem);
  problemBySlug.set(problem.slug, problem);
});

/**
 * Extract problem ID or slug from a LeetCode URL
 * Supports formats:
 * - https://leetcode.com/problems/two-sum/
 * - https://leetcode.com/problems/two-sum/description/
 * - leetcode.com/problems/two-sum
 * - two-sum
 * - 1
 */
export function parseLeetCodeUrl(input: string): { id?: number; slug?: string } {
  const trimmed = input.trim();
  
  // Check if it's just a number
  if (/^\d+$/.test(trimmed)) {
    return { id: parseInt(trimmed, 10) };
  }
  
  // Check if it's a URL
  const urlMatch = trimmed.match(/leetcode\.com\/problems\/([a-z0-9-]+)/i);
  if (urlMatch) {
    return { slug: urlMatch[1].toLowerCase() };
  }
  
  // Check if it's just a slug
  if (/^[a-z0-9-]+$/i.test(trimmed)) {
    return { slug: trimmed.toLowerCase() };
  }
  
  return {};
}

/**
 * Get problem by ID
 */
export async function getProblemById(id: number): Promise<LeetCodeProblem | undefined> {
  await initializeProblemMaps();
  return problemById?.get(id);
}

/**
 * Get problem by slug
 */
export async function getProblemBySlug(slug: string): Promise<LeetCodeProblem | undefined> {
  await initializeProblemMaps();
  return problemBySlug?.get(slug.toLowerCase());
}

/**
 * Auto-detect problem from URL or ID input
 */
export async function lookupProblem(input: string): Promise<LeetCodeProblem | undefined> {
  const parsed = parseLeetCodeUrl(input);
  
  if (parsed.id) {
    return await getProblemById(parsed.id);
  }
  
  if (parsed.slug) {
    return await getProblemBySlug(parsed.slug);
  }
  
  return undefined;
}

/**
 * Search problems by title (fuzzy search)
 */
export function searchProblems(query: string, limit: number = 10): LeetCodeProblem[] {
  const lowerQuery = query.toLowerCase();
  
  return problems
    .filter(p => 
      p.title.toLowerCase().includes(lowerQuery) ||
      p.slug.includes(lowerQuery) ||
      p.id.toString() === query
    )
    .slice(0, limit);
}

/**
 * Get all problems
 */
export function getAllProblems(): LeetCodeProblem[] {
  return [...problems];
}

/**
 * Get problems by topic
 */
export function getProblemsByTopic(topic: string): LeetCodeProblem[] {
  return problems.filter(p => 
    p.topics.some(t => t.toLowerCase() === topic.toLowerCase())
  );
}

/**
 * Get problems by pattern
 */
export function getProblemsByPattern(pattern: string): LeetCodeProblem[] {
  return problems.filter(p => 
    p.patterns.some(pt => pt.toLowerCase() === pattern.toLowerCase())
  );
}

/**
 * Get problems by company
 */
export function getProblemsByCompany(company: string): LeetCodeProblem[] {
  return problems.filter(p => 
    p.companies.some(c => c.toLowerCase() === company.toLowerCase())
  );
}

/**
 * Get problems by difficulty
 */
export function getProblemsByDifficulty(difficulty: Difficulty): LeetCodeProblem[] {
  return problems.filter(p => p.difficulty === difficulty);
}

/**
 * Build LeetCode problem URL from ID or slug
 */
export function buildLeetCodeUrl(idOrSlug: number | string): string {
  if (typeof idOrSlug === 'number') {
    const problem = getProblemById(idOrSlug);
    if (problem) {
      return `https://leetcode.com/problems/${problem.slug}/`;
    }
    return `https://leetcode.com/problems/${idOrSlug}/`;
  }
  return `https://leetcode.com/problems/${idOrSlug}/`;
}

/**
 * Get total problem count
 */
export function getProblemCount(): number {
  return problems.length;
}

/**
 * Get unique topics
 */
export function getAllTopics(): string[] {
  const topicsSet = new Set<string>();
  problems.forEach(p => p.topics.forEach(t => topicsSet.add(t)));
  return Array.from(topicsSet).sort();
}

/**
 * Get unique patterns
 */
export function getAllPatterns(): string[] {
  const patternsSet = new Set<string>();
  problems.forEach(p => p.patterns.forEach(pt => patternsSet.add(pt)));
  return Array.from(patternsSet).sort();
}

/**
 * Get unique companies
 */
export function getAllCompanies(): string[] {
  const companiesSet = new Set<string>();
  problems.forEach(p => p.companies.forEach(c => companiesSet.add(c)));
  return Array.from(companiesSet).sort();
}
