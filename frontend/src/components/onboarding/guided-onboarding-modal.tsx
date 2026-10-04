"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface GuidedOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GuidedOnboardingModal({ isOpen, onClose }: GuidedOnboardingModalProps) {
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  const totalSteps = 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with step indicator */}
        <div className="p-6 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300 px-2 py-0.5 rounded bg-white/10">
              Guided Candidate Activation • Step {step} of {totalSteps}
            </span>
            <h2 className="text-xl font-black tracking-tight mt-1">
              {step === 1 && "1. Upload Your Real Resume"}
              {step === 2 && "2. Confirm Verified Candidate Truth"}
              {step === 3 && "3. Configure Career Target Preferences"}
              {step === 4 && "4. Connect Active Job Sources"}
              {step === 5 && "5. Review Matches & Prepare Application"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 flex">
          <div
            className="bg-blue-600 h-full transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          ></div>
        </div>

        {/* Step Content */}
        <div className="p-6 sm:p-8 flex-1 space-y-6 text-slate-700">
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
                <p className="font-bold text-sm">📄 Factual Source of Truth</p>
                <p className="leading-relaxed">
                  AutoApply strictly treats your uploaded PDF/DOCX resume as immutable truth. The system will never fabricate degrees, fake company names, or invent unearned skills.
                </p>
              </div>
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-2 bg-slate-50/50">
                <span className="text-3xl">📁</span>
                <p className="text-sm font-bold text-slate-900">Current Resume: Harsha_Vardhan_Reddy_Resume.pdf</p>
                <p className="text-xs text-emerald-600 font-bold">✓ Successfully Parsed & Structured</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 font-medium">
                Verify the extracted facts that AutoApply will use to ground all tailored resumes and cover letters:
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Candidate</span>
                  <span className="font-bold text-slate-900">Harsha Vardhan Reddy</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Education</span>
                  <span className="font-bold text-slate-900">B.Tech ECE (8.16 CGPA)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Experience</span>
                  <span className="font-bold text-slate-900">Zenitude.ai & Mphasis</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Certifications</span>
                  <span className="font-bold text-slate-900">Deloitte, Tosca, NxtWave</span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 font-medium">
                Set the parameters for daily autonomous job discovery:
              </p>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-bold text-slate-800 block mb-1">Target Roles</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Senior Java Full-Stack Engineer', 'Full Stack Developer', 'Automation QA'].map((r) => (
                      <span key={r} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-semibold border border-blue-200">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-bold text-slate-800 block mb-1">Preferred Work Mode & Cities</span>
                  <p className="text-slate-600">
                    🏢 <strong>Onsite:</strong> Bengaluru, Hyderabad, Pune, Andhra Pradesh | 🌐 <strong>Remote & Hybrid</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 font-medium">
                Discovery engine actively aggregates fresh vacancies across 6 verified platforms:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold flex items-center gap-2">
                  <span>✓</span> LinkedIn Verified Jobs
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold flex items-center gap-2">
                  <span>✓</span> Shine.com (India Onsite)
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold flex items-center gap-2">
                  <span>✓</span> Indeed India Vacancies
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold flex items-center gap-2">
                  <span>✓</span> Remotive Global Tech
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  🎉 Ready to Launch Your Applications!
                </p>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  You have <strong>18 strong ATS matches (≥85%)</strong> awaiting your review right now. You can open any job to inspect the match breakdown, generate a tailored resume with before/after scores, craft a 5-paragraph cover letter, and submit verified application packets.
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <Link
                  href="/jobs"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all"
                >
                  💼 View Matching Jobs Feed →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep((s) => Math.max(s - 1, 1))}
            disabled={step === 1}
            className="text-xs font-semibold rounded-xl"
          >
            ← Previous
          </Button>

          <div className="flex gap-2">
            {step < totalSteps ? (
              <Button
                size="sm"
                onClick={() => setStep((s) => Math.min(s + 1, totalSteps))}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl px-5"
              >
                Next Step →
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onClose}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-5"
              >
                Complete Onboarding ✓
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
