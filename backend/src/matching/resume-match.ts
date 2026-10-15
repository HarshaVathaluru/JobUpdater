export interface SkillDefinition {
  canonical: string;
  synonyms: string[];
}

export const SKILL_TAXONOMY: SkillDefinition[] = [
  { canonical: 'Java', synonyms: ['java', 'core java', 'java 8', 'java 11', 'java 17', 'j2ee', 'j2se'] },
  { canonical: 'Spring Boot', synonyms: ['spring boot', 'springboot', 'spring framework', 'spring mvc', 'spring'] },
  { canonical: 'Full Stack Development', synonyms: ['full stack', 'fullstack', 'full-stack', 'full stack developer', 'full stack development', 'full stack engineer'] },
  { canonical: 'React.js', synonyms: ['react', 'react.js', 'reactjs'] },
  { canonical: 'Next.js', synonyms: ['next.js', 'nextjs', 'next'] },
  { canonical: 'Node.js', synonyms: ['node', 'node.js', 'nodejs'] },
  { canonical: 'Express.js', synonyms: ['express', 'express.js', 'expressjs'] },
  { canonical: 'JavaScript', synonyms: ['javascript', 'js', 'es6', 'ecmascript'] },
  { canonical: 'TypeScript', synonyms: ['typescript', 'ts'] },
  { canonical: 'Python', synonyms: ['python', 'python3', 'django', 'fastapi', 'flask'] },
  { canonical: 'SQL', synonyms: ['sql', 'rdbms', 'relational database', 'database'] },
  { canonical: 'PostgreSQL', synonyms: ['postgresql', 'postgres', 'psql'] },
  { canonical: 'MySQL', synonyms: ['mysql'] },
  { canonical: 'MongoDB', synonyms: ['mongodb', 'mongo', 'nosql'] },
  { canonical: 'RESTful APIs', synonyms: ['rest api', 'rest apis', 'restful api', 'restful apis', 'rest services', 'web services'] },
  { canonical: 'JWT Auth', synonyms: ['jwt', 'jwt auth', 'jwt authentication', 'json web token'] },
  { canonical: 'Selenium WebDriver', synonyms: ['selenium', 'selenium webdriver', 'selenium grid'] },
  { canonical: 'Tricentis Tosca', synonyms: ['tosca', 'tricentis tosca'] },
  { canonical: 'Cucumber (BDD)', synonyms: ['cucumber', 'bdd', 'gherkin'] },
  { canonical: 'TestNG', synonyms: ['testng'] },
  { canonical: 'Postman', synonyms: ['postman', 'api testing', 'api test'] },
  { canonical: 'Automation Testing', synonyms: ['automation testing', 'automated testing', 'test automation', 'qa automation', 'automation engineer'] },
  { canonical: 'Manual Testing', synonyms: ['manual testing', 'functional testing', 'regression testing', 'smoke testing', 'sanity testing', 'uat', 'system testing'] },
  { canonical: 'SDLC / STLC', synonyms: ['sdlc', 'stlc', 'software testing lifecycle', 'bug lifecycle', 'defect tracking', 'test case design'] },
  { canonical: 'Git & GitHub', synonyms: ['git', 'github', 'version control'] },
  { canonical: 'Docker & Containers', synonyms: ['docker', 'container', 'containers', 'containerization'] },
  { canonical: 'AWS Cloud', synonyms: ['aws', 'amazon web services', 's3', 'ec2', 'lambda'] },
  { canonical: 'Microservices', synonyms: ['microservices', 'microservice', 'micro service', 'distributed systems'] },
  { canonical: 'HTML & CSS', synonyms: ['html', 'css', 'html5', 'css3', 'tailwind', 'bootstrap'] },
  { canonical: 'Agile & Scrum', synonyms: ['agile', 'scrum', 'sprint'] },
  { canonical: 'C++', synonyms: ['c++'] },
  { canonical: 'C# / .NET', synonyms: ['c#', '.net', 'dotnet', 'asp.net'] },
  { canonical: 'Kubernetes', synonyms: ['kubernetes', 'k8s'] },
  { canonical: 'GraphQL', synonyms: ['graphql'] },
  { canonical: 'Linux', synonyms: ['linux', 'unix'] },
];

export function parseSkillList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && !!item.trim());
  if (typeof value === 'string') return value.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean);
  return [];
}

export function normalizeText(text: string): string {
  return String(text || '').toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ');
}

export function matchesSkillInText(text: string, skillDef: SkillDefinition): boolean {
  const normText = ' ' + normalizeText(text) + ' ';
  return skillDef.synonyms.some((syn) => {
    const normSyn = normalizeText(syn).trim();
    if (!normSyn) return false;
    return normText.includes(' ' + normSyn + ' ');
  });
}

