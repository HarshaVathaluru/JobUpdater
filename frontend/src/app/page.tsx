import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white text-xs py-2 px-4 text-center font-medium border-b border-slate-800">
        <span>✨ Verified Multi-Platform Discovery: Connected to LinkedIn, Shine.com, Indeed, Remotive & Jobicy</span>
      </div>

      {/* Navigation */}
      <nav className="flex justify-between items-center px-6 sm:px-12 py-5 max-w-7xl mx-auto backdrop-blur-md bg-white/80 sticky top-0 z-50 border-b border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-600"></span>
          <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 tracking-tight">
            AutoApplyForJob
          </span>
        </div>
        <div className="flex items-center space-x-3 sm:space-x-4">
          <Link
            href="/login"
            className="text-slate-700 text-xs sm:text-sm font-bold hover:text-blue-600 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs sm:text-sm font-bold hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
          >
            Get Started Free ➔
          </Link>
        </div>
      </nav>

      {/* Hero Section (Section 14) */}
      <main className="pt-16 sm:pt-24 pb-20 px-4 sm:px-6 max-w-6xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 shadow-sm">
          <span>🚀</span> Production-Grade Career Automation Engine
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-900 leading-tight max-w-5xl mx-auto">
          Find the right jobs. <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
            Tailor every application.
          </span> <br />
          Apply smarter with AI.
        </h1>

        <p className="text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
          Upload your master resume once. Discover verified vacancies across LinkedIn, Shine, and Remotive, optimize ATS match scores to <strong>95%+</strong>, and automate portal applications with full human review.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm sm:text-base shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all text-center"
          >
            Start Applying Free ➔
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-800 font-bold text-sm sm:text-base border border-slate-200 shadow-sm hover:bg-slate-50 transition-all text-center"
          >
            Sign In to Dashboard
          </Link>
        </div>

        {/* Product Preview Card / Mock Dashboard (Section 14) */}
        <div className="pt-12 max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden text-left p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400"></span>
                <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-bold text-slate-400 ml-2">AutoApplyForJob Command Center</span>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                ● Live Autonomous Agent
              </span>
            </div>

            {/* Mock Application Packet Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-500">Target Vacancy</span>
                <div className="font-black text-sm text-slate-900">Senior Java Developer</div>
                <div className="text-xs text-slate-600 font-medium">Trufe • 🏢 On-Site (Bengaluru)</div>
                <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">LinkedIn Live</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400">ATS Match Optimization</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 line-through text-sm">45%</span>
                  <span className="text-2xl font-black text-emerald-400">96%</span>
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">+51% Boost</span>
                </div>
                <div className="text-[11px] text-slate-300">Java, REST APIs, Selenium & Next.js emphasized</div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-2">
                <span className="text-[10px] font-bold uppercase text-indigo-700">Application Packet</span>
                <div className="font-bold text-xs text-indigo-950">✓ Tailored Resume (.md)</div>
                <div className="font-bold text-xs text-indigo-950">✓ Custom Cover Letter</div>
                <div className="font-bold text-xs text-indigo-950">✓ Browser Filling Verified</div>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Step Interactive Visual Flow (Section 14) */}
        <div className="pt-20 space-y-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">The Modern Workflow</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">How AutoApplyForJob Works</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <span className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold">1</span>
              <h3 className="font-bold text-base text-slate-900">Upload Master Resume</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload your genuine PDF or DOCX resume. AI extracts verified experience, projects, and skills without inventing fake credentials.
              </p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <span className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg font-bold">2</span>
              <h3 className="font-bold text-base text-slate-900">Multi-Source Discovery</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Real-time scanning across LinkedIn, Shine, and Remotive with filters for On-Site, Hybrid, and Remote tech vacancies.
              </p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <span className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg font-bold">3</span>
              <h3 className="font-bold text-base text-slate-900">Dynamic ATS Tailoring</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Aligns your verified achievements with the employer’s job description, boosting ATS match scores from 50% to 95%+.
              </p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <span className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg font-bold">4</span>
              <h3 className="font-bold text-base text-slate-900">Autonomous Application</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automates browser form filling on official employer portals while keeping you in full control through review and Kanban tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Trust & Safety Guarantees (Section 19) */}
        <div className="pt-16 p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-left space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Trust & Transparency</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Built on 100% Factual Integrity</h2>
            <p className="text-xs text-slate-600">
              Unlike generic AI tools that fabricate degrees or company names, AutoApplyForJob strictly enforces factual accuracy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="space-y-1.5">
              <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <span className="text-emerald-500">✓</span> Zero Hallucinations
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                The AI only restructures and highlights technologies and projects present in your verified master resume.
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <span className="text-emerald-500">✓</span> Human Approval Model
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Inspect every tailored resume, review generated cover letters, and approve application submissions with one click.
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <span className="text-emerald-500">✓</span> Direct Employer Portals
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Applications are submitted directly to official company career gateways with logged activity traces.
              </p>
            </div>
          </div>
        </div>

        {/* Frequently Asked Questions (Section 14) */}
        <div className="pt-16 space-y-8 text-left max-w-4xl mx-auto">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Got Questions?</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-2">
              <h3 className="font-bold text-sm text-slate-900">Which job platforms are currently supported?</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                AutoApplyForJob discovers verified live vacancies from LinkedIn (On-Site, Hybrid, and Remote), Shine.com, Indeed India, Remotive, Jobicy, and Arbeitnow.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-2">
              <h3 className="font-bold text-sm text-slate-900">How does the ATS score improvement work?</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The tailoring engine analyzes the employer's job description keywords, identifies semantic gaps in your master resume, and restructures your summary, competencies, and project bullet points to maximize keyword density while preserving 100% factual truth.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-2">
              <h3 className="font-bold text-sm text-slate-900">Can I download my tailored resumes and cover letters?</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Yes! Every tailored resume and cover letter can be viewed, edited, copied to clipboard, or downloaded directly as Markdown (.md) or text (.txt) files.
              </p>
            </div>
          </div>
        </div>

        {/* Final Call to Action */}
        <div className="pt-16">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-3xl p-8 sm:p-12 space-y-6 shadow-xl">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Ready to Land Your Next Tech Role?</h2>
            <p className="text-sm sm:text-base text-blue-100 max-w-xl mx-auto">
              Join candidates automating their job search with verified AI tailoring and multi-platform tracking.
            </p>
            <div>
              <Link
                href="/register"
                className="px-8 py-4 bg-white text-blue-600 font-extrabold text-sm sm:text-base rounded-2xl shadow-lg hover:bg-blue-50 transition-all inline-block"
              >
                Create Your Free Account ➔
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span className="font-bold text-slate-900">AutoApplyForJob</span>
            <span>© 2026. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 font-semibold">
            <Link href="/login" className="hover:text-slate-900">Sign In</Link>
            <Link href="/register" className="hover:text-slate-900">Register</Link>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">Privacy Policy</span>
            <span className="text-slate-400">Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
