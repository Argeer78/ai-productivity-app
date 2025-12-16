type NavProps = {
  onNext: () => void;
  onBack?: () => void;
};

export function WelcomeStep({ onNext }: NavProps) {
  return (
    <>
      <h1 className="text-xl font-bold mb-2">Welcome 👋</h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Let’s set up AI Productivity Hub so it fits how you work.
        This takes about 1 minute.
      </p>

      <button onClick={onNext} className="primary-btn">
        Get started
      </button>
    </>
  );
}

export function ThemeStep({ onNext, onBack }: NavProps) {
  return (
    <>
      <h2 className="step-title">Choose a theme</h2>
      {/* reuse ThemeProvider buttons here */}
      <NavButtons onNext={onNext} onBack={onBack} />
    </>
  );
}

export function UseCaseStep({ onNext, onBack }: NavProps) {
  return (
    <>
      <h2 className="step-title">Main way you’ll use the app</h2>
      {/* textarea → profiles.onboarding_use_case */}
      <NavButtons onNext={onNext} onBack={onBack} />
    </>
  );
}

export function WeeklyFocusStep({ onNext, onBack }: NavProps) {
  return (
    <>
      <h2 className="step-title">Weekly focus</h2>
      {/* textarea → onboarding_weekly_focus */}
      <NavButtons onNext={onNext} onBack={onBack} />
    </>
  );
}

export function RemindersStep({ onNext, onBack }: NavProps) {
  return (
    <>
      <h2 className="step-title">Reminders</h2>
      {/* select → onboarding_reminder */}
      <NavButtons onNext={onNext} onBack={onBack} />
    </>
  );
}

export function AiToneStep({ onNext, onBack }: NavProps) {
  return (
    <>
      <h2 className="step-title">AI tone</h2>
      {/* radio buttons → ai_tone */}
      <NavButtons onNext={onNext} onBack={onBack} />
    </>
  );
}

export function FinishStep({ onFinish }: { onFinish: () => void }) {
  return (
    <>
      <h2 className="text-xl font-bold mb-2">All set 🚀</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Your AI is now tailored to you.
      </p>

      <button onClick={onFinish} className="primary-btn">
        Go to dashboard
      </button>
    </>
  );
}

function NavButtons({ onNext, onBack }: NavProps) {
  return (
    <div className="flex justify-between mt-6">
      {onBack ? (
        <button onClick={onBack} className="secondary-btn">
          Back
        </button>
      ) : (
        <span />
      )}
      <button onClick={onNext} className="primary-btn">
        Continue
      </button>
    </div>
  );
}
