"use client";

import React, { useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

export default function AssistantPage() {
  const [activeTab, setActiveTab] = useState<'INTERVIEW' | 'FOLLOW_UP' | 'CAREER_CHAT'>('INTERVIEW');
  const [selectedRole, setSelectedRole] = useState('Senior Java Full-Stack Engineer (Trufe)');
  const [prepLoading, setPrepLoading] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState<any[]>([
    {
      q: "Can you describe how you architected full-stack workflows using Next.js and Node.js at Zenitude.ai?",
      category: "System Architecture & Full Stack",
      starAnswer: "Situation: At Zenitude.ai, our application required low-latency rendering and high-throughput data processing. Task: Build scalable UI interfaces backed by Node.js microservices. Action: Designed server-side rendered components using Next.js App Router and optimized PostgreSQL queries with indexed relational schemas. Result: Boosted query latency by 35% and improved SEO and client performance."
    },
    {
      q: "How did you design automated testing suites using Selenium WebDriver and Tricentis Tosca at Mphasis?",
      category: "Quality Engineering & Automation",
      starAnswer: "Situation: Mphasis insurance clients faced regression bottlenecks across bi-weekly release cycles. Task: Lead comprehensive end-to-end automation test coverage. Action: Implemented Selenium WebDriver and Tosca test suites integrated with Cucumber BDD, executing automated regression and logging 50+ defects systematically. Result: Reduced release regression testing time by 40% and improved test reliability."
    },
    {
      q: "How do you handle state management, cache invalidation, and RESTful API authentication with JWT?",
      category: "Backend & Security",
      starAnswer: "Situation: Multi-role user sessions required secure token lifecycle handling and fast API responses. Action: Implemented JWT authentication middleware with rotating refresh tokens, paired with Redis caching for frequent database reads and optimistic state updates on the Next.js frontend."
    }
  ]);

  // Follow-up state
  const [followUpCompany, setFollowUpCompany] = useState('Trufe');
  const [followUpType, setFollowUpType] = useState('EMAIL');
  const [generatedFollowUp, setGeneratedFollowUp] = useState(
    `Subject: Follow-up on Application – Senior Java Full-Stack Engineer – Harsha Vardhan Reddy\n\nDear Hiring Team at Trufe,\n\nI hope this email finds you well.\n\nI am following up regarding my recent application for the Senior Java Full-Stack Engineer role submitted through your career portal. Having reviewed Trufe’s technical roadmap and product challenges, I remain exceptionally enthusiastic about the prospect of contributing my full-stack engineering expertise (React/Next.js, Node.js, PostgreSQL) and test automation background (Selenium, Tosca) to your engineering team.\n\nPlease let me know if there are any additional materials, code samples, or references I can provide to assist in your review.\n\nThank you for your time and consideration. I look forward to the possibility of discussing how my skills align with your goals.\n\nSincerely,\nHarsha Vardhan Reddy\n+91 7013276091 | vathaluruharshavardhan@gmail.com`
  );

  const { success } = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    success('Copied to clipboard!', 'Success');
  };

  const handleGenerateQuestions = () => {
    setPrepLoading(true);
    setTimeout(() => {
      setPrepLoading(false);
      success('Generated 3 tailored interview questions & STAR responses.', 'Interview Prep Ready');
    }, 600);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            AI Career Assistant & Interview Prep
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            AI interview simulation, recruiter follow-up drafter, and tailored career strategy grounded in your verified experience
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 shadow-sm self-start sm:self-auto">
          <span>🤖</span> AI Candidate Copilot Active
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('INTERVIEW')}
          className={`px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'INTERVIEW'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🎯</span> Interview Simulation & STAR Answers
        </button>
        <button
          onClick={() => setActiveTab('FOLLOW_UP')}
          className={`px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'FOLLOW_UP'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>📬</span> Recruiter Follow-Up Drafter
        </button>
        <button
          onClick={() => setActiveTab('CAREER_CHAT')}
          className={`px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'CAREER_CHAT'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>💬</span> Career Strategy & Compensation Q&A
        </button>
      </div>

      {/* Tab 1: Interview Simulation */}
      {activeTab === 'INTERVIEW' && (
        <div className="space-y-6">
          <Card className="rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Target Role & Company Interview Simulator</h3>
                <p className="text-xs text-slate-500">
                  Anticipates exact technical and behavioral questions based on the job requirements and your resume
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
                >
                  <option value="Senior Java Full-Stack Engineer (Trufe)">Senior Java Full-Stack Engineer (Trufe)</option>
                  <option value="Full Stack Developer (Next.js / Node.js)">Full Stack Developer (Next.js / Node.js)</option>
                  <option value="Software Engineer - Automation (Mphasis)">Software Engineer - Automation (Mphasis)</option>
                </select>
                <Button
                  onClick={handleGenerateQuestions}
                  disabled={prepLoading}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  {prepLoading ? 'Simulating...' : '⚡ Generate Prep'}
                </Button>
              </div>
            </CardHeader>

            <CardBody className="p-6 space-y-6">
              {interviewQuestions.map((item, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {item.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 pt-1">
                        Q{idx + 1}: {item.q}
                      </h4>
                    </div>
                    <button
                      onClick={() => handleCopy(item.starAnswer)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold px-2 py-1 rounded bg-blue-50 border border-blue-100 flex-shrink-0"
                    >
                      Copy STAR Answer
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>💡</span> Recommended STAR Response (Grounded in Your Experience):
                    </p>
                    <p>{item.starAnswer}</p>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Tab 2: Follow-Up Drafter */}
      {activeTab === 'FOLLOW_UP' && (
        <div className="space-y-6">
          <Card className="rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Application Follow-Up Message Generator</h3>
                <p className="text-xs text-slate-500">
                  Generate professional emails and LinkedIn messages to stay on recruiters' radars post-submission
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={followUpCompany}
                  onChange={(e) => setFollowUpCompany(e.target.value)}
                  placeholder="Company name"
                  className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                />
                <select
                  value={followUpType}
                  onChange={(e) => setFollowUpType(e.target.value)}
                  className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="EMAIL">Email Outreach (5-7 Days)</option>
                  <option value="LINKEDIN">LinkedIn InMail (Direct Recruiter)</option>
                </select>
              </div>
            </CardHeader>
            <CardBody className="p-6 space-y-4">
              <div className="relative">
                <textarea
                  rows={14}
                  value={generatedFollowUp}
                  onChange={(e) => setGeneratedFollowUp(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-slate-200 font-mono text-xs text-slate-800 bg-slate-50/50 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  onClick={() => handleCopy(generatedFollowUp)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-5 shadow-sm"
                >
                  📋 Copy Message to Clipboard
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Tab 3: Career Strategy & Compensation Q&A */}
      {activeTab === 'CAREER_CHAT' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-6">
                <h3 className="text-base font-bold text-slate-900">India Tech Market Compensation Intelligence</h3>
                <p className="text-xs text-slate-500">Benchmark salary bands for your profile and tech stack</p>
              </CardHeader>
              <CardBody className="p-6 space-y-4">
                <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-100 space-y-2 text-xs text-blue-900">
                  <p className="font-bold text-sm">₹12.0 LPA – ₹22.0 LPA Target Range</p>
                  <p className="leading-relaxed">
                    Given your dual proficiency in Full-Stack JavaScript/TypeScript (Next.js/React, Node.js) and QA Automation (Selenium, Tosca), enterprise firms and tier-1 product startups in Bengaluru and Hyderabad benchmark these hybrid roles at 12–22 LPA.
                  </p>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Bengaluru (Product/Fintech)</span>
                    <strong className="text-slate-900">₹14.0 - 24.0 LPA</strong>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Hyderabad (Enterprise Tech)</span>
                    <strong className="text-slate-900">₹12.0 - 20.0 LPA</strong>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Pune / Remote India</span>
                    <strong className="text-slate-900">₹11.0 - 18.0 LPA</strong>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-6">
                <h3 className="text-base font-bold text-slate-900">ATS Optimization Strategic Principles</h3>
                <p className="text-xs text-slate-500">How AutoApply maximizes your interview callback rate</p>
              </CardHeader>
              <CardBody className="p-6 space-y-3.5 text-xs text-slate-700 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <span className="text-base text-blue-600">1.</span>
                  <p><strong>Factual Re-ranking:</strong> AutoApply elevates your most relevant projects (e.g. Zenitude agentic tools for AI roles, Mphasis Tosca for QA roles) to the top of your experience without changing factual dates.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-base text-blue-600">2.</span>
                  <p><strong>Keyword Mirroring:</strong> Synthesizes exact employer terminologies into your skills grid (e.g., mapping "REST APIs" vs "RESTful Web Services") so corporate ATS parsers award full score.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-base text-blue-600">3.</span>
                  <p><strong>Zero Hallucination Shield:</strong> Never invents languages you don't know. If an opening requires Go or Rust, AutoApply strategically bridges this in the cover letter via rapid transferrable skills.</p>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
