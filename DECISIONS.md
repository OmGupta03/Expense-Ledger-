# DECISIONS.md — Architecture & Design Decisions

This document outlines the significant technical and design decisions made during the implementation of the Expense Management CSV Ingest and Multi-Currency Settlement system.

---

## 1. Decoupling User Profiles from Supabase Auth (`auth.users`)

### Problem
The historical CSV contains transactions involving multiple people (Aisha, Rohan, Priya, Meera, Dev, Sam, Kabir). In our initial MVP database design, the `public.users` table had a primary key with a foreign key constraint `references auth.users(id)`. This meant no user profile could exist in the app unless they registered an account via Supabase Authentication (email/password). When ingesting historical data, this constraint would fail since none of these individuals are registered yet.

### Options Considered
1. **Force Pre-Registration**: Require all members to sign up first. (Unusable: breaks CSV batch ingestion requirements).
2. **Mock Auth Users**: Write a script that inserts fake rows in `auth.users` for every name found in the CSV. (Risky: violates Supabase security policies, hard to manage, pollutes auth directory).
3. **Decouple the foreign key constraint (Chosen)**: Drop the `references auth.users` constraint on `public.users.id` and make the `email` column nullable.

### Rationale
Decoupling the foreign key constraint allows us to insert user profiles for historical CSV members immediately, assigning them random UUIDs (`gen_random_uuid()`) and leaving their emails as `NULL`. When a member registers via auth, the database trigger `handle_new_user()` inserts their profile using their auth UUID as the ID. If an unregistered member joins later, they can register, and their profile will map cleanly. This ensures historical ledgers can be imported and balances calculated instantly, without blocking on user signup.

---

## 2. Multi-Currency Ledger Isolation & Balances

### Problem
The CSV contains transactions in both `INR` (Indian Rupees) and `USD` (US Dollars), e.g., the villa booking is $540 USD, while flights are ₹32,400 INR. We must calculate balances and simplify debts across these currencies.

### Options Considered
1. **Auto-Convert to Base Currency (INR)**: Convert all USD transactions to INR at a fixed exchange rate (e.g., 1 USD = 83 INR) upon ingestion and store them in INR. (Lossy: exchange rates fluctuate, and friends expect to pay back the exact USD spent on international sites).
2. **Isolated Ledgers (Chosen)**: Keep the transaction amount and currency intact. Calculate net balances and run the Greedy Debt Simplification separately for INR and USD.

### Rationale
By keeping currencies isolated in the database, we preserve absolute financial accuracy. Friends can settle USD debts in USD (e.g. Dev owes Rohan USD, Meera owes Aisha INR). 
To make the dashboard user-friendly:
* We calculate and display separate debt lists: **"INR Debts"** and **"USD Debts"**.
* We show individual net balances for both currencies (e.g., `+₹2,000 / -$15.00`).
* We display a consolidated balance card on the dashboard using a standard exchange rate conversion (1 USD = 83 INR) for convenience, but the actual settlements are done in their native currency.

---

## 3. Client-Side CSV Parsing & Ingestion Report Wizard

### Problem
We need to read the CSV file, handle quote-escaped strings containing commas or semicolons (e.g., `"Aisha;Rohan;Priya;Meera"`), log anomalies, and ingest data.

### Options Considered
1. **Server-Side API Ingestion (Multer + PapaParse)**: Upload the file to a Next.js API route, write the file to disk, parse it, and return responses. (Overkill: increases serverless cold-start latency, requires additional npm packages).
2. **Client-Side Integrated Parser (Chosen)**: Parse the CSV string directly in the React frontend using a custom quotes-and-commas safe line parser, present the anomaly report interactively, and batch-insert clean records using Supabase Client.

### Rationale
Client-side parsing provides immediate, lag-free visual feedback to the user. The interactive **CSV Ingestion Wizard** shows a detailed row-by-row anomaly report instantly before saving. The user can see exactly what sanitizations are performed, select/deselect specific rows (e.g. deselecting detected duplicate dinner rows), and hit "Ingest" to execute Supabase database transactions.

---

## 4. Reclassifying Settlements from Expenses

### Problem
Rows 14 (`Rohan paid Aisha back`, amount 5000, blank split_type) and 38 (`Sam deposit share`, split Aisha, amount 15000) in the CSV are actually settlement/transfer payments between individuals, not shared group expenses.

### Rationale
Leaving transfers in the `expenses` table breaks split math (it forces a 0-split or splits it among members, which is incorrect). We chose to programmatically reclassify these rows as direct payments and insert them into the `settlements` table. This keeps the database semantics clean:
* Shared expenses go to `expenses` and are divided using split types.
* Direct repayments and deposits go to `settlements` to directly lower debtor/creditor balances.

---

## 5. Refund Ingestion via Negative Splits

### Problem
Row 26 (`Parasailing refund`, amount `-30` USD) represents a refund to the group.

### Rationale
In PostgreSQL, splitwise schemas usually check `amount > 0` on expenses. To support refunds, we relaxed this constraint to `amount <> 0`, allowing negative amounts. The ingestion engine inserts `-30 USD` as the expense, and divides it negatively (`-7.50` USD to each of the 4 participants). This cleanly reduces each person's outstanding USD debt, maintaining correct ledger balances.
