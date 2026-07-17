const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://10.35.4.103:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, process.env.FRONTEND_URL || 'http://localhost:3000');
    }
  },
  credentials: true
}));
app.use(express.json());

const localDb = require('./localDb');
const useLocalDb = !process.env.SUPABASE_URL || 
                    process.env.SUPABASE_URL.includes('placeholder') || 
                    process.env.USE_LOCAL_DB === 'true';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder';

if (!useLocalDb && (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY)) {
  console.error('CRITICAL: SUPABASE_URL and SUPABASE_ANON_KEY must be set in the environment');
  process.exit(1);
}

const supabaseDefault = useLocalDb ? createLocalClient() : createClient(supabaseUrl, supabaseAnonKey);

function createLocalClient(token) {
  let authUserId = null;
  if (token && token.startsWith('mock-token-')) {
    authUserId = token.replace('mock-token-', '');
  }

  class LocalQueryBuilder {
    constructor(table) {
      this.table = table;
      this.action = 'select';
      this.columns = '*';
      this.filters = [];
      this.insertedData = null;
      this.isSingle = false;
      this.isMaybeSingle = false;
      this.orderCol = null;
      this.orderAscending = false;
    }
    select(columns = '*') {
      if (this.action !== 'insert' && this.action !== 'update' && this.action !== 'delete') {
        this.action = 'select';
      }
      this.columns = columns;
      return this;
    }
    insert(data) {
      this.action = 'insert';
      this.insertedData = data;
      return this;
    }
    update(data) {
      this.action = 'update';
      this.insertedData = data;
      return this;
    }
    delete() {
      this.action = 'delete';
      return this;
    }
    eq(column, value) {
      this.filters.push({ type: 'eq', column, value });
      return this;
    }
    in(column, values) {
      this.filters.push({ type: 'in', column, value: values });
      return this;
    }
    order(column, { ascending = true } = {}) {
      this.orderCol = column;
      this.orderAscending = ascending;
      return this;
    }
    single() {
      this.isSingle = true;
      return this;
    }
    maybeSingle() {
      this.isMaybeSingle = true;
      return this;
    }
    async then(onfulfilled, onrejected) {
      try {
        const data = await localDb.executeQuery({
          table: this.table,
          action: this.action,
          columns: this.columns,
          filters: this.filters,
          insertedData: this.insertedData,
          isSingle: this.isSingle,
          isMaybeSingle: this.isMaybeSingle,
          orderCol: this.orderCol,
          orderAscending: this.orderAscending
        });
        if (onfulfilled) return onfulfilled({ data, error: null });
        return { data, error: null };
      } catch (err) {
        if (onrejected) return onrejected({ data: null, error: err });
        return { data: null, error: err };
      }
    }
  }

  return {
    from: (table) => new LocalQueryBuilder(table)
  };
}

// Helper to get a Supabase client, attaching user auth token if present
function getClient(req) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (useLocalDb) {
    return createLocalClient(token);
  }
  if (token) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
  }
  return supabaseDefault;
}

// ==========================================
// 1. GROUP ROUTES
// ==========================================

