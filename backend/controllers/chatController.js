const { getClient } = require('../config/supabase');

// Send a chat message
const sendMessage = async (req, res) => {
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
};

// Fetch chat history for an expense
const getExpenseChat = async (req, res) => {
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
};

module.exports = {
  sendMessage,
  getExpenseChat
};
