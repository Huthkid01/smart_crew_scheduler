# SmartCrew Scheduler

An AI-powered workforce management and scheduling platform designed for modern teams. Streamline operations with automated scheduling, real-time time tracking, and comprehensive team management.

## 🚀 Key Features

### 📅 AI-Powered Scheduling
*   **Automated Schedule Generation:** Uses Groq API keys to create optimized schedules in seconds based on employee availability and skills.
*   **Smart Calendar:** Interactive drag-and-drop calendar for manual adjustments.
*   **Conflict Detection:** AI scheduling respects weekly availability and avoids double-booking; approved time-off is stored for HR visibility (approve/reject in the database or a future admin UI).
*   **Publishing Workflow:** Create drafts and publish schedules only when they are ready.

### 👥 Team Management
*   **Centralized Database:** Manage employee profiles, contact info, and roles.
*   **Skill Tracking:** Tag employees with specific skills (e.g., "Bartender", "Manager") for better shift assignment.
*   **Invite System:** Easily invite new team members via email.
*   **Access Control:** Revoke login access for terminated employees instantly.

### ⏱️ Time Tracking & Attendance
*   **Employee Clock In/Out:** Dedicated dashboard for employees to log their work hours in real-time.
*   **Live Attendance Widget:** Admins can see who is currently working right from the main dashboard.
*   **Time Logs:** Securely stores all clock-in and clock-out events for payroll accuracy.

### 📊 Reports & Analytics
*   **Labor Cost Estimation:** Real-time calculation of weekly labor costs based on hourly rates.
*   **Hours Tracking:** Monitor total hours scheduled vs. actual hours worked.
*   **Visual Insights:** Charts and graphs for weekly trends.

### 📱 Employee Self-Service
*   **Personal Dashboard:** Employees can view their own upcoming shifts and weekly hours.
*   **Availability Management:** Weekly availability is saved to the database; time-off requests are stored with pending/approved/rejected status.
*   **Profile Management:** Update personal contact details.

## 🛠️ Technology Stack

*   **Frontend:** React (Vite), TypeScript, Tailwind CSS, Shadcn UI
*   **Backend / Database:** Supabase (PostgreSQL, Auth, Edge Functions)
*   **AI Engine:** Groq API
*   **State Management:** React Hooks
*   **Charts:** Recharts
*   **Calendar:** React Big Calendar

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm or bun
*   Supabase account
*   [Groq](https://console.groq.com/) API key (for AI schedule generation in the app)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/smart-crew-scheduler.git
    cd smart-crew-scheduler
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    VITE_GROQ_API_KEY=your_groq_api_key
    ```

4.  **Run Development Server:**
    ```bash
    npm run dev
    ```

### Database Setup
Run the SQL migrations in `supabase/migrations` (Supabase SQL Editor, or `supabase db push` if your migration history matches).

**Apply selected “feature” migrations to an existing hosted project** (uses the [database password](https://supabase.com/dashboard/project/_/settings/database), not the anon key):

```bash
SUPABASE_DB_PASSWORD='your-database-password' npm run db:apply-remote
```

This runs, in order: `handle_new_user` invite fix, Realtime publication for `time_entries` / `shifts`, and `time_off_requests` + RLS. It is safe to re-run. Override host/user with `SUPABASE_DB_HOST`, `SUPABASE_DB_USER`, `SUPABASE_PROJECT_REF` if your pooler region differs.

**Frontend ↔ Supabase:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` must be from the **same** Supabase project as your database (ref in the URL matches the project ref).

### Testing
Automated checks use [Vitest](https://vitest.dev/). From the project root:

```bash
npm test
```

This runs unit tests (e.g. shared utilities). For releases, also run `npm run build` and manual smoke tests on auth, invites, scheduling, and time clock flows.

### Edge Functions (optional)
If you use the `generate-schedule` Edge Function, set a **`GROQ_API_KEY`** secret in the Supabase dashboard (same key as Groq; do not expose the service key in the client). The in-app scheduler uses `VITE_GROQ_API_KEY` in `.env`.

## 📝 License

This project is licensed under the MIT License.
