import AppHeader from "@/app/components/AppHeader";

export const metadata = {
  title: "Privacy Policy — AI Productivity Hub",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <AppHeader />
      <div className="max-w-3xl mx-auto px-4 py-10 prose prose-invert">
        <h1>Privacy Policy</h1>
        <p>Last updated: {new Date().toISOString().slice(0,10)}</p>
        <p>
          We collect only what’s needed to provide the service: your email for
          login, your notes/tasks content, and subscription status. We do not
          sell your data.
        </p>
        <h2>What we store</h2>
        <ul>
          <li>Account: email address</li>
          <li>Content: notes and tasks you create</li>
          <li>Billing status: plan (Free/Pro) via Stripe</li>
        </ul>
        <h2>AI usage</h2>
        <p>
          We send text you submit to our AI features to our AI provider to
          generate responses. Do not paste sensitive data.
        </p>
        <h2>Exports & deletion</h2>
        <p>
          You can export your data in <em>Settings → Download my data</em>. For
          deletion requests, email us at <a href="mailto:support@example.com">support@example.com</a>.
        </p>
        <h2>Payments</h2>
        <p>Payments are processed by Stripe. We don’t store card details.</p>
        <h2>Contact</h2>
        <p>Email: <a href="mailto:support@example.com">support@example.com</a></p>
      </div>
    </main>
  );
}
