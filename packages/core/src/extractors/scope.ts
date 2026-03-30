export const detectScope = (text: string): 'global' | 'project' => {
  if (/across (?:all )?projects|all (?:my )?repos|every project|globally|in general/i.test(text)) {
    return 'global';
  }

  if (
    /^(?:i )?(?:always|prefer|like to|usually)\b/i.test(text) &&
    !/(?:this|here|in this|repo|project)/i.test(text)
  ) {
    return 'global';
  }

  if (/(?:this|here|in this)\s+(?:project|repo|codebase)/i.test(text)) {
    return 'project';
  }

  return 'project';
};
