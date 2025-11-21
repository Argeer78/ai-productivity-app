export default function DeleteAccountPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-slate-200 leading-relaxed">
      <h1 className="text-3xl font-bold mb-6">Delete Your Account</h1>

      <p className="mb-4">
        If you want to permanently delete your account and all associated data
        (notes, tasks, planner entries, trips, daily scores, weekly reports and
        settings), you can do so using one of the methods below.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">
        1. Delete Your Account From Inside the App
      </h2>

      <p className="mb-4">
        Open <strong>AI Productivity Hub</strong> and go to{" "}
        <strong>Settings → Delete Account</strong>. Follow the instructions to
        confirm deletion. Once confirmed, your account and all associated data
        will be permanently removed from our systems.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">2. Request Deletion by Email</h2>

      <p className="mb-4">
        If you prefer, you can request account deletion by sending an email to:
      </p>

      <p className="text-indigo-400 text-lg font-mono mb-4">hi@aiprod.app</p>

      <p className="mb-4">
        Please include the email address associated with your account and clearly
        state that you want your account deleted. We will process your request
        and delete your data within 48 hours.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">Data Removed on Deletion</h2>

      <p className="mb-4">
        When your account is deleted, we remove:
      </p>

      <ul className="list-disc pl-6 mb-6">
        <li>Your user profile and authentication data</li>
        <li>All notes and tasks</li>
        <li>Daily scores and weekly reports</li>
        <li>AI usage logs linked to your user</li>
        <li>Trips and travel planner data</li>
      </ul>

      <p className="mb-4">
        Some limited billing records may be retained by Stripe as required for
        legal and accounting purposes, but they are not used inside{" "}
        <strong>AI Productivity Hub</strong>.
      </p>
    </div>
  );
}
