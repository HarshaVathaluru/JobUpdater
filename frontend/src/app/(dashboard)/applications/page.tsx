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
  resultData?: string;
  resultStatus?: 'success' | 'review' | 'failure';
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST'>('KANBAN');
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [selectedPacketApp, setSelectedPacketApp] = useState<any | null>(null);
  const [appEvents, setAppEvents] = useState<Record<string, any[]>>({});
  const [searchFilter, setSearchFilter] = useState('');
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

  const runAgent = async (id: string, appItem?: any) => {
    setActiveAppId(id);
    const targetUrl = appItem?.job?.applicationUrl || 'Employer Career Portal';

    setModalState({
      isOpen: true,
      title: 'Inspect Application Portal',
      subtitle: `Target: ${appItem?.job?.company || 'Company'} — ${targetUrl}`,
      icon: '🤖',
      steps: [
        'Opening the employer page if a supported browser is configured...',
        'Inspecting visible fields and login or CAPTCHA requirements...',
        'Filling only fields that match your saved profile...',
        'Saving the inspection result for your review...',
      ],
      currentStepIndex: 0,
      progressPercent: 20,
    });

    try {
      setModalState((p) => ({ ...p, currentStepIndex: 1, progressPercent: 45 }));
      const res: any = await api.post(`/applications/${id}/agent`);
      setModalState((p) => ({ ...p, currentStepIndex: 2, progressPercent: 75 }));

      const events = await loadEventsForApp(id);
      setModalState((p) => ({
        ...p,
        currentStepIndex: 3,
        progressPercent: 100,
        resultData: res?.message || 'Portal inspection finished.',
      }));

      fetchApps();
      success(res?.message || 'Portal inspection finished.', 'Inspection Complete');
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
        info(result.message || 'Marked submitted based on your confirmation.', 'Candidate confirmed');
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

  const filteredApps = apps.filter((app) => {
    const q = searchFilter.toLowerCase().trim();
    if (!q) return true;
    return (
      (app.job?.title || '').toLowerCase().includes(q) ||
      (app.job?.company || '').toLowerCase().includes(q) ||
      (app.status || '').toLowerCase().includes(q)
    );
  });

  // Categorize for Kanban columns
  const kanbanColumns = [
    {
      id: 'PREPARING',
      title: 'Draft & Preparing',
      color: 'border-slate-300 bg-slate-50',
      badge: 'bg-slate-100 text-slate-700',
      items: filteredApps.filter((a) => ['DISCOVERED', 'ANALYZED', 'MATCHED', 'ELIGIBLE', 'RESUME_PREPARED', 'COVER_LETTER_PREPARED', 'APPLICATION_STARTED'].includes(a.status)),
    },
    {
      id: 'READY',
      title: 'Needs Review',
      color: 'border-blue-300 bg-blue-50/30',
      badge: 'bg-blue-100 text-blue-800',
      items: filteredApps.filter((a) => ['FORM_FILLING', 'REVIEW_REQUIRED', 'AUTH_REQUIRED', 'UNKNOWN_QUESTION', 'CAPTCHA_REQUIRED', 'FAILED'].includes(a.status)),
    },
    {
      id: 'SUBMITTING',
      title: 'Submitting',
      color: 'border-amber-300 bg-amber-50/30',
      badge: 'bg-amber-100 text-amber-800',
      items: filteredApps.filter((a) => a.status === 'SUBMITTING'),
    },
    {
      id: 'SUBMITTED',
      title: 'Portal or candidate confirmed',
      color: 'border-emerald-300 bg-emerald-50/30',
      badge: 'bg-emerald-100 text-emerald-800',
      items: filteredApps.filter((a) => a.status === 'SUBMITTED' || a.status === 'VERIFIED'),
    },
    {
      id: 'INTERVIEW',
      title: 'Interview',
      color: 'border-violet-300 bg-violet-50/30',
      badge: 'bg-violet-100 text-violet-800',
      items: filteredApps.filter((a) => a.status === 'INTERVIEW'),
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Application Center & Tracker</h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Application packets, portal submission status, and candidate review steps.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle */}
          <div className="p-1 bg-slate-100 rounded-xl flex items-center gap-1 text-xs font-bold">
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'KANBAN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📊 Kanban View
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'LIST' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 List View
            </button>
          </div>

          <Link href="/jobs">
            <Button size="sm" className="bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md">
              + New Application
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter & Metrics Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <span>📦 Total Packets: <strong className="text-slate-900">{apps.length}</strong></span>
          <span>•</span>
          <span className="text-emerald-700">✓ Submitted: {apps.filter(a => a.status === 'SUBMITTED' || a.status === 'VERIFIED').length}</span>
        </div>

        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Search company or role..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-8 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loading size="lg" />
          <p className="text-xs text-slate-400 font-medium">Loading application tracking board...</p>
        </div>
      ) : apps.length === 0 ? (
        <div className="text-center py-20 px-6 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl">
            📦
          </div>
          <h3 className="text-lg font-bold text-slate-900">No applications in the pipeline yet</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Head over to Discovered Jobs, tailor your resume for a vacancy, and click "Start Application" to generate an application packet!
          </p>
          <Link href="/jobs">
            <Button className="bg-blue-600 text-white rounded-xl font-bold text-xs">
              Go to Discovered Jobs ➔
            </Button>
          </Link>
        </div>
      ) : viewMode === 'KANBAN' ? (
        /* KANBAN BOARD VIEW (Section 12) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {kanbanColumns.map((col) => (
            <div key={col.id} className="space-y-3">
              {/* Column Header */}
              <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">{col.title}</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${col.badge}`}>
                  {col.items.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="space-y-3 min-h-[400px]">
                {col.items.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    No items in this stage
                  </div>
                ) : (
                  col.items.map((app) => {
                    const isProcessing = activeAppId === app.id;
                    return (
                      <div
                        key={app.id}
                        className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all space-y-3 group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1 text-[10px]">
                            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              {app.job?.source || 'Portal'}
                            </span>
                            <span className="text-slate-400">{new Date(app.createdAt).toLocaleDateString()}</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                            {app.job?.title || 'Role unavailable'}
                          </h4>
                          <p className="text-xs text-slate-600 font-medium">{app.job?.company || 'Company'}</p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPacket(app)}
                            className="w-full text-[11px] font-bold border-slate-200 hover:bg-slate-50 text-slate-700"
                          >
                            📦 View Full Packet
                          </Button>

                          {app.job?.applicationUrl && <a href={app.job.applicationUrl} target="_blank" rel="noreferrer" className="block text-center py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold">{app.job?.source?.toLowerCase() === 'jobicy' && app.job?.applicationMethod === 'SOURCE_LISTING_REQUIRES_MANUAL_APPLICATION' ? 'Open Jobicy listing, then click employer Apply ↗' : 'Open employer listing ↗'}</a>}
                          {app.status !== 'SUBMITTED' && app.status !== 'VERIFIED' && <button onClick={() => void markManualSubmission(app)} className="w-full py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-[10px] font-bold">I submitted manually</button>}
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => runAgent(app.id, app)}
                              disabled={isProcessing}
                              className="py-1 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[10px] font-bold transition-all border border-indigo-200"
                            >
                              🤖 Run Agent
                            </button>
                            <button
                              onClick={() => app.metadata?.submissionAttempted === true && app.status === 'REVIEW_REQUIRED'
                                ? void retryAfterPortalReview(app)
                                : void submitApplication(app.id, app)}
                              disabled={isProcessing}
                              className="py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-all shadow-sm"
                            >
                              {app.metadata?.submissionAttempted === true && app.status === 'REVIEW_REQUIRED' ? 'Retry after portal check' : '📤 Submit'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST / TABLE VIEW (Section 12) */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-12 gap-3 text-xs font-bold text-slate-500 uppercase">
            <div className="col-span-4">Role & Company</div>
            <div className="col-span-2">Stage Status</div>
            <div className="col-span-2">Source / Mode</div>
            <div className="col-span-2">Created Date</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredApps.map((app) => (
              <div key={app.id} className="p-4 grid grid-cols-12 gap-3 items-center text-xs hover:bg-slate-50 transition-colors">
                <div className="col-span-4 space-y-0.5">
                  <div className="font-bold text-slate-900 text-sm">{app.job?.title || 'Software Role'}</div>
                  <div className="text-slate-500 font-medium">{app.job?.company} • 📍 {app.job?.location}</div>
                </div>

                <div className="col-span-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {app.status === 'SUBMITTED' && app.metadata?.submissionMethod === 'candidate_confirmed_manual' ? 'SUBMITTED (YOU CONFIRMED)' : app.status}
                  </span>
                </div>

                <div className="col-span-2 text-slate-600 font-medium">
                  {app.job?.source || 'Portal'} ({app.job?.workMode || 'ONSITE'})
                </div>

                <div className="col-span-2 text-slate-500 font-medium">
                  {new Date(app.createdAt).toLocaleDateString()}
                </div>

                <div className="col-span-2 flex items-center justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => openPacket(app)} className="text-xs font-bold">
                    Packet
                  </Button>
                  {app.job?.applicationUrl && <a href={app.job.applicationUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-700">{app.job?.source?.toLowerCase() === 'jobicy' && app.job?.applicationMethod === 'SOURCE_LISTING_REQUIRES_MANUAL_APPLICATION' ? 'Open Jobicy listing ↗' : 'Open listing ↗'}</a>}
                  {app.status !== 'SUBMITTED' && app.status !== 'VERIFIED' && <button onClick={() => void markManualSubmission(app)} className="text-xs font-bold text-blue-700">I submitted manually</button>}
                  <Button size="sm" onClick={() => app.metadata?.submissionAttempted === true && app.status === 'REVIEW_REQUIRED'
                    ? void retryAfterPortalReview(app)
                    : void submitApplication(app.id, app)} className="bg-emerald-600 text-white text-xs font-bold">
                    {app.metadata?.submissionAttempted === true && app.status === 'REVIEW_REQUIRED' ? 'Retry after portal check' : 'Submit'}
                  </Button>
                </div>
              </div>
            ))}
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
        resultData={modalState.resultData}
        resultStatus={modalState.resultStatus}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Signature Application Packet Modal (Section 11) */}
      <ApplicationPacketModal
        isOpen={Boolean(selectedPacketApp)}
        onClose={() => setSelectedPacketApp(null)}
        app={selectedPacketApp}
        events={selectedPacketApp ? appEvents[selectedPacketApp.id] || [] : []}
      />
    </div>
  );
}
