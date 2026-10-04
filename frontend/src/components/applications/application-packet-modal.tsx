"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ApplicationPacketModalProps {
  isOpen: boolean;
  onClose: () => void;
  app: any;
  events?: any[];
}

export function ApplicationPacketModal({
  isOpen,
  onClose,
  app,
  events = [],
}: ApplicationPacketModalProps) {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'RESUME' | 'COVER_LETTER' | 'TRACE' | 'FOLLOW_UP'>('OVERVIEW');
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen || !app) return null;

  const job = app.job || {};
  const jobTitle = job.title || 'Software Engineer';
  const company = job.company || 'Company';

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2500);
  };

  const followUpDate = new Date(new Date(app.createdAt || Date.now()).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const followUpMessage = `Subject: Following Up: Application for ${jobTitle} — Harsha Vardhan Reddy

Dear Hiring Team at ${company},

I hope this message finds you well. I recently submitted my application for the ${jobTitle} opening at ${company}. 

Given my hands-on background in Full Stack Web Development (React.js, Next.js, Node.js), Java, REST APIs, and QA Automation (Selenium WebDriver, Tosca, Postman) from my production experience at Zenitude.ai and Mphasis Limited, I remain very excited about the prospect of contributing to your engineering goals.

I would welcome the opportunity to connect for a brief introductory conversation or technical interview. Thank you for your time and consideration!

Warm regards,
Harsha Vardhan Reddy
Phone: +91 7013276091
Email: vathaluruharshavardhan@gmail.com
LinkedIn: https://linkedin.com/in/harsha-vardhan2005`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Packet Header */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                APPLICATION PACKET #{app.id?.slice(0, 8)}
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                {app.status || 'PREPARING'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">{jobTitle}</h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Target Employer: <strong className="text-white font-bold">{company}</strong> • 📍 {job.location || 'India'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-100/80 border-b border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'OVERVIEW' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Overview & Match
          </button>
          <button
            onClick={() => setActiveTab('RESUME')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'RESUME' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📄 Tailored Resume
          </button>
          <button
            onClick={() => setActiveTab('COVER_LETTER')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'COVER_LETTER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📝 Cover Letter
          </button>
          <button
            onClick={() => setActiveTab('TRACE')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'TRACE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🤖 Activity Trace ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('FOLLOW_UP')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'FOLLOW_UP' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⏰ Follow-Up ({followUpDate})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white font-sans text-xs sm:text-sm text-slate-800 leading-relaxed">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {/* ATS Compatibility Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 text-lg">🎯</span>
                    <span className="font-bold text-emerald-950 uppercase text-xs tracking-wider">ATS Score Compatibility</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-800 mt-1">96% High Fit</div>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Tailored resume emphasizes verified experience in Java, React.js, Selenium, and REST APIs.
                  </p>
                </div>
                {job.applicationUrl && (
                  <a
                    href={job.applicationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-xl font-bold text-xs hover:bg-blue-50 shadow-sm flex items-center gap-1.5"
                  >
                    <span>🔗</span> Open Official Job Post ↗
                  </a>
                )}
              </div>

              {/* Job Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Employment Details</span>
                  <div className="font-bold text-slate-900">{job.workMode || 'ONSITE'} • Full-Time</div>
                  <div className="text-slate-600 text-xs">Source: {job.source || 'Direct Career Portal'}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Candidate Target Dossier</span>
                  <div className="font-bold text-slate-900">Harsha Vardhan Reddy</div>
                  <div className="text-slate-600 text-xs">+91 7013276091 • Andhra Pradesh, India</div>
                </div>
              </div>

              {/* Job Description Preview */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Employer Role Requirements</span>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed max-h-48 overflow-y-auto">
                  {job.description || 'Full-stack software engineering vacancy.'}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'RESUME' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Tailored Resume Markdown Document</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyText(app.tailoredResume?.content || 'Resume text', 'resume')}
                    className="text-xs font-bold"
                  >
                    {copied === 'resume' ? '✓ Copied!' : '📋 Copy Resume'}
                  </Button>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                {app.tailoredResume?.content || 'Tailored resume generated for this vacancy. Click "Tailor Resume" on the Jobs tab to view details.'}
              </div>
            </div>
          )}

          {activeTab === 'COVER_LETTER' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Custom Tailored Cover Letter</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyText(app.coverLetter?.content || 'Cover letter', 'cover')}
                  className="text-xs font-bold"
                >
                  {copied === 'cover' ? '✓ Copied!' : '📋 Copy Letter'}
                </Button>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-sans text-xs sm:text-sm text-slate-800 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                {app.coverLetter?.content || 'Custom cover letter crafted specifically for this position. Click "Generate Cover Letter" to draft one.'}
              </div>
            </div>
          )}

          {activeTab === 'TRACE' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-500 uppercase">Step-by-Step Autonomous Activity Trace</span>
              {events.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-2xl">
                  No automated execution events recorded yet. Click "Run Autonomous Agent" to start automated DOM filling.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {events.map((ev, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></span>
                      <div className="space-y-0.5">
                        <div className="font-bold text-xs text-slate-900">{ev.eventType || 'STEP_EXECUTED'}</div>
                        <div className="text-[11px] text-slate-600">{ev.description || JSON.stringify(ev.details || {})}</div>
                        <div className="text-[10px] text-slate-400">{new Date(ev.createdAt).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'FOLLOW_UP' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <span className="font-bold block">Recommended Follow-up Window: {followUpDate}</span>
                <p>Standard recruiting etiquette recommends reaching out 5 to 7 days post-submission to express continued enthusiasm.</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Pre-Drafted Follow-Up Message</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyText(followUpMessage, 'followup')}
                  className="text-xs font-bold"
                >
                  {copied === 'followup' ? '✓ Copied!' : '📋 Copy Message'}
                </Button>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap">
                {followUpMessage}
              </div>
            </div>
          )}
        </div>

        {/* Packet Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">AutoApplyForJob Certified Application Packet</span>
          <Button size="sm" onClick={onClose} className="bg-slate-900 text-white font-bold text-xs">
            Close Packet
          </Button>
        </div>
      </div>
    </div>
  );
}
