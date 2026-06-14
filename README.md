# Splitwise Clone (MVP)

A simplified, responsive, and aesthetically premium Splitwise clone built using **Next.js 14**, **Tailwind CSS**, and **Supabase (PostgreSQL + Auth + Realtime)**.

This project was built as an internship assignment with **Antigravity AI** acting as the primary engineering partner.

---

## Features

1. **User Authentication**: Secure email/password login and registration managed by Supabase Auth, synced automatically to a public profiles table via Postgres triggers.
2. **Group Management**: Users can create groups, view their groups list, and invite other registered users to join groups.
3. **Flexible Expense Splitting**: Add expenses and split them 4 different ways:
   * **Equally**: Split evenly among all or selected members.
   * **Unequally**: Explicit decimal amounts specified per member.
   * **By Percentage**: Split by specifying percentages (must sum to 100%).
   * **By Share**: Split proportionally based on arbitrary shares (e.g. 1 share, 2 shares).
4. **Real-time Expense Chat**: Click any expense to open a slide-out panel with its split details and an integrated chat room that updates instantly for all users via Supabase Realtime postgres changes.
5. **Greedy Debt Simplification**: A dynamic algorithm that matches debtors and creditors within a group to collapse transaction paths (e.g. if A owes B, and B owes C, the app shows A owes C directly).
6. **Settle Up / Record Payments**: Easily record cash/off-platform settlements between members to zero out balances.

---

## Tech Stack

* **Frontend/Backend**: Next.js 14 (App Router)
* **Styling**: Tailwind CSS v4 (configured via postCSS)
* **Database**: PostgreSQL (Supabase)
* **Authentication**: Supabase Auth (JWT)
* **Real-time Sync**: Supabase Realtime client listeners
* **Hosting**: Vercel

---

## Database Schema

The database utilizes the following tables (defined in `schema.sql`):
* `users`: Stores profile names and emails, synced from auth.
* `groups`: Group details.
* `group_members`: Connects users to groups.
* `expenses`: Ledger entries for costs.
* `expense_splits`: Maps splits (amounts, percentages, shares) per user per expense.
* `settlements`: Ledger entries for direct payments.
* `chat_messages`: Comments posted inside expenses.

---

## Setup Instructions

### 1. Database Configuration (Supabase)
1. Create a free project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** tab in your Supabase dashboard.
3. Copy the contents of [`schema.sql`](file:///c:/Users/91904/Desktop/SpreeTail/schema.sql) from the root of this project and run it. This will create all tables, indexes, and triggers automatically.
4. Go to **Project Settings** -> **API** and retrieve your `Project URL` and `anon public key`.

### 2. Environment Setup
1. Create a `.env.local` file in the root of the project:
   ```bash
   cp .env.example .env.local
   ```
2. Populate `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url-here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
   ```

### 3. Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Documentation

* **[AI_CONTEXT.md](file:///c:/Users/91904/Desktop/SpreeTail/AI_CONTEXT.md)**: The single source of truth documenting architecture, schema, state logic, and changes.
* **[BUILD_PLAN.md](file:///c:/Users/91904/Desktop/SpreeTail/BUILD_PLAN.md)**: Documenting product research, tech stack decisions, and tradeoffs.
