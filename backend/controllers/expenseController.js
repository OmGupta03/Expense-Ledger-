const { getClient } = require('../config/supabase');

// Add an expense and its splits
const addExpense = async (req, res) => {
  const client = getClient(req);
  try {
    const { groupId, paidBy, description, amount, splitType, splits, currency, createdAt } = req.body;
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
          ...(createdAt && { created_at: new Date(createdAt).toISOString() }),
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
};

// Fetch all expenses for a group
const getGroupExpenses = async (req, res) => {
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
};

// Fetch details of a single expense and its splits
const getExpenseDetails = async (req, res) => {
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
};

// Delete an expense
const deleteExpense = async (req, res) => {
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
};

module.exports = {
  addExpense,
  getGroupExpenses,
  getExpenseDetails,
  deleteExpense
};
