// This file is machine-generated - edit at your own risk!

'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting LeetCode problems based on the user's past performance.
 *
 * It uses the bucket history (To-Do, Solved, Repeat, Important, Tricky) to identify weaker areas and suggest relevant problems.
 *
 * - suggestLeetCodeProblems - A function that handles the problem suggestion process.
 * - SuggestLeetCodeProblemsInput - The input type for the suggestLeetCodeProblems function.
 * - SuggestLeetCodeProblemsOutput - The return type for the suggestLeetCodeProblems function.
 */

import {ai, createAiInstance} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestLeetCodeProblemsInputSchema = z.object({
  bucketHistory: z
    .record(z.array(z.string()))
    .describe(
      'A record of LeetCode problem IDs, grouped by status bucket (To-Do, Solved, Repeat, Important, Tricky).'
    ),
  topic: z.string().optional().describe('The topic to focus on.'),
  numberOfProblems: z
    .number()
    .default(5)
    .describe('The number of LeetCode problems to suggest.'),
  additionalContext: z
    .string()
    .optional()
    .describe('Additional context or preferences for problem suggestions.'),
  personalStats: z.object({
    totalSolved: z.number(),
    totalTricky: z.number(),
    totalRepeat: z.number(),
    weakestAreas: z.array(z.object({
      name: z.string(),
      successRate: z.number(),
      needsWork: z.boolean()
    })),
    performancePatterns: z.object({
      trickyToSolvedRatio: z.number(),
      repeatToSolvedRatio: z.number(),
      toDoAccumulation: z.boolean(),
      strongInInterviews: z.boolean()
    }),
    recentActivity: z.object({
      hasRecentSolved: z.boolean(),
      recentStruggles: z.array(z.string()),
      consistencyScore: z.number()
    })
  }).optional(),
  topicPerformance: z.record(z.object({
    solved: z.number(),
    total: z.number(),
    successRate: z.number()
  })).optional(),
  weakestAreas: z.array(z.string()).optional(),
  learningVelocity: z.object({
    hasRecentSolved: z.boolean(),
    recentStruggles: z.array(z.string()),
    consistencyScore: z.number()
  }).optional(),
  userPreferences: z.object({
    includeWeakAreas: z.boolean(),
    adaptiveDifficulty: z.boolean(),
    focusArea: z.string()
  }).optional()
});
export type SuggestLeetCodeProblemsInput = z.infer<
  typeof SuggestLeetCodeProblemsInputSchema
>;

const SuggestedProblemSchema = z.object({
  leetcodeProblemId: z.string().describe('The LeetCode problem ID.'),
  title: z.string().describe('The title of the LeetCode problem.'),
  difficulty: z.string().describe('The difficulty of the LeetCode problem.'),
  url: z.string().url().describe('The URL of the LeetCode problem.'),
  reason: z.string().describe('Reason for suggesting this problem'),
});

const SuggestLeetCodeProblemsOutputSchema = z.object({
  suggestedProblems: z.array(SuggestedProblemSchema).describe('An array of suggested LeetCode problems.'),
});
export type SuggestLeetCodeProblemsOutput = z.infer<
  typeof SuggestLeetCodeProblemsOutputSchema
>;

