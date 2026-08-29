# Developer Setup Guide

This guide explains how to set up the AI-Powered Criminal Network Analysis System on your local development machine.

## Prerequisites

Ensure you have the following software installed:
1. **Node.js** (v18.0.0 or higher) - The JavaScript runtime environment.
2. **npm** (Node Package Manager, installed automatically with Node.js).
3. **Supabase CLI** (Optional, only needed if modifying PostgreSQL database schemas).

## Local Installation Steps

Follow these numbered steps to get the system running:

1. **Clone the Repository**
   Open your command prompt or terminal and run:
   ```bash
   git clone <your-repository-url>
   cd "HACKATHON 189"
   ```

2. **Install Node Dependencies**
   Run the following command to download all necessary libraries (Next.js, Tailwind CSS, Graphology, Cytoscape, and Vitest):
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a new file named `.env.local` in the project root folder. Copy and paste the following template:
   ```env
   # SUPABASE CONNECTION CONFIGURATION
   # If left empty, the system automatically runs in DEGRADED MODE (Offline Local Fallback)
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=

   # GEMINI AI STUDIO API CONFIGURATION
   # If left empty, the extraction cascades automatically fall back to regex + mock schemas
   GEMINI_API_KEY=
   ```

4. **Initialize Database Schema**
   - If using **Supabase**: Login to your Supabase Dashboard, open the SQL Editor, copy the contents of `supabase/migrations/20260827_init.sql`, and click "Run".
   - If running **Offline (Degraded Mode)**: No setup is required. The system will write data to a local `mock_database.json` file on the server and use `localStorage` in the browser.

5. **Start the Local Development Server**
   Run the following command:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

6. **Seed the Demonstration Cartel**
   Click the **"Reset & Load Demo Cartel"** button on the homepage to seed the deterministic Cartel, pings, and alerts.
