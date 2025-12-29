import { NextResponse } from 'next/server';

export async function GET() {
    const scripts = [
        {
            id: 'promo-1',
            title: 'App Showcase (Short)',
            category: 'Promotional',
            content: `Hey everyone! Check out my new AI productivity app.
It helps you organize your day, track your biological rhythms, and stay focused.
Just look at this dashboard! It automatically plans my schedule based on my energy levels.
Swipe up to download and try it for yourself!`
        },
        {
            id: 'showcase-full',
            title: 'Full Application Tour (80s)',
            category: 'Promotional',
            content: `[0:00 - Dashboard]
Welcome to the Future of Productivity.
This is your personal command center.
See your focus score, today's weather, and your priority tasks all in one view.

[0:09 - Planner]
Navigate to the Planner.
Creating a task is simple, but using our AI Task Creator is revolutionary.
Just speak your plan, and let the AI organize your schedule for you.

[0:18 - Calendar]
Check your Calendar.
It's not just dates; it's smart scheduling.
Our BioRhythm integration shows you exactly when your energy is highest for deep work.

[0:27 - AI Chat]
Meet your AI Companion.
Whether you need to translate a document, brainstorm ideas, or just chat,
it's always ready to assist you 24/7.

[0:36 - Travel]
Planning a trip? 
The Travel section organizes your itineraries, flights, and packing lists automatically.
Travel stress-free.

[0:45 - Notes]
Capture your thoughts in Notes.
Rich text formatting, easy organization, and instant search.
Never lose a great idea again.

[0:54 - Weekly History]
Review your progress in Weekly History.
See your streaks, completed tasks, and productivity trends.
Improvement starts with awareness.

[1:03 - Settings & Themes]
Finally, make it yours in Settings.
We care about your eyes.
Switch seamlessly between Light Mode for clarity...
And Dark Mode for those late-night sessions.
Customize your notifications and preferences to fit your lifestyle.

[1:13 - Outro]
Download the app today.
Master your time. Master your life.`
        },
        {
            id: 'feature-focus',
            title: 'Feature: Deep Focus Mode',
            category: 'Tutorial',
            content: `[0:00 - Intro]
Distractions are the enemy of progress.
Let's turn on Deep Focus Mode.

[0:08 - Settings]
Customize your sound environment. 
Choose 'Rainy Cafe' or 'White Noise' to block out the world.
Set your timer for 25 minutes.

[0:16 - Action]
Not only does it silence notifications, but it also tracks your flow state.
When you're done, review your stats to see how much you accomplished.
Focus better today.`
        },
        {
            id: 'linkedin-1',
            title: 'Productivity Thought Leader',
            category: 'Professional',
            content: `I used to struggle with burnout.
We all push ourselves too hard during our low-energy hours.
That's why I started using bio-rhythm tracking.
It tells me exactly when to focus and when to rest.
Productivity isn't about working harder; it's about working smarter.`
        }
    ];

    return NextResponse.json(scripts);
}
