"use client";

import React, { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ResumeUpload } from '@/components/profile/resume-upload';
import { CandidateProfileDisplay } from '@/components/profile/candidate-profile-display';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

export default function Profile() {
  const { user } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [preferences, setPreferences] = useState<any>(null);
  const [profile, setProfile] = useState<any>({ fullName: '', email: '', phone: '', location: '', summary: '', skills: [] });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([api.get('/candidate/preferences'), api.get('/candidate/profile')]).then(([prefs, savedProfile]: any[]) => {
      setPreferences(prefs);
      if (savedProfile) setProfile({ ...savedProfile, skills: Array.isArray(savedProfile.skills) ? savedProfile.skills : [] });
    }).catch(() => setPreferences(null));
  }, [refreshTrigger]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const payload = { ...profile, skills: typeof profile.skills === 'string' ? profile.skills.split(',').map((skill: string) => skill.trim()).filter(Boolean) : profile.skills };
      const saved = await api.put('/candidate/profile', payload);
      setProfile(saved);
      setMessage('Application profile saved. Review it before each application.');
      setRefreshTrigger((value) => value + 1);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Could not save profile.');
    } finally { setSaving(false); }
  };

  const update = (field: string, value: string) => setProfile((current: any) => ({ ...current, [field]: value }));

  return <div className="space-y-6 max-w-5xl mx-auto pb-12">
    <header><h1 className="text-2xl sm:text-3xl font-black text-slate-900">Your profile</h1><p className="text-sm text-slate-600">Check and correct resume-extracted details before applying. The application assistant uses only information saved here and in your uploaded resume.</p></header>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1"><CardHeader><h2 className="font-bold">Account</h2></CardHeader><CardBody className="space-y-3">
        <div><dt className="text-xs text-slate-500">Account name</dt><dd>{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Not set'}</dd></div>
        <div><dt className="text-xs text-slate-500">Account email</dt><dd className="break-all">{user?.email || 'Not set'}</dd></div>
      </CardBody></Card>
      <Card className="lg:col-span-2"><CardHeader><h2 className="font-bold">Saved job preferences</h2></CardHeader><CardBody className="space-y-3 text-sm">
        {!preferences ? <p>No preferences saved. Configure them on the Preferences page.</p> : <>
          <div><span className="text-slate-500">Roles: </span>{preferences.targetRoles?.length ? preferences.targetRoles.join(', ') : 'Not set'}</div>
          <div><span className="text-slate-500">Locations: </span>{preferences.preferredLocations?.length ? preferences.preferredLocations.join(', ') : 'Not set'}</div>
          <div><span className="text-slate-500">Work mode: </span>{preferences.workMode || 'ANY'}</div>
          <div><span className="text-slate-500">Relocation: </span>{preferences.willingToRelocate ? 'Willing' : 'Not selected'}</div>
        </>}
      </CardBody></Card>
    </div>

    <Card><CardHeader><h2 className="font-bold">Application contact details</h2><p className="text-xs text-slate-500">These fields may be used to prefill matching employer form fields. Correct extraction errors here.</p></CardHeader><CardBody>
      <form onSubmit={saveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="text-xs font-semibold">Full name<input required value={profile.fullName || ''} onChange={(event) => update('fullName', event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
        <label className="text-xs font-semibold">Application email<input required type="email" value={profile.email || ''} onChange={(event) => update('email', event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
        <label className="text-xs font-semibold">Phone<input value={profile.phone || ''} onChange={(event) => update('phone', event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
        <label className="text-xs font-semibold">City / location<input value={profile.location || ''} onChange={(event) => update('location', event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
        <label className="text-xs font-semibold sm:col-span-2">Professional summary<textarea rows={4} value={profile.summary || ''} onChange={(event) => update('summary', event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
        <label className="text-xs font-semibold sm:col-span-2">Skills, comma separated<input value={Array.isArray(profile.skills) ? profile.skills.join(', ') : profile.skills || ''} onChange={(event) => update('skills', event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
        <div className="sm:col-span-2 flex items-center gap-3"><Button type="submit" isLoading={saving} className="bg-blue-600 text-white">Save application profile</Button>{message && <p className="text-sm text-slate-600">{message}</p>}</div>
      </form>
    </CardBody></Card>

    <ResumeUpload onUploadSuccess={() => setRefreshTrigger((value) => value + 1)} />
    <CandidateProfileDisplay refreshTrigger={refreshTrigger} />
  </div>;
}