// Create a group and add the creator as the first member
app.post('/api/groups', async (req, res) => {
  const client = getClient(req);
  try {
    const { name, creatorId } = req.body;
    if (!name || !creatorId) {
      return res.status(400).json({ error: 'Group name and creator ID are required' });
    }

    const { data: group, error: groupError } = await client
      .from('groups')
      .insert([{ name, created_by: creatorId }])
      .select()
      .single();

    if (groupError) throw groupError;

    const { error: memberError } = await client
      .from('group_members')
      .insert([{ group_id: group.id, user_id: creatorId }]);

    if (memberError) {
      // Attempt cleanup
      await client.from('groups').delete().eq('id', group.id);
      throw memberError;
    }

    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Fetch all groups for a user
app.get('/api/groups/user/:userId', async (req, res) => {
  const client = getClient(req);
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const { data, error } = await client
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
    
    const groups = data.map((item) => item.groups).filter(Boolean);
    res.json(groups);
  } catch (error) {
    console.error('Error fetching user groups:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Fetch details for a specific group
app.get('/api/groups/:groupId', async (req, res) => {
  const client = getClient(req);
  try {
    const { groupId } = req.params;
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    const { data, error } = await client
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching group details:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Fetch all members of a group
app.get('/api/groups/:groupId/members', async (req, res) => {
  const client = getClient(req);
  try {
    const { groupId } = req.params;
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    const { data, error } = await client
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
    
    const members = data.map((item) => item.users).filter(Boolean);
    res.json(members);
  } catch (error) {
    console.error('Error fetching group members:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Invite user to group by email
app.post('/api/groups/:groupId/invite', async (req, res) => {
  const client = getClient(req);
  try {
    const { groupId } = req.params;
    const { email } = req.body;
    if (!groupId || !email) {
      return res.status(400).json({ error: 'Group ID and email are required' });
    }

    // Find user by email
    const { data: user, error: userError } = await client
      .from('users')
      .select('id, email')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (userError) throw userError;
    if (!user) {
      return res.status(404).json({
        error: `User with email "${email}" is not registered. They must sign up first.`
      });
    }

    // Check if already a member
    const { data: member, error: memberError } = await client
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError) throw memberError;
    if (member) {
      return res.status(400).json({ error: 'User is already a member of this group.' });
    }

    // Add user to group
    const { error: insertError } = await client
      .from('group_members')
      .insert([{ group_id: groupId, user_id: user.id }]);

    if (insertError) throw insertError;
    res.json(user);
  } catch (error) {
    console.error('Error inviting user:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Remove user from group (only if balance is 0)
app.delete('/api/groups/:groupId/members/:userId', async (req, res) => {
  const client = getClient(req);
  try {
    const { groupId, userId } = req.params;
    if (!groupId || !userId) {
      return res.status(400).json({ error: 'Group ID and User ID are required' });
    }

    // Check balances to ensure it is 0
    const balances = await calculateBalancesInternal(groupId, client);
    const userBalance = balances.netBalances[userId] || 0;

    if (Math.abs(userBalance) > 0.01) {
      return res.status(400).json({
        error: 'Cannot remove user. User has outstanding debts or is owed money in this group.'
      });
    }

    const { error } = await client
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing user:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Delete a group
app.delete('/api/groups/:groupId', async (req, res) => {
  const client = getClient(req);
  try {
    const { groupId } = req.params;
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    const { error } = await client
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// ==========================================
// 2. EXPENSE ROUTES
// ==========================================

// Add an expense and its splits
app.post('/api/expenses', async (req, res) => {
  const client = getClient(req);
  try {
    const { groupId, paidBy, description, amount, splitType, splits, currency } = req.body;
    const finalCurrency = currency || 'INR';

    if (!groupId || !description || amount === undefined || amount === null || amount === '' || isNaN(parseFloat(amount)) || !splitType || !splits || splits.length === 0) {
      return res.status(400).json({ error: 'All expense fields and splits are required' });
    }

    // Check splits sum match total amount
    const splitsSum = splits.reduce((sum, s) => sum + Math.abs(parseFloat(s.amount || 0)), 0);
    if (Math.abs(splitsSum - Math.abs(parseFloat(amount))) > 0.02) {
      return res.status(400).json({
        error: `The sum of splits (${splitsSum.toFixed(2)}) must equal the total amount (${Math.abs(parseFloat(amount)).toFixed(2)})`
      });
    }

    // Insert expense
    const { data: expense, error: expenseError } = await client
      .from('expenses')
      .insert([
        {
          group_id: groupId,
          paid_by: paidBy || null,
          description,
          amount: parseFloat(amount),
          split_type: splitType,
          currency: finalCurrency,
        },
      ])
      .select()
      .single();

    if (expenseError) throw expenseError;

    // Insert splits
    const splitInserts = splits.map((s) => ({
      expense_id: expense.id,
      user_id: s.userId,
      amount: parseFloat(s.amount),
      percentage: s.percentage ? parseFloat(s.percentage) : null,
      share: s.share ? parseFloat(s.share) : null,
    }));

    const { error: splitsError } = await client
      .from('expense_splits')
      .insert(splitInserts);

    if (splitsError) {
      // Rollback expense
      await client.from('expenses').delete().eq('id', expense.id);
      throw splitsError;
    }

    res.status(201).json(expense);
  } catch (error) {
    console.error('Error adding expense:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Fetch all expenses for a group
app.get('/api/expenses/group/:groupId', async (req, res) => {
  const client = getClient(req);
  try {
    const { groupId } = req.params;
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    const { data, error } = await client
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
    res.json(data);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Fetch details of a single expense and its splits
app.get('/api/expenses/:expenseId', async (req, res) => {
  const client = getClient(req);
  try {
    const { expenseId } = req.params;
    if (!expenseId) {
      return res.status(400).json({ error: 'Expense ID is required' });
    }

    const { data: expense, error: expenseError } = await client
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

    const { data: splits, error: splitsError } = await client
      .from('expense_splits')
      .select(`
        *,
        user:users(id, name, email)
      `)
      .eq('expense_id', expenseId);

    if (splitsError) throw splitsError;

    res.json({ ...expense, splits });
  } catch (error) {
    console.error('Error fetching expense details:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Delete an expense
app.delete('/api/expenses/:expenseId', async (req, res) => {
  const client = getClient(req);
  try {
    const { expenseId } = req.params;
    if (!expenseId) {
      return res.status(400).json({ error: 'Expense ID is required' });
    }

    const { error } = await client
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// ==========================================
// 3. SETTLEMENT ROUTES
// ==========================================

// Record a settlement
app.post('/api/settlements', async (req, res) => {
  const client = getClient(req);
  try {
    const { groupId, payerId, payeeId, amount, currency } = req.body;
    const finalCurrency = currency || 'INR';

    if (!groupId || !payerId || !payeeId || !amount) {
      return res.status(400).json({ error: 'All settlement fields are required' });
    }

    const { data, error } = await client
      .from('settlements')
      .insert([
        {
          group_id: groupId,
          payer_id: payerId,
          payee_id: payeeId,
          amount: parseFloat(amount),
          currency: finalCurrency,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error recording settlement:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Fetch all settlements for a group
app.get('/api/settlements/group/:groupId', async (req, res) => {
  const client = getClient(req);
  try {
    const { groupId } = req.params;
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    const { data, error } = await client
      .from('settlements')
      .select(`
        *,
        payer:users!settlements_payer_id_fkey (id, name, email),
        payee:users!settlements_payee_id_fkey (id, name, email)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching settlements:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// ==========================================
// 4. CHAT ROUTES
// ==========================================

// Send a chat message
app.post('/api/chat', async (req, res) => {
  const client = getClient(req);
  try {
    const { expenseId, userId, message } = req.body;
    if (!expenseId || !userId || !message) {
      return res.status(400).json({ error: 'Expense ID, User ID, and message text are required' });
    }

    const { data, error } = await client
      .from('chat_messages')
      .insert([
        {
          expense_id: expenseId,
          user_id: userId,
          message: message.trim(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Fetch chat history for an expense
app.get('/api/chat/expense/:expenseId', async (req, res) => {
  const client = getClient(req);
  try {
    const { expenseId } = req.params;
    if (!expenseId) {
      return res.status(400).json({ error: 'Expense ID is required' });
    }

    const { data, error } = await client
      .from('chat_messages')
      .select(`
        *,
        user:users (id, name, email)
      `)
      .eq('expense_id', expenseId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// ==========================================
// 5. BALANCES & SIMPLIFICATION ROUTES
// ==========================================

// Calculate balances and simplified debts for a group
app.get('/api/groups/:groupId/balances', async (req, res) => {
  const client = getClient(req);
  try {
    const { groupId } = req.params;
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    const result = await calculateBalancesInternal(groupId, client);
    res.json(result);
  } catch (error) {
    console.error('Error calculating balances:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Internal helper for balance computation and debt simplification (same logic as api.js)
async function calculateBalancesInternal(groupId, client) {
  // 1. Fetch group members
  const { data: membersData, error: membersError } = await client
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
  const { data: expenses, error: expError } = await client
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
    const { data: splits, error: splitError } = await client
      .from('expense_splits')
      .select('user_id, amount, expense_id')
      .in('expense_id', expenseIds);

    if (splitError) throw splitError;

    // Deduct owed splits
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
  const { data: settlements, error: setError } = await client
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

// Query proxy endpoint for local mode
app.post('/api/supabase-query', async (req, res) => {
  try {
    const data = await localDb.executeQuery(req.body);
    res.json({ data, error: null });
  } catch (error) {
    console.error('Error executing local query:', error);
    res.status(500).json({ error: error.message });
  }
});

// Local auth signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const db = localDb.readDb();
    let user = db.users.find(u => u.email === email.trim().toLowerCase());
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    user = {
      id: require('crypto').randomUUID(),
      email: email.trim().toLowerCase(),
      name: name || email.split('@')[0],
      password: password || 'password', // fallback password
      created_at: new Date().toISOString()
    };

    db.users.push(user);
    localDb.writeDb(db);

    const token = `mock-token-${user.id}`;
    const session = {
      access_token: token,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: `mock-refresh-${user.id}`,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: { name: user.name }
      }
    };

    res.status(201).json({ session });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Local auth signin
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const db = localDb.readDb();
    const user = db.users.find(u => u.email === email.trim().toLowerCase());
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    if (password && user.password && user.password !== password) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = `mock-token-${user.id}`;
    const session = {
      access_token: token,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: `mock-refresh-${user.id}`,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: { name: user.name }
      }
    };

    res.status(200).json({ session });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

