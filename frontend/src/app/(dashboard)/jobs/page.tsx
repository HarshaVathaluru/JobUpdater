"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { api } from '@/lib/api-client';
import { Job } from '@/types';
import { useToast } from '@/components/ui/toast';
import { RealisticProcessModal } from '@/components/ui/realistic-process-modal';
import { JobDetailModal } from '@/components/jobs/job-detail-modal';
import { CoverLetterModal } from '@/components/jobs/cover-letter-modal';
import { TailoredResumeModal, TailoredResumeData } from '@/components/jobs/tailored-resume-modal';

interface ProcessState {
  isOpen: boolean;
  title: string;
  subtitle: string;
  icon: string;
  steps: string[];
  currentStepIndex: number;
  progressPercent: number;
  resultData?: string;
  onDone?: () => void;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [autoApplying, setAutoApplying] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Filters & sorting state
  const [workModeFilter, setWorkModeFilter] = useState<'ALL' | 'ONSITE' | 'HYBRID' | 'REMOTE'>('ALL');
  const [experienceFilter, setExperienceFilter] = useState<'ALL' | 'ENTRY' | 'MID' | 'SENIOR'>('ALL');
  const [hideLinkedIn, setHideLinkedIn] = useState(false);
  const [hideShine, setHideShine] = useState(false);
  const [freshOnly, setFreshOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'MATCH' | 'NEWEST' | 'ONSITE'>('MATCH');
  const [resumeMatchesOnly, setResumeMatchesOnly] = useState(true);
  const [externalSearch, setExternalSearch] = useState({ roles: [] as string[], locations: [] as string[] });
  const [showExternalImport, setShowExternalImport] = useState(false);
  const [savingExternalJob, setSavingExternalJob] = useState(false);
  const [externalJobDraft, setExternalJobDraft] = useState({ source: 'linkedin', title: '', company: '', location: '', applicationUrl: '', employerApplicationUrl: '', description: '' });

  // Modals state
  const [selectedJobForModal, setSelectedJobForModal] = useState<Job | null>(null);
  const [generatedCoverLetters, setGeneratedCoverLetters] = useState<Record<string, string>>({});
  const [tailoredResumesMap, setTailoredResumesMap] = useState<Record<string, TailoredResumeData>>({});
  const [tailoredModalData, setTailoredModalData] = useState<TailoredResumeData | null>(null);
  const [isTailoredModalOpen, setIsTailoredModalOpen] = useState(false);
  const [coverLetterModal, setCoverLetterModal] = useState<{
    isOpen: boolean;
    jobTitle: string;
    company: string;
    content: string;
  }>({
    isOpen: false,
    jobTitle: '',
    company: '',
    content: '',
  });

  const [modalState, setModalState] = useState<ProcessState>({
    isOpen: false,
    title: '',
    subtitle: '',
    icon: '⚡',
    steps: [],
    currentStepIndex: 0,
    progressPercent: 0,
  });

  const { success, error: toastError, info } = useToast();

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data: any = await api.get('/jobs');
      const list = Array.isArray(data) ? data : data?.data || [];
      setJobs(list);
    } catch (error) {
      console.error('Failed to fetch jobs', error);
      toastError('Failed to fetch jobs list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    api.get('/candidate/preferences').then((preferences: any) => setExternalSearch({
      roles: Array.isArray(preferences?.targetRoles) ? preferences.targetRoles : [],
      locations: Array.isArray(preferences?.preferredLocations) ? preferences.preferredLocations : [],
    })).catch(() => undefined);
  }, []);

  // Utility to run smooth realistic animation before or during async work
  const executeWithRealisticProgress = async ({
    title,
    subtitle,
    icon,
    steps,
    apiAction,
  }: {
    title: string;
    subtitle: string;
    icon: string;
    steps: string[];
    apiAction: () => Promise<any>;
  }) => {
    setModalState({
      isOpen: true,
      title,
      subtitle,
      icon,
      steps,
      currentStepIndex: 0,
      progressPercent: 12,
      resultData: undefined,
    });

    try {
      // Step 1
      await new Promise((r) => setTimeout(r, 650));
      setModalState((prev) => ({ ...prev, currentStepIndex: 1, progressPercent: 38 }));

      // Step 2 & trigger API call
      const [apiResult] = await Promise.all([
        apiAction(),
        new Promise((r) => setTimeout(r, 1100)),
      ]);

      // Step 3
      setModalState((prev) => ({ ...prev, currentStepIndex: 2, progressPercent: 75 }));
      await new Promise((r) => setTimeout(r, 700));

      // Step 4: Finish
      let resultText = '';
      if (apiResult?.data?.overallScore !== undefined) {
        resultText = `Resume keyword coverage: ${apiResult.data.overallScore}% • Matched ${apiResult.data.matchedSkills?.length || 0} listed skills`;
      } else if (apiResult?.message) {
        resultText = apiResult.message;
      } else {
        resultText = 'Pipeline finished successfully!';
      }

      setModalState((prev) => ({
        ...prev,
        currentStepIndex: steps.length - 1,
        progressPercent: 100,
        resultData: resultText,
      }));

      return apiResult;
    } catch (err: any) {
      setModalState((prev) => ({ ...prev, isOpen: false }));
      const msg = err?.response?.data?.message || err?.message || 'Action could not be completed.';
      toastError(msg, 'Execution Interrupted');
      throw err;
    }
  };

  const triggerDiscovery = async () => {
    setDiscovering(true);
    try {
      const queuedResponse: any = await executeWithRealisticProgress({
        title: 'Multi-Source Job Discovery',
        subtitle: 'Querying supported public job feeds using your saved profile and preferences',
        icon: '🔍',
        steps: [
          'Querying Remotive, Jobicy, and Arbeitnow public feeds...',
          'Using available profile skills and saved preferences to find relevant roles...',
          'Parsing tech stack requirements and deduplicating cross-platform jobs...',
          'Saving candidate-eligible vacancies to database...',
        ],
        apiAction: async () => {
          return await api.post('/discovery/trigger');
        },
      });
      const queued = queuedResponse?.data || queuedResponse;
      if (!queued?.jobId) throw new Error('The discovery task was not queued successfully.');
      info('Searching the connected job feeds. This may take a few minutes.', 'Discovery Running');
      for (let attempt = 0; attempt < 180; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        let statusResponse: any;
        try {
          statusResponse = await api.get(`/discovery/${encodeURIComponent(queued.jobId)}`);
        } catch (error: any) {
          toastError(error?.response?.data?.message || error?.message || 'Could not check discovery progress.');
          return;
        }
        const status = statusResponse?.data || statusResponse;
        if (status.state === 'completed') {
          await fetchJobs();
          if (!Object.keys(status.result?.sourceResults || {}).length && status.result?.sourceErrors?.length) {
            toastError(`All job feeds failed. ${status.result.sourceErrors[0].message}`, 'Discovery Failed');
            return;
          }
          success(`Discovery finished. ${status.result?.ingested ?? 0} new jobs were added.`, 'Discovery Complete');
          return;
        }
        if (status.state === 'failed') {
          toastError(status.failedReason || 'The discovery task failed.');
          return;
        }
      }
      await fetchJobs();
      info('Discovery is still running. Refresh the job list in a moment.', 'Discovery Taking Longer');
    } catch {
      // Handled in utility
    } finally {
      setDiscovering(false);
    }
  };

  const saveExternalJob = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingExternalJob(true);
    try {
      await api.post('/jobs/external', externalJobDraft);
      await fetchJobs();
      setShowExternalImport(false);
      setExternalJobDraft({ source: 'linkedin', title: '', company: '', location: '', applicationUrl: '', employerApplicationUrl: '', description: '' });
      success('Listing saved and scored against your resume.', 'Job Added');
    } catch (error: any) {
      toastError(error?.response?.data?.message || error?.message || 'Could not save this listing.');
    } finally {
      setSavingExternalJob(false);
    }
  };

  const handleAtsMatch = async (job: Job) => {
    setActiveJobId(job.id);
    try {
      await executeWithRealisticProgress({
        title: 'Resume Keyword Coverage',
        subtitle: `Analyzing fit for ${job.title} at ${job.company}`,
        icon: '📊',
        steps: [
          'Reading resume and saved profile skills...',
          'Cross-referencing job requirements and qualifications...',
          'Checking listed job skills against the uploaded resume text...',
          'Finalizing match score and application recommendation...',
        ],
        apiAction: async () => {
          return await api.post<{ data: any }>(`/matching/${job.id}/calculate`);
        },
      });
      success(`Resume keyword coverage calculated for ${job.title}.`, 'Match Ready');
    } catch {
      // Handled
    } finally {
      setActiveJobId(null);
    }
  };

  const handleTailorResume = async (job: Job) => {
    setActiveJobId(job.id);
    try {
      const res = await executeWithRealisticProgress({
        title: 'Create Resume Copy',
        subtitle: `Optimizing candidate achievements for ${job.company}`,
        icon: '✨',
        steps: [
          'Analyzing job role responsibilities and required keywords...',
          'Mapping candidate factual experience to employer needs...',
          'Preserving the uploaded resume text without adding new claims...',
          'Saving a review copy with the current keyword coverage estimate...',
        ],
        apiAction: async () => {
          return await api.post<{ data?: any; message?: string }>(`/resume-tailoring/${job.id}`);
        },
      });

      const version = res?.data;
      if (version) {
        const resumeData: TailoredResumeData = {
          jobTitle: job.title,
          company: job.company,
          content: version.content || '',
          beforeScore: version.metadata?.score ?? 0,
          afterScore: version.metadata?.score ?? 0,
          improvement: 0,
          injectedKeywords: version.metadata?.injectedKeywords || [],
          tailoringHighlights: version.metadata?.tailoringHighlights || [],
        };
        setTailoredResumesMap((prev) => ({ ...prev, [job.id]: resumeData }));
        setTailoredModalData(resumeData);
        setIsTailoredModalOpen(true);
      }

      success('A review copy of your original resume was created without adding claims.', 'Resume Copy Ready');
    } catch {
      // Handled
    } finally {
      setActiveJobId(null);
    }
  };

  const handleViewTailoredResume = async (job: Job) => {
    if (tailoredResumesMap[job.id]) {
      setTailoredModalData(tailoredResumesMap[job.id]);
      setIsTailoredModalOpen(true);
      return;
    }

    try {
      const res: any = await api.get(`/resume-tailoring/job/${job.id}`);
      if (res?.data) {
        const version = res.data;
        const resumeData: TailoredResumeData = {
          jobTitle: job.title,
          company: job.company,
          content: version.content || '',
          beforeScore: version.metadata?.score ?? 0,
          afterScore: version.metadata?.score ?? 0,
          improvement: 0,
          injectedKeywords: version.metadata?.injectedKeywords || [],
          tailoringHighlights: version.metadata?.tailoringHighlights || [],
        };
        setTailoredResumesMap((prev) => ({ ...prev, [job.id]: resumeData }));
        setTailoredModalData(resumeData);
        setIsTailoredModalOpen(true);
      } else {
        info('No tailored resume generated yet. Click "Tailor Resume" to create one.', 'Not Found');
      }
    } catch {
      info('No tailored resume generated yet. Click "Tailor Resume" to create one.', 'Not Found');
    }
  };

  const handleCoverLetter = async (job: Job) => {
    setActiveJobId(job.id);
    try {
      const res = await executeWithRealisticProgress({
        title: 'Cover Letter Synthesis',
        subtitle: `Drafting tailored outreach letter for ${job.title}`,
        icon: '📝',
        steps: [
          'Reading candidate details saved in your profile...',
          'Aligning job specifics with relevant candidate projects...',
          'Drafting concise, professional application narrative...',
          'Linking cover letter to application record...',
        ],
        apiAction: async () => {
          return await api.post<{ data?: { content?: string }; message: string }>(`/cover-letter/${job.id}/generate`);
        },
      });

      const letterContent = res?.data?.content;
      if (letterContent) {
        setGeneratedCoverLetters((prev) => ({ ...prev, [job.id]: letterContent }));
        setCoverLetterModal({
          isOpen: true,
          jobTitle: job.title,
          company: job.company,
          content: letterContent,
        });
      }

      success('Tailored cover letter created and presented for review.', 'Cover Letter Ready');
    } catch {
      // Handled
    } finally {
      setActiveJobId(null);
    }
  };

  const handleViewCoverLetter = async (job: Job) => {
    if (generatedCoverLetters[job.id]) {
      setCoverLetterModal({
        isOpen: true,
        jobTitle: job.title,
        company: job.company,
        content: generatedCoverLetters[job.id],
      });
      return;
    }

    try {
      const res: any = await api.get(`/cover-letter/job/${job.id}`);
      if (res?.data?.content) {
        setGeneratedCoverLetters((prev) => ({ ...prev, [job.id]: res.data.content }));
        setCoverLetterModal({
          isOpen: true,
          jobTitle: job.title,
          company: job.company,
          content: res.data.content,
        });
      } else {
        info('No cover letter generated yet. Click "Generate Cover Letter" to draft one.', 'Not Found');
      }
    } catch {
      info('No cover letter generated yet. Click "Generate Cover Letter" to draft one.', 'Not Found');
    }
  };

  const handleStartApplication = async (job: Job) => {
    setActiveJobId(job.id);
    try {
      await executeWithRealisticProgress({
        title: 'Application Pipeline Setup',
        subtitle: `Preparing candidate dossier for ${job.company}`,
        icon: '🚀',
        steps: [
          'Initializing application lifecycle state in database...',
          'Attaching master resume and tailored documents...',
          'Preparing a reviewable application packet...',
          'Readying application in "Applications" tab...',
        ],
        apiAction: async () => {
          return await api.post<{ message: string }>(`/applications/${job.id}/start`);
        },
      });
      success('Application started! Check the Applications tab to inspect or submit.', 'Application Initialized');
    } catch {
      // Handled
    } finally {
      setActiveJobId(null);
    }
  };

  const handleAutoApplyTopMatches = async () => {
    setAutoApplying(true);
    try {
      const res: any = await executeWithRealisticProgress({
        title: 'Batch Auto-Apply Pipeline',
        subtitle: 'Submitting top resume-matched openings with persistent site sessions',
        icon: '🚀',
        steps: [
          'Filtering jobs with ATS keyword compatibility against your uploaded resume...',
          'Attaching master candidate profile, tailored copies, and credentials...',
          'Opening employer portals using persistent browser session (no re-registering needed)...',
          'Autofilling forms, verifying portal submission confirmation, and updating status...',
        ],
        apiAction: async () => {
          return await api.post<{ data: any; message: string }>('/applications/auto-apply', {
            minScore: 50,
            limit: 5,
          });
        },
      });

      const data = res?.data || res;
      await fetchJobs();
      success(
        res?.message || `Auto-applied to ${data?.appliedCount ?? 0} jobs! Check the Applications tab to track progress.`,
        'Auto-Apply Completed'
      );
    } catch {
      // Handled by modal
    } finally {
      setAutoApplying(false);
    }
  };

  const getSourceBadge = (source?: string, candidateOwnerId?: string | null) => {
    const s = (source || '').toLowerCase();
    if (s.includes('remotive')) {
      return { label: 'Remotive', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: '🌐' };
    }
    if (s.includes('jobicy')) {
      return { label: 'Jobicy', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: '⚡' };
    }
    if (s.includes('arbeitnow')) {
      return { label: 'Arbeitnow', color: 'bg-teal-50 text-teal-700 border-teal-200', icon: '💼' };
    }
    if (s.includes('linkedin')) {
      return {
        label: candidateOwnerId ? 'LinkedIn (added by you)' : 'LinkedIn Verified',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: 'in',
      };
    }
    if (s.includes('shine')) {
      return {
        label: candidateOwnerId ? 'Shine (added by you)' : 'Shine.com India',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: '★',
      };
    }
    if (s.includes('indeed')) {
      return {
        label: candidateOwnerId ? 'Indeed (added by you)' : 'Indeed India',
        color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        icon: '💼',
      };
    }
    return { label: source || 'Verified Opening', color: 'bg-slate-50 text-slate-700 border-slate-200', icon: '📋' };
  };

  const externalKeywords = searchQuery.trim() || externalSearch.roles.join(' ');
  const externalLocation = externalSearch.locations.join(', ');
  const linkedinSearchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(externalKeywords)}&location=${encodeURIComponent(externalLocation)}`;
  const shineSearchSlug = `${externalKeywords} ${externalLocation}`.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'jobs';
  const shineSearchUrl = `https://www.shine.com/job-search/${shineSearchSlug}-jobs`;

  const onsiteCount = jobs.filter((j) => (j.workMode || '').toUpperCase() === 'ONSITE').length;
  const hybridCount = jobs.filter((j) => (j.workMode || '').toUpperCase() === 'HYBRID').length;
  const remoteCount = jobs.filter((j) => (j.workMode || '').toUpperCase() === 'REMOTE').length;

  const entryCount = jobs.filter((j) => (j.experienceLevel || 'ENTRY') === 'ENTRY').length;
  const midCount = jobs.filter((j) => j.experienceLevel === 'MID').length;
  const seniorCount = jobs.filter((j) => j.experienceLevel === 'SENIOR').length;
  const freshCount = jobs.filter((j) => j.isFresh === true).length;
  const linkedinCount = jobs.filter((j) => (j.source || '').toLowerCase().includes('linkedin')).length;
  const shineCount = jobs.filter((j) => (j.source || '').toLowerCase().includes('shine')).length;

  const filteredJobs = jobs.filter((job) => {
    // Hide LinkedIn option
    if (hideLinkedIn && (job.source || '').toLowerCase().includes('linkedin')) return false;

    // Hide Shine option
    if (hideShine && (job.source || '').toLowerCase().includes('shine')) return false;

    // Fresh only option (live postings from last 1-2 days)
    if (freshOnly && !job.isFresh) return false;

    // Experience filter (Entry / Mid / Senior)
    const jobExpLevel = job.experienceLevel || 'ENTRY';
    if (experienceFilter !== 'ALL' && jobExpLevel !== experienceFilter) return false;

    const matchesMode =
      workModeFilter === 'ALL' ||
      (job.workMode || '').toUpperCase() === workModeFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      job.title.toLowerCase().includes(q) ||
      job.company.toLowerCase().includes(q) ||
      (job.location || '').toLowerCase().includes(q) ||
      (job.source || '').toLowerCase().includes(q);
    const hasResumeEvidence = typeof job.resumeMatch?.score === 'number' && job.resumeMatch.score >= 15;
    return matchesMode && matchesSearch && (!resumeMatchesOnly || hasResumeEvidence);
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === 'ONSITE') {
      const aOnsite = (a.workMode || '').toUpperCase() === 'ONSITE';
      const bOnsite = (b.workMode || '').toUpperCase() === 'ONSITE';
      if (aOnsite && !bOnsite) return -1;
      if (!aOnsite && bOnsite) return 1;
    }
    if (sortBy === 'NEWEST') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    // Match score is calculated by the API against this user's uploaded resume.
    return (b.resumeMatch?.score ?? -1) - (a.resumeMatch?.score ?? -1);
  });

  const isAnyFilterActive =
    workModeFilter !== 'ALL' ||
    experienceFilter !== 'ALL' ||
    hideLinkedIn ||
    hideShine ||
    freshOnly ||
    searchQuery.trim() !== '' ||
    !resumeMatchesOnly;

  const handleResetFilters = () => {
    setWorkModeFilter('ALL');
    setExperienceFilter('ALL');
    setHideLinkedIn(false);
    setHideShine(false);
    setFreshOnly(false);
    setSearchQuery('');
    setResumeMatchesOnly(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-7 rounded-3xl text-white shadow-xl shadow-slate-900/10 border border-slate-700/50">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            Multi-Source ATS Opportunity Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Discovered Vacancies</h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Real-time verified openings from LinkedIn, Shine.com, Indeed, Remotive, Jobicy, and Arbeitnow — scored dynamically against your resume keywords.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Button
            onClick={handleAutoApplyTopMatches}
            isLoading={autoApplying}
            className="flex-1 sm:flex-initial bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl shadow-lg shadow-emerald-900/30 text-xs font-bold px-5 py-3 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
          >
            <span>🚀</span> Auto-Apply to Top Matches
          </Button>
          <Button
            onClick={triggerDiscovery}
            isLoading={discovering}
            className="flex-1 sm:flex-initial bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-900/30 text-xs font-bold px-5 py-3 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
          >
            <span>⚡</span> Scan Live Feeds
          </Button>
        </div>
      </div>

      {/* Modern KPI Glance Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Catalog */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Active</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold shadow-xs">💼</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{jobs.length}</div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Across 6 verified portals</p>
          </div>
        </div>

        {/* Live in Last 48h */}
        <button
          onClick={() => setFreshOnly(!freshOnly)}
          className={`text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            freshOnly
              ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white border-amber-600 shadow-md shadow-amber-500/20 ring-2 ring-amber-400'
              : 'bg-white border-slate-200/90 hover:border-amber-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${freshOnly ? 'text-amber-100' : 'text-amber-800'}`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${freshOnly ? 'bg-white' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${freshOnly ? 'bg-white' : 'bg-amber-500'}`}></span>
              </span>
              Live (1-2 Days)
            </span>
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shadow-xs ${freshOnly ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-600'}`}>⚡</span>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${freshOnly ? 'text-white' : 'text-slate-900'}`}>{freshCount}</div>
            <p className={`text-xs font-semibold mt-0.5 ${freshOnly ? 'text-amber-100' : 'text-amber-700'}`}>
              {freshOnly ? '✓ Showing live 48h only' : 'Click to filter live only'}
            </p>
          </div>
        </button>

        {/* Early Career (0-2y) */}
        <button
          onClick={() => setExperienceFilter(experienceFilter === 'ENTRY' ? 'ALL' : 'ENTRY')}
          className={`text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            experienceFilter === 'ENTRY'
              ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400'
              : 'bg-white border-slate-200/90 hover:border-emerald-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${experienceFilter === 'ENTRY' ? 'text-emerald-100' : 'text-emerald-800'}`}>
              Early Career (0-2 yrs)
            </span>
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shadow-xs ${experienceFilter === 'ENTRY' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'}`}>🟢</span>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${experienceFilter === 'ENTRY' ? 'text-white' : 'text-slate-900'}`}>{entryCount}</div>
            <p className={`text-xs font-semibold mt-0.5 ${experienceFilter === 'ENTRY' ? 'text-emerald-100' : 'text-emerald-700'}`}>
              {experienceFilter === 'ENTRY' ? '✓ Showing 0-2 yrs only' : 'Fresher & Associate roles'}
            </p>
          </div>
        </button>

        {/* Onsite & Hybrid India */}
        <button
          onClick={() => setWorkModeFilter(workModeFilter === 'ONSITE' ? 'ALL' : 'ONSITE')}
          className={`text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            workModeFilter === 'ONSITE'
              ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-400'
              : 'bg-white border-slate-200/90 hover:border-indigo-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${workModeFilter === 'ONSITE' ? 'text-indigo-100' : 'text-indigo-800'}`}>
              On-Site India
            </span>
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shadow-xs ${workModeFilter === 'ONSITE' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}>🏢</span>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${workModeFilter === 'ONSITE' ? 'text-white' : 'text-slate-900'}`}>{onsiteCount}</div>
            <p className={`text-xs font-semibold mt-0.5 ${workModeFilter === 'ONSITE' ? 'text-indigo-100' : 'text-indigo-700'}`}>
              {workModeFilter === 'ONSITE' ? '✓ Filter active (Onsite)' : 'Domestic tech hubs'}
            </p>
          </div>
        </button>
      </div>

      {/* Manual Search & Direct Link Box */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Direct Portal Search & Scoring</h2>
          <p className="text-xs text-slate-500 mt-0.5">Explore additional listings on LinkedIn or Shine and import the URL to score against your resume.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={linkedinSearchUrl} target="_blank" rel="noreferrer" className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5">
            <span>in</span> Search LinkedIn ↗
          </a>
          <a href={shineSearchUrl} target="_blank" rel="noreferrer" className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5">
            <span>★</span> Search Shine ↗
          </a>
          <button onClick={() => setShowExternalImport((shown) => !shown)} className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-colors">
            + Add URL
          </button>
        </div>
      </div>

      {showExternalImport && (
        <form onSubmit={saveExternalJob} className="bg-white p-6 rounded-2xl border border-blue-200 shadow-md space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Score an External Opening</h3>
            <p className="text-xs text-slate-500 mt-1">Paste the listing details from LinkedIn or Shine. We will verify liveness and compute your genuine ATS score.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <select required value={externalJobDraft.source} onChange={(e) => setExternalJobDraft({ ...externalJobDraft, source: e.target.value })} className="px-3 py-2 border rounded-xl text-xs font-medium bg-slate-50">
              <option value="linkedin">LinkedIn</option>
              <option value="shine">Shine.com</option>
            </select>
            <input required minLength={2} placeholder="Job title (e.g. Software Engineer)" value={externalJobDraft.title} onChange={(e) => setExternalJobDraft({ ...externalJobDraft, title: e.target.value })} className="px-3 py-2 border rounded-xl text-xs font-medium bg-slate-50" />
            <input required minLength={2} placeholder="Company (e.g. Infosys)" value={externalJobDraft.company} onChange={(e) => setExternalJobDraft({ ...externalJobDraft, company: e.target.value })} className="px-3 py-2 border rounded-xl text-xs font-medium bg-slate-50" />
            <input placeholder="Location (e.g. Bengaluru)" value={externalJobDraft.location} onChange={(e) => setExternalJobDraft({ ...externalJobDraft, location: e.target.value })} className="px-3 py-2 border rounded-xl text-xs font-medium bg-slate-50" />
            <input required type="url" placeholder="Listing URL (https://www.linkedin.com/jobs/...)" value={externalJobDraft.applicationUrl} onChange={(e) => setExternalJobDraft({ ...externalJobDraft, applicationUrl: e.target.value })} className="px-3 py-2 border rounded-xl text-xs font-medium bg-slate-50 lg:col-span-2" />
            <input type="url" placeholder="Direct employer URL (optional)" value={externalJobDraft.employerApplicationUrl} onChange={(e) => setExternalJobDraft({ ...externalJobDraft, employerApplicationUrl: e.target.value })} className="px-3 py-2 border rounded-xl text-xs font-medium bg-slate-50 lg:col-span-3" />
          </div>
          <textarea required minLength={40} rows={4} placeholder="Paste the job description for ATS scoring..." value={externalJobDraft.description} onChange={(e) => setExternalJobDraft({ ...externalJobDraft, description: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-xs font-medium bg-slate-50" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowExternalImport(false)} className="px-4 py-2 rounded-xl border text-xs font-semibold">Cancel</button>
            <button disabled={savingExternalJob} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50 shadow-sm">
              {savingExternalJob ? 'Processing...' : 'Save & Score'}
            </button>
          </div>
        </form>
      )}

      {/* Modern Filter Command Hub */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden divide-y divide-slate-100">
        {/* Section 1: Search & Sorting */}
        <div className="p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/50 to-white">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by job title, company, skills, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs transition-all"
            />
            <span className="absolute left-3.5 top-3 text-slate-400 text-sm">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-2.5 text-xs text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full w-5 h-5 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold hidden sm:inline whitespace-nowrap">
              Showing <strong className="text-slate-900">{sortedJobs.length}</strong> of {jobs.length}
            </span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs cursor-pointer"
            >
              <option value="MATCH">🎯 Sort: Best Resume Match</option>
              <option value="NEWEST">⚡ Sort: Newest Postings First</option>
              <option value="ONSITE">🏢 Sort: On-Site India First</option>
            </select>
          </div>
        </div>

        {/* Section 2: Segmented Controls for Work Mode & Experience */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Work Mode Control */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider w-24 flex-shrink-0">
              Work Mode:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl flex-1">
              <button
                onClick={() => setWorkModeFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  workModeFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Modes ({jobs.length})
              </button>
              <button
                onClick={() => setWorkModeFilter('ONSITE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  workModeFilter === 'ONSITE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                <span>🏢</span> On-Site ({onsiteCount})
              </button>
              <button
                onClick={() => setWorkModeFilter('HYBRID')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  workModeFilter === 'HYBRID'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-amber-700'
                }`}
              >
                <span>🏢/💻</span> Hybrid ({hybridCount})
              </button>
              <button
                onClick={() => setWorkModeFilter('REMOTE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  workModeFilter === 'REMOTE'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-indigo-700'
                }`}
              >
                <span>💻</span> Remote ({remoteCount})
              </button>
            </div>
          </div>

          {/* Experience Level Control */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider w-24 flex-shrink-0">
              Experience:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl flex-1">
              <button
                onClick={() => setExperienceFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  experienceFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Levels ({jobs.length})
              </button>
              <button
                onClick={() => setExperienceFilter('ENTRY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  experienceFilter === 'ENTRY'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                <span>🟢</span> Entry (0-2 yrs) ({entryCount})
              </button>
              <button
                onClick={() => setExperienceFilter('MID')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  experienceFilter === 'MID'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-amber-700'
                }`}
              >
                <span>🟡</span> Mid (2-5 yrs) ({midCount})
              </button>
              <button
                onClick={() => setExperienceFilter('SENIOR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  experienceFilter === 'SENIOR'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                <span>🔴</span> Senior (5+ yrs) ({seniorCount})
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Feature Toggles & Platform Filters */}
        <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex flex-wrap items-center gap-2">
            {/* Live Only Toggle */}
            <button
              onClick={() => setFreshOnly(!freshOnly)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                freshOnly
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${freshOnly ? 'bg-white' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${freshOnly ? 'bg-white' : 'bg-amber-500'}`}></span>
              </span>
              <span>Live Only (1-2 Days)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${freshOnly ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {freshCount}
              </span>
            </button>

            {/* Hide LinkedIn Toggle */}
            <button
              onClick={() => setHideLinkedIn(!hideLinkedIn)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                hideLinkedIn
                  ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{hideLinkedIn ? '✓' : '🚫'}</span>
              <span>{hideLinkedIn ? 'LinkedIn Hidden' : 'Hide LinkedIn'}</span>
              <span className="text-[10px] opacity-70">({linkedinCount})</span>
            </button>

            {/* Hide Shine Toggle */}
            <button
              onClick={() => setHideShine(!hideShine)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                hideShine
                  ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{hideShine ? '✓' : '🚫'}</span>
              <span>{hideShine ? 'Shine Hidden' : 'Hide Shine'}</span>
              <span className="text-[10px] opacity-70">({shineCount})</span>
            </button>

            {/* Resume Match Checkbox */}
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={resumeMatchesOnly}
                onChange={(e) => setResumeMatchesOnly(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span>🎯 Resume Match Only</span>
            </label>
          </div>

          {/* Reset Filters Button */}
          {isAnyFilterActive && (
            <button
              onClick={handleResetFilters}
              className="px-3.5 py-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <span>✕</span> Reset All Filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loading size="lg" />
          <p className="text-xs text-slate-400 font-medium">Scoring and ordering vacancies...</p>
        </div>
      ) : sortedJobs.length === 0 ? (
        <div className="text-center py-16 px-6 bg-gradient-to-b from-white to-slate-50 rounded-3xl border border-dashed border-slate-300 shadow-sm max-w-2xl mx-auto space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center text-2xl shadow-xs">
            ⚡
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900">
              {jobs.length === 0 ? 'No Vacancies Discovered Yet' : 'No Openings Match Current Filter Combination'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              {jobs.length === 0
                ? 'Scan supported public job feeds to ingest and score vacancies matching your profile.'
                : `Currently ${jobs.length} total openings exist in your database, but none match all combined active filters (${
                    freshOnly ? 'Live 1-2 Days, ' : ''
                  }${experienceFilter !== 'ALL' ? `${experienceFilter} Exp, ` : ''}${
                    workModeFilter !== 'ALL' ? `${workModeFilter} Mode` : ''
                  }).`}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              onClick={handleResetFilters}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold px-5 py-2.5 shadow-md shadow-blue-600/20"
            >
              ⚡ Clear Filters & View All ({jobs.length}) Jobs
            </Button>
            <Button
              onClick={triggerDiscovery}
              isLoading={discovering}
              className="bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold px-5 py-2.5 shadow-sm"
            >
              🔄 Run Live Discovery Scan
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedJobs.map((job) => {
            const rawSkills: any = job.requiredSkills;
            const skillsList: string[] = Array.isArray(rawSkills)
              ? rawSkills
              : typeof rawSkills === 'string' && (rawSkills as string).trim()
              ? (rawSkills as string).split(/[,;]+/).map((s: string) => s.trim()).filter(Boolean)
              : [];

            const isProcessingThis = activeJobId === job.id;
            const badge = getSourceBadge(job.source, job.candidateOwnerId);
            const hasCoverLetter = Boolean(generatedCoverLetters[job.id]);
            const matchPct = job.resumeMatch?.score;

            return (
              <div
                key={job.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-blue-400/80 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
              >
                {/* Job Card Top */}
                <div className="p-6 space-y-4">
                  {/* Company Avatar & Title Header */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white font-black text-sm flex items-center justify-center shadow-xs flex-shrink-0 uppercase">
                          {job.company ? job.company.charAt(0) : 'J'}
                        </div>
                        <div className="min-w-0">
                          <h3
                            onClick={() => setSelectedJobForModal(job)}
                            className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 cursor-pointer hover:underline"
                            title="Click to view full description"
                          >
                            {job.title}
                          </h3>
                          <p className="text-xs font-semibold text-slate-500 truncate">{job.company}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold border ${badge.color}`}>
                          <span>{badge.icon}</span> {badge.label}
                        </span>
                        {job.applicationUrl && (
                          <a
                            href={job.applicationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-xl border border-blue-200 transition-colors flex items-center gap-1 shadow-2xs"
                            title="Open official post in new tab"
                          >
                            <span>🔗</span> ↗
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Modern ATS Keyword Coverage Meter */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-600 flex items-center gap-1">
                          <span>🎯</span> ATS Keyword Fit
                        </span>
                        <span className={
                          (matchPct ?? 0) >= 60
                            ? 'text-emerald-700 font-extrabold'
                            : (matchPct ?? 0) >= 30
                            ? 'text-blue-700 font-extrabold'
                            : 'text-slate-600 font-semibold'
                        }>
                          {matchPct === null || matchPct === undefined ? 'Requires skills' : `${matchPct}% Match`}
                        </span>
                      </div>
                      {typeof matchPct === 'number' && (
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              matchPct >= 60
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                : matchPct >= 30
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(6, matchPct))}%` }}
                          />
                        </div>
                      )}
                      {(job.resumeMatch?.matchedSkills?.length ?? 0) > 0 && (
                        <div className="text-[10px] text-slate-500 flex flex-wrap gap-1 items-center pt-0.5">
                          <span className="font-semibold text-emerald-800">Matched:</span>
                          {job.resumeMatch?.matchedSkills?.slice(0, 4).map((s: string) => (
                            <span key={s} className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {job.location && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        📍 {job.location}
                      </span>
                    )}
                    {job.workMode && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          job.workMode === 'ONSITE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : job.workMode === 'HYBRID'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        }`}
                      >
                        {job.workMode === 'ONSITE'
                          ? '🏢 On-Site'
                          : job.workMode === 'HYBRID'
                          ? '🏢/💻 Hybrid'
                          : '💻 Remote'}
                      </span>
                    )}
                    {/* Experience Level Badge */}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        (job.experienceLevel || 'ENTRY') === 'ENTRY'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : job.experienceLevel === 'MID'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {job.experienceLabel ||
                        ((job.experienceLevel || 'ENTRY') === 'ENTRY'
                          ? '🟢 0-2 yrs'
                          : job.experienceLevel === 'MID'
                          ? '🟡 2-5 yrs'
                          : '🔴 5+ yrs')}
                    </span>

                    {/* Fresh Posting (1-2 Days Live) Badge */}
                    {job.isFresh && (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs"
                        title={job.ageHours !== undefined ? `Posted ${job.ageHours} hours ago` : 'Posted in the last 1-2 days'}
                      >
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                        </span>
                        <span>⚡ Live (1-2d)</span>
                      </span>
                    )}
                  </div>

                  {/* Truncated description with View Full button */}
                  <div>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {job.description}
                    </p>
                    <button
                      onClick={() => setSelectedJobForModal(job)}
                      className="mt-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                    >
                      <span>📖</span> View Full Description
                    </button>
                  </div>

                  {/* Skills tags */}
                  {skillsList.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                      {skillsList.slice(0, 3).map((skill: string) => (
                        <span
                          key={skill}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200/70"
                        >
                          {skill}
                        </span>
                      ))}
                      {skillsList.length > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500">
                          +{skillsList.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Job Card Action Buttons */}
                <div className="p-4 bg-slate-50/70 border-t border-slate-100 space-y-2">
                  {tailoredResumesMap[job.id] && (
                    <button
                      onClick={() => handleViewTailoredResume(job)}
                      className="w-full py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span>📄</span> View Resume Copy
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAtsMatch(job)}
                      disabled={isProcessingThis}
                      className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-sm transition-all hover:border-slate-300"
                    >
                      Resume Match
                    </button>
                    <button
                      onClick={() => handleTailorResume(job)}
                      disabled={isProcessingThis}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      {tailoredResumesMap[job.id] ? 'Recreate Resume Copy' : 'Create Resume Copy'}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCoverLetter(job)}
                      disabled={isProcessingThis}
                      className="flex-1 py-2 px-3 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold transition-all hover:border-indigo-300"
                    >
                      {hasCoverLetter ? 'Regenerate Cover Letter' : 'Generate Cover Letter'}
                    </button>
                    {hasCoverLetter && (
                      <button
                        onClick={() => handleViewCoverLetter(job)}
                        className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
                        title="View already generated cover letter"
                      >
                        👁️ View
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleStartApplication(job)}
                    disabled={isProcessingThis}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>🚀</span> Start Application
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Realistic Multi-Step Interactive Progress Modal */}
      <RealisticProcessModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        subtitle={modalState.subtitle}
        icon={modalState.icon}
        steps={modalState.steps}
        currentStepIndex={modalState.currentStepIndex}
        progressPercent={modalState.progressPercent}
        resultData={modalState.resultData}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Full Job Description Modal */}
      <JobDetailModal
        job={selectedJobForModal}
        isOpen={Boolean(selectedJobForModal)}
        onClose={() => setSelectedJobForModal(null)}
        onAtsMatch={(j) => {
          setSelectedJobForModal(null);
          handleAtsMatch(j);
        }}
        onTailorResume={(j) => {
          setSelectedJobForModal(null);
          handleTailorResume(j);
        }}
        onGenerateCoverLetter={(j) => {
          setSelectedJobForModal(null);
          handleCoverLetter(j);
        }}
        onStartApplication={(j) => {
          setSelectedJobForModal(null);
          handleStartApplication(j);
        }}
        isProcessing={activeJobId === selectedJobForModal?.id}
      />

      {/* Full Dedicated Cover Letter Modal */}
      <CoverLetterModal
        isOpen={coverLetterModal.isOpen}
        onClose={() => setCoverLetterModal((prev) => ({ ...prev, isOpen: false }))}
        jobTitle={coverLetterModal.jobTitle}
        company={coverLetterModal.company}
        content={coverLetterModal.content}
      />

      {/* Full Dedicated Tailored Resume Modal */}
      <TailoredResumeModal
        isOpen={isTailoredModalOpen}
        onClose={() => setIsTailoredModalOpen(false)}
        data={tailoredModalData}
      />
    </div>
  );
}
