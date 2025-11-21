export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-slate-200 leading-relaxed">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

      <p className="mb-4 text-sm text-slate-400">
        Last updated: {new Date().getFullYear()}
      </p>

      <p className="mb-4">
        These Terms of Service (&quot;Terms&quot;) govern your use of{" "}
        <strong>AI Productivity Hub (owned by Anargyros Sgouros)</strong> (the
        &quot;Service&quot;) available at <strong>aiprod.app</strong> and via
        our Android app. By creating an account or using the Service, you agree
        to these Terms.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">1. Use of the Service</h2>
      <p className="mb-4">
        You may use the Service for personal or business productivity purposes
        in accordance with these Terms and applicable laws. You are responsible
        for maintaining the confidentiality of your account and for all activity
        under your account.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">2. Accounts and Eligibility</h2>
      <p className="mb-4">
        You must be at least 13 years old (or the minimum legal age in your
        jurisdiction) to use the Service. You agree to provide accurate
        information when you create an account and to keep it up to date.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">3. Content You Create</h2>
      <p className="mb-4">
        You retain ownership of the notes, tasks, goals, and other content you
        create in the app. By using the Service, you grant us a limited license
        to process and store your content for the purpose of providing the
        features of the app (including AI features, backups, and analytics).
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">4. AI Features</h2>
      <p className="mb-4">
        The Service provides AI-powered features such as summaries, suggestions
        and text generation. You are responsible for reviewing AI outputs and
        deciding how to use them. AI responses may be incomplete or inaccurate
        and should not be treated as professional advice.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">5. Plans, Billing and Subscriptions</h2>
      <p className="mb-4">
        The Service offers a free plan and a Pro subscription billed via Stripe.
        By starting a paid subscription, you authorize us (and our payment
        provider) to charge you according to the selected plan and billing
        cycle. You may cancel your subscription at any time via the account or
        billing settings; access to Pro features will continue until the end of
        the current billing period.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">6. Acceptable Use</h2>
      <p className="mb-4">
        You agree not to misuse the Service, including but not limited to:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Attempting to hack, overload, or disrupt the Service</li>
        <li>
          Using the Service for illegal activities or to store illegal content
        </li>
        <li>Abusing AI features (e.g. spam, harassment, or policy violations)</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">7. Termination</h2>
      <p className="mb-4">
        You may delete your account at any time from the app or by contacting
        us. We may suspend or terminate your access if you violate these Terms
        or abuse the Service. Upon deletion, your personal data and content will
        be removed as described in our Privacy Policy.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">8. Disclaimer of Warranties</h2>
      <p className="mb-4">
        The Service is provided &quot;as is&quot; and &quot;as available&quot;,
        without warranties of any kind, express or implied. We do not guarantee
        that the Service will be error-free, uninterrupted or suitable for any
        specific purpose.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">9. Limitation of Liability</h2>
      <p className="mb-4">
        To the maximum extent permitted by law,{" "}
        <strong>AI Productivity Hub (owned by Anargyros Sgouros)</strong> is not
        liable for any indirect, incidental, or consequential damages arising
        from your use of the Service.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">10. Changes to These Terms</h2>
      <p className="mb-4">
        We may update these Terms from time to time. If changes are material, we
        will notify you by email or in the app. Your continued use of the
        Service after changes take effect means you accept the revised Terms.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">11. Contact</h2>
      <p className="mb-4">
        For questions about these Terms, contact us at:
      </p>

      <p className="text-indigo-400 text-lg font-mono">hi@aiprod.app</p>
    </div>
  );
}
