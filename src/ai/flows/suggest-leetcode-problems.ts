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

import {ai} from '@/ai/genkit';
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
  prompt: `You are an expert LeetCode problem recommender. Given a user's past performance on LeetCode problems, you will suggest problems that target their weaknesses.

The user's past performance is represented by a bucket history. Each bucket represents a different status: To-Do, Solved, Repeat, Important, Tricky. The problems within each bucket are represented by their LeetCode problem IDs.

Bucket History:
{{#each bucketHistory}}
  {{@key}}:
    {{#each this}}
      - {{this}}
    {{/each}}
{{/each}}

{{#if topic}}
The user wants to focus on problems related to the topic: {{{topic}}}.
{{/if}}

Suggest {{{numberOfProblems}}} LeetCode problems that would help the user improve, along with a brief reason for each suggestion. Prioritize problems from topics where the user has more problems in the 'Tricky' and 'Repeat' buckets, and fewer in the 'Solved' bucket.  Also suggest problems of a similar type of previously correctly answered questions but of increasing difficulty.

Output the list of suggested problems in JSON format:

{
  "suggestedProblems": [
    {
      "leetcodeProblemId": "",
      "title": "",
      "difficulty": "",
      "url": "",
      "reason": ""
    }
  ]
}
`,
});

const suggestLeetCodeProblemsFlow = ai.defineFlow(
  {
    name: 'suggestLeetCodeProblemsFlow',
    inputSchema: SuggestLeetCodeProblemsInputSchema,
    outputSchema: SuggestLeetCodeProblemsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
