import Link from "next/link";

type ActiveKey =
  | "dashboard"
  | "notes"
  | "tasks"
  | "templates"
  | "planner"
  | "feedback"
  | "settings";

type AppHeaderProps = {
  active?: ActiveKey;
};

function navLinkClasses(isActive: boolean) {
  const base =
    "px-2 py-1 rounded-lg border text-xs sm:text-sm transition-colors";
  if (isActive) {
    return `${base} bg-slate-900 border-slate-700 text-indigo-300`;
  }
  return `${base} border-transparent hover:bg-slate-900 hover:border-slate-700`;
}

export default function AppHeader({ active }: AppHeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-indigo-600 flex items-center justify-center text-xs font-bold">
            AI
          </div>
          <span className="text-sm font-semibold tracking-tight">
            AI Productivity Hub
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          <Link
            href="/dashboard"
            className={navLinkClasses(active === "dashboard")}
          >
            Dashboard
          </Link>
          <Link
            href="/notes"
            className={navLinkClasses(active === "notes")}
          >
            Notes
          </Link>
          <Link
            href="/tasks"
            className={navLinkClasses(active === "tasks")}
          >
            Tasks
          </Link>
          <Link
            href="/templates"
            className={navLinkClasses(active === "templates")}
          >
            AI Templates
          </Link>
          <Link
            href="/planner"
            className={navLinkClasses(active === "planner")}
          >
            Planner
          </Link>
          <Link
            href="/feedback"
            className={navLinkClasses(active === "feedback")}
          >
            Feedback
          </Link>
          <Link
            href="/settings"
            className={navLinkClasses(active === "settings")}
          >
            Settings
          </Link>
        </nav>
      </div>
    </header>
  );
}
