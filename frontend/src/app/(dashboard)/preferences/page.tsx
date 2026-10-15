"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';

interface PortalAccountConfig {
  email?: string;
  username?: string;
  password?: string;
  linked?: boolean;
}

interface PortalAccountsState {
  linkedin: PortalAccountConfig;
  shine: PortalAccountConfig;
  indeed: PortalAccountConfig;
  naukri: PortalAccountConfig;
  universal: PortalAccountConfig;
  [key: string]: PortalAccountConfig;
}

const defaultPortalAccounts: PortalAccountsState = {
  linkedin: { email: '', password: '' },
  shine: { email: '', password: '' },
  indeed: { email: '', password: '' },
  naukri: { email: '', password: '' },
  universal: { email: '', password: '' },
};

export default function PreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const { success, error: toastError, info } = useToast();

  const [rolesInput, setRolesInput] = useState('');
  const [locationsInput, setLocationsInput] = useState('');
  const [workMode, setWorkMode] = useState('ANY');
  const [minimumSalary, setMinimumSalary] = useState('');
  const [willingToRelocate, setWillingToRelocate] = useState(false);
  const [autoApplyPolicy, setAutoApplyPolicy] = useState('REVIEW_FIRST');

  // Multi-portal credentials & session state
  const [portalAccounts, setPortalAccounts] = useState<PortalAccountsState>(defaultPortalAccounts);
  const [portalPassword, setPortalPassword] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [linkedPortals, setLinkedPortals] = useState<Record<string, boolean>>({});
  const [activePortalLaunching, setActivePortalLaunching] = useState<string | null>(null);
  const [customPortalUrl, setCustomPortalUrl] = useState('');

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const pref: any = await api.get('/candidate/preferences');
        if (pref) {
          setRolesInput((pref.targetRoles || []).join(', '));
          setLocationsInput((pref.preferredLocations || []).join(', '));
          setWorkMode(pref.workMode || 'ANY');
          setMinimumSalary(pref.minimumSalary ? String(pref.minimumSalary) : '');
          setWillingToRelocate(!!pref.willingToRelocate);
          setAutoApplyPolicy(pref.autoApplyPolicy || 'REVIEW_FIRST');
          setPortalPassword(pref.portalPassword || '');

          if (pref.portalAccounts && typeof pref.portalAccounts === 'object') {
            setPortalAccounts({
              linkedin: { ...defaultPortalAccounts.linkedin, ...(pref.portalAccounts.linkedin || {}) },
              shine: { ...defaultPortalAccounts.shine, ...(pref.portalAccounts.shine || {}) },
              indeed: { ...defaultPortalAccounts.indeed, ...(pref.portalAccounts.indeed || {}) },
              naukri: { ...defaultPortalAccounts.naukri, ...(pref.portalAccounts.naukri || {}) },
              universal: { ...defaultPortalAccounts.universal, ...(pref.portalAccounts.universal || {}) },
            });
          }
        }
        const session: any = await api.get('/browser/session-status').catch(() => null);
        if (session?.hasSession) {
          setSessionActive(true);
        }
        if (session?.linkedPortals) {
          setLinkedPortals(session.linkedPortals);
        }
      } catch (err) {
        console.error('Failed to load preferences', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const isPortalLinked = (key: string) => {
    const k = key.toLowerCase().replace(/[^a-z]/g, '');
    const acc = portalAccounts[k];
    return Boolean(linkedPortals[k] || (acc?.email && acc?.password) || acc?.linked);
  };

  const togglePortalConnected = (key: string) => {
    const k = key.toLowerCase().replace(/[^a-z]/g, '');
    const currentlyConnected = isPortalLinked(k);
    const updated = !currentlyConnected;
    setLinkedPortals((prev) => ({ ...prev, [k]: updated }));
    setPortalAccounts((prev) => ({
      ...prev,
      [k]: {
        ...(prev[k] || {}),
        linked: updated,
      },
    }));
    success(`${key} marked as ${updated ? 'Connected' : 'Not Connected'}! Remember to click Save below.`, updated ? 'Connected' : 'Updated');
  };

  const handleLaunchSession = async (portalKey: string, targetUrl: string, email?: string, password?: string) => {
    setActivePortalLaunching(portalKey);
    try {
      info(`Opening ${portalKey} and autofilling your credentials...`, 'Connecting Account');
      const res: any = await api.post('/browser/interactive-session', {
        targetUrl,
        portalKey,
        email: email || '',
        password: password || '',
      });
      const msg = res?.message || `Chromium window opened! Connected to ${portalKey} and session saved.`;
      success(msg, 'Connected');
      setSessionActive(true);
      const k = portalKey.toLowerCase().replace(/[^a-z]/g, '');
      setLinkedPortals((prev) => ({ ...prev, [k]: true }));
      setMessage(msg);
    } catch (e: any) {
      const err = e?.response?.data?.message || e?.message || 'Could not launch interactive browser session.';
      toastError(err, 'Browser Launch Error');
      setMessage(err);
    } finally {
      setActivePortalLaunching(null);
    }
  };

  const updateAccountField = (portalKey: keyof PortalAccountsState, field: 'email' | 'username' | 'password', val: string) => {
    setPortalAccounts((prev) => ({
      ...prev,
      [portalKey]: {
        ...(prev[portalKey] || {}),
        [field]: val,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const targetRoles = rolesInput
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
      const preferredLocations = locationsInput
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);

      const effectivePassword = portalAccounts.universal?.password || portalPassword || portalAccounts.linkedin?.password || '';

      // Mark linked in payload for portals with credentials
      const updatedAccounts: any = { ...portalAccounts };
      for (const key of ['linkedin', 'shine', 'indeed', 'naukri', 'universal']) {
        if (updatedAccounts[key]?.email || updatedAccounts[key]?.password || linkedPortals[key]) {
          updatedAccounts[key] = {
            ...updatedAccounts[key],
            linked: true,
          };
        }
      }

      await api.post('/candidate/preferences', {
        targetRoles,
        preferredLocations,
        workMode,
        minimumSalary: minimumSalary ? parseInt(minimumSalary, 10) : null,
        willingToRelocate,
        autoApplyPolicy,
        portalPassword: effectivePassword,
        portalAccounts: updatedAccounts,
      });

      // Update linked state locally
      const updatedLinked: Record<string, boolean> = { ...linkedPortals };
      for (const [key, acc] of Object.entries(updatedAccounts)) {
        if ((acc as any)?.email || (acc as any)?.password || (acc as any)?.linked) {
          updatedLinked[key.toLowerCase()] = true;
        }
      }
      setLinkedPortals(updatedLinked);

      success('Preferences & portal credentials saved! Portals are marked as Connected.', 'Connected');
      setMessage('Preferences & all portal credentials saved successfully! Portals are Connected.');
    } catch (err: any) {
      console.error('Failed to save preferences', err);
      const errMessage = err?.response?.data?.message || err?.message || 'Failed to save preferences.';
      toastError(errMessage, 'Error Saving');
      setMessage(errMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loading size="lg" />
        <p className="text-xs text-slate-400 font-medium">Loading search & matching preferences...</p>
      </div>
    );
  }

  const connectedCount = ['linkedin', 'shine', 'indeed', 'naukri'].filter((k) => isPortalLinked(k)).length;

  const activeFeeds = [
    { name: 'LinkedIn Verified', desc: 'Live entry/associate roles (1-2 days)', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: 'in', key: 'linkedin' },
    { name: 'Shine.com India', desc: 'Verified fresher & junior positions', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: '★', key: 'shine' },
    { name: 'Indeed India', desc: 'Domestic tech vacancies', color: 'text-cyan-700 bg-cyan-50 border-cyan-200', icon: '💼', key: 'indeed' },
    { name: 'Naukri.com India', desc: 'Enterprise IT vacancies', color: 'text-purple-700 bg-purple-50 border-purple-200', icon: 'N', key: 'naukri' },
    { name: 'Remotive', desc: 'Global remote tech roles', color: 'text-indigo-700 bg-indigo-50 border-indigo-200', icon: '🌐', key: 'universal' },
    { name: 'Jobicy', desc: 'Developer & QA opportunities', color: 'text-pink-700 bg-pink-50 border-pink-200', icon: '⚡', key: 'universal' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl shadow-slate-900/10 border border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            Dynamic Targeting & Authentication Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Search & Portal Preferences</h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            Save portal credentials for LinkedIn, Shine, Indeed, and Naukri. Click Auto-Login to connect your accounts directly in Chromium and persist your sessions.
          </p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-xs font-bold border flex items-center justify-between ${
          message.includes('success') || message.includes('opened') || message.includes('autofilled') || message.includes('Connected')
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-blue-50 text-blue-800 border-blue-200'
        }`}>
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: SEARCH & TARGET CRITERIA */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-base font-bold text-slate-900">Search & Target Criteria</h3>
            <p className="text-xs text-slate-500 mt-0.5">Define which positions and locations the AI connectors prioritize for you.</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Target Roles (comma-separated)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Software Engineer, Full Stack Developer, Frontend Engineer"
                  value={rolesInput}
                  onChange={(e) => setRolesInput(e.target.value)}
                  className="rounded-xl bg-slate-50 border-slate-200 text-xs font-medium"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Job connectors match vacancy titles against your resume and these keywords.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Preferred Locations (comma-separated)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Bangalore, Hyderabad, Pune, Remote"
                  value={locationsInput}
                  onChange={(e) => setLocationsInput(e.target.value)}
                  className="rounded-xl bg-slate-50 border-slate-200 text-xs font-medium"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Specify city names or "Remote" to prioritize local listings.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Work Mode Preference
                </label>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ANY">Any / Open to all</option>
                  <option value="REMOTE">Remote Only</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="ONSITE">On-site</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Minimum Desired Salary (Annual / INR)
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 600000"
                  value={minimumSalary}
                  onChange={(e) => setMinimumSalary(e.target.value)}
                  className="rounded-xl bg-slate-50 border-slate-200 text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="relocate"
                checked={willingToRelocate}
                onChange={(e) => setWillingToRelocate(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="relocate" className="text-xs font-bold text-slate-700 cursor-pointer">
                Willing to relocate for the right opportunity
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 2: PORTAL CREDENTIALS & PERSISTENT SESSION LINKING */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🔐</span> Job Portal Credentials & Automated Session Linking
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Provide credentials for each portal. Click <strong>"Auto-Login & Connect"</strong> to launch the browser and link your session automatically.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-black px-3 py-1.5 rounded-xl border ${
                connectedCount > 0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {connectedCount} of 4 Portals Connected
              </span>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                <span className={`w-2.5 h-2.5 rounded-full ${sessionActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                <span className="text-xs font-bold text-slate-700">
                  {sessionActive ? 'Browser Profile Active' : 'No Active Session'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 border border-blue-200/70 text-xs text-slate-700 space-y-1.5">
              <div className="font-extrabold text-blue-900 flex items-center gap-1.5">
                <span>⚡</span> Instant Auto-Login & Connection Guarantee:
              </div>
              <p className="leading-relaxed">
                Enter your credentials below and click <strong>"Auto-Login & Connect"</strong>. The agent opens the portal in Chromium, automatically types your email/mobile and password, and submits login. Once connected, the portal displays <strong>"✓ Connected"</strong> and future job applications apply automatically!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 1. LinkedIn */}
              <div className={`p-5 rounded-2xl border shadow-xs space-y-3 transition-all flex flex-col justify-between ${
                isPortalLinked('linkedin')
                  ? 'bg-emerald-50/20 border-emerald-300 ring-1 ring-emerald-400/20'
                  : 'bg-white border-slate-200 hover:border-blue-400'
              }`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#0077B5] text-white font-black text-sm flex items-center justify-center">
                        in
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">LinkedIn</h4>
                        <p className="text-[11px] text-slate-500">Live Easy Apply & vacancies</p>
                      </div>
                    </div>
                    {isPortalLinked('linkedin') ? (
                      <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        ✓ Connected
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        Not Connected
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">LinkedIn Email / Username</label>
                      <Input
                        type="text"
                        placeholder="e.g. name@example.com"
                        value={portalAccounts.linkedin?.email || ''}
                        onChange={(e) => updateAccountField('linkedin', 'email', e.target.value)}
                        className="rounded-xl bg-slate-50 border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">LinkedIn Password</label>
                      <Input
                        type="password"
                        placeholder="LinkedIn account password"
                        value={portalAccounts.linkedin?.password || ''}
                        onChange={(e) => updateAccountField('linkedin', 'password', e.target.value)}
                        className="rounded-xl bg-slate-50 border-slate-200 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleLaunchSession(
                        'LinkedIn',
                        'https://www.linkedin.com/login',
                        portalAccounts.linkedin?.email,
                        portalAccounts.linkedin?.password,
                      )
                    }
                    disabled={activePortalLaunching === 'LinkedIn'}
                    className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all ${
                      isPortalLinked('linkedin')
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
                    }`}
                  >
                    <span>{isPortalLinked('linkedin') ? '✓' : '⚡'}</span>
                    {activePortalLaunching === 'LinkedIn'
                      ? 'Connecting & Launching...'
                      : isPortalLinked('linkedin')
                      ? 'Connected • Open / Re-sync Session'
                      : 'Auto-Login & Connect LinkedIn'}
                  </button>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <button
                      type="button"
                      onClick={() => handleLaunchSession('LinkedIn', 'https://www.linkedin.com/login')}
                      className="hover:text-slate-800 font-medium"
                    >
                      Open Manual Window ↗
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePortalConnected('linkedin')}
                      className="font-bold text-blue-600 hover:text-blue-800"
                    >
                      {isPortalLinked('linkedin') ? 'Mark Disconnected' : 'Mark Connected ✓'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Shine.com */}
              <div className={`p-5 rounded-2xl border shadow-xs space-y-3 transition-all flex flex-col justify-between ${
                isPortalLinked('shine')
                  ? 'bg-emerald-50/20 border-emerald-300 ring-1 ring-emerald-400/20'
                  : 'bg-white border-slate-200 hover:border-amber-400'
              }`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-white font-black text-sm flex items-center justify-center">
                        ★
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">Shine.com India</h4>
                        <p className="text-[11px] text-slate-500">Fresher & junior engineer roles</p>
                      </div>
                    </div>
                    {isPortalLinked('shine') ? (
                      <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        ✓ Connected
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        Not Connected
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Shine Email / Mobile</label>
                      <Input
                        type="text"
                        placeholder="e.g. 7013276091 or email@example.com"
                        value={portalAccounts.shine?.email || ''}
                        onChange={(e) => updateAccountField('shine', 'email', e.target.value)}
                        className="rounded-xl bg-slate-50 border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Shine Password</label>
                      <Input
                        type="password"
                        placeholder="Shine account password"
                        value={portalAccounts.shine?.password || ''}
                        onChange={(e) => updateAccountField('shine', 'password', e.target.value)}
                        className="rounded-xl bg-slate-50 border-slate-200 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleLaunchSession(
                        'Shine',
                        'https://www.shine.com/myshine/login/',
                        portalAccounts.shine?.email,
                        portalAccounts.shine?.password,
                      )
                    }
                    disabled={activePortalLaunching === 'Shine'}
                    className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all ${
                      isPortalLinked('shine')
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
                        : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-500/20'
                    }`}
                  >
                    <span>{isPortalLinked('shine') ? '✓' : '⚡'}</span>
                    {activePortalLaunching === 'Shine'
                      ? 'Connecting & Launching...'
                      : isPortalLinked('shine')
                      ? 'Connected • Open / Re-sync Session'
                      : 'Auto-Login & Connect Shine'}
                  </button>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <button
                      type="button"
                      onClick={() => handleLaunchSession('Shine', 'https://www.shine.com/myshine/login/')}
                      className="hover:text-slate-800 font-medium"
                    >
                      Open Manual Window ↗
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePortalConnected('shine')}
                      className="font-bold text-amber-700 hover:text-amber-900"
                    >
                      {isPortalLinked('shine') ? 'Mark Disconnected' : 'Mark Connected ✓'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Indeed India */}
              <div className={`p-5 rounded-2xl border shadow-xs space-y-3 transition-all flex flex-col justify-between ${
                isPortalLinked('indeed')
                  ? 'bg-emerald-50/20 border-emerald-300 ring-1 ring-emerald-400/20'
                  : 'bg-white border-slate-200 hover:border-cyan-400'
              }`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-cyan-600 text-white font-black text-sm flex items-center justify-center">
                        💼
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">Indeed India</h4>
                        <p className="text-[11px] text-slate-500">Direct employer and tech listings</p>
                      </div>
                    </div>
                    {isPortalLinked('indeed') ? (
                      <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        ✓ Connected
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        Not Connected
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Indeed Email / Username</label>
                      <Input
                        type="text"
                        placeholder="e.g. name@example.com"
                        value={portalAccounts.indeed?.email || ''}
                        onChange={(e) => updateAccountField('indeed', 'email', e.target.value)}
                        className="rounded-xl bg-slate-50 border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Indeed Password</label>
                      <Input
                        type="password"
                        placeholder="Indeed account password"
                        value={portalAccounts.indeed?.password || ''}
                        onChange={(e) => updateAccountField('indeed', 'password', e.target.value)}
                        className="rounded-xl bg-slate-50 border-slate-200 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleLaunchSession(
                        'Indeed',
                        'https://secure.indeed.com/account/login',
                        portalAccounts.indeed?.email,
                        portalAccounts.indeed?.password,
                      )
                    }
                    disabled={activePortalLaunching === 'Indeed'}
                    className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all ${
                      isPortalLinked('indeed')
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
                        : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/20'
                    }`}
                  >
                    <span>{isPortalLinked('indeed') ? '✓' : '⚡'}</span>
                    {activePortalLaunching === 'Indeed'
                      ? 'Connecting & Launching...'
                      : isPortalLinked('indeed')
                      ? 'Connected • Open / Re-sync Session'
                      : 'Auto-Login & Connect Indeed'}
                  </button>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <button
                      type="button"
                      onClick={() => handleLaunchSession('Indeed', 'https://secure.indeed.com/account/login')}
                      className="hover:text-slate-800 font-medium"
                    >
                      Open Manual Window ↗
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePortalConnected('indeed')}
                      className="font-bold text-cyan-700 hover:text-cyan-900"
                    >
                      {isPortalLinked('indeed') ? 'Mark Disconnected' : 'Mark Connected ✓'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Naukri.com */}
              <div className={`p-5 rounded-2xl border shadow-xs space-y-3 transition-all flex flex-col justify-between ${
                isPortalLinked('naukri')
                  ? 'bg-emerald-50/20 border-emerald-300 ring-1 ring-emerald-400/20'
                  : 'bg-white border-slate-200 hover:border-purple-400'
              }`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-600 text-white font-black text-sm flex items-center justify-center">
                        N
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">Naukri.com</h4>
                        <p className="text-[11px] text-slate-500">Major Indian enterprise IT vacancies</p>
                      </div>
                    </div>
                    {isPortalLinked('naukri') ? (
                      <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        ✓ Connected
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        Not Connected
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Naukri Email / Username</label>
                      <Input
                        type="text"
                        placeholder="e.g. hr001@example.com or 7013276091"
                        value={portalAccounts.naukri?.email || ''}
                        onChange={(e) => updateAccountField('naukri', 'email', e.target.value)}
                        className="rounded-xl bg-slate-50 border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Naukri Password</label>
                      <Input
                        type="password"
                        placeholder="Naukri account password"
                        value={portalAccounts.naukri?.password || ''}
                        onChange={(e) => updateAccountField('naukri', 'password', e.target.value)}
                        className="rounded-xl bg-slate-50 border-slate-200 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleLaunchSession(
                        'Naukri',
                        'https://www.naukri.com/nlogin/login',
                        portalAccounts.naukri?.email,
                        portalAccounts.naukri?.password,
                      )
                    }
                    disabled={activePortalLaunching === 'Naukri'}
                    className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all ${
                      isPortalLinked('naukri')
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/20'
                    }`}
                  >
                    <span>{isPortalLinked('naukri') ? '✓' : '⚡'}</span>
                    {activePortalLaunching === 'Naukri'
                      ? 'Connecting & Launching...'
                      : isPortalLinked('naukri')
                      ? 'Connected • Open / Re-sync Session'
                      : 'Auto-Login & Connect Naukri'}
                  </button>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <button
                      type="button"
                      onClick={() => handleLaunchSession('Naukri', 'https://www.naukri.com/nlogin/login')}
                      className="hover:text-slate-800 font-medium"
                    >
                      Open Manual Window ↗
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePortalConnected('naukri')}
                      className="font-bold text-purple-700 hover:text-purple-900"
                    >
                      {isPortalLinked('naukri') ? 'Mark Disconnected' : 'Mark Connected ✓'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Universal ATS & Employer Career Portals */}
            <div className={`p-5 rounded-2xl border space-y-4 transition-all ${
              isPortalLinked('universal')
                ? 'bg-emerald-50/20 border-emerald-300 ring-1 ring-emerald-400/20'
                : 'bg-gradient-to-br from-slate-50 to-indigo-50/40 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>🏢</span> Universal ATS & Company Portals (Workday, Greenhouse, Ashby, Lever, BambooHR)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Used as the default fallback credentials whenever an employer portal requires candidate account creation or sign-in.
                  </p>
                </div>
                {isPortalLinked('universal') ? (
                  <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    ✓ Connected
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    Fallback Ready
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Default Portal Email</label>
                  <Input
                    type="text"
                    placeholder="e.g. candidate@example.com"
                    value={portalAccounts.universal?.email || ''}
                    onChange={(e) => updateAccountField('universal', 'email', e.target.value)}
                    className="rounded-xl bg-white border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Default Portal Password</label>
                  <Input
                    type="password"
                    placeholder="Password used to auto-create or log into company portals"
                    value={portalAccounts.universal?.password || portalPassword || ''}
                    onChange={(e) => {
                      updateAccountField('universal', 'password', e.target.value);
                      setPortalPassword(e.target.value);
                    }}
                    className="rounded-xl bg-white border-slate-200 text-xs"
                  />
                </div>
              </div>

              {/* Custom Portal Session Opener */}
              <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="Or enter any custom portal/career page URL (e.g. https://jobs.ashbyhq.com/...)"
                  value={customPortalUrl}
                  onChange={(e) => setCustomPortalUrl(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleLaunchSession(
                      'Custom Portal',
                      customPortalUrl || 'https://www.linkedin.com/login',
                      portalAccounts.universal?.email,
                      portalAccounts.universal?.password || portalPassword,
                    )
                  }
                  disabled={activePortalLaunching === 'Custom Portal'}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>🚀</span> {activePortalLaunching === 'Custom Portal' ? 'Connecting...' : 'Auto-Login & Connect Portal'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: AUTOMATION POLICY */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-base font-bold text-slate-900">Application Dispatch Policy</h3>
            <p className="text-xs text-slate-500 mt-0.5">Control how autonomous the agent acts when high match scores are found.</p>
          </div>

          <div className="p-6 space-y-3">
            <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="radio"
                name="policy"
                value="AUTO_SUBMIT"
                checked={autoApplyPolicy === 'AUTO_SUBMIT'}
                onChange={(e) => setAutoApplyPolicy(e.target.value)}
                className="mt-1 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-bold text-xs text-slate-900">Fully Autonomous Auto-Apply</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Automatically prepare resume, cover letter, and submit applications for jobs matching score &gt;= 70%.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="radio"
                name="policy"
                value="REVIEW_FIRST"
                checked={autoApplyPolicy === 'REVIEW_FIRST'}
                onChange={(e) => setAutoApplyPolicy(e.target.value)}
                className="mt-1 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-bold text-xs text-slate-900">Review Tailored Packet First (Recommended)</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Prepare tailored resume and cover letter, inspect portal fields, but require your 1-click confirmation before submission.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="radio"
                name="policy"
                value="MANUAL"
                checked={autoApplyPolicy === 'MANUAL'}
                onChange={(e) => setAutoApplyPolicy(e.target.value)}
                className="mt-1 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-bold text-xs text-slate-900">Manual / Assisted</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Generate tailored documents and match analysis only. You fill and submit the application manually.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">
            Click Save to persist your credentials and mark all entered portals as Connected.
          </p>
          <Button
            type="submit"
            isLoading={saving}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl px-7 py-3 shadow-md shadow-blue-600/20"
          >
            Save All Preferences & Credentials
          </Button>
        </div>
      </form>

      {/* Active Feeds Overview */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-base font-bold text-slate-900">Active Job Feeds & Portals</h3>
          <p className="text-xs text-slate-500 mt-0.5">These verified public sources are scanned in real-time when discovery runs.</p>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeFeeds.map((source) => {
            const connected = isPortalLinked(source.key);
            return (
              <div key={source.name} className={`p-4 rounded-2xl border shadow-xs flex items-center justify-between transition-all ${
                connected ? 'bg-emerald-50/20 border-emerald-200' : 'bg-white border-slate-200/90'
              }`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border ${source.color}`}>
                    {source.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs truncate">{source.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{source.desc}</div>
                  </div>
                </div>
                {connected ? (
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Connected
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    Active Feed
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
