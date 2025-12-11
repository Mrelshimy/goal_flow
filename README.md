
# GoalFlow

GoalFlow is a goals & achievements tracking platform focused on career advancement and performance reporting. It lets users set goals, log achievements, track KPIs, and automatically generate weekly/monthly/quarterly reports using AI.

## Database Setup (Crucial)

Before using the app, you **MUST** set up the database schema in Supabase.

1.  Copy the contents of the `supabase_schema.sql` file.
2.  Go to your Supabase project dashboard.
3.  Navigate to the **SQL Editor** in the left sidebar.
4.  Paste the SQL code and click **Run**.
5.  This will create all necessary tables (Goals, KPIs, Achievements, etc.).

## Features

- **Goals Management**: Create, edit, and track goals with AI-generated milestones.
- **Achievement Logging**: Log achievements and get AI-generated summaries and classifications.
- **Task Management**: Google Tasks-style lists and task tracking.
- **AI Reporting**: Generate PDF reports for performance reviews based on your data.
- **Personal Dashboard**: Track habits and get AI reflections.

## Tech Stack

- React + Vite
- Tailwind CSS
- Google Gemini API (@google/genai)
- Recharts
- jsPDF

## Deployment

This project is configured for deployment on Vercel.
