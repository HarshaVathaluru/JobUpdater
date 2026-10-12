"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function GuidedOnboardingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  if (!isOpen) return null;
  const steps = [
    { title: 'Upload and review your resume', body: 'Upload a PDF or DOCX from the Profile page. Check the extracted name, skills, experience, and education for parsing mistakes.', href: '/profile', action: 'Open Profile' },
    { title: 'Set the jobs you want', body: 'Add target roles, locations, and work mode in Preferences. Discovery searches the public feeds using those saved criteria.', href: '/preferences', action: 'Set Preferences' },
    { title: 'Review jobs and apply on the employer site', body: 'Match percentages are keyword coverage estimates. Portal automation may fill supported fields, but an application is counted as submitted only after a confirmation appears.', href: '/jobs', action: 'Review Jobs' },
  ];
  const current = steps[step - 1];

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70" role="dialog" aria-modal="true">
    <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
      <header className="p-6 bg-slate-900 text-white flex justify-between items-start">
        <div><span className="text-xs text-slate-300">Step {step} of {steps.length}</span><h2 className="text-xl font-bold mt-1">{current.title}</h2></div>
        <button onClick={onClose} aria-label="Close onboarding">✕</button>
      </header>
      <div className="p-6 space-y-6"><p className="text-sm text-slate-700">{current.body}</p><div className="flex justify-between items-center">
        <Button variant="outline" size="sm" disabled={step === 1} onClick={() => setStep((value) => value - 1)}>Previous</Button>
        <div className="flex gap-2">{step < steps.length ? <Button size="sm" onClick={() => setStep((value) => value + 1)}>Next</Button> : <Link href={current.href} onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{current.action}</Link>}</div>
      </div></div>
    </div>
  </div>;
}
