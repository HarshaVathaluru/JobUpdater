"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';

interface ApplicationPacketModalProps {
  isOpen: boolean;
  onClose: () => void;
  app: any;
  events?: any[];
}

export function ApplicationPacketModal({ isOpen, onClose, app, events = [] }: ApplicationPacketModalProps) {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'RESUME' | 'COVER_LETTER' | 'TRACE'>('OVERVIEW');
  const [copied, setCopied] = useState<string | null>(null);
  if (!isOpen || !app) return null;

  const job = app.job || {};
  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2500);
  };
  const downloadMasterResume = async () => {
    try {
      const response = await apiClient.get('/resume/master/download', { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = app.masterResume?.originalFilename || 'resume';
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setCopied('resume-download-failed');
    }
  };
  const tabs = ['OVERVIEW', 'RESUME', 'COVER_LETTER', 'TRACE'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-slate-500">APPLICATION {app.id?.slice(0, 8)} · {app.status === 'SUBMITTED' && app.metadata?.submissionMethod === 'candidate_confirmed_manual' ? 'CANDIDATE CONFIRMED SUBMITTED' : app.status}</span>
            <h2 className="text-xl font-black text-slate-900 mt-1">{job.title || 'Job title unavailable'}</h2>
            <p className="text-sm text-slate-600">{job.company || 'Company unavailable'}{job.location ? ` · ${job.location}` : ''}</p>
          </div>
          <button onClick={onClose} className="px-3 py-2 rounded-lg hover:bg-slate-100" aria-label="Close">✕</button>
        </div>

        <nav className="flex gap-1 p-2 bg-slate-100 border-b text-xs font-bold">
          {tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-2 rounded-lg ${activeTab === tab ? 'bg-white shadow-sm' : ''}`}>{tab.replace('_', ' ')}</button>)}
        </nav>

        <div className="p-6 overflow-y-auto flex-1 text-sm text-slate-800">
          {activeTab === 'OVERVIEW' && <div className="space-y-4">
            <p><strong>Status:</strong> {app.status === 'SUBMITTED' && app.metadata?.submissionMethod === 'candidate_confirmed_manual' ? 'You confirmed you submitted manually; no portal receipt was received by this app.' : app.status}</p>
            {app.failureReason && <p className="text-amber-800"><strong>Action needed:</strong> {app.failureReason}</p>}
            <p><strong>Created:</strong> {app.createdAt ? new Date(app.createdAt).toLocaleString() : 'Unknown'}</p>
            {app.submittedAt && <p><strong>Submitted:</strong> {new Date(app.submittedAt).toLocaleString()}</p>}
            {app.confirmationId && <p><strong>Employer reference:</strong> {app.confirmationId}</p>}
            {job.applicationUrl && <a href={job.applicationUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">{job.source?.toLowerCase() === 'jobicy' && job.applicationMethod === 'SOURCE_LISTING_REQUIRES_MANUAL_APPLICATION' ? 'Open Jobicy listing (then click the employer Apply link)' : 'Open job application page'}</a>}
            <section className="rounded-xl border bg-slate-50 p-4 space-y-2">
              <h3 className="font-bold">Candidate details to review</h3>
              {app.candidate ? <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div><dt className="text-slate-500">Name</dt><dd>{app.candidate.fullName || 'Missing'}</dd></div>
                <div><dt className="text-slate-500">Email</dt><dd>{app.candidate.email || 'Missing'}</dd></div>
                <div><dt className="text-slate-500">Phone</dt><dd>{app.candidate.phone || 'Missing'}</dd></div>
                <div><dt className="text-slate-500">Location</dt><dd>{app.candidate.location || 'Missing'}</dd></div>
              </dl> : <p>Candidate profile is missing.</p>}
            </section>
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Before submitting, review the job requirements and your documents. Answer work authorization, sponsorship, salary, notice-period, demographic, and consent questions yourself; the assistant will not guess these answers.</p>
            <div><strong>Job description</strong><p className="mt-2 whitespace-pre-wrap">{job.description || 'No description was provided by the job source.'}</p></div>
          </div>}

          {activeTab === 'RESUME' && <div>
            <div className="flex flex-wrap justify-between items-center gap-2 mb-3"><strong>Uploaded resume</strong>{app.masterResume && <Button size="sm" variant="outline" onClick={downloadMasterResume}>{copied === 'resume-download-failed' ? 'Download failed' : `Download ${app.masterResume.originalFilename}`}</Button>}</div>
            {!app.masterResume && <p className="text-amber-800">No resume is uploaded. Upload and review one before applying.</p>}
            {app.resumeCopy?.content && <section className="mt-5"><div className="flex justify-between items-center mb-2"><strong>Job-specific text copy</strong><Button size="sm" variant="outline" onClick={() => copyText(app.resumeCopy.content, 'resume-copy')}>{copied === 'resume-copy' ? 'Copied' : 'Copy text'}</Button></div><p className="mb-2 text-xs text-amber-800">This is a text reference only. The original uploaded file is the document available for portal upload.</p><pre className="whitespace-pre-wrap font-mono text-xs">{app.resumeCopy.content}</pre></section>}
          </div>}

          {activeTab === 'COVER_LETTER' && <div>
            <div className="flex justify-between items-center mb-3"><strong>Cover letter</strong>{app.coverLetter?.content && <Button size="sm" variant="outline" onClick={() => copyText(app.coverLetter.content, 'letter')}>{copied === 'letter' ? 'Copied' : 'Copy'}</Button>}</div>
            <pre className="whitespace-pre-wrap">{app.coverLetter?.content || 'No cover letter is attached to this application. Generate and review one from the job listing first.'}</pre>
          </div>}

          {activeTab === 'TRACE' && (events.length ? <ol className="space-y-3">{events.map((event, index) => <li key={event.id || index} className="border-b pb-3"><strong>{event.eventType}</strong><p>{event.description}</p><time className="text-xs text-slate-500">{event.createdAt ? new Date(event.createdAt).toLocaleString() : ''}</time></li>)}</ol> : <p>No application events have been recorded.</p>)}
        </div>
        <div className="p-4 border-t flex justify-end"><Button size="sm" onClick={onClose}>Close</Button></div>
      </div>
    </div>
  );
}
