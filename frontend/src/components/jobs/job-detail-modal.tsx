"use client";

import React from 'react';
import { Job } from '@/types';
import { Button } from '@/components/ui/button';

interface JobDetailModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onAtsMatch: (job: Job) => void;
  onTailorResume: (job: Job) => void;
  onGenerateCoverLetter: (job: Job) => void;
  onStartApplication: (job: Job) => void;
  isProcessing?: boolean;
}

export function JobDetailModal({
  job,
  isOpen,
  onClose,
  onAtsMatch,
  onTailorResume,
  onGenerateCoverLetter,
  onStartApplication,
  isProcessing = false,
}: JobDetailModalProps) {
  if (!isOpen || !job) return null;

  const rawSkills: any = job.requiredSkills;
  const skillsList: string[] = Array.isArray(rawSkills)
    ? rawSkills
    : typeof rawSkills === 'string' && (rawSkills as string).trim()
    ? (rawSkills as string).split(/[,;]+/).map((s: string) => s.trim()).filter(Boolean)
    : [];

  const getSourceBadge = (source?: string) => {
    const s = (source || '').toLowerCase();
    if (s.includes('linkedin')) {
      return { label: 'LinkedIn Verified', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '🔗' };
    }
    if (s.includes('remotive')) {
      return { label: 'Remotive Global Tech', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: '🌐' };
    }
    if (s.includes('jobicy')) {
      return { label: 'Jobicy Feed', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: '⚡' };
    }
    if (s.includes('arbeitnow')) {
      return { label: 'Arbeitnow API', color: 'bg-teal-100 text-teal-800 border-teal-200', icon: '💼' };
    }
    if (s.includes('naukri')) {
      return { label: 'Naukri Jobs', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: '🇮🇳' };
    }
    return { label: source || 'Verified Partner', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: '📌' };
  };

  const badge = getSourceBadge(job.source);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.color}`}>
                <span>{badge.icon}</span> {badge.label}
              </span>
              {job.workMode && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  {job.workMode}
                </span>
              )}
              {job.location && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  📍 {job.location}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {job.title}
            </h2>
            <p className="text-sm font-semibold text-blue-600 flex items-center gap-2">
              <span>🏢</span> {job.company}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            title="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          {/* Direct Post External Link Banner */}
          {job.applicationUrl && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-blue-900">Direct Official Posting Verified</p>
                <p className="text-[11px] text-blue-700">
                  Inspect the official live post directly on the employer or partner board.
                </p>
              </div>
              <a
                href={job.applicationUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all flex-shrink-0"
              >
                <span>🔗</span> Open Live Post ↗
              </a>
            </div>
          )}

          {/* Required Skills Section */}
          {skillsList.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Required Tech Stack & Skills
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {skillsList.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Full Description Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Full Job Description & Requirements
            </h4>
            <div className="text-sm leading-relaxed text-slate-700 bg-slate-50/70 p-5 rounded-2xl border border-slate-100 whitespace-pre-line font-normal">
              {job.description}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => onAtsMatch(job)}
              className="text-xs font-semibold rounded-xl bg-white"
            >
              📊 Check ATS Match
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => onTailorResume(job)}
              className="text-xs font-semibold rounded-xl bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              ✨ Tailor Resume
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => onGenerateCoverLetter(job)}
              className="text-xs font-semibold rounded-xl bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              📝 Generate Cover Letter
            </Button>
          </div>

          <Button
            size="sm"
            disabled={isProcessing}
            onClick={() => onStartApplication(job)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md px-5"
          >
            🚀 Start Application
          </Button>
        </div>
      </div>
    </div>
  );
}
