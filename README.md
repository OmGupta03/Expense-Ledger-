# CSV Ingestion & Multi-Currency Expense Manager

An aesthetically premium, responsive, and robust Expense Management platform built using **Next.js**, **Express.js**, and **Supabase (PostgreSQL + Auth + Realtime)**. This app supports multi-currency transaction ledgers, currency-specific greedy debt simplifications, and features an interactive CSV uploader that parses, sanitizes, and logs historical data anomalies.

This repository is structured as a workspace:
* `/frontend`: Next.js Web App (UI rendering, routes, and views).
* `/backend`: Node/Express Server (exposes REST API endpoints for database transactions, greedy debt minimization, and core balance logic).

---

## Key Features

1. **Interactive CSV Ingest Wizard**: Parse standard CSV expense files on the client side, sanitize formatting errors (casing, commas, whitespace, decimals), normalise percentage splits, and reclassify settlement transactions. Shows a beautiful, interactive **Import Report** panel with all warnings and resolutions.
2. **Decoupled User Profiles**: Allows importing historical CSV participants (like Aisha, Rohan, Priya, Meera, Dev, Sam, Kabir) with random UUIDs and optional email addresses. Users can sign up later and sync cleanly, resolving the strict auth bottleneck.
3. **Multi-Currency Ledgers & Settlements**: Full native support for `INR` (Indian Rupees) and `USD` (US Dollars). Expenses and payments are stored in their native currency, preventing exchange-rate distortion.
4. **Greedy Debt Simplification per Currency**: Run debt minimization separately for USD and INR, providing accurate simplified balance paths for each currency ledger (e.g. A owes B $20 USD and ₹5,000 INR).
5. **Real-time Discussion Chat**: Discuss specific ledger entries in real-time inside the slide-out expense details drawer using Supabase Realtime client listeners.
6. **Negative Refund Splits**: Negative expense values are supported natively (e.g., `-30 USD` for canceled bookings), correctly reducing split debts.

---

## Tech Stack

* **Frontend Framework**: Next.js 16 (App Router) in `/frontend`
* **Backend Framework**: Node.js + Express.js in `/backend`
* **Styling**: Tailwind CSS v4 (configured via postCSS)
* **Database**: PostgreSQL (Supabase)
* **Authentication**: Supabase Auth (JWT)
* **Real-time Sync**: Supabase Realtime subscriptions
* **Hosting**: Vercel (Frontend) + Render/Heroku (Backend)

---

## Setup Instructions

### 1. Database Configuration (Supabase)
1. Create a project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** tab in your Supabase dashboard.
3. Copy the contents of [`schema.sql`](file:///c:/Users/91904/Desktop/SpreeTail/schema.sql) and run it. This will build all required tables, indexes, and triggers. If you have an existing database, run the `ALTER` migration block at the top of `schema.sql`.
4. Retrieve your `Project URL` and `anon public key` from **Project Settings** -> **API**.

### 2. Environment Setup

#### Frontend Setup (`/frontend`)
Create a `.env.local` file inside the `/frontend` directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

#### Backend Setup (`/backend`)
Create a `.env` file inside the `/backend` directory:
```env
PORT=5000
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=your-supabase-url-here
SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

### 3. Local Development (Root Directory)
1. Install dependencies across the entire workspace:
   ```bash
   npm run install:all
   ```
2. Start both frontend and backend dev servers concurrently:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Documentation

* **[`schema.sql`](file:///c:/Users/91904/Desktop/SpreeTail/schema.sql)**: Database tables, constraints, indexes, and triggers.
