import { supabase } from './supabase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

// Helper to make API requests to the Express backend for write/mutative operations
async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (e) {
    console.warn('Could not attach session token to request headers:', e);
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${res.status}`);
  }

  return res.json();
}

// ==========================================
// 1. GROUP OPERATIONS (Reads: Direct DB; Writes: Backend API)
// ==========================================

export async function createGroup(name, creatorId) {
  return request('/api/groups', {
    method: 'POST',
    body: JSON.stringify({ name, creatorId }),
  });
}

export async function fetchUserGroups(userId) {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      group_id,
      groups (
        id,
        name,
        created_at
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return data.map((item) => item.groups).filter(Boolean);
}

export async function fetchGroupDetails(groupId) {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchGroupMembers(groupId) {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      user_id,
      users (
        id,
        email,
        name
      )
    `)
    .eq('group_id', groupId);

  if (error) throw error;
  return data.map((item) => item.users).filter(Boolean);
}

export async function inviteUserToGroup(groupId, email) {
  return request(`/api/groups/${groupId}/invite`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function removeUserFromGroup(groupId, userId) {
  return request(`/api/groups/${groupId}/members/${userId}`, {
    method: 'DELETE',
  });
}

export async function deleteGroup(groupId) {
  return request(`/api/groups/${groupId}`, {
    method: 'DELETE',
  });
}

// ==========================================
// 2. EXPENSE OPERATIONS (Reads: Direct DB; Writes: Backend API)
// ==========================================

export async function addExpense(groupId, paidBy, description, amount, splitType, splits, currency = 'INR') {
  return request('/api/expenses', {
    method: 'POST',
    body: JSON.stringify({
      groupId,
      paidBy,
      description,
      amount,
      splitType,
      splits,
      currency,
    }),
  });
}

export async function fetchGroupExpenses(groupId) {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      payer:users!expenses_paid_by_fkey (
        id,
        name,
        email
      )
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchExpenseDetails(expenseId) {
  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .select(`
      *,
      payer:users!expenses_paid_by_fkey (
        id,
        name,
        email
      )
    `)
    .eq('id', expenseId)
    .single();

  if (expenseError) throw expenseError;

  const { data: splits, error: splitsError } = await supabase
    .from('expense_splits')
    .select(`
      *,
      user:users(id, name, email)
    `)
    .eq('expense_id', expenseId);

  if (splitsError) throw splitsError;

  return { ...expense, splits };
}

export async function deleteExpense(expenseId) {
  return request(`/api/expenses/${expenseId}`, {
    method: 'DELETE',
  });
}

// ==========================================
// 3. SETTLEMENT OPERATIONS (Reads: Direct DB; Writes: Backend API)
// ==========================================

export async function recordSettlement(groupId, payerId, payeeId, amount, currency = 'INR') {
  return request('/api/settlements', {
    method: 'POST',
    body: JSON.stringify({
      groupId,
      payerId,
      payeeId,
      amount,
      currency,
    }),
  });
}

export async function fetchGroupSettlements(groupId) {
  const { data, error } = await supabase
    .from('settlements')
    .select(`
      *,
      payer:users!settlements_payer_id_fkey (id, name, email),
      payee:users!settlements_payee_id_fkey (id, name, email)
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// ==========================================
// 4. CHAT OPERATIONS (Reads: Direct DB; Writes: Backend API)
// ==========================================

export async function sendChatMessage(expenseId, userId, message) {
  return request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      expenseId,
      userId,
      message,
    }),
  });
}

export async function fetchExpenseChat(expenseId) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(`
      *,
      user:users (id, name, email)
    `)
    .eq('expense_id', expenseId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

// ==========================================
// 5. LEDGER AND BALANCES (Client-side logic + Direct DB Reads)
// ==========================================

export async function calculateBalancesAndDebts(groupId) {
  // 1. Fetch group members
  const { data: membersData, error: membersError } = await supabase
    .from('group_members')
    .select(`
      user_id,
      users (
        id,
        email,
        name
      )
    `)
    .eq('group_id', groupId);

  if (membersError) throw membersError;
  const members = membersData.map((item) => item.users).filter(Boolean);

  const memberMap = {};
  members.forEach((m) => {
    memberMap[m.id] = m;
  });

  const currencies = ['INR', 'USD'];
  const netBalancesByCurrency = {
    INR: {},
    USD: {}
  };

  members.forEach((m) => {
    netBalancesByCurrency.INR[m.id] = 0;
    netBalancesByCurrency.USD[m.id] = 0;
  });

  // 2. Fetch all expenses
  const { data: expenses, error: expError } = await supabase
    .from('expenses')
    .select('id, paid_by, amount, currency')
    .eq('group_id', groupId);

  if (expError) throw expError;

  // Add payments to net balances
  expenses.forEach((e) => {
    const curr = e.currency === 'USD' ? 'USD' : 'INR';
    if (e.paid_by && netBalancesByCurrency[curr][e.paid_by] !== undefined) {
      netBalancesByCurrency[curr][e.paid_by] += parseFloat(e.amount);
    }
  });

  // 3. Fetch all splits for those expenses
  const expenseIds = expenses.map((e) => e.id);
  const expenseMap = {};
  expenses.forEach((e) => {
    expenseMap[e.id] = e;
  });

  if (expenseIds.length > 0) {
    const { data: splits, error: splitError } = await supabase
      .from('expense_splits')
      .select('user_id, amount, expense_id')
      .in('expense_id', expenseIds);

    if (splitError) throw splitError;

    // Deduct splits
    splits.forEach((s) => {
      const exp = expenseMap[s.expense_id];
      if (exp) {
        const curr = exp.currency === 'USD' ? 'USD' : 'INR';
        if (netBalancesByCurrency[curr][s.user_id] !== undefined) {
          netBalancesByCurrency[curr][s.user_id] -= parseFloat(s.amount);
        }
      }
    });
  }

  // 4. Fetch settlements
  const { data: settlements, error: setError } = await supabase
    .from('settlements')
    .select('payer_id, payee_id, amount, currency')
    .eq('group_id', groupId);

  if (setError) throw setError;

  settlements.forEach((s) => {
    const curr = s.currency === 'USD' ? 'USD' : 'INR';
    if (netBalancesByCurrency[curr][s.payer_id] !== undefined) {
      netBalancesByCurrency[curr][s.payer_id] += parseFloat(s.amount);
    }
    if (netBalancesByCurrency[curr][s.payee_id] !== undefined) {
      netBalancesByCurrency[curr][s.payee_id] -= parseFloat(s.amount);
    }
  });

  // Round decimals to 2 places
  currencies.forEach((curr) => {
    Object.keys(netBalancesByCurrency[curr]).forEach((uid) => {
      netBalancesByCurrency[curr][uid] = Math.round(netBalancesByCurrency[curr][uid] * 100) / 100;
    });
  });

  // 5. Greedy Debt Simplification
  const simplifiedDebtsByCurrency = {
    INR: [],
    USD: []
  };

  currencies.forEach((curr) => {
    const debtors = [];
    const creditors = [];

    Object.entries(netBalancesByCurrency[curr]).forEach(([uid, balance]) => {
      if (balance < -0.01) {
        debtors.push({ userId: uid, balance });
      } else if (balance > 0.01) {
        creditors.push({ userId: uid, balance });
      }
    });

    debtors.sort((a, b) => a.balance - b.balance);
    creditors.sort((a, b) => b.balance - a.balance);

    const dList = debtors.map((d) => ({ ...d }));
    const cList = creditors.map((c) => ({ ...c }));

    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < dList.length && cIdx < cList.length) {
      const debtor = dList[dIdx];
      const creditor = cList[cIdx];

      const dAmount = Math.abs(debtor.balance);
      const cAmount = creditor.balance;

      const settledAmount = Math.min(dAmount, cAmount);

      simplifiedDebtsByCurrency[curr].push({
        from: debtor.userId,
        fromUser: memberMap[debtor.userId],
        to: creditor.userId,
        toUser: memberMap[creditor.userId],
        amount: Math.round(settledAmount * 100) / 100,
        currency: curr
      });

      debtor.balance += settledAmount;
      creditor.balance -= settledAmount;

      if (Math.abs(debtor.balance) < 0.01) dIdx++;
      if (Math.abs(creditor.balance) < 0.01) cIdx++;
    }
  });

  // Consolidated netBalances (converts USD to INR at rate 83.0) for backwards compatibility
  const netBalances = {};
  const exchangeRateUSDtoINR = 83.0;
  members.forEach((m) => {
    const inrBal = netBalancesByCurrency.INR[m.id] || 0;
    const usdBal = netBalancesByCurrency.USD[m.id] || 0;
    netBalances[m.id] = Math.round((inrBal + usdBal * exchangeRateUSDtoINR) * 100) / 100;
  });

  // Combine simplified debts
  const simplifiedDebts = [
    ...simplifiedDebtsByCurrency.INR,
    ...simplifiedDebtsByCurrency.USD
  ];

  return {
    members,
    netBalances,
    simplifiedDebts,
    netBalancesByCurrency,
    simplifiedDebtsByCurrency
  };
}
