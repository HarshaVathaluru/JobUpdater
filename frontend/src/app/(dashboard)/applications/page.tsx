"use client";

import React, { useEffect, useState } from 'react';
import { Loading } from '@/components/ui/loading';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { RealisticProcessModal } from '@/components/ui/realistic-process-modal';

interface ProcessState {
  isOpen: boolean;
  title: string;
  subtitle: string;
  icon: string;
  steps: string[];
  currentStepIndex: number;
  progressPercent: number;
  resultData?: string;
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [expandedTraceAppId, setExpandedTraceAppId] = useState<string | null>(null);
  const [appEvents, setAppEvents] = useState<Record<string, any[]>>({});
  const [loadingEvents, setLoadingEvents] = useState<Record<string, boolean>>({});
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
      toastError('Could not load applications.');
    } finally {
      setLoading(false);
    }
  };

  const loadEventsForApp = async (appId: string) => {
    if (appEvents[appId]) {
      setExpandedTraceAppId((prev) => (prev === appId ? null : appId));
      return;
    }

    setLoadingEvents((prev) => ({ ...prev, [appId]: true }));
    try {
      const res: any = await api.get(`/applications/${appId}/events`);
      const events = Array.isArray(res) ? res : res?.data || [];
      setAppEvents((prev) => ({ ...prev, [appId]: events }));
      setExpandedTraceAppId(appId);
    } catch (err) {
      console.error('Failed to load application events', err);
      toastError('Could not load activity trace for this application.');
    } finally {
      setLoadingEvents((prev) => ({ ...prev, [appId]: false }));
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const runAgent = async (id: string, appItem?: any) => {
    setActiveAppId(id);
    const targetUrl = appItem?.job?.applicationUrl || 'Employer Career Portal';

    setModalState({
      isOpen: true,
      title: 'Autonomous Browser Form Filling Agent',
      subtitle: `Target: ${appItem?.job?.company || 'Company'} — ${targetUrl}`,
      icon: '🤖',
      steps: [
        'Launching headless Chrome session & navigating to portal...',
        'Inspecting page DOM for candidate form fields & file upload inputs...',
        'Injecting verified candidate profile (Email, Name, Phone, Resume)...',
        'Validating form inputs & logging step-by-step activity trace...',
      ],
      currentStepIndex: 0,
      progressPercent: 20,
      resultData: undefined,
    });

    try {
      setModalState((p) => ({ ...p, currentStepIndex: 1, progressPercent: 45 }));

      const res: any = await api.post(`/applications/${id}/agent`);

      setModalState((p) => ({ ...p, currentStepIndex: 2, progressPercent: 75 }));

      // Fetch the real recorded events from backend
      const eventsRes: any = await api.get(`/applications/${id}/events`);
      const events = Array.isArray(eventsRes) ? eventsRes : eventsRes?.data || [];
      setAppEvents((prev) => ({ ...prev, [id]: events }));

      setModalState((p) => ({
        ...p,
        currentStepIndex: 3,
        progressPercent: 100,
        resultData: res?.message || 'Agent completed form autofill workflow!',
      }));

      fetchApps();
      success(res?.message || 'Agent completed form workflow!', 'Agent Finished');
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
      title: 'Submitting Application to Employer Portal',
      subtitle: `Dispatches candidate profile directly to ${appItem?.job?.company || 'Employer'}`,
      icon: '📤',
      steps: [
        'Verifying candidate profile, resume attachment & eligibility...',
        'Accessing employer gateway and preparing submission payload...',
        'Submitting application to employer portal & awaiting receipt...',
        'Confirming application delivery and dispatching candidate notification...',
      ],
      currentStepIndex: 0,
      progressPercent: 25,
      resultData: undefined,
    });

    try {
      setModalState((p) => ({ ...p, currentStepIndex: 1, progressPercent: 50 }));

      const res: any = await api.post(`/applications/${id}/submit`);
      const data = res?.data || res;

      setModalState((p) => ({ ...p, currentStepIndex: 2, progressPercent: 80 }));

      // Fetch real events
      const eventsRes: any = await api.get(`/applications/${id}/events`);
      const events = Array.isArray(eventsRes) ? eventsRes : eventsRes?.data || [];
      setAppEvents((prev) => ({ ...prev, [id]: events }));

      setModalState((p) => ({
        ...p,
        currentStepIndex: 3,
        progressPercent: 100,
        resultData: data?.message || 'Application submitted successfully!',
      }));

      fetchApps();
      if (data?.status === false && data?.requiresUserAction) {
        info(data.message, 'User Action Required on Portal');
      } else {
        success(data?.message || 'Application submitted successfully!', 'Submission Complete');
      }
    } catch (e: any) {
      setModalState((p) => ({ ...p, isOpen: false }));
      toastError(e?.response?.data?.message || e?.message || 'Submission failed!', 'Submission Error');
    } finally {
      setActiveAppId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Applications</h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Track and orchestrate your autonomous job applications with full status and live browser trace visibility.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loading size="lg" />
          <p className="text-xs text-slate-400 font-medium">Loading applications...</p>
        </div>
      ) : apps.length === 0 ? (
        <div className="text-center py-20 px-6 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl mb-3">
            📋
          </div>
          <h3 className="text-base font-bold text-slate-900">No applications started yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            Visit the "Jobs" tab and click "Start Application" to initiate a tailored workflow.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => {
            const events = appEvents[app.id] || [];
            const isTraceExpanded = expandedTraceAppId === app.id;
            const isLoadingThisEvents = loadingEvents[app.id];

            return (
              <div
                key={app.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                        {app.job?.title || `Application #${app.id.slice(0, 8)}`}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        {app.job?.company || 'Employer Submission'} {app.job?.location ? `• ${app.job.location}` : ''}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Created: {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                        app.status === 'SUBMITTED' || app.status === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : app.status === 'FAILED'
                          ? 'bg-rose-100 text-rose-800'
                          : app.status === 'REVIEW_REQUIRED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>

                  {/* Direct Vacancy Link */}
                  {app.job?.applicationUrl && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Employer Portal:</span>
                      <a
                        href={app.job.applicationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        <span>🔗</span> View on {app.job?.source || 'Portal'} ↗
                      </a>
                    </div>
                  )}

                  {/* Failure / Review Reason if any */}
                  {app.failureReason && (
                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900">
                      <strong>⚠️ Attention Required:</strong> {app.failureReason}
                    </div>
                  )}

                  {/* Confirmation Receipt */}
                  {app.confirmationId && (
                    <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl text-xs space-y-2">
                      <div className="font-bold text-emerald-950 flex items-center justify-between flex-wrap gap-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-emerald-600">✓</span> Gateway Reference:
                        </span>
                        <span className="font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[11px] font-bold">
                          {app.confirmationId}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600">
                        {app.submittedAt
                          ? `Submitted on ${new Date(app.submittedAt).toLocaleString()}.`
                          : 'Application confirmed and dispatched.'}
                      </p>
                    </div>
                  )}

                  {/* Browser Inspection Summary */}
                  {app.metadata?.browserInspection && (
                    <div className="p-3 bg-slate-50 text-[11px] rounded-xl border border-slate-200 space-y-1">
                      <div className="font-semibold text-slate-700 flex items-center justify-between">
                        <span>🌐 Portal Inspected:</span>
                        <span className="text-emerald-600 font-bold">
                          {app.metadata.browserInspection.filledFields?.length || 0} fields auto-filled
                        </span>
                      </div>
                      <p className="text-slate-500 truncate text-[10px]" title={app.metadata.browserInspection.finalUrl}>
                        {app.metadata.browserInspection.pageTitle || app.metadata.browserInspection.finalUrl}
                      </p>
                    </div>
                  )}

                  {/* Activity Trace Toggle */}
                  <div>
                    <button
                      onClick={() => loadEventsForApp(app.id)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                    >
                      <span>{isTraceExpanded ? '▼' : '▶'}</span>
                      {isLoadingThisEvents ? 'Loading trace...' : isTraceExpanded ? 'Hide Agent Trace' : 'View Live Agent Activity Trace'}
                    </button>

                    {isTraceExpanded && (
                      <div className="mt-3 p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono space-y-2 max-h-48 overflow-y-auto border border-slate-800">
                        {events.length === 0 ? (
                          <p className="text-slate-400">No events logged yet. Click "Run Agent" to initiate browser workflow.</p>
                        ) : (
                          events.map((ev, idx) => (
                            <div key={ev.id || idx} className="border-b border-slate-800/80 pb-1.5 last:border-0 last:pb-0">
                              <div className="flex items-center justify-between text-indigo-400 text-[10px]">
                                <span className="font-bold">{ev.eventType}</span>
                                <span className="text-slate-500">{new Date(ev.createdAt).toLocaleTimeString()}</span>
                              </div>
                              <p className="text-slate-300 text-[11px] mt-0.5">{ev.description}</p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => runAgent(app.id, app)}
                    disabled={activeAppId === app.id || app.status === 'FORM_FILLING'}
                    className="w-1/2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1"
                  >
                    <span>🤖</span> Run Agent
                  </button>
                  <button
                    onClick={() => submitApplication(app.id, app)}
                    disabled={activeAppId === app.id}
                    className="w-1/2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1"
                  >
                    <span>📤</span> Submit
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
    </div>
  );
}
