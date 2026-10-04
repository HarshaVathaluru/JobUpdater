export interface JobSearchCriteria {
  keywords?: string[];
  locations?: string[];
  workMode?: 'REMOTE' | 'HYBRID' | 'ONSITE' | 'ANY';
  limit?: number;
}

export interface DiscoveredJobPayload {
  source: string;
  sourceJobId: string;
  company: string;
  title: string;
  location?: string;
  workMode?: 'REMOTE' | 'HYBRID' | 'ONSITE';
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  experienceMin?: number;
  experienceMax?: number;
  description: string;
  responsibilities?: string[];
  requiredSkills?: string[];
  preferredSkills?: string[];
  educationRequirements?: string[];
  otherRequirements?: string[];
  postedAt?: Date;
  applicationUrl?: string;
  applicationMethod?: string;
  rawData?: Record<string, any>;
}

export interface SourceCapabilities {
  canSearch: boolean;
  canGetDetails: boolean;
  canDirectApply: boolean;
  requiresAuth: boolean;
}

export interface JobSourceConnector {
  name: string;
  capabilities(): SourceCapabilities;
  searchJobs(criteria: JobSearchCriteria): Promise<DiscoveredJobPayload[]>;
  getJob(jobReference: string): Promise<DiscoveredJobPayload | null>;
  getApplicationEntry?(jobReference: string): Promise<string | null>;
}
