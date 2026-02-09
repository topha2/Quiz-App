# Nexus Quiz App

A secure, real-time quiz application with anti-cheat features.

## 🚀 Quick Start

You can run this project easily using a local development server.

### Prerequisites

- Node.js installed (for `npx serve`)
- A [Supabase](https://supabase.com) project

### Running the App

1.  Open a terminal in this directory.
2.  Run the following command to start a local server:
    ```bash
    npx serve .
    ```
    *(If functionality is limited on `file://` protocol, this step is highly recommended)*

3.  Open `http://localhost:3000` in your browser.

## 🛠️ Setup Supabase (Backend)

To enable Realtime monitoring and data persistence, you need to connect a Supabase project.

1.  **Create Project**: Go to [database.new](https://database.new) and create a new project.
2.  **SQL Setup**:
    - Go to the **SQL Editor** in your Supabase dashboard.
    - Copy the content of `schema.sql` from this project.
    - Paste it into the SQL Editor and run it. This will create the necessary tables and policies.
3.  **Enable Realtime**:
    - The SQL script should handle this (`alter publication supabase_realtime...`), but you can verify in **Database > Replication** that the `attempts` table is enabled for INSERT/UPDATE.

## 📱 How to Use

### Teacher Dashboard
1.  Navigate to `/teacher.html` (e.g., click "Teacher Dashboard" on the home page).
2.  Click **Connect Dashboard**.
3.  Enter your **Project URL** and **Anon Key** (found in Supabase Settings > API).
4.  You will now see live students as they join.

### Student Portal
1.  Navigate to `/quiz.html`.
2.  Enter your Name.
3.  (Optional) Enter Supabase credentials if not pre-configured (in a real app, these would be hidden/env variables).
4.  The exam will start in Fullscreen.
5.  **Anti-Cheat**: If you switch tabs, you will be immediately disqualified.

## ⚠️ Anti-Cheat Features
- **Fullscreen Enforcement**: Checks for fullscreen on start.
- **Tab Switching**: Uses `document.visibilitychange` to detect if the user leaves the tab.
- **Key Blocking**: Prevents `Right-Click`, `F12`, `Ctrl+C`, `Ctrl+V`.

## 📁 Project Structure
- `index.html`: Landing page.
- `teacher.html`: Dashboard for monitoring.
- `quiz.html`: Exam interface.
- `assets/js/`: Logic files (`student.js`, `teacher.js`, `supabase-client.js`).
- `schema.sql`: Backend structure.
