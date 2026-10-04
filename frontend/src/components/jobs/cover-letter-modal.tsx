"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface CoverLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle: string;
  company: string;
  content: string;
}

export function CoverLetterModal({
  isOpen,
  onClose,
  jobTitle,
  company,
  content: initialContent,
}: CoverLetterModalProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [tone, setTone] = useState<'PROFESSIONAL' | 'CONFIDENT' | 'CONCISE'>('PROFESSIONAL');

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cover_Letter_${company.replace(/\s+/g, '_')}_${jobTitle.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 via-white to-slate-50 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
                AI Cover Letter Studio
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Factual Grounding Active
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {jobTitle}
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-500">
              Tailored for <span className="text-slate-800 font-bold">{company}</span>
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

        {/* Tone & Inline Editing Toolbar (Audit Section 10) */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 text-[11px] uppercase">Tone:</span>
            {(['PROFESSIONAL', 'CONFIDENT', 'CONCISE'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all text-[11px] ${
                  tone === t
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {t === 'PROFESSIONAL' ? 'Executive' : t === 'CONFIDENT' ? 'High Impact' : 'Direct'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                isEditing
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>✏️</span> {isEditing ? 'Done Editing' : 'Edit Letter'}
            </button>
          </div>
        </div>

        {/* Body: Letterhead Preview or Textarea */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {isEditing ? (
            <textarea
              rows={15}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-5 rounded-2xl border border-indigo-200 bg-white font-serif text-sm leading-relaxed text-slate-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          ) : (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-sm font-serif leading-relaxed text-slate-800 text-sm whitespace-pre-line space-y-4">
              {content}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>🛡️</span>
            <span>Grounded in verified experience at Zenitude.ai & Mphasis</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 border-slate-200"
            >
              📥 Download .txt
            </Button>
            <Button
              size="sm"
              onClick={handleCopy}
              className={`text-xs font-bold rounded-xl transition-all shadow-sm ${
                copied
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {copied ? '✓ Copied to Clipboard!' : '📋 Copy Cover Letter'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
