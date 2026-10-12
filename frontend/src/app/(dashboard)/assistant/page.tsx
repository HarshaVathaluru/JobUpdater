"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

export default function AssistantPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get<any>('/candidate/profile').then((response) => setProfile(response?.data || response || null)).catch(() => setProfile(null)).finally(() => setLoading(false));
  }, []);

  const skills = Array.isArray(profile?.skills) ? profile.skills : [];
  const experience = Array.isArray(profile?.experience) ? profile.experience : [];
  const projects = Array.isArray(profile?.projects) ? profile.projects : [];
  const prompts = [
    ...experience.map((item: any) => `Describe your work as ${item.title || 'this role'}${item.company ? ` at ${item.company}` : ''}. Use an example and outcome from your own experience.`),
    ...projects.map((item: any) => `Explain the problem, your contribution, and the result for the project “${item.name || 'this project'}”.`),
    ...(skills.length ? [`Give a specific example of how you used ${skills[0]} in your work or projects.`] : []),
  ].slice(0, 8);

  return <main className="max-w-4xl mx-auto space-y-6">
    <header><h1 className="text-2xl font-black">Interview practice</h1><p className="text-sm text-slate-600 mt-1">Practice prompts are built from your saved profile. This page does not generate sample answers or claim experience on your behalf.</p></header>
    {loading ? <p>Loading your profile…</p> : !profile ? <p className="p-4 bg-amber-50 border rounded-xl">Upload a resume or complete your profile to get prompts based on your own work history.</p> : <>
      {skills.length > 0 && <section className="p-4 bg-white border rounded-xl"><h2 className="font-bold">Skills on your profile</h2><p className="text-sm mt-2">{skills.join(', ')}</p></section>}
      <section className="p-4 bg-white border rounded-xl space-y-3"><h2 className="font-bold">Practice questions</h2>{prompts.length ? <ol className="list-decimal pl-5 space-y-3">{prompts.map((prompt: string, index: number) => <li key={index}>{prompt}</li>)}</ol> : <p className="text-sm text-slate-600">Your profile has no experience, project, or skill details to build practice prompts from. Check the parsed profile on the Profile page.</p>}</section>
    </>}
  </main>;
}
