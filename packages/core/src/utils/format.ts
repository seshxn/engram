import { displayEntry } from '../memory/metadata.js';

export interface MemorySection {
  heading: string;
  entries: string[];
}

export const formatGuidanceXml = (guidance: string): string => {
  if (!guidance.trim()) {
    return '';
  }

  return `<engram-guidance>\n${guidance.trim()}\n</engram-guidance>`;
};

export const formatMemoryXml = (sections: MemorySection[]): string => {
  const nonEmpty = sections.filter((section) => section.entries.length > 0);
  if (nonEmpty.length === 0) {
    return '';
  }

  const body = nonEmpty
    .map(
      (section) =>
        `## ${section.heading}\n${section.entries.map((entry) => `- ${displayEntry(entry)}`).join('\n')}`,
    )
    .join('\n\n');

  return `<engram-memory>\n${body}\n</engram-memory>`;
};

export const formatReviewXml = (sessionSummary: string): string => {
  return `<engram-review>
You have a memory system managed by the engram plugin. The following is a
summary of the previous session transcript. Please review it for anything worth
remembering that the automatic extractor may have missed.

Focus on:
- Nuanced preferences (coding style patterns, not just explicit corrections)
- Architectural understanding that emerged from the conversation
- Resolved pending items that should be cleared
- Patterns across sessions (if existing memories provide context)

Previous session summary:
${sessionSummary}

If you identify missed memories, include them once in your next assistant
response using this exact structure:

<engram-suggestions>
## User Preferences
- Example preference

## User Patterns
- Example pattern

## Pending Items (Global)
- Example global todo

## Project Context
- Example project fact

## Project Decisions
- Example project decision

## Pending Items (Project)
- Example project todo
</engram-suggestions>

Do not write files directly. Engram will persist any valid suggestions automatically.
</engram-review>`;
};

export const formatSummaryLine = (globalCount: number, projectCount: number): string => {
  return `Engram: loaded ${globalCount} global + ${projectCount} project memories`;
};
