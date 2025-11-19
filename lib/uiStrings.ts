// lib/uiStrings.ts
export const UI_STRINGS = {
  "nav.dashboard": "Dashboard",
  "nav.notes": "Notes",
  "nav.tasks": "Tasks",
  "nav.planner": "Planner",
  "nav.aiChat": "AI Hub Chat",
  "nav.settings": "Settings",

  "dashboard.title": "Dashboard",
  "dashboard.subtitle":
    "See your streak, daily score, notes and tasks in one place.",

  "notes.title": "Notes",
  "notes.subtitle":
    "Capture thoughts and let AI help you summarize or rewrite them.",

  "tasks.title": "Tasks",
  "tasks.subtitle":
    "Capture tasks, check them off, and keep track of your progress.",

  "aiChat.title": "AI Hub Chat",
  "aiChat.subtitle":
    "A general-purpose AI coach for planning, ideas and questions.",

  // Add more keys over time as needed
} as const;

export type UiTranslationKey = keyof typeof UI_STRINGS;