export function extractSkillsFromContent(content: string): SkillDefinition[] {
  return SKILL_TAXONOMY.filter((skillDef) => matchesSkillInText(content, skillDef));
}

export function scoreResumeAgainstJob(job: any, profile: any, resumeText = '') {
  const explicitSkills = parseSkillList(job.requiredSkills);
  const preferredSkills = parseSkillList(job.preferredSkills);
  const jobTitle = String(job.title || '');
  const jobDescription = String(job.description || '');

  // Extract skills from job: explicit skills, preferred, title tech, and description tech
  const jobSkillDefs = new Map<string, SkillDefinition>();

  // 1. Check title
  extractSkillsFromContent(jobTitle).forEach((def) => jobSkillDefs.set(def.canonical, def));

  // 2. Check explicit skills and map to canonical or create custom definition
  for (const s of [...explicitSkills, ...preferredSkills]) {
    const mapped = SKILL_TAXONOMY.find((def) => matchesSkillInText(s, def));
    if (mapped) {
      jobSkillDefs.set(mapped.canonical, mapped);
    } else if (s.trim().length > 1) {
      const customCanonical = s.trim();
      jobSkillDefs.set(customCanonical, {
        canonical: customCanonical,
        synonyms: [customCanonical.toLowerCase()],
      });
    }
  }

  // 3. Check description
  extractSkillsFromContent(jobDescription).forEach((def) => jobSkillDefs.set(def.canonical, def));

  const targetJobSkills = Array.from(jobSkillDefs.values());

  // Aggregate candidate evidence
  const evidenceText = [
    resumeText,
    profile?.summary,
    ...(parseSkillList(profile?.skills)),
    ...(profile?.experience || []).flatMap((item: any) => [item?.title, item?.company, item?.description, ...(parseSkillList(item?.skills))]),
    ...(profile?.education || []).flatMap((item: any) => [item?.degree, item?.field, item?.institution]),
    ...(profile?.projects || []).flatMap((item: any) => [item?.name, item?.description, ...(parseSkillList(item?.technologies))]),
    ...(profile?.certifications || []).map((item: any) => item?.name),
    ...(profile?.achievements || []),
  ].filter(Boolean).join('\n');

  // Match skills against candidate evidence
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skillDef of targetJobSkills) {
    if (matchesSkillInText(evidenceText, skillDef)) {
      matchedSkills.push(skillDef.canonical);
    } else {
      missingSkills.push(skillDef.canonical);
    }
  }

  // Calculate Title Relevance
  const titleSkillDefs = extractSkillsFromContent(jobTitle);
  let titleBonus = 0;
  if (titleSkillDefs.length > 0) {
    const matchedTitleSkills = titleSkillDefs.filter((def) => matchesSkillInText(evidenceText, def));
    titleBonus = (matchedTitleSkills.length / titleSkillDefs.length) * 25;
  } else {
    // If title has common developer/QA keywords that candidate shares
    const normTitle = normalizeText(jobTitle);
    const normEvidence = normalizeText(evidenceText);
    const commonRoles = ['developer', 'engineer', 'tester', 'qa', 'architect', 'lead', 'intern'];
    const matchedRole = commonRoles.some((role) => normTitle.includes(role) && normEvidence.includes(role));
    if (matchedRole) titleBonus = 15;
  }

  // Calculate overall match score
  let score: number | null = null;
  if (targetJobSkills.length > 0) {
    const skillRatio = matchedSkills.length / targetJobSkills.length;
    score = Math.min(100, Math.round(skillRatio * 75 + titleBonus));
  } else {
    score = titleBonus > 0 ? Math.round(titleBonus * 2.5) : 30;
  }

  const titleTerms = jobTitle.toLowerCase().split(/[^a-z0-9+#.]+/).filter((word) => word.length > 2);
  const titleMatches = [...new Set(titleTerms.filter((term) => normalizeText(evidenceText).includes(term)))];

  const requirementsSource = explicitSkills.length
    ? 'explicit_skills_and_job_description'
    : targetJobSkills.length
    ? 'extracted_tech_stack'
    : 'general_role_profile';

  return {
    score,
    matchedSkills,
    missingSkills,
    requirementsSource,
    titleMatches,
    evidenceSource: resumeText ? 'uploaded_resume_text_and_profile' : 'parsed_profile_only',
    explanation: `${matchedSkills.length} of ${Math.max(1, targetJobSkills.length)} relevant technical skills matched candidate profile (${score}% coverage).`,
  };
}
