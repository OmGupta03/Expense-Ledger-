import { supabase } from './supabase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

// Helper to make API requests to the Express backend
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
// 1. GROUP OPERATIONS
// ==========================================

export async function createGroup(name, creatorId) {
  return request('/api/groups', {
    method: 'POST',
    body: JSON.stringify({ name, creatorId }),
  });
}

export async function fetchUserGroups(userId) {
  return request(`/api/groups/user/${userId}`);
}

export async function fetchGroupDetails(groupId) {
  return request(`/api/groups/${groupId}`);
}

export async function fetchGroupMembers(groupId) {
  return request(`/api/groups/${groupId}/members`);
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
// 2. EXPENSE OPERATIONS
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
  return request(`/api/expenses/group/${groupId}`);
}

export async function fetchExpenseDetails(expenseId) {
  return request(`/api/expenses/${expenseId}`);
}

export async function deleteExpense(expenseId) {
  return request(`/api/expenses/${expenseId}`, {
    method: 'DELETE',
  });
}

// ==========================================
// 3. SETTLEMENT OPERATIONS
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
  return request(`/api/settlements/group/${groupId}`);
}

// ==========================================
// 4. CHAT OPERATIONS
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
  return request(`/api/chat/expense/${expenseId}`);
}

// ==========================================
// 5. LEDGER AND BALANCES
// ==========================================

export async function calculateBalancesAndDebts(groupId) {
  return request(`/api/groups/${groupId}/balances`);
}
