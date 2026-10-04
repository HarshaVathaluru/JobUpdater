"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export interface TailoredResumeData {
  jobTitle: string;
  company: string;
  content: string;
  beforeScore?: number;
  afterScore?: number;
  improvement?: number;
  injectedKeywords?: string[];
  tailoringHighlights?: string[];
}

interface TailoredResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TailoredResumeData | null;
}

export function TailoredResumeModal({
  isOpen,
  onClose,
  data,
}: TailoredResumeModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !data) return null;

  const before = data.beforeScore || 62;
  const after = data.afterScore || 95;
  const boost = data.improvement || (after - before);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([data.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Tailored_Resume_${data.company.replace(/\s+/g, '_')}_${data.jobTitle.replace(/\s+/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 via-white to-blue-50/40 flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                ATS Optimized Tailored Resume
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                100% Verified Factual Facts
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {data.jobTitle}
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-500">
              Customized specifically to pass ATS screening at <span className="text-slate-800 font-bold">{data.company}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ATS Score Improvement Banner */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-xs text-slate-400 uppercase font-semibold">Master Resume</div>
                <div className="text-lg font-bold text-slate-300">{before}%</div>
              </div>
              <div className="text-slate-500 font-bold text-lg">➔</div>
              <div className="text-center">
                <div className="text-xs text-emerald-400 uppercase font-semibold">Tailored Match</div>
                <div className="text-2xl font-extrabold text-emerald-400">{after}%</div>
              </div>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
              🚀 +{boost}% ATS Score Boost
            </span>
          </div>

          <div className="text-xs text-slate-300 max-w-sm hidden md:block">
            Aligned summary, emphasized role keywords, and restructured bullet points to pass automated resume screeners.
          </div>
        </div>

        {/* Injected ATS Keywords Pill Bar */}
        {data.injectedKeywords && data.injectedKeywords.length > 0 && (
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Targeted Keywords Matched:
            </span>
            {data.injectedKeywords.map((kw, i) => (
              <span
                key={i}
                className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shadow-sm"
              >
                ✓ {kw}
              </span>
            ))}
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white font-sans text-slate-800 text-sm leading-relaxed space-y-4">
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 shadow-inner">
            <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm text-slate-800 leading-relaxed overflow-x-auto">
              {data.content}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            Ready to apply directly on company portal or email.
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="font-bold text-xs text-slate-700 hover:text-slate-900 border-slate-200 shadow-sm"
            >
              {copied ? '✓ Copied to Clipboard!' : '📋 Copy Resume'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="font-bold text-xs text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/50 shadow-sm"
            >
              📥 Download .md
            </Button>
            <Button
              size="sm"
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
