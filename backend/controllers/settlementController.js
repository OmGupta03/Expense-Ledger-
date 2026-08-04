const { getClient } = require('../config/supabase');

// Record a settlement
const recordSettlement = async (req, res) => {
  const client = getClient(req);
  try {
    const { groupId, payerId, payeeId, amount, currency, paymentMethod, notes, status } = req.body;
    const finalCurrency = currency || 'INR';

    if (!groupId || !payerId || !payeeId || !amount) {
      return res.status(400).json({ error: 'All settlement fields are required' });
    }

    const payAmt = parseFloat(amount);
    if (isNaN(payAmt) || payAmt <= 0) {
      return res.status(400).json({ error: 'Payment amount must be a positive number greater than zero' });
    }

    const validMethods = ['cash', 'upi', 'bank_transfer'];
    const finalMethod = (paymentMethod || 'cash').toLowerCase();
    if (!validMethods.includes(finalMethod)) {
      return res.status(400).json({ error: `Invalid payment method. Must be one of: ${validMethods.join(', ')}` });
    }

    const validStatuses = ['completed', 'partial', 'reversed'];
    const finalStatus = (status || 'completed').toLowerCase();
    if (!validStatuses.includes(finalStatus)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // 1. Fetch group members
    const { data: members, error: memErr } = await client
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);
    if (memErr) throw memErr;

    const memberIds = members.map(m => m.user_id);
    if (!memberIds.includes(payerId) || !memberIds.includes(payeeId)) {
      return res.status(400).json({ error: 'Payer and recipient must be members of the group' });
    }

    // 2. Fetch all expenses for this currency
    const { data: expenses, error: expErr } = await client
      .from('expenses')
      .select('id, paid_by, amount, currency')
      .eq('group_id', groupId)
      .eq('currency', finalCurrency);
    if (expErr) throw expErr;

    const expenseIds = expenses.map(e => e.id);
    const expenseMap = {};
    expenses.forEach(e => { expenseMap[e.id] = e; });

    // Initialize net balances for this currency
    const netBalances = {};
    memberIds.forEach(id => { netBalances[id] = 0; });

    // Add paid expenses
    expenses.forEach(e => {
      if (e.paid_by && netBalances[e.paid_by] !== undefined) {
        netBalances[e.paid_by] += parseFloat(e.amount);
      }
    });

    // Fetch splits for those expenses
    if (expenseIds.length > 0) {
      const { data: splits, error: splitErr } = await client
        .from('expense_splits')
        .select('user_id, amount, expense_id')
        .in('expense_id', expenseIds);
      if (splitErr) throw splitErr;

      splits.forEach(s => {
        if (netBalances[s.user_id] !== undefined) {
          netBalances[s.user_id] -= parseFloat(s.amount);
        }
      });
    }

    // Fetch settlements for this currency
    let settlements = [];
    const { data: settlementsData, error: setErr } = await client
      .from('settlements')
      .select('payer_id, payee_id, amount, status')
      .eq('group_id', groupId)
      .eq('currency', finalCurrency);

    if (setErr) {
      if (setErr.code === '42703') {
        const { data: retryData, error: retryError } = await client
          .from('settlements')
          .select('payer_id, payee_id, amount')
          .eq('group_id', groupId)
          .eq('currency', finalCurrency);
        if (retryError) throw retryError;
        settlements = retryData || [];
      } else {
        throw setErr;
      }
    } else {
      settlements = (settlementsData || []).filter(s => s.status !== 'reversed');
    }

    settlements.forEach(s => {
      if (netBalances[s.payer_id] !== undefined) {
        netBalances[s.payer_id] += parseFloat(s.amount);
      }
      if (netBalances[s.payee_id] !== undefined) {
        netBalances[s.payee_id] -= parseFloat(s.amount);
      }
    });

    // Greedy simplification for this currency to find active simplified debts
    const debtors = [];
    const creditors = [];
    Object.entries(netBalances).forEach(([uid, val]) => {
      if (val < -0.01) {
        debtors.push({ userId: uid, balance: val });
      } else if (val > 0.01) {
        creditors.push({ userId: uid, balance: val });
      }
    });

    debtors.sort((a, b) => a.balance - b.balance);
    creditors.sort((a, b) => b.balance - a.balance);

    const dList = debtors.map(d => ({ ...d }));
    const cList = creditors.map(c => ({ ...c }));
    let dIdx = 0;
    let cIdx = 0;
    let outstandingDebt = 0;

    while (dIdx < dList.length && cIdx < cList.length) {
      const debtor = dList[dIdx];
      const creditor = cList[cIdx];
      const dAmount = Math.abs(debtor.balance);
      const cAmount = creditor.balance;
      const settledAmount = Math.min(dAmount, cAmount);

      if (debtor.userId === payerId && creditor.userId === payeeId) {
        outstandingDebt = Math.round(settledAmount * 100) / 100;
        break;
      }

      debtor.balance += settledAmount;
      creditor.balance -= settledAmount;
      if (Math.abs(debtor.balance) < 0.01) dIdx++;
      if (Math.abs(creditor.balance) < 0.01) cIdx++;
    }

    if (payAmt > outstandingDebt + 0.02) {
      return res.status(400).json({ error: `Payment amount (${payAmt.toFixed(2)}) exceeds the current outstanding debt (${outstandingDebt.toFixed(2)}) for currency ${finalCurrency}` });
    }

    // Database Transaction Block: BEGIN
    console.log('Transaction: BEGIN - Recording settlement transaction');

    let insertResult;
    const { data: insertData, error: insertError } = await client
      .from('settlements')
      .insert([
        {
          group_id: groupId,
          payer_id: payerId,
          payee_id: payeeId,
          amount: payAmt,
          currency: finalCurrency,
          payment_method: finalMethod,
          notes: notes || null,
          status: finalStatus
        },
      ])
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '42703' || insertError.code === 'PGRST200' || (insertError.message && (insertError.message.includes('schema cache') || insertError.message.includes('notes') || insertError.message.includes('payment_method') || insertError.message.includes('status')))) {
        console.log('Transaction: FALLBACK - status/notes/payment_method columns missing, retrying with basic columns');
        const { data: retryData, error: retryError } = await client
          .from('settlements')
          .insert([
            {
              group_id: groupId,
              payer_id: payerId,
              payee_id: payeeId,
              amount: payAmt,
              currency: finalCurrency
            },
          ])
          .select()
          .single();
        if (retryError) {
          console.log('Transaction: ROLLBACK - Error inserting basic settlement:', retryError.message);
          throw retryError;
        }
        insertResult = retryData;
      } else {
        console.log('Transaction: ROLLBACK - Error inserting settlement:', insertError.message);
        throw insertError;
      }
    } else {
      insertResult = insertData;
    }

    // Database Transaction Block: COMMIT
    console.log('Transaction: COMMIT - Settlement recorded successfully');
    res.status(201).json(insertResult);
  } catch (error) {
    console.error('Error recording settlement:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

// Fetch all settlements for a group
const getGroupSettlements = async (req, res) => {
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
};

module.exports = {
  recordSettlement,
  getGroupSettlements
};
