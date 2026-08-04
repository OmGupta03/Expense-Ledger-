const { getClient } = require('../config/supabase');
const { calculateBalancesInternal } = require('../services/balanceService');

// Create a group and add the creator as the first member
const createGroup = async (req, res) => {
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
};

// Fetch all groups for a user
const getUserGroups = async (req, res) => {
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
};

// Fetch details for a specific group
const getGroupDetails = async (req, res) => {
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
};

// Fetch all members of a group
const getGroupMembers = async (req, res) => {
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
};

// Invite user to group by email
const inviteMember = async (req, res) => {
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
};

// Remove user from group (only if balance is 0)
const removeMember = async (req, res) => {
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
};

// Delete a group
const deleteGroup = async (req, res) => {
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
};

module.exports = {
  createGroup,
  getUserGroups,
  getGroupDetails,
  getGroupMembers,
  inviteMember,
  removeMember,
  deleteGroup
};
