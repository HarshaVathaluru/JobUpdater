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

  // Modals state
  const [selectedJobForModal, setSelectedJobForModal] = useState<Job | null>(null);
  const [generatedCoverLetters, setGeneratedCoverLetters] = useState<Record<string, string>>({});
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
        resultText = `Score: ${apiResult.data.overallScore}% • Recommendation: ${apiResult.data.recommendation} • Matched ${apiResult.data.matchedSkills?.length || 0} required skills`;
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
      await executeWithRealisticProgress({
        title: 'Multi-Source Job Discovery',
        subtitle: 'Ingesting live vacancies from LinkedIn, Remotive, Jobicy, Arbeitnow, and Naukri',
        icon: '🔍',
        steps: [
          'Connecting to LinkedIn, Remotive, Jobicy & Arbeitnow live APIs...',
          'Filtering vacancies by candidate preferences and target tech roles...',
          'Parsing tech stack requirements and deduplicating cross-platform jobs...',
          'Saving candidate-eligible vacancies to database...',
        ],
        apiAction: async () => {
          return await api.post('/discovery/trigger');
        },
      });
      fetchJobs();
      success('Multi-source discovery synchronized live job boards successfully.', 'Discovery Complete');
    } catch {
      // Handled in utility
    } finally {
      setDiscovering(false);
    }
  };

  const handleAtsMatch = async (job: Job) => {
    setActiveJobId(job.id);
    try {
      await executeWithRealisticProgress({
        title: 'ATS Semantic Match Calculation',
        subtitle: `Analyzing fit for ${job.title} at ${job.company}`,
        icon: '📊',
        steps: [
          'Extracting candidate skills and experience embeddings...',
          'Cross-referencing job requirements and qualifications...',
          'Running deterministic ATS weighting & keyword gap scoring...',
          'Finalizing match score and application recommendation...',
        ],
        apiAction: async () => {
          return await api.post<{ data: any }>(`/matching/${job.id}/calculate`);
        },
      });
      success(`ATS Match verified for ${job.title}!`, 'Match Ready');
    } catch {
      // Handled
    } finally {
      setActiveJobId(null);
    }
  };

  const handleTailorResume = async (job: Job) => {
    setActiveJobId(job.id);
    try {
      await executeWithRealisticProgress({
        title: 'AI Resume Tailoring Engine',
        subtitle: `Optimizing candidate achievements for ${job.company}`,
        icon: '✨',
        steps: [
          'Analyzing job role responsibilities and required keywords...',
          'Mapping candidate factual experience to employer needs...',
          'Restructuring summary and highlighting project achievements...',
          'Persisting tailored resume version in database...',
        ],
        apiAction: async () => {
          return await api.post<{ message: string }>(`/resume-tailoring/${job.id}`);
        },
      });
      success('Tailored resume version generated and stored in your profile.', 'Tailored Successfully');
    } catch {
      // Handled
    } finally {
      setActiveJobId(null);
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
          'Retrieving candidate verified education and background...',
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
          'Configuring Autonomous Browser Agent filling instructions...',
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
    if (s.includes('linkedin')) {
      return { label: 'LinkedIn', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '🔗' };
    }
    if (s.includes('remotive')) {
      return { label: 'Remotive', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: '🌐' };
    }
    if (s.includes('jobicy')) {
      return { label: 'Jobicy', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: '⚡' };
    }
    if (s.includes('arbeitnow')) {
      return { label: 'Arbeitnow', color: 'bg-teal-50 text-teal-700 border-teal-200', icon: '💼' };
    }
    if (s.includes('naukri')) {
      return { label: 'Naukri', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: '🇮🇳' };
    }
    return { label: source || 'Verified Partner', color: 'bg-slate-50 text-slate-700 border-slate-200', icon: '📌' };
  };

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
            Multi-platform vacancies from LinkedIn, Remotive, Jobicy, Arbeitnow, and Naukri with deterministic ATS matching.
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

      {/* Multi-Platform Status Indicator */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/60 to-purple-50/50 p-4 rounded-2xl border border-blue-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <span>🌐</span> Connected Job Platforms:
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold border border-blue-200 flex items-center gap-1">
            <span>🔗</span> LinkedIn
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 font-bold border border-indigo-200 flex items-center gap-1">
            <span>🌐</span> Remotive
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 font-bold border border-purple-200 flex items-center gap-1">
            <span>⚡</span> Jobicy
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-teal-100 text-teal-800 font-bold border border-teal-200 flex items-center gap-1">
            <span>💼</span> Arbeitnow
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold border border-amber-200 flex items-center gap-1">
            <span>🇮🇳</span> Naukri
          </span>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loading size="lg" />
          <p className="text-xs text-slate-400 font-medium">Loading discovered jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 px-6 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl mb-3">
            💼
          </div>
          <h3 className="text-base font-bold text-slate-900">No jobs discovered yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            Click "Trigger Discovery" above to ingest verified jobs matching your preferences.
          </p>
          <Button onClick={triggerDiscovery} isLoading={discovering} className="bg-blue-600 text-white rounded-xl">
            Trigger Discovery Now
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => {
            const rawSkills: any = job.requiredSkills;
            const skillsList: string[] = Array.isArray(rawSkills)
              ? rawSkills
              : typeof rawSkills === 'string' && (rawSkills as string).trim()
              ? (rawSkills as string).split(/[,;]+/).map((s: string) => s.trim()).filter(Boolean)
              : [];

            const isProcessingThis = activeJobId === job.id;
            const badge = getSourceBadge(job.source);
            const hasCoverLetter = Boolean(generatedCoverLetters[job.id]);

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
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {job.location && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        📍 {job.location}
                      </span>
                    )}
                    {job.workMode && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-100">
                        {job.workMode}
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
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAtsMatch(job)}
                      disabled={isProcessingThis}
                      className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-sm transition-all hover:border-slate-300"
                    >
                      ATS Match
                    </button>
                    <button
                      onClick={() => handleTailorResume(job)}
                      disabled={isProcessingThis}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      Tailor Resume
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
    </div>
  );
}
