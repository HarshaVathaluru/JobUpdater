"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loading } from '@/components/ui/loading';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { RealisticProcessModal } from '@/components/ui/realistic-process-modal';
import { ApplicationPacketModal } from '@/components/applications/application-packet-modal';
import Link from 'next/link';

interface ProcessState {
  isOpen: boolean;
  title: string;
  subtitle: string;
  icon: string;
  steps: string[];
  currentStepIndex: number;
  progressPercent: number;
  targetUrl?: string;
  resultData?: string;
  resultStatus?: 'success' | 'review' | 'failure';
}

type ViewMode = 'GRID' | 'KANBAN' | 'LIST';
type StageFilter = 'ALL' | 'ACTION_REQUIRED' | 'IN_PIPELINE' | 'CONFIRMED';

export default function ApplicationsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('GRID');
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL');
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [selectedPacketApp, setSelectedPacketApp] = useState<any | null>(null);
  const [appEvents, setAppEvents] = useState<Record<string, any[]>>({});
  const [searchFilter, setSearchFilter] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const initialFetchStarted = useRef(false);
  const { success, error: toastError, info } = useToast();

  const [modalState, setModalState] = useState<ProcessState>({
    isOpen: false,
    title: '',
    subtitle: '',
    icon: '🤖',
    steps: [],
    currentStepIndex: 0,
    progressPercent: 0,
  });

  const fetchApps = async () => {
    setLoading(true);
    try {
      const data: any = await api.get('/applications');
      const list = Array.isArray(data) ? data : data?.data || [];
      setApps(list);
    } catch (error) {
      console.error('Failed to fetch applications', error);
      const requestError = error as any;
      toastError(
        requestError?.response?.data?.message || requestError?.message || 'Could not load applications. Check that the API server and database are available.',
        'Applications unavailable',
      );
    } finally {
      setLoading(false);
    }
  };

  const loadEventsForApp = async (appId: string) => {
    try {
      const res: any = await api.get(`/applications/${appId}/events`);
      const events = Array.isArray(res) ? res : res?.data || [];
      setAppEvents((prev) => ({ ...prev, [appId]: events }));
      return events;
    } catch {
      return [];
    }
  };

  const openPacket = async (app: any) => {
    let events = appEvents[app.id];
    if (!events) {
      events = await loadEventsForApp(app.id);
    }
    setSelectedPacketApp(app);
  };

  useEffect(() => {
    if (initialFetchStarted.current) return;
    initialFetchStarted.current = true;
    fetchApps();
  }, []);

  const launchBrowserSession = async (url?: string) => {
    try {
      info('Launching Chromium window on your desktop...', 'Browser Session');
      const res: any = await api.post('/browser/interactive-session', { targetUrl: url || 'https://www.linkedin.com/login' });
      success(res?.message || 'Chromium window opened! Log in once to save your session permanently.', 'Session Active');
    } catch (e: any) {
      toastError(e?.response?.data?.message || e?.message || 'Could not launch interactive session.', 'Session Error');
    }
  };

  const runAgent = async (id: string, appItem?: any) => {
    setActiveAppId(id);
    const targetUrl = appItem?.metadata?.resolvedEmployerUrl || appItem?.job?.applicationUrl || 'Employer Career Portal';

    setModalState({
      isOpen: true,
      title: 'Inspect Application Portal',
      subtitle: `Target: ${appItem?.job?.company || 'Company'} — ${targetUrl}`,
      icon: '🤖',
      targetUrl,
      steps: [
        'Opening employer vacancy portal and inspecting form fields...',
        'Checking interactive sign-in, session status, or CAPTCHA...',
        'Autofilling candidate profile fields, contact info & resume...',
        'Compiling inspection diagnostic result for review...',
      ],
      currentStepIndex: 0,
      progressPercent: 20,
    });

    try {
      setModalState((p) => ({ ...p, currentStepIndex: 1, progressPercent: 45 }));
      const res: any = await api.post(`/applications/${id}/agent`);
      setModalState((p) => ({ ...p, currentStepIndex: 2, progressPercent: 75 }));

      await loadEventsForApp(id);
      const isNeedsReview = res?.status === false || res?.requiresUserAction === true || res?.data?.requiresUserAction === true;
      const resolvedPortalUrl = res?.portalUrl || res?.data?.portalUrl || appItem?.metadata?.resolvedEmployerUrl || targetUrl;

      setModalState((p) => ({
        ...p,
        currentStepIndex: 3,
        progressPercent: 100,
        targetUrl: resolvedPortalUrl,
        resultStatus: isNeedsReview ? 'review' : 'success',
        resultData: res?.message || 'Portal inspection finished.',
      }));

      fetchApps();
      if (isNeedsReview) {
        info(res?.message || 'Review needed. Open the portal in your browser to finalize.', 'Review Required');
      } else {
        success(res?.message || 'Portal inspection finished.', 'Inspection Complete');
      }
    } catch (err: any) {
      setModalState((p) => ({ ...p, isOpen: false }));
      toastError(err?.response?.data?.message || err?.message || 'Agent run encountered an issue.', 'Agent Failed');
    } finally {
      setActiveAppId(null);
    }
  };

  const submitApplication = async (id: string, appItem?: any) => {
    setActiveAppId(id);
    setModalState({
      isOpen: true,
      title: 'Submit Application',
      subtitle: `Attempting submission on ${appItem?.job?.company || 'the employer'} portal`,
      icon: '📤',
      steps: [
        'Verifying candidate profile, resume attachment & eligibility...',
        'Accessing employer gateway and preparing submission payload...',
        'Submitting application to employer portal & awaiting receipt...',
        'Checking whether the employer portal confirms receipt...',
      ],
      currentStepIndex: 0,
      progressPercent: 25,
    });

    try {
      setModalState((p) => ({ ...p, currentStepIndex: 1, progressPercent: 50 }));
      const res: any = await api.post(`/applications/${id}/submit`);
      const data = res?.data || res;
      setModalState((p) => ({ ...p, currentStepIndex: 2, progressPercent: 80 }));

      await loadEventsForApp(id);
      setModalState((p) => ({
        ...p,
        currentStepIndex: 3,
        progressPercent: 100,
        resultData: data?.message || 'Submission attempt finished. Check the status before retrying.',
        resultStatus: data?.status === true ? 'success' : data?.requiresUserAction ? 'review' : 'failure',
      }));

      fetchApps();
      if (data?.status !== true) {
        info(data?.message || 'The portal did not confirm receipt. Review the job site before retrying.', 'Not Confirmed');
      } else {
        success(data?.message || 'The employer portal confirmed receipt.', 'Submission Confirmed');
      }
    } catch (e: any) {
      setModalState((p) => ({ ...p, isOpen: false }));
      toastError(e?.response?.data?.message || e?.message || 'Submission failed!', 'Submission Error');
    } finally {
      setActiveAppId(null);
    }
  };

  const markManualSubmission = async (app: any) => {
    if (!window.confirm('Confirm that you completed and submitted this application on the employer site.')) return;
    const confirmationId = window.prompt('Employer confirmation/reference number (optional):') || '';
    try {
      const response: any = await api.post(`/applications/${app.id}/mark-manual-submitted`, { confirmationId });
      const result = response?.data || response;
      if (result?.status === true) {
        success(result.message || 'Marked submitted based on your confirmation.', 'Candidate confirmed');
        await fetchApps();
      } else {
        toastError(response?.message || result?.message || 'Could not update the application status.');
      }
    } catch (error: any) {
      toastError(error?.response?.data?.message || error?.message || 'Could not update the application status.');
    }
  };

  const retryAfterPortalReview = async (app: any) => {
    const confirmed = window.confirm(
      'First open the employer portal and check your application history/email. Continue only if you verified that this application was NOT submitted. Retrying without checking could create a duplicate. Have you checked and confirmed it was not submitted?',
    );
    if (!confirmed) return;
    try {
      const response: any = await api.post(`/applications/${app.id}/authorize-retry`, { confirmedNotSubmitted: true });
      const result = response?.data || response;
      if (result?.status !== true) {
        toastError(response?.message || result?.message || 'Retry was not authorized.');
        return;
      }
      await submitApplication(app.id, app);
    } catch (error: any) {
      toastError(error?.response?.data?.message || error?.message || 'Could not authorize a retry.');
    }
  };

  const confirmRegisteredAndApply = async (app: any) => {
    setActiveAppId(app.id);
    setModalState({
      isOpen: true,
      title: 'Persistent Session: Auto-Apply',
      subtitle: `Persisting registration session for ${app.job?.company || 'Employer'}`,
      icon: '🔐',
      steps: [
        'Saving your registered credentials & cookies into persistent profile...',
        'Linking domain authorization to your candidate profile...',
        'Resuming automated portal submission with verified session...',
        'Confirming application receipt from employer portal...',
      ],
      currentStepIndex: 0,
      progressPercent: 25,
    });

    try {
      setModalState((p) => ({ ...p, currentStepIndex: 1, progressPercent: 50 }));
      const res: any = await api.post(`/applications/${app.id}/confirm-registered`);
      const data = res?.data || res;
      setModalState((p) => ({ ...p, currentStepIndex: 2, progressPercent: 80 }));

      await loadEventsForApp(app.id);
      setModalState((p) => ({
        ...p,
        currentStepIndex: 3,
        progressPercent: 100,
        resultData: data?.message || 'Session saved! Next applications to this site will apply completely automatically.',
        resultStatus: data?.status === true ? 'success' : 'review',
      }));

      fetchApps();
      if (data?.status === true) {
        success(data?.message || 'Session saved & application submitted!', 'Application Confirmed');
      } else {
        info(data?.message || 'Session saved. Review the portal if submission needs human check.', 'Session Saved');
      }
    } catch (e: any) {
      setModalState((p) => ({ ...p, isOpen: false }));
      toastError(e?.response?.data?.message || e?.message || 'Could not persist session & apply.', 'Application Error');
    } finally {
      setActiveAppId(null);
    }
  };

  // Metrics
  const actionRequiredCount = apps.filter((a) =>
    ['REVIEW_REQUIRED', 'AUTH_REQUIRED', 'UNKNOWN_QUESTION', 'CAPTCHA_REQUIRED', 'FORM_FILLING', 'FAILED'].includes(a.status)
  ).length;

  const inPipelineCount = apps.filter((a) =>
    ['APPLICATION_STARTED', 'RESUME_PREPARED', 'COVER_LETTER_PREPARED', 'SUBMITTING'].includes(a.status)
  ).length;

  const submittedCount = apps.filter((a) => a.status === 'SUBMITTED' || a.status === 'VERIFIED').length;

  // Filter & Search
  const filteredApps = apps.filter((a) => {
    const matchesSearch =
      (a.job?.title || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (a.job?.company || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (a.status || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (a.job?.source || '').toLowerCase().includes(searchFilter.toLowerCase());

    if (!matchesSearch) return false;

    if (stageFilter === 'ACTION_REQUIRED') {
      return ['REVIEW_REQUIRED', 'AUTH_REQUIRED', 'UNKNOWN_QUESTION', 'CAPTCHA_REQUIRED', 'FORM_FILLING', 'FAILED'].includes(a.status);
    }
    if (stageFilter === 'IN_PIPELINE') {
      return ['APPLICATION_STARTED', 'RESUME_PREPARED', 'COVER_LETTER_PREPARED', 'SUBMITTING'].includes(a.status);
    }
    if (stageFilter === 'CONFIRMED') {
      return a.status === 'SUBMITTED' || a.status === 'VERIFIED';
    }
    return true;
  });

  const kanbanColumns = [
    {
      id: 'PREPARING',
      title: 'Packet Ready',
      color: 'border-slate-300 bg-slate-50/60',
      badge: 'bg-slate-100 text-slate-800',
      items: filteredApps.filter((a) => ['APPLICATION_STARTED', 'RESUME_PREPARED', 'COVER_LETTER_PREPARED'].includes(a.status)),
    },
    {
      id: 'NEEDS_ACTION',
      title: 'Action / Review Needed',
      color: 'border-amber-300 bg-amber-50/50',
      badge: 'bg-amber-100 text-amber-800',
      items: filteredApps.filter((a) => ['FORM_FILLING', 'REVIEW_REQUIRED', 'AUTH_REQUIRED', 'UNKNOWN_QUESTION', 'CAPTCHA_REQUIRED', 'FAILED'].includes(a.status)),
    },
    {
      id: 'SUBMITTING',
      title: 'Submitting',
      color: 'border-blue-300 bg-blue-50/50',
      badge: 'bg-blue-100 text-blue-800',
      items: filteredApps.filter((a) => a.status === 'SUBMITTING'),
    },
    {
      id: 'SUBMITTED',
      title: 'Confirmed Receipt',
      color: 'border-emerald-300 bg-emerald-50/50',
      badge: 'bg-emerald-100 text-emerald-800',
      items: filteredApps.filter((a) => a.status === 'SUBMITTED' || a.status === 'VERIFIED'),
    },
    {
      id: 'INTERVIEW',
      title: 'Interview',
      color: 'border-purple-300 bg-purple-50/50',
      badge: 'bg-purple-100 text-purple-800',
      items: filteredApps.filter((a) => a.status === 'INTERVIEW'),
    },
  ];

  const getSourceBadgeColor = (source?: string) => {
    const s = (source || '').toLowerCase();
    if (s.includes('linkedin')) return 'bg-[#0077B5]/10 text-[#0077B5] border-[#0077B5]/20';
    if (s.includes('shine')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (s.includes('indeed')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s.includes('ashby')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Confirmed Receipt
          </span>
        );
      case 'REVIEW_REQUIRED':
      case 'AUTH_REQUIRED':
      case 'CAPTCHA_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Action Required
          </span>
        );
      case 'SUBMITTING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Submitting...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            {status.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  // Render Job Card Component (used in Grid and Kanban views)
  const renderJobCard = (app: any, compact = false) => {
    const isProcessing = activeAppId === app.id;
    const hasAccountAction =
      (app.metadata?.requiresFirstTimeRegistration ||
        app.failureReason?.includes('registration') ||
        app.failureReason?.includes('login') ||
        app.failureReason?.includes('sign-in') ||
        app.failureReason?.includes('account')) &&
      app.status === 'REVIEW_REQUIRED';

    const companyInitial = app.job?.company ? app.job.company.charAt(0).toUpperCase() : 'J';

    return (
      <div
        key={app.id}
        className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400/80 shadow-sm hover:shadow-lg transition-all duration-200 p-5 flex flex-col justify-between group relative"
      >
        {/* Top Header: Source, Date, and Options */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold uppercase border ${getSourceBadgeColor(app.job?.source)}`}>
                {app.job?.source || 'Portal'}
              </span>
              {app.metadata?.siteRegistered && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ⚡ Session Saved
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {new Date(app.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Company & Job Title */}
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-900 text-white font-extrabold text-base flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-700/20">
              {companyInitial}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                {app.job?.title || 'Engineering Role'}
              </h3>
              <p className="text-xs font-semibold text-slate-600 truncate mt-0.5">
                {app.job?.company || 'Company'}
              </p>
            </div>
          </div>

          {/* Job Details Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-600">
            {app.job?.location && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200">
                📍 {app.job.location}
              </span>
            )}
            {app.job?.workMode && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200">
                🏢 {app.job.workMode}
              </span>
            )}
            <div className="ml-auto">
              {getStatusBadge(app.status)}
            </div>
          </div>

          {/* Action Callout Banner if Account/Review Required */}
          {hasAccountAction && (
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/90 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <span className="text-sm">🔑</span> Candidate Sign-In / Account Saved
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-200/90 text-amber-900">
                  Action
                </span>
              </div>
              <p className="text-[11px] text-amber-900/90 leading-relaxed font-medium">
                Already have an account or completed portal login? Click below to save your persistent session and auto-apply.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => void confirmRegisteredAndApply(app)}
                  disabled={isProcessing}
                  className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>✓</span> Apply with Account
                </button>
                {app.job?.applicationUrl && (
                  <a
                    href={app.job.applicationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 text-center rounded-xl bg-white hover:bg-amber-100/60 text-amber-900 text-xs font-bold border border-amber-300 transition-colors flex items-center justify-center gap-1"
                  >
                    Open Portal ↗
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
          {/* Primary Operations Row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => runAgent(app.id, app)}
              disabled={isProcessing}
              className="py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors border border-indigo-200 flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <span>🤖</span> Run Agent
            </button>

            <button
              onClick={() =>
                app.metadata?.submissionAttempted === true && app.status === 'REVIEW_REQUIRED'
                  ? void retryAfterPortalReview(app)
                  : void submitApplication(app.id, app)
              }
              disabled={isProcessing}
              className="py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>📤</span> {app.metadata?.submissionAttempted === true && app.status === 'REVIEW_REQUIRED' ? 'Retry Submit' : 'Submit'}
            </button>
          </div>

          {/* Secondary Utilities Row */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => openPacket(app)}
              className="flex-1 py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors flex items-center justify-center gap-1"
            >
              <span>📦</span> View Packet
            </button>

            {app.job?.applicationUrl && (
              <a
                href={app.job.applicationUrl}
                target="_blank"
                rel="noreferrer"
                className="py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs border border-slate-200 transition-colors flex items-center gap-1"
                title="Open job listing on portal"
              >
                <span>🌐</span> Portal ↗
              </a>
            )}

            {app.status !== 'SUBMITTED' && app.status !== 'VERIFIED' && (
              <button
                onClick={() => void markManualSubmission(app)}
                className="py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-colors flex items-center gap-1"
                title="Mark this job as submitted manually"
              >
                <span>✓</span> Manual Done
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Premium Hero Banner */}
      <div className="relative overflow-hidden flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl shadow-slate-950/20 border border-slate-800">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Automated Submission & Verification Tracker
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
            Application Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
            Track tailored application packets, execute autonomous browser agents, manage persistent portal sessions, and verify employer receipt confirmations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto relative z-10">
          <button
            onClick={() => launchBrowserSession()}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-md shadow-sm transition-all flex items-center gap-2"
            title="Launch interactive Chromium to log in to LinkedIn or portals once"
          >
            <span>🔐</span> Sync Browser Session
          </button>

          {/* View Toggle */}
          <div className="p-1 bg-white/10 backdrop-blur-md rounded-2xl flex items-center gap-1 text-xs font-bold border border-white/15">
            <button
              onClick={() => setViewMode('GRID')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                viewMode === 'GRID'
                  ? 'bg-white text-slate-900 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>🎴</span> Cards
            </button>
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                viewMode === 'KANBAN'
                  ? 'bg-white text-slate-900 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>📊</span> Pipeline
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                viewMode === 'LIST'
                  ? 'bg-white text-slate-900 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>📋</span> Table
            </button>
          </div>

          <Link href="/jobs">
            <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/30 px-4 py-2.5 flex items-center gap-1.5">
              <span>+</span> New Application
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Glance Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total Packets */}
        <div
          onClick={() => setStageFilter('ALL')}
          className={`cursor-pointer bg-white p-4 sm:p-5 rounded-2xl border transition-all ${
            stageFilter === 'ALL'
              ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
              : 'border-slate-200/90 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Packets</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">📦</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{apps.length}</div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">All application records</p>
          </div>
        </div>

        {/* Needs Action / Review */}
        <div
          onClick={() => setStageFilter('ACTION_REQUIRED')}
          className={`cursor-pointer bg-white p-4 sm:p-5 rounded-2xl border transition-all ${
            stageFilter === 'ACTION_REQUIRED'
              ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
              : 'border-slate-200/90 hover:border-amber-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Action Required</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold">⚠️</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-800 tracking-tight">{actionRequiredCount}</div>
            <p className="text-xs text-amber-700 font-medium mt-0.5">Registration / login needed</p>
          </div>
        </div>

        {/* In Pipeline */}
        <div
          onClick={() => setStageFilter('IN_PIPELINE')}
          className={`cursor-pointer bg-white p-4 sm:p-5 rounded-2xl border transition-all ${
            stageFilter === 'IN_PIPELINE'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
              : 'border-slate-200/90 hover:border-indigo-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">In Pipeline</span>
            <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">🚀</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{inPipelineCount}</div>
            <p className="text-xs text-indigo-700 font-medium mt-0.5">Ready to submit or in flight</p>
          </div>
        </div>

        {/* Confirmed & Verified */}
        <div
          onClick={() => setStageFilter('CONFIRMED')}
          className={`cursor-pointer bg-white p-4 sm:p-5 rounded-2xl border transition-all ${
            stageFilter === 'CONFIRMED'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
              : 'border-slate-200/90 hover:border-emerald-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Confirmed</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">✓</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight">{submittedCount}</div>
            <p className="text-xs text-emerald-700 font-medium mt-0.5">Portal confirmed receipt</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Hub */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
        {/* Stage Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setStageFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                stageFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <span>All Applications</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${stageFilter === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {apps.length}
              </span>
            </button>

            <button
              onClick={() => setStageFilter('ACTION_REQUIRED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                stageFilter === 'ACTION_REQUIRED'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/60'
              }`}
            >
              <span>⚠️ Action Required</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${stageFilter === 'ACTION_REQUIRED' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'}`}>
                {actionRequiredCount}
              </span>
            </button>

            <button
              onClick={() => setStageFilter('IN_PIPELINE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                stageFilter === 'IN_PIPELINE'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60'
              }`}
            >
              <span>🚀 In Pipeline</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${stageFilter === 'IN_PIPELINE' ? 'bg-indigo-700 text-white' : 'bg-indigo-200 text-indigo-900'}`}>
                {inPipelineCount}
              </span>
            </button>

            <button
              onClick={() => setStageFilter('CONFIRMED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                stageFilter === 'CONFIRMED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60'
              }`}
            >
              <span>✓ Confirmed</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${stageFilter === 'CONFIRMED' ? 'bg-emerald-700 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
                {submittedCount}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>Showing <strong className="text-slate-900">{filteredApps.length}</strong> of {apps.length}</span>
            <button
              onClick={() => fetchApps()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
              title="Refresh applications list"
            >
              <span>🔄</span> Refresh
            </button>
          </div>
        </div>

        {/* Search Field */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by job title, company name, portal source, or status..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <span className="absolute left-3.5 top-3 text-slate-400 text-sm">🔍</span>
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="absolute right-3.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loading size="lg" />
          <p className="text-xs text-slate-400 font-medium">Loading applications tracker...</p>
        </div>
      ) : apps.length === 0 ? (
        <div className="text-center py-20 px-6 bg-gradient-to-b from-white to-slate-50 rounded-3xl border border-dashed border-slate-300 shadow-sm space-y-4 max-w-2xl mx-auto">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-3xl shadow-xs">
            📦
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900">No applications in the pipeline yet</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Explore Discovered Jobs, prepare a tailored resume for any vacancy, and start automated applications with one click!
            </p>
          </div>
          <Link href="/jobs">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs px-5 py-2.5 shadow-md shadow-blue-600/20">
              Browse Discovered Jobs ➔
            </Button>
          </Link>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="text-3xl">🔍</div>
          <h3 className="text-base font-bold text-slate-800">No applications match your filter</h3>
          <p className="text-xs text-slate-500">Try changing your search terms or selecting another stage tab.</p>
          <button
            onClick={() => {
              setSearchFilter('');
              setStageFilter('ALL');
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'GRID' ? (
        /* SPACIOUS CARD GRID (Primary Default) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredApps.map((app) => renderJobCard(app))}
        </div>
      ) : viewMode === 'KANBAN' ? (
        /* HORIZONTALLY SCROLLABLE KANBAN PIPELINE (Columns never squished) */
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-5 min-w-[1280px]">
            {kanbanColumns.map((col) => (
              <div key={col.id} className="w-[330px] flex-shrink-0 space-y-3">
                {/* Column Header */}
                <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{col.title}</span>
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${col.badge}`}>
                    {col.items.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-3 min-h-[450px]">
                  {col.items.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400 bg-white/40">
                      No applications in this stage
                    </div>
                  ) : (
                    col.items.map((app) => renderJobCard(app, true))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* TABLE / LIST VIEW */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/90 border-b border-slate-200 grid grid-cols-12 gap-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <div className="col-span-5">Role & Company</div>
            <div className="col-span-2">Stage Status</div>
            <div className="col-span-2">Source / Mode</div>
            <div className="col-span-1">Date</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredApps.map((app) => {
              const hasAccountAction =
                (app.metadata?.requiresFirstTimeRegistration ||
                  app.failureReason?.includes('registration') ||
                  app.failureReason?.includes('login') ||
                  app.failureReason?.includes('sign-in') ||
                  app.failureReason?.includes('account')) &&
                app.status === 'REVIEW_REQUIRED';

              return (
                <div key={app.id} className="p-4 grid grid-cols-12 gap-3 items-center text-xs hover:bg-slate-50/80 transition-colors">
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-900 text-white font-extrabold text-sm flex items-center justify-center flex-shrink-0 uppercase shadow-2xs">
                      {app.job?.company ? app.job.company.charAt(0) : 'J'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">{app.job?.title || 'Engineering Role'}</div>
                      <div className="text-slate-500 font-medium truncate mt-0.5">
                        {app.job?.company} {app.job?.location ? `• 📍 ${app.job.location}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 flex flex-col items-start gap-1">
                    {getStatusBadge(app.status)}
                    {app.metadata?.siteRegistered && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ⚡ Session Saved
                      </span>
                    )}
                  </div>

                  <div className="col-span-2">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase border ${getSourceBadgeColor(app.job?.source)}`}>
                      {app.job?.source || 'Portal'}
                    </span>
                    <div className="text-[11px] text-slate-500 font-medium mt-1">{app.job?.workMode || 'ONSITE'}</div>
                  </div>

                  <div className="col-span-1 text-slate-500 font-medium text-[11px]">
                    {new Date(app.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>

                  <div className="col-span-2 flex flex-wrap items-center justify-end gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => openPacket(app)} className="text-xs font-bold rounded-xl h-8 px-2.5">
                      Packet
                    </Button>
                    {hasAccountAction && (
                      <Button
                        size="sm"
                        onClick={() => void confirmRegisteredAndApply(app)}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm rounded-xl h-8 px-2.5"
                      >
                        ✓ Account
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() =>
                        app.metadata?.submissionAttempted === true && app.status === 'REVIEW_REQUIRED'
                          ? void retryAfterPortalReview(app)
                          : void submitApplication(app.id, app)
                      }
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs h-8 px-2.5"
                    >
                      Submit
                    </Button>
                    {app.job?.applicationUrl && (
                      <a
                        href={app.job.applicationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center text-xs"
                        title="Open portal"
                      >
                        ↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Realistic Interactive Agent Modal */}
      <RealisticProcessModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        subtitle={modalState.subtitle}
        icon={modalState.icon}
        steps={modalState.steps}
        currentStepIndex={modalState.currentStepIndex}
        progressPercent={modalState.progressPercent}
        targetUrl={modalState.targetUrl}
        resultData={modalState.resultData}
        resultStatus={modalState.resultStatus}
        onOpenUrl={() => modalState.targetUrl && window.open(modalState.targetUrl, '_blank')}
        onConfirmManual={() => {
          setModalState((prev) => ({ ...prev, isOpen: false }));
          if (activeAppId) {
            const found = apps.find((a: any) => a.id === activeAppId);
            if (found) markManualSubmission(found);
          }
        }}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Application Packet Modal */}
      <ApplicationPacketModal
        isOpen={Boolean(selectedPacketApp)}
        onClose={() => setSelectedPacketApp(null)}
        app={selectedPacketApp}
        events={selectedPacketApp ? appEvents[selectedPacketApp.id] || [] : []}
      />
    </div>
  );
}
