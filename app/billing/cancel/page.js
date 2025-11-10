export default function BillingCancelPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="max-w-md w-full border border-slate-800 rounded-2xl p-6 bg-slate-900/70 text-center">
        <h1 className="text-2xl font-bold mb-3">Payment cancelled</h1>
        <p className="text-sm text-slate-300">
          Your subscription was not changed. You can close this page or go back
          to your notes.
        </p>
        <a
          href="/notes"
          className="mt-4 inline-block px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm"
        >
          Back to notes
        </a>
      </div>
    </main>
  );
}
