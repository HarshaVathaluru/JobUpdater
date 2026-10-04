"use client";

import React, { useEffect, useState } from 'react';
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
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST'>('KANBAN');
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [selectedPacketApp, setSelectedPacketApp] = useState<any | null>(null);
  const [appEvents, setAppEvents] = useState<Record<string, any[]>>({});
  const [searchFilter, setSearchFilter] = useState('');
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
      items: filteredApps.filter((a) => a.status === 'DISCOVERED' || a.status === 'APPLIED'),
    },
    {
      id: 'READY',
      title: 'Ready to Apply',
      color: 'border-blue-300 bg-blue-50/30',
      badge: 'bg-blue-100 text-blue-800',
      items: filteredApps.filter((a) => a.status === 'READY' || a.status === 'AUTOFILLED'),
    },
    {
      id: 'SUBMITTED',
      title: 'Submitted & Verified',
      color: 'border-emerald-300 bg-emerald-50/30',
      badge: 'bg-emerald-100 text-emerald-800',
      items: filteredApps.filter((a) => a.status === 'SUBMITTED' || a.status === 'VERIFIED'),
    },
    {
      id: 'INTERVIEW',
      title: 'Screening & Interview',
      color: 'border-amber-300 bg-amber-50/30',
      badge: 'bg-amber-100 text-amber-800',
      items: filteredApps.filter((a) => a.status === 'INTERVIEW' || a.status === 'OFFER'),
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
            Certified application packets, automated browser filling traces, and Kanban status tracking.
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                            {app.job?.title || 'Software Engineer'}
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

                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => runAgent(app.id, app)}
                              disabled={isProcessing}
                              className="py-1 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[10px] font-bold transition-all border border-indigo-200"
                            >
                              🤖 Run Agent
                            </button>
                            <button
                              onClick={() => submitApplication(app.id, app)}
                              disabled={isProcessing}
                              className="py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-all shadow-sm"
                            >
                              📤 Submit
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
                    {app.status}
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
                  <Button size="sm" onClick={() => submitApplication(app.id, app)} className="bg-emerald-600 text-white text-xs font-bold">
                    Submit
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
