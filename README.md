# SmartCrew Scheduler

An AI-powered workforce management and scheduling platform designed for modern teams. Streamline operations with automated scheduling, real-time time tracking, and comprehensive team management.

## 🚀 Key Features

### 📅 AI-Powered Scheduling
*   **Automated Schedule Generation:** Uses Google Gemini AI to create optimized schedules in seconds based on employee availability and skills.
*   **Smart Calendar:** Interactive drag-and-drop calendar for manual adjustments.
*   **Conflict Detection:** Automatically avoids scheduling employees during their time off or double-booking.
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
*   **Availability Management:** Employees can set their preferred working hours and time-off requests.
*   **Profile Management:** Update personal contact details.

## 🛠️ Technology Stack

*   **Frontend:** React (Vite), TypeScript, Tailwind CSS, Shadcn UI
*   **Backend / Database:** Supabase (PostgreSQL, Auth, Edge Functions)
*   **AI Engine:** Google Gemini API
*   **State Management:** React Hooks
*   **Charts:** Recharts
*   **Calendar:** React Big Calendar

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm or bun
*   Supabase Account
*   Google AI Studio API Key

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
Run the SQL migrations provided in `supabase/migrations` to set up your tables and Row Level Security (RLS) policies.

## 📝 License

This project is licensed under the MIT License.
