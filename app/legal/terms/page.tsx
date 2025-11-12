import AppHeader from "@/app/components/AppHeader";

export const metadata = {
  title: "Terms of Service — AI Productivity Hub",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <AppHeader />
      <div className="max-w-3xl mx-auto px-4 py-10 prose prose-invert">
        <h1>Terms of Service</h1>
        <p>Last updated: {new Date().toISOString().slice(0,10)}</p>
        <h2>Use of the Service</h2>
        <p>
          You agree to use the app lawfully. Don’t upload illegal content or
          abuse the service.
        </p>
        <h2>Accounts</h2>
        <p>You are responsible for your account and keeping access secure.</p>
        <h2>Subscriptions</h2>
        <p>
          Pro is billed monthly via Stripe and renews until cancelled. You can
          manage/cancel from the billing portal link in the app.
        </p>
        <h2>Content</h2>
        <p>
          You retain ownership of your content. You grant us a limited license
          to store/process it to provide the service.
        </p>
        <h2>Liability</h2>
        <p>
          The service is provided “as is”. We’re not liable for indirect damages.
        </p>
        <h2>Contact</h2>
        <p>Email: <a href="mailto:support@example.com">support@example.com</a></p>
      </div>
    </main>
  );
}
