export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100">
      <div className="max-w-xl w-full px-6 py-8 rounded-2xl border border-slate-800 bg-slate-900 shadow-lg">
        <h1 className="text-3xl font-bold mb-4 text-center">
          AI Productivity Hub (Prototype)
        </h1>
        <p className="text-slate-300 mb-6 text-center">
          Welcome! This will become your web app for notes, tasks, and AI help.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="/notes"
            className="w-full text-center px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 transition"
          >
            Go to Notes
          </a>
          <a
            href="/tasks"
            className="w-full text-center px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 transition"
          >
            Go to Tasks
          </a>
          <a
            href="/dashboard"
            className="w-full text-center px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 transition"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
