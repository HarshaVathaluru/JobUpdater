"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api-client';

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
    const source = job.source || 'Unknown source';
    counts[source] = (counts[source] || 0) + 1;
    return counts;
  }, {}), [jobs]);
  const submitted = apps.filter((app) => ['SUBMITTED', 'VERIFIED'].includes(app.status)).length;
  const needsReview = apps.filter((app) => app.status === 'REVIEW_REQUIRED').length;
  const scoredJobs = jobs.filter((job) => job.resumeMatch?.score !== null && job.resumeMatch?.score !== undefined);
  const strongMatches = scoredJobs.filter((job) => job.resumeMatch.score >= 75).length;

  return <main className="max-w-5xl mx-auto space-y-6 pb-12">
    <header><h1 className="text-2xl font-black text-slate-900">Your job search activity</h1><p className="text-sm text-slate-600 mt-1">Counts are taken from your saved jobs and application records. Resume percentages are keyword coverage estimates, not employer ATS scores.</p></header>
    {loading ? <p>Loading account data…</p> : error ? <p role="alert" className="text-red-700">{error}</p> : <>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Saved jobs', jobs.length],
          ['Jobs with a coverage score', scoredJobs.length],
          ['At least 75% keyword coverage', strongMatches],
          ['Marked submitted', submitted],
        ].map(([label, value]) => <div key={label} className="p-4 bg-white border rounded-2xl"><p className="text-xs text-slate-500">{label}</p><p className="text-2xl font-bold mt-1">{value}</p></div>)}
      </section>
      <section className="p-5 bg-white border rounded-2xl space-y-3"><h2 className="font-bold">Applications needing review</h2><p>{needsReview}</p><p className="text-xs text-slate-600">Submitted counts include portal receipts and applications you explicitly mark as submitted manually.</p></section>
      <section className="p-5 bg-white border rounded-2xl space-y-3"><h2 className="font-bold">Saved jobs by source</h2>{Object.keys(sourceCounts).length ? Object.entries(sourceCounts).map(([source, count]) => <div className="flex justify-between border-b py-2 text-sm" key={source}><span>{source}</span><span>{count}</span></div>) : <p className="text-sm text-slate-600">No jobs have been saved yet.</p>}</section>
    </>}
  </main>;
}
