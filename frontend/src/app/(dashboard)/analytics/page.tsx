"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api-client';
import { Loading } from '@/components/ui/loading';

export default function AnalyticsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get<any>('/jobs'), api.get<any>('/applications')])
      .then(([jobResponse, appResponse]) => {
        setJobs(Array.isArray(jobResponse) ? jobResponse : jobResponse?.data || []);
        setApps(Array.isArray(appResponse) ? appResponse : appResponse?.data || []);
      })
      .catch(() => setError('Could not load analytics from your account.'))
      .finally(() => setLoading(false));
  }, []);

  const sourceCounts = useMemo(() => jobs.reduce((counts: Record<string, number>, job) => {
    const source = job.source || 'Other';
    counts[source] = (counts[source] || 0) + 1;
    return counts;
  }, {}), [jobs]);

  const submitted = apps.filter((app) => ['SUBMITTED', 'VERIFIED'].includes(app.status)).length;
  const needsReview = apps.filter((app) => ['REVIEW_REQUIRED', 'FORM_FILLING', 'AUTH_REQUIRED'].includes(app.status)).length;
  const inPipeline = apps.filter((app) => ['APPLICATION_STARTED', 'RESUME_PREPARED', 'SUBMITTING'].includes(app.status)).length;
  const scoredJobs = jobs.filter((job) => job.resumeMatch?.score !== null && job.resumeMatch?.score !== undefined);
  const strongMatches = scoredJobs.filter((job) => job.resumeMatch.score >= 70).length;

  return (
    <main className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-7 rounded-3xl text-white shadow-xl shadow-slate-900/10 border border-slate-700/50">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            Performance & Match Metrics
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Analytics & Conversion Funnel</h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            Real-time insights across discovered openings, ATS resume coverage, and submission completion rates.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loading size="lg" />
          <p className="text-xs text-slate-400 font-medium">Computing analytics data...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold">
          {error}
        </div>
      ) : (
        <>
          {/* KPI Stats Cards */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Discovered</span>
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold shadow-xs">💼</span>
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight mt-2">{jobs.length}</div>
              <p className="text-xs text-slate-500 mt-0.5">Across active feeds</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">High Match (≥70%)</span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-bold shadow-xs">🎯</span>
              </div>
              <div className="text-3xl font-black text-emerald-800 tracking-tight mt-2">{strongMatches}</div>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">Strong resume alignment</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Action Required</span>
                <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold shadow-xs">⚠️</span>
              </div>
              <div className="text-3xl font-black text-amber-800 tracking-tight mt-2">{needsReview}</div>
              <p className="text-xs text-amber-700 font-medium mt-0.5">Pending registration or check</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Confirmed Submissions</span>
                <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold shadow-xs">✓</span>
              </div>
              <div className="text-3xl font-black text-indigo-800 tracking-tight mt-2">{submitted}</div>
              <p className="text-xs text-indigo-700 font-medium mt-0.5">Portal verified receipts</p>
            </div>
          </section>

          {/* Funnel & Source Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Funnel Section */}
            <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Application Pipeline Funnel</h2>
                <p className="text-xs text-slate-500 mt-0.5">From discovery to confirmed employer receipt.</p>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  { label: 'Discovered Vacancies', count: jobs.length, pct: 100, color: 'bg-blue-600' },
                  { label: 'High Resume Compatibility', count: strongMatches, pct: jobs.length ? Math.round((strongMatches / jobs.length) * 100) : 0, color: 'bg-emerald-600' },
                  { label: 'Applications Initialized', count: apps.length, pct: jobs.length ? Math.round((apps.length / jobs.length) * 100) : 0, color: 'bg-indigo-600' },
                  { label: 'In Submission Process', count: inPipeline, pct: apps.length ? Math.round((inPipeline / apps.length) * 100) : 0, color: 'bg-amber-600' },
                  { label: 'Confirmed Submissions', count: submitted, pct: apps.length ? Math.round((submitted / apps.length) * 100) : 0, color: 'bg-teal-600' },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>{item.label}</span>
                      <span>{item.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color} transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.max(3, item.pct))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Source Distribution Section */}
            <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Discovered Openings by Source</h2>
                <p className="text-xs text-slate-500 mt-0.5">Active catalog breakdown across connected job feeds.</p>
              </div>

              <div className="space-y-3 pt-2">
                {Object.keys(sourceCounts).length ? (
                  Object.entries(sourceCounts).map(([source, count]) => {
                    const pct = jobs.length ? Math.round((count / jobs.length) * 100) : 0;
                    return (
                      <div key={source} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            {source}
                          </span>
                          <span className="text-slate-500">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">No jobs ingested yet.</p>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
