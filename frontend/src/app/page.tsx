import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 overflow-hidden relative">
      {/* Background Decorative Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] rounded-full bg-purple-400/20 blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="flex justify-between items-center px-6 sm:px-8 py-5 max-w-7xl mx-auto backdrop-blur-md bg-white/70 sticky top-0 z-50 border-b border-slate-200/60 shadow-sm">
        <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 tracking-tight">
          AutoApplyForJob
        </div>
        <div className="flex items-center space-x-3 sm:space-x-4">
          <Link
            href="/login"
            className="text-slate-700 text-sm font-semibold hover:text-blue-600 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
          >
            Register
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center pt-16 sm:pt-24 pb-28 px-4 text-center max-w-5xl mx-auto">
        <div>
          <span className="inline-flex items-center gap-1.5 py-1 px-4 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-6 shadow-sm border border-indigo-200">
            <span>✨</span> Next-Gen AI Job Application Engine
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-900 mb-6 leading-tight">
          Automate your <br className="hidden sm:block" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
            job search with AI
          </span>
        </h1>

        <p className="mt-2 text-base sm:text-xl md:text-2xl text-slate-600 mb-10 max-w-3xl leading-relaxed">
          AutoApplyForJob uses advanced AI to discover matching jobs from LinkedIn, Remotive, Jobicy, and Arbeitnow, intelligently tailors your master resume to beat ATS screenings, and drafts custom cover letters in seconds.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-base shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all text-center"
          >
            Start Applying Now 🚀
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white text-slate-800 font-bold text-base border border-slate-200 shadow-sm hover:bg-slate-50 hover:shadow-md transition-all text-center"
          >
            Sign In to Dashboard
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-slate-200/80 shadow-md hover:shadow-xl transition-all">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Multi-Source Discovery</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Real-time ingestion from LinkedIn, Remotive, Jobicy, and Arbeitnow matching your target roles.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-slate-200/80 shadow-md hover:shadow-xl transition-all">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Dynamic Tailoring</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              AI crafts tailored cover letters and resume versions optimized for keyword relevance and ATS scores.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-slate-200/80 shadow-md hover:shadow-xl transition-all">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Autonomous Workflow</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Track candidate dossiers, verify direct vacancy postings, and review submissions in one unified dashboard.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
