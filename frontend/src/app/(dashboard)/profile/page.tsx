"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ResumeUpload } from '@/components/profile/resume-upload';
import { CandidateProfileDisplay } from '@/components/profile/candidate-profile-display';

export default function Profile() {
  const { user } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Candidate Profile & Grounding</h1>
          <p className="text-sm text-slate-500 font-medium">Verified source of truth for resume tailoring and autonomous job matching</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 shadow-sm self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Factual Truth Engine Active
        </div>
      </div>

      {/* Trust & Safety Grounding Guarantee Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white shadow-md border border-indigo-800/40 space-y-2">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-xl bg-blue-500/20 text-blue-300 font-bold text-sm">🛡️</span>
          <h3 className="text-sm font-bold text-white tracking-wide">Zero Hallucination Factual Integrity Guarantee</h3>
        </div>
        <p className="text-xs text-indigo-100/90 leading-relaxed max-w-4xl">
          AutoApply strictly grounds all resume rewrites and cover letters on your verified master experience. The system will <strong className="text-white">never fabricate past employers, invent unearned degrees, or add fake years of experience</strong>. Tailoring aligns relevant existing achievements to the job description without compromising factual integrity.
        </p>
      </div>

      {/* Account Info & Career Discovery Preferences */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden lg:col-span-1">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>👤</span> Account Details
            </h3>
          </CardHeader>
          <CardBody className="p-6 space-y-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Full Name</dt>
              <dd className="mt-1 text-sm font-bold text-slate-900">{user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Harsha Vardhan Reddy'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email Address</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800 break-all">{user?.email || 'vathaluruharshavardhan@gmail.com'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Primary Phone</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">+91 7013276091</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Home Region</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">Andhra Pradesh, India (Open to Relocate)</dd>
            </div>
          </CardBody>
        </Card>

        {/* Discovery Preferences */}
        <Card className="rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden lg:col-span-2">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>🎯</span> Active Career Match Preferences
            </h3>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              Auto-Matched Daily
            </span>
          </CardHeader>
          <CardBody className="p-6 space-y-5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Target Roles</span>
              <div className="flex flex-wrap gap-1.5">
                {['Senior Java Full-Stack Engineer', 'Full Stack Developer (Next.js / Node.js)', 'Software Engineer', 'Automation & QA Engineer'].map((role) => (
                  <span key={role} className="px-3 py-1 rounded-xl bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200">
                    {role}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Target Cities & Locations</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Bengaluru', 'Hyderabad', 'Pune', 'Andhra Pradesh', 'Remote Worldwide'].map((loc) => (
                    <span key={loc} className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                      📍 {loc}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Work Modes</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                    🏢 Onsite (India)
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200">
                    ⚡ Hybrid (2-3 days)
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 text-xs font-bold border border-purple-200">
                    🌐 Remote Global
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              <span>Notice Period: <strong className="text-slate-800">Immediate / 30 Days</strong></span>
              <span>Desired Compensation: <strong className="text-slate-800">Competitive (Market Standard)</strong></span>
            </div>
          </CardBody>
        </Card>
      </div>

      <ResumeUpload onUploadSuccess={handleUploadSuccess} />
      
      <CandidateProfileDisplay refreshTrigger={refreshTrigger} />
    </div>
  );
}

