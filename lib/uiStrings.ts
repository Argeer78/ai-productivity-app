// lib/uiStrings.ts
export const UI_STRINGS = {
  // ===============================
  // NAVIGATION — MUST include all AppHeader keys
  // ===============================
  "nav.dashboard": "Dashboard",
  "nav.notes": "Notes",
  "nav.tasks": "Tasks",
  "nav.planner": "Planner",
  "nav.aiChat": "AI Hub Chat",
  "nav.settings": "Settings",
  "nav.templates": "Templates",
  "nav.dailySuccess": "Daily Success",
  "nav.weeklyReports": "Weekly Reports",
  "nav.travel": "Travel Planner",
  "nav.myTrips": "My Trips",
  "nav.feedback": "Feedback",
  "nav.changelog": "What’s new",
  "nav.admin": "Admin",
  "nav.apps": "Apps",

  // ===============================
  // AUTH
  // ===============================
  "auth.login": "Log in",
  "auth.logout": "Log out",

  // ===============================
  // DASHBOARD PAGE
  // ===============================
  "dashboard.title": "Dashboard",
  "dashboard.subtitle":
    "Quick overview of your plan, AI usage, and activity.",
  "dashboard.aiSummary": "AI Summary",
  "dashboard.recentNotes": "Recent Notes",
  "dashboard.recentTasks": "Recent Tasks",
  "dashboard.goToNotes": "Go to Notes",
  "dashboard.goToTasks": "Go to Tasks",

  // ===============================
  // NOTES PAGE
  // ===============================
  "notes.title": "Notes",
  "notes.subtitle":
    "Capture thoughts and let AI help you summarize or rewrite them.",
  "notes.empty": "No notes yet.",
  "notes.create": "Create note",

  // ===============================
  // TASKS PAGE
  // ===============================
  "tasks.title": "Tasks",
  "tasks.subtitle":
    "Capture tasks, check them off, and keep track of your progress.",
  "tasks.empty": "No tasks yet.",
  "tasks.create": "Add task",

  // ===============================
  // DAILY SUCCESS PAGE
  // ===============================
  "dailySuccess.title": "Daily Success",
  "dailySuccess.subtitle":
    "Rate your day and track your productivity over time.",

  // ===============================
  // WEEKLY REPORTS PAGE
  // ===============================
  "weeklyReports.title": "Weekly Reports",
  "weeklyReports.subtitle":
    "AI-powered analysis of your week.",

  // ===============================
  // TEMPLATES PAGE
  // ===============================
  "templates.title": "AI Templates",
  "templates.subtitle":
    "Generate content quickly using smart templates.",

  // ===============================
  // TRAVEL PLANNER
  // ===============================
  "travel.title": "Travel Planner",
  "travel.subtitle":
    "Plan trips with AI-generated itineraries.",

  // ===============================
  // MY TRIPS
  // ===============================
  "myTrips.title": "My Trips",
  "myTrips.subtitle":
    "View and manage saved trips.",

  // ===============================
  // AI CHAT PAGE
  // ===============================
  "aiChat.title": "AI Hub Chat",
  "aiChat.subtitle":
    "A general-purpose AI coach for planning, ideas and questions.",

  // ===============================
  // FEEDBACK
  // ===============================
  "feedback.title": "Feedback",
  "feedback.subtitle":
    "Tell us what’s working or what we should improve.",

  // ===============================
  // CHANGELOG
  // ===============================
  "changelog.title": "What’s new",
  "changelog.subtitle": "Latest updates and improvements.",

  // ===============================
  // SETTINGS
  // ===============================
  "settings.title": "Settings",
  "settings.subtitle": "Manage account, preferences and language.",
} as const;

export type UiTranslationKey = keyof typeof UI_STRINGS;
