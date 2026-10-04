export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
  certifications: Certification[];
  achievements?: (string | { title?: string; name?: string; description?: string })[];
  createdAt: string;
  updatedAt: string;
}

export interface Experience {
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
  skills: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
}

export interface Certification {
  name: string;
  issuer: string;
  date?: string;
  expiryDate?: string;
  url?: string;
}

export interface Job {
  id: string;
  source?: string;
  company: string;
  title: string;
  location?: string;
  workMode?: 'REMOTE' | 'HYBRID' | 'ONSITE';
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  postedAt?: string;
  applicationUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface JobMatch {
  id: string;
  jobId: string;
  overallScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  recommendation: 'APPLY' | 'REVIEW' | 'SKIP';
}

export type ApplicationStatus = 
  | 'DISCOVERED' | 'ANALYZED' | 'MATCHED' | 'ELIGIBLE'
  | 'RESUME_PREPARED' | 'COVER_LETTER_PREPARED'
  | 'APPLICATION_STARTED' | 'FORM_FILLING' | 'REVIEW_REQUIRED'
  | 'SUBMITTING' | 'SUBMITTED' | 'VERIFIED'
  | 'SKIPPED' | 'DUPLICATE' | 'FAILED'
  | 'AUTH_REQUIRED' | 'UNKNOWN_QUESTION' | 'CAPTCHA_REQUIRED';

export interface Application {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  confirmationId?: string;
  submittedAt?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}
