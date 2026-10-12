import Link from 'next/link';

export default function Home() {
  return <main className="min-h-screen bg-slate-950 text-white">
    <header className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
      <span className="font-bold text-lg">AutoApply for Jobs</span>
      <nav className="flex gap-4 text-sm"><Link href="/login">Sign in</Link><Link href="/register" className="px-4 py-2 rounded-lg bg-blue-600">Create account</Link></nav>
    </header>
    <section className="max-w-5xl mx-auto px-6 py-24 space-y-6">
      <p className="text-sm text-blue-300">Resume-based job search and application tracking</p>
      <h1 className="text-4xl md:text-6xl font-black leading-tight">Find relevant roles. Review every application.</h1>
      <p className="max-w-2xl text-slate-300 leading-relaxed">Upload a resume, set your search preferences, and discover jobs from available public feeds. The match percentage is a keyword coverage estimate. Employer portals may require you to sign in, complete additional questions, or submit manually.</p>
      <Link href="/register" className="inline-flex px-5 py-3 rounded-xl bg-blue-600 font-bold">Get started</Link>
    </section>
    <section className="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-4">
      {[
        ['Resume-based matching', 'See which listed job skills appear in your uploaded resume and profile.'],
        ['Public job feeds', 'Search currently supported Remotive, Jobicy, and Arbeitnow feeds when available.'],
        ['Application tracking', 'Track each attempt. A job is marked submitted only when the employer page shows a confirmation.'],
      ].map(([title, body]) => <article key={title} className="p-5 rounded-2xl bg-white/5 border border-white/10"><h2 className="font-bold">{title}</h2><p className="text-sm text-slate-300 mt-2">{body}</p></article>)}
    </section>
  </main>;
}
