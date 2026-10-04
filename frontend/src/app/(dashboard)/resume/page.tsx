"use client";

import React, { useState, useEffect } from 'react';
import { ResumeUpload } from '@/components/profile/resume-upload';
import { CandidateProfileDisplay } from '@/components/profile/candidate-profile-display';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { TailoredResumeModal, TailoredResumeData } from '@/components/jobs/tailored-resume-modal';

export default function ResumePage() {
  const [activeTab, setActiveTab] = useState<'MASTER' | 'TAILORED'>('MASTER');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [tailoredVersions, setTailoredVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedTailoredModal, setSelectedTailoredModal] = useState<TailoredResumeData | null>(null);

  const fetchTailoredVersions = async () => {
    setLoadingVersions(true);
    try {
      const res: any = await api.get('/resume-tailoring');
      const list = Array.isArray(res) ? res : res?.data || [];
      setTailoredVersions(list);
    } catch (e) {
      console.error('Failed to fetch tailored resumes', e);
    } finally {
      setLoadingVersions(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'TAILORED') {
      fetchTailoredVersions();
    }
  }, [activeTab]);

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleOpenTailoredModal = (version: any) => {
    const data: TailoredResumeData = {
      jobTitle: version.metadata?.jobTitle || 'Target Role',
      company: version.metadata?.company || 'Target Employer',
      content: version.content || '',
      beforeScore: version.metadata?.beforeScore || 64,
      afterScore: version.metadata?.afterScore || 95,
      improvement: version.metadata?.improvement || 31,
      injectedKeywords: version.metadata?.injectedKeywords || [],
      tailoringHighlights: version.metadata?.tailoringHighlights || [],
    };
    setSelectedTailoredModal(data);
  };

  const handleDownloadMarkdown = (version: any) => {
    const blob = new Blob([version.content || ''], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const company = (version.metadata?.company || 'Company').replace(/\s+/g, '_');
    const role = (version.metadata?.jobTitle || 'Role').replace(/\s+/g, '_');
    link.download = `Tailored_Resume_${company}_${role}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Resume Studio</h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-xl">
            Manage your verified master resume and explore company-specific tailored versions optimized for ATS keyword density.
          </p>
        </div>

        {/* Tab Controls (Section 9) */}
        <div className="p-1 bg-slate-100 rounded-2xl flex items-center gap-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('MASTER')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'MASTER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📄 Master Resume (Factual Truth)
          </button>
          <button
            onClick={() => setActiveTab('TAILORED')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'TAILORED' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>✨</span> Tailored Resumes Studio ({tailoredVersions.length})
          </button>
        </div>
      </div>

      {activeTab === 'MASTER' ? (
        /* MASTER RESUME WORKSPACE */
        <div className="space-y-6">
          <ResumeUpload onUploadSuccess={handleUploadSuccess} />
          <div className="pt-2">
            <CandidateProfileDisplay refreshTrigger={refreshTrigger} />
          </div>
        </div>
      ) : (
        /* JOB-TAILORED RESUMES STUDIO (Section 9) */
        <div className="space-y-6">
          <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-center justify-between gap-4">
            <div>
              <span className="font-bold block">100% Factual AI Keyword Alignment</span>
              Every tailored resume is created from your verified candidate facts (Zenitude.ai, Mphasis, projects) restructured to pass modern employer ATS screeners.
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchTailoredVersions}
              className="text-xs font-bold border-blue-200 bg-white"
            >
              🔄 Refresh List
            </Button>
          </div>

          {loadingVersions ? (
            <div className="py-20 text-center text-xs text-slate-400">Loading tailored resume studio...</div>
          ) : tailoredVersions.length === 0 ? (
            <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-3">
              <span className="text-4xl block">📄</span>
              <h3 className="text-base font-bold text-slate-800">No tailored resumes generated yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Visit the Discovered Jobs page, pick any vacancy, and click "Tailor Resume" to generate an ATS-optimized version with score boost analytics.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tailoredVersions.map((version) => {
                const before = version.metadata?.beforeScore || 64;
                const after = version.metadata?.afterScore || 96;
                const boost = version.metadata?.improvement || (after - before);
                const role = version.metadata?.jobTitle || 'Software Engineer';
                const company = version.metadata?.company || 'Target Employer';
                const keywords = version.metadata?.injectedKeywords || [];

                return (
                  <div
                    key={version.id}
                    className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {company}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(version.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 line-clamp-1">{role}</h3>
                        <p className="text-xs text-slate-500 font-medium">Target Employer: {company}</p>
                      </div>

                      {/* ATS Score Improvement Banner */}
                      <div className="p-3 bg-slate-900 text-white rounded-2xl flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400">Master: {before}%</span>
                          <span className="text-slate-500">➔</span>
                          <span className="font-extrabold text-emerald-400 text-sm">{after}% ATS</span>
                        </div>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          +{boost}% Boost
                        </span>
                      </div>

                      {/* Keywords Matched */}
                      {keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {keywords.slice(0, 4).map((kw: string, i: number) => (
                            <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              ✓ {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleOpenTailoredModal(version)}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
                      >
                        👁️ View Resume
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadMarkdown(version)}
                        className="text-xs font-bold rounded-xl"
                      >
                        📥 Download .md
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Full Modal Viewer */}
      <TailoredResumeModal
        isOpen={Boolean(selectedTailoredModal)}
        onClose={() => setSelectedTailoredModal(null)}
        data={selectedTailoredModal}
      />
    </div>
  );
}
