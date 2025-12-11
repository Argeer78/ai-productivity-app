// lib/i18n.ts

// 1) Locale / language codes you want to support
export type Locale =
  | "en"
  | "de"
  | "es"
  | "fr"
  | "it"
  | "pt"
  | "el"
  | "tr"
  | "ru"
  | "ro";

// Backwards-compat alias if some code still uses `Lang`
export type Lang = Locale;

// 2) Languages for dropdowns / selectors
export const SUPPORTED_LANGS: { code: Locale; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "el", label: "Ελληνικά", flag: "🇬🇷" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "ro", label: "Română", flag: "🇷🇴" },
];

// 3) Default locale for the app
export const DEFAULT_LOCALE: Locale = "en";

// 4) Keys for translations (keep it loose for now)
export type TranslationKey = string;

// 5) Translation messages (dictionary)
export const MESSAGES: Partial<Record<Locale, Record<TranslationKey, string>>> = {
  // -------------------------
  // English (default)
  // -------------------------
  en: {
    // NAVIGATION
    "nav.dashboard": "Dashboard",
    "nav.notes": "Notes",
    "nav.tasks": "Tasks",
    "nav.planner": "Planner",
    "nav.templates": "Templates",
    "nav.dailySuccess": "Daily Success",
    "nav.weeklyReports": "Weekly Reports",
    "nav.travel": "Travel Planner",
    "nav.myTrips": "My Trips",
    "nav.feedback": "Feedback",
    "nav.settings": "Settings",
    "nav.changelog": "What’s new",
    "nav.apps": "Apps",
    "nav.admin": "Admin",

    // COMMON UI
    "common.translateWithAI": "Translate with AI",
    "common.close": "Close",
    "common.loading": "Loading…",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.edit": "Edit",
    "common.delete": "Delete",
    "common.language": "Language",
    "common.search": "Search",
    "common.confirm": "Confirm",
    "common.submit": "Submit",

    // TRANSLATION MODAL
    "translate.title": "Translate with AI",
    "translate.subtitle":
      "Select your language and translate text or the page.",
    "translate.targetLanguage": "Target language",
    "translate.textToTranslate": "Text to translate",
    "translate.translateText": "Translate text",
    "translate.translatePage": "Translate this page",
    "translate.autoTranslateSite": "Auto-translate app",
    "translate.translating": "Translating…",
    "translate.workingOnPage": "Working on page…",
    "translate.preparingPage": "Preparing page for translation…",
    "translate.noTextFound": "No text found on this page to translate.",
    "translate.translationStatus": "Translation status",

    // lib/i18n.ts – inside MESSAGES.en

  // ...existing keys...

  // DASHBOARD
  "dashboard.checkingSession": "Checking your session...",
  "dashboard.title": "Dashboard",
  "dashboard.notLoggedIn":
    "You’re not logged in. Log in or create a free account to see your plan and AI usage.",
  "dashboard.goToAuth": "Go to login / signup",

  "dashboard.streakBannerMain": "You’re on a",
  "dashboard.streakBannerTail": "productivity streak.",

  "dashboard.subtitle":
    "Quick overview of your plan, AI usage, and activity.",

  "dashboard.planLabel": "Plan",
  "dashboard.free": "FREE",
  "dashboard.aiToday": "AI today",
  "dashboard.freePlanBlurb":
    "The free plan includes up to 20 AI calls per day shared across notes, the global assistant, summaries, and planner.",
  "dashboard.aiUsedUnlimitedNote": "used (unlimited for normal use)",

  "dashboard.loadingData": "Loading your data...",

  "dashboard.account": "ACCOUNT",
  "dashboard.thisIsAccount": "This is the account you use to log in.",

  "dashboard.plan": "PLAN",
  "dashboard.proPlanDescription":
    "Unlimited daily AI usage for normal use, plus access to more powerful planning tools.",
  "dashboard.freePlanDescription":
    "Good for trying the app and using AI lightly each day.",
  "dashboard.dailyLimit": "Daily AI limit",
  "dashboard.unlimitedDailyAI": "Unlimited for normal use",
  "dashboard.callsPerDay": "calls/day",

  "dashboard.viewReports": "📅 View Weekly Reports →",
  "dashboard.unlockReports": "🔒 Unlock Weekly Reports with Pro →",

  "dashboard.todayAIUsage": "TODAY'S AI USAGE",
  "dashboard.used": "used",

  "dashboard.productivityScore": "Productivity Score",
  "dashboard.loading": "Loading...",
  "dashboard.scoreToday": "Today",
  "dashboard.score7Avg": "7-day avg",
  "dashboard.scoreStreak": "Score streak (≥60)",
  "dashboard.days": "day",
  "dashboard.updateScore": "Update today's score",

  "dashboard.proUsageNote":
    "Pro gives you effectively unlimited daily AI usage for normal workflows.",
  "dashboard.remainingCalls": "{remaining} AI calls left today.",
  "dashboard.proSafetyLimit":
    "You reached today’s Pro safety limit. Try again tomorrow.",
  "dashboard.freeLimitReached":
    "You reached today’s limit on the free plan.",
  "dashboard.upgradeToPro": "Upgrade to Pro",
  "dashboard.upgradeBenefitsShort":
    "for unlimited daily AI (for normal use).",

  "dashboard.usageStreak": "Usage streak",
  "dashboard.inARow": "in a row",
  "dashboard.activeDaysLast30": "Active days (last 30)",

  "dashboard.aiSummaryHeading": "AI SUMMARY (BETA)",
  "dashboard.aiSummaryInfo":
    "Let AI scan your recent notes and tasks and give you a short overview plus suggestions.",
  "dashboard.summaryGenerating": "Generating...",
  "dashboard.summaryLimitButton": "Daily AI limit reached",
  "dashboard.summaryButton": "Generate summary",
  "dashboard.summaryUsesLimit":
    "Uses your daily AI limit (shared with notes, assistant, planner).",
  "dashboard.summaryLimitReached":
    "You’ve reached today’s AI limit on your current plan. Try again tomorrow or upgrade to Pro.",
  "dashboard.summaryServerInvalid": "Server returned an invalid response.",
  "dashboard.summaryPlanLimit":
    "You’ve reached today’s AI limit for your plan.",
  "dashboard.summaryFailed": "Failed to generate summary.",
  "dashboard.summaryNetworkError":
    "Network error while generating summary.",

  "dashboard.aiWinsHeading": "AI WINS THIS WEEK",
  "dashboard.aiWinsSubheading":
    "A quick snapshot of how AI helped you move things forward in the last 7 days.",
  "dashboard.avgProductivityScore": "Avg productivity score",
  "dashboard.basedOnScores": "Based on your daily scores",
  "dashboard.tasksCompleted": "Tasks completed",
  "dashboard.last7Days": "Last 7 days",
  "dashboard.notesCreated": "Notes created",
  "dashboard.capturedIdeas": "Captured ideas & thoughts",
  "dashboard.aiCallsUsed": "AI calls used",
  "dashboard.minsSaved": "min saved",

  "dashboard.goalOfWeekHeading": "GOAL OF THE WEEK",
  "dashboard.goalOfWeekPitch":
    "Set a clear weekly focus goal and let AI help you stay on track.",
  "dashboard.goalOfWeekProOnly":
    "This is a Pro feature. Upgrade to unlock AI-powered weekly goals, progress tracking in your weekly report emails, and unlimited daily AI usage.",
  "dashboard.unlockWithPro": "🔒 Unlock with Pro",

  "dashboard.goalInstructions":
    "Pick one meaningful outcome you want to achieve this week. Keep it small and realistic.",
  "dashboard.goalPlaceholder":
    "e.g. Finish and send the client proposal draft.",
  "dashboard.savingGoal": "Saving...",
  "dashboard.saveGoal": "Save goal",
  "dashboard.saveGoalAI": "Save & let AI refine",
  "dashboard.goalMarkedDone": "✅ Marked as done",
  "dashboard.goalMarkAsDone": "Mark this goal as done",
  "dashboard.goalSingleFocus":
    "This is your single focus target for this week.",

  "dashboard.recentNotesHeading": "RECENT NOTES",
  "dashboard.noNotes":
    "No notes yet. Create your first note from the Notes page.",
  "dashboard.emptyNote": "(empty note)",
  "dashboard.openNotesLink": "Open Notes →",

  "dashboard.recentTasksHeading": "RECENT TASKS",
  "dashboard.noTasks":
    "No tasks yet. Start by adding a few tasks you want to track.",
  "dashboard.untitledTask": "(untitled task)",
  "dashboard.settingsExportLink": "Settings / Export →",

  "dashboard.goToNotesButton": "Go to Notes",
  "dashboard.goToTasksButton": "Go to Tasks",
  "dashboard.aiTemplatesButton": "🧠 AI Templates",
  "dashboard.dailyPlannerButton": "🗓 Daily Planner",
  "dashboard.weeklyReportsButton": "📅 Weekly Reports",

  "dashboard.proUnlockTitle": "What you unlock with Pro:",
  "dashboard.proUnlockHigherLimit": "Higher daily AI limit",
  "dashboard.proUnlockWeeklyReport": "Weekly AI email report",
  "dashboard.proUnlockWeeklyGoal": "Weekly goal with AI refinement",
  "dashboard.proUnlockTrips": "Save unlimited trips",
  "dashboard.proUnlockTemplates": "Premium templates",

  "dashboard.proPricingTitle": "Upgrade to AI Productivity Hub PRO",
  "dashboard.proPricingSubtitle":
    "For daily users who want higher limits and weekly insights.",
  "dashboard.billingMonthly": "Monthly",
  "dashboard.billingYearly": "Yearly — save 25%",

  "dashboard.proFeatureUnlimitedAI":
    "Unlimited AI (2000 calls/day)",
  "dashboard.proFeatureWeeklyReports": "Weekly AI email reports",
  "dashboard.proFeatureWeeklyGoals": "AI-powered Weekly Goals",
  "dashboard.proFeatureTrips": "Save & revisit trip plans",
  "dashboard.proFeatureTemplates": "All premium templates",
  "dashboard.proFeaturePriorityAccess": "Priority feature access",

  "dashboard.openingStripe": "Opening Stripe…",
  "dashboard.goYearlyButton": "Go yearly ({currency})",
  "dashboard.upgradeMonthlyButton": "Upgrade monthly ({currency})",
  "dashboard.cancelAnytime":
    "Cancel anytime via Stripe billing portal.",

  "dashboard.founderTitle": "🎉 Early Supporter Discount",
  "dashboard.founderSubtitle":
    "Because you're early — lock in a permanent discount, forever.",
  "dashboard.founderPerMonth": "month",
  "dashboard.founderPriceNote": "Founder price — never increases",
  "dashboard.founderEverythingPro": "Everything in Pro",
  "dashboard.founderLifetimePrice": "Locked-in lifetime price",
  "dashboard.founderUnlimitedAI": "Unlimited AI (2000/day)",
  "dashboard.founderWeeklyReportsGoals": "Weekly reports & goals",
  "dashboard.founderPremiumTemplates": "Premium templates",
  "dashboard.founderPrioritySupport": "Priority support",
  "dashboard.getFounderButton":
    "Get Founder Price ({currency})",
  "dashboard.founderLimitedTime":
    "Limited time. Price is yours forever once subscribed.",

  "dashboard.feedbackHeading": "Send quick feedback",
  "dashboard.feedbackSubheading":
    "Tell me what’s working, what’s confusing, or what you’d love to see next.",

    // -------------------------
    // NOTES PAGE (EN)
    // -------------------------

    "notes.checkingSession": "Checking session…",
    "notes.title": "Notes",
    "notes.loginRequired": "You must log in to view your notes.",
    "notes.loginButton": "Log in / Sign up",

    // Create note header
    "notes.create.heading": "Create a new note",
    "notes.create.subheading":
      "Use AI to summarize, bullet, or rewrite your notes. Capture ideas with your voice, too.",
    "notes.create.logout": "Log out",

    // Form labels & placeholders
    "notes.form.titlePlaceholder": "Note title",
    "notes.form.dateLabel": "Note date:",
    "notes.form.categoryLabel": "Category:",
    "notes.form.category.none": "None",
    "notes.form.smartTitleLabel": "Smart title from content",
    "notes.form.contentPlaceholder": "Write your note here...",

    // Categories
    "notes.category.work": "Work",
    "notes.category.personal": "Personal",
    "notes.category.ideas": "Ideas",
    "notes.category.meeting": "Meeting Notes",
    "notes.category.study": "Study",
    "notes.category.journal": "Journal",
    "notes.category.planning": "Planning",
    "notes.category.research": "Research",
    "notes.category.other": "Other",

    // Plan / AI usage
    "notes.plan.label": "Plan",
    "notes.plan.aiTodayLabel": "AI today",

    // Voice capture
    "notes.voice.modeLabel": "Voice capture mode:",
    "notes.voice.mode.review": "Review first",
    "notes.voice.mode.autosave": "Auto-save note",
    "notes.voice.resetButton": "Reset voice note",

    // Suggested tasks panel
    "notes.tasks.suggested.title": "Suggested tasks",
    "notes.tasks.suggested.noneFound":
      "No clear tasks were found in this note.",
    "notes.tasks.suggested.createButton": "Create tasks",
    "notes.tasks.suggested.creating": "Creating tasks…",

    // Messages for created tasks from voice / note
    "notes.tasks.voice.created": "Created tasks from your note/voice.",
    "notes.tasks.note.created": "Created tasks from this note.",

    // Errors
    "notes.errors.saveNoteMissing": "Please enter a title or content.",
    "notes.errors.notLoggedInForAI":
      "You need to be logged in to use AI on notes.",
    "notes.errors.dailyLimitReached": "Daily AI limit reached.",
    "notes.errors.aiFailed": "AI failed.",
    "notes.errors.aiSaveFailed":
      "Failed to save AI result to this note.",
    "notes.errors.notLoggedInTasksFromNotes":
      "You need to be logged in to create tasks from notes.",
    "notes.errors.generateTasksFromNoteFailed":
      "Failed to generate tasks from this note. Try again.",
    "notes.errors.generateTasksFromNoteUnexpected":
      "Unexpected error while generating tasks from this note.",
    "notes.errors.createTasksFromVoiceFailed":
      "Failed to create tasks from your note/voice.",
    "notes.errors.createTasksUnexpected":
      "Unexpected error while creating tasks (check console).",
    "notes.errors.noteEmptyForTasks":
      "This note is empty, nothing to turn into tasks.",
    "notes.errors.saveTasksFromNoteFailed":
      "Failed to save tasks created from this note.",
    "notes.errors.createTasksFromNoteUnexpected":
      "Unexpected error while creating tasks from this note.",

    // Confirmations
    "notes.confirm.deleteNote": "Delete this note?",

    // Buttons (general)
    "notes.buttons.saveNote": "Save note",
    "notes.buttons.saveNoteLoading": "Saving...",
    "notes.buttons.upgradeHint": "AI limit reached often?",
    "notes.buttons.upgradeToPro": "Upgrade to Pro",

    // Notes list / filters
    "notes.list.title": "Your notes",
    "notes.list.filter.allCategories": "All categories",
    "notes.list.filter.noCategory": "No category",
    "notes.list.refresh": "Refresh",
    "notes.list.empty": "No notes found.",
    "notes.list.untitled": "Untitled",
    "notes.list.aiResultTitle": "AI Result:",
    "notes.list.goToTasks": "→ Go to Tasks",
    "notes.list.openDashboard": "Open Dashboard",

    // Buttons per note
    "notes.buttons.tasksFromNote": "⚡ Tasks from note",
    "notes.buttons.tasksFromNoteLoading": "Finding tasks...",
    "notes.buttons.summarize": "✨ Summarize",
    "notes.buttons.summarizeLoading": "Summarizing...",
    "notes.buttons.bullets": "📋 Bullets",
    "notes.buttons.rewrite": "✍️ Rewrite",
    "notes.buttons.share": "Share",
    "notes.buttons.shareCopied": "✅ Copied",
    "notes.buttons.askAI": "🤖 Ask AI",
    "notes.buttons.tasksCreateFromNote": "🧩 Tasks",
    "notes.buttons.tasksCreateFromNoteLoading": "Creating tasks…",
    "notes.buttons.edit": "✏️ Edit",
    "notes.buttons.delete": "🗑 Delete",
    "notes.buttons.deleteLoading": "Deleting...",
    "notes.buttons.editSave": "Save",
    "notes.buttons.editSaveLoading": "Saving...",
    "notes.buttons.editCancel": "Cancel",

    // Accordion aria-labels
    "notes.list.aria.expand": "Expand note",
    "notes.list.aria.collapse": "Collapse note",

    // -------------------------
    // TASKS PAGE
    // -------------------------
    "tasks.checkingSession": "Checking your session…",
    "tasks.title": "Tasks",
    "tasks.loginPrompt":
      "Log in or create a free account to track your tasks.",
    "tasks.goToAuth": "Go to login / signup",

    "tasks.loadError": "Failed to load tasks.",
    "tasks.addError": "Failed to add task.",
    "tasks.updateError": "Could not update task.",
    "tasks.saveError": "Could not save task.",
    "tasks.deleteError": "Could not delete task.",

    "tasks.subtitle":
      "Capture tasks, check them off, and keep track of your progress.",
    "tasks.addNewTask": "Add a new task",
    "tasks.aiTaskCreator": "🤖 AI Task Creator",

    "tasks.newTaskTitlePlaceholder": "Task title…",
    "tasks.newTaskDescriptionPlaceholder": "Optional description or notes…",

    "tasks.dueDateLabel": "Due date",
    "tasks.categoryLabel": "Category",
    "tasks.category.none": "None",
    "tasks.timeOptional": "Time (optional)",
    "tasks.timeFromPlaceholder": "From",
    "tasks.timeToPlaceholder": "To",

    "tasks.newReminderLabel": "Set reminder for this task",
    "tasks.newReminderHint":
      "Uses your device timezone. You’ll get an email + push (if enabled) when it’s due.",

    "tasks.addingTask": "Adding…",
    "tasks.addTaskButton": "Add task",

    "tasks.viewLabel": "View:",
    "tasks.viewActive": "Active",
    "tasks.viewHistory": "History",
    "tasks.viewAll": "All",

    "tasks.filterCategoryLabel": "Category:",
    "tasks.filterCategoryAll": "All",
    "tasks.filterCategoryNone": "No category",

    "tasks.selectedCountPrefix": "Selected:",
    "tasks.clearSelection": "Clear selection",

    "tasks.shareLabel": "Share:",
    "tasks.copyTodayTasks": "Copy today’s tasks",
    "tasks.copySelectedTasks": "Copy selected tasks",
    "tasks.shareHeaderToday": "Today's tasks",
    "tasks.shareHeaderSelected": "Selected tasks",
    "tasks.noTasksTodayToShare": "No tasks for today to share.",
    "tasks.noSelectedTasksToShare": "No tasks selected to share.",
    "tasks.copiedTodayTasks": "Today's tasks copied to clipboard.",
    "tasks.copiedSelectedTasks": "Selected tasks copied to clipboard.",
    "tasks.copyFailed": "Failed to copy tasks to clipboard.",
    "tasks.clipboardUnavailable":
      "Clipboard not available. Please copy manually.",

    "tasks.loadingTasks": "Loading tasks…",
    "tasks.noTasksYet": "No tasks yet. Add your first one above.",
    "tasks.noTasksInView":
      "No tasks in this view. Try switching filters above.",

    "tasks.collapseTaskDetails": "Collapse task details",
    "tasks.expandTaskDetails": "Expand task details",

    "tasks.taskDone": "✅ Done",
    "tasks.markAsDone": "✔ Mark as done",
    "tasks.selectLabel": "Select",
    "tasks.untitledTaskPlaceholder": "(untitled task)",

    "tasks.category.noCategory": "No category",

    "tasks.detailsLabel": "Details",
    "tasks.detailsPlaceholder": "Details or notes…",

    "tasks.dueLabel": "Due:",
    "tasks.timeLabel": "Time:",
    "tasks.reminderLabel": "Reminder:",
    "tasks.reminderEnableShort": "Enable",

    "tasks.reminderUpdateError": "Could not update reminder.",

    "tasks.createdLabel": "Created:",
    "tasks.completedLabel": "Completed:",

    "tasks.copiedButton": "✅ Copied",
    "tasks.shareButton": "Share",
    "tasks.shareCopy": "📋 Copy text",
    "tasks.shareWhatsApp": "💬 WhatsApp",
    "tasks.shareViber": "📲 Viber",
    "tasks.shareEmail": "✉️ Email",

    "tasks.deletingLabel": "Deleting…",
    "tasks.deleteLabel": "Delete",

    "tasks.feedbackTitle": "Send feedback about Tasks",
    "tasks.feedbackSubtitle":
      "Spot a bug, missing feature, or something confusing? Let me know.",

    // -------------------------
    // WEEKLY REPORTS PAGES
    // namespace: weeklyReports
    // -------------------------
    "weeklyReports.checkingSession": "Checking your session...",
    "weeklyReports.title": "Weekly Reports",
    "weeklyReports.loginPrompt":
      "Log in or create a free account to view your weekly AI reports.",
    "weeklyReports.goToAuth": "Go to login / signup",

    "weeklyReports.loadError": "Failed to load weekly report.",
    "weeklyReports.notFoundError": "Weekly report not found.",
    "weeklyReports.loadingReport": "Loading weekly report...",

    "weeklyReports.detailTitle": "Weekly Report",
    "weeklyReports.weekOfLabel": "Week of",
    "weeklyReports.planLabel": "Plan:",
    "weeklyReports.summaryLabel": "WEEKLY SUMMARY",
    "weeklyReports.noSummary": "This weekly report has no summary text.",

    "weeklyReports.emailNote": "Weekly AI email reports are a Pro feature.",
    "weeklyReports.upgradeToPro": "Upgrade to Pro",
    "weeklyReports.emailNoteTail":
      "to receive a summary in your inbox every week.",

    "weeklyReports.actionPlanTitle": "WEEKLY ACTION PLAN (AI)",
    "weeklyReports.planGenerateError":
      "Could not generate weekly action plan. Please try again.",
    "weeklyReports.planNetworkError":
      "Network error while generating weekly action plan.",
    "weeklyReports.planGenerateSuccess": "Weekly action plan generated.",

    "weeklyReports.actionPlanProOnly":
      "AI-powered weekly action plans are a Pro feature.",
    "weeklyReports.actionPlanProDesc":
      "Upgrade to Pro to get a focused action plan for each week, based on your reports, tasks, and notes.",
    "weeklyReports.unlockWithPro": "🔒 Unlock with Pro",

    "weeklyReports.savedPlanLabel": "Your saved action plan for this week:",
    "weeklyReports.generatePlanHint":
      "Generate a focused action plan for this week based on your report, tasks, notes, and productivity scores.",
    "weeklyReports.generatingPlan": "Generating action plan...",
    "weeklyReports.regeneratePlan": "Regenerate action plan",
    "weeklyReports.generatePlan": "Generate weekly action plan",
    "weeklyReports.planNote":
      "This uses 1 AI call and overwrites the previous plan for this week (if any).",

    "weeklyReports.backToList": "← Back to weekly reports",

    // List page
    "weeklyReports.listTitle": "Weekly AI Reports",
    "weeklyReports.subtitle":
      "See how your AI usage, tasks, and notes add up week by week.",
    "weeklyReports.backToDashboard": "← Back to Dashboard",

    "weeklyReports.lockedTitle":
      "Weekly AI reports are a Pro feature.",
    "weeklyReports.lockedDescription":
      "Upgrade to Pro to unlock weekly reports, higher AI limits, and advanced goal tracking.",
    "weeklyReports.lockedCta":
      "🔒 Unlock Weekly Reports with Pro",

    "weeklyReports.loadingReports": "Loading your weekly reports...",
    "weeklyReports.noReportsYet":
      "No weekly reports yet. You’ll get your first report on Sunday after your first full tracked week.",
    "weeklyReports.viewFullReport": "View full report →",
    "weeklyReports.noSummaryShort": "(no summary available)",

    // SETTINGS (namespace: useT("settings"))

    "settings.checkingSession": "Checking your session...",
    "settings.title": "Settings",
    "settings.loginPrompt":
      "Log in or create a free account to customize your AI experience.",
    "settings.goToAuth": "Go to login / signup",

    "settings.subtitle":
      "Customize how the AI talks to you and what to focus on.",
    "settings.loadError": "Failed to load your settings.",
    "settings.saveError": "Failed to save settings.",
    "settings.saveErrorGeneric": "Something went wrong while saving.",
    "settings.saveSuccess":
      "Settings saved. Your AI will now use this style and preferences.",
    "settings.loadingSettings": "Loading your settings...",

    // Onboarding block
    "settings.onboarding.title": "Onboarding & focus",
    "settings.onboarding.subtitle":
      "Help the app tailor AI prompts, reminders and weekly reports.",
    "settings.onboarding.useCaseLabel":
      "Main way you plan to use this app",
    "settings.onboarding.useCasePlaceholder":
      "Example: I’m a solo founder using this for planning my week, journaling progress and drafting emails.",
    "settings.onboarding.weeklyFocusLabel":
      "One important thing you want to make progress on each week",
    "settings.onboarding.weeklyFocusPlaceholder":
      "Example: Shipping one small improvement to my product every week.",
    "settings.onboarding.reminderLabel": "Light reminder cadence",
    "settings.onboarding.reminder.none": "No reminders",
    "settings.onboarding.reminder.daily": "Daily nudge email",
    "settings.onboarding.reminder.weekly": "Weekly check-in",

    // Weekly report card
    "settings.weeklyReport.badge": "WEEKLY AI REPORT",
    "settings.weeklyReport.proDescription":
      "Get a weekly AI-generated report with your productivity score, streak, completed tasks, and focus suggestions for next week.",
    "settings.weeklyReport.proHint":
      "This is a Pro feature. Upgrade to unlock weekly email reports.",
    "settings.weeklyReport.unlockButton": "🔒 Unlock with Pro",
    "settings.weeklyReport.learnMoreLink": "See how weekly reports work →",
    "settings.weeklyReport.description":
      "Receive a weekly AI summary of your progress, wins, and what to focus on next week.",
    "settings.weeklyReport.checkboxLabel":
      "Send me weekly AI productivity reports",
    "settings.weeklyReport.detail1":
      "Weekly reports use your scores, tasks, notes & goals to give you a simple “how did I do?” email every week.",
    "settings.weeklyReport.detail2":
      "Emails are sent once per week and include your streak, average score, and tailored suggestions.",
    "settings.weeklyReport.viewPastLink": "View past weekly reports →",

    // Daily digest
    "settings.digest.title": "Daily AI email digest",
    "settings.digest.subtitle":
      "Once per day, AI will email you a short summary of recent notes and tasks, plus suggested next steps.",

    // Push notifications (grouped under settings.push.*)
    "settings.push.notSupported":
      "Push notifications are not supported in this browser.",
    "settings.push.enabled":
      "✅ Push notifications enabled for this device.",
    "settings.push.statusCheckError":
      "Could not check push notification status.",
    "settings.push.needsLogin": "You need to be logged in.",
    "settings.push.blocked":
      "❌ Notifications are blocked in your browser. Please allow notifications in your browser settings.",
    "settings.push.enableError":
      "❌ Error enabling push notifications.",
    "settings.push.serviceWorkerUnsupported":
      "Service workers are not supported in this browser.",
    "settings.push.disabled":
      "Push notifications disabled for this device.",
    "settings.push.disableError":
      "❌ Error disabling push notifications.",
    "settings.push.title": "Task reminders (push notifications)",
    "settings.push.description":
      "Enable browser notifications for task reminders. You’ll see a notification when a task you set a reminder for is due.",
    "settings.push.disabling": "Disabling…",
    "settings.push.disableButton": "Disable task reminders (push)",
    "settings.push.enabling": "Enabling…",
    "settings.push.enableButton": "Enable task reminders (push)",

    // Theme & appearance
    "settings.theme.title": "Theme & appearance",
    "settings.theme.subtitle":
      "Choose your app theme. Seasonal themes turn on extra colors.",
    "settings.theme.helpText":
      "Your choice is saved on this device. The default theme follows a dark style; Light is easier in bright environments. Seasonal themes (Halloween, Christmas, Easter) add a bit of fun.",

    // Language dropdown
    "settings.language.label": "Language",
    "settings.language.description":
      "This changes the app interface language and is used as the default target for the “Translate with AI” button.",

    // Focus area
    "settings.focusArea.label": "Main focus area (optional)",
    "settings.focusArea.help":
      'Example: "Work projects", "University study", "Personal growth", or leave blank.',
    "settings.focusArea.placeholder":
      "e.g. Work projects, university, personal life...",

    // Save button
    "settings.savingButton": "Saving...",
    "settings.saveButton": "Save settings",

    // Billing / Stripe
    "settings.billing.description":
      "Manage your subscription, billing details, and invoices in the secure Stripe customer portal.",
    "settings.billing.portalError":
      "Could not open billing portal.",
    "settings.billing.manageButton": "Manage subscription (Stripe)",

    // Export
    "settings.export.description":
      "You can download a copy of your notes and tasks as a Markdown file.",
    "settings.export.error": "Export failed. Please try again.",
    "settings.export.button": "Download my data (.md)",

  // -------------------------
  // DAILY SUCCESS PAGE
"dailySuccess.loadingSystem": "Loading your daily system…",

"dailySuccess.header.title": "AI Daily Success System",
"dailySuccess.header.subtitle":
  "Start your day with a focused plan, end it with a clear reflection, and track your progress with a simple score.",
"dailySuccess.header.backToDashboard": "← Back to dashboard",

"dailySuccess.freeBanner.title": "You're on the Free plan.",
"dailySuccess.freeBanner.body":
  "The Daily Success System works great on Free, but Pro will unlock higher AI usage and future automation (auto-generated plans, weekly reports, and more).",
"dailySuccess.freeBanner.button": "View Pro options",

"dailySuccess.status.sentToAssistant":
  "Sent to the AI assistant. Open the assistant panel to see your result.",

"dailySuccess.morning.errorEmpty":
  "Add at least one detail about your day or a priority.",
"dailySuccess.evening.errorEmpty":
  "Write a short reflection about how your day went.",

"dailySuccess.score.loginToSave": "Log in to save your daily score.",
"dailySuccess.score.saveError": "Failed to save your daily score.",
"dailySuccess.score.savedMessage":
  "Saved! Your streak and averages are updated.",
"dailySuccess.score.todayLabel": "Today's score",
"dailySuccess.score.todayHelp":
  "0 = terrible day, 100 = perfect day. Be honest, not harsh.",
"dailySuccess.score.avg7Label": "Avg last 7 days",
"dailySuccess.score.avg7Help": "Aim for consistency, not perfection.",
"dailySuccess.score.streakLabel": "Success streak (score ≥ 60)",
"dailySuccess.score.streakDay": "day",
"dailySuccess.score.streakDays": "days",
"dailySuccess.score.streakHelp":
  "Days in a row you rated your day 60+.",
"dailySuccess.score.loadingRecent": "Loading your recent scores…",
"dailySuccess.score.sliderLabel": "How would you rate today overall?",
"dailySuccess.score.sliderHelp":
  "Think about effort + focus, not just outcomes. A 60–80 day is often a win.",
"dailySuccess.score.savingButton": "Saving...",
"dailySuccess.score.saveButton": "Save today's score",

"dailySuccess.suggest.loginRequired":
  "Log in to let AI suggest a score.",
"dailySuccess.suggest.errorGeneric":
  "Could not get an AI suggestion.",
"dailySuccess.suggest.networkError":
  "Network error while asking AI to suggest your score.",
"dailySuccess.suggest.asking": "Asking AI…",
"dailySuccess.suggest.button": "Let AI suggest today's score",
"dailySuccess.suggest.helperText":
  "AI looks at your tasks & notes to guess a realistic score. You can still adjust it.",
"dailySuccess.suggest.reasonPrefix": "Suggested because:",

"dailySuccess.morning.title": "🌅 Morning: Design your day",
"dailySuccess.morning.subtitle":
  "Tell the AI what's on your plate, and it will build a realistic schedule with priorities.",
"dailySuccess.morning.labelWhatsHappening": "What's happening today?",
"dailySuccess.morning.placeholderWhatsHappening":
  "Meetings, deadlines, personal tasks, energy level, etc.",
"dailySuccess.morning.labelTopPriorities": "Top 3 priorities",
"dailySuccess.morning.priorityPlaceholder": "Priority",
"dailySuccess.morning.prioritiesHint":
  "You don't have to fill all three, but at least one priority helps a lot.",
"dailySuccess.morning.buttonGeneratePlan": "✨ Generate today's AI plan",

"dailySuccess.evening.title": "🌙 Evening: Reflect & score your day",
"dailySuccess.evening.subtitle":
  "Capture how your day went. The AI will turn it into wins, lessons, and improvements for tomorrow.",
"dailySuccess.evening.labelReflection":
  "How did today actually go?",
"dailySuccess.evening.placeholderReflection":
  "What you got done, what derailed you, your energy, distractions, etc.",
"dailySuccess.evening.buttonReflect": "💭 Reflect with AI",

"dailySuccess.helper.hintTitle": "Hint for best results:",
"dailySuccess.helper.item1": "Mention 2–3 things you're proud of.",
"dailySuccess.helper.item2":
  "Be honest about distractions and procrastination.",
"dailySuccess.helper.item3":
  "Add how you'd like tomorrow to feel.",

"dailySuccess.footer.note":
  "Your answers and scores are processed by the AI assistant. You can always fine-tune the output directly in the assistant panel.",
    // -------------------------
    // PLANNER (useT("planner"))
    // -------------------------
    "planner.checkingSession": "Checking your session...",
    "planner.title": "Daily Planner",
    "planner.subtitle":
      "Let AI turn your tasks into a focused plan for today.",
    "planner.loginPrompt":
      "Log in or create a free account to generate an AI-powered daily plan.",
    "planner.goToAuth": "Go to login / signup",
    "planner.loggedInAs": "Logged in as",
    "planner.youFallback": "you",
    "planner.instructions":
      "This planner looks at your open tasks in the app and suggests what to focus on today. You can refresh it during the day if your priorities change.",
    "planner.generateButton": "Generate today’s plan",
    "planner.generatingButton": "Generating plan...",
    "planner.aiLimitNote":
      "Uses your daily AI limit (shared with notes, assistant, and dashboard summary).",
    "planner.aiUsageTodayPrefix": "AI usage today:",
    "planner.error.invalidResponse": "Server returned an invalid response.",
    "planner.error.rateLimit":
      "You’ve reached today’s AI limit for your plan. Try again tomorrow or upgrade to Pro.",
    "planner.error.generic": "Failed to generate daily plan.",
    "planner.error.network":
      "Network error while generating your plan.",
    "planner.link.viewTasks": "→ View & edit your tasks",
    "planner.link.openDashboard": "Open Dashboard",
    "planner.todaysPlanHeading": "TODAY'S PLAN",
    "planner.noPlanYet":
      "No plan generated yet. Click the button above to create an AI-powered plan based on your current tasks.",
    "planner.feedbackTitle": "Send feedback about Daily Planner",
    "planner.feedbackSubtitle":
      "Did the plan help? Missing something? Share your thoughts so I can improve it.",
    // -------------------------
    // TRAVEL (useT("travel"))
    // -------------------------
    "travel.title": "Travel Planner (beta)",
    "travel.subtitle":
      "Let AI help you plan your trip – then book your stay via Booking.com. Open to everyone, no login needed. Log in if you want to save your trip.",
    "travel.checkingAccount": "Checking account…",
    "travel.loggedInAs": "Logged in as",
    "travel.guestBrowsing": "You're browsing as guest.",
    "travel.createAccountLink": "Create a free account",
    "travel.saveTripsHint": "to save trips.",

    "travel.tripDetails.heading": "Trip details",
    "travel.tripDetails.destinationLabel": "Destination",
    "travel.tripDetails.destinationPlaceholder":
      "e.g. Athens, Barcelona, London",
    "travel.tripDetails.checkinLabel": "Check-in",
    "travel.tripDetails.checkoutLabel": "Check-out",
    "travel.tripDetails.adultsLabel": "Adults",
    "travel.tripDetails.childrenLabel": "Children",
    "travel.tripDetails.minBudgetLabel": "Min budget (optional)",
    "travel.tripDetails.maxBudgetLabel": "Max budget (optional)",

    "travel.presets.weekend": "Weekend trip (2 nights)",
    "travel.presets.week": "1 week (6 nights)",
    "travel.presets.cityBreak": "3–4 day city break",

    "travel.error.missingFields": "Please fill destination and dates first.",
    "travel.error.invalidResponse": "Server returned an invalid response.",
    "travel.error.generateFailed": "Failed to generate travel plan.",
    "travel.error.network": "Network error while generating travel plan.",

    "travel.buttons.generating": "Generating...",
    "travel.buttons.generateTripPlan": "Generate AI trip plan",
    "travel.buttons.searchStays": "Search stays on Booking.com →",

    "travel.affiliateNote":
      "Booking links may be affiliate links. They help support the app at no extra cost to you.",

    "travel.flights.heading": "Flights",
    "travel.flights.departureLabel": "Departure city",
    "travel.flights.departurePlaceholder": "e.g. Athens, London",
    "travel.flights.departureHint":
      "If empty, we’ll use your destination as a fallback.",
    "travel.flights.searchButton": "Search flights →",
    "travel.flights.note":
      "We send you to a flights search page (for now Google Flights). You can hook in a proper affiliate link later.",

    "travel.cars.heading": "Car rental",
    "travel.cars.pickupLabel": "Pickup location",
    "travel.cars.pickupPlaceholder": "e.g. Airport, city name",
    "travel.cars.pickupHint":
      "If empty, we’ll use your destination as pickup location.",
    "travel.cars.searchButton": "Search rental cars →",
    "travel.cars.note":
      "Car rental search opens on Booking.com. If your affiliate ID is set, it will be tracked via your aid.",

    "travel.images.heading": "Destination preview",
    "travel.images.note":
      "Photos are illustrative and may not match your exact stay or view.",

    "travel.itinerary.heading": "AI itinerary",
    "travel.itinerary.empty":
      "Fill in your trip details and click Generate AI trip plan to get a structured itinerary and suggestions.",
    "travel.itinerary.guestSavePrompt":
      "Want to save this trip and access it later?",
    "travel.itinerary.guestSaveButton":
      "Create a free account / Log in",

    "travel.save.missingFields":
      "Fill destination, dates and generate a plan first.",
    "travel.save.error": "Could not save trip. Please try again.",
    "travel.save.networkError": "Network error while saving trip.",
    "travel.save.success": "Trip saved to your account ✅",
    "travel.save.buttonSaving": "Saving trip...",
    "travel.save.button": "Save this trip to my account",

    "travel.assistant.heading": "Planning assistant",
    "travel.assistant.step1Title":
      "1/3 – Where do you want to go?",
    "travel.assistant.destinationPlaceholder":
      "e.g. Rome, Paris, Prague",
    "travel.assistant.step1Next": "Next: How many days?",
    "travel.assistant.step2Title":
      "2/3 – How many days do you want to stay?",
    "travel.assistant.preset3days": "3 days",
    "travel.assistant.preset5days": "5 days",
    "travel.assistant.preset7days": "7 days",
    "travel.assistant.step2Next": "Next: Who’s going?",
    "travel.assistant.step3Title": "3/3 – Who's going?",
    "travel.assistant.adultsLabel": "Adults",
    "travel.assistant.childrenLabel": "Children",
    "travel.assistant.apply": "Apply to form & use AI",
    "travel.assistant.back": "← Back",
    "travel.assistant.finalHint":
      "Once applied, just hit Generate AI trip plan to get your itinerary.",

    "travel.guestCta.title":
      "Want to save your trips and access them later?",
    "travel.guestCta.body":
      "Create a free account to save your AI-generated itineraries, sync them with your productivity dashboard, and get weekly summaries.",
    "travel.guestCta.button": "Create free account / Log in",

    "travel.calendar.selectDate": "Select date",
    "travel.calendar.weekday.su": "Su",
    "travel.calendar.weekday.mo": "Mo",
    "travel.calendar.weekday.tu": "Tu",
    "travel.calendar.weekday.we": "We",
    "travel.calendar.weekday.th": "Th",
    "travel.calendar.weekday.fr": "Fr",
    "travel.calendar.weekday.sa": "Sa",
    // ---------------
    // HOME / LANDING PAGE

// Hero
"home.hero.badgeLabel": "New",
"home.hero.badgeText": "Weekly AI reports, travel planner & daily success score",
"home.hero.titlePrefix": "Your AI workspace for",
"home.hero.titleHighlight": "focus, planning & tiny wins.",
"home.hero.subtitle": "Capture notes, plan your day, track what matters, and let AI summarize your progress.",
"home.hero.primaryCtaLoggedIn": "Open your dashboard",
"home.hero.primaryCtaLoggedOut": "Start for free",
"home.hero.secondaryCtaLoggedIn": "Go to Notes",
"home.hero.secondaryCtaLoggedOut": "Log in",
"home.hero.viewAllTools": "View all tools",
"home.hero.bottomLine": "No credit card required • Free plan included • Built for solo makers, students and busy humans ✨",
"home.hero.shareTitle": "Check out this AI Productivity Hub",

// Preview card
"home.preview.heading": "Today at a glance",
"home.preview.scoreLabel": "Productivity score",
"home.preview.deltaText": "+12 vs yesterday",
"home.preview.focusLabel": "Today’s focus",
"home.preview.focusText": "Ship landing page, reply to clients, 30min learning.",
"home.preview.aiWinsLabel": "AI wins",
"home.preview.aiWins1": "Summarized 4 messy notes",
"home.preview.aiWins2": "Drafted 2 emails",
"home.preview.aiWins3": "Planned tomorrow in 2 minutes",
"home.preview.note": "This is a preview. Your dashboard updates live as you add content.",

// Tools section
"home.tools.sectionLabel": "WHAT YOU GET",
"home.tools.heading": "A small toolkit for planning, focus and follow-through.",
"home.tools.subheading": "Every page in AI Productivity Hub is a focused tool. No endless widgets — just the essentials for days, weeks and long-term goals.",
"home.tools.viewAll": "View all tools",
"home.tools.opensLabel": "Opens",

"home.tools.dashboard.label": "Dashboard overview",
"home.tools.dashboard.tagline": "See your day, score, and focus in one place.",
"home.tools.dashboard.description": "Your home base: daily success score, focus for today, quick links to tasks, notes and weekly progress.",
"home.tools.dashboard.highlight1": "Today at a glance",
"home.tools.dashboard.highlight2": "Daily Success score & trend",
"home.tools.dashboard.highlight3": "Quick access to all tools",
"home.tools.dashboard.cta": "Open dashboard",

"home.tools.notes.label": "Notes & AI workspace",
"home.tools.notes.tagline": "Capture ideas, drafts and progress logs.",
"home.tools.notes.description": "Keep everything in one place and let AI summarize, clean up or extract tasks from your notes.",
"home.tools.notes.highlight1": "Fast note capture",
"home.tools.notes.highlight2": "AI summaries & clean-ups",
"home.tools.notes.highlight3": "Great for journaling & meeting notes",
"home.tools.notes.cta": "Go to Notes",

"home.tools.tasks.label": "Tasks & reminders",
"home.tools.tasks.tagline": "Simple task list with real reminders.",
"home.tools.tasks.description": "Add tasks with due dates, time windows, categories and per-task reminders that can trigger email + push.",
"home.tools.tasks.highlight1": "Time-boxed tasks with categories",
"home.tools.tasks.highlight2": "Reminders via email & push",
"home.tools.tasks.highlight3": "Share tasks to WhatsApp, Viber, email",
"home.tools.tasks.cta": "Open Tasks",

"home.tools.aiTaskCreator.label": "AI Task Creator",
"home.tools.aiTaskCreator.tagline": "Turn vague goals into clear steps.",
"home.tools.aiTaskCreator.description": "Paste a messy goal and let AI break it into small, prioritized tasks you can send straight into your board.",
"home.tools.aiTaskCreator.highlight1": "Turns goals into checklists",
"home.tools.aiTaskCreator.highlight2": "Smart priorities & time hints",
"home.tools.aiTaskCreator.highlight3": "Works great with your Tasks page",
"home.tools.aiTaskCreator.cta": "Use AI Task Creator",

"home.tools.weeklyReports.label": "Weekly AI reports",
"home.tools.weeklyReports.tagline": "A lightweight review written for you by AI.",
"home.tools.weeklyReports.description": "See how your week went, what worked, and what to focus on next — powered by your scores, tasks and notes.",
"home.tools.weeklyReports.highlight1": "Weekly score & streak view",
"home.tools.weeklyReports.highlight2": "Highlights wins & bottlenecks",
"home.tools.weeklyReports.highlight3": "Focus suggestions for next week",
"home.tools.weeklyReports.cta": "View weekly history",

"home.tools.settings.label": "Notifications & themes",
"home.tools.settings.tagline": "Make the app feel like your own.",
"home.tools.settings.description": "Control email digests, push reminders, timezone and themes — including seasonal looks like Halloween or Christmas.",
"home.tools.settings.highlight1": "Email & push reminder controls",
"home.tools.settings.highlight2": "Timezone & reminder cadence",
"home.tools.settings.highlight3": "Dark, light & seasonal themes",
"home.tools.settings.cta": "Open Settings",

// Pricing
"home.pricing.sectionLabel": "PRICING",
"home.pricing.heading": "Start free. Upgrade when it becomes part of your day.",

"home.pricing.free.label": "FREE",
"home.pricing.free.price": "€0",
"home.pricing.free.description": "Great for light usage, daily planning and basic AI help.",
"home.pricing.free.feature1": "✔ Notes",
"home.pricing.free.feature2": "✔ Tasks",
"home.pricing.free.feature3": "✔ Daily Success Score",
"home.pricing.free.feature4": "✔ Weekly Goals",
"home.pricing.free.feature5": "✔ Travel Planner (basic)",
"home.pricing.free.feature6": "✔ 20 AI messages/day",
"home.pricing.free.feature7": "✔ Templates (basic)",
"home.pricing.free.feature8": "✔ Sync across devices",

"home.pricing.pro.label": "PRO",
"home.pricing.pro.priceMonthly": "€8.49 / month",
"home.pricing.pro.priceYearly": "€79 / year (save 25%)",
"home.pricing.pro.description": "Unlimited AI, weekly reports, advanced planning tools, templates and more.",
"home.pricing.pro.feature1": "🔥 Everything in Free",
"home.pricing.pro.feature2": "🔥 Unlimited AI messages",
"home.pricing.pro.feature3": "🔥 Weekly AI Email Report",
"home.pricing.pro.feature4": "🔥 AI Task Planning",
"home.pricing.pro.feature5": "🔥 Advanced Travel Planner",
"home.pricing.pro.feature6": "🔥 Unlimited Notes & Templates",
"home.pricing.pro.manageCta": "Manage your plan",
"home.pricing.pro.upgradeCta": "Upgrade when you're ready",

// FAQ
"home.faq.sectionLabel": "FAQ",
"home.faq.q1": "Do I need to be technical to use this?",
"home.faq.a1": "Nope — it's intentionally simple and beginner-friendly.",
"home.faq.q2": "What's the difference between Free and Pro?",
"home.faq.a2": "Free covers basics. Pro unlocks unlimited AI and deeper planning tools.",
"home.faq.q3": "Can I cancel anytime?",
"home.faq.a3": "Yes! You keep your data even after cancellation.",

// Bottom CTA
"home.bottomCta.title": "Ready to give it a try?",
"home.bottomCta.body": "Create a free account in under a minute.",
"home.bottomCta.primary": "Create free account",
"home.bottomCta.secondary": "Already have an account?",

// Footer
"home.footer.ownerLine": "AI Productivity Hub — aiprod.app — Owner: AlphaSynth AI",
"home.footer.changelogLink": "What's new",
"home.footer.privacyLink": "Privacy",
"home.footer.termsLink": "Terms",

    // -------------------------
    // Tools en
    // -------------------------
"tools.header.sectionLabel": "ALL TOOLS",
"tools.header.title": "Every tool in AI Productivity Hub, explained.",
"tools.header.subtitle":
  "Think of this as your map. Each section below is a page or feature inside the app — what it does, when to use it, and how to get the most value from it.",

"tools.tool.routeLabel": "Route:",
"tools.tool.bestForTitle": "Best for",
"tools.tool.howToUseTitle": "How to use it",
"tools.tool.proTipLabel": "Pro tip:",

"tools.changelog.title": "What’s new & release notes",
"tools.changelog.description":
  "Curious about new tools, improvements and bug fixes? The What’s New page (changelog) tracks how the app evolves over time.",
"tools.changelog.cta": "View What’s New",

"tools.backToHome": "← Back to homepage",

// one example tool block:
"tools.dashboard.name": "Dashboard overview",
"tools.dashboard.shortTagline":
  "Today at a glance, plus your Daily Success score.",
"tools.dashboard.description":
  "The dashboard is your home base. It pulls together your daily productivity score, quick links to notes, tasks, travel planner and weekly history so you can see where you stand in a few seconds.",
"tools.dashboard.bestFor1": "Starting your day with a quick overview",
"tools.dashboard.bestFor2": "Checking your Daily Success score and streak",
"tools.dashboard.bestFor3":
  "Jumping into Tasks, Notes, AI Hub Chat or Weekly history from one place",
"tools.dashboard.howToUse1":
  "Open the dashboard from the top navigation or from the homepage CTA.",
"tools.dashboard.howToUse2":
  "Glance at your Daily Success score and trend to see how today compares to previous days.",
"tools.dashboard.howToUse3":
  "Use the quick links to hop into Tasks, Notes, AI Hub Chat or Weekly history depending on what you want to work on.",
"tools.dashboard.cta": "Open dashboard",
    // -------------------------
    // MY TRIPS (useT("myTrips"))
    // -------------------------
    "myTrips.status.checkingSession": "Checking your session...",
    "myTrips.errors.loadTrips": "Failed to load your trips.",

    "myTrips.unauth.message":
      "Log in or create a free account to save and view your AI travel plans.",
    "myTrips.unauth.cta": "Go to login / signup",

    "myTrips.header.title": "My Trips",
    "myTrips.header.subtitle":
      "All the trips you've planned with the Travel Planner.",
    "myTrips.header.backToPlanner": "← Back to Travel Planner",

    "myTrips.status.loadingTrips": "Loading your trips...",

    "myTrips.empty.title": "You don't have any saved trips yet.",
    "myTrips.empty.description":
      'Use the Travel Planner to generate an AI itinerary, then tap "Save this trip to my account".',
    "myTrips.empty.cta": "Plan a trip →",

    "myTrips.trip.unnamed": "Unnamed trip",
    "myTrips.trip.nightsSingular": "night",
    "myTrips.trip.nightsPlural": "nights",
    "myTrips.trip.adultSingular": "adult",
    "myTrips.trip.adultPlural": "adults",
    "myTrips.trip.childSingular": "child",
    "myTrips.trip.childPlural": "children",

    "myTrips.trip.budgetLabel": "Budget",
    "myTrips.trip.budgetFrom": "from",
    "myTrips.trip.budgetSeparator": "–",
    "myTrips.trip.budgetTo": "up to",

    "myTrips.trip.viewDetails": "View details",
    "myTrips.trip.hideDetails": "Hide details",
    "myTrips.trip.savedItineraryLabel": "Saved AI itinerary",
    "myTrips.trip.noPlanText": "(no plan text saved)",
    // -------------------------
    // FEEDBACK PAGE (useT("feedback"))
    // -------------------------
    "feedback.status.checkingSession": "Checking your session...",
    "feedback.status.loading": "Loading feedback...",
    "feedback.errors.loadFeedback": "Failed to load feedback.",

    "feedback.header.title": "Feedback",
    "feedback.header.subtitle":
      "Internal page showing all feedback messages stored in Supabase.",

    "feedback.unauth.message":
      "You're not logged in. Log in to see feedback messages.",
    "feedback.unauth.cta": "Go to login / signup",

    "feedback.notAdmin.message": "This page is only available to the admin.",
    "feedback.notAdmin.cta": "Go back to home",

    "feedback.empty.message":
      "No feedback yet. Once users send messages from the app, they'll appear here.",

    "feedback.row.fromPrefix": "From",
    "feedback.row.anonymous": "Anonymous / not logged in",
    // -------------------------
    // AI CHAT (useT("aiChat"))
    // -------------------------
    "aiChat.status.checkingSession": "Checking your session…",

    "aiChat.login.title": "AI Hub Chat",
    "aiChat.login.body":
      "Log in or create a free account to chat with your AI coach and keep your conversations saved.",
    "aiChat.login.cta": "Go to login / signup",

    "aiChat.header.title": "AI Hub Chat",
    "aiChat.header.subtitle":
      "A general-purpose AI coach for planning, ideas and questions.",

    "aiChat.sidebar.conversationsLabel": "Conversations",
    "aiChat.sidebar.newChatButton": "+ New chat",
    "aiChat.sidebar.loading": "Loading conversations…",
    "aiChat.sidebar.empty":
      "No conversations yet. Start a new chat on the right.",
    "aiChat.sidebar.renameTooltip": "Rename chat",
    "aiChat.sidebar.deleteTooltip": "Delete chat",

    "aiChat.mobile.historyButton": "History",
    "aiChat.mobile.newChatButton": "+ New chat",
    "aiChat.mobile.historyTitle": "Conversation history",
    "aiChat.mobile.closeButton": "✕ Close",
    "aiChat.mobile.empty": "No conversations yet. Start a new chat.",

    "aiChat.usage.label": "AI replies today:",
    "aiChat.usage.unlimitedSuffix": "(unlimited)",
    "aiChat.usage.freeSuffix": "(free)",

    "aiChat.messages.loading": "Loading conversation…",
    "aiChat.messages.emptyIntro": "Start by asking something like:",
    "aiChat.messages.example1":
      "Help me plan my week around work and personal goals.",
    "aiChat.messages.example2":
      "Turn my todo list into 3 clear priorities.",
    "aiChat.messages.example3":
      "I feel overwhelmed — where should I start today?",

    "aiChat.input.categoryLabel": "Category:",
    "aiChat.input.categoryHelper":
      "Helps the AI adapt tone & suggestions.",
    "aiChat.input.placeholder":
      "Ask anything — planning, focus, ideas, mindset…",
    "aiChat.input.sending": "Sending…",
    "aiChat.input.limitReached": "Daily limit reached",
    "aiChat.input.send": "Send",

    "aiChat.errors.loadThreads": "Failed to load conversations.",
    "aiChat.errors.loadMessages": "Failed to load messages.",
    "aiChat.errors.notLoggedIn":
      "You must be logged in to chat with AI.",
    "aiChat.errors.freeLimitReached":
      "You reached your daily AI limit for the free plan (20 replies).",
    "aiChat.errors.sendFailed": "Failed to send message.",
    "aiChat.errors.networkSend":
      "Network error while sending message.",
    "aiChat.errors.saveThread":
      "Failed to save conversation, but you can continue chatting.",
    "aiChat.errors.deleteFailed": "Failed to delete chat.",
    "aiChat.errors.deleteNetwork":
      "Failed to delete chat due to a network error.",
    "aiChat.errors.renameFailed": "Failed to rename chat.",
    "aiChat.errors.renameNotFound":
      "Chat not found or not accessible.",
    "aiChat.errors.renameNetwork":
      "Failed to rename chat due to a network error.",

    "aiChat.confirm.deleteThread":
      "Delete this chat? This cannot be undone.",
    "aiChat.prompt.renameTitle": "New title for this chat:",
    "aiChat.untitledChat": "Untitled chat",
    "aiChat.newConversationFallback": "New conversation",
// ai-task-creator (useT("aiTaskCreator"))
"aiTaskCreator.checkingSession": "Checking your session…",
"aiTaskCreator.title": "AI Task Creator",
"aiTaskCreator.loginPrompt": "Log in or create a free account to let AI generate a personalized task list for your day.",
"aiTaskCreator.loginCta": "Go to login / signup",
"aiTaskCreator.subtitle": "Answer a few quick questions and let AI build a realistic task list for today. Then one click to add them to your Tasks.",
"aiTaskCreator.backToTasks": "← Back to Tasks",

"aiTaskCreator.freeBanner.title": "Works on Free – shines on Pro.",
"aiTaskCreator.freeBanner.body": "AI task creation uses your daily AI limit. ",
"aiTaskCreator.freeBanner.highlight": "Pro gives you much higher limits and more automation",
"aiTaskCreator.freeBanner.tail": "for planning and weekly reports.",
"aiTaskCreator.freeBanner.cta": "View Pro options",

"aiTaskCreator.errors.loginRequired": "Log in to generate AI tasks.",
"aiTaskCreator.errors.missingGoalOrPlan": "Tell the AI at least your main plan or goal for today.",
"aiTaskCreator.errors.generateFailed": "Could not generate tasks. Please try again.",
"aiTaskCreator.errors.noTasksReturned": "AI did not return any tasks. Try adding more detail.",
"aiTaskCreator.errors.networkGenerate": "Network error while generating tasks.",
"aiTaskCreator.errors.loginToCreate": "Log in to create tasks.",
"aiTaskCreator.errors.noTasksYet": "Generate tasks first, or add at least one task.",
"aiTaskCreator.errors.emptyAfterClean": "Your task list is empty.",
"aiTaskCreator.errors.insertFailed": "Failed to create tasks in your account.",
"aiTaskCreator.errors.networkCreate": "Network error while creating tasks.",
"aiTaskCreator.status.created": "Tasks created! Redirecting to your Tasks…",

"aiTaskCreator.form.heading": "Tell the AI about your day",
"aiTaskCreator.form.subheading": "The more realistic you are, the better the task suggestions.",
"aiTaskCreator.form.gender.label": "Gender (optional)",
"aiTaskCreator.form.gender.skip": "Prefer not to say",
"aiTaskCreator.form.gender.male": "Male",
"aiTaskCreator.form.gender.female": "Female",
"aiTaskCreator.form.gender.other": "Other",
"aiTaskCreator.form.age.label": "Age range",
"aiTaskCreator.form.age.under18": "< 18",
"aiTaskCreator.form.age.18_24": "18–24",
"aiTaskCreator.form.age.25_34": "25–34",
"aiTaskCreator.form.age.35_44": "35–44",
"aiTaskCreator.form.age.45plus": "45+",
"aiTaskCreator.form.job.label": "What do you mainly do?",
"aiTaskCreator.form.job.placeholder": "e.g. Software engineer, student, designer, freelancer",
"aiTaskCreator.form.workType.label": "What kind of day is it?",
"aiTaskCreator.form.workType.work": "Work day",
"aiTaskCreator.form.workType.study": "Study day",
"aiTaskCreator.form.workType.mixed": "Mixed",
"aiTaskCreator.form.workType.dayOff": "Day off",
"aiTaskCreator.form.hours.label": "Time available today",
"aiTaskCreator.form.hours.lt1": "< 1 hour",
"aiTaskCreator.form.hours.1_2": "1–2 hours",
"aiTaskCreator.form.hours.2_4": "2–4 hours",
"aiTaskCreator.form.hours.4plus": "4+ hours",
"aiTaskCreator.form.energy.label": "Energy level right now",
"aiTaskCreator.form.energy.help": "1 = exhausted, 10 = full of energy.",
"aiTaskCreator.form.intensity.label": "How intense should today be?",
"aiTaskCreator.form.intensity.light": "Light",
"aiTaskCreator.form.intensity.balanced": "Balanced",
"aiTaskCreator.form.intensity.aggressive": "Deep push",
"aiTaskCreator.form.todayPlan.label": "What's your plan or context for today?",
"aiTaskCreator.form.todayPlan.placeholder": "Meetings, deadlines, errands, appointments, etc.",
"aiTaskCreator.form.mainGoal.label": "Main goal for today",
"aiTaskCreator.form.mainGoal.placeholder": "e.g. Finish draft, pass exam topic, clean the house",
"aiTaskCreator.form.hobbies.label": "Hobbies or interests (optional)",
"aiTaskCreator.form.hobbies.placeholder": "e.g. gym, reading, coding, gaming",
"aiTaskCreator.form.hobbies.help": "The AI can include 1–2 fun or restorative tasks if relevant.",
"aiTaskCreator.buttons.thinking": "Thinking…",
"aiTaskCreator.buttons.generate": "✨ AI: Suggest my tasks for today",

"aiTaskCreator.tasksSection.heading": "AI-suggested tasks",
"aiTaskCreator.tasksSection.subheading": "Review, edit, or delete anything you don't like. Then click one button to create the tasks in your account.",
"aiTaskCreator.tasksSection.generating": "Generating suggestions based on your answers…",
"aiTaskCreator.tasksSection.empty": "No tasks yet. Fill the form on the left and click \"AI: Suggest my tasks\".",
"aiTaskCreator.tasksSection.sizeSuffix": "task",
"aiTaskCreator.tasksSection.delete": "✕",
"aiTaskCreator.tasksSection.creating": "Creating tasks…",
"aiTaskCreator.tasksSection.createButton": "✅ Auto-create these tasks and open Tasks",
"aiTaskCreator.tasksSection.footerNote": "Tasks will be added to your normal Tasks list. You can edit them later like any other task.",
    // TERMS (useT("terms"))
    "terms.title": "Terms of Use",
    "terms.lastUpdatedLabel": "Last updated",

    "terms.intro":
      "By using AI Productivity Hub, you agree to these terms. If you do not agree, please do not use the service.",

    "terms.section1.title": "1. Service description",
    "terms.section1.body":
      "AI Productivity Hub is a personal productivity tool that helps you manage notes, tasks, daily scores, weekly goals, and optional travel plans, with AI-powered assistance.",

    "terms.section2.title": "2. No guarantees",
    "terms.section2.body":
      'This app is provided on an "as is" and "as available" basis. We do not guarantee that the service will be always available, bug-free, or that AI outputs will be accurate, complete, or suitable for any particular purpose.',

    "terms.section3.title": "3. Your account",
    "terms.section3.body":
      "You are responsible for keeping your login details secure and for all activity under your account. Please use a strong password and do not share it with others.",

    "terms.section4.title": "4. Acceptable use",
    "terms.section4.body":
      "You agree not to use the app to store or generate illegal, abusive, or harmful content. We may suspend or terminate access if we detect misuse, abuse, or attempts to attack the service.",

    "terms.section5.title": "5. AI-generated content",
    "terms.section5.body":
      "Suggestions and content generated by AI are for informational and productivity purposes only. They should not be treated as professional advice (for example medical, legal, or financial). You are responsible for how you use the information.",

    "terms.section6.title": "6. Paid plans & billing",
    "terms.section6.body":
      "If you upgrade to a paid plan, billing is handled securely by our payment provider (for example Stripe). Plan details, pricing, and limits may change over time; any changes will usually be reflected in the pricing section of the site.",

    "terms.section7.title": "7. Changes to the service",
    "terms.section7.body":
      "We may update or change features, limits, or the design of the app. We may also update these Terms from time to time. If the changes are material, we'll try to highlight them in the app or changelog.",

    "terms.section8.title": "8. Limitation of liability",
    "terms.section8.body":
      "To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the service, including any decisions made based on AI suggestions.",

    "terms.section9.title": "9. Contact",
    "terms.section9.body":
      "If you have questions about these terms, you can reach us via the Feedback page inside the app or the support email shown there.",

    "terms.disclaimer":
      "This is a simple, human-readable terms page and does not replace proper legal review. For a commercial launch, consider asking a lawyer to review and adapt these terms for your specific situation.",
    // PRIVACY (useT("privacy"))
    "privacy.title": "Privacy Policy",
    "privacy.lastUpdatedLabel": "Last updated",

    "privacy.intro":
      'This Privacy Policy explains how AI Productivity Hub (owned by Anargyros Sgouros) ("we", "our", or "the app") collects, uses, and protects your information when you use our website and services at aiprod.app and our Android app.',

    "privacy.section1.title": "1. Information We Collect",
    "privacy.section1.1.title": "1.1 Account Information",
    "privacy.section1.1.body":
      "When you create an account, we collect your email address and securely store your authentication details using Supabase Authentication.",

    "privacy.section1.2.title": "1.2 User-Generated Content",
    "privacy.section1.2.body":
      "We store the content you create in the app, such as notes, tasks, daily planner entries, trips, daily scores, weekly goals and weekly reports. This data is linked to your account and is private to you.",

    "privacy.section1.3.title": "1.3 Usage & Technical Data",
    "privacy.section1.3.body":
      "We collect limited technical and usage information such as feature usage counts (for AI limits and productivity statistics) and anonymized analytics via Plausible Analytics. We do not use invasive tracking or third-party advertising cookies.",

    "privacy.section2.title": "2. How We Use Your Information",
    "privacy.section2.intro": "We use your data to:",
    "privacy.section2.item1":
      "Provide the core app features (notes, tasks, planner, AI tools)",
    "privacy.section2.item2":
      "Track your daily score and generate weekly reports",
    "privacy.section2.item3":
      "Enforce AI usage limits based on your plan (Free / Pro)",
    "privacy.section2.item4":
      "Process payments and manage subscriptions via Stripe",
    "privacy.section2.item5":
      "Improve stability, performance and user experience",

    "privacy.section3.title": "3. Data Sharing",
    "privacy.section3.body":
      "We do not sell or trade your personal data. We only share data with the following service providers, as needed:",
    "privacy.section3.item1.suffix":
      "– authentication, database and secure data storage",
    "privacy.section3.item2.suffix":
      "– payment processing and subscription billing",
    "privacy.section3.item3.suffix":
      "– privacy-friendly, anonymous analytics",
    "privacy.section3.item4.label": "AI provider",
    "privacy.section3.item4.suffix":
      "– processing text you send for AI features (we do not use AI outputs for advertising or profiling)",

    "privacy.section4.title": "4. Data Retention",
    "privacy.section4.body":
      "We retain your data for as long as your account is active. When you request account deletion, we delete your personal data and associated content from our systems within a reasonable timeframe, except where we must retain limited information for legal, billing or security reasons.",

    "privacy.section5.title": "5. Security",
    "privacy.section5.body":
      "All connections to the app use HTTPS encryption. Data is stored in Supabase with row-level security to ensure each user only has access to their own records. No system is perfectly secure, but we take reasonable measures to protect your information.",

    "privacy.section6.title": "6. Your Rights",
    "privacy.section6.body":
      "Depending on your location, you may have rights to access, update or delete your data. You can delete your account at any time using the in-app option or by contacting us. For details, see:",

    "privacy.section7.title": "7. Contact",
    "privacy.section7.body":
      "If you have questions about this Privacy Policy or how we handle your data, contact us at:",
    // COOKIES (useT("cookies"))
    "cookies.title": "Cookies & Tracking",
    "cookies.lastUpdatedLabel": "Last updated",
    "cookies.appName": "AI Productivity Hub (owned by Anargyros Sgouros)",
    "cookies.intro":
      "uses a minimal amount of cookies and local storage to make the app work correctly and to understand how it is used.",

    "cookies.section1.title": "1. What We Use",
    "cookies.section1.item1.label": "Authentication cookies / tokens",
    "cookies.section1.item1.body": "to keep you logged in securely.",
    "cookies.section1.item2.label": "Preferences / local storage",
    "cookies.section1.item2.body":
      "to remember language, UI settings, and PWA installation state.",
    "cookies.section1.item3.label": "Plausible Analytics",
    "cookies.section1.item3.body":
      "privacy-friendly, cookieless analytics that collect only aggregated usage data (no individual tracking).",

    "cookies.section2.title": "2. No Advertising Cookies",
    "cookies.section2.body":
      "We do not use third-party advertising cookies or trackers for targeted ads. Analytics are used only to improve the app experience.",

    "cookies.section3.title": "3. Managing Cookies",
    "cookies.section3.body":
      "You can clear cookies and local storage from your browser or device settings at any time. If you block all cookies, some features—such as login persistence—may not work correctly.",

    "cookies.section4.title": "4. Contact",
    "cookies.section4.body":
      "If you have questions about how we use cookies or tracking, contact us at:",
      // -------------------------
    // TEMPLATES (useT("templates"))
    // -------------------------
    "templates.checkingSession": "Checking your session...",
    "templates.title": "AI Templates",
    "templates.subtitle":
      "Reusable prompts for planning, focus, study, and writing. Use them with the assistant in one click.",
    "templates.backToDashboard": "← Back to Dashboard",

    "templates.howToUse.title": "How to use these templates",
    "templates.howToUse.item1":
      "Browse or search for a template by category (Planning, Study, Writing, Work, Personal).",
    "templates.howToUse.item2":
      "Click “🤖 Use with Assistant” to send the template into the AI Hub Chat. You can tweak the text or add extra details before you hit send.",
    "templates.howToUse.item3":
      "Click “View / edit” to open the full template, see the exact prompt, and customize it for your own workflow.",
    "templates.howToUse.item4":
      "Templates marked “Pro” are available for Pro / Founder users (or if it's a template you created yourself).",
    "templates.howToUse.item5":
      "The more you use a template, the higher it moves in “Trending public templates” on the right side.",

    "templates.filters.searchPlaceholder": "Search templates...",
    "templates.filters.category.all": "All categories",
    "templates.filters.category.planning": "Planning",
    "templates.filters.category.study": "Study",
    "templates.filters.category.writing": "Writing",
    "templates.filters.category.work": "Work",
    "templates.filters.category.personal": "Personal",

    "templates.error.loadFailed": "Failed to load templates.",
    "templates.loading": "Loading templates…",
    "templates.emptyFiltered": "No templates match this filter yet.",

    "templates.card.untitled": "Untitled template",
    "templates.card.uncategorized": "Uncategorized",
    "templates.card.noDescription":
      "No description yet. Edit this template to add more context.",
    "templates.card.public": "Public",
    "templates.card.private": "Private",
    "templates.card.yours": "Yours",
    "templates.card.proTemplate": "Pro template",
    "templates.card.usedPrefix": "Used",
    "templates.card.usedSuffix": "times",
    "templates.card.lockedMessage":
      "This is a Pro template. Upgrade to use it with the AI assistant and unlock full access.",

    "templates.buttons.useWithAssistant": "Use with Assistant",
    "templates.buttons.viewEdit": "View / edit",
    "templates.buttons.copyLink": "Copy link",

    "templates.trending.title": "🔥 Trending public templates",
    "templates.trending.empty":
      "When templates are used with the assistant, they’ll show up here.",
    "templates.trending.proBadge": "Pro",
    "templates.trending.useButton": "Use",
    "templates.trending.viewButton": "View",
    "templates.trending.footerHint":
      "Make one of your templates public and use it often to push it into the trending list.",

    "templates.assistant.hintPrefix": "Use this template",
    "templates.assistant.hintSuffix":
      "I may add extra details before sending.",
    // -------------------------
    // TEMPLATE DETAIL (useT("templates"))
    // -------------------------
    "templates.detail.loadingTemplate": "Loading template…",
    "templates.detail.backToTemplates": "← Back to templates",
    "templates.detail.createdPrefix": "Created",

    "templates.detail.lockedBanner":
      "This is a Pro template. You can preview it, but only Pro / Founder users (or the owner) can use it with the AI assistant.",
    "templates.detail.upgradeToPro": "Upgrade to Pro",

    "templates.detail.form.titleLabel": "Title",
    "templates.detail.form.descriptionLabel": "Short description",
    "templates.detail.form.promptLabel": "Underlying AI prompt",
    "templates.detail.form.promptHint":
      "This is what gets sent to the AI when you use this template.",
    "templates.detail.form.categoryLabel": "Category",
    "templates.detail.form.publicLabel": "Public template",
    "templates.detail.form.proOnlyLabel": "Pro only",

    "templates.detail.buttons.saving": "Saving...",
    "templates.detail.buttons.saveChanges": "Save changes",
    "templates.detail.buttons.deleting": "Deleting...",
    "templates.detail.buttons.delete": "Delete template",

    "templates.detail.viewOnlyHint":
      "You can view this template, but only the owner can edit or delete it.",

    "templates.detail.error.notFound": "Template not found.",
    "templates.detail.error.loadFailed": "Failed to load template.",
    "templates.detail.error.saveFailed": "Failed to save template.",
    "templates.detail.error.deleteFailed": "Failed to delete template.",
    "templates.detail.delete.confirm": "Delete this template permanently?",
    "templates.detail.success.updated": "Template updated.",
// i18n.ts (inside messages.en = { ... })

// --- Templates: English presets ---
"templates.presets.07cf6d2b-95a8-408c-9793-3b9d7b711215.title": "Spaced Repetition Creator (Pro)",
"templates.presets.07cf6d2b-95a8-408c-9793-3b9d7b711215.description": "Turn content into Q&A cards for spaced repetition.",

"templates.presets.080f34f4-337d-4da9-8cfc-e46db32c5b37.title": "Relationship Check-In",
"templates.presets.080f34f4-337d-4da9-8cfc-e46db32c5b37.description": "Helps reflect on relationship thoughts & actions.",

"templates.presets.0a481a9b-47cf-4d08-a0ab-1c142ebac631.title": "Idea to Outline",
"templates.presets.0a481a9b-47cf-4d08-a0ab-1c142ebac631.description": "Turn a vague idea into a structured outline.",

"templates.presets.0e9b1401-ce69-47c3-ae96-294f986c555c.title": "Weekly Theme Design (Pro)",
"templates.presets.0e9b1401-ce69-47c3-ae96-294f986c555c.description": "Design weekly themes to reduce context switching.",

"templates.presets.1013d562-2867-422a-bd5f-c03c997c0f08.title": "Newsletter Section Ideas (Pro)",
"templates.presets.1013d562-2867-422a-bd5f-c03c997c0f08.description": "Brainstorm recurring sections for a newsletter.",

"templates.presets.11613a3c-2dfd-4d82-8e43-aae48c4bbca6.title": "Focus on One Thing Today",
"templates.presets.11613a3c-2dfd-4d82-8e43-aae48c4bbca6.description": "Choose one main thing to finish today, with support steps.",

"templates.presets.18374272-f9e2-4884-9216-ed44d1fe8771.title": "Concept Simplifier",
"templates.presets.18374272-f9e2-4884-9216-ed44d1fe8771.description": "Explains complex concepts in simple language.",

"templates.presets.1c13045b-e64f-41e5-86de-2b27444c308c.title": "Health Check-in & Tiny Actions (Pro)",
"templates.presets.1c13045b-e64f-41e5-86de-2b27444c308c.description": "Reflect on health habits and propose tiny next actions.",

"templates.presets.21f914ac-b9e0-46fc-91f7-1c3fa428fec8.title": "Task Delegation Helper (Pro)",
"templates.presets.21f914ac-b9e0-46fc-91f7-1c3fa428fec8.description": "Decide what to delegate and how to brief others.",

"templates.presets.29ee3038-c754-495b-83a7-49b916a00871.title": "Performance Review Self-Reflection (Pro)",
"templates.presets.29ee3038-c754-495b-83a7-49b916a00871.description": "Help write a thoughtful self-reflection for performance reviews.",

"templates.presets.2bee91ec-3443-4895-9211-6703c47ff443.title": "Story Outline Maker",
"templates.presets.2bee91ec-3443-4895-9211-6703c47ff443.description": "Generates character + plot outline from an idea.",

"templates.presets.33e43cd7-4732-467a-a13e-0a6f9ffe3c90.title": "Project Breakdown",
"templates.presets.33e43cd7-4732-467a-a13e-0a6f9ffe3c90.description": "Turns a vague project into clear subtasks.",

"templates.presets.3404e934-b33c-4b8c-8ada-53103d28cf7b.title": "Daily Focus Planner",
"templates.presets.3404e934-b33c-4b8c-8ada-53103d28cf7b.description": "Create a simple, realistic plan for today with time blocks and priorities.",

"templates.presets.35c7f261-2afe-4eb3-b236-380409444937.title": "Context List Organizer",
"templates.presets.35c7f261-2afe-4eb3-b236-380409444937.description": "Organize tasks into contexts (home, office, calls, etc.).",

"templates.presets.3d9389b7-a127-434b-ac2a-14952342985f.title": "Brainstorm Companion",
"templates.presets.3d9389b7-a127-434b-ac2a-14952342985f.description": "Generates creative ideas for any topic.",

"templates.presets.4099d4e5-1e66-49c3-8956-0c08f832a048.title": "Learning Roadmap for a Skill (Pro)",
"templates.presets.4099d4e5-1e66-49c3-8956-0c08f832a048.description": "Design a simple roadmap for learning a new skill in 4–8 weeks.",

"templates.presets.43f52bed-1b66-4e9c-8b44-bc3a0ac72dc7.title": "Exam Prep Outline",
"templates.presets.43f52bed-1b66-4e9c-8b44-bc3a0ac72dc7.description": "Converts a topic into a structured study outline.",

"templates.presets.47df7cf9-0360-4037-84eb-c6aee80ff719.title": "Decision Helper",
"templates.presets.47df7cf9-0360-4037-84eb-c6aee80ff719.description": "Evaluates pros/cons and recommends a direction.",

"templates.presets.488807ac-e949-4b4b-a53a-8b22b02472f3.title": "Brainstorm Session Support (Pro)",
"templates.presets.488807ac-e949-4b4b-a53a-8b22b02472f3.description": "Facilitate a structured brainstorm around a topic.",

"templates.presets.49051061-2d30-490d-972c-04bcf2baba81.title": "Quarterly Goals Snapshot (Pro)",
"templates.presets.49051061-2d30-490d-972c-04bcf2baba81.description": "Clarify 3–5 medium-term goals for the next 90 days.",

"templates.presets.4917f21a-42b8-4447-a6bb-d4703d5d7944.title": "Task Clarifier",
"templates.presets.4917f21a-42b8-4447-a6bb-d4703d5d7944.description": "Turns vague tasks into specific, actionable steps.",

"templates.presets.4fee09cf-4bc8-449f-bc1a-b55de529ac1b.title": "Job Application Tailor",
"templates.presets.4fee09cf-4bc8-449f-bc1a-b55de529ac1b.description": "Tailors a resume or cover letter to a job posting.",

"templates.presets.52863f2f-c37a-4b03-948c-e13c1e21b3f6.title": "Meeting Summary Generator",
"templates.presets.52863f2f-c37a-4b03-948c-e13c1e21b3f6.description": "Turn meeting notes into a clean summary with actions.",

"templates.presets.58253a4b-f726-4c0f-927a-60a81d406c2c.title": "Habit Kickstart",
"templates.presets.58253a4b-f726-4c0f-927a-60a81d406c2c.description": "Turns a goal into a simple habit plan.",

"templates.presets.59ec26a0-e4a8-4081-8916-803b562ae98a.title": "Personal Productivity System Audit (Pro)",
"templates.presets.59ec26a0-e4a8-4081-8916-803b562ae98a.description": "Review the user’s current system and suggest improvements.",

"templates.presets.5bfb7b5d-3381-4efc-ad47-74745209f291.title": "Distraction Trigger Map",
"templates.presets.5bfb7b5d-3381-4efc-ad47-74745209f291.description": "Map main distraction triggers and coping strategies.",

"templates.presets.5dc7adcf-e72c-4ad6-9b61-caf813c9c291.title": "Idea Prioritization Grid (Pro)",
"templates.presets.5dc7adcf-e72c-4ad6-9b61-caf813c9c291.description": "Score and rank ideas based on impact and effort.",

"templates.presets.64cbbf7f-a627-48d9-818e-f6d6cc37d507.title": "Social Post Generator",
"templates.presets.64cbbf7f-a627-48d9-818e-f6d6cc37d507.description": "Creates multiple versions of a social media post.",

"templates.presets.6558ec63-8280-4ff7-bd69-eb96a35016cf.title": "Morning Clarity Prompt",
"templates.presets.6558ec63-8280-4ff7-bd69-eb96a35016cf.description": "Helps you start the day with intention & clarity.",

"templates.presets.6759fcb0-8b84-435c-92d4-36d3e13c5848.title": "Flashcard Generator",
"templates.presets.6759fcb0-8b84-435c-92d4-36d3e13c5848.description": "Turns any text into concise flashcards for fast memorization.",

"templates.presets.691a33aa-3c7b-4651-bf83-89609f6464e3.title": "End-of-Day Reflection",
"templates.presets.691a33aa-3c7b-4651-bf83-89609f6464e3.description": "Summarize the day, capture wins, and define a small next step.",

"templates.presets.69d14d9e-b259-4fe7-b0a9-1dfe838c7cb0.title": "Travel Itinerary Builder",
"templates.presets.69d14d9e-b259-4fe7-b0a9-1dfe838c7cb0.description": "Builds a personalized trip itinerary.",

"templates.presets.6a2a648d-02fb-4320-bb18-1ce14d28f343.title": "Time Blocking for a Busy Day",
"templates.presets.6a2a648d-02fb-4320-bb18-1ce14d28f343.description": "Turn a messy list into a time-blocked schedule.",

"templates.presets.6ab69896-ae23-4271-8064-7c2d6006d3c1.title": "Reduce My Commitments (Pro)",
"templates.presets.6ab69896-ae23-4271-8064-7c2d6006d3c1.description": "Review commitments and suggest what to pause or decline.",

"templates.presets.6fa90d52-3e97-40f4-8d76-5d8acf8d2766.title": "Weekly Review + Plan",
"templates.presets.6fa90d52-3e97-40f4-8d76-5d8acf8d2766.description": "Reflect on last week and set priorities for the coming week.",

"templates.presets.707606ec-e734-4739-9446-d36f665be20f.title": "Landing Page Copy Draft (Pro)",
"templates.presets.707606ec-e734-4739-9446-d36f665be20f.description": "Generate a first draft of landing page copy for a product or service.",

"templates.presets.70779af0-7a0a-4fc3-a97e-88005adb511b.title": "Short Social Post Generator",
"templates.presets.70779af0-7a0a-4fc3-a97e-88005adb511b.description": "Generate 3–5 variations of a short social media post.",

"templates.presets.748559a4-0a90-4dc4-b162-7fda67a7e1d4.title": "Meeting Summary Generator",
"templates.presets.748559a4-0a90-4dc4-b162-7fda67a7e1d4.description": "Summarizes meeting notes into decisions and actions.",

"templates.presets.777313a0-c5a1-49ce-b057-e5d48acc9abb.title": "Message Shortener",
"templates.presets.777313a0-c5a1-49ce-b057-e5d48acc9abb.description": "Makes long messages shorter and cleaner.",

"templates.presets.87558d25-a581-403d-b407-ee22836847c0.title": "Interview Prep Question Bank",
"templates.presets.87558d25-a581-403d-b407-ee22836847c0.description": "Create tailored questions to prepare for an interview.",

"templates.presets.89f270dc-a80d-47d5-a829-58df96b895eb.title": "Monthly Reflection + Highlights (Pro)",
"templates.presets.89f270dc-a80d-47d5-a829-58df96b895eb.description": "Review the month and extract insights & highlights.",

"templates.presets.8e5b196b-c6a5-4fcd-9bf0-f27d30792f16.title": "Study Session Breakdown",
"templates.presets.8e5b196b-c6a5-4fcd-9bf0-f27d30792f16.description": "Turns a topic into a 60–90 minute study plan.",

"templates.presets.9926cf96-7daa-4b75-a4d9-56026dcc81ab.title": "Sunday Planning Ritual",
"templates.presets.9926cf96-7daa-4b75-a4d9-56026dcc81ab.description": "A gentle Sunday planning template for the upcoming week.",

"templates.presets.99904746-b879-49cd-aab4-abad35d12443.title": "Motivation Booster",
"templates.presets.99904746-b879-49cd-aab4-abad35d12443.description": "Generates an optimistic motivational message.",

"templates.presets.9ecc5ea4-4f52-49af-bf18-cce6947455ac.title": "Formal Rewrite",
"templates.presets.9ecc5ea4-4f52-49af-bf18-cce6947455ac.description": "Converts casual writing into a formal tone.",

"templates.presets.9f23781b-f87f-4321-b83b-1736666f9b6d.title": "Problem Reframing Helper",
"templates.presets.9f23781b-f87f-4321-b83b-1736666f9b6d.description": "Help reframe a problem from different angles.",

"templates.presets.a09fc2bf-baff-4377-9963-08977b573f1f.title": "Career Brainstorm: Next Moves (Pro)",
"templates.presets.a09fc2bf-baff-4377-9963-08977b573f1f.description": "Explore possible next career steps with pros/cons.",

"templates.presets.a50ac644-47f4-4f76-818d-0009c7d0553d.title": "Gentle Accountability Check-in",
"templates.presets.a50ac644-47f4-4f76-818d-0009c7d0553d.description": "Friendly check-in about my progress without guilt.",

"templates.presets.a559951b-3010-4bfd-a550-6f3b17e3bf4f.title": "Decision Helper: Pros & Cons",
"templates.presets.a559951b-3010-4bfd-a550-6f3b17e3bf4f.description": "Clarify decisions by listing pros/cons and a recommendation.",

"templates.presets.a5d47618-a4e8-4250-9cca-36707041c202.title": "Brain Dump → Organized Buckets",
"templates.presets.a5d47618-a4e8-4250-9cca-36707041c202.description": "Turn a raw brain dump into organized categories.",

"templates.presets.a7bbfcc5-7b2d-4cc4-abab-8a4c128ae766.title": "Study Session Planner",
"templates.presets.a7bbfcc5-7b2d-4cc4-abab-8a4c128ae766.description": "Plan a 60–120 minute focused study session.",

"templates.presets.aaf2a25e-03a5-4669-81cb-c6948f1556a8.title": "Mood Reflection Journal",
"templates.presets.aaf2a25e-03a5-4669-81cb-c6948f1556a8.description": "Helps reflect on emotions without judgment.",

"templates.presets.ab2c83c7-3813-4a82-adca-21b06937cf41.title": "Project Kickoff Planner",
"templates.presets.ab2c83c7-3813-4a82-adca-21b06937cf41.description": "Set scope, risks, and next steps for a new project.",

"templates.presets.af39dab2-341d-4cc5-b6da-f300c4626362.title": "Gratitude & Wins Log",
"templates.presets.af39dab2-341d-4cc5-b6da-f300c4626362.description": "Capture a few things you are grateful for and small wins.",

"templates.presets.b46f44b6-710e-4bb6-ba5e-e527f16009a8.title": "Stress Declutter",
"templates.presets.b46f44b6-710e-4bb6-ba5e-e527f16009a8.description": "Helps unpack stress and organize it into actionable steps.",

"templates.presets.b5d29a06-4623-4144-93de-bbcba79a4363.title": "Weekly Team Update Draft",
"templates.presets.b5d29a06-4623-4144-93de-bbcba79a4363.description": "Draft a short weekly update for your team or manager.",

"templates.presets.bd40513a-f0ad-4ae6-b6bc-46b7165765df.title": "1:1 Meeting Prep",
"templates.presets.bd40513a-f0ad-4ae6-b6bc-46b7165765df.description": "Prepare for a 1:1 with your manager or teammate.",

"templates.presets.c5273090-ad2c-4d18-9666-2079149646c7.title": "Weekly Review",
"templates.presets.c5273090-ad2c-4d18-9666-2079149646c7.description": "Helps me review my week and extract key lessons.",

"templates.presets.c5a1da09-7428-40f4-90b9-2fdad45d05df.title": "Simple Budget Snapshot",
"templates.presets.c5a1da09-7428-40f4-90b9-2fdad45d05df.description": "Create a simple overview of income, spending, and priorities.",

"templates.presets.c7a224c2-8e0d-4602-b308-00672fb79cff.title": "Overwhelmed to Prioritized List",
"templates.presets.c7a224c2-8e0d-4602-b308-00672fb79cff.description": "Turn an overwhelming list into 3-level priorities.",

"templates.presets.c9f8d4a2-ddb1-4cf4-a155-72364ba9eeb5.title": "Concept Simplifier",
"templates.presets.c9f8d4a2-ddb1-4cf4-a155-72364ba9eeb5.description": "Explain a hard concept in simple language with examples.",

"templates.presets.d08e4696-68cc-41c5-baa7-19320c5fcb76.title": "Clear Email Rewrite",
"templates.presets.d08e4696-68cc-41c5-baa7-19320c5fcb76.description": "Rewrite a messy email into a clear, polite version.",

"templates.presets.d1fad9fb-9790-45c7-baf3-00504809b50f.title": "Daily Focus Planner",
"templates.presets.d1fad9fb-9790-45c7-baf3-00504809b50f.description": "Helps me pick the 3 most important things to do today.",

"templates.presets.d551eef8-a655-4d70-b247-da9370671259.title": "Morning Clarity Check-in",
"templates.presets.d551eef8-a655-4d70-b247-da9370671259.description": "A quick morning check-in to clarify focus and energy.",

"templates.presets.da3f7f90-5030-4220-aef8-4bebfbf72d68.title": "Exam Revision Plan (Pro)",
"templates.presets.da3f7f90-5030-4220-aef8-4bebfbf72d68.description": "Create a multi-week revision plan before an exam.",

"templates.presets.da9fde38-2fe4-49aa-b57c-095e20649122.title": "Energy & Mood Journal",
"templates.presets.da9fde38-2fe4-49aa-b57c-095e20649122.description": "Log energy and mood to spot patterns over time.",

"templates.presets.df6cf759-a5b8-4c61-a26b-5ec43d0dd47c.title": "Tone Shift: Friendly Professional",
"templates.presets.df6cf759-a5b8-4c61-a26b-5ec43d0dd47c.description": "Adjust the tone of text to friendly but professional.",

"templates.presets.e00d8c04-0eae-4511-a6e0-5bf9b71f18a1.title": "Travel Day Checklist",
"templates.presets.e00d8c04-0eae-4511-a6e0-5bf9b71f18a1.description": "Generate a simple checklist for an upcoming trip day.",

"templates.presets.e36c6f8b-45a7-4ea4-a8de-ae58e7272ddb.title": "Email Polisher",
"templates.presets.e36c6f8b-45a7-4ea4-a8de-ae58e7272ddb.description": "Takes my rough email and rewrites it politely and clearly.",

"templates.presets.e480b3f8-587d-4a74-8c08-25d4932de32d.title": "Reading Notes Organizer",
"templates.presets.e480b3f8-587d-4a74-8c08-25d4932de32d.description": "Turn raw book/highlight notes into structured takeaways.",

"templates.presets.ebcbc2e9-8c03-46c7-b0bc-c9a805488ec1.title": "Task Breakdown for Big Projects (Pro)",
"templates.presets.ebcbc2e9-8c03-46c7-b0bc-c9a805488ec1.description": "Break big projects into phases, milestones, and tasks.",

"templates.presets.f1bbcaba-b6db-458f-aaf5-2d6cec1db996.title": "Habit Starter Plan",
"templates.presets.f1bbcaba-b6db-458f-aaf5-2d6cec1db996.description": "Design a simple plan to start one new habit.",

"templates.presets.f1eb14c7-a13e-4acf-b39b-0c5d2ad1e57f.title": "Relationship Check-in Prompts (Pro)",
"templates.presets.f1eb14c7-a13e-4acf-b39b-0c5d2ad1e57f.description": "Prompts for a weekly check-in with a partner or friend.",

"templates.presets.f9fcfb6a-0282-408a-ab99-779bc58057ab.title": "Polish My Instructions",
"templates.presets.f9fcfb6a-0282-408a-ab99-779bc58057ab.description": "Rewrite instructions to be simpler and more actionable.",

"templates.presets.fc20be08-5fe5-4f87-99fc-0fee369d4106.title": "Next 3 Actions Generator",
"templates.presets.fc20be08-5fe5-4f87-99fc-0fee369d4106.description": "Find the very next 3 physical actions for a project.",

"templates.presets.fee66cc8-3c75-4905-834d-84e5ebdd8215.title": "Single-Task Deep Work Session",
"templates.presets.fee66cc8-3c75-4905-834d-84e5ebdd8215.description": "Prepare a focused deep work session with clear boundaries.",

"templates.presets.ffe9a15d-7a51-45a4-8527-09bcd5844b70.title": "Weekly Meal Plan",
"templates.presets.ffe9a15d-7a51-45a4-8527-09bcd5844b70.description": "Creates a simple weekly meal plan.",
},
  
  // -------------------------
  // GREEK 🇬🇷
  // -------------------------
  el: {
    // NAVIGATION
    "nav.dashboard": "Πίνακας ελέγχου",
    "nav.notes": "Σημειώσεις",
    "nav.tasks": "Εργασίες",
    "nav.planner": "Προγραμματιστής",
    "nav.templates": "Πρότυπα",
    "nav.dailySuccess": "Ημερήσια Επιτυχία",
    "nav.weeklyReports": "Εβδομαδιαίες Αναφορές",
    "nav.travel": "Σχεδιαστής Ταξιδιού",
    "nav.myTrips": "Τα Ταξίδια μου",
    "nav.feedback": "Ανατροφοδότηση",
    "nav.settings": "Ρυθμίσεις",
    "nav.changelog": "Τι νέο υπάρχει",
    "nav.admin": "Διαχείριση",

    // COMMON UI
    "common.translateWithAI": "Μετάφραση με AI",
    "common.close": "Κλείσιμο",
    "common.loading": "Φόρτωση…",
    "common.save": "Αποθήκευση",
    "common.cancel": "Ακύρωση",
    "common.edit": "Επεξεργασία",
    "common.delete": "Διαγραφή",
    "common.language": "Γλώσσα",
    "common.search": "Αναζήτηση",
    "common.confirm": "Επιβεβαίωση",
    "common.submit": "Υποβολή",

    // TRANSLATION MODAL
    "translate.title": "Μετάφραση με AI",
    "translate.subtitle":
      "Επιλέξτε γλώσσα και μεταφράστε κείμενο ή ολόκληρη τη σελίδα.",
    "translate.targetLanguage": "Γλώσσα στόχος",
    "translate.textToTranslate": "Κείμενο για μετάφραση",
    "translate.translateText": "Μετάφραση κειμένου",
    "translate.translatePage": "Μετάφραση σελίδας",
    "translate.autoTranslateSite": "Αυτόματη μετάφραση εφαρμογής",
    "translate.translating": "Μετάφραση…",
    "translate.workingOnPage": "Επεξεργασία σελίδας…",
    "translate.preparingPage": "Προετοιμασία σελίδας για μετάφραση…",
    "translate.noTextFound":
      "Δεν βρέθηκε κείμενο για μετάφραση σε αυτή τη σελίδα.",
    "translate.translationStatus": "Κατάσταση μετάφρασης",
  
  
   // lib/i18n.ts – inside MESSAGES.el

  // ...existing keys...

  // DASHBOARD
  "dashboard.checkingSession": "Έλεγχος της συνεδρίας σου...",
  "dashboard.title": "Πίνακας ελέγχου",
  "dashboard.notLoggedIn":
    "Δεν έχεις συνδεθεί. Συνδέσου ή δημιούργησε έναν δωρεάν λογαριασμό για να δεις το πλάνο και τη χρήση AI.",
  "dashboard.goToAuth": "Μετάβαση σε σύνδεση / εγγραφή",

  "dashboard.streakBannerMain": "Είσαι σε",
  "dashboard.streakBannerTail": "σειρά παραγωγικότητας.",

  "dashboard.subtitle":
    "Γρήγορη επισκόπηση του πλάνου σου, της χρήσης AI και της δραστηριότητάς σου.",

  "dashboard.planLabel": "Πλάνο",
  "dashboard.free": "ΔΩΡΕΑΝ",
  "dashboard.aiToday": "AI σήμερα",
  "dashboard.freePlanBlurb":
    "Το δωρεάν πλάνο περιλαμβάνει έως 20 κλήσεις AI την ημέρα, μοιρασμένες σε σημειώσεις, τον βοηθό, περιλήψεις και planner.",
  "dashboard.aiUsedUnlimitedNote":
    "χρήσεις (ουσιαστικά απεριόριστο για φυσιολογική χρήση)",

  "dashboard.loadingData": "Φόρτωση των δεδομένων σου...",

  "dashboard.account": "ΛΟΓΑΡΙΑΣΜΟΣ",
  "dashboard.thisIsAccount":
    "Αυτός είναι ο λογαριασμός με τον οποίο συνδέεσαι.",

  "dashboard.plan": "ΠΛΑΝΟ",
  "dashboard.proPlanDescription":
    "Απεριόριστη καθημερινή χρήση AI για φυσιολογική χρήση, συν πρόσβαση σε πιο ισχυρά εργαλεία οργάνωσης.",
  "dashboard.freePlanDescription":
    "Ιδανικό για δοκιμή της εφαρμογής και ελαφριά χρήση AI κάθε μέρα.",
  "dashboard.dailyLimit": "Ημερήσιο όριο AI",
  "dashboard.unlimitedDailyAI": "Απεριόριστο για φυσιολογική χρήση",
  "dashboard.callsPerDay": "κλήσεις/ημέρα",

  "dashboard.viewReports": "📅 Δες τα Weekly Reports →",
  "dashboard.unlockReports": "🔒 Ξεκλείδωσε Weekly Reports με Pro →",

  "dashboard.todayAIUsage": "ΣΗΜΕΡΙΝΗ ΧΡΗΣΗ AI",
  "dashboard.used": "χρήσεις",

  "dashboard.productivityScore": "Βαθμολογία παραγωγικότητας",
  "dashboard.loading": "Φόρτωση...",
  "dashboard.scoreToday": "Σήμερα",
  "dashboard.score7Avg": "Μέσος όρος 7 ημερών",
  "dashboard.scoreStreak": "Σειρά βαθμολογίας (≥60)",
  "dashboard.days": "ημέρα",
  "dashboard.updateScore": "Ενημέρωσε τη σημερινή βαθμολογία",

  "dashboard.proUsageNote":
    "Το Pro σου δίνει ουσιαστικά απεριόριστη καθημερινή χρήση AI για τα καθημερινά workflows σου.",
  "dashboard.remainingCalls":
    "Σου απομένουν {remaining} κλήσεις AI για σήμερα.",
  "dashboard.proSafetyLimit":
    "Έφτασες το σημερινό όριο ασφαλείας του Pro. Δοκίμασε ξανά αύριο.",
  "dashboard.freeLimitReached":
    "Έφτασες το σημερινό όριο στο δωρεάν πλάνο.",
  "dashboard.upgradeToPro": "Αναβάθμιση σε Pro",
  "dashboard.upgradeBenefitsShort":
    "για απεριόριστη καθημερινή χρήση AI (για φυσιολογική χρήση).",

  "dashboard.usageStreak": "Σειρά χρήσης",
  "dashboard.inARow": "συνεχόμενες",
  "dashboard.activeDaysLast30": "Ενεργές ημέρες (τελευταίες 30)",

  "dashboard.aiSummaryHeading": "ΠΕΡΙΛΗΨΗ AI (BETA)",
  "dashboard.aiSummaryInfo":
    "Άφησε το AI να σαρώσει τις πρόσφατες σημειώσεις και εργασίες σου και να σου δώσει μια σύντομη επισκόπηση με προτάσεις.",
  "dashboard.summaryGenerating": "Γίνεται δημιουργία...",
  "dashboard.summaryLimitButton": "Έφτασες το ημερήσιο όριο AI",
  "dashboard.summaryButton": "Δημιούργησε περίληψη",
  "dashboard.summaryUsesLimit":
    "Χρησιμοποιεί το καθημερινό σου όριο AI (μοιράζεται με σημειώσεις, βοηθό και planner).",
  "dashboard.summaryLimitReached":
    "Έφτασες το σημερινό όριο AI στο τρέχον πλάνο. Δοκίμασε ξανά αύριο ή αναβάθμισε σε Pro.",
  "dashboard.summaryServerInvalid":
    "Ο διακομιστής επέστρεψε μη έγκυρη απάντηση.",
  "dashboard.summaryPlanLimit":
    "Έφτασες το σημερινό όριο AI για το πλάνο σου.",
  "dashboard.summaryFailed":
    "Αποτυχία δημιουργίας περίληψης.",
  "dashboard.summaryNetworkError":
    "Σφάλμα δικτύου κατά τη δημιουργία της περίληψης.",

  "dashboard.aiWinsHeading": "AI WINS ΑΥΤΗΣ ΤΗΣ ΕΒΔΟΜΑΔΑΣ",
  "dashboard.aiWinsSubheading":
    "Μια γρήγορη ματιά στο πώς σε βοήθησε το AI τις τελευταίες 7 ημέρες.",
  "dashboard.avgProductivityScore": "Μέση βαθμολογία παραγωγικότητας",
  "dashboard.basedOnScores": "Βασισμένο στις καθημερινές βαθμολογίες σου",
  "dashboard.tasksCompleted": "Ολοκληρωμένα tasks",
  "dashboard.last7Days": "Τελευταίες 7 ημέρες",
  "dashboard.notesCreated": "Δημιουργημένες σημειώσεις",
  "dashboard.capturedIdeas": "Καταγεγραμμένες ιδέες & σκέψεις",
  "dashboard.aiCallsUsed": "Κλήσεις AI που χρησιμοποιήθηκαν",
  "dashboard.minsSaved": "λεπτά που εξοικονομήθηκαν",

  "dashboard.goalOfWeekHeading": "ΣΤΟΧΟΣ ΤΗΣ ΕΒΔΟΜΑΔΑΣ",
  "dashboard.goalOfWeekPitch":
    "Όρισε έναν ξεκάθαρο εβδομαδιαίο στόχο και άσε το AI να σε βοηθήσει να μείνεις σε τροχιά.",
  "dashboard.goalOfWeekProOnly":
    "Αυτό είναι χαρακτηριστικό Pro. Αναβάθμισε για AI-βασισμένους εβδομαδιαίους στόχους, παρακολούθηση προόδου στα εβδομαδιαία emails και απεριόριστη καθημερινή χρήση AI.",
  "dashboard.unlockWithPro": "🔒 Ξεκλείδωσε με Pro",

  "dashboard.goalInstructions":
    "Διάλεξε ένα ουσιαστικό αποτέλεσμα που θέλεις να πετύχεις αυτή την εβδομάδα. Κράτησέ το μικρό και ρεαλιστικό.",
  "dashboard.goalPlaceholder":
    "π.χ. Να ολοκληρώσω και να στείλω το προσχέδιο της πρότασης στον πελάτη.",
  "dashboard.savingGoal": "Γίνεται αποθήκευση...",
  "dashboard.saveGoal": "Αποθήκευση στόχου",
  "dashboard.saveGoalAI": "Αποθήκευση & βελτίωση με AI",
  "dashboard.goalMarkedDone": "✅ Έχει σημειωθεί ως ολοκληρωμένο",
  "dashboard.goalMarkAsDone": "Σημείωσε αυτόν τον στόχο ως ολοκληρωμένο",
  "dashboard.goalSingleFocus":
    "Αυτός είναι ο βασικός στόχος σου για αυτή την εβδομάδα.",

  "dashboard.recentNotesHeading": "ΠΡΟΣΦΑΤΕΣ ΣΗΜΕΙΩΣΕΙΣ",
  "dashboard.noNotes":
    "Δεν υπάρχουν ακόμη σημειώσεις. Δημιούργησε την πρώτη σου από τη σελίδα Σημειώσεις.",
  "dashboard.emptyNote": "(κενή σημείωση)",
  "dashboard.openNotesLink": "Άνοιγμα Σημειώσεων →",

  "dashboard.recentTasksHeading": "ΠΡΟΣΦΑΤΑ TASKS",
  "dashboard.noTasks":
    "Δεν υπάρχουν ακόμη tasks. Ξεκίνα προσθέτοντας μερικά που θέλεις να παρακολουθείς.",
  "dashboard.untitledTask": "(χωρίς τίτλο)",
  "dashboard.settingsExportLink": "Ρυθμίσεις / Εξαγωγή →",

  "dashboard.goToNotesButton": "Μετάβαση στις Σημειώσεις",
  "dashboard.goToTasksButton": "Μετάβαση στα Tasks",
  "dashboard.aiTemplatesButton": "🧠 AI Templates",
  "dashboard.dailyPlannerButton": "🗓 Daily Planner",
  "dashboard.weeklyReportsButton": "📅 Weekly Reports",

  "dashboard.proUnlockTitle": "Τι ξεκλειδώνεις με το Pro:",
  "dashboard.proUnlockHigherLimit": "Μεγαλύτερο ημερήσιο όριο AI",
  "dashboard.proUnlockWeeklyReport": "Εβδομαδιαίο email report με AI",
  "dashboard.proUnlockWeeklyGoal":
    "Εβδομαδιαίος στόχος με βελτίωση από AI",
  "dashboard.proUnlockTrips": "Αποθήκευση απεριόριστων ταξιδιών",
  "dashboard.proUnlockTemplates": "Premium templates",

  "dashboard.proPricingTitle":
    "Αναβάθμιση σε AI Productivity Hub PRO",
  "dashboard.proPricingSubtitle":
    "Για καθημερινούς χρήστες που θέλουν μεγαλύτερα όρια και εβδομαδιαίες πληροφορίες.",
  "dashboard.billingMonthly": "Μηνιαία",
  "dashboard.billingYearly": "Ετήσια — εξοικονομείς 25%",

  "dashboard.proFeatureUnlimitedAI":
    "Απεριόριστο AI (2000 κλήσεις/ημέρα)",
  "dashboard.proFeatureWeeklyReports":
    "Εβδομαδιαία email reports με AI",
  "dashboard.proFeatureWeeklyGoals":
    "Εβδομαδιαίοι στόχοι με AI",
  "dashboard.proFeatureTrips":
    "Αποθήκευση & επαναχρήση ταξιδιωτικών πλάνων",
  "dashboard.proFeatureTemplates": "Όλα τα premium templates",
  "dashboard.proFeaturePriorityAccess":
    "Προτεραιότητα σε νέες δυνατότητες",

  "dashboard.openingStripe": "Άνοιγμα Stripe…",
  "dashboard.goYearlyButton": "Ετήσιο πλάνο ({currency})",
  "dashboard.upgradeMonthlyButton": "Μηνιαίο πλάνο ({currency})",
  "dashboard.cancelAnytime":
    "Μπορείς να ακυρώσεις οποιαδήποτε στιγμή από το Stripe billing portal.",

  "dashboard.founderTitle": "🎉 Έκπτωση Early Supporter",
  "dashboard.founderSubtitle":
    "Επειδή είσαι νωρίς — κλείδωσε μια μόνιμη έκπτωση, για πάντα.",
  "dashboard.founderPerMonth": "μήνα",
  "dashboard.founderPriceNote":
    "Τιμή Founder — δεν αυξάνεται ποτέ",
  "dashboard.founderEverythingPro": "Όλα όσα έχει το Pro",
  "dashboard.founderLifetimePrice":
    "Κλειδωμένη τιμή εφ’ όρου ζωής",
  "dashboard.founderUnlimitedAI":
    "Απεριόριστο AI (2000/ημέρα)",
  "dashboard.founderWeeklyReportsGoals":
    "Weekly reports & στόχοι",
  "dashboard.founderPremiumTemplates": "Premium templates",
  "dashboard.founderPrioritySupport": "Υποστήριξη προτεραιότητας",
  "dashboard.getFounderButton":
    "Πάρε την Founder τιμή ({currency})",
  "dashboard.founderLimitedTime":
    "Περιορισμένος χρόνος. Η τιμή μένει δική σου για πάντα μόλις εγγραφείς.",

  "dashboard.feedbackHeading": "Στείλε γρήγορο feedback",
  "dashboard.feedbackSubheading": "Πες μου τι δουλεύει, τι σε μπερδεύει ή τι θα ήθελες να δεις στη συνέχεια.",

    // -------------------------
    // NOTES PAGE (EL)
    // -------------------------
    "notes.checkingSession": "Checking session…",
    "notes.title": "Σημειώσεις",
    "notes.loginRequired": "Πρέπει να συνδεθείς για να δεις τις σημειώσεις σου.",
    "notes.loginButton": "Σύνδεση / Εγγραφή",

    // Create note header
    "notes.create.heading": "Δημιούργησε μια νέα σημείωση",
    "notes.create.subheading":
      "Χρησιμοποίησε το AI για σύνοψη, bullets ή ξαναγράψιμο των σημειώσεών σου. Μπορείς επίσης να καταγράψεις ιδέες με τη φωνή σου.",
    "notes.create.logout": "Αποσύνδεση",

    // Form labels & placeholders
    "notes.form.titlePlaceholder": "Τίτλος σημείωσης",
    "notes.form.dateLabel": "Ημερομηνία σημείωσης:",
    "notes.form.categoryLabel": "Κατηγορία:",
    "notes.form.category.none": "Καμία",
    "notes.form.smartTitleLabel": "Έξυπνος τίτλος από το περιεχόμενο",
    "notes.form.contentPlaceholder": "Γράψε τη σημείωσή σου εδώ...",

    // Categories
    "notes.category.work": "Εργασία",
    "notes.category.personal": "Προσωπικά",
    "notes.category.ideas": "Ιδέες",
    "notes.category.meeting": "Σημειώσεις συναντήσεων",
    "notes.category.study": "Μελέτη",
    "notes.category.journal": "Ημερολόγιο",
    "notes.category.planning": "Προγραμματισμός",
    "notes.category.research": "Έρευνα",
    "notes.category.other": "Άλλο",

    // Plan / AI usage
    "notes.plan.label": "Πλάνο",
    "notes.plan.aiTodayLabel": "AI σήμερα",

    // Voice capture
    "notes.voice.modeLabel": "Λειτουργία φωνητικής καταγραφής:",
    "notes.voice.mode.review": "Πρώτα έλεγχος",
    "notes.voice.mode.autosave": "Αυτόματη αποθήκευση σημείωσης",
    "notes.voice.resetButton": "Επαναφορά φωνητικής σημείωσης",

    // Suggested tasks panel
    "notes.tasks.suggested.title": "Προτεινόμενες εργασίες",
    "notes.tasks.suggested.noneFound":
      "Δεν βρέθηκαν ξεκάθαρες εργασίες σε αυτή τη σημείωση.",
    "notes.tasks.suggested.createButton": "Δημιουργία εργασιών",
    "notes.tasks.suggested.creating": "Δημιουργία εργασιών…",

    // Messages for created tasks from voice / note
    "notes.tasks.voice.created":
      "Δημιουργήθηκαν εργασίες από τη σημείωση/φωνή σου.",
    "notes.tasks.note.created":
      "Δημιουργήθηκαν εργασίες από αυτή τη σημείωση.",

    // Errors
    "notes.errors.saveNoteMissing":
      "Πρόσθεσε έναν τίτλο ή κάποιο περιεχόμενο.",
    "notes.errors.notLoggedInForAI":
      "Πρέπει να συνδεθείς για να χρησιμοποιήσεις AI στις σημειώσεις.",
    "notes.errors.dailyLimitReached": "Έφτασες το ημερήσιο όριο AI.",
    "notes.errors.aiFailed": "Η κλήση στο AI απέτυχε.",
    "notes.errors.aiSaveFailed":
      "Αποτυχία αποθήκευσης του αποτελέσματος AI σε αυτή τη σημείωση.",
    "notes.errors.notLoggedInTasksFromNotes":
      "Πρέπει να συνδεθείς για να δημιουργήσεις εργασίες από σημειώσεις.",
    "notes.errors.generateTasksFromNoteFailed":
      "Αποτυχία δημιουργίας εργασιών από αυτή τη σημείωση. Δοκίμασε ξανά.",
    "notes.errors.generateTasksFromNoteUnexpected":
      "Απρόσμενο σφάλμα κατά τη δημιουργία εργασιών από αυτή τη σημείωση.",
    "notes.errors.createTasksFromVoiceFailed":
      "Αποτυχία δημιουργίας εργασιών από τη σημείωση/φωνή σου.",
    "notes.errors.createTasksUnexpected":
      "Απρόσμενο σφάλμα κατά τη δημιουργία εργασιών (δες την κονσόλα).",
    "notes.errors.noteEmptyForTasks":
      "Αυτή η σημείωση είναι άδεια, δεν υπάρχει κάτι να μετατραπεί σε εργασίες.",
    "notes.errors.saveTasksFromNoteFailed":
      "Αποτυχία αποθήκευσης των εργασιών που δημιουργήθηκαν από αυτή τη σημείωση.",
    "notes.errors.createTasksFromNoteUnexpected":
      "Απρόσμενο σφάλμα κατά τη δημιουργία εργασιών από αυτή τη σημείωση.",

    // Confirmations
    "notes.confirm.deleteNote": "Να διαγραφεί αυτή η σημείωση;",

    // Buttons (general)
    "notes.buttons.saveNote": "Αποθήκευση σημείωσης",
    "notes.buttons.saveNoteLoading": "Γίνεται αποθήκευση...",
    "notes.buttons.upgradeHint": "Φτάνεις συχνά το όριο του AI;",
    "notes.buttons.upgradeToPro": "Αναβάθμιση σε Pro",

    // Notes list / filters
    "notes.list.title": "Οι σημειώσεις σου",
    "notes.list.filter.allCategories": "Όλες οι κατηγορίες",
    "notes.list.filter.noCategory": "Χωρίς κατηγορία",
    "notes.list.refresh": "Ανανέωση",
    "notes.list.empty": "Δεν βρέθηκαν σημειώσεις.",
    "notes.list.untitled": "Χωρίς τίτλο",
    "notes.list.aiResultTitle": "Αποτέλεσμα AI:",
    "notes.list.goToTasks": "→ Μετάβαση στις Εργασίες",
    "notes.list.openDashboard": "Άνοιγμα Πίνακα Ελέγχου",

    // Buttons per note
    "notes.buttons.tasksFromNote": "⚡ Εργασίες από σημείωση",
    "notes.buttons.tasksFromNoteLoading": "Αναζήτηση εργασιών...",
    "notes.buttons.summarize": "✨ Σύνοψη",
    "notes.buttons.summarizeLoading": "Γίνεται σύνοψη...",
    "notes.buttons.bullets": "📋 Bullets",
    "notes.buttons.rewrite": "✍️ Ξαναγράψιμο",
    "notes.buttons.share": "Κοινοποίηση",
    "notes.buttons.shareCopied": "✅ Αντιγράφηκε",
    "notes.buttons.askAI": "🤖 Ρώτα το AI",
    "notes.buttons.tasksCreateFromNote": "🧩 Εργασίες",
    "notes.buttons.tasksCreateFromNoteLoading": "Δημιουργία εργασιών…",
    "notes.buttons.edit": "✏️ Επεξεργασία",
    "notes.buttons.delete": "🗑 Διαγραφή",
    "notes.buttons.deleteLoading": "Γίνεται διαγραφή...",
    "notes.buttons.editSave": "Αποθήκευση",
    "notes.buttons.editSaveLoading": "Γίνεται αποθήκευση...",
    "notes.buttons.editCancel": "Άκυρο",

    // Accordion aria-labels
    "notes.list.aria.expand": "Ανάπτυξη σημείωσης",
    "notes.list.aria.collapse": "Σύμπτυξη σημείωσης",

    // -------------------------
    // TASKS PAGE
    // -------------------------
    "tasks.checkingSession": "Έλεγχος συνεδρίας…",
    "tasks.title": "Εργασίες",
    "tasks.loginPrompt":
      "Συνδεθείτε ή δημιουργήστε έναν δωρεάν λογαριασμό για να παρακολουθείτε τις εργασίες σας.",
    "tasks.goToAuth": "Μετάβαση σε σύνδεση / εγγραφή",

    "tasks.loadError": "Αποτυχία φόρτωσης εργασιών.",
    "tasks.addError": "Αποτυχία προσθήκης εργασίας.",
    "tasks.updateError": "Δεν ήταν δυνατή η ενημέρωση της εργασίας.",
    "tasks.saveError": "Δεν ήταν δυνατή η αποθήκευση της εργασίας.",
    "tasks.deleteError": "Δεν ήταν δυνατή η διαγραφή της εργασίας.",

    "tasks.subtitle":
      "Καταγράψτε εργασίες, ολοκληρώστε τες και παρακολουθήστε την πρόοδό σας.",
    "tasks.addNewTask": "Προσθήκη νέας εργασίας",
    "tasks.aiTaskCreator": "🤖 Δημιουργός εργασιών με AI",

    "tasks.newTaskTitlePlaceholder": "Τίτλος εργασίας…",
    "tasks.newTaskDescriptionPlaceholder":
      "Προαιρετική περιγραφή ή σημειώσεις…",

    "tasks.dueDateLabel": "Ημερομηνία λήξης",
    "tasks.categoryLabel": "Κατηγορία",
    "tasks.category.none": "Καμία",
    "tasks.timeOptional": "Ώρα (προαιρετικό)",
    "tasks.timeFromPlaceholder": "Από",
    "tasks.timeToPlaceholder": "Έως",

    "tasks.newReminderLabel": "Ορισμός υπενθύμισης για αυτή την εργασία",
    "tasks.newReminderHint":
      "Χρησιμοποιεί τη ζώνη ώρας της συσκευής σας. Θα λάβετε email + push (αν είναι ενεργό) όταν έρθει η ώρα.",

    "tasks.addingTask": "Προσθήκη…",
    "tasks.addTaskButton": "Προσθήκη εργασίας",

    "tasks.viewLabel": "Προβολή:",
    "tasks.viewActive": "Ενεργές",
    "tasks.viewHistory": "Ιστορικό",
    "tasks.viewAll": "Όλες",

    "tasks.filterCategoryLabel": "Κατηγορία:",
    "tasks.filterCategoryAll": "Όλες",
    "tasks.filterCategoryNone": "Χωρίς κατηγορία",

    "tasks.selectedCountPrefix": "Επιλεγμένες:",
    "tasks.clearSelection": "Εκκαθάριση επιλογής",

    "tasks.shareLabel": "Κοινοποίηση:",
    "tasks.copyTodayTasks": "Αντιγραφή σημερινών εργασιών",
    "tasks.copySelectedTasks": "Αντιγραφή επιλεγμένων εργασιών",
    "tasks.shareHeaderToday": "Σημερινές εργασίες",
    "tasks.shareHeaderSelected": "Επιλεγμένες εργασίες",
    "tasks.noTasksTodayToShare":
      "Δεν υπάρχουν εργασίες για σήμερα προς κοινοποίηση.",
    "tasks.noSelectedTasksToShare":
      "Δεν έχουν επιλεγεί εργασίες για κοινοποίηση.",
    "tasks.copiedTodayTasks":
      "Οι σημερινές εργασίες αντιγράφηκαν στο πρόχειρο.",
    "tasks.copiedSelectedTasks":
      "Οι επιλεγμένες εργασίες αντιγράφηκαν στο πρόχειρο.",
    "tasks.copyFailed":
      "Αποτυχία αντιγραφής εργασιών στο πρόχειρο.",
    "tasks.clipboardUnavailable":
      "Το πρόχειρο δεν είναι διαθέσιμο. Αντιγράψτε χειροκίνητα.",

    "tasks.loadingTasks": "Φόρτωση εργασιών…",
    "tasks.noTasksYet": "Δεν υπάρχουν ακόμα εργασίες. Προσθέστε την πρώτη παραπάνω.",
    "tasks.noTasksInView":
      "Δεν υπάρχουν εργασίες σε αυτή την προβολή. Δοκιμάστε να αλλάξετε τα φίλτρα.",

    "tasks.collapseTaskDetails": "Σύμπτυξη λεπτομερειών εργασίας",
    "tasks.expandTaskDetails": "Ανάπτυξη λεπτομερειών εργασίας",

    "tasks.taskDone": "✅ Ολοκληρώθηκε",
    "tasks.markAsDone": "✔ Σήμανση ως ολοκληρωμένη",
    "tasks.selectLabel": "Επιλογή",
    "tasks.untitledTaskPlaceholder": "(χωρίς τίτλο)",

    "tasks.category.noCategory": "Χωρίς κατηγορία",

    "tasks.detailsLabel": "Λεπτομέρειες",
    "tasks.detailsPlaceholder": "Λεπτομέρειες ή σημειώσεις…",

    "tasks.dueLabel": "Λήξη:",
    "tasks.timeLabel": "Ώρα:",
    "tasks.reminderLabel": "Υπενθύμιση:",
    "tasks.reminderEnableShort": "Ενεργή",

    "tasks.reminderUpdateError":
      "Δεν ήταν δυνατή η ενημέρωση της υπενθύμισης.",

    "tasks.createdLabel": "Δημιουργήθηκε:",
    "tasks.completedLabel": "Ολοκληρώθηκε:",

    "tasks.copiedButton": "✅ Αντιγράφηκε",
    "tasks.shareButton": "Κοινοποίηση",
    "tasks.shareCopy": "📋 Αντιγραφή κειμένου",
    "tasks.shareWhatsApp": "💬 WhatsApp",
    "tasks.shareViber": "📲 Viber",
    "tasks.shareEmail": "✉️ Email",

    "tasks.deletingLabel": "Διαγραφή…",
    "tasks.deleteLabel": "Διαγραφή",

    "tasks.feedbackTitle": "Στείλτε σχόλια για τις Εργασίες",
    "tasks.feedbackSubtitle":
      "Είδατε κάποιο σφάλμα, λείπει κάτι ή κάτι είναι μπερδεμένο; Πείτε μου.",

    // -------------------------
    // WEEKLY REPORTS
    // -------------------------
    "weeklyReports.checkingSession": "Έλεγχος συνεδρίας...",
    "weeklyReports.title": "Εβδομαδιαίες Αναφορές",
    "weeklyReports.loginPrompt":
      "Συνδεθείτε ή δημιουργήστε έναν δωρεάν λογαριασμό για να δείτε τις εβδομαδιαίες αναφορές AI.",
    "weeklyReports.goToAuth": "Μετάβαση σε σύνδεση / εγγραφή",

    "weeklyReports.loadError":
      "Αποτυχία φόρτωσης εβδομαδιαίας αναφοράς.",
    "weeklyReports.notFoundError": "Η εβδομαδιαία αναφορά δεν βρέθηκε.",
    "weeklyReports.loadingReport": "Φόρτωση εβδομαδιαίας αναφοράς...",

    "weeklyReports.detailTitle": "Εβδομαδιαία Αναφορά",
    "weeklyReports.weekOfLabel": "Εβδομάδα από",
    "weeklyReports.planLabel": "Πλάνο:",
    "weeklyReports.summaryLabel": "ΕΒΔΟΜΑΔΙΑΙΑ ΠΕΡΙΛΗΨΗ",
    "weeklyReports.noSummary":
      "Αυτή η εβδομαδιαία αναφορά δεν έχει κείμενο περίληψης.",

    "weeklyReports.emailNote":
      "Οι εβδομαδιαίες αναφορές AI μέσω email είναι δυνατότητα Pro.",
    "weeklyReports.upgradeToPro": "Αναβάθμιση σε Pro",
    "weeklyReports.emailNoteTail":
      "για να λαμβάνετε μια περίληψη στο inbox σας κάθε εβδομάδα.",

    "weeklyReports.actionPlanTitle": "ΕΒΔΟΜΑΔΙΑΙΟ ΠΛΑΝΟ ΔΡΑΣΗΣ (AI)",
    "weeklyReports.planGenerateError":
      "Δεν ήταν δυνατή η δημιουργία εβδομαδιαίου πλάνου δράσης. Προσπαθήστε ξανά.",
    "weeklyReports.planNetworkError":
      "Σφάλμα δικτύου κατά τη δημιουργία εβδομαδιαίου πλάνου δράσης.",
    "weeklyReports.planGenerateSuccess":
      "Το εβδομαδιαίο πλάνο δράσης δημιουργήθηκε.",

    "weeklyReports.actionPlanProOnly":
      "Τα πλάνα δράσης με AI είναι δυνατότητα Pro.",
    "weeklyReports.actionPlanProDesc":
      "Αναβαθμίστε σε Pro για να λαμβάνετε στοχευμένο πλάνο δράσης κάθε εβδομάδα, βασισμένο στις αναφορές, τις εργασίες και τις σημειώσεις σας.",
    "weeklyReports.unlockWithPro": "🔒 Ξεκλείδωμα με Pro",

    "weeklyReports.savedPlanLabel":
      "Το αποθηκευμένο πλάνο δράσης για αυτή την εβδομάδα:",
    "weeklyReports.generatePlanHint":
      "Δημιουργήστε ένα στοχευμένο πλάνο δράσης για αυτή την εβδομάδα με βάση την αναφορά, τις εργασίες, τις σημειώσεις και τις βαθμολογίες παραγωγικότητας.",
    "weeklyReports.generatingPlan": "Δημιουργία πλάνου δράσης...",
    "weeklyReports.regeneratePlan": "Επαναδημιουργία πλάνου δράσης",
    "weeklyReports.generatePlan":
      "Δημιουργία εβδομαδιαίου πλάνου δράσης",
    "weeklyReports.planNote":
      "Χρησιμοποιεί 1 κλήση AI και αντικαθιστά το προηγούμενο πλάνο για αυτή την εβδομάδα (αν υπάρχει).",

    "weeklyReports.backToList": "← Επιστροφή στις εβδομαδιαίες αναφορές",

    "weeklyReports.listTitle": "Εβδομαδιαίες Αναφορές AI",
    "weeklyReports.subtitle":
      "Δείτε πώς η χρήση AI, οι εργασίες και οι σημειώσεις σας προστίθενται εβδομάδα με την εβδομάδα.",
    "weeklyReports.backToDashboard": "← Επιστροφή στον Πίνακα ελέγχου",

    "weeklyReports.lockedTitle":
      "Οι εβδομαδιαίες αναφορές AI είναι δυνατότητα Pro.",
    "weeklyReports.lockedDescription":
      "Αναβαθμίστε σε Pro για να ξεκλειδώσετε εβδομαδιαίες αναφορές, υψηλότερα όρια AI και προηγμένη παρακολούθηση στόχων.",
    "weeklyReports.lockedCta":
      "🔒 Ξεκλείδωμα Εβδομαδιαίων Αναφορών με Pro",

    "weeklyReports.loadingReports":
      "Φόρτωση των εβδομαδιαίων αναφορών σας...",
    "weeklyReports.noReportsYet":
      "Δεν υπάρχουν ακόμα εβδομαδιαίες αναφορές. Θα λάβετε την πρώτη την Κυριακή μετά την πρώτη πλήρη εβδομάδα παρακολούθησης.",
    "weeklyReports.viewFullReport": "Προβολή πλήρους αναφοράς →",
    "weeklyReports.noSummaryShort": "(δεν υπάρχει διαθέσιμη περίληψη)",

    // -------------------------
    // SETTINGS (namespace: useT("settings"))
    // -------------------------
    "settings.checkingSession": "Έλεγχος συνεδρίας...",
    "settings.title": "Ρυθμίσεις",
    "settings.loginPrompt":
      "Συνδεθείτε ή δημιουργήστε έναν δωρεάν λογαριασμό για να προσαρμόσετε την εμπειρία AI.",
    "settings.goToAuth": "Μετάβαση σε σύνδεση / εγγραφή",

    "settings.subtitle":
      "Προσαρμόστε πώς σας μιλάει το AI και σε τι να εστιάσει.",
    "settings.loadError": "Αποτυχία φόρτωσης ρυθμίσεων.",
    "settings.saveError": "Αποτυχία αποθήκευσης ρυθμίσεων.",
    "settings.saveErrorGeneric":
      "Κάτι πήγε στραβά κατά την αποθήκευση.",
    "settings.saveSuccess":
      "Οι ρυθμίσεις αποθηκεύτηκαν. Το AI θα χρησιμοποιεί πλέον αυτό το στυλ και αυτές τις προτιμήσεις.",
    "settings.loadingSettings": "Φόρτωση ρυθμίσεων...",

    // Onboarding block
    "settings.onboarding.title": "Έναρξη & εστίαση",
    "settings.onboarding.subtitle":
      "Βοηθήστε την εφαρμογή να προσαρμόσει προτροπές AI, υπενθυμίσεις και εβδομαδιαίες αναφορές.",
    "settings.onboarding.useCaseLabel":
      "Κύριος τρόπος που σκοπεύετε να χρησιμοποιείτε την εφαρμογή",
    "settings.onboarding.useCasePlaceholder":
      "Παράδειγμα: Είμαι solo founder και το χρησιμοποιώ για εβδομαδιαίο προγραμματισμό, καταγραφή προόδου και πρόχειρα emails.",
    "settings.onboarding.weeklyFocusLabel":
      "Ένα σημαντικό πράγμα στο οποίο θέλετε πρόοδο κάθε εβδομάδα",
    "settings.onboarding.weeklyFocusPlaceholder":
      "Παράδειγμα: Να παραδίδω μια μικρή βελτίωση στο προϊόν κάθε εβδομάδα.",
    "settings.onboarding.reminderLabel": "Ήπιος ρυθμός υπενθυμίσεων",
    "settings.onboarding.reminder.none": "Χωρίς υπενθυμίσεις",
    "settings.onboarding.reminder.daily": "Ημερήσιο email υπενθύμισης",
    "settings.onboarding.reminder.weekly": "Εβδομαδιαίο check-in",

    // Weekly report card
    "settings.weeklyReport.badge": "ΕΒΔΟΜΑΔΙΑΙΑ ΑΝΑΦΟΡΑ AI",
    "settings.weeklyReport.proDescription":
      "Λάβετε εβδομαδιαία αναφορά AI με βαθμολογία παραγωγικότητας, streak, ολοκληρωμένες εργασίες και προτάσεις εστίασης για την επόμενη εβδομάδα.",
    "settings.weeklyReport.proHint":
      "Αυτή είναι δυνατότητα Pro. Αναβαθμίστε για να ξεκλειδώσετε εβδομαδιαίες αναφορές email.",
    "settings.weeklyReport.unlockButton": "🔒 Ξεκλείδωμα με Pro",
    "settings.weeklyReport.learnMoreLink":
      "Δείτε πώς λειτουργούν οι εβδομαδιαίες αναφορές →",
    "settings.weeklyReport.description":
      "Λάβετε εβδομαδιαία περίληψη AI για την πρόοδό σας, τις επιτυχίες και τι να εστιάσετε την επόμενη εβδομάδα.",
    "settings.weeklyReport.checkboxLabel":
      "Αποστολή εβδομαδιαίων αναφορών παραγωγικότητας AI",
    "settings.weeklyReport.detail1":
      "Οι εβδομαδιαίες αναφορές χρησιμοποιούν τις βαθμολογίες, τις εργασίες, τις σημειώσεις και τους στόχους σας για να σας δώσουν ένα απλό «πώς τα πήγα;».",
    "settings.weeklyReport.detail2":
      "Τα emails στέλνονται μία φορά την εβδομάδα και περιλαμβάνουν το streak, τον μέσο όρο και προσαρμοσμένες προτάσεις.",
    "settings.weeklyReport.viewPastLink":
      "Προβολή προηγούμενων εβδομαδιαίων αναφορών →",

    // Daily digest
    "settings.digest.title": "Ημερήσια περίληψη AI μέσω email",
    "settings.digest.subtitle":
      "Μία φορά την ημέρα, το AI θα σας στέλνει μια σύντομη περίληψη πρόσφατων σημειώσεων και εργασιών, μαζί με προτεινόμενα επόμενα βήματα.",

    // Push notifications
    "settings.push.notSupported":
      "Οι ειδοποιήσεις push δεν υποστηρίζονται σε αυτόν τον browser.",
    "settings.push.enabled":
      "✅ Οι ειδοποιήσεις push είναι ενεργές για αυτή τη συσκευή.",
    "settings.push.statusCheckError":
      "Δεν ήταν δυνατός ο έλεγχος της κατάστασης push ειδοποιήσεων.",
    "settings.push.needsLogin":
      "Πρέπει να είστε συνδεδεμένοι.",
    "settings.push.blocked":
      "❌ Οι ειδοποιήσεις είναι μπλοκαρισμένες στον browser. Επιτρέψτε τις ειδοποιήσεις από τις ρυθμίσεις του browser.",
    "settings.push.enableError":
      "❌ Σφάλμα κατά την ενεργοποίηση push ειδοποιήσεων.",
    "settings.push.serviceWorkerUnsupported":
      "Οι service workers δεν υποστηρίζονται σε αυτόν τον browser.",
    "settings.push.disabled":
      "Οι ειδοποιήσεις push απενεργοποιήθηκαν για αυτή τη συσκευή.",
    "settings.push.disableError":
      "❌ Σφάλμα κατά την απενεργοποίηση push ειδοποιήσεων.",
    "settings.push.title":
      "Υπενθυμίσεις εργασιών (push ειδοποιήσεις)",
    "settings.push.description":
      "Ενεργοποιήστε ειδοποιήσεις browser για υπενθυμίσεις εργασιών. Θα βλέπετε ειδοποίηση όταν έρθει η ώρα μιας εργασίας με υπενθύμιση.",
    "settings.push.disabling": "Απενεργοποίηση…",
    "settings.push.disableButton":
      "Απενεργοποίηση υπενθυμίσεων εργασιών (push)",
    "settings.push.enabling": "Ενεργοποίηση…",
    "settings.push.enableButton":
      "Ενεργοποίηση υπενθυμίσεων εργασιών (push)",

    // Theme & appearance
    "settings.theme.title": "Θέμα & εμφάνιση",
    "settings.theme.subtitle":
      "Επιλέξτε θέμα εφαρμογής. Τα εποχιακά θέματα προσθέτουν έξτρα χρώμα.",
    "settings.theme.helpText":
      "Η επιλογή σας αποθηκεύεται σε αυτή τη συσκευή. Το προεπιλεγμένο θέμα είναι dark· το Light είναι πιο ευχάριστο σε φωτεινό περιβάλλον. Τα εποχιακά θέματα (Halloween, Christmas, Easter) προσθέτουν λίγη πλάκα.",

    // Language dropdown
    "settings.language.label": "Γλώσσα",
    "settings.language.description":
      "Αυτό αλλάζει τη γλώσσα του περιβάλλοντος και χρησιμοποιείται ως προεπιλεγμένος στόχος για το κουμπί «Μετάφραση με AI».",

    // Focus area
    "settings.focusArea.label": "Κύριος τομέας εστίασης (προαιρετικό)",
    "settings.focusArea.help":
      'Παράδειγμα: "Εργασιακά projects", "Πανεπιστήμιο", "Προσωπική ανάπτυξη" ή αφήστε κενό.',
    "settings.focusArea.placeholder":
      "π.χ. Εργασιακά projects, πανεπιστήμιο, προσωπική ζωή...",

    // Save button
    "settings.savingButton": "Αποθήκευση...",
    "settings.saveButton": "Αποθήκευση ρυθμίσεων",

    // Billing / Stripe
    "settings.billing.description":
      "Διαχειριστείτε τη συνδρομή, τα στοιχεία χρέωσης και τα τιμολόγιά σας από το ασφαλές portal της Stripe.",
    "settings.billing.portalError":
      "Δεν ήταν δυνατό το άνοιγμα του billing portal.",
    "settings.billing.manageButton":
      "Διαχείριση συνδρομής (Stripe)",

    // Export
    "settings.export.description":
      "Μπορείτε να κατεβάσετε αντίγραφο των σημειώσεων και εργασιών σας ως αρχείο Markdown.",
    "settings.export.error":
      "Η εξαγωγή απέτυχε. Προσπαθήστε ξανά.",
    "settings.export.button": "Λήψη δεδομένων μου (.md)",

   // -------------------------
   // DAILY SUCCESS PAGE (EL)
"dailySuccess.loadingSystem": "Φορτώνεται το ημερήσιο σύστημά σου…",

"dailySuccess.header.title": "AI Daily Success System",
"dailySuccess.header.subtitle":
  "Ξεκίνα τη μέρα σου με ένα ξεκάθαρο πλάνο, κλείσε τη με μια σύντομη ανασκόπηση και παρακολούθησε την πρόοδό σου με ένα απλό σκορ.",
"dailySuccess.header.backToDashboard": "← Πίσω στο dashboard",

"dailySuccess.freeBanner.title": "Χρησιμοποιείς το Free πλάνο.",
"dailySuccess.freeBanner.body":
  "Το Daily Success System δουλεύει μια χαρά στο Free, αλλά με το Pro έχεις μεγαλύτερη χρήση AI και αυτόματες λειτουργίες (αυτόματα πλάνα, εβδομαδιαίες αναφορές κ.λπ.).",
"dailySuccess.freeBanner.button": "Δες τις επιλογές Pro",

"dailySuccess.status.sentToAssistant":
  "Στάλθηκε στον AI assistant. Άνοιξε το panel του assistant για να δεις το αποτέλεσμα.",

"dailySuccess.morning.errorEmpty":
  "Γράψε τουλάχιστον μια λεπτομέρεια για τη μέρα σου ή μια προτεραιότητα.",
"dailySuccess.evening.errorEmpty":
  "Γράψε μια σύντομη ανασκόπηση για το πώς πήγε η μέρα σου.",

"dailySuccess.score.loginToSave":
  "Συνδέσου για να αποθηκεύσεις το ημερήσιο σκορ.",
"dailySuccess.score.saveError":
  "Αποτυχία αποθήκευσης του ημερήσιου σκορ.",
"dailySuccess.score.savedMessage":
  "Αποθηκεύτηκε! Το streak και οι μέσοι όροι ενημερώθηκαν.",

"dailySuccess.score.todayLabel": "Σημερινό σκορ",
"dailySuccess.score.todayHelp":
  "0 = χάλια μέρα, 100 = τέλεια μέρα. Να είσαι ειλικρινής, όχι σκληρός.",

"dailySuccess.score.avg7Label": "Μέσος όρος τελευταίων 7 ημερών",
"dailySuccess.score.avg7Help":
  "Στόχος είναι η συνέπεια, όχι η τελειότητα.",

"dailySuccess.score.streakLabel": "Success streak (σκορ ≥ 60)",
"dailySuccess.score.streakDay": "ημέρα",
"dailySuccess.score.streakDays": "ημέρες",
"dailySuccess.score.streakHelp":
  "Συνεχόμενες ημέρες που έβαλες στον εαυτό σου 60+.",

"dailySuccess.score.loadingRecent":
  "Φορτώνονται τα πρόσφατα σκορ σου…",
"dailySuccess.score.sliderLabel":
  "Πώς θα βαθμολογούσες συνολικά τη σημερινή μέρα;",
"dailySuccess.score.sliderHelp":
  "Σκέψου προσπάθεια + συγκέντρωση, όχι μόνο αποτέλεσμα. Μια μέρα 60–80 είναι συχνά επιτυχία.",
"dailySuccess.score.savingButton": "Αποθήκευση...",
"dailySuccess.score.saveButton": "Αποθήκευση σημερινού σκορ",

"dailySuccess.suggest.loginRequired":
  "Συνδέσου για να σου προτείνει σκορ το AI.",
"dailySuccess.suggest.errorGeneric":
  "Δεν ήταν δυνατή η λήψη πρότασης από το AI.",
"dailySuccess.suggest.networkError":
  "Σφάλμα δικτύου κατά την αίτηση πρότασης σκορ από το AI.",
"dailySuccess.suggest.asking": "Ρωτάω το AI…",
"dailySuccess.suggest.button":
  "Άφησε το AI να προτείνει το σημερινό σκορ",
"dailySuccess.suggest.helperText":
  "Το AI κοιτάει εργασίες και σημειώσεις για να προτείνει ρεαλιστικό σκορ. Μπορείς πάντα να το αλλάξεις.",
"dailySuccess.suggest.reasonPrefix": "Προτάθηκε επειδή:",

"dailySuccess.morning.title": "🌅 Πρωί: Σχεδίασε τη μέρα σου",
"dailySuccess.morning.subtitle":
  "Πες στο AI τι έχεις σήμερα και θα σου χτίσει ένα ρεαλιστικό πρόγραμμα με προτεραιότητες.",
"dailySuccess.morning.labelWhatsHappening": "Τι συμβαίνει σήμερα;",
"dailySuccess.morning.placeholderWhatsHappening":
  "Meetings, deadlines, προσωπικές υποχρεώσεις, ενέργεια κ.λπ.",
"dailySuccess.morning.labelTopPriorities": "Top 3 προτεραιότητες",
"dailySuccess.morning.priorityPlaceholder": "Προτεραιότητα",
"dailySuccess.morning.prioritiesHint":
  "Δεν χρειάζεται να συμπληρώσεις και τις 3, αλλά τουλάχιστον 1 βοηθάει πολύ.",
"dailySuccess.morning.buttonGeneratePlan":
  "✨ Δημιούργησε το σημερινό AI πλάνο",

"dailySuccess.evening.title": "🌙 Βράδυ: Ανασκόπηση & σκορ",
"dailySuccess.evening.subtitle":
  "Κατέγραψε πώς πήγε η μέρα σου. Το AI θα τη μετατρέψει σε κέρδη, μαθήματα και επόμενα βήματα.",
"dailySuccess.evening.labelReflection":
  "Πώς πήγε πραγματικά η σημερινή μέρα;",
"dailySuccess.evening.placeholderReflection":
  "Τι έκανες, τι σε διέκοψε, ενέργεια, περισπασμοί κ.λπ.",
"dailySuccess.evening.buttonReflect":
  "💭 Ανασκόπηση με AI",

"dailySuccess.helper.hintTitle": "Hint για καλύτερα αποτελέσματα:",
"dailySuccess.helper.item1":
  "Γράψε 2–3 πράγματα για τα οποία είσαι περήφανος.",
"dailySuccess.helper.item2":
  "Να είσαι ειλικρινής για περισπασμούς και αναβλητικότητα.",
"dailySuccess.helper.item3":
  "Πρόσθεσε πώς θα ήθελες να νιώθεις αύριο.",

"dailySuccess.footer.note":
  "Οι απαντήσεις και τα σκορ σου επεξεργάζονται από τον AI assistant. Μπορείς πάντα να προσαρμόσεις το αποτέλεσμα μέσα από το panel του assistant.",

    // -------------------------
    // PLANNER (useT("planner"))
    // -------------------------
    "planner.checkingSession": "Έλεγχος συνεδρίας...",
    "planner.title": "Ημερήσιος Προγραμματισμός",
    "planner.subtitle":
      "Άφησε το AI να μετατρέψει τις εργασίες σου σε ένα στοχευμένο πλάνο για σήμερα.",
    "planner.loginPrompt":
      "Συνδεθείτε ή δημιουργήστε έναν δωρεάν λογαριασμό για να δημιουργήσετε ένα ημερήσιο πλάνο με AI.",
    "planner.goToAuth": "Μετάβαση σε σύνδεση / εγγραφή",
    "planner.loggedInAs": "Συνδεδεμένος ως",
    "planner.youFallback": "εσύ",
    "planner.instructions":
      "Αυτός ο προγραμματισμός κοιτάζει τις ανοιχτές εργασίες σας στην εφαρμογή και προτείνει σε τι να εστιάσετε σήμερα. Μπορείτε να τον ανανεώσετε μέσα στη μέρα αν αλλάξουν οι προτεραιότητές σας.",
    "planner.generateButton": "Δημιουργία σημερινού πλάνου",
    "planner.generatingButton": "Δημιουργία πλάνου...",
    "planner.aiLimitNote":
      "Χρησιμοποιεί το ημερήσιο όριο AI (κοινό με σημειώσεις, assistant και σύνοψη πίνακα ελέγχου).",
    "planner.aiUsageTodayPrefix": "Χρήση AI σήμερα:",
    "planner.error.invalidResponse":
      "Ο διακομιστής επέστρεψε μη έγκυρη απάντηση.",
    "planner.error.rateLimit":
      "Έχετε φτάσει το σημερινό όριο χρήσης AI για το πλάνο σας. Δοκιμάστε ξανά αύριο ή αναβαθμίστε σε Pro.",
    "planner.error.generic":
      "Δεν ήταν δυνατή η δημιουργία ημερήσιου πλάνου.",
    "planner.error.network":
      "Σφάλμα δικτύου κατά τη δημιουργία του πλάνου σας.",
    "planner.link.viewTasks": "→ Προβολή & επεξεργασία εργασιών",
    "planner.link.openDashboard": "Άνοιγμα Πίνακα ελέγχου",
    "planner.todaysPlanHeading": "ΣΗΜΕΡΙΝΟ ΠΛΑΝΟ",
    "planner.noPlanYet":
      "Δεν έχει δημιουργηθεί ακόμα πλάνο. Πατήστε το κουμπί παραπάνω για να δημιουργήσετε ένα πλάνο με βάση τις τρέχουσες εργασίες σας.",
    "planner.feedbackTitle":
      "Στείλτε σχόλια για τον Ημερήσιο Προγραμματισμό",
    "planner.feedbackSubtitle":
      "Σας βοήθησε το πλάνο; Λείπει κάτι; Μοιραστείτε τις σκέψεις σας για να το βελτιώσω.",
    // -------------------------
    // TRAVEL (useT("travel"))
    // -------------------------
    "travel.title": "Σχεδιαστής Ταξιδιού (beta)",
    "travel.subtitle":
      "Άφησε το AI να σε βοηθήσει να σχεδιάσεις το ταξίδι σου – και μετά κλείσε τη διαμονή σου μέσω Booking.com. Ανοιχτό σε όλους, χωρίς σύνδεση. Συνδέσου αν θέλεις να αποθηκεύεις ταξίδια.",
    "travel.checkingAccount": "Έλεγχος λογαριασμού…",
    "travel.loggedInAs": "Συνδεδεμένος ως",
    "travel.guestBrowsing": "Περιηγείσαι ως επισκέπτης.",
    "travel.createAccountLink": "Δημιούργησε δωρεάν λογαριασμό",
    "travel.saveTripsHint": "για να αποθηκεύεις ταξίδια.",

    "travel.tripDetails.heading": "Λεπτομέρειες ταξιδιού",
    "travel.tripDetails.destinationLabel": "Προορισμός",
    "travel.tripDetails.destinationPlaceholder":
      "π.χ. Αθήνα, Βαρκελώνη, Λονδίνο",
    "travel.tripDetails.checkinLabel": "Άφιξη",
    "travel.tripDetails.checkoutLabel": "Αναχώρηση",
    "travel.tripDetails.adultsLabel": "Ενήλικες",
    "travel.tripDetails.childrenLabel": "Παιδιά",
    "travel.tripDetails.minBudgetLabel": "Ελάχιστο budget (προαιρετικό)",
    "travel.tripDetails.maxBudgetLabel": "Μέγιστο budget (προαιρετικό)",

    "travel.presets.weekend": "Σαββατοκύριακο (2 νύχτες)",
    "travel.presets.week": "1 εβδομάδα (6 νύχτες)",
    "travel.presets.cityBreak": "3–4 μέρες city break",

    "travel.error.missingFields":
      "Συμπλήρωσε πρώτα προορισμό και ημερομηνίες.",
    "travel.error.invalidResponse":
      "Ο διακομιστής επέστρεψε μη έγκυρη απάντηση.",
    "travel.error.generateFailed":
      "Δεν ήταν δυνατή η δημιουργία ταξιδιωτικού πλάνου.",
    "travel.error.network":
      "Σφάλμα δικτύου κατά τη δημιουργία του ταξιδιωτικού πλάνου.",

    "travel.buttons.generating": "Γίνεται δημιουργία...",
    "travel.buttons.generateTripPlan": "Δημιουργία ταξιδιωτικού πλάνου με AI",
    "travel.buttons.searchStays": "Αναζήτηση διαμονών στο Booking.com →",

    "travel.affiliateNote":
      "Οι σύνδεσμοι Booking μπορεί να είναι affiliate. Βοηθούν να στηριχθεί η εφαρμογή χωρίς επιπλέον κόστος για εσάς.",

    "travel.flights.heading": "Πτήσεις",
    "travel.flights.departureLabel": "Πόλη αναχώρησης",
    "travel.flights.departurePlaceholder": "π.χ. Αθήνα, Λονδίνο",
    "travel.flights.departureHint":
      "Αν μείνει κενό, θα χρησιμοποιήσουμε τον προορισμό ως εναλλακτική.",
    "travel.flights.searchButton": "Αναζήτηση πτήσεων →",
    "travel.flights.note":
      "Σε στέλνουμε σε σελίδα αναζήτησης πτήσεων (προς το παρόν Google Flights). Μπορείς αργότερα να βάλεις κανονικό affiliate link.",

    "travel.cars.heading": "Ενοικίαση αυτοκινήτου",
    "travel.cars.pickupLabel": "Σημείο παραλαβής",
    "travel.cars.pickupPlaceholder": "π.χ. Αεροδρόμιο, όνομα πόλης",
    "travel.cars.pickupHint":
      "Αν μείνει κενό, θα χρησιμοποιήσουμε τον προορισμό ως σημείο παραλαβής.",
    "travel.cars.searchButton": "Αναζήτηση ενοικίασης αυτοκινήτου →",
    "travel.cars.note":
      "Η αναζήτηση αυτοκινήτου ανοίγει στο Booking.com. Αν έχεις affiliate ID, θα παρακολουθείται μέσω του aid.",

    "travel.images.heading": "Προεπισκόπηση προορισμού",
    "travel.images.note":
      "Οι φωτογραφίες είναι ενδεικτικές και μπορεί να μην ταιριάζουν ακριβώς με τη διαμονή ή τη θέα σου.",

    "travel.itinerary.heading": "Πλάνο ταξιδιού με AI",
    "travel.itinerary.empty":
      "Συμπλήρωσε τις λεπτομέρειες του ταξιδιού σου και πάτησε «Δημιουργία ταξιδιωτικού πλάνου με AI» για να πάρεις δομημένο πλάνο και προτάσεις.",
    "travel.itinerary.guestSavePrompt":
      "Θέλεις να αποθηκεύσεις αυτό το ταξίδι και να το δεις αργότερα;",
    "travel.itinerary.guestSaveButton":
      "Δημιούργησε δωρεάν λογαριασμό / Συνδέσου",

    "travel.save.missingFields":
      "Συμπλήρωσε προορισμό, ημερομηνίες και δημιούργησε πρώτα ένα πλάνο.",
    "travel.save.error":
      "Δεν ήταν δυνατή η αποθήκευση του ταξιδιού. Προσπάθησε ξανά.",
    "travel.save.networkError":
      "Σφάλμα δικτύου κατά την αποθήκευση του ταξιδιού.",
    "travel.save.success": "Το ταξίδι αποθηκεύτηκε στον λογαριασμό σου ✅",
    "travel.save.buttonSaving": "Αποθήκευση ταξιδιού...",
    "travel.save.button": "Αποθήκευση ταξιδιού στον λογαριασμό μου",

    "travel.assistant.heading": "Βοηθός σχεδιασμού",
    "travel.assistant.step1Title":
      "1/3 – Πού θέλεις να πας;",
    "travel.assistant.destinationPlaceholder":
      "π.χ. Ρώμη, Παρίσι, Πράγα",
    "travel.assistant.step1Next": "Επόμενο: Πόσες μέρες;",
    "travel.assistant.step2Title":
      "2/3 – Πόσες μέρες θέλεις να μείνεις;",
    "travel.assistant.preset3days": "3 μέρες",
    "travel.assistant.preset5days": "5 μέρες",
    "travel.assistant.preset7days": "7 μέρες",
    "travel.assistant.step2Next": "Επόμενο: Ποιοι έρχονται;",
    "travel.assistant.step3Title":
      "3/3 – Ποιοι έρχονται;",
    "travel.assistant.adultsLabel": "Ενήλικες",
    "travel.assistant.childrenLabel": "Παιδιά",
    "travel.assistant.apply": "Εφαρμογή στη φόρμα & χρήση AI",
    "travel.assistant.back": "← Πίσω",
    "travel.assistant.finalHint":
      "Αφού εφαρμοστούν, πάτησε «Δημιουργία ταξιδιωτικού πλάνου με AI» για να πάρεις το πλάνο σου.",

    "travel.guestCta.title":
      "Θέλεις να αποθηκεύεις τα ταξίδια σου και να τα βρίσκεις εύκολα μετά;",
    "travel.guestCta.body":
      "Δημιούργησε δωρεάν λογαριασμό για να αποθηκεύεις τα πλάνα ταξιδιού με AI, να τα συνδέεις με τον πίνακα παραγωγικότητας και να λαμβάνεις εβδομαδιαίες περιλήψεις.",
    "travel.guestCta.button":
      "Δημιούργησε δωρεάν λογαριασμό / Συνδέσου",

    "travel.calendar.selectDate": "Επιλογή ημερομηνίας",
    "travel.calendar.weekday.su": "Κυ",
    "travel.calendar.weekday.mo": "Δε",
    "travel.calendar.weekday.tu": "Τρ",
    "travel.calendar.weekday.we": "Τε",
    "travel.calendar.weekday.th": "Πε",
    "travel.calendar.weekday.fr": "Πα",
    "travel.calendar.weekday.sa": "Σα",
    // ---------------
    // HOME (useT("home"))
    // ---------------
    "home.hero.badgeLabel": "Νέο",
    "home.hero.badgeText":
      "Εβδομαδιαία AI reports, travel planner & daily success score",
    "home.hero.titlePrefix": "Ο χώρος εργασίας σου με AI για",
    "home.hero.titleHighlight":
      "focus, planning & μικρές νίκες.",
    "home.hero.subtitle":
      "Κατέγραψε σημειώσεις, οργάνωσε τη μέρα σου, παρακολούθησε ό,τι μετράει και άσε το AI να συνοψίζει την πρόοδό σου.",
    "home.hero.primaryCtaLoggedIn": "Άνοιξε το dashboard σου",
    "home.hero.primaryCtaLoggedOut": "Ξεκίνα δωρεάν",
    "home.hero.secondaryCtaLoggedIn": "Πήγαινε στις Σημειώσεις",
    "home.hero.secondaryCtaLoggedOut": "Σύνδεση",
    "home.hero.viewAllTools": "Δες όλα τα εργαλεία",
    "home.hero.bottomLine":
      "Δεν απαιτείται κάρτα • Περιλαμβάνεται δωρεάν πλάνο • Φτιαγμένο για solo makers, φοιτητές και πολυάσχολους ανθρώπους ✨",
    "home.hero.shareTitle":
      "Δες αυτό το AI Productivity Hub",

    "home.preview.heading": "Σύνοψη της ημέρας",
    "home.preview.scoreLabel": "Δείκτης παραγωγικότητας",
    "home.preview.deltaText": "+12 σε σχέση με χθες",
    "home.preview.focusLabel": "Σημερινό focus",
    "home.preview.focusText":
      "Landing page, απαντήσεις σε πελάτες, 30’ μάθηση.",
    "home.preview.aiWinsLabel": "Νίκες με AI",
    "home.preview.aiWins1": "Περίληψη από 4 χαοτικές σημειώσεις",
    "home.preview.aiWins2": "Προσχέδιο 2 emails",
    "home.preview.aiWins3": "Πλάνο για αύριο σε 2 λεπτά",
    "home.preview.note":
      "Αυτό είναι απλώς προεπισκόπηση. Το dashboard σου ενημερώνεται καθώς προσθέτεις περιεχόμενο.",

    "home.tools.sectionLabel": "ΤΙ ΠΑΙΡΝΕΙΣ",
    "home.tools.heading":
      "Μικρό toolkit για planning, focus και συνέπεια.",
    "home.tools.subheading":
      "Κάθε σελίδα στο AI Productivity Hub είναι ένα στοχευμένο εργαλείο. Όχι άπειρα widgets — μόνο τα βασικά για μέρες, εβδομάδες και μακροπρόθεσμους στόχους.",
    "home.tools.viewAll": "Δες όλα τα εργαλεία",
    "home.tools.opensLabel": "Ανοίγει",

    "home.tools.dashboard.label": "Dashboard overview",
    "home.tools.dashboard.tagline":
      "Δες τη μέρα σου, το σκορ και το focus σε ένα σημείο.",
    "home.tools.dashboard.description":
      "Η βάση σου: daily success score, focus για σήμερα, γρήγορα links σε tasks, σημειώσεις και εβδομαδιαία πρόοδο.",
    "home.tools.dashboard.highlight1": "Σύνοψη ημέρας",
    "home.tools.dashboard.highlight2":
      "Daily Success score & trend",
    "home.tools.dashboard.highlight3":
      "Γρήγορη πρόσβαση σε όλα τα εργαλεία",
    "home.tools.dashboard.cta": "Άνοιξε το dashboard",

    "home.tools.notes.label": "Σημειώσεις & χώρος εργασίας AI",
    "home.tools.notes.tagline":
      "Κατέγραψε ιδέες, drafts και logs προόδου.",
    "home.tools.notes.description":
      "Κράτα τα πάντα σε ένα μέρος και άσε το AI να συνοψίζει, να καθαρίζει ή να βγάζει tasks από τις σημειώσεις σου.",
    "home.tools.notes.highlight1": "Γρήγορη καταγραφή σημειώσεων",
    "home.tools.notes.highlight2": "Περίληψη & clean-up με AI",
    "home.tools.notes.highlight3":
      "Ιδανικό για journaling & meeting notes",
    "home.tools.notes.cta": "Πήγαινε στις Σημειώσεις",

    "home.tools.tasks.label": "Tasks & υπενθυμίσεις",
    "home.tools.tasks.tagline":
      "Απλή λίστα εργασιών με πραγματικές υπενθυμίσεις.",
    "home.tools.tasks.description":
      "Πρόσθεσε tasks με due dates, time windows, κατηγορίες και υπενθυμίσεις ανά task που μπορούν να στέλνουν email + push.",
    "home.tools.tasks.highlight1":
      "Time-boxed tasks με κατηγορίες",
    "home.tools.tasks.highlight2":
      "Υπενθυμίσεις μέσω email & push",
    "home.tools.tasks.highlight3":
      "Μοιράσου tasks σε WhatsApp, Viber, email",
    "home.tools.tasks.cta": "Άνοιξε τα Tasks",

    "home.tools.aiTaskCreator.label": "AI Task Creator",
    "home.tools.aiTaskCreator.tagline":
      "Μετέτρεψε ασαφείς στόχους σε ξεκάθαρα βήματα.",
    "home.tools.aiTaskCreator.description":
      "Κάνε paste έναν χαοτικό στόχο και άσε το AI να τον σπάσει σε μικρά, προτεραιοποιημένα tasks που στέλνεις κατευθείαν στο board σου.",
    "home.tools.aiTaskCreator.highlight1":
      "Μετατρέπει στόχους σε checklists",
    "home.tools.aiTaskCreator.highlight2":
      "Έξυπνες προτεραιότητες & εκτιμήσεις χρόνου",
    "home.tools.aiTaskCreator.highlight3":
      "Δουλεύει τέλεια με τη σελίδα Tasks",
    "home.tools.aiTaskCreator.cta":
      "Χρησιμοποίησε το AI Task Creator",

    "home.tools.weeklyReports.label": "Εβδομαδιαία AI reports",
    "home.tools.weeklyReports.tagline":
      "Ένα ελαφρύ weekly review γραμμένο για σένα από το AI.",
    "home.tools.weeklyReports.description":
      "Δες πώς πήγε η εβδομάδα σου, τι λειτούργησε και πού να εστιάσεις μετά — με βάση τα scores, τα tasks και τις σημειώσεις σου.",
    "home.tools.weeklyReports.highlight1":
      "Προβολή weekly score & streak",
    "home.tools.weeklyReports.highlight2":
      "Αναδεικνύει νίκες & bottlenecks",
    "home.tools.weeklyReports.highlight3":
      "Προτάσεις focus για την επόμενη εβδομάδα",
    "home.tools.weeklyReports.cta":
      "Δες το weekly history",

    "home.tools.settings.label": "Notifications & themes",
    "home.tools.settings.tagline":
      "Κάνε την εφαρμογή να νιώθει δική σου.",
    "home.tools.settings.description":
      "Έλεγξε email digests, push reminders, timezone και themes — συμπεριλαμβανομένων seasonal looks όπως Halloween ή Χριστούγεννα.",
    "home.tools.settings.highlight1":
      "Ρυθμίσεις email & push reminders",
    "home.tools.settings.highlight2":
      "Timezone & συχνότητα υπενθυμίσεων",
    "home.tools.settings.highlight3":
      "Dark, light & seasonal themes",
    "home.tools.settings.cta": "Άνοιξε τα Settings",

    "home.pricing.sectionLabel": "ΤΙΜΟΛΟΓΗΣΗ",
    "home.pricing.heading":
      "Ξεκίνα δωρεάν. Αναβάθμισε όταν γίνει μέρος της ημέρας σου.",

    "home.pricing.free.label": "FREE",
    "home.pricing.free.price": "€0",
    "home.pricing.free.description":
      "Ιδανικό για ελαφριά χρήση, καθημερινό planning και βασική βοήθεια από AI.",
    "home.pricing.free.feature1": "✔ Σημειώσεις",
    "home.pricing.free.feature2": "✔ Tasks",
    "home.pricing.free.feature3": "✔ Daily Success Score",
    "home.pricing.free.feature4": "✔ Weekly Goals",
    "home.pricing.free.feature5": "✔ Travel Planner (basic)",
    "home.pricing.free.feature6": "✔ 20 μηνύματα AI/ημέρα",
    "home.pricing.free.feature7": "✔ Templates (basic)",
    "home.pricing.free.feature8": "✔ Sync σε όλες τις συσκευές",

    "home.pricing.pro.label": "PRO",
    "home.pricing.pro.priceMonthly": "€8.49 / μήνα",
    "home.pricing.pro.priceYearly":
      "€79 / χρόνο (έκπτωση 25%)",
    "home.pricing.pro.description":
      "Απεριόριστο AI, weekly reports, advanced planning tools, templates και άλλα.",
    "home.pricing.pro.feature1": "🔥 Ό,τι στο Free",
    "home.pricing.pro.feature2": "🔥 Απεριόριστα μηνύματα AI",
    "home.pricing.pro.feature3": "🔥 Weekly AI Email Report",
    "home.pricing.pro.feature4": "🔥 AI Task Planning",
    "home.pricing.pro.feature5": "🔥 Advanced Travel Planner",
    "home.pricing.pro.feature6": "🔥 Απεριόριστες Σημειώσεις & Templates",
    "home.pricing.pro.manageCta":
      "Διαχείριση πλάνου",
    "home.pricing.pro.upgradeCta":
      "Αναβάθμισε όταν είσαι έτοιμος",

    "home.faq.sectionLabel": "FAQ",
    "home.faq.q1":
      "Χρειάζεται να είμαι τεχνικός για να το χρησιμοποιήσω;",
    "home.faq.a1":
      "Όχι — είναι επίτηδες απλό και φιλικό για αρχάριους.",
    "home.faq.q2":
      "Ποια είναι η διαφορά μεταξύ Free και Pro;",
    "home.faq.a2":
      "Το Free καλύπτει τα βασικά. Το Pro ξεκλειδώνει απεριόριστο AI και πιο βαθιά εργαλεία planning.",
    "home.faq.q3": "Μπορώ να ακυρώσω όποτε θέλω;",
    "home.faq.a3":
      "Ναι! Τα δεδομένα σου παραμένουν ακόμα και μετά την ακύρωση.",

    "home.bottomCta.title": "Έτοιμος να το δοκιμάσεις;",
    "home.bottomCta.body":
      "Φτιάξε δωρεάν λογαριασμό σε λιγότερο από ένα λεπτό.",
    "home.bottomCta.primary": "Δημιούργησε δωρεάν λογαριασμό",
    "home.bottomCta.secondary": "Έχεις ήδη λογαριασμό;",

    "home.footer.ownerLine":
      "AI Productivity Hub — aiprod.app — Owner: AlphaSynth AI",
    "home.footer.changelogLink": "Τι νέο υπάρχει",
    "home.footer.privacyLink": "Privacy",
    "home.footer.termsLink": "Όροι",
    // -------------------------
    // el Tools
    // -------------------------
"tools.header.sectionLabel": "ΟΛΑ ΤΑ ΕΡΓΑΛΕΙΑ",
"tools.header.title":
  "Κάθε εργαλείο στο AI Productivity Hub, εξηγημένο.",
"tools.header.subtitle":
  "Σκέψου αυτή τη σελίδα σαν χάρτη. Κάθε ενότητα παρακάτω είναι μία σελίδα ή λειτουργία μέσα στην εφαρμογή — τι κάνει, πότε τη χρησιμοποιείς και πώς να βγάλεις τη μέγιστη αξία.",

"tools.tool.routeLabel": "Route:",
"tools.tool.bestForTitle": "Ιδανικό για",
"tools.tool.howToUseTitle": "Πώς να το χρησιμοποιήσεις",
"tools.tool.proTipLabel": "Pro tip:",

"tools.changelog.title": "Τι νέο υπάρχει & release notes",
"tools.changelog.description":
  "Θες να δεις νέα εργαλεία, βελτιώσεις και διορθώσεις; Η σελίδα Τι νέο υπάρχει (changelog) καταγράφει πώς εξελίσσεται η εφαρμογή με τον χρόνο.",
"tools.changelog.cta": "Δες τι νέο υπάρχει",

"tools.backToHome": "← Πίσω στην αρχική σελίδα",

"tools.dashboard.name": "Dashboard overview",
"tools.dashboard.shortTagline":
  "Μια ματιά στη σημερινή μέρα και το Daily Success score.",
    // -------------------------
    // MY TRIPS (useT("myTrips"))
    // -------------------------
    "myTrips.status.checkingSession": "Έλεγχος συνεδρίας...",
    "myTrips.errors.loadTrips": "Αποτυχία φόρτωσης των ταξιδιών σου.",

    "myTrips.unauth.message":
      "Συνδέσου ή δημιούργησε έναν δωρεάν λογαριασμό για να αποθηκεύεις και να βλέπεις τα ταξιδιωτικά πλάνα με AI.",
    "myTrips.unauth.cta": "Μετάβαση σε σύνδεση / εγγραφή",

    "myTrips.header.title": "Τα ταξίδια μου",
    "myTrips.header.subtitle":
      "Όλα τα ταξίδια που έχεις σχεδιάσει με το Travel Planner.",
    "myTrips.header.backToPlanner": "← Πίσω στο Travel Planner",

    "myTrips.status.loadingTrips": "Φόρτωση των ταξιδιών σου...",

    "myTrips.empty.title": "Δεν έχεις αποθηκευμένα ταξίδια ακόμα.",
    "myTrips.empty.description":
      "Χρησιμοποίησε το Travel Planner για να δημιουργήσεις ένα πλάνο με AI και μετά πάτησε «Αποθήκευση ταξιδιού στον λογαριασμό μου».",
    "myTrips.empty.cta": "Σχεδίασε ένα ταξίδι →",

    "myTrips.trip.unnamed": "Ταξίδι χωρίς όνομα",
    "myTrips.trip.nightsSingular": "νύχτα",
    "myTrips.trip.nightsPlural": "νύχτες",
    "myTrips.trip.adultSingular": "ενήλικας",
    "myTrips.trip.adultPlural": "ενήλικες",
    "myTrips.trip.childSingular": "παιδί",
    "myTrips.trip.childPlural": "παιδιά",

    "myTrips.trip.budgetLabel": "Budget",
    "myTrips.trip.budgetFrom": "από",
    "myTrips.trip.budgetSeparator": "–",
    "myTrips.trip.budgetTo": "έως",

    "myTrips.trip.viewDetails": "Προβολή λεπτομερειών",
    "myTrips.trip.hideDetails": "Απόκρυψη λεπτομερειών",
    "myTrips.trip.savedItineraryLabel": "Αποθηκευμένο πλάνο ταξιδιού με AI",
    "myTrips.trip.noPlanText": "(δεν έχει αποθηκευτεί κείμενο πλάνου)",
    // -------------------------
    // FEEDBACK PAGE (useT("feedback"))
    // -------------------------
    "feedback.status.checkingSession": "Έλεγχος συνεδρίας...",
    "feedback.status.loading": "Φόρτωση feedback...",
    "feedback.errors.loadFeedback": "Αποτυχία φόρτωσης feedback.",

    "feedback.header.title": "Feedback",
    "feedback.header.subtitle":
      "Εσωτερική σελίδα που δείχνει όλα τα μηνύματα feedback αποθηκευμένα στο Supabase.",

    "feedback.unauth.message":
      "Δεν είσαι συνδεδεμένος. Συνδέσου για να δεις τα μηνύματα feedback.",
    "feedback.unauth.cta": "Μετάβαση σε σύνδεση / εγγραφή",

    "feedback.notAdmin.message":
      "Αυτή η σελίδα είναι διαθέσιμη μόνο στον διαχειριστή.",
    "feedback.notAdmin.cta": "Επιστροφή στην αρχική σελίδα",

    "feedback.empty.message":
      "Δεν υπάρχει ακόμα feedback. Όταν οι χρήστες στείλουν μηνύματα από την εφαρμογή, θα εμφανιστούν εδώ.",

    "feedback.row.fromPrefix": "Από",
    "feedback.row.anonymous": "Ανώνυμο / χωρίς σύνδεση",
    // -------------------------
    // AI CHAT (useT("aiChat"))
    // -------------------------
    "aiChat.status.checkingSession": "Έλεγχος συνεδρίας…",

    "aiChat.login.title": "AI Hub Chat",
    "aiChat.login.body":
      "Συνδέσου ή δημιούργησε δωρεάν λογαριασμό για να μιλάς με τον AI coach σου και να κρατάς τις συνομιλίες σου αποθηκευμένες.",
    "aiChat.login.cta": "Μετάβαση σε σύνδεση / εγγραφή",

    "aiChat.header.title": "AI Hub Chat",
    "aiChat.header.subtitle":
      "Ένας γενικός AI coach για planning, ιδέες και ερωτήσεις.",

    "aiChat.sidebar.conversationsLabel": "Συζητήσεις",
    "aiChat.sidebar.newChatButton": "+ Νέα συζήτηση",
    "aiChat.sidebar.loading": "Φόρτωση συζητήσεων…",
    "aiChat.sidebar.empty":
      "Δεν υπάρχουν ακόμα συζητήσεις. Ξεκίνα μια νέα στα δεξιά.",
    "aiChat.sidebar.renameTooltip": "Μετονομασία συζήτησης",
    "aiChat.sidebar.deleteTooltip": "Διαγραφή συζήτησης",

    "aiChat.mobile.historyButton": "Ιστορικό",
    "aiChat.mobile.newChatButton": "+ Νέα συζήτηση",
    "aiChat.mobile.historyTitle": "Ιστορικό συζητήσεων",
    "aiChat.mobile.closeButton": "✕ Κλείσιμο",
    "aiChat.mobile.empty":
      "Δεν υπάρχουν ακόμα συζητήσεις. Ξεκίνα μια νέα.",

    "aiChat.usage.label": "Απαντήσεις AI σήμερα:",
    "aiChat.usage.unlimitedSuffix": "(απεριόριστες)",
    "aiChat.usage.freeSuffix": "(free πλάνο)",

    "aiChat.messages.loading": "Φόρτωση συζήτησης…",
    "aiChat.messages.emptyIntro":
      "Ξεκίνα ρωτώντας κάτι όπως:",
    "aiChat.messages.example1":
      "Βοήθησέ με να οργανώσω την εβδομάδα μου με βάση δουλειά και προσωπικούς στόχους.",
    "aiChat.messages.example2":
      "Μετέτρεψε τη λίστα με τα todo μου σε 3 ξεκάθαρες προτεραιότητες.",
    "aiChat.messages.example3":
      "Νιώθω ότι πνίγομαι — από πού να ξεκινήσω σήμερα;",

    "aiChat.input.categoryLabel": "Κατηγορία:",
    "aiChat.input.categoryHelper":
      "Βοηθά το AI να προσαρμόζει τον τόνο & τις προτάσεις.",
    "aiChat.input.placeholder":
      "Ρώτα οτιδήποτε — planning, focus, ιδέες, mindset…",
    "aiChat.input.sending": "Αποστολή…",
    "aiChat.input.limitReached": "Έφτασες το ημερήσιο όριο",
    "aiChat.input.send": "Αποστολή",

    "aiChat.errors.loadThreads":
      "Αποτυχία φόρτωσης συζητήσεων.",
    "aiChat.errors.loadMessages":
      "Αποτυχία φόρτωσης μηνυμάτων.",
    "aiChat.errors.notLoggedIn":
      "Πρέπει να είσαι συνδεδεμένος για να μιλήσεις με το AI.",
    "aiChat.errors.freeLimitReached":
      "Έφτασες το ημερήσιο όριο AI για το δωρεάν πλάνο (20 απαντήσεις).",
    "aiChat.errors.sendFailed":
      "Αποτυχία αποστολής μηνύματος.",
    "aiChat.errors.networkSend":
      "Σφάλμα δικτύου κατά την αποστολή του μηνύματος.",
    "aiChat.errors.saveThread":
      "Δεν ήταν δυνατή η αποθήκευση της συζήτησης, αλλά μπορείς να συνεχίσεις να μιλάς.",
    "aiChat.errors.deleteFailed":
      "Αποτυχία διαγραφής συζήτησης.",
    "aiChat.errors.deleteNetwork":
      "Αποτυχία διαγραφής συζήτησης λόγω σφάλματος δικτύου.",
    "aiChat.errors.renameFailed":
      "Αποτυχία μετονομασίας συζήτησης.",
    "aiChat.errors.renameNotFound":
      "Η συζήτηση δεν βρέθηκε ή δεν είναι προσβάσιμη.",
    "aiChat.errors.renameNetwork":
      "Αποτυχία μετονομασίας λόγω σφάλματος δικτύου.",

    "aiChat.confirm.deleteThread":
      "Να διαγραφεί αυτή η συζήτηση; Δεν μπορεί να αναιρεθεί.",
    "aiChat.prompt.renameTitle": "Νέος τίτλος για αυτή τη συζήτηση:",
    "aiChat.untitledChat": "Συζήτηση χωρίς τίτλο",
    "aiChat.newConversationFallback": "Νέα συζήτηση",
    // ai-task-creator (useT("aiTaskCreator"))
    "aiTaskCreator.checkingSession": "Έλεγχος συνεδρίας…",
    "aiTaskCreator.title": "AI Task Creator",
    "aiTaskCreator.loginPrompt":
      "Συνδέσου ή δημιούργησε έναν δωρεάν λογαριασμό για να αφήσεις το AI να σου φτιάξει μια προσωποποιημένη λίστα εργασιών για σήμερα.",
    "aiTaskCreator.loginCta": "Μετάβαση σε σύνδεση / εγγραφή",

    "aiTaskCreator.subtitle":
      "Απάντησε σε λίγες γρήγορες ερωτήσεις και άφησε το AI να χτίσει ένα ρεαλιστικό πλάνο εργασιών για σήμερα. Με ένα κλικ τις στέλνεις στη σελίδα Tasks.",
    "aiTaskCreator.backToTasks": "← Πίσω στα Tasks",

    "aiTaskCreator.freeBanner.title": "Δουλεύει τέλεια στο Free – λάμπει στο Pro.",
    "aiTaskCreator.freeBanner.body":
      "Η δημιουργία εργασιών με AI χρησιμοποιεί το ημερήσιο όριο AI. ",
    "aiTaskCreator.freeBanner.highlight":
      "Το Pro σου δίνει πολύ υψηλότερα όρια και περισσότερη αυτοματοποίηση",
    "aiTaskCreator.freeBanner.tail": "για planning και εβδομαδιαία reports.",
    "aiTaskCreator.freeBanner.cta": "Δες τις επιλογές Pro",

    "aiTaskCreator.errors.loginRequired": "Συνδέσου για να δημιουργήσεις εργασίες με AI.",
    "aiTaskCreator.errors.missingGoalOrPlan":
      "Πες στο AI τουλάχιστον το βασικό σου πλάνο ή στόχο για σήμερα.",
    "aiTaskCreator.errors.generateFailed":
      "Δεν ήταν δυνατή η δημιουργία εργασιών. Προσπάθησε ξανά.",
    "aiTaskCreator.errors.noTasksReturned":
      "Το AI δεν επέστρεψε εργασίες. Πρόσθεσε περισσότερες λεπτομέρειες.",
    "aiTaskCreator.errors.networkGenerate":
      "Σφάλμα δικτύου κατά τη δημιουργία εργασιών.",
    "aiTaskCreator.errors.loginToCreate":
      "Συνδέσου για να δημιουργήσεις εργασίες.",
    "aiTaskCreator.errors.noTasksYet":
      "Δημιούργησε πρώτα εργασίες ή πρόσθεσε τουλάχιστον μία.",
    "aiTaskCreator.errors.emptyAfterClean":
      "Η λίστα εργασιών είναι άδεια.",
    "aiTaskCreator.errors.insertFailed":
      "Δεν ήταν δυνατή η δημιουργία εργασιών στο λογαριασμό σου.",
    "aiTaskCreator.errors.networkCreate":
      "Σφάλμα δικτύου κατά τη δημιουργία εργασιών.",
    "aiTaskCreator.status.created":
      "Οι εργασίες δημιουργήθηκαν! Μετάβαση στα Tasks…",

    "aiTaskCreator.form.heading": "Πες στο AI πώς είναι η μέρα σου",
    "aiTaskCreator.form.subheading":
      "Όσο πιο ρεαλιστικές απαντήσεις, τόσο καλύτερες προτάσεις εργασιών.",

    "aiTaskCreator.form.gender.label": "Φύλο (προαιρετικό)",
    "aiTaskCreator.form.gender.skip": "Προτιμώ να μην απαντήσω",
    "aiTaskCreator.form.gender.male": "Άνδρας",
    "aiTaskCreator.form.gender.female": "Γυναίκα",
    "aiTaskCreator.form.gender.other": "Άλλο",

    "aiTaskCreator.form.age.label": "Ηλικιακή ομάδα",
    "aiTaskCreator.form.age.under18": "< 18",
    "aiTaskCreator.form.age.18_24": "18–24",
    "aiTaskCreator.form.age.25_34": "25–34",
    "aiTaskCreator.form.age.35_44": "35–44",
    "aiTaskCreator.form.age.45plus": "45+",

    "aiTaskCreator.form.job.label": "Τι κάνεις κυρίως στη ζωή σου;",
    "aiTaskCreator.form.job.placeholder":
      "π.χ. Software engineer, φοιτητής, designer, freelancer",

    "aiTaskCreator.form.workType.label": "Τι είδους μέρα είναι σήμερα;",
    "aiTaskCreator.form.workType.work": "Μέρα δουλειάς",
    "aiTaskCreator.form.workType.study": "Μέρα διαβάσματος",
    "aiTaskCreator.form.workType.mixed": "Μικτή",
    "aiTaskCreator.form.workType.dayOff": "Ρεπό / άδεια",

    "aiTaskCreator.form.hours.label": "Χρόνος που έχεις διαθέσιμος σήμερα",
    "aiTaskCreator.form.hours.lt1": "< 1 ώρα",
    "aiTaskCreator.form.hours.1_2": "1–2 ώρες",
    "aiTaskCreator.form.hours.2_4": "2–4 ώρες",
    "aiTaskCreator.form.hours.4plus": "4+ ώρες",

    "aiTaskCreator.form.energy.label": "Επίπεδο ενέργειας αυτή τη στιγμή",
    "aiTaskCreator.form.energy.help":
      "1 = εξαντλημένος, 10 = φουλ ενέργεια.",

    "aiTaskCreator.form.intensity.label": "Πόσο έντονη θέλεις να είναι η μέρα;",
    "aiTaskCreator.form.intensity.light": "Ήπια",
    "aiTaskCreator.form.intensity.balanced": "Ισορροπημένη",
    "aiTaskCreator.form.intensity.aggressive": "Δυνατό push",

    "aiTaskCreator.form.todayPlan.label":
      "Ποιο είναι το πλάνο ή το context της μέρας;",
    "aiTaskCreator.form.todayPlan.placeholder":
      "Συναντήσεις, deadlines, δουλειές, ραντεβού κ.λπ.",

    "aiTaskCreator.form.mainGoal.label": "Κύριος στόχος για σήμερα",
    "aiTaskCreator.form.mainGoal.placeholder":
      "π.χ. Να τελειώσω ένα draft, να καλύψω ύλη για εξετάσεις, να τακτοποιήσω το σπίτι",

    "aiTaskCreator.form.hobbies.label":
      "Χόμπι ή ενδιαφέροντα (προαιρετικό)",
    "aiTaskCreator.form.hobbies.placeholder":
      "π.χ. γυμναστήριο, διάβασμα, coding, gaming",
    "aiTaskCreator.form.hobbies.help":
      "Το AI μπορεί να προσθέσει 1–2 ευχάριστες ή αναζωογονητικές δραστηριότητες αν ταιριάζει.",

    "aiTaskCreator.buttons.thinking": "Σκέφτεται…",
    "aiTaskCreator.buttons.generate":
      "✨ AI: Πρότεινέ μου εργασίες για σήμερα",

    "aiTaskCreator.tasksSection.heading": "Εργασίες που πρότεινε το AI",
    "aiTaskCreator.tasksSection.subheading":
      "Διάβασε, επεξεργάσου ή σβήσε ό,τι δεν σου ταιριάζει. Μετά με ένα κλικ τις δημιουργείς στο λογαριασμό σου.",
    "aiTaskCreator.tasksSection.generating":
      "Δημιουργία προτάσεων με βάση τις απαντήσεις σου…",
    "aiTaskCreator.tasksSection.empty":
      "Δεν υπάρχουν ακόμα εργασίες. Συμπλήρωσε τη φόρμα αριστερά και πάτα «AI: Πρότεινέ μου εργασίες».",
    "aiTaskCreator.tasksSection.sizeSuffix": "εργασία",
    "aiTaskCreator.tasksSection.delete": "✕",
    "aiTaskCreator.tasksSection.creating": "Δημιουργία εργασιών…",
    "aiTaskCreator.tasksSection.createButton":
      "✅ Δημιούργησε αυτές τις εργασίες και άνοιξε τα Tasks",
    "aiTaskCreator.tasksSection.footerNote":
      "Οι εργασίες θα προστεθούν στη συνηθισμένη λίστα Tasks. Μπορείς να τις επεξεργαστείς μετά όπως κάθε άλλη εργασία.",
    // TERMS (useT("terms"))
    "terms.title": "Όροι Χρήσης",
    "terms.lastUpdatedLabel": "Τελευταία ενημέρωση",

    "terms.intro":
      "Χρησιμοποιώντας το AI Productivity Hub, αποδέχεσαι αυτούς τους όρους. Αν δεν συμφωνείς, παρακαλούμε μην χρησιμοποιείς την υπηρεσία.",

    "terms.section1.title": "1. Περιγραφή υπηρεσίας",
    "terms.section1.body":
      "Το AI Productivity Hub είναι ένα εργαλείο προσωπικής παραγωγικότητας που σε βοηθά να διαχειρίζεσαι σημειώσεις, εργασίες, ημερήσιες βαθμολογίες, εβδομαδιαίους στόχους και προαιρετικά ταξιδιωτικά πλάνα, με βοήθεια από AI.",

    "terms.section2.title": "2. Χωρίς εγγυήσεις",
    "terms.section2.body":
      "Η εφαρμογή παρέχεται «ως έχει» και «όπως είναι διαθέσιμη». Δεν εγγυόμαστε ότι η υπηρεσία θα είναι πάντα διαθέσιμη, χωρίς σφάλματα ή ότι τα αποτελέσματα του AI θα είναι απολύτως ακριβή, πλήρη ή κατάλληλα για οποιονδήποτε συγκεκριμένο σκοπό.",

    "terms.section3.title": "3. Ο λογαριασμός σου",
    "terms.section3.body":
      "Είσαι υπεύθυνος για την ασφάλεια των στοιχείων σύνδεσής σου και για κάθε δραστηριότητα που γίνεται μέσω του λογαριασμού σου. Χρησιμοποίησε ισχυρό κωδικό πρόσβασης και μην τον μοιράζεσαι με άλλους.",

    "terms.section4.title": "4. Αποδεκτή χρήση",
    "terms.section4.body":
      "Συμφωνείς να μην χρησιμοποιείς την εφαρμογή για αποθήκευση ή δημιουργία παράνομου, προσβλητικού ή επιβλαβούς περιεχομένου. Μπορούμε να αναστείλουμε ή να διακόψουμε την πρόσβαση αν εντοπίσουμε κακή χρήση, κατάχρηση ή απόπειρες επίθεσης στην υπηρεσία.",

    "terms.section5.title": "5. Περιεχόμενο που δημιουργείται από AI",
    "terms.section5.body":
      "Οι προτάσεις και το περιεχόμενο που δημιουργείται από το AI προορίζονται μόνο για ενημερωτικούς και παραγωγικούς σκοπούς. Δεν πρέπει να αντιμετωπίζονται ως επαγγελματικές συμβουλές (π.χ. ιατρικές, νομικές ή οικονομικές). Είσαι υπεύθυνος για το πώς θα χρησιμοποιήσεις αυτές τις πληροφορίες.",

    "terms.section6.title": "6. Πληρωμένα πλάνα & χρέωση",
    "terms.section6.body":
      "Αν αναβαθμίσεις σε πληρωμένο πλάνο, η χρέωση γίνεται με ασφάλεια από τον πάροχο πληρωμών (π.χ. Stripe). Οι λεπτομέρειες πλάνων, οι τιμές και τα όρια μπορεί να αλλάξουν με τον χρόνο· τυχόν αλλαγές θα φαίνονται συνήθως στην ενότητα τιμών της ιστοσελίδας.",

    "terms.section7.title": "7. Αλλαγές στην υπηρεσία",
    "terms.section7.body":
      "Μπορούμε να ενημερώνουμε ή να αλλάζουμε λειτουργίες, όρια ή τον σχεδιασμό της εφαρμογής. Μπορούμε επίσης να ενημερώνουμε αυτούς τους Όρους ανά διαστήματα. Αν οι αλλαγές είναι σημαντικές, θα προσπαθήσουμε να τις επισημάνουμε μέσα στην εφαρμογή ή στο changelog.",

    "terms.section8.title": "8. Περιορισμός ευθύνης",
    "terms.section8.body":
      "Στο μέγιστο βαθμό που επιτρέπεται από τον νόμο, δεν φέρουμε ευθύνη για έμμεσες, παρεπόμενες ή επακόλουθες ζημιές που προκύπτουν από τη χρήση της υπηρεσίας, συμπεριλαμβανομένων αποφάσεων που λαμβάνονται βάσει προτάσεων του AI.",

    "terms.section9.title": "9. Επικοινωνία",
    "terms.section9.body":
      "Αν έχεις ερωτήσεις σχετικά με αυτούς τους όρους, μπορείς να επικοινωνήσεις μαζί μας μέσω της σελίδας Feedback μέσα στην εφαρμογή ή στο email υποστήριξης που αναφέρεται εκεί.",

    "terms.disclaimer":
      "Αυτοί οι όροι είναι γραμμένοι σε απλή, κατανοητή γλώσσα και δεν αντικαθιστούν νομικό έλεγχο. Για εμπορική χρήση, σκέψου να ζητήσεις από δικηγόρο να τους ελέγξει και να τους προσαρμόσει στη δική σου περίπτωση.",
    // PRIVACY (useT("privacy"))
    "privacy.title": "Πολιτική Απορρήτου",
    "privacy.lastUpdatedLabel": "Τελευταία ενημέρωση",

    "privacy.intro":
      "Αυτή η Πολιτική Απορρήτου εξηγεί πώς το AI Productivity Hub (ιδιοκτησία του Anargyros Sgouros) («εμείς», «μας» ή «η εφαρμογή») συλλέγει, χρησιμοποιεί και προστατεύει τα δεδομένα σου όταν χρησιμοποιείς τον ιστότοπο και τις υπηρεσίες μας στο aiprod.app και την Android εφαρμογή μας.",

    "privacy.section1.title": "1. Πληροφορίες που συλλέγουμε",
    "privacy.section1.1.title": "1.1 Πληροφορίες λογαριασμού",
    "privacy.section1.1.body":
      "Όταν δημιουργείς λογαριασμό, συλλέγουμε τη διεύθυνση email σου και αποθηκεύουμε με ασφάλεια τα στοιχεία αυθεντικοποίησης μέσω Supabase Authentication.",

    "privacy.section1.2.title": "1.2 Περιεχόμενο που δημιουργείς",
    "privacy.section1.2.body":
      "Αποθηκεύουμε το περιεχόμενο που δημιουργείς στην εφαρμογή, όπως σημειώσεις, εργασίες, καταχωρήσεις ημερήσιου πλάνου, ταξίδια, ημερήσιες βαθμολογίες, εβδομαδιαίους στόχους και εβδομαδιαίες αναφορές. Αυτά τα δεδομένα συνδέονται με τον λογαριασμό σου και είναι ιδιωτικά για εσένα.",

    "privacy.section1.3.title": "1.3 Δεδομένα χρήσης & τεχνικά δεδομένα",
    "privacy.section1.3.body":
      "Συλλέγουμε περιορισμένες τεχνικές πληροφορίες και δεδομένα χρήσης, όπως μετρήσεις χρήσης λειτουργιών (για όρια AI και στατιστικά παραγωγικότητας) και ανωνυμοποιημένα analytics μέσω Plausible Analytics. Δεν χρησιμοποιούμε επεμβατική παρακολούθηση ή cookies τρίτων για διαφημίσεις.",

    "privacy.section2.title": "2. Πώς χρησιμοποιούμε τις πληροφορίες σου",
    "privacy.section2.intro": "Χρησιμοποιούμε τα δεδομένα σου για να:",
    "privacy.section2.item1":
      "Παρέχουμε τις βασικές λειτουργίες της εφαρμογής (σημειώσεις, εργασίες, planner, εργαλεία AI)",
    "privacy.section2.item2":
      "Παρακολουθούμε τη ημερήσια βαθμολογία σου και δημιουργούμε εβδομαδιαίες αναφορές",
    "privacy.section2.item3":
      "Εφαρμόζουμε όρια χρήσης AI ανάλογα με το πλάνο σου (Free / Pro)",
    "privacy.section2.item4":
      "Επεξεργαζόμαστε πληρωμές και συνδρομές μέσω Stripe",
    "privacy.section2.item5":
      "Βελτιώνουμε τη σταθερότητα, την απόδοση και την εμπειρία χρήσης",

    "privacy.section3.title": "3. Κοινοποίηση δεδομένων",
    "privacy.section3.body":
      "Δεν πουλάμε ούτε ανταλλάσσουμε τα προσωπικά σου δεδομένα. Μοιραζόμαστε δεδομένα μόνο με τους παρακάτω παρόχους υπηρεσιών, όπου είναι απαραίτητο:",
    "privacy.section3.item1.suffix":
      "– αυθεντικοποίηση, βάση δεδομένων και ασφαλής αποθήκευση δεδομένων",
    "privacy.section3.item2.suffix":
      "– επεξεργασία πληρωμών και χρέωση συνδρομών",
    "privacy.section3.item3.suffix":
      "– analytics με έμφαση στο απόρρητο και ανωνυμοποίηση",
    "privacy.section3.item4.label": "Πάροχος AI",
    "privacy.section3.item4.suffix":
      "– επεξεργασία κειμένου που στέλνεις για λειτουργίες AI (δεν χρησιμοποιούμε τα αποτελέσματα του AI για διαφημίσεις ή προφίλ χρηστών)",

    "privacy.section4.title": "4. Διατήρηση δεδομένων",
    "privacy.section4.body":
      "Διατηρούμε τα δεδομένα σου όσο ο λογαριασμός σου είναι ενεργός. Όταν ζητήσεις διαγραφή λογαριασμού, διαγράφουμε τα προσωπικά σου δεδομένα και το σχετικό περιεχόμενο από τα συστήματά μας μέσα σε εύλογο χρονικό διάστημα, εκτός από περιπτώσεις όπου πρέπει να κρατήσουμε περιορισμένες πληροφορίες για νομικούς, λογιστικούς ή λόγους ασφάλειας.",

    "privacy.section5.title": "5. Ασφάλεια",
    "privacy.section5.body":
      "Όλες οι συνδέσεις στην εφαρμογή χρησιμοποιούν κρυπτογράφηση HTTPS. Τα δεδομένα αποθηκεύονται στο Supabase με row-level security ώστε κάθε χρήστης να έχει πρόσβαση μόνο στα δικά του αρχεία. Κανένα σύστημα δεν είναι απολύτως ασφαλές, αλλά λαμβάνουμε εύλογα μέτρα για να προστατεύουμε τις πληροφορίες σου.",

    "privacy.section6.title": "6. Τα δικαιώματά σου",
    "privacy.section6.body":
      "Ανάλογα με τη χώρα σου, μπορεί να έχεις δικαιώματα πρόσβασης, ενημέρωσης ή διαγραφής των δεδομένων σου. Μπορείς να διαγράψεις τον λογαριασμό σου ανά πάσα στιγμή μέσα από την εφαρμογή ή επικοινωνώντας μαζί μας. Για λεπτομέρειες, δες:",

    "privacy.section7.title": "7. Επικοινωνία",
    "privacy.section7.body":
      "Αν έχεις ερωτήσεις σχετικά με αυτή την Πολιτική Απορρήτου ή για το πώς διαχειριζόμαστε τα δεδομένα σου, επικοινώνησε μαζί μας στο:",
    // COOKIES (useT("cookies"))
    "cookies.title": "Cookies & παρακολούθηση",
    "cookies.lastUpdatedLabel": "Τελευταία ενημέρωση",
    "cookies.appName":
      "AI Productivity Hub (ιδιοκτησία του Anargyros Sgouros)",
    "cookies.intro":
      "χρησιμοποιεί ελάχιστα cookies και local storage ώστε η εφαρμογή να λειτουργεί σωστά και για να καταλαβαίνουμε πώς χρησιμοποιείται.",

    "cookies.section1.title": "1. Τι χρησιμοποιούμε",
    "cookies.section1.item1.label": "Cookies / tokens αυθεντικοποίησης",
    "cookies.section1.item1.body":
      "για να παραμένεις συνδεδεμένος με ασφάλεια.",
    "cookies.section1.item2.label": "Preferences / local storage",
    "cookies.section1.item2.body":
      "για να θυμόμαστε τη γλώσσα, τις ρυθμίσεις εμφάνισης και την κατάσταση εγκατάστασης PWA.",
    "cookies.section1.item3.label": "Plausible Analytics",
    "cookies.section1.item3.body":
      "privacy-friendly, χωρίς cookies, που συλλέγει μόνο συγκεντρωτικά δεδομένα χρήσης (χωρίς ατομική παρακολούθηση).",

    "cookies.section2.title": "2. Χωρίς διαφημιστικά cookies",
    "cookies.section2.body":
      "Δεν χρησιμοποιούμε cookies ή trackers τρίτων για στοχευμένες διαφημίσεις. Τα analytics χρησιμοποιούνται μόνο για να βελτιώνουμε την εμπειρία της εφαρμογής.",

    "cookies.section3.title": "3. Διαχείριση cookies",
    "cookies.section3.body":
      "Μπορείς να καθαρίσεις cookies και local storage από τις ρυθμίσεις του browser ή της συσκευής σου οποιαδήποτε στιγμή. Αν μπλοκάρεις όλα τα cookies, ορισμένες λειτουργίες — όπως η παραμονή σε σύνδεση — μπορεί να μη λειτουργούν σωστά.",

    "cookies.section4.title": "4. Επικοινωνία",
    "cookies.section4.body":
      "Αν έχεις ερωτήσεις σχετικά με το πώς χρησιμοποιούμε cookies ή μηχανισμούς παρακολούθησης, επικοινώνησε μαζί μας στο:",
    // -------------------------
    // TEMPLATES (useT("templates"))
    // -------------------------
    "templates.checkingSession": "Έλεγχος συνεδρίας...",
    "templates.title": "AI Templates",
    "templates.subtitle":
      "Επαναχρησιμοποιήσιμα prompts για planning, focus, διάβασμα και γράψιμο. Χρησιμοποίησέ τα με τον assistant με ένα κλικ.",
    "templates.backToDashboard": "← Πίσω στο Dashboard",

    "templates.howToUse.title": "Πώς να χρησιμοποιήσεις αυτά τα templates",
    "templates.howToUse.item1":
      "Περιηγήσου ή κάνε αναζήτηση για template ανά κατηγορία (Planning, Study, Writing, Work, Personal).",
    "templates.howToUse.item2":
      "Πάτησε «🤖 Use with Assistant» για να στείλεις το template στο AI Hub Chat. Μπορείς να αλλάξεις το κείμενο ή να προσθέσεις λεπτομέρειες πριν πατήσεις send.",
    "templates.howToUse.item3":
      "Πάτησε «View / edit» για να ανοίξεις ολόκληρο το template, να δεις το prompt και να το προσαρμόσεις στη ροή σου.",
    "templates.howToUse.item4":
      "Templates με σήμανση «Pro» είναι διαθέσιμα για Pro / Founder χρήστες (ή αν είναι template που δημιούργησες εσύ).",
    "templates.howToUse.item5":
      "Όσο περισσότερο χρησιμοποιείς ένα template, τόσο πιο ψηλά εμφανίζεται στη λίστα «Trending public templates» δεξιά.",

    "templates.filters.searchPlaceholder": "Αναζήτηση templates...",
    "templates.filters.category.all": "Όλες οι κατηγορίες",
    "templates.filters.category.planning": "Planning",
    "templates.filters.category.study": "Study",
    "templates.filters.category.writing": "Writing",
    "templates.filters.category.work": "Work",
    "templates.filters.category.personal": "Personal",

    "templates.error.loadFailed": "Αποτυχία φόρτωσης templates.",
    "templates.loading": "Φόρτωση templates…",
    "templates.emptyFiltered":
      "Κανένα template δεν ταιριάζει με αυτά τα φίλτρα.",

    "templates.card.untitled": "Template χωρίς τίτλο",
    "templates.card.uncategorized": "Χωρίς κατηγορία",
    "templates.card.noDescription":
      "Δεν υπάρχει ακόμα περιγραφή. Επεξεργάσου το template για να προσθέσεις context.",
    "templates.card.public": "Public",
    "templates.card.private": "Private",
    "templates.card.yours": "Δικό σου",
    "templates.card.proTemplate": "Pro template",
    "templates.card.usedPrefix": "Χρησιμοποιήθηκε",
    "templates.card.usedSuffix": "φορές",
    "templates.card.lockedMessage":
      "Αυτό είναι Pro template. Αναβάθμισε για να το χρησιμοποιήσεις με τον AI assistant και να ξεκλειδώσεις πλήρη πρόσβαση.",

    "templates.buttons.useWithAssistant": "Use with Assistant",
    "templates.buttons.viewEdit": "View / edit",
    "templates.buttons.copyLink": "Copy link",

    "templates.trending.title": "🔥 Trending public templates",
    "templates.trending.empty":
      "Μόλις αρχίσουν να χρησιμοποιούνται templates με τον assistant, θα εμφανιστούν εδώ.",
    "templates.trending.proBadge": "Pro",
    "templates.trending.useButton": "Use",
    "templates.trending.viewButton": "View",
    "templates.trending.footerHint":
      "Κάνε ένα template public και χρησιμοποίησέ το συχνά για να εμφανιστεί στη λίστα trending.",

    "templates.assistant.hintPrefix": "Χρησιμοποίησε αυτό το template",
    "templates.assistant.hintSuffix":
      "Μπορεί να προσθέσω επιπλέον λεπτομέρειες πριν το στείλω.",
    // -------------------------
    // TEMPLATE DETAIL (useT("templates"))
    // -------------------------
    "templates.detail.loadingTemplate": "Φόρτωση template…",
    "templates.detail.backToTemplates": "← Πίσω στα templates",
    "templates.detail.createdPrefix": "Δημιουργήθηκε",

    "templates.detail.lockedBanner":
      "Αυτό είναι Pro template. Μπορείς να το δεις, αλλά μόνο Pro / Founder χρήστες (ή ο ιδιοκτήτης) μπορούν να το χρησιμοποιήσουν με τον AI assistant.",
    "templates.detail.upgradeToPro": "Αναβάθμιση σε Pro",

    "templates.detail.form.titleLabel": "Τίτλος",
    "templates.detail.form.descriptionLabel": "Σύντομη περιγραφή",
    "templates.detail.form.promptLabel": "Υποκείμενο AI prompt",
    "templates.detail.form.promptHint":
      "Αυτό είναι το κείμενο που στέλνεται στο AI όταν χρησιμοποιείς αυτό το template.",
    "templates.detail.form.categoryLabel": "Κατηγορία",
    "templates.detail.form.publicLabel": "Public template",
    "templates.detail.form.proOnlyLabel": "Pro only",

    "templates.detail.buttons.saving": "Αποθήκευση...",
    "templates.detail.buttons.saveChanges": "Αποθήκευση αλλαγών",
    "templates.detail.buttons.deleting": "Διαγραφή...",
    "templates.detail.buttons.delete": "Διαγραφή template",

    "templates.detail.viewOnlyHint":
      "Μπορείς να δεις αυτό το template, αλλά μόνο ο ιδιοκτήτης μπορεί να το επεξεργαστεί ή να το διαγράψει.",

    "templates.detail.error.notFound": "Το template δεν βρέθηκε.",
    "templates.detail.error.loadFailed": "Αποτυχία φόρτωσης template.",
    "templates.detail.error.saveFailed": "Αποτυχία αποθήκευσης template.",
    "templates.detail.error.deleteFailed": "Αποτυχία διαγραφής template.",
    "templates.detail.delete.confirm":
      "Να διαγραφεί οριστικά αυτό το template;",
    "templates.detail.success.updated": "Το template ενημερώθηκε.",
// --- Templates (Greek) ---

"templates.presets.07cf6d2b-95a8-408c-9793-3b9d7b711215.title": "Δημιουργός καρτών επανάληψης (Pro)",
"templates.presets.07cf6d2b-95a8-408c-9793-3b9d7b711215.description": "Μετατρέπει περιεχόμενο σε κάρτες ερωτήσεων–απαντήσεων για επανάληψη (spaced repetition).",

"templates.presets.080f34f4-337d-4da9-8cfc-e46db32c5b37.title": "Έλεγχος σχέσης",
"templates.presets.080f34f4-337d-4da9-8cfc-e46db32c5b37.description": "Βοηθά να σκεφτείς τις σκέψεις και τις πράξεις σου μέσα στη σχέση.",

"templates.presets.0a481a9b-47cf-4d08-a0ab-1c142ebac631.title": "Ιδέα σε περίγραμμα",
"templates.presets.0a481a9b-47cf-4d08-a0ab-1c142ebac631.description": "Μετατρέπει μια ασαφή ιδέα σε δομημένο περίγραμμα.",

"templates.presets.0e9b1401-ce69-47c3-ae96-294f986c555c.title": "Σχεδιασμός εβδομαδιαίων θεματικών (Pro)",
"templates.presets.0e9b1401-ce69-47c3-ae96-294f986c555c.description": "Σχεδιάζει εβδομαδιαία θέματα (π.χ. Δευτέρα = deep work) για λιγότερο context switching.",

"templates.presets.1013d562-2867-422a-bd5f-c03c997c0f08.title": "Ιδέες για ενότητες newsletter (Pro)",
"templates.presets.1013d562-2867-422a-bd5f-c03c997c0f08.description": "Κάνει brainstorming για επαναλαμβανόμενες ενότητες/φόρμες περιεχομένου σε newsletter.",

"templates.presets.11613a3c-2dfd-4d82-8e43-aae48c4bbca6.title": "Εστίαση σε ένα πράγμα σήμερα",
"templates.presets.11613a3c-2dfd-4d82-8e43-aae48c4bbca6.description": "Σε βοηθά να διαλέξεις ένα βασικό task για σήμερα, με υποστηρικτικά βήματα.",

"templates.presets.18374272-f9e2-4884-9216-ed44d1fe8771.title": "Απλοποιητής εννοιών",
"templates.presets.18374272-f9e2-4884-9216-ed44d1fe8771.description": "Εξηγεί περίπλοκες έννοιες με απλή γλώσσα, παραδείγματα και αναλογίες.",

"templates.presets.1c13045b-e64f-41e5-86de-2b27444c308c.title": "Health Check-in & μικρά βήματα (Pro)",
"templates.presets.1c13045b-e64f-41e5-86de-2b27444c308c.description": "Αντανακλά τις συνήθειες υγείας σου και προτείνει 3 πολύ μικρές, ρεαλιστικές δράσεις για την επόμενη εβδομάδα.",

"templates.presets.21f914ac-b9e0-46fc-91f7-1c3fa428fec8.title": "Βοηθός ανάθεσης εργασιών (Pro)",
"templates.presets.21f914ac-b9e0-46fc-91f7-1c3fa428fec8.description": "Σε βοηθά να αποφασίσεις τι θα κάνεις ο ίδιος, τι θα αναθέσεις και τι θα διαγράψεις, με έτοιμα σύντομα briefs.",

"templates.presets.29ee3038-c754-495b-83a7-49b916a00871.title": "Αυτο-αξιολόγηση για performance review (Pro)",
"templates.presets.29ee3038-c754-495b-83a7-49b916a00871.description": "Σε βοηθά να γράψεις μια δομημένη αυτο-αξιολόγηση για το performance review σου.",

"templates.presets.2bee91ec-3443-4895-9211-6703c47ff443.title": "Δημιουργός περιγράμματος ιστορίας",
"templates.presets.2bee91ec-3443-4895-9211-6703c47ff443.description": "Δημιουργεί χαρακτήρες και πλοκή σε 3 πράξεις με βάση μια ιδέα ιστορίας.",

"templates.presets.33e43cd7-4732-467a-a13e-0a6f9ffe3c90.title": "Σπάσιμο project σε βήματα",
"templates.presets.33e43cd7-4732-467a-a13e-0a6f9ffe3c90.description": "Μετατρέπει ένα ασαφές project σε 5–12 συγκεκριμένα tasks με προτεινόμενη σειρά.",

"templates.presets.3404e934-b33c-4b8c-8ada-53103d28cf7b.title": "Ημερήσιο πλάνο εστίασης",
"templates.presets.3404e934-b33c-4b8c-8ada-53103d28cf7b.description": "Δημιουργεί ένα απλό, ρεαλιστικό πλάνο για σήμερα με time blocks και βασικές προτεραιότητες.",

"templates.presets.35c7f261-2afe-4eb3-b236-380409444937.title": "Οργάνωση λίστας ανά context",
"templates.presets.35c7f261-2afe-4eb3-b236-380409444937.description": "Οργανώνει τα tasks σου σε context (υπολογιστής, τηλέφωνο, δουλειές έξω, deep focus, γρήγορα wins).",

"templates.presets.3d9389b7-a127-434b-ac2a-14952342985f.title": "Συνοδός brainstorming",
"templates.presets.3d9389b7-a127-434b-ac2a-14952342985f.description": "Γεννά 10 δημιουργικές, πρακτικές ιδέες πάνω σε οποιοδήποτε θέμα.",

"templates.presets.4099d4e5-1e66-49c3-8956-0c08f832a048.title": "Roadmap εκμάθησης δεξιότητας (Pro)",
"templates.presets.4099d4e5-1e66-49c3-8956-0c08f832a048.description": "Σχεδιάζει ένα απλό πλάνο 4–8 εβδομάδων για να μάθεις μια νέα δεξιότητα.",

"templates.presets.43f52bed-1b66-4e9c-8b44-bc3a0ac72dc7.title": "Περιγράμμα προετοιμασίας εξετάσεων",
"templates.presets.43f52bed-1b66-4e9c-8b44-bc3a0ac72dc7.description": "Μετατρέπει ένα θέμα σε καθαρό study outline με βασικές ιδέες και ερωτήσεις εξετάσεων.",

"templates.presets.47df7cf9-0360-4037-84eb-c6aee80ff719.title": "Βοηθός αποφάσεων",
"templates.presets.47df7cf9-0360-4037-84eb-c6aee80ff719.description": "Αξιολογεί υπέρ/κατά, ρίσκα και προτείνει επόμενο βήμα για μια απόφαση.",

"templates.presets.488807ac-e949-4b4b-a53a-8b22b02472f3.title": "Υποστήριξη συνεδρίας brainstorming (Pro)",
"templates.presets.488807ac-e949-4b4b-a53a-8b22b02472f3.description": "Δομημένο brainstorming σε στάδια: ιδέες, ομαδοποίηση, επιλογή 3–5 πιο υποσχόμενων με επόμενα βήματα.",

"templates.presets.49051061-2d30-490d-972c-04bcf2baba81.title": "Εικόνα στόχων τριμήνου (Pro)",
"templates.presets.49051061-2d30-490d-972c-04bcf2baba81.description": "Βοηθά να ξεκαθαρίσεις 3–5 μεσοπρόθεσμους στόχους για τους επόμενους 3 μήνες με μετρήσιμα κριτήρια.",

"templates.presets.4917f21a-42b8-4447-a6bb-d4703d5d7944.title": "Διευκρινιστής tasks",
"templates.presets.4917f21a-42b8-4447-a6bb-d4703d5d7944.description": "Μετατρέπει ασαφή tasks σε ξεκάθαρες, εκτελέσιμες ενέργειες με αναμενόμενο αποτέλεσμα.",

"templates.presets.4fee09cf-4bc8-449f-bc1a-b55de529ac1b.title": "Προσαρμογή αίτησης εργασίας",
"templates.presets.4fee09cf-4bc8-449f-bc1a-b55de529ac1b.description": "Προσαρμόζει βιογραφικό ή cover letter σε συγκεκριμένη αγγελία εργασίας.",

"templates.presets.52863f2f-c37a-4b03-948c-e13c1e21b3f6.title": "Generator σύνοψης meeting",
"templates.presets.52863f2f-c37a-4b03-948c-e13c1e21b3f6.description": "Μετατρέπει χαοτικές σημειώσεις meeting σε σύνοψη, αποφάσεις και action items με ιδιοκτήτες.",

"templates.presets.58253a4b-f726-4c0f-927a-60a81d406c2c.title": "Εκκίνηση συνήθειας",
"templates.presets.58253a4b-f726-4c0f-927a-60a81d406c2c.description": "Μετατρέπει έναν στόχο σε απλό habit plan με trigger, δράση, ανταμοιβή και πρώτο μικρό βήμα.",

"templates.presets.59ec26a0-e4a8-4081-8916-803b562ae98a.title": "Audit συστήματος παραγωγικότητας (Pro)",
"templates.presets.59ec26a0-e4a8-4081-8916-803b562ae98a.description": "Εξετάζει πώς διαχειρίζεσαι tasks, σημειώσεις, ημερολόγιο και στόχους και προτείνει 3–5 βελτιώσεις.",

"templates.presets.5bfb7b5d-3381-4efc-ad47-74745209f291.title": "Χάρτης triggers διάσπασης",
"templates.presets.5bfb7b5d-3381-4efc-ad47-74745209f291.description": "Χαρτογραφεί τα βασικά triggers διάσπασης και προτείνει τρόπους αντιμετώπισης ή αλλαγής περιβάλλοντος.",

"templates.presets.5dc7adcf-e72c-4ad6-9b61-caf813c9c291.title": "Πλέγμα προτεραιοποίησης ιδεών (Pro)",
"templates.presets.5dc7adcf-e72c-4ad6-9b61-caf813c9c291.description": "Βαθμολογεί και κατατάσσει ιδέες με βάση impact και προσπάθεια, προτείνοντας τις 3 πρώτες να δοκιμάσεις.",

"templates.presets.64cbbf7f-a627-48d9-818e-f6d6cc37d507.title": "Generator social posts",
"templates.presets.64cbbf7f-a627-48d9-818e-f6d6cc37d507.description": "Δημιουργεί πολλαπλές εκδοχές μιας ανάρτησης για social media.",

"templates.presets.6558ec63-8280-4ff7-bd69-eb96a35016cf.title": "Πρωινό prompt διαύγειας",
"templates.presets.6558ec63-8280-4ff7-bd69-eb96a35016cf.description": "Βοηθά να ξεκινήσεις τη μέρα με πρόθεση, 3 προτεραιότητες, μία συνήθεια και ένα mindset reminder.",

"templates.presets.6759fcb0-8b84-435c-92d4-36d3e13c5848.title": "Δημιουργός flashcards",
"templates.presets.6759fcb0-8b84-435c-92d4-36d3e13c5848.description": "Μετατρέπει κείμενο σε σύντομες κάρτες Q→A για γρήγορη απομνημόνευση.",

"templates.presets.691a33aa-3c7b-4651-bf83-89609f6464e3.title": "Ανασκόπηση τέλους ημέρας",
"templates.presets.691a33aa-3c7b-4651-bf83-89609f6464e3.description": "Συνοψίζει τη μέρα, καταγράφει νίκες και προτείνει ένα μικρό βήμα για αύριο.",

"templates.presets.69d14d9e-b259-4fe7-b0a9-1dfe838c7cb0.title": "Δημιουργός ταξιδιωτικού πλάνου",
"templates.presets.69d14d9e-b259-4fe7-b0a9-1dfe838c7cb0.description": "Χτίζει ένα απλό ταξιδιωτικό πλάνο 1–3 ημερών με δραστηριότητες και φαγητό.",

"templates.presets.6a2a648d-02fb-4320-bb18-1ce14d28f343.title": "Time blocking για φορτωμένη μέρα",
"templates.presets.6a2a648d-02fb-4320-bb18-1ce14d28f343.description": "Μετατρέπει μια χαοτική λίστα σε ρεαλιστικό time-blocked πρόγραμμα με buffers.",

"templates.presets.6ab69896-ae23-4271-8064-7c2d6006d3c1.title": "Μείωση υποχρεώσεων (Pro)",
"templates.presets.6ab69896-ae23-4271-8064-7c2d6006d3c1.description": "Σε βοηθά να δεις τι μπορείς να παγώσεις, να αρνηθείς ή να επαναδιαπραγματευτείς, με ευγενικά scripts για το «όχι».",

"templates.presets.6fa90d52-3e97-40f4-8d76-5d8acf8d2766.title": "Weekly review + πλάνο",
"templates.presets.6fa90d52-3e97-40f4-8d76-5d8acf8d2766.description": "Ανασκόπηση της εβδομάδας και επιλογή έως 3 βασικών στόχων για την επόμενη με συγκεκριμένα βήματα.",

"templates.presets.707606ec-e734-4739-9446-d36f665be20f.title": "Draft κειμένου landing page (Pro)",
"templates.presets.707606ec-e734-4739-9446-d36f665be20f.description": "Γεννά ένα πρώτο draft landing page με headline, benefits, social proof ιδέες και call to action.",

"templates.presets.70779af0-7a0a-4fc3-a97e-88005adb511b.title": "Generator σύντομων social posts",
"templates.presets.70779af0-7a0a-4fc3-a97e-88005adb511b.description": "Δημιουργεί 3–5 σύντομες, καθαρές παραλλαγές για social (τύπου Twitter/LinkedIn).",

"templates.presets.748559a4-0a90-4dc4-b162-7fda67a7e1d4.title": "Generator σύνοψης meeting",
"templates.presets.748559a4-0a90-4dc4-b162-7fda67a7e1d4.description": "Συνοψίζει σημειώσεις meeting σε βασικά σημεία, αποφάσεις και επόμενες ενέργειες.",

"templates.presets.777313a0-c5a1-49ce-b057-e5d48acc9abb.title": "Συντόμευση μηνύματος",
"templates.presets.777313a0-c5a1-49ce-b057-e5d48acc9abb.description": "Κάνει μεγάλα κείμενα πιο σύντομα και καθαρά, κρατώντας ευγενικό τόνο.",

"templates.presets.87558d25-a581-403d-b407-ee22836847c0.title": "Bank ερωτήσεων για interview",
"templates.presets.87558d25-a581-403d-b407-ee22836847c0.description": "Δημιουργεί πιθανές ερωτήσεις συνέντευξης, ερωτήσεις προς τον interviewer και positioning summary.",

"templates.presets.89f270dc-a80d-47d5-a829-58df96b895eb.title": "Μηνιαία ανασκόπηση & highlights (Pro)",
"templates.presets.89f270dc-a80d-47d5-a829-58df96b895eb.description": "Ανασκοπεί τον μήνα, αναδεικνύει highlights, μαθήματα και τι να κρατήσεις/σταματήσεις/ξεκινήσεις.",

"templates.presets.8e5b196b-c6a5-4fcd-9bf0-f27d30792f16.title": "Σπάσιμο study session",
"templates.presets.8e5b196b-c6a5-4fcd-9bf0-f27d30792f16.description": "Μετατρέπει ένα θέμα σε πλάνο μελέτης 60–90 λεπτών με συγκεκριμένα βήματα και διαλείμματα.",

"templates.presets.9926cf96-7daa-4b75-a4d9-56026dcc81ab.title": "Τελετουργικό Κυριακής για την εβδομάδα",
"templates.presets.9926cf96-7daa-4b75-a4d9-56026dcc81ab.description": "Μια ήπια δομή για να σχεδιάσεις την επόμενη εβδομάδα με big rocks, κατηγορίες ζωής και μικρές συνήθειες.",

"templates.presets.99904746-b879-49cd-aab4-abad35d12443.title": "Motivation booster",
"templates.presets.99904746-b879-49cd-aab4-abad35d12443.description": "Γεννά ένα σύντομο, ρεαλιστικά αισιόδοξο motivational μήνυμα για την κατάστασή σου.",

"templates.presets.9ecc5ea4-4f52-49af-bf18-cce6947455ac.title": "Επαγγελματική επανεγγραφή",
"templates.presets.9ecc5ea4-4f52-49af-bf18-cce6947455ac.description": "Μετατρέπει ένα casual κείμενο σε πιο επίσημο, επαγγελματικό ύφος.",

"templates.presets.9f23781b-f87f-4321-b83b-1736666f9b6d.title": "Βοηθός επαναπλαισίωσης προβλήματος",
"templates.presets.9f23781b-f87f-4321-b83b-1736666f9b6d.description": "Προσφέρει 3–5 διαφορετικούς τρόπους να δεις ένα πρόβλημα, με μία πιθανή δράση για κάθε οπτική.",

"templates.presets.a09fc2bf-baff-4377-9963-08977b573f1f.title": "Brainstorm καριέρας: επόμενα βήματα (Pro)",
"templates.presets.a09fc2bf-baff-4377-9963-08977b573f1f.description": "Εξερευνά 3–5 πιθανά επόμενα βήματα στην καριέρα σου με υπέρ/κατά και πρώτα μικρά βήματα.",

"templates.presets.a50ac644-47f4-4f76-818d-0009c7d0553d.title": "Gentle accountability check-in",
"templates.presets.a50ac644-47f4-4f76-818d-0009c7d0553d.description": "Μια φιλική, χωρίς ενοχές ανασκόπηση του τι είχες σκοπό να κάνεις και τι έγινε τελικά.",

"templates.presets.a559951b-3010-4bfd-a550-6f3b17e3bf4f.title": "Decision helper: υπέρ & κατά",
"templates.presets.a559951b-3010-4bfd-a550-6f3b17e3bf4f.description": "Εξηγεί υπέρ/κατά για κάθε επιλογή και καταλήγει σε πρόταση ή κριτήρια απόφασης.",

"templates.presets.a5d47618-a4e8-4250-9cca-36707041c202.title": "Brain dump → οργανωμένα buckets",
"templates.presets.a5d47618-a4e8-4250-9cca-36707041c202.description": "Μετατρέπει ένα μεγάλο brain dump σε buckets όπως tasks, ιδέες, ανησυχίες, υπενθυμίσεις, ερωτήσεις.",

"templates.presets.a7bbfcc5-7b2d-4cc4-abab-8a4c128ae766.title": "Σχεδιασμός study session",
"templates.presets.a7bbfcc5-7b2d-4cc4-abab-8a4c128ae766.description": "Σχεδιάζει session μελέτης 60–120 λεπτών με warm-up, blocks, διάλειμμα και recap/self-quiz.",

"templates.presets.aaf2a25e-03a5-4669-81cb-c6948f1556a8.title": "Ημερολόγιο διάθεσης",
"templates.presets.aaf2a25e-03a5-4669-81cb-c6948f1556a8.description": "Βοηθά να σκεφτείς τα συναισθήματά σου χωρίς κριτική και προτείνει μια υγιή δράση.",

"templates.presets.ab2c83c7-3813-4a82-adca-21b06937cf41.title": "Σχεδιασμός kickoff project",
"templates.presets.ab2c83c7-3813-4a82-adca-21b06937cf41.description": "Ορίζει scope, ρίσκα και επόμενα βήματα για νέο project με σύντομο project brief.",

"templates.presets.af39dab2-341d-4cc5-b6da-f300c4626362.title": "Καταγραφή ευγνωμοσύνης & νικών",
"templates.presets.af39dab2-341d-4cc5-b6da-f300c4626362.description": "Σε βοηθά να καταγράψεις 3 πράγματα που εκτιμάς και 3 μικρές νίκες από σήμερα ή αυτή την εβδομάδα.",

"templates.presets.b46f44b6-710e-4bb6-ba5e-e527f16009a8.title": "Ξεκαθάρισμα στρες",
"templates.presets.b46f44b6-710e-4bb6-ba5e-e527f16009a8.description": "Ξεσκαρτάρει το στρες σε αιτίες, επιπτώσεις και 2–3 διαχειρίσιμα βήματα.",

"templates.presets.b5d29a06-4623-4144-93de-bbcba79a4363.title": "Draft εβδομαδιαίου update ομάδας",
"templates.presets.b5d29a06-4623-4144-93de-bbcba79a4363.description": "Μετατρέπει τι έγινε στην εβδομάδα σε σύντομο, δομημένο update για ομάδα ή manager.",

"templates.presets.bd40513a-f0ad-4ae6-b6bc-46b7165765df.title": "Προετοιμασία 1:1 meeting",
"templates.presets.bd40513a-f0ad-4ae6-b6bc-46b7165765df.description": "Σε βοηθά να προετοιμάσεις συζήτηση, ερωτήσεις και ευαίσθητα θέματα για ένα 1:1 meeting.",

"templates.presets.c5273090-ad2c-4d18-9666-2079149646c7.title": "Weekly review",
"templates.presets.c5273090-ad2c-4d18-9666-2079149646c7.description": "Καθοδηγεί μια σύντομη εβδομαδιαία ανασκόπηση και προτείνει 3 focus areas για την επόμενη εβδομάδα.",

"templates.presets.c5a1da09-7428-40f4-90b9-2fdad45d05df.title": "Απλό snapshot budget",
"templates.presets.c5a1da09-7428-40f4-90b9-2fdad45d05df.description": "Δημιουργεί μια απλή εικόνα εισοδήματος, εξόδων και 2–3 σημείων προσοχής (χωρίς χρηματοοικονομικές συμβουλές).",

"templates.presets.c7a224c2-8e0d-4602-b308-00672fb79cff.title": "Από overwhelm σε προτεραιότητες",
"templates.presets.c7a224c2-8e0d-4602-b308-00672fb79cff.description": "Μετατρέπει μια υπερβολική λίστα σε 3 επίπεδα: Πρέπει σήμερα, Αυτή την εβδομάδα, Ίσως αργότερα.",

"templates.presets.c9f8d4a2-ddb1-4cf4-a155-72364ba9eeb5.title": "Απλοποιητής εννοιών (εκπαιδευτικός)",
"templates.presets.c9f8d4a2-ddb1-4cf4-a155-72364ba9eeb5.description": "Εξηγεί μια δύσκολη έννοια σαν σε έξυπνο 12χρονο, με απλή γλώσσα και παραδείγματα.",

"templates.presets.d08e4696-68cc-41c5-baa7-19320c5fcb76.title": "Καθαρó email rewrite",
"templates.presets.d08e4696-68cc-41c5-baa7-19320c5fcb76.description": "Ξαναγράφει ένα πρόχειρο email σε καθαρή, ευγενική και επαγγελματική μορφή με καλό subject line.",

"templates.presets.d1fad9fb-9790-45c7-baf3-00504809b50f.title": "Ημερήσιος coach εστίασης",
"templates.presets.d1fad9fb-9790-45c7-baf3-00504809b50f.description": "Σε βοηθά να επιλέξεις τα 3 σημαντικότερα tasks σήμερα, ένα quick win και κάτι που μπορεί να μεταφερθεί.",

"templates.presets.d551eef8-a655-4d70-b247-da9370671259.title": "Πρωινό check-in διαύγειας",
"templates.presets.d551eef8-a655-4d70-b247-da9370671259.description": "Μικρό πρωινό check-in για διάθεση, επιτυχία της ημέρας και πιθανά εμπόδια, με 3 προτεινόμενα focus points.",

"templates.presets.da3f7f90-5030-4220-aef8-4bebfbf72d68.title": "Πλάνο επανάληψης εξετάσεων (Pro)",
"templates.presets.da3f7f90-5030-4220-aef8-4bebfbf72d68.description": "Δημιουργεί πολυεβδομαδιαίο πλάνο επανάληψης μέχρι την ημερομηνία της εξέτασης.",

"templates.presets.da9fde38-2fe4-49aa-b57c-095e20649122.title": "Ημερολόγιο ενέργειας & διάθεσης",
"templates.presets.da9fde38-2fe4-49aa-b57c-095e20649122.description": "Καταγράφει ενέργεια/διάθεση, εντοπίζει patterns και προτείνει 2–3 gentle experiments.",

"templates.presets.df6cf759-a5b8-4c61-a26b-5ec43d0dd47c.title": "Αλλαγή τόνου: φιλικά επαγγελματικό",
"templates.presets.df6cf759-a5b8-4c61-a26b-5ec43d0dd47c.description": "Ξαναγράφει κείμενο σε φιλικό αλλά επαγγελματικό τόνο, πιο καθαρό και σύντομο.",

"templates.presets.e00d8c04-0eae-4511-a6e0-5bf9b71f18a1.title": "Checklist ημέρας ταξιδιού",
"templates.presets.e00d8c04-0eae-4511-a6e0-5bf9b71f18a1.description": "Δημιουργεί απλή checklist για μέρα ταξιδιού: packing + admin, ανάλογα με μέσο και διάρκεια.",

"templates.presets.e36c6f8b-45a7-4ea4-a8de-ae58e7272ddb.title": "Email polisher",
"templates.presets.e36c6f8b-45a7-4ea4-a8de-ae58e7272ddb.description": "Καθαρίζει ένα πρόχειρο email σε σύντομο, ευγενικό κείμενο με σωστή δομή και γραμματική.",

"templates.presets.e480b3f8-587d-4a74-8c08-25d4932de32d.title": "Οργανωτής σημειώσεων ανάγνωσης",
"templates.presets.e480b3f8-587d-4a74-8c08-25d4932de32d.description": "Μετατρέπει ωμές σημειώσεις/υπογραμμίσεις βιβλίου σε δομημένες ενότητες και takeaways.",

"templates.presets.ebcbc2e9-8c03-46c7-b0bc-c9a805488ec1.title": "Σπάσιμο μεγάλων projects (Pro)",
"templates.presets.ebcbc2e9-8c03-46c7-b0bc-c9a805488ec1.description": "Σπάει ένα μεγάλο project σε φάσεις, milestones και tasks με ρεαλιστική σειρά.",

"templates.presets.f1bbcaba-b6db-458f-aaf5-2d6cec1db996.title": "Πλάνο εκκίνησης συνήθειας",
"templates.presets.f1bbcaba-b6db-458f-aaf5-2d6cec1db996.description": "Σχεδιάζει ένα «γελοία μικρό» πλάνο για να ξεκινήσεις μια νέα συνήθεια με trigger και tracking.",

"templates.presets.f1eb14c7-a13e-4acf-b39b-0c5d2ad1e57f.title": "Prompts check-in σχέσης (Pro)",
"templates.presets.f1eb14c7-a13e-4acf-b39b-0c5d2ad1e57f.description": "Δίνει ευγενικές, ανοιχτές ερωτήσεις για εβδομαδιαίο check-in με σύντροφο ή κοντινό φίλο.",

"templates.presets.f9fcfb6a-0282-408a-ab99-779bc58057ab.title": "Βελτίωση οδηγιών",
"templates.presets.f9fcfb6a-0282-408a-ab99-779bc58057ab.description": "Ξαναγράφει οδηγίες για άλλους (ομάδα, πελάτες, freelancers) ώστε να είναι ξεκάθαρες και βήμα-βήμα.",

"templates.presets.fc20be08-5fe5-4f87-99fc-0fee369d4106.title": "Next 3 actions generator",
"templates.presets.fc20be08-5fe5-4f87-99fc-0fee369d4106.description": "Βρίσκει τα 3 αμέσως επόμενα μικρά, συγκεκριμένα actions για ένα project ή στόχο.",

"templates.presets.fee66cc8-3c75-4905-834d-84e5ebdd8215.title": "Single-task deep work session",
"templates.presets.fee66cc8-3c75-4905-834d-84e5ebdd8215.description": "Ετοιμάζει μια συνεδρία deep work 60–90 λεπτών γύρω από ένα μόνο σημαντικό task.",

"templates.presets.ffe9a15d-7a51-45a4-8527-09bcd5844b70.title": "Εβδομαδιαίο πλάνο γευμάτων",
"templates.presets.ffe9a15d-7a51-45a4-8527-09bcd5844b70.description": "Δημιουργεί ένα απλό εβδομαδιαίο πλάνο γευμάτων (πρωινό, μεσημεριανό, βραδινό) με βάση τις προτιμήσεις σου.",
},

  // 🎯 Languages you will fill later
  de: {},
  es: {},
  fr: {},
  it: {},
  pt: {},
  tr: {},
  ru: {},
  ro: {},
};

// 6) Translate helper – still usable anywhere in the app
export function translate(
  lang: Locale,
  key: TranslationKey,
  fallback?: string
): string {
  const dict = MESSAGES[lang] || {};
  if (dict && dict[key]) {
    return dict[key]!;
  }
  return fallback ?? key;
}
export const messages = MESSAGES;