export async function suggestLeetCodeProblems(
  input: SuggestLeetCodeProblemsInput
): Promise<SuggestLeetCodeProblemsOutput> {
  return suggestLeetCodeProblemsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestLeetCodeProblemsPrompt',
  input: {schema: SuggestLeetCodeProblemsInputSchema},
  output: {schema: SuggestLeetCodeProblemsOutputSchema},
  prompt: `You are an elite LeetCode mentor with deep insight into learning patterns. Analyze this user's SPECIFIC performance data to create HIGHLY PERSONALIZED problem recommendations.

📊 USER'S DETAILED PERFORMANCE PROFILE:

PROBLEM BUCKETS:
{{#each bucketHistory}}
📂 {{@key}} Bucket ({{this.length}} problems):
{{#if this}}
{{#each this}}
   • Problem {{this}}
{{/each}}
{{else}}
   • (Empty - opportunity area)
{{/if}}
{{/each}}

{{#if personalStats}}
🧠 LEARNING INTELLIGENCE:
• Solved Problems: {{personalStats.totalSolved}}
• Tricky Problems: {{personalStats.totalTricky}}
• Repeat Problems: {{personalStats.totalRepeat}}
• Tricky/Solved Ratio: {{personalStats.performancePatterns.trickyToSolvedRatio}} ({{#if personalStats.performancePatterns.trickyToSolvedRatio > 0.3}}HIGH - needs foundation work{{else}}GOOD - ready for challenges{{/if}})
• Consistency Score: {{personalStats.recentActivity.consistencyScore}} ({{#if personalStats.recentActivity.consistencyScore > 0.7}}STRONG{{else}}NEEDS IMPROVEMENT{{/if}})
• Recent Activity: {{#if personalStats.recentActivity.hasRecentSolved}}ACTIVE{{else}}INACTIVE - needs motivation{{/if}}

WEAKEST AREAS NEEDING ATTENTION:
{{#each personalStats.weakestAreas}}
{{#if this.needsWork}}
• {{this.name}}: {{this.successRate}} success rate (PRIORITY TARGET)
{{/if}}
{{/each}}

RECENT STRUGGLES:
{{#each personalStats.recentActivity.recentStruggles}}
• Problem {{this}} - analyze why this was difficult
{{/each}}
{{/if}}

{{#if topicPerformance}}
TOPIC MASTERY BREAKDOWN:
{{#each topicPerformance}}
• {{@key}}: {{this.solved}}/{{this.total}} solved ({{this.successRate}} success rate)
{{/each}}
{{/if}}

{{#if topic}}
🎯 SPECIFIC FOCUS: {{{topic}}}
Tailor ALL suggestions to progressively master this area.
{{/if}}

{{#if additionalContext}}
💭 USER'S CONTEXT: {{{additionalContext}}}
Address these specific needs in your recommendations.
{{/if}}

{{#if userPreferences}}
⚙️ USER PREFERENCES:
• Include Weak Areas: {{userPreferences.includeWeakAreas}}
• Adaptive Difficulty: {{userPreferences.adaptiveDifficulty}}
• Focus Strategy: {{userPreferences.focusArea}}
{{/if}}

🎯 PERSONALIZATION STRATEGY:
1. **Weakness-First Approach**: If weak areas exist, prioritize foundational problems
2. **Difficulty Adaptation**: Match problem difficulty to user's success patterns
3. **Learning Path Logic**: Create a progression that builds on their specific knowledge gaps
4. **Motivation Optimization**: Choose engaging problems that build confidence
5. **Pattern Recognition**: Address the specific concepts they struggle with

⚡ SPECIFIC TARGETING RULES:
- If tricky/solved ratio > 0.3: Focus on fundamentals and easier pattern recognition
- If consistency score < 0.5: Include motivational, achievable problems
- If recent struggles exist: Address those specific concept gaps
- If weak areas identified: Prioritize problems that build those foundations
- If strong in interviews: Challenge with optimization and edge cases

🎯 Generate {{{numberOfProblems}}} LASER-TARGETED recommendations:

OUTPUT EXACTLY THIS JSON FORMAT:
{
  "suggestedProblems": [
    {
      "leetcodeProblemId": "1",
      "title": "Two Sum", 
      "difficulty": "Easy",
      "url": "https://leetcode.com/problems/two-sum/",
      "reason": "Based on your {{specific data pattern}}, this problem targets {{specific weakness}} that I see in your {{bucket analysis}}. This builds the foundation for {{next logical step}} which you'll need for {{specific topic mastery}}."
    }
  ]
}

CRITICAL: Every reason MUST reference specific data from their profile - no generic advice allowed!`,
});

