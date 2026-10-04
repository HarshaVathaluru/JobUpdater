"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Loading } from '@/components/ui/loading';
import { CandidateProfile } from '@/types';

export function CandidateProfileDisplay({ refreshTrigger }: { refreshTrigger: number }) {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const data = await api.get<{ profile: CandidateProfile }>('/resume/profile');
        setProfile(data.profile);
      } catch (error: any) {
        console.error('Failed to fetch profile', error);
        setFetchError(error?.response?.data?.message || 'Could not load profile details.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <Loading />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-800 text-sm flex items-center gap-3">
        <span className="w-6 h-6 rounded-full bg-rose-200 flex items-center justify-center font-bold text-xs flex-shrink-0">!</span>
        <p>{fetchError}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
        <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-3">
          📄
        </div>
        <h4 className="text-base font-semibold text-gray-900">No profile found</h4>
        <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
          Upload your resume above to extract your full identity, work experience, education, projects, and achievements.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Main Identity & Profile Details Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-medium backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Verified Profile Identity
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {profile.fullName || 'Candidate Name'}
            </h2>
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs md:text-sm text-blue-100 pt-1">
              {profile.email && (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {profile.email}
                </span>
              )}
              {profile.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {profile.phone}
                </span>
              )}
              {profile.location && (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {profile.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      {profile.summary && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
            <h4 className="text-sm font-semibold tracking-wider text-gray-900 uppercase">Professional Summary</h4>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed pl-3.5 border-l-2 border-blue-100">
            {profile.summary}
          </p>
        </div>
      )}

      {/* Technical Skills */}
      {profile.skills && profile.skills.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>
              <h4 className="text-sm font-semibold tracking-wider text-gray-900 uppercase">Skills & Competencies</h4>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 font-medium text-indigo-700">
              {profile.skills.length} skills identified
            </span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {profile.skills.map((skill, i) => (
              <span
                key={i}
                className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-gray-50 text-gray-800 border border-gray-200/80 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Work Experience */}
      {profile.experience && profile.experience.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-sky-600 rounded-full"></span>
            <h4 className="text-sm font-semibold tracking-wider text-gray-900 uppercase">Work Experience</h4>
          </div>
          <div className="space-y-5">
            {profile.experience.map((exp, i) => (
              <div key={i} className="relative pl-6 border-l-2 border-sky-200 group">
                <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-sky-500 ring-4 ring-white"></span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h5 className="text-sm font-bold text-gray-900">{exp.title}</h5>
                  <span className="text-xs font-medium text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full w-fit">
                    {exp.startDate} – {exp.current ? 'Present' : exp.endDate || 'Present'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-gray-600 mt-0.5">{exp.company}</p>
                {exp.description && (
                  <p className="mt-2 text-xs text-gray-600 leading-relaxed bg-gray-50/60 p-3 rounded-xl border border-gray-100">
                    {exp.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {profile.projects && profile.projects.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-violet-600 rounded-full"></span>
              <h4 className="text-sm font-semibold tracking-wider text-gray-900 uppercase">Featured Projects</h4>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-50 font-medium text-violet-700">
              {profile.projects.length} projects
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.projects.map((proj, i) => (
              <div key={i} className="p-4 rounded-xl border border-gray-100 bg-gray-50/40 hover:bg-white hover:border-violet-200 hover:shadow-sm transition-all space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h5 className="text-sm font-bold text-gray-900">{proj.name}</h5>
                  {proj.url && (
                    <a href={proj.url} target="_blank" rel="noreferrer" className="text-xs text-violet-600 hover:underline">
                      Link ↗
                    </a>
                  )}
                </div>
                {proj.technologies && proj.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {proj.technologies.map((tech, tIdx) => (
                      <span key={tIdx} className="text-[10px] px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 font-medium border border-violet-100">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
                {proj.description && (
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                    {proj.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements & Certifications */}
      {((profile.achievements && profile.achievements.length > 0) || (profile.certifications && profile.certifications.length > 0)) && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-amber-500 rounded-full"></span>
            <h4 className="text-sm font-semibold tracking-wider text-gray-900 uppercase">Achievements & Certifications</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.achievements && profile.achievements.length > 0 && (
              <div className="space-y-2.5">
                <h5 className="text-xs font-semibold uppercase text-amber-700 tracking-wider flex items-center gap-1.5">
                  <span>🏆</span> Achievements
                </h5>
                <div className="space-y-2">
                  {profile.achievements.map((ach, i) => {
                    const text = typeof ach === 'string' ? ach : (ach.title || ach.name || ach.description || '');
                    return (
                      <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/50 border border-amber-200/60 text-xs text-gray-800">
                        <span className="text-amber-600 mt-0.5 font-bold">•</span>
                        <span className="leading-relaxed font-medium">{text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {profile.certifications && profile.certifications.length > 0 && (
              <div className="space-y-2.5">
                <h5 className="text-xs font-semibold uppercase text-indigo-700 tracking-wider flex items-center gap-1.5">
                  <span>📜</span> Certifications
                </h5>
                <div className="space-y-2">
                  {profile.certifications.map((cert, i) => (
                    <div key={i} className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/60 text-xs">
                      <p className="font-semibold text-gray-900">{cert.name}</p>
                      {cert.issuer && <p className="text-indigo-700 text-[11px] mt-0.5">{cert.issuer}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Education */}
      {profile.education && profile.education.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-600 rounded-full"></span>
            <h4 className="text-sm font-semibold tracking-wider text-gray-900 uppercase">Education</h4>
          </div>
          <div className="space-y-4">
            {profile.education.map((edu, i) => (
              <div key={i} className="relative pl-6 border-l-2 border-emerald-200">
                <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white"></span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h5 className="text-sm font-bold text-gray-900">
                    {edu.degree}{edu.field && !edu.degree.includes(edu.field) ? ` in ${edu.field}` : ''}
                  </h5>
                  <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full w-fit">
                    {edu.startDate} – {edu.endDate}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5 font-medium">{edu.institution}</p>
                {edu.gpa && (
                  <p className="text-xs text-gray-500 mt-1">
                    Score / CGPA: <span className="font-semibold text-gray-800">{edu.gpa}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
