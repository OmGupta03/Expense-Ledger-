# BUILD_PLAN.md: Splitwise Clone (MVP)

This document outlines the product research, architecture, AI collaboration process, and engineering trade-offs for the Splitwise Clone assignment, as required by the submission guidelines.

---

## 1. Product Research

### How We Studied Splitwise
Splitwise is a ledger-based expense sharing application that tracks who paid for what and who owes whom. The core logic relies on transaction records (expenses and settlements) rather than storing static balances.

### Key Workflows Identified
1. **User Authentication**: Secure sign up and log in so that individual transactions are correctly associated with specific users.
2. **Group Context**: Expenses are usually added within a group (e.g., apartment, trip) to restrict balance calculations to specific groups of members.
3. **Expense Splitting**: Different ways of splitting:
   * **Equally**: Split the total cost evenly among all or select participants.
   * **Unequally**: Explicit amounts specified for each member.
   * **Percentage**: Proportion of total cost based on percentages (summing to 100%).
   * **Shares**: Proportion of total cost based on units/shares.
4. **Debts & Balances**: A mathematical aggregation of expenses paid vs. splits owed.
5. **Real-time Chat**: Discussion channel attached to a specific expense to clarify split amounts or details.
6. **Settlement**: Recording payments directly between users to zero out balances.

### Product Assumptions Made
* **Single Currency**: For MVP, we assume a single currency (e.g., USD or INR) to simplify calculation and UI displays.
* **Registered Users Only**: A user can only invite existing registered users to their group by email. If the user doesn't exist, we prompt the user that they must register first.
* **Group-bound Debt Simplification**: Debt simplification will happen purely inside a group, not globally across multiple groups, to prevent cross-group dependency issues.

---

## 2. Architecture

### Tech Stack
* **Frontend/Backend Framework**: Next.js 14 (React) with App Router.
* **Styling**: Tailwind CSS v3 (used for fast, responsive, and modern UI design).
* **Database**: PostgreSQL (Relational DB) hosted on **Supabase**.
* **Authentication**: Supabase Auth (email/password).
* **Real-time Engine**: Supabase Realtime (used for instant expense chat updates).
* **Hosting**: Vercel (Frontend & Serverless APIs) + Supabase Cloud.

### Database Schema
We will create the following tables in PostgreSQL (schema is documented in detail in `AI_CONTEXT.md`):
* `users`: Stores user profile details (ID, email, name).
* `groups`: Stores group information (ID, name, owner).
* `group_members`: Join table connecting users to groups.
* `expenses`: Stores individual expense records.
* `expense_splits`: Stores splits per user per expense (amount, share, percentage).
* `settlements`: Ledger entries for direct payments between users.
* `chat_messages`: Stores messages posted inside expense details.

### API Design
We will use Next.js **Server Actions** for seamless, type-safe communication between the frontend and database:
* `createGroup(name)`
* `inviteUserToGroup(groupId, email)`
* `removeUserFromGroup(groupId, userId)`
* `addExpense(groupId, expenseData)`
* `deleteExpense(expenseId)`
* `recordSettlement(groupId, payerId, payeeId, amount)`
* `sendChatMessage(expenseId, message)`

### Frontend Structure
* **`/login` and `/signup`**: Auth pages.
* **`/` (Dashboard)**: Sidebar with group navigation; main section showing overall net balance and list of groups.
* **`/groups/[id]`**: Group view showing member balances, simplified debt list, chronological ledger (expenses & settlements), and button to add expense.
* **`/groups/[id]/expenses/[expenseId]`**: Detailed expense split view with an integrated real-time chat panel.

---

## 3. AI Collaboration Process

### How the AI was Instructed
The AI was instructed to behave as a junior engineer collaborating with a senior product/engineering lead. It was ordered not to make assumptions and to ask detailed clarifying questions.

### Questions the AI Asked
1. **Styling choice**: Vanilla CSS vs. Tailwind CSS?
2. **Backend infrastructure**: Custom WebSocket server vs. Supabase Realtime for chat?
3. **Core logic**: Direct balances vs. Greedy Debt Simplification?
4. **Environment**: Local PostgreSQL development vs. Cloud Supabase project directly?

### How the User Answered
1. Tailwind CSS.
2. Yes, comfortable with Supabase for DB, Auth, and Realtime.
3. Yes, implement Greedy Debt Simplification.
4. Yes, develop directly on cloud Supabase for fast Vercel deployment.

### How the Plan Evolved
The plan evolved from a standard custom Express/WebSocket server to a Next.js + Supabase serverless architecture, which significantly speeds up development and deployment. We updated `AI_CONTEXT.md` to be the single source of truth.

---

## 4. Trade-offs

### What We Simplified
* **User Invitation**: Adding members by email. If the user doesn't exist, we return a validation error instead of creating a pending mock-user (saves complex flow logic).
* **Removal Constraints**: A user can only be removed from a group if their balance is exactly $0.00.
* **Real-time Chat**: Leveraged Supabase Realtime client-side subscription instead of setting up a custom Socket.io server, minimizing infrastructure overhead.

### What We Hardcoded
* **Currency Symbol**: Hardcoded to `$` for all amounts.
* **Default Theme**: Dark/light mode theme will default to a dark-mode optimized palette for high aesthetic appeal.

### What We Avoided
* **Offline Sync**: The app requires an active network connection to display or edit transactions.
* **Global Debt Simplification**: Simplification does not cross-reference multiple groups.

### What We Would Improve With More Time
* **Email Invites**: Send an actual email verification/link to unregistered users via Resend/SendGrid.
* **Receipt Parsing**: Add OCR service (like Tesseract.js or Google Cloud Vision API) to extract split items from receipt images.
* **Push Notifications**: Notify users in real-time when they are added to an expense or a group.
