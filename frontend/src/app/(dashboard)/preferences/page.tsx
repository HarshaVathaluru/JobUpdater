"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { api } from '@/lib/api-client';

export default function PreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [rolesInput, setRolesInput] = useState('');
  const [locationsInput, setLocationsInput] = useState('');
  const [workMode, setWorkMode] = useState('ANY');
  const [minimumSalary, setMinimumSalary] = useState('');
  const [willingToRelocate, setWillingToRelocate] = useState(false);
  const [autoApplyPolicy, setAutoApplyPolicy] = useState('REVIEW_FIRST');

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
        }
      } catch (err) {
        console.error('Failed to load preferences', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, []);

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

      await api.post('/candidate/preferences', {
        targetRoles,
        preferredLocations,
        workMode,
        minimumSalary: minimumSalary ? parseInt(minimumSalary, 10) : null,
        willingToRelocate,
        autoApplyPolicy,
      });

      setMessage('Preferences saved successfully!');
    } catch (err) {
      console.error('Failed to save preferences', err);
      setMessage('Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardBody>
          <Loading />
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Job & Application Preferences</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure what jobs you want the system to search for and how you want applications to be submitted.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium text-gray-900">Search & Target Criteria</h3>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            {message && (
              <div
                className={`p-3 rounded-md text-sm ${
                  message.includes('success')
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {message}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Roles / Job Titles (comma-separated)
              </label>
              <Input
                type="text"
                placeholder="e.g. Full Stack Developer, Software Engineer, Backend Engineer"
                value={rolesInput}
                onChange={(e) => setRolesInput(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Used dynamically by connectors to discover relevant jobs without hardcoding.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Locations (comma-separated)
              </label>
              <Input
                type="text"
                placeholder="e.g. Bangalore, Hyderabad, Remote"
                value={locationsInput}
                onChange={(e) => setLocationsInput(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Mode</label>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="ANY">Any / Flexible</option>
                  <option value="REMOTE">Remote</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="ONSITE">On-site</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Annual Salary</label>
                <Input
                  type="number"
                  placeholder="e.g. 1200000"
                  value={minimumSalary}
                  onChange={(e) => setMinimumSalary(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-md font-medium text-gray-900 mb-3">Application Policy</h4>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="autoApplyPolicy"
                    value="REVIEW_FIRST"
                    checked={autoApplyPolicy === 'REVIEW_FIRST'}
                    onChange={(e) => setAutoApplyPolicy(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-medium text-sm text-gray-900">Review Before Submission (Recommended)</span>
                    <p className="text-xs text-gray-500">
                      The AI prepares the tailored resume and cover letter, then pauses for your final review before submitting.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="autoApplyPolicy"
                    value="AUTOMATIC"
                    checked={autoApplyPolicy === 'AUTOMATIC'}
                    onChange={(e) => setAutoApplyPolicy(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-medium text-sm text-gray-900">Automatic Where Permitted</span>
                    <p className="text-xs text-gray-500">
                      Automatically submit when permitted by the platform; pauses only for CAPTCHA or unknown sensitive questions.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="autoApplyPolicy"
                    value="MANUAL"
                    checked={autoApplyPolicy === 'MANUAL'}
                    onChange={(e) => setAutoApplyPolicy(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-medium text-sm text-gray-900">Assisted / Manual</span>
                    <p className="text-xs text-gray-500">
                      Generate documents and match analysis only. You fill and submit manually.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="relocate"
                checked={willingToRelocate}
                onChange={(e) => setWillingToRelocate(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="relocate" className="text-sm text-gray-700 cursor-pointer">
                Willing to relocate for the right opportunity
              </label>
            </div>

            <div className="pt-4">
              <Button type="submit" isLoading={saving}>
                Save Preferences
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
