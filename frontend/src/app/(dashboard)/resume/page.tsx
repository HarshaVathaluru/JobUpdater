"use client";

import React, { useEffect, useState } from 'react';
import { ResumeUpload } from '@/components/profile/resume-upload';
import { CandidateProfileDisplay } from '@/components/profile/candidate-profile-display';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { TailoredResumeModal, TailoredResumeData } from '@/components/jobs/tailored-resume-modal';

export default function ResumePage() {
  const [tab, setTab] = useState<'MASTER' | 'COPIES'>('MASTER');
  const [refresh, setRefresh] = useState(0);
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<TailoredResumeData | null>(null);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const response: any = await api.get('/resume-tailoring');
      setVersions(Array.isArray(response) ? response : response?.data || []);
    } catch {
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'COPIES') void fetchVersions();
  }, [tab]);

  return (
    <main className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-7 rounded-3xl text-white shadow-xl shadow-slate-900/10 border border-slate-700/50">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            Profile Grounding & Tailored Copies
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Resume Studio</h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Manage your master candidate profile and inspect tailored resume copies synthesized for specific employer vacancies.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="p-1.5 bg-white/10 backdrop-blur-md rounded-2xl flex items-center gap-1.5 border border-white/10">
          <button
            onClick={() => setTab('MASTER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              tab === 'MASTER'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>📄</span> Master Profile
          </button>
          <button
            onClick={() => setTab('COPIES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              tab === 'COPIES'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>📑</span> Tailored Copies ({versions.length})
          </button>
        </div>
      </div>

      {tab === 'MASTER' ? (
        <div className="space-y-6">
          <ResumeUpload onUploadSuccess={() => setRefresh((value) => value + 1)} />
          <CandidateProfileDisplay refreshTrigger={refresh} />
        </div>
      ) : (
        <section className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Saved Role-Specific Copies</h2>
              <p className="text-xs text-slate-500 mt-0.5">Resume copies created and tailored for specific job listings.</p>
            </div>
            <button
              onClick={() => void fetchVersions()}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span>🔄</span> Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 font-semibold bg-white rounded-2xl border border-slate-200">
              Loading tailored resume records...
            </div>
          ) : versions.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {versions.map((version) => {
                const data: TailoredResumeData = {
                  jobTitle: version.metadata?.jobTitle || 'Role',
                  company: version.metadata?.company || 'Company',
                  content: version.content || '',
                };
                return (
                  <article
                    key={version.id}
                    className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center uppercase shadow-xs">
                          {data.company ? data.company.charAt(0) : 'R'}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm">
                            {data.jobTitle}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">
                            {data.company} • {version.createdAt ? new Date(version.createdAt).toLocaleDateString() : 'Recent'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Tailored Copy
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                      <Button
                        size="sm"
                        onClick={() => setSelected(data)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
                      >
                        📄 View Full Copy
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="p-12 bg-white border border-dashed border-slate-200 rounded-3xl text-center space-y-3 max-w-lg mx-auto">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shadow-xs">
                📄
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Tailored Resume Copies Yet</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                When you explore a listing on the Discovered Jobs page, click "Create Resume Copy" to tailor an aligned version for that vacancy.
              </p>
            </div>
          )}
        </section>
      )}

      <TailoredResumeModal isOpen={Boolean(selected)} data={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
