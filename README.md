# SmartCrew Scheduler

A complete AI-powered business automation tool for employee scheduling and management.

## Tech Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (Auth, Database, Edge Functions)
- **AI Integration:** Google Gemini API (via Supabase Edge Functions)
- **Deployment:** Ready for Vercel

## Features

- **User System:** Role-based access (Admin, Manager, Employee), Profile management.
- **Dashboard:** Overview with key metrics, specialized views for different roles.
- **Employee Management:** Add, edit, filter employees; track skills and rates.
- **Schedule Management:** Interactive calendar, shift assignment, conflict detection.
- **AI Scheduling Assistant:** Generate optimal schedules based on availability, skills, and cost.
- **Availability:** Weekly availability setting, time-off requests.
- **Reports & Analytics:** Labor cost tracking, hours worked visualization.

## Getting Started

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Start the development server:**
    ```bash
    npm run dev
    ```

3.  **Open the app:**
    Navigate to the URL shown in the terminal (usually `http://localhost:5173`).

## Supabase Setup

1.  Create a new Supabase project.
2.  Run the SQL script located in `supabase/schema.sql` in your Supabase SQL Editor to create tables and policies.
3.  Copy your Supabase URL and Anon Key to a `.env` file (see `.env.example` if available, or just create one):
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

## AI Integration (Edge Function)

The AI scheduling logic resides in a Supabase Edge Function.

1.  **Deploy the function:**
    ```bash
    supabase functions deploy generate-schedule
    ```

2.  **Set Secrets:**
    You need to set the `GOOGLE_API_KEY` secret for the function to access Gemini API.
    ```bash
    supabase secrets set GOOGLE_API_KEY=your_gemini_api_key
    ```

3.  **Usage:**
    The frontend calls this function when you click "Generate Schedule" in the Schedule page.

## Project Structure

- `src/components`: Reusable UI components (shadcn/ui).
- `src/pages`: Application pages (Landing, Auth, Dashboard).
- `src/lib`: Utility functions and Supabase client.
- `src/supabase`: Database types.
- `supabase/functions`: Edge Functions.
- `supabase/schema.sql`: Database schema.