const suggestLeetCodeProblemsFlow = ai.defineFlow(
  {
    name: 'suggestLeetCodeProblemsFlow',
    inputSchema: SuggestLeetCodeProblemsInputSchema,
    outputSchema: SuggestLeetCodeProblemsOutputSchema,
  },
  async input => {
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Create a new AI instance with the next API key for each attempt
        const aiInstance = createAiInstance();
        const retryPrompt = aiInstance.definePrompt({
          name: 'suggestLeetCodeProblemsPrompt',
          input: {schema: SuggestLeetCodeProblemsInputSchema},
          output: {schema: SuggestLeetCodeProblemsOutputSchema},
          prompt: `You are an elite LeetCode mentor with deep insight into learning patterns. Analyze this user's SPECIFIC performance data to create HIGHLY PERSONALIZED problem recommendations.

📊 USER'S DETAILED PERFORMANCE PROFILE:

PROBLEM BUCKETS:
{{#each bucketHistory}}
📂 {{@key}} Bucket ({{this.length}} problems):
{{#if this}}
{{#each this}}
   • Problem {{this}}
{{/each}}
{{else}}
   • (Empty - opportunity area)
{{/if}}
{{/each}}

{{#if personalStats}}
🧠 LEARNING INTELLIGENCE:
• Solved Problems: {{personalStats.totalSolved}}
• Tricky Problems: {{personalStats.totalTricky}}
• Repeat Problems: {{personalStats.totalRepeat}}
• Tricky/Solved Ratio: {{personalStats.performancePatterns.trickyToSolvedRatio}} ({{#if personalStats.performancePatterns.trickyToSolvedRatio > 0.3}}HIGH - needs foundation work{{else}}GOOD - ready for challenges{{/if}})
• Consistency Score: {{personalStats.recentActivity.consistencyScore}} ({{#if personalStats.recentActivity.consistencyScore > 0.7}}STRONG{{else}}NEEDS IMPROVEMENT{{/if}})
• Recent Activity: {{#if personalStats.recentActivity.hasRecentSolved}}ACTIVE{{else}}INACTIVE - needs motivation{{/if}}

WEAKEST AREAS NEEDING ATTENTION:
{{#each personalStats.weakestAreas}}
{{#if this.needsWork}}
• {{this.name}}: {{this.successRate}} success rate (PRIORITY TARGET)
{{/if}}
{{/each}}

RECENT STRUGGLES:
{{#each personalStats.recentActivity.recentStruggles}}
• Problem {{this}} - analyze why this was difficult
{{/each}}
{{/if}}

{{#if topicPerformance}}
TOPIC MASTERY BREAKDOWN:
{{#each topicPerformance}}
• {{@key}}: {{this.solved}}/{{this.total}} solved ({{this.successRate}} success rate)
{{/each}}
{{/if}}

{{#if topic}}
🎯 SPECIFIC FOCUS: {{{topic}}}
Tailor ALL suggestions to progressively master this area.
{{/if}}

{{#if additionalContext}}
💭 USER'S CONTEXT: {{{additionalContext}}}
Address these specific needs in your recommendations.
{{/if}}

{{#if userPreferences}}
⚙️ USER PREFERENCES:
• Include Weak Areas: {{userPreferences.includeWeakAreas}}
• Adaptive Difficulty: {{userPreferences.adaptiveDifficulty}}
• Focus Strategy: {{userPreferences.focusArea}}
{{/if}}

🎯 PERSONALIZATION STRATEGY:
1. **Weakness-First Approach**: If weak areas exist, prioritize foundational problems
2. **Difficulty Adaptation**: Match problem difficulty to user's success patterns
3. **Learning Path Logic**: Create a progression that builds on their specific knowledge gaps
4. **Motivation Optimization**: Choose engaging problems that build confidence
5. **Pattern Recognition**: Address the specific concepts they struggle with

⚡ SPECIFIC TARGETING RULES:
- If tricky/solved ratio > 0.3: Focus on fundamentals and easier pattern recognition
- If consistency score < 0.5: Include motivational, achievable problems
- If recent struggles exist: Address those specific concept gaps
- If weak areas identified: Prioritize problems that build those foundations
- If strong in interviews: Challenge with optimization and edge cases

🎯 Generate {{{numberOfProblems}}} LASER-TARGETED recommendations:

OUTPUT EXACTLY THIS JSON FORMAT:
{
  "suggestedProblems": [
    {
      "leetcodeProblemId": "1",
      "title": "Two Sum", 
      "difficulty": "Easy",
      "url": "https://leetcode.com/problems/two-sum/",
      "reason": "Based on your {{specific data pattern}}, this problem targets {{specific weakness}} that I see in your {{bucket analysis}}. This builds the foundation for {{next logical step}} which you'll need for {{specific topic mastery}}."
    }
  ]
}

CRITICAL: Every reason MUST reference specific data from their profile - no generic advice allowed!`,
        });
        
        const {output} = await retryPrompt(input);
        return output!;
      } catch (error: any) {
        lastError = error;
        // Check if it's a rate limit error (429)
        if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('rate limit')) {
          console.log(`Rate limit hit, retrying with next API key (attempt ${attempt + 1}/${maxRetries})`);
          continue;
        }
        // For non-rate-limit errors, throw immediately
        throw error;
      }
    }
    
    throw lastError || new Error('Failed after multiple retries');
  }
);
