/** Explainable keyword overlap estimate. It never asks a model to invent or score evidence. */
export function parseSkillList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && !!item.trim());
  if (typeof value === 'string') return value.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function includesTerm(text: string, term: string): boolean {
  const escaped = term.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escaped) return false;
  return new RegExp(`(^|[^a-z0-9+#.])${escaped}($|[^a-z0-9+#.])`, 'i').test(text);
}

export function scoreResumeAgainstJob(job: any, profile: any, resumeText = '') {
  const explicitSkills = parseSkillList(job.requiredSkills);
  const description = String(job.description || '').toLowerCase();
  const knownSkills = [
    'TypeScript', 'JavaScript', 'React', 'Next.js', 'Node.js', 'Python', 'Java', 'C++', 'C#',
    'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
    'Git', 'REST API', 'GraphQL', 'HTML', 'CSS', 'Selenium', 'Cypress', 'Playwright', 'Jest',
    'Manual Testing', 'Automation Testing', 'Agile', 'Scrum', 'Linux', 'Machine Learning', 'Excel',
  ];
  const requiredSkills = explicitSkills.length
    ? explicitSkills
    : knownSkills.filter((skill) => includesTerm(description, skill));
  const evidence = [
    resumeText,
    profile?.summary,
    ...parseSkillList(profile?.skills),
    ...(profile?.experience || []).flatMap((item: any) => [item?.title, item?.description, ...parseSkillList(item?.skills)]),
    ...(profile?.education || []).flatMap((item: any) => [item?.degree, item?.field]),
    ...(profile?.projects || []).flatMap((item: any) => [item?.name, item?.description, ...parseSkillList(item?.technologies)]),
    ...(profile?.certifications || []).map((item: any) => item?.name),
  ].filter(Boolean).join('\n').toLowerCase();

  const matchedSkills = requiredSkills.filter((skill) => includesTerm(evidence, skill));
  const missingSkills = requiredSkills.filter((skill) => !matchedSkills.includes(skill));
  const score = requiredSkills.length ? Math.round((matchedSkills.length / requiredSkills.length) * 100) : null;
  const titleTerms = String(job.title || '').toLowerCase().split(/[^a-z0-9+#.]+/).filter((word) => word.length > 2);
  const titleMatches = [...new Set(titleTerms.filter((term) => includesTerm(evidence, term)))];

  return {
    score,
    matchedSkills,
    missingSkills,
    requirementsSource: explicitSkills.length ? 'job_required_skills' : requiredSkills.length ? 'job_description_keywords' : 'none_found',
    titleMatches,
    evidenceSource: resumeText ? 'uploaded_resume_text_and_profile' : 'parsed_profile_only',
    explanation: score === null
      ? 'This job has no parsed required skills, so a skill coverage score cannot be calculated.'
      : `${matchedSkills.length} of ${requiredSkills.length} listed required skills were found in the resume/profile text. This is keyword coverage, not an employer ATS result.`,
  };
}
