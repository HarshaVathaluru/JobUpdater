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
    } catch { setVersions([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (tab === 'COPIES') void fetchVersions(); }, [tab]);

  return <main className="max-w-6xl mx-auto space-y-6">
    <header><h1 className="text-2xl font-black">Resume</h1><p className="text-sm text-slate-600">Parsed fields can contain errors. Resume copies preserve the extracted source text and do not claim an employer ATS score.</p></header>
    <div className="flex gap-2"><Button variant={tab === 'MASTER' ? 'primary' : 'outline'} onClick={() => setTab('MASTER')}>Uploaded resume</Button><Button variant={tab === 'COPIES' ? 'primary' : 'outline'} onClick={() => setTab('COPIES')}>Resume copies ({versions.length})</Button></div>
    {tab === 'MASTER' ? <div className="space-y-6"><ResumeUpload onUploadSuccess={() => setRefresh((value) => value + 1)} /><CandidateProfileDisplay refreshTrigger={refresh} /></div> : <section className="space-y-4">
      <div className="flex justify-between items-center"><h2 className="font-bold">Saved copies</h2><Button size="sm" variant="outline" onClick={() => void fetchVersions()}>Refresh</Button></div>
      {loading ? <p>Loading…</p> : versions.length ? versions.map((version) => {
        const data: TailoredResumeData = { jobTitle: version.metadata?.jobTitle || 'Role', company: version.metadata?.company || 'Company', content: version.content || '' };
        return <article key={version.id} className="p-4 bg-white border rounded-xl flex justify-between items-center"><div><h3 className="font-bold">{data.jobTitle}</h3><p className="text-sm text-slate-600">{data.company} · {version.createdAt ? new Date(version.createdAt).toLocaleDateString() : ''}</p></div><Button size="sm" onClick={() => setSelected(data)}>View copy</Button></article>;
      }) : <p className="p-6 bg-white border rounded-xl text-sm">No resume copies saved. Create one from a job after reviewing its requirements.</p>}
    </section>}
    <TailoredResumeModal isOpen={Boolean(selected)} data={selected} onClose={() => setSelected(null)} />
  </main>;
}
