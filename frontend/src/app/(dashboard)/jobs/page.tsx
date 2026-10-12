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
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Filters & sorting state
  const [workModeFilter, setWorkModeFilter] = useState<'ALL' | 'ONSITE' | 'HYBRID' | 'REMOTE'>('ALL');
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

  const getSourceBadge = (source?: string) => {
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
    if (s.includes('linkedin')) return { label: 'LinkedIn (added by you)', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'in' };
    if (s.includes('shine')) return { label: 'Shine (added by you)', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: '*' };
    return { label: source || 'Unknown source', color: 'bg-slate-50 text-slate-700 border-slate-200', icon: '??' };
  };

  const externalKeywords = searchQuery.trim() || externalSearch.roles.join(' ');
  const externalLocation = externalSearch.locations.join(', ');
  const linkedinSearchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(externalKeywords)}&location=${encodeURIComponent(externalLocation)}`;
  const shineSearchSlug = `${externalKeywords} ${externalLocation}`.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'jobs';
  const shineSearchUrl = `https://www.shine.com/job-search/${shineSearchSlug}-jobs`;

  const onsiteCount = jobs.filter((j) => (j.workMode || '').toUpperCase() === 'ONSITE').length;
  const hybridCount = jobs.filter((j) => (j.workMode || '').toUpperCase() === 'HYBRID').length;
  const remoteCount = jobs.filter((j) => (j.workMode || '').toUpperCase() === 'REMOTE').length;

  const filteredJobs = jobs.filter((job) => {
    const matchesMode =
      workModeFilter === 'ALL' ||
      (job.workMode || '').toUpperCase() === workModeFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      job.title.toLowerCase().includes(q) ||
      job.company.toLowerCase().includes(q) ||
      (job.location || '').toLowerCase().includes(q);
    const hasResumeEvidence = typeof job.resumeMatch?.score === 'number' && job.resumeMatch.score > 0;
    const matchesPreferences = !job.preferenceMatch || (job.preferenceMatch.role && job.preferenceMatch.location && job.preferenceMatch.workMode);
    return matchesMode && matchesSearch && matchesPreferences && (!resumeMatchesOnly || hasResumeEvidence);
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Discovered Jobs</h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Listings from supported public feeds, ranked by keyword coverage against your uploaded resume. Availability depends on each feed.
          </p>
        </div>
        <Button
          onClick={triggerDiscovery}
          isLoading={discovering}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all text-xs font-semibold px-5 py-2.5"
        >
          <span>⚡</span> Trigger Discovery
        </Button>
      </div>

      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700">
        <strong>Supported public feeds:</strong> Remotive, Jobicy, and Arbeitnow. Discovery is queued when triggered; feed reachability and listing availability can vary.
      </div>

      <section className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h2 className="text-sm font-bold text-slate-800">LinkedIn and Shine listings</h2><p className="text-xs text-slate-500 mt-1">Search on the source site, then add a real listing here to score it. Platform rules prevent scraping listings or auto-applying there.</p></div>
        <div className="flex gap-2">
          <a href={linkedinSearchUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg bg-blue-700 text-white text-xs font-bold">Search LinkedIn ?</a>
          <a href={shineSearchUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg bg-orange-600 text-white text-xs font-bold">Search Shine ?</a>
          <button onClick={() => setShowExternalImport((shown) => !shown)} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold">Add listing</button>
        </div>
      </section>

      {showExternalImport && <form onSubmit={saveExternalJob} className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm space-y-3">
        <div><h3 className="font-bold text-slate-900">Add a genuine listing</h3><p className="text-xs text-slate-500 mt-1">Copy the listing details from LinkedIn or Shine. Only the details you provide are saved, then the description is scored against your resume. If the listing links directly to the employer's application portal, add that URL too.</p></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <select required value={externalJobDraft.source} onChange={(event) => setExternalJobDraft({ ...externalJobDraft, source: event.target.value })} className="px-3 py-2 border rounded-lg text-sm"><option value="linkedin">LinkedIn</option><option value="shine">Shine</option></select>
          <input required minLength={2} placeholder="Job title" value={externalJobDraft.title} onChange={(event) => setExternalJobDraft({ ...externalJobDraft, title: event.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
          <input required minLength={2} placeholder="Company" value={externalJobDraft.company} onChange={(event) => setExternalJobDraft({ ...externalJobDraft, company: event.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
          <input placeholder="Location" value={externalJobDraft.location} onChange={(event) => setExternalJobDraft({ ...externalJobDraft, location: event.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
          <input required type="url" placeholder="Full LinkedIn or Shine listing URL" value={externalJobDraft.applicationUrl} onChange={(event) => setExternalJobDraft({ ...externalJobDraft, applicationUrl: event.target.value })} className="px-3 py-2 border rounded-lg text-sm lg:col-span-2" />
          <input type="url" placeholder="Employer application URL (optional)" value={externalJobDraft.employerApplicationUrl} onChange={(event) => setExternalJobDraft({ ...externalJobDraft, employerApplicationUrl: event.target.value })} className="px-3 py-2 border rounded-lg text-sm lg:col-span-3" />
        </div>
        <textarea required minLength={40} rows={5} placeholder="Paste the actual job description" value={externalJobDraft.description} onChange={(event) => setExternalJobDraft({ ...externalJobDraft, description: event.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowExternalImport(false)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button><button disabled={savingExternalJob} className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-bold disabled:opacity-50">{savingExternalJob ? 'Saving...' : 'Save and score'}</button></div>
      </form>}

      {/* Work Mode & Search Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Work Mode Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setWorkModeFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              workModeFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({jobs.length})
          </button>
          <button
            onClick={() => setWorkModeFilter('ONSITE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              workModeFilter === 'ONSITE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            🏢 On-Site ({onsiteCount})
          </button>
          <button
            onClick={() => setWorkModeFilter('HYBRID')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              workModeFilter === 'HYBRID'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-amber-700'
            }`}
          >
            🏢/💻 Hybrid ({hybridCount})
          </button>
          <button
            onClick={() => setWorkModeFilter('REMOTE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              workModeFilter === 'REMOTE'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-indigo-700'
            }`}
          >
            💻 Remote ({remoteCount})
          </button>
        </div>

        {/* Resume filter, search and sort */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" checked={resumeMatchesOnly} onChange={(e) => setResumeMatchesOnly(e.target.checked)} />
            Resume matches only
          </label>
          <div className="relative min-w-[200px] flex-1">
            <input
              type="text"
              placeholder="Search by role, company, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="MATCH">🎯 Sort: Best Match</option>
            <option value="NEWEST">⚡ Sort: Newest First</option>
            <option value="ONSITE">🏢 Sort: Onsite India</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loading size="lg" />
          <p className="text-xs text-slate-400 font-medium">Loading discovered jobs...</p>
        </div>
      ) : sortedJobs.length === 0 ? (
        <div className="text-center py-20 px-6 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl mb-3">
            💼
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {jobs.length === 0 ? 'No jobs discovered yet' : 'No jobs matching current filter'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            {jobs.length === 0
              ? 'Click "Trigger Discovery" to query available public feeds using your profile and saved preferences.'
              : 'Try clearing the search query or switching the work mode filter.'}
          </p>
          {jobs.length === 0 ? (
            <Button onClick={triggerDiscovery} isLoading={discovering} className="bg-blue-600 text-white rounded-xl">
              Trigger Discovery Now
            </Button>
          ) : (
            <button
              onClick={() => {
                setWorkModeFilter('ALL');
                setSearchQuery('');
                setResumeMatchesOnly(false);
              }}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Reset Filters
            </button>
          )}
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
            const badge = getSourceBadge(job.source);
            const hasCoverLetter = Boolean(generatedCoverLetters[job.id]);
            const matchPct = job.resumeMatch?.score;

            return (
              <div
                key={job.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
              >
                {/* Job Card Top */}
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.color}`}>
                        <span>{badge.icon}</span> {badge.label}
                      </span>
                      {job.applicationUrl && (
                        <a
                          href={job.applicationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-shrink-0 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors flex items-center gap-1"
                          title="Open official post in new tab"
                        >
                          <span>🔗</span> View Post ↗
                        </a>
                      )}
                    </div>

                    <div>
                      <h3
                        onClick={() => setSelectedJobForModal(job)}
                        className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 cursor-pointer hover:underline"
                        title="Click to view full description"
                      >
                        {job.title}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">{job.company}</p>
                    </div>

                    {/* AI Fit Reason Badge (Audit Section 6) */}
                    <div className="inline-flex flex-col gap-0.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[10px] font-extrabold border border-emerald-200">
                      <span>{matchPct === null || matchPct === undefined ? 'No parsed required skills to score' : `${matchPct}% resume keyword coverage`}</span>
                      {(job.resumeMatch?.matchedSkills?.length ?? 0) > 0 && <span className="font-medium">Matched: {job.resumeMatch?.matchedSkills?.join(', ')}</span>}
                      {(job.resumeMatch?.missingSkills?.length ?? 0) > 0 && <span className="font-medium">Missing: {job.resumeMatch?.missingSkills?.join(', ')}</span>}
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
