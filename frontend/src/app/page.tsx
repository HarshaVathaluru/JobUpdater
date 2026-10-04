import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 overflow-hidden relative">
      {/* Background Decorative Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[120px] animate-float" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] rounded-full bg-purple-400/20 blur-[120px] animate-float animation-delay-200" />
      </div>

      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto backdrop-blur-sm bg-white/30 sticky top-0 z-50 border-b border-white/20">
        <div className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 transition-transform duration-300">
          AutoApplyForJob
        </div>
        <div className="space-x-6">
          <Link href="/login" className="text-gray-600 font-medium hover:text-blue-600 transition-colors">
            Login
          </Link>
          <Link href="/register" className="px-5 py-2.5 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            Register
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center pt-24 pb-32 px-4 text-center max-w-5xl mx-auto">
        
        <div className="opacity-0 animate-fade-in-up">
          <span className="inline-block py-1 px-3 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold mb-6 shadow-sm border border-indigo-200">
            ✨ Next-Gen AI Job Application Engine
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-8 opacity-0 animate-fade-in-up animation-delay-200 leading-tight">
          Automate your <br className="hidden md:block"/>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
            job search with AI
          </span>
        </h1>
        
        <p className="mt-4 text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl opacity-0 animate-fade-in-up animation-delay-400 leading-relaxed">
          AutoApplyForJob uses advanced AI to discover matching jobs, intelligently tailor your master resume to beat the ATS, and completely automate the application process. You focus on the interviews.
        </p>

        <div className="flex flex-col sm:flex-row gap-5 opacity-0 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          <Link href="/register" className="px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-[0_10px_40px_-10px_rgba(79,70,229,0.7)] hover:shadow-[0_10px_50px_-10px_rgba(79,70,229,1)] hover:-translate-y-1 transition-all duration-300">
            Start Applying Now
          </Link>
          <Link href="/login" className="px-8 py-4 rounded-full bg-white text-gray-800 font-bold text-lg border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-50 hover:-translate-y-1 transition-all duration-300">
            Sign In to Dashboard
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 opacity-0 animate-fade-in-up" style={{ animationDelay: '800ms' }}>
          
          <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white shadow-xl hover:scale-105 transition-transform duration-300">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Smart Discovery</h3>
            <p className="text-gray-600">Our background workers scour job boards to find positions matching your exact criteria and preferences.</p>
          </div>

          <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white shadow-xl hover:scale-105 transition-transform duration-300">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Dynamic Tailoring</h3>
            <p className="text-gray-600">Gemini AI rewrites your resume and generates a custom cover letter to maximize ATS compatibility score.</p>
          </div>

          <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white shadow-xl hover:scale-105 transition-transform duration-300">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Auto Submission</h3>
            <p className="text-gray-600">Our agent physically interacts with forms, maps your data, and submits your application seamlessly.</p>
          </div>

        </div>

      </main>
    </div>
  );
}
