const { getClient } = require('../config/supabase');
const { calculateBalancesInternal } = require('../services/balanceService');

// Calculate balances and simplified debts for a group
const getGroupBalances = async (req, res) => {
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
};

module.exports = {
  getGroupBalances
};
